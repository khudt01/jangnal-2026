# 2026 함께하는 장날 모바일 초대장

함께하는장애인교원노동조합(장교조) 창립 7주년 기념 전국 조합원 대회(2026-07-25) 모바일 초대장 웹앱.

- 초대장: `index.html` (행사 안내 + 인앱 참석 응답)
- 참석 현황: `admin.html` (열람 암호 필요, 임원 전용)
- 백엔드: Supabase (RLS 전면 차단 + Edge Functions `submit-rsvp`, `admin-data`)
- 호스팅: GitHub Pages

설계 상세는 `docs/spec.md` 참조. 응답 데이터는 행사 종료 후 30일 이내 파기한다.

## 접근성

스크린 리더 완전 대응(시맨틱 폼, 단일 polite live region), 키보드 완전 조작, 터치 타깃 44px 이상, prefers-reduced-motion 지원. 장식 요소는 aria-hidden 처리하고 정보는 텍스트로 전달한다.

## 로컬 스크립트

`scripts/verify_roster.py`: 응답을 내려받아 명부와 대조(이름+연락처)한 참석 현황 CSV를 생성한다. 실행에는 `scripts/config.local.json`(비공개, 커밋 금지)이 필요하다. 형식은 `scripts/config.local.example.json` 참조.
