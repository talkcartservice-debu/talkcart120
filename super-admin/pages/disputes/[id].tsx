import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Paper,
  Typography,
  Stack,
  Button,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Warning as DisputeIcon,
  AttachFile as EvidenceIcon,
  Note as NoteIcon,
  Schedule as TimeIcon,
  MonetizationOn as AmountIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useAdminGuard } from '@/services/useAdminGuard';
import { AdminExtraApi } from '@/services/adminExtra';

export default function DisputeDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const guard = useAdminGuard();
  
  const [dispute, setDispute] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [notePriority, setNotePriority] = useState('medium');
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [evidence, setEvidence] = useState<any>({
    product_description: '',
    customer_communication: '',
    refund_policy: '',
    service_date: '',
    service_documentation: '',
    shipping_carrier: '',
    shipping_tracking_number: '',
    uncategorized_text: ''
  });

  const fetchDisputeDetails = async () => {
    if (!id || typeof id !== 'string') return;
    setLoading(true);
    try {
      const res = await AdminExtraApi.getDisputeDetails(id);
      if (res?.success) {
        setDispute(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch dispute details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (guard.allowed && id) {
      fetchDisputeDetails();
    }
  }, [guard.allowed, id]);

  if (guard.loading) return <div style={{ padding: 20 }}>Checking access…</div>;
  if (!guard.allowed) return <div style={{ padding: 20, color: 'crimson' }}>{guard.error || 'Access denied'}</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'needs_response': return 'error';
      case 'under_review': return 'warning';
      case 'won': return 'success';
      case 'lost': return 'error';
      default: return 'default';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency?.toUpperCase() || 'USD'
    }).format(amount / 100);
  };

  const submitEvidence = async () => {
    if (!id || typeof id !== 'string') return;
    try {
      await AdminExtraApi.submitDisputeEvidence(id, evidence);
      setEvidenceDialogOpen(false);
      fetchDisputeDetails();
    } catch (error) {
      console.error('Failed to submit evidence:', error);
    }
  };

  const addNote = async () => {
    if (!id || typeof id !== 'string' || !noteText.trim()) return;
    try {
      await AdminExtraApi.addDisputeNote(id, noteText, notePriority);
      setNoteDialogOpen(false);
      setNoteText('');
      setNotePriority('medium');
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!dispute) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Dispute not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link color="inherit" href="/disputes" onClick={(e) => { e.preventDefault(); router.push('/disputes'); }}>
            Disputes
          </Link>
          <Typography color="text.primary">Dispute Details</Typography>
        </Breadcrumbs>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DisputeIcon color="primary" />
            Dispute {dispute.id.substring(0, 12)}...
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button startIcon={<BackIcon />} onClick={() => router.push('/disputes')}>
              Back to Disputes
            </Button>
            <Button startIcon={<NoteIcon />} onClick={() => setNoteDialogOpen(true)}>
              Add Note
            </Button>
            {dispute.status === 'needs_response' && (
              <Button 
                variant="contained" 
                startIcon={<EvidenceIcon />} 
                onClick={() => setEvidenceDialogOpen(true)}
              >
                Submit Evidence
              </Button>
            )}
          </Stack>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Basic Information</Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="textSecondary">Dispute ID</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{dispute.id}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">Status</Typography>
                  <Chip 
                    label={dispute.status.replace('_', ' ')} 
                    color={getStatusColor(dispute.status) as any}
                    size="small"
                  />
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">Reason</Typography>
                  <Typography variant="body1">{dispute.reason || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">Amount</Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(dispute.amount, dispute.currency)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">Created</Typography>
                  <Typography variant="body1">
                    {new Date(dispute.created * 1000).toLocaleString()}
                  </Typography>
                </Box>
                {dispute.evidence_details?.due_by && (
                  <Box>
                    <Typography variant="body2" color="textSecondary">Evidence Due</Typography>
                    <Typography 
                      variant="body1" 
                      color={new Date(dispute.evidence_details.due_by * 1000) < new Date() ? 'error' : 'textPrimary'}
                    >
                      {new Date(dispute.evidence_details.due_by * 1000).toLocaleString()}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Payment Information</Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="textSecondary">Payment Intent</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    {dispute.payment_intent || 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">Currency</Typography>
                  <Typography variant="body1">{dispute.currency?.toUpperCase()}</Typography>
                </Box>
                {dispute.charge && (
                  <Box>
                    <Typography variant="body2" color="textSecondary">Charge ID</Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                      {dispute.charge}
                    </Typography>
                  </Box>
                )}
                {dispute.balance_transactions && dispute.balance_transactions.length > 0 && (
                  <Box>
                    <Typography variant="body2" color="textSecondary">Balance Transaction</Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                      {dispute.balance_transactions[0].id}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Evidence Details */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Evidence Submitted</Typography>
              {dispute.evidence && Object.keys(dispute.evidence).length > 0 ? (
                <Grid container spacing={2}>
                  {Object.entries(dispute.evidence).map(([key, value]) => 
                    value ? (
                      <Grid item xs={12} md={6} key={key}>
                        <Box>
                          <Typography variant="body2" color="textSecondary" sx={{ textTransform: 'capitalize' }}>
                            {key.replace('_', ' ')}
                          </Typography>
                          <Typography variant="body1">{String(value)}</Typography>
                        </Box>
                      </Grid>
                    ) : null
                  )}
                </Grid>
              ) : (
                <Alert severity="warning">No evidence has been submitted for this dispute</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Evidence Submission Dialog */}
      <Dialog open={evidenceDialogOpen} onClose={() => setEvidenceDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Submit Evidence for Dispute</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField 
              label="Product Description" 
              value={evidence.product_description} 
              onChange={(e)=> setEvidence({ ...evidence, product_description: e.target.value })} 
              multiline 
              minRows={2}
              fullWidth
            />
            <TextField 
              label="Customer Communication" 
              value={evidence.customer_communication} 
              onChange={(e)=> setEvidence({ ...evidence, customer_communication: e.target.value })} 
              multiline 
              minRows={2}
              fullWidth
            />
            <TextField 
              label="Refund Policy" 
              value={evidence.refund_policy} 
              onChange={(e)=> setEvidence({ ...evidence, refund_policy: e.target.value })} 
              multiline 
              minRows={2}
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField 
                label="Service Date" 
                value={evidence.service_date} 
                onChange={(e)=> setEvidence({ ...evidence, service_date: e.target.value })} 
                fullWidth
              />
              <TextField 
                label="Shipping Carrier" 
                value={evidence.shipping_carrier} 
                onChange={(e)=> setEvidence({ ...evidence, shipping_carrier: e.target.value })} 
                fullWidth
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField 
                label="Service Documentation" 
                value={evidence.service_documentation} 
                onChange={(e)=> setEvidence({ ...evidence, service_documentation: e.target.value })} 
                fullWidth
              />
              <TextField 
                label="Tracking Number" 
                value={evidence.shipping_tracking_number} 
                onChange={(e)=> setEvidence({ ...evidence, shipping_tracking_number: e.target.value })} 
                fullWidth
              />
            </Stack>
            <TextField 
              label="Additional Information" 
              value={evidence.uncategorized_text} 
              onChange={(e)=> setEvidence({ ...evidence, uncategorized_text: e.target.value })} 
              multiline 
              minRows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEvidenceDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitEvidence}>Submit Evidence</Button>
        </DialogActions>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={noteDialogOpen} onClose={() => setNoteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Note</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Note"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
            <TextField
              label="Priority"
              value={notePriority}
              onChange={(e) => setNotePriority(e.target.value)}
              select
              fullWidth
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={addNote}>Add Note</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
