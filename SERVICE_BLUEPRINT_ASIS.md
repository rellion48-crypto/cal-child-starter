# Service Blueprint (As-Is): cal.dudu

> **대상 사용자**: 김두두 (INTP, IT업계 기획자, 즉흥적 대처 성향)  
> **범위**: `cal.dudu` 서비스의 현재(As-Is) 예약 신청, 어드민 수동 확정, 구글 캘린더 연동 프로세스  
> **목적**: 사용자(고객/어드민)의 여정에 따른 프론트엔드, 백엔드/DB, 외부 API의 상호작용 및 병목 구간 분석

---

## 1. 서비스 블루프린트 구조도 (ASCII / Markdown Flow)

```text
[ 물리적 증거 (Physical Evidence) ]
 🖥️ 로그인 페이지 / 대시보드 / 캘린더 뷰 / 예약 폼 / 카카오 주소 검색 / 구글 캘린더 이벤트

-------------------------------------------------------------------------------------------------
[ 고객 행동 (Customer Actions) ]
 1. 로그인 ──> 2. 42슬롯 탐색 ──> 3. 예약 1~3개 희망 신청 ──> 4. 어드민 승인 대기 ──> 5. 구글 캘린더 연동
 
-------------------------------------------------------------------------------------------------
[ 프론트엔드 접점 (Front-stage Interactions) ]
 ㆍ Supabase Auth ──> ㆍ slots.ts (슬롯 가용성 조회) ──> ㆍ BookingForm / Decider ──> ㆍ MyBookings 상태 확인 ──> ㆍ Edge Function 호출

-------------------------------------------------------------------------------------------------
[ 백스테이지 접점 (Back-stage Interactions) ]
 ㆍ Auth 검증 ──> ㆍ PostgreSQL (slots, bookings 테이블 조회/삽입) ──> ㆍ 1~3개 희망 및 대기(비점유) 로직 처리 ──> ㆍ 어드민 수동 확정(점유) RPC 처리

-------------------------------------------------------------------------------------------------
[ 지원 프로세스 (Support Processes) ]
 ㆍ Supabase DB (RLS 보안 규칙) ──> ㆍ add-to-calendar Edge Function ──> ㆍ Google OAuth2 토큰 갱신 ──> ㆍ Google Calendar API
```

---

## 2. 단계별 서비스 블루프린트 상세 (As-Is)

| 단계 (Phase) | 고객 행동 (Customer Actions) | 프론트엔드 접점 (Front-stage) | 백스테이지 접점 (Back-stage) | 지원 프로세스 & 시스템 (Support / Tech) | As-Is Pain Points & Bottlenecks |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. 진입 및 인증** | 서비스를 실행하고 로그인 페이지에서 인증 수행 | `LoginPage.tsx`<br>`src/lib/supabase.ts` | Supabase Auth 세션 생성 및 권한 확인 | Supabase 인증 서버 | • 첫 실행 시 환경 변수나 로그인 설정 누락 시 진입 장벽 존재 |
| **2. 슬롯 탐색** | 42개 슬롯(9/9~22, 오전/오후/저녁) 및 캘린더 확인 | `Dashboard.tsx`<br>`CalendarView.tsx`<br>`src/lib/slots.ts` | `slots` 테이블 데이터 조회 (고객 식별자 미포함 공개 조회) | PostgreSQL DB | • 즉흥적인 성향의 유저가 빠른 시각적 파악을 원하나, 슬롯이 많아 직관적 필터링 아쉬움 |
| **3. 예약 신청** | 1~3개 희망 슬롯 선택 후 주소 및 서비스 입력 후 신청 | `BookingForm.tsx`<br>`KakaoAddressSearch.tsx`<br>`src/lib/decide.ts` | `bookings` 테이블에 '대기(Pending)' 상태로 1~3개 후보 저장 | PostgreSQL & RLS 보안 정책 | • 대기 상태는 비점유이므로 즉흥적 유저는 '바로 확정'되지 않아 답답함을 느낄 수 있음 |
| **4. 어드민 수동 확정** | (어드민 시점) 대기열 확인 후 수동으로 확정(점유) 처리 | `BookingTable.tsx`<br>`Dashboard.tsx` | 어드민 권한 체크 후 `bookings` 상태를 '확정(Confirmed)'으로 변경하는 RPC 실행 | PostgreSQL RPC (`SECURITY INVOKER`) | • 수동 승인 대기 시간 동안 즉흥적 일정이 틀어질 리스크 존재 |
| **5. 캘린더 연동** | 확정된 일정을 구글 캘린더에 원클릭으로 동기화 | `MyBookings.tsx` (Edge Function 연동) | `add-to-calendar` Edge Function 호출 (OAuth 토큰 갱신) | Google OAuth2 & Google Calendar API v3 | • 토큰 만료나 CORS 에러, 시간 포맷 오류 발생 시 동기화 실패로 흐름 단절 |

---

## 3. As-Is 요약 및 시사점 (인사이트)

1. **유저 페르소나(김두두, INTP 기획자) 관점의 평가**:
   - **강점**: 42개의 체계적인 슬롯과 카카오 주소 연동, 대기/확정 분리 구조 덕분에 논리적이고 깔끔한 예약 흐름 제공.
   - **약점 (병목)**: 즉흥적인 성향의 유저에게 '대기(비점유)'와 '어드민 수동 확정' 프로세스는 다소 호흡이 길고 답답하게 느껴질 수 있음. 또한 구글 캘린더 연동 단계에서 예외 발생 시 피드백이 직관적이지 못하면 불만이 가중됨.
2. **개선 방향 (To-Be 제안)**:
   - 예약 신청 즉시 실시간 상태 변화 피드백 강화
   - 구글 캘린더 연동 오류 시 명확한 에러 가이드 및 재시도(Operation ID) 버튼 제공
