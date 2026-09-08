import React, { useState, useEffect } from 'react';
import { SlotTable } from './SlotTable';
import type { Slot, Request, Candidate } from '../types';
import { OperationManager } from '../utils/operations';
import { DatabaseManager } from '../utils/database';
import { SupabaseManager } from '../utils/supabaseManager';
import { decideRequestStatus } from '../utils/decide';
import { TIME_SLOTS } from '../utils/constants';
import { formatErrorMessage } from '../utils/formatError';

interface CustomerPageProps {
  db: DatabaseManager | SupabaseManager;
  mode: 'local' | 'supabase';
  userId?: string;
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const CustomerPage: React.FC<CustomerPageProps> = ({ db, mode, userId, onNotify }) => {
  // 로컬 모드에서는 C01, C02 등 선택 가능, Supabase 모드에서는 전달받은 userId(UUID) 우선 사용
  const [customerId, setCustomerId] = useState<string>('C01');
  const activeCustomerId = mode === 'supabase' && userId ? userId : customerId;

  const [stage, setStage] = useState<'select' | 'confirm' | 'view' | 'reselect'>('select');
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [slots, setSlots] = useState<Record<string, Slot>>({});
  const [customerRequests, setCustomerRequests] = useState<
    Array<{ request: Request; candidates: Candidate[]; decision: any }>
  >([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // db가 변경될 때마다 새로운 OperationManager 생성
  const om = db ? new OperationManager(db) : null;
  const isSupabase = mode === 'supabase' && db instanceof SupabaseManager;

  // 초기 로드
  useEffect(() => {
    if (db) {
      loadData();
    }
  }, [activeCustomerId, db]);

  const loadData = async () => {
    if (!db || !om) return;
    if (isSupabase) {
      try {
        await (db as SupabaseManager).initialize();
      } catch (err) {
        console.error('Supabase initialize error:', err);
      }
    }
    const state = db.getState();
    setSlots(state.slots);
    const status = om.getCustomerStatus(activeCustomerId);
    setCustomerRequests(status);
    setError('');
    setSuccess('');

    // 신청 상태에 따라 stage 결정
    // 고객당 여러 신청 가능 - 항상 새 신청 가능
    const hasNeedsReselection = status.some(s => s.request.status === 'needs_reselection');

    if (hasNeedsReselection) {
      // 재선택이 필요한 신청이 있으면 우선 표시
      setStage('reselect');
    } else {
      // 새 신청 선택 가능
      setStage('select');
    }

    setSelectedSlots([]);
  };

  const handleSlotToggle = (slotId: string) => {
    setSelectedSlots(prev => {
      if (prev.includes(slotId)) {
        return prev.filter(s => s !== slotId);
      } else if (prev.length < 3) {
        return [...prev, slotId];
      }
      return prev;
    });
    setError('');
  };

  // [Must Have 2] 3순위 최대 선택 권장 넛지 모달/상태
  const [showNudgePrompt, setShowNudgePrompt] = useState(false);

  // [Must Have 1] 이전 희망 패턴 기반 스마트 대체 슬롯 계산
  // 이유: 재선택 발생 시 42개 슬롯을 처음부터 다시 탐색하는 인지적 피로를 없애고,
  // 이전 선호 시간대(오전/오후/저녁)의 열린 슬롯을 즉시 1클릭으로 담아 빠른 재접수를 지원함.
  const getSmartRecommendations = (): string[] => {
    if (customerRequests.length === 0) return [];
    const latest = customerRequests[customerRequests.length - 1];
    if (!latest || !latest.candidates || latest.candidates.length === 0) return [];

    // 이전 1순위 후보의 선호 시간대 파악 (기본 'am')
    const firstCandidateSlot = slots[latest.candidates[0]?.slotId];
    const preferredTimeLabel = firstCandidateSlot?.timeLabel || 'am';

    // 현재 열린(available) 슬롯 필터링
    const availableSlots = Object.values(slots).filter(s => s.status === 'available');

    // 1) 이전 선호 시간대와 일치하는 열린 슬롯 우선 정렬 (날짜 순)
    const sameTimeSlots = availableSlots
      .filter(s => s.timeLabel === preferredTimeLabel)
      .sort((a, b) => a.date.localeCompare(b.date));

    // 2) 다른 시간대의 열린 슬롯 (날짜 순)
    const otherTimeSlots = availableSlots
      .filter(s => s.timeLabel !== preferredTimeLabel)
      .sort((a, b) => a.date.localeCompare(b.date));

    // 최대 3개 추천 슬롯 ID 조합
    const combined = [...sameTimeSlots, ...otherTimeSlots].slice(0, 3);
    return combined.map(s => s.id);
  };

  const handleApplySmartRecommendation = () => {
    const recommended = getSmartRecommendations();
    if (recommended.length > 0) {
      setSelectedSlots(recommended);
      onNotify?.(`스마트 추천 슬롯 ${recommended.length}개가 자동 선택되었습니다!`, 'success');
    }
  };

  const handleProceedToConfirm = () => {
    // 1~2개 선택 시 3개 채우기 권장 넛지 표시
    if (selectedSlots.length > 0 && selectedSlots.length < 3) {
      setShowNudgePrompt(true);
    } else {
      setStage('confirm');
    }
  };

  const handleConfirmWithCurrentSlots = () => {
    setShowNudgePrompt(false);
    setStage('confirm');
  };

  const handleSubmit = async () => {
    if (!om) {
      setError(formatErrorMessage('데이터베이스 연결 실패'));
      return;
    }

    if (selectedSlots.length === 0) {
      setError('예약 희망 슬롯을 최소 1개 이상 선택해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const operationId = `submit-${activeCustomerId}-${Date.now()}`;

      let result;
      if (isSupabase) {
        result = await (db as SupabaseManager).submitRequest(activeCustomerId, selectedSlots, operationId);
      } else {
        result = await om!.submitRequest(activeCustomerId, selectedSlots, operationId);
      }

      if (result.success) {
        setSuccess('신청이 완료되었습니다!');
        setSelectedSlots([]);
        setStage('view');
        onNotify?.('신청이 완료되었습니다!', 'success');
        setTimeout(() => loadData(), 500);
      } else {
        const friendlyError = formatErrorMessage(result.error || '신청 처리 중 문제가 발생했습니다.');
        setError(friendlyError);
        onNotify?.(friendlyError, 'error');
      }
    } catch (err) {
      const friendlyError = formatErrorMessage(err);
      setError(friendlyError);
      onNotify?.(friendlyError, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReselect = async () => {
    if (selectedSlots.length === 0) {
      setError('새로 신청할 희망 슬롯을 최소 1개 이상 선택해주세요.');
      return;
    }

    if (!om) {
      setError(formatErrorMessage('데이터베이스 연결 실패'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const latest = customerRequests[customerRequests.length - 1];
      const operationId = `reselect-${latest.request.id}-${Date.now()}`;

      let result;
      if (isSupabase) {
        result = await (db as SupabaseManager).resubmitRequest(
          activeCustomerId,
          latest.request.id,
          selectedSlots,
          operationId
        );
      } else {
        result = await om!.resubmitRequest(
          activeCustomerId,
          latest.request.id,
          selectedSlots,
          operationId
        );
      }

      if (result.success) {
        setSuccess('재선택 신청이 완료되었습니다!');
        setSelectedSlots([]);
        setStage('view');
        onNotify?.('재선택 신청이 완료되었습니다!', 'success');
        setTimeout(() => loadData(), 500);
      } else {
        const friendlyError = formatErrorMessage(result.error || '재선택 처리 중 문제가 발생했습니다.');
        setError(friendlyError);
        onNotify?.(friendlyError, 'error');
      }
    } catch (err) {
      const friendlyError = formatErrorMessage(err);
      setError(friendlyError);
      onNotify?.(friendlyError, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedSlots([]);
    setStage('view');
    setError('');
  };

  // 슬롯 상태가 변경되었는지 확인
  const checkSlotAvailability = () => {
    if (stage === 'confirm' && customerRequests.length > 0) {
      const latest = customerRequests[customerRequests.length - 1];
      const currentState = db.getState();
      const decision = decideRequestStatus(latest.request, currentState.candidates, currentState.slots);

      if (decision.status !== 'ok') {
        setError('선택하신 슬롯이 다른 고객에게 먼저 마감되었습니다. 다른 일정을 다시 선택해주세요.');
        setStage('reselect');
        setSelectedSlots([]);
        return false;
      }
    }
    return true;
  };

  return (
    <div className="customer-page">
      <div className="form-group">
        <label>고객 코드 {mode === 'supabase' && '(로그인된 사용자)'}</label>
        {mode === 'local' ? (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              style={{ padding: '8px 14px', fontSize: '14px', borderRadius: '4px', border: '1.5px solid #2563eb', fontWeight: 'bold', background: '#eff6ff', color: '#1e40af' }}
            >
              <option value="C01">고객 C01 (기본 신청자)</option>
              <option value="C02">고객 C02 (경합 테스트용 고객)</option>
              <option value="C03">고객 C03</option>
            </select>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              💡 로컬 모드에서는 고객 코드를 C01/C02로 변경하여 <strong>다중 고객 경합 및 재선택 시나리오</strong>를 직접 테스트할 수 있습니다.
            </span>
          </div>
        ) : (
          <input
            type="text"
            value={activeCustomerId}
            onChange={() => {}}
            placeholder="C01"
            disabled
          />
        )}
      </div>

      {/* 상단 네비게이션 탭: 새 예약 신청 vs 내 예약 진행 상황 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => {
            setStage('select');
            setError('');
          }}
          style={{
            padding: '10px 18px',
            borderRadius: '6px',
            border: 'none',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            background: stage === 'select' || stage === 'confirm' ? '#2563eb' : '#f1f5f9',
            color: stage === 'select' || stage === 'confirm' ? 'white' : '#475569',
            transition: 'all 0.2s',
          }}
        >
          📅 새 일정 예약 신청
        </button>

        <button
          type="button"
          onClick={() => {
            setStage('view');
            setError('');
          }}
          style={{
            padding: '10px 18px',
            borderRadius: '6px',
            border: 'none',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            background: stage === 'view' ? '#2563eb' : '#f1f5f9',
            color: stage === 'view' ? 'white' : '#475569',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>📊 내 예약 진행 상황</span>
          {customerRequests.length > 0 && (
            <span
              style={{
                background: stage === 'view' ? 'white' : '#2563eb',
                color: stage === 'view' ? '#2563eb' : 'white',
                borderRadius: '10px',
                padding: '1px 7px',
                fontSize: '11px',
                fontWeight: 800,
              }}
            >
              {customerRequests.length}
            </span>
          )}
        </button>

        {customerRequests.some(s => s.request.status === 'needs_reselection') && (
          <button
            type="button"
            onClick={() => {
              setStage('reselect');
              setSelectedSlots([]);
              setError('');
            }}
            style={{
              padding: '10px 18px',
              borderRadius: '6px',
              border: 'none',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: 'pointer',
              background: stage === 'reselect' ? '#d97706' : '#fffbeb',
              color: stage === 'reselect' ? 'white' : '#b45309',
              transition: 'all 0.2s',
            }}
          >
            ⚠️ 대체 슬롯 재선택 필요
          </button>
        )}
      </div>

      {/* 예약 진행 중인 건이 있을 때 select 화면 상단에 알림 바 표출 */}
      {stage === 'select' && customerRequests.some(s => s.request.status === 'received') && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '10px 16px', marginBottom: '16px', fontSize: '13px', color: '#1e40af', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⏳</span>
            <span>현재 <strong>관리자 확인 대기 중</strong>인 예약이 있습니다. (서버 전송 완료 ➔ 심사 대기 중)</span>
          </div>
          <button
            type="button"
            onClick={() => setStage('view')}
            style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            진행 상황 확인하기 →
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>✅</span>
          <span>{success}</span>
        </div>
      )}

      {stage === 'select' && (
        <div>
          <h3>슬롯 선택 (1~3개)</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>
            원하는 슬롯을 선택하고 제출하세요. 선택 순서가 희망 우선순위입니다.
          </p>
          <SlotTable
            slots={slots}
            selectedSlots={selectedSlots}
            onToggle={handleSlotToggle}
            mode="select"
            maxSelect={3}
          />

          <div style={{ marginBottom: '20px' }}>
            <h4>선택한 슬롯 ({selectedSlots.length}/3)</h4>
            <ul className="list">
              {selectedSlots.map((slotId, idx) => {
                const slot = slots[slotId];
                return (
                  <li key={slotId}>
                    <span>
                      {idx + 1}. {slot?.date} {TIME_SLOTS.find(t => t.label === slot?.timeLabel)?.displayLabel}
                    </span>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleSlotToggle(slotId)}
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      제거
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* [Must Have 2] 3순위 최대 선택 권장 넛지 배너 */}
          {selectedSlots.length > 0 && selectedSlots.length < 3 && (
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', padding: '12px 16px', marginBottom: '16px', fontSize: '13.5px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>💡</span>
              <div>
                <strong>[3순위 선택 권장 넛지]</strong> 현재 <strong>{selectedSlots.length}개</strong> 선택됨. 최대 3개까지 모두 선택하시면 다른 고객과 경합 시 <strong>전원 마감될 위험을 67% 방지</strong>할 수 있습니다. (남은 선택 가능: <strong>{3 - selectedSlots.length}개</strong>)
              </div>
            </div>
          )}

          {selectedSlots.length === 3 && (
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '12px 16px', marginBottom: '16px', fontSize: '13.5px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>✅</span>
              <div>
                <strong>[선택 최적화 완료]</strong> 3순위까지 모두 채워졌습니다! 타 고객 경합 시 확정 확률이 극대화되었습니다.
              </div>
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleProceedToConfirm}
            disabled={selectedSlots.length === 0 || loading}
          >
            다음: 최종 확인
          </button>

          {/* [Must Have 2] 3순위 채우기 권장 넛지 모달 */}
          {showNudgePrompt && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
              <div style={{ background: 'white', padding: '24px', borderRadius: '8px', maxWidth: '440px', width: '90%', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '17px', color: '#1e293b' }}>💡 슬롯을 더 추가하시겠습니까?</h4>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px 0' }}>
                  현재 <strong>{selectedSlots.length}개</strong>의 슬롯만 선택되었습니다.<br />
                  규약상 최대 <strong>3개</strong>까지 선택하실 수 있으며, 3개를 모두 채우면 특정 슬롯이 타 고객에게 우선 배정되더라도 <strong>차순위 후보로 즉시 확정될 확률</strong>이 대폭 높아집니다.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={handleConfirmWithCurrentSlots}
                    style={{ padding: '8px 14px', fontSize: '13px' }}
                  >
                    현재 {selectedSlots.length}개로 계속
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowNudgePrompt(false)}
                    style={{ padding: '8px 16px', fontSize: '13px', background: '#2563eb' }}
                  >
                    + 1개 더 선택하기
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {stage === 'confirm' && checkSlotAvailability() && (
        <div>
          <h3>최종 확인</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>
            다음과 같이 신청합니다. 제출하면 어드민이 확인 후 확정합니다.
          </p>
          <SlotTable slots={slots} selectedSlots={selectedSlots} onToggle={() => {}} mode="view" />

          <div style={{ marginBottom: '20px' }}>
            <h4>최종 선택 (우선순위 순)</h4>
            <ul className="list">
              {selectedSlots.map((slotId, idx) => {
                const slot = slots[slotId];
                return (
                  <li key={slotId}>
                    <span>
                      {idx + 1}. {slot?.date} {TIME_SLOTS.find(t => t.label === slot?.timeLabel)?.displayLabel}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? '처리 중...' : '제출'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={loading}
            >
              돌아가기
            </button>
          </div>
        </div>
      )}

      {stage === 'view' && customerRequests.length === 0 && (
        <div style={{ padding: '36px 20px', textAlign: 'center', background: 'white', borderRadius: '8px', border: '1px dashed #cbd5e1', margin: '20px 0' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>접수된 예약 신청 내역이 없습니다</h3>
          <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '460px', margin: '0 auto 20px auto', lineHeight: 1.6 }}>
            원하시는 날짜와 시간대(오전·오후·저녁)를 1~3순위로 선택하여 예약 신청서를 제출해보세요.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setStage('select')}
            style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 'bold' }}
          >
            📅 새 일정 예약 신청하러 가기
          </button>
        </div>
      )}

      {stage === 'view' && customerRequests.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>내 예약 진행 상황</h3>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
                신청서의 실시간 서버 전송 상태 및 관리자 검토·확정 단계를 투명하게 추적합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                loadData().finally(() => setLoading(false));
              }}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 'bold',
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🔄 새로고침
            </button>
          </div>

          {customerRequests.map((item, idx) => {
            const isLatest = idx === customerRequests.length - 1;
            const status = item.request.status;
            const confirmedSlot = item.request.confirmedSlotId ? slots[item.request.confirmedSlotId] : null;

            return (
              <div
                key={item.request.id}
                style={{
                  marginBottom: '28px',
                  padding: '24px',
                  background: 'white',
                  borderRadius: '10px',
                  border: isLatest ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  boxShadow: isLatest ? '0 4px 12px rgba(37, 99, 235, 0.08)' : '0 1px 3px rgba(0,0,0,0.05)',
                  position: 'relative'
                }}
              >
                {/* 헤더: 버전, 접수일, 상태 뱃지 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                        신청 #{item.request.version}
                      </span>
                      {isLatest && (
                        <span style={{ background: '#dbeafe', color: '#1e40af', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px' }}>
                          최신 신청
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>
                      접수 일시: <strong>{new Date(item.request.createdAt).toLocaleString('ko-KR')}</strong>
                    </div>
                  </div>

                  {/* 현재 상태 뱃지 */}
                  <div>
                    {status === 'received' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '5px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 800 }}>
                        <span>⏳</span>
                        <span>서버 전송 완료 · 관리자 확인 대기 중</span>
                      </span>
                    )}
                    {status === 'confirmed' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '5px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 800 }}>
                        <span>🎉</span>
                        <span>최종 예약 확정 완료</span>
                      </span>
                    )}
                    {status === 'needs_reselection' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '5px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 800 }}>
                        <span>⚠️</span>
                        <span>관리자 검토 완료 · 대체 슬롯 재선택 필요</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* [실시간 3단계 예약 진행 트래커 (Progress Stepper)] */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginBottom: '22px' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#334155', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📍</span>
                    <span>예약 진행 단계 트래커 (실시간 추적)</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', position: 'relative' }}>
                    {/* 1단계: 서버 전송 완료 */}
                    <div style={{
                      background: 'white',
                      border: '1.5px solid #10b981',
                      borderRadius: '8px',
                      padding: '14px',
                      boxShadow: '0 1px 3px rgba(16,185,129,0.08)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800 }}>
                          ✓
                        </div>
                        <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#065f46' }}>
                          1단계. 서버 전송 완료
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                        ✅ 신청서가 DB에 안전하게 등록되었습니다.<br />
                        <span style={{ color: '#64748b' }}>희망 후보: {item.candidates.length}건 안전 보존</span>
                      </p>
                    </div>

                    {/* 2단계: 관리자 심사 및 확인 */}
                    <div style={{
                      background: 'white',
                      border: status === 'received'
                        ? '2px solid #2563eb'
                        : status === 'confirmed'
                          ? '1.5px solid #10b981'
                          : '1.5px solid #f59e0b',
                      borderRadius: '8px',
                      padding: '14px',
                      boxShadow: status === 'received' ? '0 2px 8px rgba(37,99,235,0.15)' : 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: status === 'received' ? '#2563eb' : status === 'confirmed' ? '#10b981' : '#f59e0b',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: 800
                        }}>
                          {status === 'received' ? '⏳' : status === 'confirmed' ? '✓' : '!'}
                        </div>
                        <span style={{
                          fontSize: '13.5px',
                          fontWeight: 800,
                          color: status === 'received' ? '#1d4ed8' : status === 'confirmed' ? '#065f46' : '#92400e'
                        }}>
                          2단계. {status === 'received' ? '관리자 미확인 (대기열)' : status === 'confirmed' ? '관리자 확인 및 승인' : '관리자 확인 (마감)'}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                        {status === 'received' && (
                          <>
                            <strong style={{ color: '#1e40af' }}>관리자 심사 대기열에서 검토 대기 중</strong>입니다.<br />
                            관리자가 접수 순서에 따라 순차 확인합니다.
                          </>
                        )}
                        {status === 'confirmed' && (
                          <>
                            <strong style={{ color: '#065f46' }}>관리자가 희망 일정을 확인하고 승인</strong>했습니다.<br />
                            {item.request.confirmedAt && (
                              <span style={{ color: '#64748b' }}>확인: {new Date(item.request.confirmedAt).toLocaleTimeString('ko-KR')}</span>
                            )}
                          </>
                        )}
                        {status === 'needs_reselection' && (
                          <>
                            <strong style={{ color: '#b45309' }}>관리자 검토 완료</strong><br />
                            신청 후보가 모두 선착순 마감되었습니다.
                          </>
                        )}
                      </p>
                    </div>

                    {/* 3단계: 최종 일정 결과 */}
                    <div style={{
                      background: 'white',
                      border: status === 'confirmed'
                        ? '2px solid #059669'
                        : status === 'needs_reselection'
                          ? '1.5px solid #f59e0b'
                          : '1px dashed #cbd5e1',
                      borderRadius: '8px',
                      padding: '14px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: status === 'confirmed' ? '#059669' : status === 'needs_reselection' ? '#f59e0b' : '#94a3b8',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: 800
                        }}>
                          {status === 'confirmed' ? '★' : status === 'needs_reselection' ? '🔄' : '3'}
                        </div>
                        <span style={{
                          fontSize: '13.5px',
                          fontWeight: 800,
                          color: status === 'confirmed' ? '#065f46' : status === 'needs_reselection' ? '#92400e' : '#64748b'
                        }}>
                          3단계. {status === 'confirmed' ? '최종 일정 확정' : status === 'needs_reselection' ? '대체 슬롯 재선택' : '최종 확정 대기'}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                        {status === 'confirmed' && (
                          <strong style={{ color: '#059669' }}>
                            {confirmedSlot?.date} {TIME_SLOTS.find(t => t.label === confirmedSlot?.timeLabel)?.displayLabel} 확정!
                          </strong>
                        )}
                        {status === 'received' && (
                          <span style={{ color: '#64748b' }}>
                            관리자가 승인하면 즉시 확정 일정이 이곳에 표출됩니다.
                          </span>
                        )}
                        {status === 'needs_reselection' && (
                          <span style={{ color: '#b45309' }}>
                            스마트 원클릭 추천으로 즉시 대체 슬롯을 신청하세요.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* 비점유 대기 안심 가이드 안내 문구 */}
                  {status === 'received' && (
                    <div style={{ marginTop: '14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '10px 14px', fontSize: '12.5px', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>💡</span>
                      <span>
                        <strong>안심 대기 안내:</strong> 고객님의 신청은 안전하게 접수되었으며, 관리자가 확인하기 전까지는 슬롯을 사전 점유하지 않는 <em>비점유 대기</em> 상태로 공정하게 유지됩니다.
                      </span>
                    </div>
                  )}
                </div>

                {/* 선택한 후보 슬롯 목록 */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontWeight: 700, fontSize: '13.5px', color: '#334155', display: 'block', marginBottom: '8px' }}>
                    신청한 희망 슬롯 목록 (우선순위 순)
                  </label>
                  <ul className="list" style={{ margin: 0 }}>
                    {item.candidates.map((c, cidx) => {
                      const slot = slots[c.slotId];
                      const isAvailable = slot?.status === 'available';
                      const isConfirmedForThis = item.request.status === 'confirmed' && item.request.confirmedSlotId === c.slotId;

                      return (
                        <li
                          key={c.id}
                          style={{
                            background: isConfirmedForThis ? '#f0fdf4' : 'white',
                            border: isConfirmedForThis ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                            padding: '10px 14px',
                            borderRadius: '6px',
                            marginBottom: '6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ color: '#2563eb' }}>{cidx + 1}순위</strong>
                            <span style={{ fontWeight: isConfirmedForThis ? 800 : 500 }}>
                              {slot?.date} {TIME_SLOTS.find(t => t.label === slot?.timeLabel)?.displayLabel}
                            </span>
                            {isConfirmedForThis && (
                              <span style={{ background: '#059669', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>
                                ★ 최종 확정된 슬롯
                              </span>
                            )}
                          </span>

                          <span style={{ fontSize: '12px', fontWeight: 700, color: isConfirmedForThis ? '#059669' : isAvailable ? '#2563eb' : '#dc2626' }}>
                            {isConfirmedForThis ? '확정 완료' : isAvailable ? '신청 접수 중 (열림)' : '다른 고객 확정 (마감)'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* 확정 완료 시 축하 메시지 */}
                {item.request.status === 'confirmed' && confirmedSlot && (
                  <div className="alert alert-success" style={{ margin: '14px 0 0 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>🎉</span>
                    <div>
                      <strong>최종 예약이 확정되었습니다!</strong><br />
                      일시: <strong>{confirmedSlot.date} {TIME_SLOTS.find(t => t.label === confirmedSlot.timeLabel)?.displayLabel}</strong>
                    </div>
                  </div>
                )}

                {/* 재선택 필요 시 스마트 대체 슬롯 추천 버튼 */}
                {item.request.status === 'needs_reselection' && isLatest && (
                  <div style={{ marginTop: '16px', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#92400e', marginBottom: '8px', fontWeight: 800 }}>
                      <span>✨</span>
                      <span>스마트 대체 슬롯 추천 가능</span>
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#78350f', lineHeight: 1.5 }}>
                      이전 희망 시간대를 분석하여 최적의 빈자리를 자동 선별해 두었습니다. 버튼 1클릭으로 간편하게 재선택을 완료할 수 있습니다.
                    </p>
                    <button
                      type="button"
                      className="btn btn-warning"
                      onClick={() => {
                        setStage('reselect');
                        setSelectedSlots([]);
                      }}
                      style={{ background: '#f59e0b', color: 'white', fontWeight: 'bold', padding: '9px 16px', borderRadius: '6px', fontSize: '13.5px', cursor: 'pointer', border: 'none' }}
                    >
                      ✨ 스마트 추천 확인 및 재선택하기 →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {stage === 'reselect' && customerRequests.length > 0 && (
        <div>
          <h3>슬롯 재선택 (새 버전 신청)</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>
            이전 신청의 슬롯이 모두 마감되었습니다. 이전 이력은 보존되며 새로운 순번으로 접수됩니다.
          </p>

          {/* [Must Have 1] 스마트 대체 슬롯 원클릭 추천 카드 */}
          {getSmartRecommendations().length > 0 && (
            <div style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: '8px', padding: '16px 20px', marginBottom: '20px', boxShadow: '0 2px 6px rgba(37,99,235,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#1e40af', fontSize: '15px' }}>
                  <span>✨</span>
                  <span>스마트 대체 슬롯 원클릭 추천</span>
                  <span style={{ fontSize: '11.5px', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    이전 선호 시간대 분석
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleApplySmartRecommendation}
                  style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}
                >
                  ⚡ 추천 슬롯 자동 채우기 ({getSmartRecommendations().length}개)
                </button>
              </div>
              <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#334155' }}>
                이전 1순위 희망 시간대(<strong>{TIME_SLOTS.find(t => t.label === (slots[customerRequests[customerRequests.length - 1]?.candidates[0]?.slotId]?.timeLabel || 'am'))?.displayLabel}</strong>)와 가장 가까운 열린 슬롯을 자동 선별했습니다.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {getSmartRecommendations().map((sId, idx) => {
                  const slot = slots[sId];
                  return (
                    <span key={sId} style={{ background: 'white', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', color: '#1e40af', fontWeight: 'bold' }}>
                      추천 {idx + 1}: {slot?.date} {TIME_SLOTS.find(t => t.label === slot?.timeLabel)?.displayLabel}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <SlotTable
            slots={slots}
            selectedSlots={selectedSlots}
            onToggle={handleSlotToggle}
            mode="select"
            maxSelect={3}
          />

          <div style={{ marginBottom: '20px' }}>
            <h4>새로 선택한 슬롯 ({selectedSlots.length}/3)</h4>
            <ul className="list">
              {selectedSlots.map((slotId, idx) => {
                const slot = slots[slotId];
                return (
                  <li key={slotId}>
                    <span>
                      {idx + 1}. {slot?.date} {TIME_SLOTS.find(t => t.label === slot?.timeLabel)?.displayLabel}
                    </span>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleSlotToggle(slotId)}
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      제거
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* [Must Have 2] 재선택 단계 3순위 넛지 배너 */}
          {selectedSlots.length > 0 && selectedSlots.length < 3 && (
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', padding: '12px 16px', marginBottom: '16px', fontSize: '13.5px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>💡</span>
              <div>
                <strong>[3순위 선택 권장 넛지]</strong> 현재 <strong>{selectedSlots.length}개</strong> 선택됨. 최대 3개까지 모두 선택하시면 재선택 후 또다시 마감될 위험을 <strong>67% 방지</strong>할 수 있습니다. (남은 선택 가능: <strong>{3 - selectedSlots.length}개</strong>)
              </div>
            </div>
          )}

          {selectedSlots.length === 3 && (
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '12px 16px', marginBottom: '16px', fontSize: '13.5px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>✅</span>
              <div>
                <strong>[선택 최적화 완료]</strong> 3순위까지 모두 채워졌습니다! 확정 확률이 극대화되었습니다.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-primary"
              onClick={handleReselect}
              disabled={selectedSlots.length === 0 || loading}
            >
              {loading ? '처리 중...' : '재선택 제출'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setStage('view');
                setSelectedSlots([]);
              }}
              disabled={loading}
            >
              돌아가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
