// Supabase RPC 함수 호출 래퍼
import { supabase } from './supabase';

export interface SupabaseSubmitResult {
  success: boolean;
  requestId?: string;
  error?: string;
}

export interface SupabaseConfirmResult {
  success: boolean;
  affectedRequests?: string[];
  error?: string;
}

export interface SupabaseResubmitResult {
  success: boolean;
  requestId?: string;
  error?: string;
}

export async function submitRequestRPC(
  customerId: string,
  slotIds: string[],
  operationId: string
): Promise<SupabaseSubmitResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase.rpc('submit_request', {
      p_customer_id: customerId,
      p_slot_ids: slotIds,
      p_operation_id: operationId,
    });

    if (error) {
      console.error('[submitRequestRPC] Error:', error.message);
      return { success: false, error: error.message };
    }

    if (data && typeof data === 'object') {
      const result = data as any;
      return {
        success: result.success === true,
        requestId: result.requestId,
        error: result.error,
      };
    }

    return { success: false, error: 'Invalid response format' };
  } catch (err) {
    console.error('[submitRequestRPC] Exception:', err);
    return { success: false, error: String(err) };
  }
}

export async function confirmRequestRPC(
  requestId: string,
  slotId: string,
  adminId: string,
  operationId: string
): Promise<SupabaseConfirmResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase.rpc('confirm_request', {
      p_request_id: requestId,
      p_slot_id: slotId,
      p_admin_id: adminId,
      p_operation_id: operationId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data && typeof data === 'object') {
      const result = data as any;
      return {
        success: result.success === true,
        affectedRequests: result.affectedRequests || [],
        error: result.error,
      };
    }

    return { success: false, error: 'Invalid response format' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function resubmitRequestRPC(
  customerId: string,
  previousRequestId: string,
  newSlotIds: string[],
  operationId: string
): Promise<SupabaseResubmitResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase.rpc('resubmit_request', {
      p_customer_id: customerId,
      p_request_id: previousRequestId,
      p_slot_ids: newSlotIds,
      p_operation_id: operationId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data && typeof data === 'object') {
      const result = data as any;
      return {
        success: result.success === true,
        requestId: result.requestId,
        error: result.error,
      };
    }

    return { success: false, error: 'Invalid response format' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getCustomerRequests(customerId: string) {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('customer_id', customerId);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to get customer requests:', err);
    return [];
  }
}

export async function getAllRequests() {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to get all requests:', err);
    return [];
  }
}

export async function getSlots() {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase.from('slots').select('*');

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to get slots:', err);
    return [];
  }
}

export async function getCandidates() {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase.from('candidates').select('*');

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to get candidates:', err);
    return [];
  }
}

export async function getOperationLogs() {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('operation_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to get operation logs:', err);
    return [];
  }
}
