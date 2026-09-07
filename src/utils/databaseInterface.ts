// DatabaseManager와 SupabaseManager가 구현할 인터페이스
import type { Slot, Request, Candidate, OperationLog } from '../types';

export interface LocalDatabase {
  slots: Record<string, Slot>;
  requests: Request[];
  candidates: Candidate[];
  logs: OperationLog[];
  operationIdempotency: Record<string, { result: unknown; error?: string }>;
  nextQueueSeq: number;
}

export interface IDatabase {
  checkIdempotency(operationId: string): { isDuplicate: boolean; cached?: unknown; error?: string };
  recordOperation(operationId: string, result: unknown, error?: string): void;
  beginTransaction(): void;
  commitTransaction(): void;
  rollbackTransaction(): void;
  getSlot(slotId: string): Slot | undefined;
  getAllSlots(): Slot[];
  updateSlot(slotId: string, updates: Partial<Slot>): void;
  createRequest(customerId: string): Request | null;
  getRequest(id: string): Request | undefined;
  getRequestsByCustomerId(customerId: string): Request[];
  getAllRequests(): Request[];
  updateRequest(id: string, updates: Partial<Request>): void;
  addCandidate(requestId: string, slotId: string, priority: number, version: number): Candidate;
  getCandidatesByRequestId(requestId: string): Candidate[];
  getAllCandidates(): Candidate[];
  deleteCandidatesByRequestId(requestId: string): void;
  addLog(log: Omit<OperationLog, 'id'>): OperationLog;
  getAllLogs(): OperationLog[];
  reset(): void;
  getState(): LocalDatabase;
}
