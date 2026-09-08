import React, { useState } from 'react';
import type { Slot } from '../types';
import { TIME_SLOTS, getAllDates } from '../utils/constants';
import { sound } from '../utils/sound';

interface SlotTableProps {
  slots: Record<string, Slot>;
  selectedSlots: string[];
  onToggle: (slotId: string) => void;
  maxSelect?: number;
  mode: 'view' | 'select';
}

// 요일 반환 (KST 기준, OS 로컬 시간대 무관)
const KST_DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function getDayOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayIndex = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return KST_DAY_NAMES[dayIndex];
}

function getDayOfWeekColor(day: string): string {
  if (day === '토') return '#4338ca';
  if (day === '일') return '#dc2626';
  return '#334155';
}

function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${m}/${d}`;
}

export const SlotTable: React.FC<SlotTableProps> = ({
  slots,
  selectedSlots,
  onToggle,
  maxSelect = 3,
  mode = 'view',
}) => {
  const allDates = getAllDates();
  const week1Dates = allDates.slice(0, 7); // 2026-09-09(수) ~ 2026-09-15(화)
  const week2Dates = allDates.slice(7, 14); // 2026-09-16(수) ~ 2026-09-22(화)

  // 뷰 모드: 달력 형태 (Google Calendar / Calendly 스타일)
  const viewMode: 'calendar' | 'table' = 'calendar';

  // 인근 날짜 범위 필터: 1주차(기본) vs 2주차 vs 전체 14일
  const [rangeFilter, setRangeFilter] = useState<'week1' | 'week2' | 'all'>('week1');

  // 현재 활성 날짜 목록
  const displayedDates =
    rangeFilter === 'week1' ? week1Dates : rangeFilter === 'week2' ? week2Dates : allDates;

  // 날짜별 잔여 가능 슬롯 수 계산
  const getOpenCount = (date: string) => {
    return TIME_SLOTS.reduce((acc, t) => {
      const slot = slots[`${date}:${t.label}`];
      return acc + (slot?.status === 'available' ? 1 : 0);
    }, 0);
  };

  return (
    <div>
      {/* 주간 탭 & 범례 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '14px',
          paddingBottom: '8px',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        {/* 주간 탭 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            className="interactive-tab-btn"
            onClick={() => {
              sound.playClick();
              setRangeFilter('week1');
            }}
            style={{
              padding: '6px 14px',
              border: rangeFilter === 'week1' ? '1.5px solid #FF5E10' : '1px solid #E4E7EB',
              borderRadius: '6px',
              background: rangeFilter === 'week1' ? '#FFF5EF' : '#ffffff',
              color: rangeFilter === 'week1' ? '#E04B00' : '#475569',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            1주차 (9/9~9/15)
          </button>
          <button
            type="button"
            className="interactive-tab-btn"
            onClick={() => {
              sound.playClick();
              setRangeFilter('week2');
            }}
            style={{
              padding: '6px 14px',
              border: rangeFilter === 'week2' ? '1.5px solid #FF5E10' : '1px solid #E4E7EB',
              borderRadius: '6px',
              background: rangeFilter === 'week2' ? '#FFF5EF' : '#ffffff',
              color: rangeFilter === 'week2' ? '#E04B00' : '#475569',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            2주차 (9/16~9/22)
          </button>
          <button
            type="button"
            className="interactive-tab-btn"
            onClick={() => {
              sound.playClick();
              setRangeFilter('all');
            }}
            style={{
              padding: '6px 12px',
              border: rangeFilter === 'all' ? '1.5px solid #FF5E10' : '1px solid #E4E7EB',
              borderRadius: '6px',
              background: rangeFilter === 'all' ? '#FFF5EF' : '#f8fafc',
              color: rangeFilter === 'all' ? '#E04B00' : '#64748b',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            전체 14일
          </button>
        </div>

        {/* 범례 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF5E10' }} />
            선택
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748B' }} />
            가능
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#CBD5E1' }} />
            마감
          </span>
        </div>
      </div>

      {/* 3. Google Calendar / Calendly 스타일 인근 날짜 달력 그리드 */}
      {viewMode === 'calendar' ? (
        <div key={rangeFilter} className="calendar-grid-wrapper">
          {/* 수평 스크롤 및 그리드 컨테이너 (인근 날짜별 열 배치) */}
          <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${displayedDates.length}, minmax(88px, 1fr))`,
                gap: '8px',
                minWidth: displayedDates.length > 7 ? '960px' : '100%',
              }}
            >
              {displayedDates.map(date => {
                const day = getDayOfWeek(date);
                const dayColor = getDayOfWeekColor(day);
                const shortDate = formatShortDate(date);
                const openCount = getOpenCount(date);

                return (
                  <div
                    key={date}
                    style={{
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* 날짜 헤더 (인근 날짜 상단 바) */}
                    <div
                      style={{
                        padding: '10px 8px',
                        background: '#ffffff',
                        borderBottom: '1.5px solid #e2e8f0',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 800, color: dayColor, marginBottom: '2px' }}>
                        {day}요일
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                        {shortDate}
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        {openCount > 0 ? (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              background: '#F1F5F9',
                              color: '#334155',
                              padding: '2px 7px',
                              borderRadius: '10px',
                              border: '1px solid #E2E8F0',
                            }}
                          >
                            {openCount}개 가능
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              background: '#F8FAFC',
                              color: '#94A3B8',
                              padding: '2px 7px',
                              borderRadius: '10px',
                              border: '1px solid #E2E8F0',
                            }}
                          >
                            전부 마감
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 시간대 슬롯 버튼 목록 (수직 스택 - Google Calendar Appointment Schedules Style) */}
                    <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      {TIME_SLOTS.map(timeSlot => {
                        const slotId = `${date}:${timeSlot.label}`;
                        const slot = slots[slotId];
                        const isSelected = selectedSlots.includes(slotId);
                        const priorityIdx = selectedSlots.indexOf(slotId);
                        const isConfirmed = slot?.status === 'confirmed';

                        if (mode === 'view') {
                          return (
                            <div
                              key={slotId}
                              style={{
                                padding: '10px 8px',
                                borderRadius: '6px',
                                textAlign: 'center',
                                border: isSelected
                                  ? '2px solid #FF5E10'
                                  : isConfirmed
                                    ? '1px dashed #cbd5e1'
                                    : '1px solid #cbd5e1',
                                background: isSelected ? '#FFF5EF' : isConfirmed ? '#f8fafc' : '#ffffff',
                                color: isSelected ? '#E04B00' : isConfirmed ? '#94a3b8' : '#0f172a',
                              }}
                            >
                              <div style={{ fontSize: '12px', fontWeight: 800 }}>
                                {timeSlot.displayLabel}
                              </div>
                              <div style={{ fontSize: '11px', marginTop: '3px' }}>
                                {isSelected ? (
                                  <strong style={{ color: '#E04B00' }}>★ {priorityIdx + 1}순위 선택</strong>
                                ) : isConfirmed ? (
                                  <span style={{ color: '#94a3b8', textDecoration: 'line-through' }}>마감</span>
                                ) : (
                                  <span style={{ color: '#475569', fontWeight: 600 }}>가능</span>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // mode === 'select'
                        return (
                          <button
                            key={slotId}
                            type="button"
                            className={`time-slot-btn ${isSelected ? 'is-selected' : ''}`}
                            onClick={() => onToggle(slotId)}
                            disabled={isConfirmed || (!isSelected && selectedSlots.length >= maxSelect)}
                            style={{
                              padding: '10px 6px',
                              borderRadius: '8px',
                              textAlign: 'center',
                              cursor: isConfirmed ? 'not-allowed' : (!isSelected && selectedSlots.length >= maxSelect) ? 'not-allowed' : 'pointer',
                              border: isSelected
                                ? '2px solid #E04B00'
                                : isConfirmed
                                  ? '1px dashed #cbd5e1'
                                  : '1.5px solid #cbd5e1',
                              background: isSelected
                                ? '#FF5E10'
                                : isConfirmed
                                  ? '#f1f5f9'
                                  : '#ffffff',
                              color: isSelected
                                ? '#ffffff'
                                : isConfirmed
                                  ? '#94a3b8'
                                  : '#0f172a',
                              boxShadow: isSelected ? '0 4px 14px rgba(255, 94, 16, 0.35)' : '0 1px 2px rgba(0,0,0,0.03)',
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 800,
                                textDecoration: isConfirmed ? 'line-through' : 'none',
                              }}
                            >
                              {timeSlot.displayLabel}
                            </span>

                            {isSelected && (
                              <span
                                style={{
                                  marginTop: '4px',
                                  background: '#1A1A1C',
                                  color: '#ffffff',
                                  fontSize: '11px',
                                  fontWeight: 900,
                                  padding: '1px 6px',
                                  borderRadius: '10px',
                                }}
                              >
                                ★ {priorityIdx + 1}순위
                              </span>
                            )}

                            {!isSelected && !isConfirmed && (
                              <span
                                style={{
                                  marginTop: '3px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#475569',
                                }}
                              >
                                가능
                              </span>
                            )}

                            {isConfirmed && (
                              <span
                                style={{
                                  marginTop: '3px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#94a3b8',
                                }}
                              >
                                마감
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* 4. 기존 14행 전체 표 뷰 (호환성 제공) */
        <div className="table-container">
          <table className="slots-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>날짜</th>
                {TIME_SLOTS.map(slot => (
                  <th key={slot.label} style={{ width: '140px' }}>
                    {slot.displayLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allDates.map(date => {
                const day = getDayOfWeek(date);
                const dayColor = getDayOfWeekColor(day);

                return (
                  <tr key={date}>
                    <td style={{ fontWeight: 'bold' }}>
                      {date} <span style={{ color: dayColor }}>({day})</span>
                    </td>
                    {TIME_SLOTS.map(timeSlot => {
                      const slotId = `${date}:${timeSlot.label}`;
                      const slot = slots[slotId];
                      const isSelected = selectedSlots.includes(slotId);
                      const priorityIdx = selectedSlots.indexOf(slotId);
                      const isConfirmed = slot?.status === 'confirmed';

                      return (
                        <td key={slotId}>
                          {mode === 'view' ? (
                            <span className={`slot-status ${slot?.status || 'available'}`}>
                              {isSelected
                                ? `★ ${priorityIdx + 1}순위 선택`
                                : isConfirmed
                                  ? '마감'
                                  : '가능'}
                            </span>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="checkbox"
                                className="slot-checkbox"
                                checked={isSelected}
                                onChange={() => onToggle(slotId)}
                                disabled={isConfirmed || (!isSelected && selectedSlots.length >= maxSelect)}
                                title={isConfirmed ? '마감됨' : ''}
                              />
                              <span
                                style={{
                                   fontSize: '12px',
                                   fontWeight: isSelected ? 800 : 500,
                                   color: isSelected ? '#FF5E10' : isConfirmed ? '#94a3b8' : '#475569',
                                 }}
                              >
                                {isSelected ? `★ ${priorityIdx + 1}순위` : isConfirmed ? '마감' : '가능'}
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
