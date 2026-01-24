# Google OAuth Setup Instructions

This document explains how to properly configure Google OAuth for the Vetora application.

## Required Configuration in Google Cloud Console

### 1. Create/Edit OAuth 2.0 Client ID
Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Credentials → OAuth 2.0 Client IDs

### 2. Configure Authorized JavaScript Origins
Add the following origins based on your environment:

**Your Current Configuration:**
- `http://localhost:4000`
- `https://vetora.vercel.app`

**Note:** Update these as needed based on your deployment setup.

### 3. Configure Authorized Redirect URIs
For your current setup, you have configured:
- `https://vetora.vercel.app/auth/login`
- `http://localhost:4000/auth/login`

These are properly set for your deployment.

### 4. Application Type
- **Application type:** Web application
- **Client ID:** `526100733591-id3kqhm1t13gtbpqii8kihmn8u5k3kh5.apps.googleusercontent.com` (or your new client ID)
- **Client Secret:** (keep this secure)

### 5. Domain Verification (if needed)
If you encounter issues, make sure your domains are verified in Google Search Console.

## Environment Variables

### Backend (.env)
```bash
# OAuth Configuration
GOOGLE_CLIENT_ID=526100733591-id3kqhm1t13gtbpqii8kihmn8u5k3kh5.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=  # Only needed for some OAuth flows
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=526100733591-id3kqhm1t13gtbpqii8kihmn8u5k3kh5.apps.googleusercontent.com
```

## Troubleshooting Common Issues

### "Access blocked: Authorization Error" / "no registered origin"
- Verify all JavaScript origins are added in Google Cloud Console
- Make sure the domains match exactly (including http/https)
- Check that the client ID is exactly the same in both backend and frontend

### "Error 401: invalid_client"
- Ensure the client ID is properly configured
- Verify the application type is set to "Web application"
- Check that the OAuth consent screen is properly configured

### Development vs Production
Remember to update your Google Cloud Console configuration when moving from development to production, adding your production domains as authorized origins.

## Testing the Configuration

1. Start your backend server
2. Start your frontend development server
3. Navigate to the login page
4. Click the Google Sign-In button
5. The Google One Tap should appear and allow sign-in

If you continue to have issues, check the browser console and server logs for more detailed error messages.