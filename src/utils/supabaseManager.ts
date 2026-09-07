// Supabase 매니저: DatabaseManager와 동일한 인터페이스
import { submitRequestRPC, confirmRequestRPC, resubmitRequestRPC, getSlots, getCandidates, getAllRequests, getOperationLogs } from './supabase-rpc';
import type { Slot, Request, Candidate, OperationLog } from '../types';
import type { LocalDatabase, IDatabase } from './databaseInterface';

export class SupabaseManager implements IDatabase {
  private cache: LocalDatabase;

  constructor(_userId: string) {
    this.cache = {
      slots: {},
      requests: [],
      candidates: [],
      logs: [],
      operationIdempotency: {},
      nextQueueSeq: 1,
    };
  }

  // 데이터 초기화 및 캐시 새로고침
  async initialize(): Promise<void> {
    try {
      const slots = await getSlots();
      const candidates = await getCandidates();
      const requests = await getAllRequests();
      const logs = await getOperationLogs();

      // 슬롯을 Record로 변환
      const slotsMap: Record<string, Slot> = {};
      (slots as any[]).forEach((slot) => {
        slotsMap[slot.id] = {
          id: slot.id,
          date: slot.date,
          timeLabel: slot.time_label,
          status: slot.status,
          confirmedBy: slot.confirmed_by,
          confirmedAt: slot.confirmed_at,
        };
      });

      // 요청 변환
      const requestsList = (requests as any[] || []).map((r) => ({
        id: r.id,
        customerId: r.customer_id,
        version: r.version,
        createdAt: r.created_at,
        status: r.status,
        confirmedSlotId: r.confirmed_slot_id,
        confirmedAt: r.confirmed_at,
      }));

      // 후보 변환
      const candidatesList = (candidates as any[] || []).map((c) => ({
        id: c.id,
        requestId: c.request_id,
        slotId: c.slot_id,
        priority: c.priority,
        version: c.version,
        queueSeq: c.queue_seq,
      }));

      // 로그 변환
      const logsList = (logs as any[] || []).map((l: any) => ({
        id: l.id,
        timestamp: l.created_at,
        action: l.action,
        requestId: l.request_id,
        adminId: l.admin_id,
        slotId: l.slot_id,
        status: l.status,
        error: l.error_message,
      }));

      this.cache = {
        slots: slotsMap,
        requests: requestsList,
        candidates: candidatesList,
        logs: logsList,
        operationIdempotency: {},
        nextQueueSeq: Math.max(...candidatesList.map(c => c.queueSeq), 0) + 1,
      };
    } catch (err) {
      console.error('Failed to initialize SupabaseManager:', err);
      throw err;
    }
  }

  // DatabaseManager 호환 인터페이스

  checkIdempotency(operationId: string): { isDuplicate: boolean; cached?: unknown; error?: string } {
    const cached = this.cache.operationIdempotency[operationId];
    if (cached) {
      return { isDuplicate: true, cached: cached.result, error: cached.error };
    }
    return { isDuplicate: false };
  }

  recordOperation(operationId: string, result: unknown, error?: string): void {
    this.cache.operationIdempotency[operationId] = { result, error };
  }

  beginTransaction(): void {
    // Supabase에서는 RPC가 트랜잭션을 처리하므로 no-op
  }

  commitTransaction(): void {
    // Supabase에서는 RPC가 트랜잭션을 처리하므로 no-op
  }

  rollbackTransaction(): void {
    // Supabase에서는 RPC가 트랜잭션을 처리하므로 no-op
  }

  getSlot(slotId: string): Slot | undefined {
    return this.cache.slots[slotId];
  }

  getAllSlots(): Slot[] {
    return Object.values(this.cache.slots);
  }

  updateSlot(slotId: string, updates: Partial<Slot>): void {
    const slot = this.cache.slots[slotId];
    if (slot) {
      this.cache.slots[slotId] = { ...slot, ...updates };
    }
  }

  createRequest(customerId: string): Request | null {
    // Supabase에서는 RPC가 요청을 생성하므로 캐시에만 추가
    const request: Request = {
      id: generateId(),
      customerId,
      version: 1,
      createdAt: new Date().toISOString(),
      status: 'received',
    };
    this.cache.requests.push(request);
    return request;
  }

  getRequest(id: string): Request | undefined {
    return this.cache.requests.find(r => r.id === id);
  }

  getRequestsByCustomerId(customerId: string): Request[] {
    return this.cache.requests.filter(r => r.customerId === customerId);
  }

  getAllRequests(): Request[] {
    return this.cache.requests;
  }

  updateRequest(id: string, updates: Partial<Request>): void {
    const request = this.cache.requests.find(r => r.id === id);
    if (request) {
      const idx = this.cache.requests.indexOf(request);
      this.cache.requests[idx] = { ...request, ...updates };
    }
  }

  addCandidate(
    requestId: string,
    slotId: string,
    priority: number,
    version: number
  ): Candidate {
    const candidate: Candidate = {
      id: generateId(),
      requestId,
      slotId,
      priority,
      version,
      queueSeq: this.cache.nextQueueSeq,
    };
    this.cache.nextQueueSeq += 1;
    this.cache.candidates.push(candidate);
    return candidate;
  }

  getCandidatesByRequestId(requestId: string): Candidate[] {
    return this.cache.candidates.filter(c => c.requestId === requestId);
  }

  getAllCandidates(): Candidate[] {
    return this.cache.candidates;
  }

  deleteCandidatesByRequestId(requestId: string): void {
    this.cache.candidates = this.cache.candidates.filter(c => c.requestId !== requestId);
  }

  addLog(log: Omit<OperationLog, 'id'>): OperationLog {
    const fullLog: OperationLog = {
      id: generateId(),
      ...log,
    };
    this.cache.logs.push(fullLog);
    return fullLog;
  }

  getAllLogs(): OperationLog[] {
    return this.cache.logs;
  }

  reset(): void {
    this.cache = {
      slots: {},
      requests: [],
      candidates: [],
      logs: [],
      operationIdempotency: {},
      nextQueueSeq: 1,
    };
  }

  getState(): LocalDatabase {
    return this.cache;
  }

  // Supabase RPC 호출 메서드

  async submitRequest(
    customerId: string,
    selectedSlotIds: string[],
    operationId: string
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    const result = await submitRequestRPC(customerId, selectedSlotIds, operationId);

    if (result.success && result.requestId) {
      // 캐시 갱신
      await this.initialize();
    }

    return result;
  }

  async confirmRequest(
    requestId: string,
    selectedSlotId: string,
    adminId: string,
    operationId: string
  ): Promise<{ success: boolean; affectedRequests?: string[]; error?: string }> {
    const result = await confirmRequestRPC(requestId, selectedSlotId, adminId, operationId);

    if (result.success) {
      // 캐시 갱신
      await this.initialize();
    }

    return result;
  }

  async resubmitRequest(
    customerId: string,
    previousRequestId: string,
    newSlotIds: string[],
    operationId: string
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    const result = await resubmitRequestRPC(customerId, previousRequestId, newSlotIds, operationId);

    if (result.success) {
      // 캐시 갱신
      await this.initialize();
    }

    return result;
  }
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
