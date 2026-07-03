# 2026 함께하는 장날 모바일 초대장 웹앱 설계서

작성: 2026-07-03. 상태: 코어 구현 진행 중(콘셉트 스킨은 중집위원 의견 수렴 후 적용).

## 1. 목적

창립 7주년 기념 전국 조합원 대회(2026-07-25 토 17:30, 여의도) 초대장을 웹앱으로 제작한다. 조합원·후원회원·외빈 공통 1종. 행사 정보를 확인하고 초대장 안에서 바로 참석 여부와 개인정보(이름·연락처·편의제공 요청)를 제출한다. 구글폼 등 외부 링크를 쓰지 않는다(제10차 중집위 결정: 참석 응답으로 참석자 조사를 갈음).

## 2. 아키텍처

| 구성 | 선택 | 비고 |
|------|------|------|
| 프런트 | 바닐라 HTML/CSS/JS 정적 페이지 | pledge-machine 검증 패턴. 빌드 도구 없음 |
| 호스팅 | GitHub Pages (khudt01 계정, public repo `jangnal-2026`) | https://khudt01.github.io/jangnal-2026/ |
| DB | Supabase `jangnal-2026` (ref `ucspzjwckonvoorwzauu`, ap-northeast-2, free) | khudt01's Org. 월 0원 |
| API | Supabase Edge Functions 2종 | 아래 §4 |
| 참석 현황 | 관리자 페이지(admin.html) + Drive CSV 스냅숏 | 아래 §5 |

데이터 흐름: 초대장 폼 → `submit-rsvp`(service role upsert) → `rsvp` 테이블 → `admin-data`(토큰 검사) → 관리자 페이지/CSV.

## 3. 데이터 모델 (`public.rsvp`)

| 열 | 타입 | 제약 |
|----|------|------|
| id | uuid | pk |
| created_at / updated_at | timestamptz | 트리거로 updated_at 갱신 |
| name | text | 1~40자 |
| phone | text | 숫자만 8~12자리(정규화 저장) |
| attendance | text | '참석'/'불참' |
| category | text | '조합원'/'후원회원'/'외빈'/'기타' (자기선택) |
| companions | int | 0~5 (활동지원사 등 동반 인원) |
| accommodations | text[] | 편의제공 체크 항목 |
| accommodation_note | text | 편의제공 기타 (≤300자) |
| note | text | 남기실 말씀 (≤500자) |
| privacy_agreed | boolean | true 강제 |
| unique(name, phone) | | 같은 이름+연락처 재제출 시 덮어쓰기(응답 수정) |

RLS: 정책 없이 활성화 → anon 전면 차단. 모든 읽기·쓰기는 Edge Function(service role) 경유.

## 4. Edge Functions

### submit-rsvp (POST, verify_jwt=true)
- 입력 검증: 필수 필드, 길이, 화이트리스트(attendance/category/accommodations), 전화번호 정규화(숫자만).
- 허니팟 필드(`website`)가 채워져 있으면 저장 없이 ok 반환(봇 차단).
- upsert on (name, phone). 기존 행 존재 시 `updated: true` 반환 → UI가 "응답을 수정했습니다" 안내.
- CORS: `*` (제출 전용, 응답 데이터 노출 없음).

### admin-data (GET, verify_jwt=true)
- 헤더 `x-admin-token`을 secret `ADMIN_TOKEN`과 비교. 불일치 시 401.
- 전체 응답 배열 + 집계(참석/불참, 구분별, 편의제공별, 동반 포함 총 인원) JSON 반환.
- CSV는 서버가 아니라 관리자 페이지가 클라이언트에서 생성(토큰이 URL에 남지 않도록).

## 5. 참석 현황 확인 (중집위원)

1. **실시간**: `admin.html` 접속 → 토큰 입력(localStorage 저장) → 통계 + 전체 표 + CSV 다운로드 버튼. 링크와 토큰은 장날 준비 채팅방에 공유.
2. **Drive 스냅숏**: `scripts/verify_roster.py` 실행 시 `5. 홍보/참석 현황.csv`(UTF-8 BOM) 갱신.

### 참석자 분류 (자기선택 + 로컬 검증, 확정안)
- 폼에서 구분을 자기선택 → 실시간 CSV/관리자 페이지에 즉시 표기.
- `verify_roster.py`가 조합원·후원회원 명부 xlsx(비공개 자료, 로컬에서만 읽음)와 외빈 명단을 이름+연락처로 대조하여 `명부확인` 열(조합원 명부 일치/후원회원 명부 일치/외빈 명단 일치/명부 불일치)을 기록.
- 명부는 어떤 형태로도 외부 서버에 업로드하지 않는다.
- 명부 열 매핑: 두 시트 모두 헤더 3행·데이터 4행부터, 성명 C열, 전화번호는 조합원 시트 M열·후원회원 시트 H열(헤더 텍스트 탐지 우선, 실패 시 이 인덱스 폴백).
- 외빈 명단: `scripts/config.local.json`의 `guest_csv` 경로(이름,연락처,소속 CSV). 파일이 아직 없으면 외빈 대조만 생략.

## 6. 폼 명세

- 참석 여부(라디오, 필수): 참석 / 불참
- 이름(필수), 연락처(필수, 숫자 10~11자리 안내)
- 구분(라디오, 필수): 조합원 / 후원회원 / 외빈(초청 손님) / 기타
- 참석 시에만: 동반 인원(0~3, 활동지원사·보호자 등), 편의제공 체크(문자통역/수어통역/휠체어 접근/점자·큰글자 자료/기타+자유기술)
- 남기실 말씀(선택, 500자)
- 개인정보 수집·이용 동의(필수 체크): 항목(이름·연락처·편의제공 요청), 목적(행사 참석 관리·안내 연락), 보유 기간(행사 종료 후 30일 이내 파기), 거부 안내
- 같은 이름+연락처로 다시 제출하면 응답이 수정됨을 안내. 제출 성공 시 localStorage에 저장해 재방문 시 프리필.

## 7. 접근성 (접근성 헌장 전면 적용)

- 시맨틱 폼: label/fieldset/legend, 오류는 해당 필드에 연결(aria-describedby), 단일 polite live region으로 제출 상태 통지.
- 키보드 완전 조작, :focus-visible, 터치 타깃 ≥44px, word-break: keep-all, prefers-reduced-motion 지원.
- 과잉 ARIA 금지(불필요 landmark·중복 role·시각 텍스트 덮는 aria-label 없음). 한 논리적 줄은 단일 텍스트로.
- 콘셉트 스킨의 장식 요소(도장·두루마리·엽전 등)는 전부 aria-hidden 장식 처리, 정보는 텍스트로 전달.
- 다양한 감각: 위원장 인사말 음성 재생 버튼(선택 재생) 검토: 콘셉트 확정 후.

## 8. 보안·개인정보

- 명부(비공개 자료)는 로컬 스크립트에서만 읽고 외부 업로드 금지.
- 저장소는 public: ADMIN_TOKEN, 명부 경로, 개인정보는 커밋 금지(`scripts/config.local.json`은 gitignore).
- anon key는 공개 전제(RLS 전면 차단으로 직접 접근 불가).
- 행사 종료 후 30일 이내: `rsvp` 데이터 파기(truncate) 및 프로젝트 정리. 결과 보고 후 최종 명단은 `7. 결과 보고서, 보도자료/`에 보관.

## 9. 남은 작업 (콘셉트 확정 후)

- 시안 A/B 중 확정 콘셉트로 `css/theme.css` + 첫 화면 마크업 스킨 적용
- 단체 대표 사진 교체, 장소(식당) 확정 반영, 오시는 길(지도 링크)
- OG 태그 이미지(카카오톡 공유 미리보기) 제작
- 위원장 인사말(모시는 글) 확정 문안 + 음성(선택)
- 프로그램 순서 확정(제11차 중집위) 반영
