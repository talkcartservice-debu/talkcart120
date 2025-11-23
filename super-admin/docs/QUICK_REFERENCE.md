# Quick Reference Guide - TalkCart Marketplace Super Admin

**Fast reference for common tasks and features**

---

## 🚀 Quick Start

### Start Development Server
```bash
cd super-admin
npm install
npm run dev
```

### Access Dashboards
- **Admin Dashboard:** `http://localhost:3000/marketplace`
- **Vendor Dashboard:** `http://localhost:3000/vendor-marketplace` (create this route)

---

## 📥 CSV Export

### How to Use
1. Navigate to any dashboard (Flash Sales, Coupons, Group Buys, Bundles)
2. Click "Export CSV" button in header
3. File downloads automatically with date stamp

### Available Exports
- ✅ Flash Sales: `flash-sales-YYYY-MM-DD.csv`
- ✅ Coupons: `coupons-YYYY-MM-DD.csv`
- ✅ Group Buys: `group-buys-YYYY-MM-DD.csv`
- ✅ Bundle Deals: `bundle-deals-YYYY-MM-DD.csv`

### Add Export to New Dashboard
```typescript
const handleExportCSV = () => {
  const headers = ['Column1', 'Column2', 'Column3'];
  const rows = data.map(item => [item.field1, item.field2, item.field3]);
  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `filename-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};
```

---

## 📊 Analytics

### Basic Analytics
```typescript
import MarketplaceAnalytics from '../components/MarketplaceAnalytics';

<MarketplaceAnalytics />
```

### Advanced Analytics
```typescript
import AdvancedAnalytics from '../components/AdvancedAnalytics';

<AdvancedAnalytics />
```

### Features
- Revenue trends (6 months)
- Top performers
- Conversion funnel
- Category performance
- Customer segments

---

## 🎨 Theme & Styling

### Import Theme
```typescript
import {
  brandColors,
  gradients,
  shadows,
  spacing,
  borderRadius,
  typography,
  darkModeTheme,
} from '../styles/marketplaceTheme';
```

### Use Brand Colors
```typescript
<Box sx={{ backgroundColor: brandColors.primary.main }}>
  Primary Color
</Box>
```

### Use Gradients
```typescript
<Card sx={{ background: gradients.primary }}>
  Gradient Card
</Card>
```

### Use Shadows
```typescript
<Paper sx={{ boxShadow: shadows.lg }}>
  Large Shadow
</Paper>
```

### Use Spacing
```typescript
<Box sx={{ padding: spacing.lg, margin: spacing.md }}>
  Spaced Content
</Box>
```

### Use Border Radius
```typescript
<Card sx={{ borderRadius: borderRadius.lg }}>
  Rounded Card
</Card>
```

### Dark Mode
```typescript
import { ThemeProvider } from '@mui/material/styles';
import { darkModeTheme } from '../styles/marketplaceTheme';

<ThemeProvider theme={darkModeTheme}>
  <YourComponent />
</ThemeProvider>
```

---

## 🏪 Vendor Dashboard

### Create Vendor Route
```typescript
// pages/vendor-marketplace.tsx
import VendorMarketplaceDashboard from '../components/VendorMarketplaceDashboard';

export default function VendorMarketplace() {
  return <VendorMarketplaceDashboard />;
}
```

### Features
- Flash Sales management
- Coupons management
- Bundle deals
- Ratings & reviews
- Sponsored ads

### Access Control
- Vendor sees only their own data
- Limited permissions
- No access to other vendors

---

## 🎯 Common Tasks

### Add New Dashboard Tab
```typescript
// In MarketplaceDashboard.tsx
<Tab label="New Feature" icon={<YourIcon />} />

<TabPanel value={currentTab} index={X}>
  <YourNewDashboard />
</TabPanel>
```

### Create Stat Card
```typescript
<Card>
  <CardContent>
    <Box display="flex" alignItems="center" gap={2}>
      <YourIcon sx={{ fontSize: 40, color: 'primary.main' }} />
      <Box>
        <Typography color="textSecondary" variant="body2">
          Metric Name
        </Typography>
        <Typography variant="h4">{value}</Typography>
      </Box>
    </Box>
  </CardContent>
</Card>
```

### Add Progress Bar
```typescript
<LinearProgress
  variant="determinate"
  value={percentage}
  sx={{
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
    '& .MuiLinearProgress-bar': {
      background: gradients.success,
      borderRadius: 4,
    },
  }}
/>
```

### Add Status Chip
```typescript
import { getStatusColor } from '../styles/marketplaceTheme';

<Chip
  label={status}
  color={getStatusColor(status, 'flashSale')}
  size="small"
/>
```

---

## 🔧 API Integration

### Import API Service
```typescript
import {
  flashSalesAdminApi,
  couponsAdminApi,
  groupBuyAdminApi,
  bundlesAdminApi,
  loyaltyAdminApi,
  sponsoredAdminApi,
  sellerRatingsAdminApi,
  disputesAdminApi,
} from '../src/services/marketplace';
```

### Fetch Data
```typescript
const fetchData = async () => {
  try {
    setLoading(true);
    const result = await flashSalesAdminApi.getAll(page, limit);
    if (result.success) {
      setData(result.data.flashSales || []);
    } else {
      setError(result.error || 'Failed to fetch data');
    }
  } catch (err: any) {
    setError(err.message || 'Failed to fetch data');
  } finally {
    setLoading(false);
  }
};
```

### Create Item
```typescript
const handleCreate = async () => {
  try {
    const result = await flashSalesAdminApi.create(formData);
    if (result.success) {
      setSuccess('Created successfully!');
      fetchData();
    } else {
      setError(result.error || 'Failed to create');
    }
  } catch (err: any) {
    setError(err.message || 'Failed to create');
  }
};
```

### Update Item
```typescript
const handleUpdate = async (id: string) => {
  try {
    const result = await flashSalesAdminApi.update(id, formData);
    if (result.success) {
      setSuccess('Updated successfully!');
      fetchData();
    } else {
      setError(result.error || 'Failed to update');
    }
  } catch (err: any) {
    setError(err.message || 'Failed to update');
  }
};
```

### Delete Item
```typescript
const handleDelete = async (id: string) => {
  if (!confirm('Are you sure?')) return;
  try {
    const result = await flashSalesAdminApi.delete(id);
    if (result.success) {
      setSuccess('Deleted successfully!');
      fetchData();
    } else {
      setError(result.error || 'Failed to delete');
    }
  } catch (err: any) {
    setError(err.message || 'Failed to delete');
  }
};
```

---

## 🎨 Color Reference

### Brand Colors
- **Primary:** #6366f1 (Indigo)
- **Secondary:** #ec4899 (Pink)
- **Success:** #10b981 (Green)
- **Warning:** #f59e0b (Amber)
- **Error:** #ef4444 (Red)
- **Info:** #3b82f6 (Blue)

### Status Colors
- **Active:** Green (#10b981)
- **Pending:** Blue (#3b82f6)
- **Expired:** Gray (#6b7280)
- **Error:** Red (#ef4444)

---

## 📐 Spacing Reference

- **xs:** 4px
- **sm:** 8px
- **md:** 16px
- **lg:** 24px
- **xl:** 32px
- **xxl:** 48px

---

## 🔍 Troubleshooting

### Dashboard Not Loading
1. Check backend server is running
2. Verify API_BASE URL in config
3. Check browser console for errors
4. Verify authentication token

### Export Not Working
1. Check if data array has items
2. Verify CSV content generation
3. Check browser download settings
4. Test with small dataset first

### Styling Not Applied
1. Verify import path is correct
2. Check if theme file exists
3. Clear browser cache
4. Restart development server

---

## 📚 Documentation Files

- **MarketplaceDashboard-Documentation.md** - Complete feature docs
- **INTEGRATION_GUIDE.md** - Integration instructions
- **SUPER_ADMIN_ENHANCED_COMPLETE.md** - Enhanced features
- **MARKETPLACE_FEATURES_COMPLETE_SUMMARY.md** - Complete summary
- **FINAL_ENHANCEMENTS_COMPLETE.md** - Latest enhancements
- **QUICK_REFERENCE.md** - This file

---

## 🚀 Deployment Checklist

- [ ] Test all dashboards
- [ ] Test CSV exports
- [ ] Test analytics
- [ ] Test vendor dashboard
- [ ] Test dark mode
- [ ] Verify API connections
- [ ] Check error handling
- [ ] Test responsive design
- [ ] Review security
- [ ] Update documentation

---

## 📞 Support

For issues or questions:
1. Check documentation files
2. Review code examples
3. Test in development first
4. Contact development team

---

**Last Updated:** 2025-10-26  
**Version:** 2.0.0  
**Status:** Production Ready ✅

