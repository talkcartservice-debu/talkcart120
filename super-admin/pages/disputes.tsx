import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Stack,
  TextField,
  Button,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Warning as DisputeIcon,
  TrendingUp as AnalyticsIcon,
  Note as NoteIcon,
  AttachFile as EvidenceIcon,
  Schedule as TimeIcon,
  MonetizationOn as AmountIcon,
  Assessment as ReportIcon
} from '@mui/icons-material';
import { useAdminGuard } from '@/services/useAdminGuard';
import { AdminExtraApi } from '@/services/adminExtra';
import { downloadCsvWithAuth } from '@/services/download';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function DisputesAdmin() {
  const guard = useAdminGuard();

  // Main state
  const [tabValue, setTabValue] = useState(0);
  const [status, setStatus] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [timeRange, setTimeRange] = useState('30d');
  const [items, setItems] = useState<any[]>([]);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [pageInfo, setPageInfo] = useState<any>({ has_more: false, first_id: null, last_id: null, next_after: null, before: null });
  const [after, setAfter] = useState<string | null>(null);
  const [before, setBefore] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  // Analytics state
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Dialog states
  const [evidenceOpen, setEvidenceOpen] = useState<string | null>(null);
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
  const [detailsOpen, setDetailsOpen] = useState<string | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [notePriority, setNotePriority] = useState('medium');

  // Fetch disputes data
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await AdminExtraApi.getDisputesCursor({ status, paymentIntentId }, { limit, after, before });
      if (res?.success) {
        setItems(res.data || []);
        setPageInfo(res.page_info || {});
      }
    } catch (error) {
      console.error('Failed to fetch disputes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await AdminExtraApi.getDisputesAnalytics(timeRange);
      if (res?.success) {
        setAnalytics(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Fetch dispute details
  const fetchDisputeDetails = async (id: string) => {
    try {
      const res = await AdminExtraApi.getDisputeDetails(id);
      if (res?.success) {
        setSelectedDispute(res.data);
        setDetailsOpen(id);
      }
    } catch (error) {
      console.error('Failed to fetch dispute details:', error);
    }
  };

  useEffect(() => {
    if (guard.allowed) {
      fetchData();
      fetchAnalytics();
    }
  }, [guard.allowed]);

  useEffect(() => {
    if (guard.allowed) {
      fetchAnalytics();
    }
  }, [timeRange]);

  if (guard.loading) return <div style={{ padding: 20 }}>Checking access…</div>;
  if (!guard.allowed) return <div style={{ padding: 20, color: 'crimson' }}>{guard.error || 'Access denied'}</div>;

  const exportCsv = async () => {
    try {
      const url = AdminExtraApi.disputesExportUrl({ status, paymentIntentId, timeRange });
      await downloadCsvWithAuth(url, `disputes-${Date.now()}.csv`);
    } catch (error: any) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error.message || 'Unknown error occurred'}`);
    }
  };

  const submitEvidence = async (id: string) => {
    if (!confirm('Submit evidence for this dispute?')) return;
    try {
      await AdminExtraApi.submitDisputeEvidence(id, evidence);
      setEvidenceOpen(null);
      fetchData();
    } catch (error) {
      console.error('Failed to submit evidence:', error);
    }
  };

  const addNote = async () => {
    if (!noteDialogOpen || !noteText.trim()) return;
    try {
      await AdminExtraApi.addDisputeNote(noteDialogOpen, noteText, notePriority);
      setNoteDialogOpen(null);
      setNoteText('');
      setNotePriority('medium');
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

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

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DisputeIcon color="primary" />
          Dispute Management
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh Data">
            <IconButton onClick={() => { fetchData(); fetchAnalytics(); }} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>
            Export CSV
          </Button>
        </Stack>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Disputes List" icon={<DisputeIcon />} />
          <Tab label="Analytics" icon={<AnalyticsIcon />} />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {/* Analytics Cards */}
        {analytics && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Total Disputes</Typography>
                  <Typography variant="h4">{analytics.total}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Total Amount</Typography>
                  <Typography variant="h4">{formatCurrency(analytics.total_amount, 'USD')}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Needs Response</Typography>
                  <Typography variant="h4" color="error">
                    {analytics.by_status?.needs_response || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Average Amount</Typography>
                  <Typography variant="h4">{formatCurrency(analytics.average_amount, 'USD')}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
            <TextField label="Status" value={status} onChange={(e) => setStatus(e.target.value)} select sx={{ minWidth: 200 }}>
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="needs_response">Needs Response</MenuItem>
              <MenuItem value="under_review">Under Review</MenuItem>
              <MenuItem value="won">Won</MenuItem>
              <MenuItem value="lost">Lost</MenuItem>
            </TextField>
            <TextField label="PaymentIntent ID" value={paymentIntentId} onChange={(e) => setPaymentIntentId(e.target.value)} sx={{ minWidth: 260 }} />
            <TextField label="Time Range" value={timeRange} onChange={(e) => setTimeRange(e.target.value)} select sx={{ minWidth: 150 }}>
              <MenuItem value="7d">Last 7 days</MenuItem>
              <MenuItem value="30d">Last 30 days</MenuItem>
              <MenuItem value="90d">Last 90 days</MenuItem>
            </TextField>
            <Button variant="contained" onClick={() => { setAfter(null); setBefore(null); setHistory([]); fetchData(); }}>Apply</Button>
          </Stack>
        </Paper>
        {/* Disputes Table */}
        <Paper>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>PaymentIntent</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Evidence Due</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((d) => (
                    <TableRow key={d.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {d.id.substring(0, 12)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={d.status.replace('_', ' ')}
                          color={getStatusColor(d.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={d.reason || 'N/A'} variant="outlined" size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(d.amount, d.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {d.payment_intent ? `${d.payment_intent.substring(0, 12)}...` : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date((d.created||0)*1000).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={d.evidence_details?.due_by && new Date(d.evidence_details.due_by * 1000) < new Date() ? 'error' : 'textSecondary'}>
                          {d.evidence_details?.due_by ? new Date(d.evidence_details.due_by * 1000).toLocaleDateString() : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => fetchDisputeDetails(d.id)}>
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Add Note">
                            <IconButton size="small" onClick={() => setNoteDialogOpen(d.id)}>
                              <NoteIcon />
                            </IconButton>
                          </Tooltip>
                          {d.status === 'needs_response' && (
                            <Tooltip title="Submit Evidence">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  setEvidenceOpen(d.id);
                                  setEvidence({
                                    product_description: '',
                                    customer_communication: '',
                                    refund_policy: '',
                                    service_date: '',
                                    service_documentation: '',
                                    shipping_carrier: '',
                                    shipping_tracking_number: '',
                                    uncategorized_text: ''
                                  });
                                }}
                              >
                                <EvidenceIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {items.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" color="textSecondary">No disputes found</Typography>
                  <Typography variant="body2" color="textSecondary">Try adjusting your filters</Typography>
                </Box>
              )}

              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2 }}>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    disabled={!pageInfo.before}
                    onClick={() => {
                      setBefore(pageInfo.first_id);
                      setAfter(null);
                      setHistory((h)=>h.slice(0,-1));
                      fetchData();
                    }}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outlined"
                    disabled={!pageInfo.has_more}
                    onClick={() => {
                      if (pageInfo.last_id) setHistory((h)=>[...h, pageInfo.first_id]);
                      setAfter(pageInfo.last_id);
                      setBefore(null);
                      fetchData();
                    }}
                  >
                    Next
                  </Button>
                </Stack>
                <TextField
                  label="Limit"
                  type="number"
                  size="small"
                  value={limit}
                  onChange={(e)=> setLimit(Math.max(1, Math.min(100, Number(e.target.value)||25)))}
                  sx={{ width: 120 }}
                />
              </Stack>
            </>
          )}
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Analytics Dashboard */}
        {analyticsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : analytics ? (
          <Grid container spacing={3}>
            {/* Status Distribution */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Disputes by Status</Typography>
                  <List>
                    {Object.entries(analytics.by_status || {}).map(([status, count]) => (
                      <ListItem key={status}>
                        <ListItemIcon>
                          <Chip
                            label={status.replace('_', ' ')}
                            color={getStatusColor(status) as any}
                            size="small"
                          />
                        </ListItemIcon>
                        <ListItemText primary={`${count} disputes`} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Reason Distribution */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Disputes by Reason</Typography>
                  <List>
                    {Object.entries(analytics.by_reason || {}).map(([reason, count]) => (
                      <ListItem key={reason}>
                        <ListItemIcon>
                          <Chip label={reason} variant="outlined" size="small" />
                        </ListItemIcon>
                        <ListItemText primary={`${count} disputes`} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Recent Trend */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Recent Trend (Last 7 Days)</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Count</TableCell>
                        <TableCell>Total Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analytics.recent_trend?.map((day: any) => (
                        <TableRow key={day.date}>
                          <TableCell>{new Date(day.date).toLocaleDateString()}</TableCell>
                          <TableCell>{day.count}</TableCell>
                          <TableCell>{formatCurrency(day.amount, 'USD')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : (
          <Alert severity="info">No analytics data available</Alert>
        )}
      </TabPanel>

      {/* Evidence Submission Dialog */}
      <Dialog open={!!evidenceOpen} onClose={() => setEvidenceOpen(null)} maxWidth="md" fullWidth>
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
          <Button onClick={() => setEvidenceOpen(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => evidenceOpen && submitEvidence(evidenceOpen)}
          >
            Submit Evidence
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dispute Details Dialog */}
      <Dialog open={!!detailsOpen} onClose={() => setDetailsOpen(null)} maxWidth="lg" fullWidth>
        <DialogTitle>Dispute Details</DialogTitle>
        <DialogContent>
          {selectedDispute && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Basic Information</Typography>
                <Stack spacing={1}>
                  <Typography><strong>ID:</strong> {selectedDispute.id}</Typography>
                  <Typography><strong>Status:</strong>
                    <Chip
                      label={selectedDispute.status.replace('_', ' ')}
                      color={getStatusColor(selectedDispute.status) as any}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                  <Typography><strong>Reason:</strong> {selectedDispute.reason || 'N/A'}</Typography>
                  <Typography><strong>Amount:</strong> {formatCurrency(selectedDispute.amount, selectedDispute.currency)}</Typography>
                  <Typography><strong>Created:</strong> {new Date(selectedDispute.created * 1000).toLocaleString()}</Typography>
                  {selectedDispute.evidence_details?.due_by && (
                    <Typography><strong>Evidence Due:</strong> {new Date(selectedDispute.evidence_details.due_by * 1000).toLocaleString()}</Typography>
                  )}
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Evidence Submitted</Typography>
                {selectedDispute.evidence ? (
                  <Stack spacing={1}>
                    {Object.entries(selectedDispute.evidence).map(([key, value]) =>
                      value ? (
                        <Typography key={key}>
                          <strong>{key.replace('_', ' ')}:</strong> {String(value)}
                        </Typography>
                      ) : null
                    ).filter(Boolean)}
                  </Stack>
                ) : (
                  <Typography color="textSecondary">No evidence submitted</Typography>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={!!noteDialogOpen} onClose={() => setNoteDialogOpen(null)} maxWidth="sm" fullWidth>
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
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialogOpen(null)}>Cancel</Button>
          <Button variant="contained" onClick={addNote}>Add Note</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}