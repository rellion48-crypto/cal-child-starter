import React, { useState, useEffect } from 'react';
import { SlotTable } from './SlotTable';
import type { Slot, Request, Candidate } from '../types';
import { OperationManager } from '../utils/operations';
import { DatabaseManager } from '../utils/database';
import { SupabaseManager } from '../utils/supabaseManager';
import { decideRequestStatus } from '../utils/decide';
import { TIME_SLOTS } from '../utils/constants';

interface CustomerPageProps {
  db: DatabaseManager | SupabaseManager;
  mode: 'local' | 'supabase';
  userId?: string;
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const CustomerPage: React.FC<CustomerPageProps> = ({ db, mode, userId, onNotify }) => {
  // Supabase 모드에서는 userId(이메일)를 사용, 로컬 모드에서는 'C01' 사용
  const [customerId] = useState<string>(mode === 'supabase' && userId ? userId : 'C01');
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
  }, [customerId, db]);

  const loadData = () => {
    if (!db || !om) return;
    const state = db.getState();
    setSlots(state.slots);
    const status = om.getCustomerStatus(customerId);
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
      setError('데이터베이스 연결 실패');
      return;
    }

    if (selectedSlots.length === 0) {
      setError('최소 1개 이상의 슬롯을 선택하세요');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const operationId = `submit-${customerId}-${Date.now()}`;

      let result;
      if (isSupabase) {
        result = await (db as SupabaseManager).submitRequest(customerId, selectedSlots, operationId);
      } else {
        result = await om!.submitRequest(customerId, selectedSlots, operationId);
      }

      if (result.success) {
        setSuccess('신청이 완료되었습니다!');
        setSelectedSlots([]);
        setStage('view');
        onNotify?.('신청이 완료되었습니다!', 'success');
        setTimeout(() => loadData(), 500);
      } else {
        setError(result.error || '신청 실패');
        onNotify?.(result.error || '신청 실패', 'error');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReselect = async () => {
    if (selectedSlots.length === 0) {
      setError('최소 1개 이상의 슬롯을 선택하세요');
      return;
    }

    if (!om) {
      setError('데이터베이스 연결 실패');
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
          customerId,
          latest.request.id,
          selectedSlots,
          operationId
        );
      } else {
        result = await om!.resubmitRequest(
          customerId,
          latest.request.id,
          selectedSlots,
          operationId
        );
      }

      if (result.success) {
        setSuccess('재선택이 완료되었습니다!');
        setSelectedSlots([]);
        setStage('view');
        onNotify?.('재선택이 완료되었습니다!', 'success');
        setTimeout(() => loadData(), 500);
      } else {
        setError(result.error || '재선택 실패');
        onNotify?.(result.error || '재선택 실패', 'error');
      }
    } catch (err) {
      setError(String(err));
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
        setError('선택한 슬롯의 상태가 변경되었습니다. 다시 선택해주세요.');
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
        <input
          type="text"
          value={customerId}
          onChange={() => {}}
          placeholder="C01"
          disabled
        />
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

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

      {stage === 'view' && customerRequests.length > 0 && (
        <div>
          <h3>내 신청 현황</h3>
          {customerRequests.map((item, idx) => (
            <div key={item.request.id} style={{ marginBottom: '20px', padding: '16px', background: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
              <h4>신청 #{item.request.version} (접수일: {new Date(item.request.createdAt).toLocaleString()})</h4>

              <div className="form-group">
                <label>상태</label>
                <div style={{ padding: '8px', background: '#f0f0f0', borderRadius: '4px' }}>
                  {item.request.status === 'confirmed' && (
                    <span className="slot-status confirmed">확정됨</span>
                  )}
                  {item.request.status === 'received' && (
                    <span className="slot-status available">접수됨</span>
                  )}
                  {item.request.status === 'needs_reselection' && (
                    <span className="alert alert-warning">재선택 필요</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>선택한 슬롯 (우선순위 순)</label>
                <ul className="list">
                  {item.candidates.map((c, cidx) => {
                    const slot = slots[c.slotId];
                    const isAvailable = slot?.status === 'available';
                    return (
                      <li key={c.id}>
                        <span>
                          {cidx + 1}. {slot?.date} {TIME_SLOTS.find(t => t.label === slot?.timeLabel)?.displayLabel}
                          {' '}
                          <span style={{ marginLeft: '10px', fontSize: '12px', color: isAvailable ? '#28a745' : '#dc3545' }}>
                            {isAvailable ? '(가능)' : '(마감)'}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {item.request.status === 'confirmed' && (
                <div className="alert alert-success">
                  <strong>확정됨!</strong> {slots[item.request.confirmedSlotId!]?.date}{' '}
                  {TIME_SLOTS.find(t => t.label === slots[item.request.confirmedSlotId!]?.timeLabel)?.displayLabel}에
                  확정되었습니다.
                </div>
              )}

              {item.request.status === 'needs_reselection' && idx === customerRequests.length - 1 && (
                <div style={{ marginTop: '14px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '13px', color: '#92400e', marginBottom: '8px' }}>
                    💡 <strong>스마트 추천 가능:</strong> 이전 희망 시간대를 분석한 맞춤 대체 슬롯이 준비되어 있습니다.
                  </div>
                  <button
                    className="btn btn-warning"
                    onClick={() => {
                      setStage('reselect');
                      setSelectedSlots([]);
                    }}
                    style={{ background: '#f59e0b', color: 'white', fontWeight: 'bold', padding: '8px 14px' }}
                  >
                    ✨ 스마트 추천 확인 및 재선택하기
                  </button>
                </div>
              )}
            </div>
          ))}
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
