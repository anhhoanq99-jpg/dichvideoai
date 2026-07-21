"""
Service TTS chay TAI CHO cho worker: VieNeu (v3turbo) + Kokoro-Vietnamese.

Vi sao can service rieng thay vi goi python moi lan:
- nap model mat 7-9s, sinh 1 cau chi mat ~0.8s. Goi python moi cau se ton
  gap 10 lan thoi gian nap so voi sinh.
- service giu model trong RAM, chi nap 1 lan luc khoi dong.

Chay: pm2 start .venv-tts/Scripts/python.exe --name dichvideo-tts -- services/tts-local/server.py
Nghe o 127.0.0.1:8123 (chi localhost — KHONG mo ra ngoai).
"""
import io
import os
import sys
import threading
import time
import wave

import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from voices import KOKORO_VOICES, VIENEU_VOICES  # noqa: E402  (tu dong sinh)

VIENEU_RATE = 48000
KOKORO_RATE = 24000

app = FastAPI(title="dichvideo TTS local")

# Model nap LUOI (lan goi dau), khong nap luc import — de service len ngay va
# /health tra loi duoc trong khi model con dang tai.
_vieneu = None
_kokoro = None
_kokoro_voice = None
# torch/onnx khong an toan khi nhieu luong cung dung 1 instance, va Kokoro con
# bi trao voicepack giua chung -> serialize moi lan sinh.
_lock = threading.Lock()


def get_vieneu():
    global _vieneu
    if _vieneu is None:
        from vieneu import Vieneu

        t0 = time.time()
        _vieneu = Vieneu()  # v3turbo, ONNX tren CPU
        print(f"[tts] nap VieNeu xong sau {time.time() - t0:.1f}s", flush=True)
    return _vieneu


def get_kokoro(voice: str):
    """Giu 1 instance, doi giong bang cach TRAO voicepack (~1ms) thay vi nap lai model (~8s)."""
    global _kokoro, _kokoro_voice
    if _kokoro is None:
        from kokoro_vietnamese import KokoroVietnamese

        t0 = time.time()
        _kokoro = KokoroVietnamese(device="cpu", voice=voice)
        _kokoro_voice = voice
        print(f"[tts] nap Kokoro xong sau {time.time() - t0:.1f}s", flush=True)
        return _kokoro

    if voice != _kokoro_voice:
        pack = _kokoro.voicepack_path.parent / f"{voice}.pt"
        if not pack.exists():
            raise HTTPException(400, f"Kokoro khong co giong '{voice}'")
        _kokoro.voicepack = torch.load(pack, map_location="cpu", weights_only=True)
        _kokoro_voice = voice
    return _kokoro


def to_wav(audio: np.ndarray, rate: int) -> bytes:
    """float32 [-1,1] -> wav PCM 16-bit mono (dinh dang worker/ffmpeg an duoc)."""
    pcm = np.clip(audio, -1.0, 1.0)
    pcm = (pcm * 32767.0).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm.tobytes())
    return buf.getvalue()


class TtsRequest(BaseModel):
    engine: str = Field(pattern="^(vieneu|kokoro)$")
    voice: str
    text: str
    # Kokoro nhan speed nen bake thang; VieNeu khong co tham so speed -> worker
    # tu keo gian bang ffmpeg atempo (xem speedBakedFor trong dub.ts).
    speed: float = 1.0


@app.get("/health")
def health():
    return {
        "ok": True,
        "vieneu_loaded": _vieneu is not None,
        "kokoro_loaded": _kokoro is not None,
    }


@app.post("/tts")
def tts(req: TtsRequest):
    if not req.text.strip():
        raise HTTPException(400, "text rong")
    t0 = time.time()
    try:
        with _lock:
            if req.engine == "vieneu":
                # voice id la SLUG ascii (vieneu:minh-duc) -> doi ra ten that
                # ("Minh Đức"). Ten that co dau + khoang trang, de vo khi di qua
                # URL/JSON/shell nen khong dung lam id.
                real = VIENEU_VOICES.get(req.voice)
                if real is None:
                    raise HTTPException(400, f"VieNeu khong co giong '{req.voice}'")
                audio = get_vieneu().infer(req.text, voice=real)
                rate = VIENEU_RATE
            else:
                if req.voice not in KOKORO_VOICES:
                    raise HTTPException(400, f"Kokoro khong co giong '{req.voice}'")
                k = get_kokoro(req.voice)
                audio, _ = k.synthesize(req.text, speed=req.speed)
                rate = KOKORO_RATE
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, f"{req.engine} loi: {type(e).__name__}: {e}") from e

    body = to_wav(np.asarray(audio, dtype=np.float32), rate)
    dur = len(audio) / rate
    took = time.time() - t0
    print(
        f"[tts] {req.engine}/{req.voice} {len(req.text)}ky_tu -> {dur:.1f}s audio "
        f"trong {took:.1f}s (RTF {took / max(dur, 0.01):.2f})",
        flush=True,
    )
    return Response(content=body, media_type="audio/wav")


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("TTS_LOCAL_PORT", "8123"))
    # 1 worker: model nam trong RAM cua tien trinh, nhieu worker = nhan ban RAM
    uvicorn.run(app, host="127.0.0.1", port=port, workers=1, log_level="warning")
