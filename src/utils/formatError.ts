/**
 * 시스템/DB/영문 에러 메시지를 일반 사용자가 이해하기 쉬운 친절한 한글 안내 문구로 변환합니다.
 */
export function formatErrorMessage(rawError: unknown): string {
  if (!rawError) {
    return '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }

  let message = '';
  if (typeof rawError === 'string') {
    message = rawError;
  } else if (typeof rawError === 'object' && rawError !== null) {
    const errObj = rawError as any;
    message = errObj.message || errObj.error || errObj.error_description || String(rawError);
  } else {
    message = String(rawError);
  }

  const trimmed = message.trim();

  // 1. Supabase 인증 및 로그인 관련
  if (/invalid login credentials/i.test(trimmed)) {
    return '이메일 또는 비밀번호가 일치하지 않습니다. 확인 후 다시 입력해주세요.';
  }
  if (/email not confirmed/i.test(trimmed)) {
    return '이메일 인증이 완료되지 않았습니다. 메일함을 확인하여 인증 링크를 클릭해주세요.';
  }
  if (/user already registered/i.test(trimmed)) {
    return '이미 가입된 이메일 주소입니다. 로그인 화면에서 로그인을 진행해주세요.';
  }
  if (/password should be at least/i.test(trimmed)) {
    return '비밀번호는 최소 6자 이상으로 입력해주세요.';
  }
  if (/signup requires a valid password/i.test(trimmed)) {
    return '올바른 형식의 비밀번호를 입력해주세요.';
  }
  if (/unable to validate email address|invalid format/i.test(trimmed)) {
    return '올바른 이메일 주소 형식(예: user@test.com)으로 입력해주세요.';
  }
  if (/rate limit/i.test(trimmed)) {
    return '단시간 내 접속 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }
  if (/not authenticated/i.test(trimmed)) {
    return '로그인이 필요한 서비스입니다. 먼저 로그인해주세요.';
  }
  if (/not authorized|not admin/i.test(trimmed)) {
    return '관리자 권한이 없습니다. 관리자 계정으로 로그인해주세요.';
  }

  // 2. 예약 신청 및 고객 식별 관련
  if (/customer id mismatch/i.test(trimmed)) {
    return '로그인된 계정 정보와 신청 고객 정보가 일치하지 않습니다. 다시 로그인 후 시도해주세요.';
  }
  if (/select 1-3 slots|invalid slot count|최소 1개|최대 3개|1~3개/i.test(trimmed)) {
    return '예약 희망 슬롯은 최소 1개에서 최대 3개까지 선택할 수 있습니다.';
  }
  if (/some slots are closed|slot confirmed|slot closed|마감된 슬롯|확정된 슬롯|이미 확정된 슬롯/i.test(trimmed)) {
    return '선택하신 슬롯 중 다른 고객에게 먼저 마감(확정)된 일정이 포함되어 있습니다. 다른 일정을 선택해주세요.';
  }
  if (/슬롯 시작 시각이 지났습니다/i.test(trimmed)) {
    return '이미 시작 시간이 지난 일정은 예약할 수 없습니다. 향후 일정을 선택해주세요.';
  }
  if (/중복된 슬롯/i.test(trimmed)) {
    return '동일한 일정이 중복 선택되었습니다. 서로 다른 슬롯을 선택해주세요.';
  }
  if (/already confirmed|이미 확정된 요청/i.test(trimmed)) {
    return '이미 예약 확정이 완료된 신청 내역입니다.';
  }
  if (/request not found|요청을 찾을 수 없습니다/i.test(trimmed)) {
    return '해당 예약 신청 내역을 찾을 수 없습니다.';
  }
  if (/not owner|not request owner|not found or not owner/i.test(trimmed)) {
    return '본인이 신청한 예약 내역만 변경하거나 재선택할 수 있습니다.';
  }
  if (/cannot reselect|재선택/i.test(trimmed)) {
    return '신청하신 후보 슬롯이 모두 마감되어 재선택 안내를 받은 건만 다시 신청할 수 있습니다.';
  }
  if (/not in candidates|원래 희망/i.test(trimmed)) {
    return '고객이 실제로 희망한 후보 일정 중에서만 확정할 수 있습니다.';
  }
  if (/duplicate|중복/i.test(trimmed)) {
    return '이미 정상적으로 접수 및 처리된 요청입니다.';
  }
  if (/슬롯을 찾을 수 없습니다/i.test(trimmed)) {
    return '선택하신 예약 슬롯을 찾을 수 없습니다.';
  }

  // 3. 네트워크 및 데이터베이스 연결 관련
  if (/failed to fetch|network|연결 실패|database connection/i.test(trimmed)) {
    return '서버 및 데이터베이스와의 연결이 원활하지 않습니다. 네트워크 상태를 확인하시거나 잠시 후 다시 시도해주세요.';
  }
  if (/supabase not configured/i.test(trimmed)) {
    return '데이터베이스 접속 설정(환경 변수)이 완료되지 않았습니다.';
  }
  if (/invalid response format/i.test(trimmed)) {
    return '서버 응답 처리에 실패했습니다. 페이지를 새로고침한 후 다시 시도해주세요.';
  }

  return trimmed;
}
