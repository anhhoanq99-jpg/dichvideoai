"""
Sinh catalog giong TU DU LIEU THAT cua engine (khong go tay, khong doan).
Xuat 2 thu tu cung 1 nguon:
  - services/tts-local/voices.py  : bang slug -> ten that cho service
  - scripts/voices-generated.ts   : doan TypeScript de dan vao dub-presets.ts
Nho vay slug o catalog va slug o service khong the lech nhau.
"""
import json
import re
import sys
import unicodedata

sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def slugify(name: str) -> str:
    s = name.replace("Đ", "D").replace("đ", "d")
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s


# ---- VieNeu: lay danh sach that tu engine ----
from vieneu import Vieneu

v = Vieneu()
vieneu = []
for label, vid in v.list_preset_voices():
    # label dang: "Minh Đức — Nam · Bắc · Phong cách tin tức"
    parts = [p.strip() for p in label.split("·")]
    gender = "M" if "Nam" in parts[0].split("—")[-1] else "F"
    region = parts[1] if len(parts) > 1 else ""
    style = parts[2].replace("Phong cách", "").strip() if len(parts) > 2 else ""
    vieneu.append({
        "slug": slugify(vid),
        "real": vid,
        "gender": gender,
        "region": region,
        "style": style,
    })

# ---- Kokoro: slug CHINH LA id that, chi can nhan tieng Viet ----
KOKORO = [
    ("diem_trinh", "Diễm Trinh", "F"), ("hung_thinh", "Hưng Thịnh", "M"),
    ("mai_linh", "Mai Linh", "F"), ("mai_loan", "Mai Loan", "F"),
    ("manh_dung", "Mạnh Dũng", "M"), ("my_yen", "Mỹ Yến", "F"),
    ("ngoc_huyen", "Ngọc Huyền", "F"), ("phat_tai", "Phát Tài", "M"),
    ("thanh_dat", "Thành Đạt", "M"), ("thuc_trinh", "Thục Trinh", "F"),
    ("tuan_ngoc", "Tuấn Ngọc", "M"), ("storyvert", "Kể Chuyện", "F"),
    ("duc_an", "Đức Ân", "M"), ("duc_duy", "Đức Duy", "M"),
]

# ---- xuat bang map cho service ----
with open("services/tts-local/voices.py", "w", encoding="utf-8") as f:
    f.write('"""TU DONG SINH boi scripts/tts-gen-catalog.py — dung sua tay."""\n\n')
    f.write("# slug ASCII -> ten giong THAT cua VieNeu (co dau, co khoang trang).\n")
    f.write("# Dung slug o voice id de khoi dinh loi URL-encode xuyen cac tang.\n")
    f.write("VIENEU_VOICES = {\n")
    for x in vieneu:
        f.write(f'    "{x["slug"]}": "{x["real"]}",\n')
    f.write("}\n\nKOKORO_VOICES = [\n")
    for vid, _, _ in KOKORO:
        f.write(f'    "{vid}",\n')
    f.write("]\n")

# ---- xuat doan TypeScript ----
with open("scripts/voices-generated.ts", "w", encoding="utf-8") as f:
    f.write("// TU DONG SINH boi scripts/tts-gen-catalog.py — da xac minh tung giong sinh duoc audio.\n")
    f.write("export const VIENEU_VOICES = [\n")
    for x in vieneu:
        nice = f'{x["real"]} — {"nam" if x["gender"] == "M" else "nữ"} {x["region"]}'
        if x["style"]:
            nice += f' ({x["style"]})'
        f.write(f'  {{ id: "vieneu:{x["slug"]}", name: "{nice}", gender: "{x["gender"]}" as const }},\n')
    f.write("] as const;\n\nexport const KOKORO_VOICES = [\n")
    for vid, label, g in KOKORO:
        f.write(f'  {{ id: "kokoro:{vid}", name: "{label}", gender: "{g}" as const }},\n')
    f.write("] as const;\n")

print(json.dumps({"vieneu": len(vieneu), "kokoro": len(KOKORO)}, indent=2))
print("\n-- slug VieNeu --")
for x in vieneu:
    print(f'  {x["slug"]:14s} <- {x["real"]}  [{x["gender"]} {x["region"]} {x["style"]}]')
