> 🤖 **이 파일은 자동 생성됩니다. 직접 수정하지 마세요.**
> 정본은 `CLAUDE.md` 입니다. 내용을 바꾸려면 `CLAUDE.md` 를 수정한 뒤
> 프로젝트 루트에서 `python sync_agent_docs.py` 를 실행하세요.
> 이 파일을 직접 고치면 다음 동기화 때 경고와 함께 덮어쓰기 대상이 됩니다.

<!-- SYNC-BODY-START: 이 줄 아래 본문은 CLAUDE.md 와 100% 동일하게 자동 생성됨 -->
# jangnal-2026: 코딩 에이전트 작업 지침

이 파일은 Claude Code(claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드다.

> ⚠ 이 저장소는 **public**(GitHub Pages 호스팅)이다. 열람 암호(ADMIN_TOKEN), 명부·개인정보, 내부 폴더 경로를 절대 커밋하지 않는다. 로컬 전용 값은 `scripts/config.local.json`(gitignore됨)에만 둔다.

## 개요

2026 함께하는 장날(장교조 창립 7주년, 2026-07-25) 모바일 초대장. 바닐라 HTML/CSS/JS 정적 페이지 + Supabase(Edge Functions) 백엔드. 빌드 도구 없음.

| 파일 | 역할 |
|------|------|
| `index.html` + `js/app.js` | 초대장 + 인앱 참석 응답 폼 |
| `admin.html` + `js/admin.js` | 임원용 현황 페이지(열람 암호) + CSV 다운로드 |
| `css/base.css` | 접근성·폼 공통 베이스 |
| `css/theme.css` | 콘셉트 스킨(시안 확정 후 교체) |
| `js/config.js` | Functions URL + anon key(공개 전제) |
| `supabase/` | 마이그레이션 사본 + Edge Functions 소스(배포는 MCP) |
| `scripts/verify_roster.py` | 명부 대조 참석 현황 CSV 생성(로컬 전용) |
| `docs/spec.md` | 설계서(데이터 모델·API·보안·접근성) |

## 규칙

- **접근성 우선**: 사용자 접근성 헌장 전면 적용. 시맨틱 폼, 단일 polite live region(`#status`), 과잉 ARIA 금지, 한 논리적 줄은 단일 텍스트, 장식은 aria-hidden.
- **명부는 로컬에서만**: 조합원·후원회원 명부(비공개 자료)는 어떤 형태로도 Supabase·저장소에 올리지 않는다. 분류는 자기선택 + `verify_roster.py` 로컬 검증.
- **Edge Function 수정 시**: 이 저장소의 소스를 고친 뒤 Supabase MCP `deploy_edge_function`으로 재배포하고 소스 사본을 커밋한다(이중 관리 방지).
- **날짜 표기**: 요일 병기 시 반드시 결정론적 도구로 검증. em dash 금지.
- **데이터 파기**: 행사 종료 후 30일 이내 `rsvp` 데이터 파기. 파기 전 최종 명단은 내부 폴더(7. 결과 보고서)로 옮긴다.
