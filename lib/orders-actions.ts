import { ReportType } from "@/types/types";
import { createClientSupabase } from "./supabase";

export const deleteOrder = async (orderId: string) => {
  const supabase = createClientSupabase();
  const { data, error } = await supabase.from('orders').update({
    status: 'cancelled'
  }).eq('id', orderId);
  if (error) {
    throw error;
  }
  return data;
}

// ⚠️ SOLO PER CLIENT-SIDE: Non usare nelle API server-side (usa supabaseAdmin direttamente)
export const refundOrder = async (orderId: string) => {
  const supabase = createClientSupabase();
  const { data, error } = await supabase.from('orders').update({
    status: 'cancelled',
    is_refunded: true,
    refunded_at: new Date().toISOString(),
    refunded_by: 'system'
  }).eq('id', orderId);
  if (error) {
    throw error;
  }
  return data;
}

export const updateOrderStatus = async (status: string, orderId: string): Promise<void> => {
  try {
    // Use APP_ENV if available, otherwise fallback to NODE_ENV
    const currentEnv = process.env.APP_ENV || process.env.NODE_ENV;
    
    let baseUrl: string;
    if (currentEnv === 'development') {
      baseUrl = 'http://localhost:8081';
    } else {
      baseUrl = process.env.EXPO_PUBLIC_BASE_URL || 'https://pizzaurum--demo.expo.app';
    }
    
    const response = await fetch(`${baseUrl}/api/orders/update-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        orderId, 
        newStatus: status
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update order status');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

export const updateOrderReport = async (orderId: string, report: ReportType) => {
  const supabase = createClientSupabase();
  const { data, error } = await supabase.from('orders').update({
    report: report,
    status: 'reported'
  }).eq('id', orderId);
  if (error) {
    throw error;
  }
  return data;
}

export const processRefund = async (orderId: string, userId?: string, isAdmin: boolean = false) => {
  try {
    // Use APP_ENV if available, otherwise fallback to NODE_ENV
    const currentEnv = process.env.APP_ENV || process.env.NODE_ENV;
    
    let baseUrl: string;
    if (currentEnv === 'development') {
      baseUrl = 'http://localhost:8081';
    } else {
      baseUrl = process.env.EXPO_PUBLIC_BASE_URL || 'https://pizzaurum--demo.expo.app';
    }
    
    const response = await fetch(`${baseUrl}/api/stripe/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        orderId, 
        userId,
        isAdmin
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to process refund');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error processing refund:', error);
    throw error;
  }
}