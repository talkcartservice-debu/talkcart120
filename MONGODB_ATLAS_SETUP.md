# MongoDB Atlas Setup Guide for TalkCart Deployment

## 🚀 Quick Setup Instructions

### Step 1: Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Sign up for a free account
3. Create a new project (or use the default one)

### Step 2: Create a Cluster
1. Click "Build a Database"
2. Select the **FREE** tier (M0 Sandbox)
3. Choose a cloud provider and region closest to your users
4. Click "Create Cluster"

### Step 3: Configure Database Access
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication method
4. Create a username and strong password
5. Set permissions to "Read and write to any database"
6. Click "Add User"

### Step 4: Configure Network Access
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. **For Render deployment**: Click "Allow Access from Anywhere" (0.0.0.0/0)
4. **For development**: Add your current IP address
5. Click "Confirm"

### Step 5: Get Connection String
1. Go back to "Clusters"
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select Node.js driver version 4.0 or later
5. Copy the connection string

### Step 6: Update Your Connection String
Replace the placeholder values in your connection string:
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/talkcart?retryWrites=true&w=majority
```

With your actual:
- `<username>` - the database user you created
- `<password>` - the password for that user
- `talkcart` - your database name (you can change this)

## 🔧 Render Deployment Configuration

### Environment Variables Setup
In your Render dashboard:
1. Go to your service settings
2. Navigate to "Environment Variables"
3. Add the following variables:

```
MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/talkcart?retryWrites=true&w=majority
NODE_ENV=production
PORT=8000
```

### Important Notes:
- **Escape special characters** in your password (like @, :, /) with % encoding
- **Use the full connection string** including `mongodb+srv://`
- **Test locally first** by setting the MONGODB_URI in your local .env file

## 🧪 Testing Your Connection

### Local Testing:
1. Update your local `.env` file with the Atlas connection string
2. Run your backend locally: `npm run dev`
3. Check that you see "MongoDB Connected" in the console

### Production Testing:
1. Deploy to Render
2. Check the logs for "MongoDB Connected" message
3. Test API endpoints that require database access

## ⚠️ Common Issues and Solutions

### Issue 1: "MongoParseError"
**Cause**: Invalid connection string format
**Solution**: Ensure you're using the `mongodb+srv://` format, not `mongodb://`

### Issue 2: "Authentication failed"
**Cause**: Wrong username/password
**Solution**: Double-check credentials and escape special characters

### Issue 3: "Connection timeout"
**Cause**: IP whitelist restrictions
**Solution**: Ensure 0.0.0.0/0 is in your IP whitelist for Render deployments

### Issue 4: "DNS resolution failed"
**Cause**: Network connectivity issues
**Solution**: Wait a few minutes and try again, or check your cluster status

## 🔒 Security Best Practices

1. **Use strong passwords** for database users
2. **Limit IP access** in production when possible
3. **Regular backups** - Atlas provides automated backups
4. **Monitor connections** through Atlas dashboard
5. **Rotate credentials** periodically

## 💡 Pro Tips

- **Free tier limitations**: 512MB storage, shared RAM
- **Upgrade when needed**: Monitor usage in Atlas dashboard
- **Connection pooling**: The backend is already configured for optimal connections
- **Monitoring**: Use Atlas monitoring to track performance

## 🆘 Need Help?

If you encounter issues:
1. Check the Render logs for detailed error messages
2. Verify your connection string format
3. Ensure your IP is whitelisted
4. Test the connection string locally first
5. Check MongoDB Atlas cluster status