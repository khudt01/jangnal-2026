#!/usr/bin/env python3
"""2026 함께하는 장날: 참석 응답을 명부와 대조해 '참석 현황.csv'를 생성한다.

사용법:
    python scripts/verify_roster.py

필요 파일: scripts/config.local.json (커밋 금지, 형식은 config.local.example.json 참조)
- functions_url, anon_key, admin_token: Supabase 접속 정보
- roster_xlsx: 조합원·후원회원 명부 xlsx (시트0 조합원, 시트1 후원회원, 헤더 3행)
- guest_csv: 외빈 명단 CSV (이름,연락처[,소속]) - 없으면 외빈 대조 생략
- output_csv: 출력 경로 (UTF-8 BOM)

명부는 로컬에서만 읽으며 어디에도 업로드하지 않는다.
"""
import csv
import json
import re
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
CONFIG_PATH = HERE / "config.local.json"


def norm_phone(value) -> str:
    """전화번호를 숫자만으로 정규화."""
    if value is None:
        return ""
    return re.sub(r"\D", "", str(value))


def norm_name(value) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", "", str(value))


def fmt_phone(digits: str) -> str:
    if re.fullmatch(r"01\d{9}", digits):
        return f"{digits[:3]}-{digits[3:7]}-{digits[7:]}"
    if re.fullmatch(r"01\d{8}", digits):
        return f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
    return digits


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        sys.exit(f"[오류] {CONFIG_PATH} 가 없습니다. config.local.example.json을 참고해 만들어 주세요.")
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def fetch_rows(cfg: dict) -> list[dict]:
    req = urllib.request.Request(
        cfg["functions_url"].rstrip("/") + "/admin-data",
        headers={
            "Authorization": "Bearer " + cfg["anon_key"],
            "x-admin-token": cfg["admin_token"],
        },
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        data = json.loads(res.read().decode("utf-8"))
    if not data.get("ok"):
        sys.exit(f"[오류] 응답 조회 실패: {data}")
    return data["rows"]


def find_col(header: list, keywords: list[str], fallback: int) -> int:
    """헤더 텍스트로 열 위치 탐지(0-base). 실패 시 fallback."""
    for i, cell in enumerate(header):
        text = str(cell or "")
        if any(k in text for k in keywords):
            return i
    return fallback


def load_roster(xlsx_path: str) -> dict[str, set]:
    """명부에서 (이름, 전화 뒤 8자리) 키 집합을 시트별로 만든다."""
    try:
        import openpyxl
    except ImportError:
        sys.exit("[오류] openpyxl이 필요합니다: pip install openpyxl")

    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    result: dict[str, set] = {}
    labels = ["조합원", "후원회원"]
    fallbacks = [(2, 12), (2, 7)]  # (성명 C열, 전화 M열), (성명 C열, 전화 H열)

    for idx, ws in enumerate(wb.worksheets[:2]):
        rows = ws.iter_rows(min_row=3, values_only=True)
        header = list(next(rows, []) or [])
        name_col = find_col(header, ["성명", "이름"], fallbacks[idx][0])
        phone_col = find_col(header, ["전화", "연락처", "휴대"], fallbacks[idx][1])
        keys = set()
        for row in rows:
            if row is None or len(row) <= max(name_col, phone_col):
                continue
            name = norm_name(row[name_col])
            phone = norm_phone(row[phone_col])
            if name and len(phone) >= 8:
                keys.add((name, phone[-8:]))
        result[labels[idx]] = keys
    return result


def load_guests(csv_path: str) -> set:
    p = Path(csv_path)
    if not p.exists():
        return set()
    keys = set()
    with p.open(encoding="utf-8-sig", newline="") as f:
        for row in csv.reader(f):
            if len(row) < 2:
                continue
            name = norm_name(row[0])
            phone = norm_phone(row[1])
            if name in ("이름", "성명") or not name:
                continue
            if len(phone) >= 8:
                keys.add((name, phone[-8:]))
    return keys


def classify(name: str, phone: str, roster: dict[str, set], guests: set, has_guest_file: bool) -> str:
    key = (norm_name(name), norm_phone(phone)[-8:])
    if key in roster.get("조합원", set()):
        return "조합원 명부 일치"
    if key in roster.get("후원회원", set()):
        return "후원회원 명부 일치"
    if key in guests:
        return "외빈 명단 일치"
    phone8 = key[1]
    all_phones = {p for keys in roster.values() for (_, p) in keys} | {p for (_, p) in guests}
    if phone8 in all_phones:
        return "연락처만 일치(확인 필요)"
    return "명부 불일치" if has_guest_file else "명부 불일치(외빈 명단 미대조)"


def main() -> None:
    cfg = load_config()
    rows = fetch_rows(cfg)
    roster = load_roster(cfg["roster_xlsx"])
    guest_path = cfg.get("guest_csv", "")
    has_guest_file = bool(guest_path) and Path(guest_path).exists()
    guests = load_guests(guest_path) if has_guest_file else set()

    out = Path(cfg["output_csv"])
    out.parent.mkdir(parents=True, exist_ok=True)

    header = [
        "제출시각", "수정시각", "참석여부", "이름", "연락처", "구분(자기선택)",
        "명부확인", "동반인원", "편의제공", "편의제공 기타", "남기실 말씀",
    ]
    attending = declined = 0
    with out.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        for r in sorted(rows, key=lambda x: x["created_at"]):
            if r["attendance"] == "참석":
                attending += 1
            else:
                declined += 1
            w.writerow([
                r["created_at"][:16].replace("T", " "),
                r["updated_at"][:16].replace("T", " "),
                r["attendance"],
                r["name"],
                fmt_phone(r["phone"]),
                r["category"],
                classify(r["name"], r["phone"], roster, guests, has_guest_file),
                r["companions"],
                "; ".join(r.get("accommodations") or []),
                r.get("accommodation_note") or "",
                r.get("note") or "",
            ])

    print(f"[완료] {out}")
    print(f"  응답 {len(rows)}건 (참석 {attending}, 불참 {declined})")
    print(f"  명부: 조합원 {len(roster.get('조합원', set()))}건, 후원회원 {len(roster.get('후원회원', set()))}건")
    if has_guest_file:
        print(f"  외빈 명단: {len(guests)}건")
    else:
        print("  외빈 명단: 파일 없음(대조 생략)")


if __name__ == "__main__":
    main()
