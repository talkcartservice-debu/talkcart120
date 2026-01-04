# Google OAuth Setup Guide

This guide explains how to set up Google OAuth for the TalkCart application.

## Step 1: Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (or Google People API) for your project
4. Go to "Credentials" in the left sidebar
5. Click "Create Credentials" > "OAuth 2.0 Client IDs"
6. For application type, select "Web application"
7. Add authorized redirect URIs:
   - For local development: `http://localhost:4000/auth/login`, `http://localhost:4000/auth/register`
   - For production: `https://yourdomain.com/auth/login`, `https://yourdomain.com/auth/register`
8. Add authorized JavaScript origins:
   - For local development: `http://localhost:4000`
   - For production: `https://yourdomain.com`

## Step 2: Configure Environment Variables

### Backend Configuration

In your backend `.env` file, add:

```env
GOOGLE_CLIENT_ID=your-google-client-id-from-google-cloud-console
```

### Frontend Configuration

In your frontend `.env.local` file, add:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-from-google-cloud-console
```

## Step 3: Update Your Application

Once you've set up the environment variables, the Google OAuth login should work properly. The application will:

1. Use the client ID to initialize Google Identity Services
2. Verify the ID token with Google's tokeninfo endpoint
3. Match the audience of the token with your client ID for security
4. Create or update user accounts based on the Google authentication

## Common Issues and Troubleshooting

1. **"Access blocked: Authorization Error"**: This usually means the client ID is not properly configured or the domain is not authorized in the Google Cloud Console.

2. **"Invalid Google token (aud mismatch)"**: This error occurs when the audience of the ID token doesn't match the expected client ID. Make sure the `GOOGLE_CLIENT_ID` environment variable matches exactly what's in your Google Cloud Console.

3. **Script loading errors**: Make sure your domain is properly added as an authorized JavaScript origin in the Google Cloud Console.

## Security Notes

- Keep your client ID secure and do not expose it unnecessarily
- The application verifies the audience of the ID token to prevent token misuse
- All Google OAuth requests are validated server-side for security