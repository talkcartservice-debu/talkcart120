import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Stack,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Card,
  CardContent,
  Grid,
  CardMedia,
  Chip,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Pagination,
  Alert,
  CircularProgress,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Image as ImageIcon,
  Storage as StorageIcon,
  Dashboard as DashboardIcon,
  List as ListIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  MoreVert as MoreVertIcon,
  VideoLibrary as VideoIcon,
  AudioFile as AudioIcon,
  InsertDriveFile as FileIcon,
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useAdminGuard } from '@/services/useAdminGuard';
import { AdminApi } from '@/services/api';
import { AdminExtraApi } from '@/services/adminExtra';
import MediaDashboard from '../components/MediaDashboard';

interface MediaFile {
  productId: string;
  productName: string;
  vendorId: string;
  file: {
    _id: string;
    public_id: string;
    secure_url: string;
    url: string;
    format?: string;
    resource_type?: string;
    bytes?: number;
    width?: number;
    height?: number;
    duration?: number;
    original_filename?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`media-tabpanel-${index}`}
      aria-labelledby={`media-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function MediaAdmin() {
  const guard = useAdminGuard();

  // Tab management
  const [currentTab, setCurrentTab] = useState(0);

  // Media files state
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters and search
  const [search, setSearch] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [format, setFormat] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [timeRange, setTimeRange] = useState('30d');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });

  // Selection and actions
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await AdminExtraApi.getMediaFiles({
        page,
        limit,
        search: search || undefined,
        resourceType: resourceType || undefined,
        format: format || undefined,
        sortBy,
        sortOrder
      });
      if (res?.success) {
        setFiles(res.data?.files || []);
        setPagination(res.data?.pagination || { total: 0, pages: 0 });
      } else {
        setError(res?.message || 'Failed to fetch media files');
      }
    } catch (error) {
      console.error('Failed to fetch media files:', error);
      setError('Failed to fetch media files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentTab === 1) { // Only fetch when on Files tab
      fetchFiles();
    }
  }, [currentTab, page, limit, search, resourceType, format, sortBy, sortOrder]);

  // Guard checks after all hooks are defined
  if (guard.loading) return <div style={{ padding: 20 }}>Checking access…</div>;
  if (!guard.allowed) return <div style={{ padding: 20, color: 'crimson' }}>{guard.error || 'Access denied'}</div>;

  const handleDeleteFile = async () => {
    if (!selectedFile) return;

    try {
      const res = await AdminExtraApi.deleteMediaFile(selectedFile.productId, selectedFile.file._id);
      if (res?.success) {
        setDeleteDialogOpen(false);
        setSelectedFile(null);
        fetchFiles(); // Refresh the list
      } else {
        setError(res?.message || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      setError('Failed to delete file');
    }
  };

  const openDeleteDialog = (file: MediaFile) => {
    setSelectedFile(file);
    setDeleteDialogOpen(true);
  };

  const openViewDialog = (file: MediaFile) => {
    setSelectedFile(file);
    setViewDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return;

    try {
      const filesToDelete = Array.from(selectedFiles).map(fileKey => {
        const [productId, fileId] = fileKey.split('|');
        return { productId, imageId: fileId };
      });

      const res = await AdminExtraApi.bulkDeleteMedia(filesToDelete);
      if (res?.success) {
        setBulkDeleteDialogOpen(false);
        setSelectedFiles(new Set());
        fetchFiles();
      } else {
        setError(res?.message || 'Failed to delete files');
      }
    } catch (error) {
      console.error('Failed to bulk delete files:', error);
      setError('Failed to delete files');
    }
  };

  const handleSelectFile = (file: MediaFile) => {
    const fileKey = `${file.productId}|${file.file._id}`;
    const newSelected = new Set(selectedFiles);

    if (newSelected.has(fileKey)) {
      newSelected.delete(fileKey);
    } else {
      newSelected.add(fileKey);
    }

    setSelectedFiles(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      const allFileKeys = files.map(file => `${file.productId}|${file.file._id}`);
      setSelectedFiles(new Set(allFileKeys));
    }
  };

  const formatFileSizeBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (resourceType: string, format: string) => {
    if (resourceType === 'image') return <ImageIcon />;
    if (resourceType === 'video') return <VideoIcon />;
    if (resourceType === 'audio') return <AudioIcon />;
    return <FileIcon />;
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const clearFilters = () => {
    setSearch('');
    setResourceType('');
    setFormat('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Media Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab
            icon={<DashboardIcon />}
            label="Dashboard"
            id="media-tab-0"
            aria-controls="media-tabpanel-0"
          />
          <Tab
            icon={<ListIcon />}
            label="Media Files"
            id="media-tab-1"
            aria-controls="media-tabpanel-1"
          />
        </Tabs>
      </Paper>

      {/* Dashboard Tab */}
      <TabPanel value={currentTab} index={0}>
        <MediaDashboard timeRange={timeRange} />

        <Box sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="7d">Last 7 days</MenuItem>
              <MenuItem value="30d">Last 30 days</MenuItem>
              <MenuItem value="90d">Last 90 days</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </TabPanel>

      {/* Media Files Tab */}
      <TabPanel value={currentTab} index={1}>
        {/* Filters and Controls */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack spacing={3}>
            {/* Search and Basic Filters */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <TextField
                label="Search files, products, or IDs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ minWidth: 300 }}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={resourceType}
                  label="Type"
                  onChange={(e) => setResourceType(e.target.value)}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="image">Images</MenuItem>
                  <MenuItem value="video">Videos</MenuItem>
                  <MenuItem value="audio">Audio</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Format</InputLabel>
                <Select
                  value={format}
                  label="Format"
                  onChange={(e) => setFormat(e.target.value)}
                >
                  <MenuItem value="">All Formats</MenuItem>
                  <MenuItem value="jpg">JPG</MenuItem>
                  <MenuItem value="png">PNG</MenuItem>
                  <MenuItem value="gif">GIF</MenuItem>
                  <MenuItem value="webp">WebP</MenuItem>
                  <MenuItem value="mp4">MP4</MenuItem>
                  <MenuItem value="webm">WebM</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  label="Sort By"
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <MenuItem value="createdAt">Date</MenuItem>
                  <MenuItem value="name">Name</MenuItem>
                  <MenuItem value="size">Size</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Order</InputLabel>
                <Select
                  value={sortOrder}
                  label="Order"
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <MenuItem value="desc">Desc</MenuItem>
                  <MenuItem value="asc">Asc</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
              >
                Clear
              </Button>
            </Stack>

            {/* Action Buttons */}
            <Stack direction="row" spacing={2} alignItems="center">
              {selectedFiles.size > 0 && (
                <>
                  <Typography variant="body2" color="text.secondary">
                    {selectedFiles.size} file(s) selected
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setBulkDeleteDialogOpen(true)}
                  >
                    Delete Selected
                  </Button>
                </>
              )}
            </Stack>
          </Stack>
        </Paper>

        {/* Media Files Table */}
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedFiles.size === files.length && files.length > 0}
                    indeterminate={selectedFiles.size > 0 && selectedFiles.size < files.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Preview</TableCell>
                <TableCell>File Info</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Upload Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : files.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No media files found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                files.map((fileData) => {
                  const fileKey = `${fileData.productId}|${fileData.file._id}`;
                  const isSelected = selectedFiles.has(fileKey);

                  return (
                    <TableRow key={fileKey} selected={isSelected}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSelectFile(fileData)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            width: 60,
                            height: 60,
                            borderRadius: 1,
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'grey.100',
                            cursor: 'pointer'
                          }}
                          onClick={() => openViewDialog(fileData)}
                        >
                          {fileData.file.resource_type === 'image' ? (
                            <Box
                              component="img"
                              src={fileData.file.secure_url}
                              alt="File preview"
                              sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                            />
                          ) : (
                            getFileIcon(fileData.file.resource_type || 'raw', fileData.file.format || '')
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="body2" fontWeight="medium">
                            {fileData.file.original_filename || fileData.file.public_id}
                          </Typography>
                          <Stack direction="row" spacing={1}>
                            <Chip
                              label={fileData.file.format?.toUpperCase() || 'Unknown'}
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              label={fileData.file.resource_type || 'file'}
                              size="small"
                              color="primary"
                            />
                          </Stack>
                          {fileData.file.width && fileData.file.height && (
                            <Typography variant="caption" color="text.secondary">
                              {fileData.file.width} × {fileData.file.height}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {fileData.productName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {fileData.productId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {fileData.file.bytes ? formatFileSizeBytes(fileData.file.bytes) : 'Unknown'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(fileData.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => openViewDialog(fileData)}>
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete File">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => openDeleteDialog(fileData)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Paper>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={pagination.pages}
              page={page}
              onChange={(event, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}
      </TabPanel>

      {/* View File Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>File Details</DialogTitle>
        <DialogContent>
          {selectedFile && (
            <Box>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                {selectedFile.file.resource_type === 'image' ? (
                  <img
                    src={selectedFile.file.secure_url}
                    alt="File preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '400px',
                      objectFit: 'contain'
                    }}
                  />
                ) : selectedFile.file.resource_type === 'video' ? (
                  <video
                    controls
                    style={{
                      maxWidth: '100%',
                      maxHeight: '400px'
                    }}
                  >
                    <source src={selectedFile.file.secure_url} type="video/mp4" />
                  </video>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 200,
                      backgroundColor: 'grey.100',
                      borderRadius: 1
                    }}
                  >
                    {getFileIcon(selectedFile.file.resource_type || 'raw', selectedFile.file.format || '')}
                  </Box>
                )}
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Product</Typography>
                  <Typography variant="body2">{selectedFile.productName}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>File ID</Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {selectedFile.file.public_id}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Format</Typography>
                  <Typography variant="body2">{selectedFile.file.format?.toUpperCase()}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Type</Typography>
                  <Typography variant="body2">{selectedFile.file.resource_type}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Size</Typography>
                  <Typography variant="body2">
                    {selectedFile.file.bytes ? formatFileSizeBytes(selectedFile.file.bytes) : 'Unknown'}
                  </Typography>
                </Grid>
                {selectedFile.file.width && selectedFile.file.height && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>Dimensions</Typography>
                    <Typography variant="body2">
                      {selectedFile.file.width} × {selectedFile.file.height}
                    </Typography>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>URL</Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {selectedFile.file.secure_url}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Upload Date</Typography>
                  <Typography variant="body2">{formatDate(selectedFile.createdAt)}</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete File</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this file? This action cannot be undone.
          </Typography>
          {selectedFile && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              {selectedFile.file.resource_type === 'image' ? (
                <img
                  src={selectedFile.file.secure_url}
                  alt="File preview"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '200px',
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 200,
                    height: 200,
                    backgroundColor: 'grey.100',
                    borderRadius: 1,
                    mx: 'auto'
                  }}
                >
                  {getFileIcon(selectedFile.file.resource_type || 'raw', selectedFile.file.format || '')}
                </Box>
              )}
              <Typography variant="body2" sx={{ mt: 1 }}>
                From product: {selectedFile.productName}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteFile}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onClose={() => setBulkDeleteDialogOpen(false)}>
        <DialogTitle>Delete Multiple Files</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedFiles.size} file(s)? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleBulkDelete}>
            Delete All
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
