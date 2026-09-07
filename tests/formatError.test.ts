import { describe, it, expect } from 'vitest';
import { formatErrorMessage } from '../src/utils/formatError';

describe('formatErrorMessage', () => {
  it('should format Supabase auth errors into friendly Korean', () => {
    expect(formatErrorMessage('Invalid login credentials')).toBe(
      '이메일 또는 비밀번호가 일치하지 않습니다. 확인 후 다시 입력해주세요.'
    );
    expect(formatErrorMessage('Email not confirmed')).toBe(
      '이메일 인증이 완료되지 않았습니다. 메일함을 확인하여 인증 링크를 클릭해주세요.'
    );
    expect(formatErrorMessage('User already registered')).toBe(
      '이미 가입된 이메일 주소입니다. 로그인 화면에서 로그인을 진행해주세요.'
    );
    expect(formatErrorMessage('Password should be at least 6 characters')).toBe(
      '비밀번호는 최소 6자 이상으로 입력해주세요.'
    );
    expect(formatErrorMessage('Rate limit exceeded')).toBe(
      '단시간 내 접속 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
    );
  });

  it('should format business logic / RPC errors into friendly Korean', () => {
    expect(formatErrorMessage('Customer ID mismatch')).toBe(
      '로그인된 계정 정보와 신청 고객 정보가 일치하지 않습니다. 다시 로그인 후 시도해주세요.'
    );
    expect(formatErrorMessage('Select 1-3 slots')).toBe(
      '예약 희망 슬롯은 최소 1개에서 최대 3개까지 선택할 수 있습니다.'
    );
    expect(formatErrorMessage('Some slots are closed')).toBe(
      '선택하신 슬롯 중 다른 고객에게 먼저 마감(확정)된 일정이 포함되어 있습니다. 다른 일정을 선택해주세요.'
    );
    expect(formatErrorMessage('Slot confirmed')).toBe(
      '선택하신 슬롯 중 다른 고객에게 먼저 마감(확정)된 일정이 포함되어 있습니다. 다른 일정을 선택해주세요.'
    );
    expect(formatErrorMessage('already confirmed')).toBe(
      '이미 예약 확정이 완료된 신청 내역입니다.'
    );
    expect(formatErrorMessage('Not owner')).toBe(
      '본인이 신청한 예약 내역만 변경하거나 재선택할 수 있습니다.'
    );
    expect(formatErrorMessage('Request not found')).toBe(
      '해당 예약 신청 내역을 찾을 수 없습니다.'
    );
    expect(formatErrorMessage('Not in candidates')).toBe(
      '고객이 실제로 희망한 후보 일정 중에서만 확정할 수 있습니다.'
    );
  });

  it('should format connection and system errors into friendly Korean', () => {
    expect(formatErrorMessage('Failed to fetch')).toBe(
      '서버 및 데이터베이스와의 연결이 원활하지 않습니다. 네트워크 상태를 확인하시거나 잠시 후 다시 시도해주세요.'
    );
    expect(formatErrorMessage('데이터베이스 연결 실패')).toBe(
      '서버 및 데이터베이스와의 연결이 원활하지 않습니다. 네트워크 상태를 확인하시거나 잠시 후 다시 시도해주세요.'
    );
    expect(formatErrorMessage(new Error('Network request failed'))).toBe(
      '서버 및 데이터베이스와의 연결이 원활하지 않습니다. 네트워크 상태를 확인하시거나 잠시 후 다시 시도해주세요.'
    );
  });

  it('should handle falsy values gracefully', () => {
    expect(formatErrorMessage(null)).toBe('일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    expect(formatErrorMessage('')).toBe('일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  });
});
