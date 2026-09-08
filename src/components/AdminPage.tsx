import React, { useState, useEffect } from 'react';
import { SlotTable } from './SlotTable';
import type { Slot, Request, Candidate, OperationLog } from '../types';
import { OperationManager } from '../utils/operations';
import { DatabaseManager } from '../utils/database';
import { SupabaseManager } from '../utils/supabaseManager';
import { TIME_SLOTS } from '../utils/constants';
import { formatErrorMessage } from '../utils/formatError';

interface AdminPageProps {
  db: DatabaseManager | SupabaseManager;
  mode: 'local' | 'supabase';
  userId?: string;
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ db, mode: _mode, userId: _userId, onNotify }) => {
  const [adminId] = useState<string>('ADMIN001');
  const activeAdminId = _mode === 'supabase' && _userId ? _userId : adminId;
  const [slots, setSlots] = useState<Record<string, Slot>>({});
  const [requests, setRequests] = useState<
    Array<{ request: Request; candidates: Candidate[]; decision: any }>
  >([]);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [selectedSlotForConfirm, setSelectedSlotForConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const om = new OperationManager(db);
  const isSupabase = _mode === 'supabase' && db instanceof SupabaseManager;

  // 초기 로드
  useEffect(() => {
    if (db) {
      loadData().catch(err => console.error('Initial load failed:', err));
    }
  }, [db]);

  const loadData = async () => {
    try {
      if (!db) {
        setError(formatErrorMessage('데이터베이스 연결 실패'));
        return;
      }

      // Supabase 모드일 때 데이터 갱신
      if (db instanceof SupabaseManager) {
        await (db as SupabaseManager).initialize();
      }

      const state = db.getState();
      setSlots(state.slots);

      // OperationManager는 로컬 모드에서만 사용
      if (isSupabase) {
        // Supabase 모드: 직접 상태 구성
        const candidates = state.candidates;
        const requests = state.requests
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .map(request => ({
            request,
            candidates: candidates.filter(c => c.requestId === request.id).sort((a, b) => a.priority - b.priority),
            decision: {},
          }));
        setRequests(requests);
      } else {
        // 로컬 모드: OperationManager 사용
        setRequests(om!.getAdminRequests());
      }

      setLogs(state.logs || []);
      setError('');
      setSuccess('');
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('예약 신청 목록을 불러오지 못했습니다. 페이지를 새로고침해주세요.');
    }
  };

  const handleConfirm = async () => {
    if (!selectedRequest || !selectedSlotForConfirm) {
      setError('확정 처리할 고객 신청 건과 배정할 슬롯을 모두 선택해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const operationId = `confirm-${selectedRequest}-${selectedSlotForConfirm}-${Date.now()}`;

      let result;
      if (isSupabase) {
        result = await (db as SupabaseManager).confirmRequest(
          selectedRequest,
          selectedSlotForConfirm,
          activeAdminId,
          operationId
        );
      } else {
        result = await om.confirmRequest(
          selectedRequest,
          selectedSlotForConfirm,
          activeAdminId,
          operationId
        );
      }

      if (result.success) {
        const message = `예약이 성공적으로 확정되었습니다! (마감 영향 건수: ${result.affectedRequests?.length || 0}건)`;
        setSuccess(message);
        setSelectedRequest(null);
        setSelectedSlotForConfirm(null);
        onNotify?.(message, 'success');
        setTimeout(() => loadData(), 500);
      } else {
        const friendlyError = formatErrorMessage(result.error || '확정 처리에 실패했습니다.');
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

  const currentRequest = selectedRequest ? requests.find(r => r.request.id === selectedRequest) : null;

  return (
    <div className="admin-page">
      <h2>어드민 패널</h2>

      {error && (
        <div className="alert alert-error alert-animated" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success alert-animated" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>✅</span>
          <span>{success}</span>
        </div>
      )}

      <div className="grid">
        {/* 요청 목록 */}
        <div>
          <h3>신청 목록 (총 {requests.length}건)</h3>
          <div style={{ maxHeight: '500px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
            <ul className="list" style={{ margin: 0 }}>
              {requests.map((item, idx) => (
                <li
                  key={item.request.id}
                  className={`admin-req-item ${selectedRequest === item.request.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedRequest(item.request.id);
                    setSelectedSlotForConfirm(null);
                  }}
                  style={{
                    cursor: 'pointer',
                    background: selectedRequest === item.request.id ? '#eff6ff' : 'white',
                    marginBottom: '0',
                    borderRadius: '0',
                    border: `1px solid ${selectedRequest === item.request.id ? '#3b82f6' : '#e2e8f0'}`,
                    borderLeft: selectedRequest === item.request.id ? '4px solid #2563eb' : '1px solid #e2e8f0',
                    padding: '12px',
                  }}
                >
                  <div>
                    <strong>#{idx + 1}</strong> {item.request.customerId} (v
                    {item.request.version})
                    <br />
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {new Date(item.request.createdAt).toLocaleString()}
                    </span>
                    <br />
                    <span className={`slot-status ${item.request.status === 'confirmed' ? 'confirmed' : 'available'}`}>
                      {item.request.status === 'confirmed'
                        ? '확정됨'
                        : item.request.status === 'needs_reselection'
                          ? '재선택필요'
                          : '접수됨'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 요청 상세 */}
        <div>
          <h3>요청 상세</h3>
          {currentRequest ? (
            <div className="interactive-card" style={{ padding: '16px', background: 'white', border: '1px solid #ddd', borderRadius: '4px' }}>
              <div className="form-group">
                <label>고객 코드</label>
                <input type="text" value={currentRequest.request.customerId} disabled />
              </div>

              <div className="form-group">
                <label>상태</label>
                <input
                  type="text"
                  value={
                    currentRequest.request.status === 'confirmed'
                      ? '확정됨'
                      : currentRequest.request.status === 'needs_reselection'
                        ? '재선택필요'
                        : '접수됨'
                  }
                  disabled
                />
              </div>

              <div className="form-group">
                <label>희망 슬롯 (우선순위 순)</label>
                <ul className="list">
                  {currentRequest.candidates.map((c, idx) => {
                    const slot = slots[c.slotId];
                    const isAvailable = slot && slot.status === 'available';
                    const canSelect = isAvailable && currentRequest.request.status !== 'confirmed';
                    return (
                      <li
                        key={c.id}
                        className="admin-candidate-item"
                        onClick={() => {
                          if (canSelect) {
                            setSelectedSlotForConfirm(c.slotId);
                          }
                        }}
                        style={{
                          cursor: canSelect ? 'pointer' : 'not-allowed',
                          background:
                            selectedSlotForConfirm === c.slotId
                              ? '#dcfce7'
                              : isAvailable
                                ? 'white'
                                : '#fee2e2',
                          borderColor: selectedSlotForConfirm === c.slotId ? '#16a34a' : '#ddd',
                          borderLeft: selectedSlotForConfirm === c.slotId ? '4px solid #16a34a' : '1px solid #ddd',
                          opacity: canSelect ? 1 : 0.6,
                        }}
                      >
                        <span>
                          {idx + 1}. {slot?.date} {TIME_SLOTS.find(t => t.label === slot?.timeLabel)?.displayLabel}
                          {' '}
                          <span style={{ marginLeft: '10px', fontSize: '12px', fontWeight: 600 }}>
                            {isAvailable ? '(가능)' : '(마감)'}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {currentRequest.request.status === 'confirmed' && currentRequest.request.confirmedSlotId && (
                <div className="alert alert-success alert-animated">
                  <strong>확정 완료</strong>
                  <br />
                  {slots[currentRequest.request.confirmedSlotId]?.date}{' '}
                  {TIME_SLOTS.find(t => t.label === slots[currentRequest.request.confirmedSlotId!]?.timeLabel)?.displayLabel}
                  <br />
                  {new Date(currentRequest.request.confirmedAt!).toLocaleString()}
                </div>
              )}

              {currentRequest.request.status !== 'confirmed' && (
                <button
                  className="btn btn-success btn-submit-booking"
                  onClick={handleConfirm}
                  disabled={!selectedSlotForConfirm || loading}
                  style={{ marginTop: '10px', width: '100%', padding: '12px', fontWeight: 800, borderRadius: '8px' }}
                >
                  {loading ? '처리 중...' : '확정'}
                </button>
              )}
            </div>
          ) : (
            <div style={{ padding: '16px', background: '#f0f0f0', borderRadius: '4px', color: '#666' }}>
              목록에서 요청을 선택하세요
            </div>
          )}
        </div>
      </div>

      {/* 슬롯 현황 */}
      <div style={{ marginTop: '40px' }}>
        <h3>슬롯 현황 (표시용)</h3>
        <SlotTable slots={slots} selectedSlots={[]} onToggle={() => {}} mode="view" />
      </div>

      {/* 실행 기록 */}
      <div style={{ marginTop: '40px' }}>
        <h3>실행 기록 (최근 20건)</h3>
        <div className="table-container">
          <table className="slots-table">
            <thead>
              <tr>
                <th>시간</th>
                <th>행위</th>
                <th>요청ID</th>
                <th>슬롯</th>
                <th>결과</th>
                <th>오류</th>
              </tr>
            </thead>
            <tbody>
              {logs
                .slice()
                .reverse()
                .slice(0, 20)
                .map((log, idx) => (
                  <tr key={log.id || `log-${idx}`} style={{ fontSize: '12px' }}>
                    <td>{log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}</td>
                    <td>{log.action || '-'}</td>
                    <td style={{ fontSize: '10px', fontFamily: 'monospace' }}>
                      {log.requestId ? `${log.requestId.substring(0, 8)}...` : '-'}
                    </td>
                    <td>{log.slotId ? log.slotId : '-'}</td>
                    <td>
                      <span style={{ color: log.status === 'success' ? '#28a745' : '#dc3545' }}>
                        {log.status === 'success' ? '성공' : '실패'}
                      </span>
                    </td>
                    <td style={{ color: '#dc3545' }}>{log.error ? log.error.substring(0, 30) : '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
