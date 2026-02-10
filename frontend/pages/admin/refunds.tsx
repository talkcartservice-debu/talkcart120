import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import Layout from '@/components/layout/Layout';
import { Box, Container, Typography, Paper, Chip, Stack, Alert, TextField, MenuItem, Button } from '@mui/material';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useAuth } from '@/contexts/AuthContext';

const AdminRefundsPage: NextPage = () => {
  const ws = useWebSocket() as any;
  const { socket, isConnected } = ws;
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [currency, setCurrency] = useState<string>('');
  const [transactionReference, setPaymentIntentId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [since, setSince] = useState<string>(''); // ISO string
  const [until, setUntil] = useState<string>(''); // ISO string
  const [meta, setMeta] = useState<any>(null);

  // Format Date to 'YYYY-MM-DDTHH:mm' in local time for datetime-local input
  const toLocalInput = (d: Date) => {
    const tzOffsetMs = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
  };

  const fetchRecent = React.useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('page', String(page));
      if (since) params.set('since', String(new Date(since).getTime()));
      if (until) params.set('until', String(new Date(until).getTime()));
      if (status) params.set('status', status);
      if (currency) params.set('currency', currency);
      if (transactionReference) params.set('transactionReference', transactionReference.trim());
      if (userId) params.set('userId', userId.trim());
      const res = await fetch(`/api/admin/refunds/recent?${params.toString()}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` } });
      const json = await res.json();
      if (json?.success) { setEvents(json.data || []); setMeta(json.meta || null); }
    } catch (e) {
      // ignore
    }
  }, [limit, page, since, until, status, currency, transactionReference, userId]);

  useEffect(() => {
    if (user?.role !== 'admin') return;

    if (ws.joinAdmin && isConnected && !joined) {
      ws.joinAdmin();
      setJoined(true);
    }

    fetchRecent();

    const offSubmitted = ws.onRefundSubmitted?.((data: any) => {
      setEvents(prev => [{ type: 'submitted', ...data, at: new Date().toISOString() }, ...prev].slice(0, 100));
    }) || (() => {});
    const offFailed = ws.onRefundFailed?.((data: any) => {
      setEvents(prev => [{ type: 'failed', ...data, at: new Date().toISOString() }, ...prev].slice(0, 100));
    }) || (() => {});

    return () => {
      offSubmitted?.();
      offFailed?.();
    };
  }, [user?.role, isConnected, joined, fetchRecent, ws]);

  if (user?.role !== 'admin') {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="error">Admin access required</Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h5" gutterBottom>Refund Monitor (Live)</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Listening for refund submissions and failures in real-time.
        </Typography>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <TextField
                select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="submitted">Submitted</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </TextField>
              <TextField
                label="Currency (e.g., USD)"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                sx={{ minWidth: 140 }}
              />
              <TextField
                label="Transaction Reference"
                value={transactionReference}
                onChange={(e) => setPaymentIntentId(e.target.value)}
                sx={{ minWidth: 220 }}
              />
              <TextField
                label="User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                sx={{ minWidth: 220 }}
              />
              <TextField
                type="datetime-local"
                label="Since"
                value={since}
                onChange={(e) => setSince(e.target.value)}
                sx={{ minWidth: 220 }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                type="datetime-local"
                label="Until"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                sx={{ minWidth: 220 }}
                InputLabelProps={{ shrink: true }}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button size="small" onClick={() => {
                  const now = new Date();
                  const start = new Date();
                  start.setHours(0,0,0,0);
                  setSince(toLocalInput(start));
                  setUntil(toLocalInput(now));
                }}>Today</Button>
                <Button size="small" onClick={() => {
                  const now = new Date();
                  const past = new Date(now.getTime() - 7 * 86400000);
                  setSince(toLocalInput(past));
                  setUntil(toLocalInput(now));
                }}>7d</Button>
                <Button size="small" onClick={() => {
                  const now = new Date();
                  const past = new Date(now.getTime() - 30 * 86400000);
                  setSince(toLocalInput(past));
                  setUntil(toLocalInput(now));
                }}>30d</Button>
                <Button size="small" onClick={() => { setSince(''); setUntil(''); }}>Clear</Button>
                <Button variant="contained" onClick={() => { setPage(1); fetchRecent(); }}>Apply</Button>
              </Stack>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <TextField
                type="number"
                label="Page"
                value={page}
                onChange={(e) => setPage(Math.max(1, Number(e.target.value) || 1))}
                sx={{ width: 120 }}
              />
              <TextField
                type="number"
                label="Limit"
                value={limit}
                onChange={(e) => setLimit(Math.min(200, Math.max(1, Number(e.target.value) || 25)))}
                sx={{ width: 120 }}
              />
              <Button variant="outlined" onClick={fetchRecent}>Refresh</Button>
              <Button variant="outlined" onClick={async () => {
                // Server CSV export using streaming endpoint with current filters (authorized)
                const params = new URLSearchParams();
                params.set('limit', String(limit));
                params.set('page', String(page));
                if (since) params.set('since', String(new Date(since).getTime()));
                if (until) params.set('until', String(new Date(until).getTime()));
                if (status) params.set('status', status);
                if (currency) params.set('currency', currency);
                if (transactionReference) params.set('transactionReference', transactionReference.trim());
                if (userId) params.set('userId', userId.trim());
                const url = `/api/admin/refunds/export.csv?${params.toString()}`;
                const res = await fetch(url, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` } });
                const blob = await res.blob();
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `refund-events-${Date.now()}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}>Export CSV</Button>
            </Stack>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2 }}>
          {events.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No events yet.</Typography>
          ) : (
            <Stack spacing={1}>
              {events.map((ev, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip size="small" label={ev.type.toUpperCase()} color={ev.type === 'failed' ? 'error' : 'success'} />
                    <Typography variant="body2">
                      {ev.currency} {((ev.amountCents || 0) / 100).toFixed(2)} — PI: {ev.transactionReference}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">{new Date(ev.at).toLocaleTimeString()}</Typography>
                </Box>
              ))}
            </Stack>
          )}
          {meta && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Typography variant="caption">Page {meta.page} of {meta.pages} — {meta.total} total</Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" disabled={page <= 1} onClick={() => { setPage((p) => Math.max(1, p - 1)); setTimeout(fetchRecent, 0); }}>Prev</Button>
                <Button size="small" disabled={meta.pages && page >= meta.pages} onClick={() => { setPage((p) => p + 1); setTimeout(fetchRecent, 0); }}>Next</Button>
              </Stack>
            </Box>
          )}
        </Paper>
      </Container>
    </Layout>
  );
};

export default AdminRefundsPage;