import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { onNotify, NotifyDetail } from '@/services/auth';

export default function ToastProvider() {
  const [open, setOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<NotifyDetail>({ message: '', severity: 'info' });

  React.useEffect(() => {
    const off = onNotify((d) => {
      setDetail({ severity: d.severity || 'info', message: d.message });
      setOpen(true);
    });
    return () => { off?.(); };
  }, []);

  return (
    <Snackbar open={open} autoHideDuration={3000} onClose={() => setOpen(false)}>
      <Alert onClose={() => setOpen(false)} severity={detail.severity} sx={{ width: '100%' }}>
        {detail.message}
      </Alert>
    </Snackbar>
  );
}