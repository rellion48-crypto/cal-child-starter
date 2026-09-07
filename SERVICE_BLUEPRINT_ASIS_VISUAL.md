# Service Blueprint (As-Is): cal.dudu (Visual Mermaid Diagram)

> **대상 사용자**: 김두두 (31세 · IT 서비스 기획자, INTP)  
> **범위**: `cal.dudu` 온라인 일정 예약 서비스의 5단계 여정, 관리자 수동 확정(백스테이지) 및 데이터베이스 트랜잭션  
> **원칙**: 사용자 행동(Customer Actions)은 김두두 1인의 실제 여정으로 고정하며, 관리자 확정 작업은 후면 운영 접점(Back-stage)으로 분리하고 제작자·개발자 관점을 배제함

---

## 📊 1. Service Blueprint 사용자 여정 (Mermaid Journey)

```mermaid
journey
    title cal.dudu 현행 예약 여정 (페르소나: 김두두 1인)
    section 1. 접속 및 로그인
      예약 링크 접속 & 본인 계정 로그인: 5: 김두두 (고객)
    section 2. 42슬롯 탐색
      14일 42개 슬롯 일정 및 잔여 시간대 확인: 4: 김두두 (고객)
    section 3. 1~3순위 희망 신청
      선호 시간대 1~3개 선택 후 신청서 제출: 4: 김두두 (고객)
    section 4. 접수 확인 및 결과 대기
      정상 접수 확인 후 관리자 확정 결과 대기: 3: 김두두 (고객)
    section 5. 최종 확정 (or 재선택)
      확정 일정 확인 및 캘린더 등록 (마감 시 재선택): 4: 김두두 (고객)
```

---

## 🧩 2. 계층별 상호작용 아키텍처 (Mermaid Flowchart)

```mermaid
flowchart TB
    subgraph Evidence ["🖥️ 1. 물리적 증거 (Physical Evidence)"]
        E1["<b>일정 예약 링크 & 로그인 화면</b><br/><small>일정 예약 링크 접속 및 로그인 폼</small>"]
        E2["<b>14일 42슬롯 일정표</b><br/><small>오전·오후·저녁 42개 슬롯 (가능/마감 배지)</small>"]
        E3["<b>희망 슬롯 선택 폼</b><br/><small>1~3순위 선택 칩 & [신청하기] 버튼</small>"]
        E4["<b>신청 접수 확인 화면</b><br/><small>접수 상태(received) 배지 & 관리자 검토 안내</small>"]
        E5["<b>일정 확정 카드 / 재선택 폼</b><br/><small>확정 일시 표기 카드 / 마감 알림 & 새 슬롯 선택</small>"]
    end

    subgraph Customer ["👤 2. 고객 행동 (Customer Actions - 김두두 1인)"]
        U1["<b>1. 예약 접속 및 로그인</b><br/><small>일정 조율 링크 확인 후 본인 계정 로그인</small>"]
        U2["<b>2. 42개 슬롯 일정 탐색</b><br/><small>프로젝트 일정 및 파트너사 미팅 시간 대조</small>"]
        U3["<b>3. 1~3순위 희망 슬롯 신청</b><br/><small>선호 시간대 1~3개 선택 후 신청서 제출</small>"]
        U4["<b>4. 접수 확인 및 결과 대기</b><br/><small>정상 접수 확인 후 관리자 배정 결과 대기</small>"]
        U5["<b>5. 확정 일정 확인 / 마감 시 재선택</b><br/><small>확정 일정을 캘린더에 등록 (마감 시 재선택)</small>"]
    end

    subgraph FrontStage ["🌐 3. 전면 서비스 접점 (Front-stage Interfaces)"]
        F1["<b>AuthModal.tsx & App.tsx</b><br/><small>로그인 폼 표출 및 사용자 인증 세션 관리</small>"]
        F2["<b>SlotTable.tsx</b><br/><small>42개 슬롯 가용성 및 지난 슬롯 비활성화 표출</small>"]
        F3["<b>CustomerPage.tsx</b><br/><small>1~3개 선택 유효성 검증 및 신청 접수 처리</small>"]
        F4["<b>CustomerPage & NotificationBanner</b><br/><small>신청 접수(received) 피드백 및 대기 상태 표출</small>"]
        F5["<b>CustomerPage.tsx (Status/Reselect)</b><br/><small>확정 결과 카드 표출 또는 재선택 폼 렌더링</small>"]
    end

    subgraph BackStage ["⚙️ 4. 후면 운영 접점 (Back-stage & Admin Operations)"]
        B1["<b>세션 검증 & 고객 계정 식별</b><br/><small>auth.uid() 고객 계정 세션 매핑</small>"]
        B2["<b>슬롯 가용성 조회</b><br/><small>개인식별정보 제외 slots 공개 쿼리</small>"]
        B3["<b>submit_request 실행</b><br/><small>requests & candidates 1~3 비점유 대기열 등록</small>"]
        B4["<b>관리자 대기열 검토 및 수동 확정</b><br/><small>AdminPage 대기열 검토 후 후보 내 1개 확정(confirm_request)</small>"]
        B5["<b>마감 처리 및 재선택 상태 전이</b><br/><small>타 고객 확정으로 전 후보 마감 시 needs_reselection 자동 갱신</small>"]
    end

    subgraph Support ["🛠️ 5. 지원 시스템 & DB (Support Processes)"]
        S1["<b>인증 서버 (Supabase GoTrue)</b><br/><small>사용자 계정 및 세션 토큰 관리</small>"]
        S2["<b>PostgreSQL slots 테이블</b><br/><small>42개 고정 슬롯 마스터</small>"]
        S3["<b>PostgreSQL requests & candidates</b><br/><small>신청서 및 1~3순위 후보 저장</small>"]
        S4["<b>PostgreSQL confirm_request RPC</b><br/><small>배타적 슬롯 점유 마감 직렬화 트랜잭션</small>"]
        S5["<b>PostgreSQL operation_logs</b><br/><small>작업 멱등성 검증 및 변경 감사 추적</small>"]
    end

    %% 연결 관계 매핑
    E1 -.- U1
    E2 -.- U2
    E3 -.- U3
    E4 -.- U4
    E5 -.- U5

    U1 ==> F1 ==> B1 ==> S1
    U2 ==> F2 ==> B2 ==> S2
    U3 ==> F3 ==> B3 ==> S3
    U4 ==> F4 ==> B4 ==> S4
    U5 ==> F5 ==> B5 ==> S5
```

---

## 🔍 핵심 특징 및 병목 구간 분석

1. **단일 고객 여정과 운영 백스테이지의 명확한 분리**
   - **설계 원칙**: 고객 행동 레인은 오직 서비스 이용자인 **김두두(기획자)** 1인의 시선에서 수행하는 실제 행동만 기록합니다.
   - **운영 분리**: 관리자(어드민)의 대기열 검토 및 수동 확정 클릭은 전면 행동이 아닌 **후면 운영 접점(Back-stage)**에 배치되어 배타적 점유 마감 트랜잭션을 트리거합니다.
2. **비점유 접수와 관리자 수동 확정 간의 대기 시간 (Bottleneck)**
   - **현상**: 고객이 원하는 1~3순위 슬롯을 제출해도 슬롯이 점유되지 않는 대기(received) 상태로 유지되며, 관리자가 수동 확정하기 전까지 결과를 기다려야 합니다.
   - **시사점**: 여러 사용자가 동일 시간대를 신청할 경우, 관리자가 다른 고객을 먼저 확정하면 김두두는 전 후보 소진으로 '재선택 필요(needs_reselection)' 상태가 될 수 있습니다. (To-Be에서 3순위 넛지 및 원클릭 스마트 프리셋으로 해결)

