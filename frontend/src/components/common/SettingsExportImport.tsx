import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  TextField,
} from '@mui/material';
import { Download, Upload, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export const SettingsExportImport: React.FC = () => {
  const [importData, setImportData] = useState('');

  const handleExport = () => {
    try {
      // Get settings from localStorage or context
      const settings = {
        theme: localStorage.getItem('talkcart-theme') || 'light',
        language: localStorage.getItem('talkcart-language') || 'en',
        privacy: JSON.parse(localStorage.getItem('talkcart-privacy-settings') || '{}'),
        interaction: JSON.parse(localStorage.getItem('talkcart-interaction-settings') || '{}'),
        exportDate: new Date().toISOString(),
      };

      const dataStr = JSON.stringify(settings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `talkcart-settings-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success('Settings exported successfully');
    } catch (error) {
      toast.error('Failed to export settings');
    }
  };

  const handleImport = () => {
    try {
      const settings = JSON.parse(importData);
      
      // Validate the settings structure
      if (typeof settings !== 'object') {
        throw new Error('Invalid settings format');
      }

      // Import settings to localStorage
      if (settings.theme) {
        localStorage.setItem('talkcart-theme', settings.theme);
      }
      if (settings.language) {
        localStorage.setItem('talkcart-language', settings.language);
      }
      if (settings.privacy) {
        localStorage.setItem('talkcart-privacy-settings', JSON.stringify(settings.privacy));
      }
      if (settings.interaction) {
        localStorage.setItem('talkcart-interaction-settings', JSON.stringify(settings.interaction));
      }

      toast.success('Settings imported successfully. Please refresh the page.');
      setImportData('');
    } catch (error) {
      toast.error('Failed to import settings. Please check the format.');
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Settings Export & Import
        </Typography>
        
        <Box display="flex" flexDirection="column" gap={3}>
          {/* Export Section */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Export Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Download your current settings as a JSON file for backup or transfer.
            </Typography>
            <Button
              variant="contained"
              startIcon={<Download size={16} />}
              onClick={handleExport}
            >
              Export Settings
            </Button>
          </Box>

          {/* Import Section */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Import Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Paste your exported settings JSON data below to restore your preferences.
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={6}
              placeholder="Paste your exported settings JSON here..."
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              variant="outlined"
              startIcon={<Upload size={16} />}
              onClick={handleImport}
              disabled={!importData.trim()}
            >
              Import Settings
            </Button>
          </Box>

          <Alert severity="warning">
            <Typography variant="body2">
              <strong>Note:</strong> Importing settings will overwrite your current preferences. 
              Make sure to export your current settings first if you want to keep them.
            </Typography>
          </Alert>
        </Box>
      </CardContent>
    </Card>
  );
};