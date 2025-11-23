import React from 'react';
import { AppBar, Toolbar, Typography, Stack, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert } from '@mui/material';
import Link from 'next/link';
import { getToken, setToken, clearToken, onTokenChanged } from '@/services/auth';

export default function AuthHeader() {
  const [token, setTokenState] = React.useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = React.useState(false);
  const [pasteValue, setPasteValue] = React.useState('');
  const [snack, setSnack] = React.useState<{ open: boolean; message: string; severity: 'success'|'info' }>(()=>({ open: false, message: '', severity: 'success' }));

  React.useEffect(() => {
    setTokenState(getToken());
    const off = onTokenChanged((t) => setTokenState(t));
    return () => { off?.(); };
  }, []);

  const onLogout = () => {
    clearToken();
    setTokenState(null);
    setSnack({ open: true, message: 'Token cleared', severity: 'info' });
  };

  const onPasteSave = () => {
    const trimmed = pasteValue.trim();
    if (!trimmed) return;
    setToken(trimmed);
    setTokenState(trimmed);
    setPasteOpen(false);
    setPasteValue('');
    setSnack({ open: true, message: 'Token saved', severity: 'success' });
  };

  const shortToken = token ? `${token.slice(0, 8)}…${token.slice(-6)}` : 'none';

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1 }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Typography variant="h6">Super Admin</Typography>
          </Link>
          <Stack direction="row" spacing={1}>
            <Link href="/products"><Button size="small">Products</Button></Link>
            <Link href="/payouts"><Button size="small">Payouts</Button></Link>
            <Link href="/disputes"><Button size="small">Disputes</Button></Link>
            <Link href="/refunds"><Button size="small">Refunds</Button></Link>
            <Link href="/payments"><Button size="small">Payments</Button></Link>
            <Link href="/users"><Button size="small">Users</Button></Link>
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip size="small" color={token ? 'success' : 'default'} label={`Token: ${shortToken}`} />
          {token ? (
            <Button size="small" color="inherit" onClick={onLogout}>Logout</Button>
          ) : (
            <>
              <Link href="/signin"><Button size="small" color="inherit">Sign In</Button></Link>
              <Button size="small" color="inherit" onClick={() => setPasteOpen(true)}>Paste Token</Button>
            </>
          )}
        </Stack>

        <Dialog open={pasteOpen} onClose={() => setPasteOpen(false)}>
          <DialogTitle>Paste token</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              label="JWT token"
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
              multiline
              minRows={3}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPasteOpen(false)}>Cancel</Button>
            <Button onClick={onPasteSave} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          <Alert severity={snack.severity} sx={{ width: '100%' }} onClose={() => setSnack(s => ({ ...s, open: false }))}>
            {snack.message}
          </Alert>
        </Snackbar>
      </Toolbar>
    </AppBar>
  );
}