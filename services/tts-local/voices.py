"""TU DONG SINH boi scripts/tts-gen-catalog.py — dung sua tay."""

# slug ASCII -> ten giong THAT cua VieNeu (co dau, co khoang trang).
# Dung slug o voice id de khoi dinh loi URL-encode xuyen cac tang.
VIENEU_VOICES = {
    "minh-duc": "Minh Đức",
    "pham-tuyen": "Phạm Tuyên",
    "thai-son": "Thái Sơn",
    "xuan-vinh": "Xuân Vĩnh",
    "thanh-binh": "Thanh Bình",
    "truc-ly": "Trúc Ly",
    "ngoc-linh": "Ngọc Linh",
    "doan-trang": "Đoan Trang",
    "mai-anh": "Mai Anh",
    "thuc-doan": "Thục Đoan",
    "minh-triet": "Minh Triết",
    "thuy-dung": "Thùy Dung",
    "quang-son": "Quang Sơn",
    "ngoc-tran": "Ngọc Trân",
}

KOKORO_VOICES = [
    "diem_trinh",
    "hung_thinh",
    "mai_linh",
    "mai_loan",
    "manh_dung",
    "my_yen",
    "ngoc_huyen",
    "phat_tai",
    "thanh_dat",
    "thuc_trinh",
    "tuan_ngoc",
    "storyvert",
    "duc_an",
    "duc_duy",
]
