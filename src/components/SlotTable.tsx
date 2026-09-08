import React, { useState } from 'react';
import type { Slot } from '../types';
import { TIME_SLOTS, getAllDates } from '../utils/constants';

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
  if (day === '토') return '#2563eb';
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

  // 뷰 모드: 달력 형태 (Google Calendar 스타일) vs 기존 전체 표 형태
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');

  // 인근 날짜 범위 필터: 1주차(기본) vs 2주차 vs 전체 14일
  const [rangeFilter, setRangeFilter] = useState<'week1' | 'week2' | 'all'>('week1');

  // 미니 월간 달력 펼침 상태
  const [showMiniCalendar, setShowMiniCalendar] = useState<boolean>(false);

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
    <div style={{ marginBottom: '12px' }}>
      {/* 1. 상단 컨트롤러: 주간 네비게이션 & 뷰 모드 토글 (컴팩트 바) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '12px',
          paddingBottom: '10px',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        {/* 주간 탭 (1주차 / 2주차 / 전체) */}
        {viewMode === 'calendar' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setRangeFilter('week1')}
              style={{
                padding: '6px 12px',
                border: rangeFilter === 'week1' ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                borderRadius: '6px',
                background: rangeFilter === 'week1' ? '#eff6ff' : '#ffffff',
                color: rangeFilter === 'week1' ? '#1d4ed8' : '#475569',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              1주차 (9/9~9/15)
            </button>
            <button
              type="button"
              onClick={() => setRangeFilter('week2')}
              style={{
                padding: '6px 12px',
                border: rangeFilter === 'week2' ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                borderRadius: '6px',
                background: rangeFilter === 'week2' ? '#eff6ff' : '#ffffff',
                color: rangeFilter === 'week2' ? '#1d4ed8' : '#475569',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              2주차 (9/16~9/22)
            </button>
            <button
              type="button"
              onClick={() => setRangeFilter('all')}
              style={{
                padding: '6px 10px',
                border: rangeFilter === 'all' ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                borderRadius: '6px',
                background: rangeFilter === 'all' ? '#eff6ff' : '#f8fafc',
                color: rangeFilter === 'all' ? '#1d4ed8' : '#64748b',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              전체 14일
            </button>
          </div>
        ) : (
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#334155' }}>전체 14일 42슬롯 목록</span>
        )}

        {/* 우측 보조 컨트롤: 표/달력 전환 & 미니달력 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowMiniCalendar(!showMiniCalendar)}
            style={{
              background: showMiniCalendar ? '#dbeafe' : '#f8fafc',
              border: '1px solid #cbd5e1',
              color: showMiniCalendar ? '#1e40af' : '#64748b',
              borderRadius: '6px',
              padding: '5px 8px',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🗓️ 9월달력 {showMiniCalendar ? '접기' : '열기'}
          </button>
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'calendar' ? 'table' : 'calendar')}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#475569',
              borderRadius: '6px',
              padding: '5px 8px',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {viewMode === 'calendar' ? '📋 목록 표' : '📅 주간 달력'}
          </button>
        </div>
      </div>

      {/* 2. 2026년 9월 미니 월간 달력 (펼쳐보기 클릭 시) */}
      {showMiniCalendar && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '12px',
            boxShadow: '0 2px 6px rgba(37,99,235,0.06)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🗓️</span>
              <span>2026년 9월 일정 (운영: 9/9 ~ 9/22)</span>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              날짜 클릭 시 해당 주간으로 이동
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              gap: '4px',
              maxWidth: '480px',
              margin: '0 auto',
            }}
          >
            {['일', '월', '화', '수', '목', '금', '토'].map((day, dIdx) => (
              <div
                key={day}
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '4px 0',
                  color: dIdx === 6 ? '#2563eb' : dIdx === 0 ? '#dc2626' : '#475569',
                }}
              >
                {day}
              </div>
            ))}

            {/* 2026년 9월 1일은 화요일(index 2) -> 일, 월 2칸 빈칸 */}
            <div />
            <div />

            {/* 9월 1일부터 30일까지 */}
            {Array.from({ length: 30 }, (_, i) => i + 1).map(dayNum => {
              const dateStr = `2026-09-${String(dayNum).padStart(2, '0')}`;
              const isInRange = dateStr >= '2026-09-09' && dateStr <= '2026-09-22';
              const isSelectedDay = selectedSlots.some(s => s.startsWith(dateStr));
              const isCurrentWeek =
                (rangeFilter === 'week1' && dateStr >= '2026-09-09' && dateStr <= '2026-09-15') ||
                (rangeFilter === 'week2' && dateStr >= '2026-09-16' && dateStr <= '2026-09-22');

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => {
                    if (isInRange) {
                      setRangeFilter(dateStr <= '2026-09-15' ? 'week1' : 'week2');
                    }
                  }}
                  disabled={!isInRange}
                  style={{
                    padding: '6px 2px',
                    borderRadius: '4px',
                    border: isSelectedDay ? '2px solid #2563eb' : isCurrentWeek ? '1px solid #93c5fd' : '1px solid transparent',
                    background: isSelectedDay ? '#2563eb' : isCurrentWeek ? '#eff6ff' : isInRange ? '#f8fafc' : '#ffffff',
                    color: isSelectedDay ? '#ffffff' : isInRange ? '#0f172a' : '#cbd5e1',
                    fontWeight: isInRange ? 700 : 400,
                    fontSize: '11.5px',
                    cursor: isInRange ? 'pointer' : 'default',
                    position: 'relative',
                  }}
                >
                  {dayNum}
                  {isInRange && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '2px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '3px',
                        height: '3px',
                        borderRadius: '50%',
                        background: isSelectedDay ? '#fef08a' : '#10b981',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Google Calendar / Calendly 스타일 인근 날짜 달력 그리드 */}
      {viewMode === 'calendar' ? (
        <div>
          {/* 미니멀 범례 바 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
              fontSize: '12px',
            }}
          >
            <span style={{ fontWeight: 700, color: '#334155' }}>
              {rangeFilter === 'week1' && '9/9(수) ~ 9/15(화) 1주차'}
              {rangeFilter === 'week2' && '9/16(수) ~ 9/22(화) 2주차'}
              {rangeFilter === 'all' && '9/9(수) ~ 9/22(화) 전체 14일'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b', fontSize: '11.5px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }} />
                선택됨
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                가능
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#cbd5e1' }} />
                마감
              </span>
            </div>
          </div>

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
                              background: openCount === 3 ? '#ecfdf5' : '#fffbeb',
                              color: openCount === 3 ? '#065f46' : '#92400e',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              border: openCount === 3 ? '1px solid #a7f3d0' : '1px solid #fde68a',
                            }}
                          >
                            {openCount}개 가능
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              background: '#f1f5f9',
                              color: '#94a3b8',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              border: '1px solid #e2e8f0',
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
                                  ? '2px solid #2563eb'
                                  : isConfirmed
                                    ? '1px dashed #cbd5e1'
                                    : '1px solid #cbd5e1',
                                background: isSelected ? '#eff6ff' : isConfirmed ? '#f8fafc' : '#ffffff',
                                color: isSelected ? '#1e40af' : isConfirmed ? '#94a3b8' : '#0f172a',
                              }}
                            >
                              <div style={{ fontSize: '12px', fontWeight: 800 }}>
                                {timeSlot.displayLabel}
                              </div>
                              <div style={{ fontSize: '11px', marginTop: '3px' }}>
                                {isSelected ? (
                                  <strong style={{ color: '#2563eb' }}>★ {priorityIdx + 1}순위 선택</strong>
                                ) : isConfirmed ? (
                                  <span style={{ color: '#dc2626', textDecoration: 'line-through' }}>마감</span>
                                ) : (
                                  <span style={{ color: '#059669' }}>가능</span>
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
                            onClick={() => onToggle(slotId)}
                            disabled={isConfirmed || (!isSelected && selectedSlots.length >= maxSelect)}
                            style={{
                              padding: '10px 6px',
                              borderRadius: '8px',
                              textAlign: 'center',
                              cursor: isConfirmed ? 'not-allowed' : (!isSelected && selectedSlots.length >= maxSelect) ? 'not-allowed' : 'pointer',
                              border: isSelected
                                ? '2px solid #1d4ed8'
                                : isConfirmed
                                  ? '1px dashed #cbd5e1'
                                  : '1.5px solid #cbd5e1',
                              background: isSelected
                                ? '#2563eb'
                                : isConfirmed
                                  ? '#f1f5f9'
                                  : '#ffffff',
                              color: isSelected
                                ? '#ffffff'
                                : isConfirmed
                                  ? '#94a3b8'
                                  : '#0f172a',
                              boxShadow: isSelected ? '0 3px 8px rgba(37,99,235,0.25)' : '0 1px 2px rgba(0,0,0,0.03)',
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
                                  background: '#fef08a',
                                  color: '#854d0e',
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
                                  color: '#059669',
                                }}
                              >
                                ● 가능
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
                                  color: isSelected ? '#2563eb' : isConfirmed ? '#dc3545' : '#28a745',
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
