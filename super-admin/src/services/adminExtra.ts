import { fetchWithAuth } from './auth';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const AdminExtraApi = {
  // Payouts
  getPayouts: async (q: Record<string, any>) => {
    const params = new URLSearchParams(); Object.entries(q||{}).forEach(([k,v])=>{ if(v!=null&&v!=='') params.set(k,String(v)); });
    const res = await fetchWithAuth(`${API_BASE}/admin/payouts?${params.toString()}`);
    return res.json();
  },
  // Cursor-based payouts
  getPayoutsCursor: async (q: Record<string, any> = {}, opts: { limit?: number; after?: string | null; before?: string | null } = {}) => {
    const params = new URLSearchParams();
    Object.entries(q||{}).forEach(([k,v])=>{ if(v!=null&&v!=='') params.set(k,String(v)); });
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.after) params.set('after', String(opts.after));
    if (opts.before) params.set('before', String(opts.before));
    const res = await fetchWithAuth(`${API_BASE}/admin/payouts?${params.toString()}`);
    return res.json();
  },
  getPayoutDetails: async (id: string) => {
    const res = await fetchWithAuth(`${API_BASE}/admin/payouts/${id}`);
    return res.json();
  },
  createPayout: async (data: { amount: number; currency: string; destination?: string; description?: string; metadata?: Record<string, any> }) => {
    const res = await fetchWithAuth(`${API_BASE}/admin/payouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  cancelPayout: async (id: string) => {
    const res = await fetchWithAuth(`${API_BASE}/admin/payouts/${id}/cancel`, { method: 'POST' });
    return res.json();
  },
  getPayoutsAnalytics: async (timeRange: string = '30d') => {
    const res = await fetchWithAuth(`${API_BASE}/admin/payouts/analytics/overview?timeRange=${timeRange}`);
    return res.json();
  },
  getDetailedPayoutsAnalytics: async (timeRange: string = '90d') => {
    const res = await fetchWithAuth(`${API_BASE}/admin/payouts/analytics/detailed?timeRange=${timeRange}`);
    return res.json();
  },
  getPayoutsSummary: async () => {
    const res = await fetchWithAuth(`${API_BASE}/admin/payouts/summary`);
    return res.json();
  },
  payoutsExportUrl: (q: Record<string, any>) => {
    const params = new URLSearchParams(); Object.entries(q||{}).forEach(([k,v])=>{ if(v!=null&&v!=='') params.set(k,String(v)); });
    return `${API_BASE}/admin/payouts/export.csv?${params.toString()}`;
  },

  // Payments Management
  getPayments: async (query: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithAuth(`${API_BASE}/admin/payments?${params.toString()}`);
    return res.json();
  },
  getPaymentDetails: async (id: string) => {
    const res = await fetchWithAuth(`${API_BASE}/admin/payments/${id}`);
    return res.json();
  },
  cancelPayment: async (id: string) => {
    const res = await fetchWithAuth(`${API_BASE}/admin/payments/${id}/cancel`, { method: 'POST' });
    return res.json();
  },
  getPaymentsAnalytics: async (timeRange: string = '30d') => {
    const res = await fetchWithAuth(`${API_BASE}/admin/payments/analytics/overview?timeRange=${timeRange}`);
    return res.json();
  },
  getDetailedPaymentsAnalytics: async (timeRange: string = '90d') => {
    const res = await fetchWithAuth(`${API_BASE}/admin/payments/analytics/detailed?timeRange=${timeRange}`);
    return res.json();
  },
  getPaymentsSummary: async () => {
    const res = await fetchWithAuth(`${API_BASE}/admin/payments/summary`);
    return res.json();
  },
  exportPaymentsUrl: (query: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    return `${API_BASE}/admin/payments/export.csv?${params.toString()}`;
  },
  createTestPaymentIntent: async (data: { amount: number; currency: string }) => {
    const res = await fetchWithAuth(`${API_BASE}/payments/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Charges Management
  getCharges: async (query: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithAuth(`${API_BASE}/admin/charges?${params.toString()}`);
    return res.json();
  },
  getChargeDetails: async (id: string) => {
    const res = await fetchWithAuth(`${API_BASE}/admin/charges/${id}`);
    return res.json();
  },

  // Disputes
  getDisputes: async (q: Record<string, any>) => {
    const params = new URLSearchParams(); Object.entries(q||{}).forEach(([k,v])=>{ if(v!=null&&v!=='') params.set(k,String(v)); });
    const res = await fetchWithAuth(`${API_BASE}/admin/disputes?${params.toString()}`);
    return res.json();
  },
  // Cursor-based disputes
  getDisputesCursor: async (q: Record<string, any> = {}, opts: { limit?: number; after?: string | null; before?: string | null } = {}) => {
    const params = new URLSearchParams();
    Object.entries(q||{}).forEach(([k,v])=>{ if(v!=null&&v!=='') params.set(k,String(v)); });
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.after) params.set('after', String(opts.after));
    if (opts.before) params.set('before', String(opts.before));
    const res = await fetchWithAuth(`${API_BASE}/admin/disputes?${params.toString()}`);
    return res.json();
  },
  getDisputeDetails: async (id: string) => {
    const res = await fetchWithAuth(`${API_BASE}/admin/disputes/${id}`);
    return res.json();
  },
  getDisputesAnalytics: async (timeRange: string = '30d') => {
    const res = await fetchWithAuth(`${API_BASE}/admin/disputes/analytics/overview?timeRange=${timeRange}`);
    return res.json();
  },
  getDetailedDisputesAnalytics: async (timeRange: string = '90d') => {
    const res = await fetchWithAuth(`${API_BASE}/admin/disputes/analytics/detailed?timeRange=${timeRange}`);
    return res.json();
  },
  getDisputesSummary: async () => {
    const res = await fetchWithAuth(`${API_BASE}/admin/disputes/summary`);
    return res.json();
  },
  submitDisputeEvidence: async (id: string, evidence: any) => {
    const res = await fetchWithAuth(`${API_BASE}/admin/disputes/${id}/submit-evidence`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evidence }) });
    return res.json();
  },
  addDisputeNote: async (id: string, note: string, priority: string = 'medium') => {
    const res = await fetchWithAuth(`${API_BASE}/admin/disputes/${id}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note, priority }) });
    return res.json();
  },
  disputesExportUrl: (q: Record<string, any>) => {
    const params = new URLSearchParams(); Object.entries(q||{}).forEach(([k,v])=>{ if(v!=null&&v!=='') params.set(k,String(v)); });
    return `${API_BASE}/admin/disputes/export.csv?${params.toString()}`;
  },

  // Users
  listUsers: async (q: Record<string, any>) => {
    const params = new URLSearchParams(); Object.entries(q||{}).forEach(([k,v])=>{ if(v!=null&&v!=='') params.set(k,String(v)); });
    const res = await fetchWithAuth(`${API_BASE}/admin/users?${params.toString()}`);
    return res.json();
  },
  suspendUser: async (id: string) => {
    const res = await fetchWithAuth(`${API_BASE}/admin/users/${id}/suspend`, { method: 'POST' });
    return res.json();
  },
  unsuspendUser: async (id: string) => {
    const res = await fetchWithAuth(`${API_BASE}/admin/users/${id}/unsuspend`, { method: 'POST' });
    return res.json();
  },
  setKyc: async (id: string, status: 'approved'|'rejected'|'pending'|'none') => {
    const res = await fetchWithAuth(`${API_BASE}/admin/users/${id}/kyc?status=${status}`, { method: 'POST' });
    return res.json();
  },
  userSales: async (id: string, q?: Record<string, any>) => {
    const params = new URLSearchParams(); Object.entries(q||{}).forEach(([k,v])=>{ if(v!=null&&v!=='') params.set(k,String(v)); });
    const url = params.toString() ? `${API_BASE}/admin/users/${id}/sales?${params.toString()}` : `${API_BASE}/admin/users/${id}/sales`;
    const res = await fetchWithAuth(url);
    return res.json();
  },
  userFees: async (id: string, q?: Record<string, any>) => {
    const params = new URLSearchParams(); Object.entries(q||{}).forEach(([k,v])=>{ if(v!=null&&v!=='') params.set(k,String(v)); });
    const url = params.toString() ? `${API_BASE}/admin/users/${id}/fees?${params.toString()}` : `${API_BASE}/admin/users/${id}/fees`;
    const res = await fetchWithAuth(url);
    return res.json();
  },

  // Commission Reports
  getCommissionReport: async (q?: Record<string, any>) => {
    const params = new URLSearchParams(); Object.entries(q||{}).forEach(([k,v])=>{ if(v!=null&&v!=='') params.set(k,String(v)); });
    const url = params.toString() ? `${API_BASE}/admin/commission/report?${params.toString()}` : `${API_BASE}/admin/commission/report`;
    const res = await fetchWithAuth(url);
    return res.json();
  },

  // Media management
  getMediaFiles: async (query: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithAuth(`${API_BASE}/admin/media/files?${params.toString()}`);
    return res.json();
  },
  getMediaAnalytics: async (timeRange: string = '30d') => {
    const res = await fetchWithAuth(`${API_BASE}/admin/media/analytics/overview?timeRange=${timeRange}`);
    return res.json();
  },
  getDetailedMediaAnalytics: async (timeRange: string = '90d') => {
    const res = await fetchWithAuth(`${API_BASE}/admin/media/analytics/detailed?timeRange=${timeRange}`);
    return res.json();
  },
  getMediaSummary: async () => {
    const res = await fetchWithAuth(`${API_BASE}/admin/media/summary`);
    return res.json();
  },
  deleteMediaFile: async (productId: string, imageId: string) => {
    const res = await fetchWithAuth(`${API_BASE}/admin/media/images/${productId}/${imageId}`, {
      method: 'DELETE'
    });
    return res.json();
  },
  bulkDeleteMedia: async (files: Array<{productId: string, imageId: string}>) => {
    const res = await fetchWithAuth(`${API_BASE}/admin/media/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files })
    });
    return res.json();
  }
};