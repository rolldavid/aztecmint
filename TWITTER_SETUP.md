# Twitter Authentication Setup Guide

## Prerequisites

1. **Twitter Developer Account**: You need a Twitter Developer account to get API credentials
2. **Next.js App**: Your app should be running on a domain (localhost for development)

## Step 1: Create Twitter App

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Sign in with your Twitter account
3. Create a new app or use an existing one
4. Navigate to "App Settings" > "Authentication"

## Step 2: Configure OAuth 2.0

1. **Enable OAuth 2.0**: Turn on OAuth 2.0 in your app settings
2. **App Type**: Select "Web App"
3. **Callback URLs**: Add your callback URL:
   - Development: `http://localhost:3000/api/twitter/callback`
   - Production: `https://yourdomain.com/api/twitter/callback`
4. **Website URL**: Add your app's URL
5. **Client Type**: Select "Confidential"

## Step 3: Get API Credentials

1. Go to "Keys and Tokens" tab
2. Copy your **Client ID** and **Client Secret**
3. Keep these secure - never commit them to version control

## Step 4: Environment Variables

Create a `.env.local` file in your project root:

```env
# Twitter API Configuration
TWITTER_CLIENT_ID=your_twitter_client_id_here
TWITTER_CLIENT_SECRET=your_twitter_client_secret_here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000

# Other existing variables...
PINATA_API_KEY=your_pinata_api_key_here
PINATA_SECRET_KEY=your_pinata_secret_key_here
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_infura_project_id
```

## Step 5: Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to your app
3. Click "Connect with Twitter"
4. You should be redirected to Twitter for authorization
5. After authorizing, you'll be redirected back with your profile data

## Troubleshooting

### Common Issues

1. **"Twitter credentials not configured"**
   - Check that your environment variables are set correctly
   - Restart your development server after adding environment variables

2. **"Invalid callback URL"**
   - Ensure your callback URL exactly matches what's configured in Twitter Developer Portal
   - Check for trailing slashes or protocol mismatches

3. **"Invalid state parameter"**
   - This usually indicates a session/cookie issue
   - Clear browser cookies and try again

4. **CORS Errors**
   - Ensure your app is running on the correct domain
   - Check that your callback URL is properly configured

### Development vs Production

- **Development**: Use `http://localhost:3000` as your base URL
- **Production**: Use your actual domain with HTTPS
- **Callback URLs**: Must match exactly between Twitter Developer Portal and your app

## Security Notes

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **HTTPS required** for production OAuth flows
4. **Validate state parameter** to prevent CSRF attacks
5. **Store tokens securely** (consider server-side sessions)

## API Scopes

The current implementation requests these scopes:
- `tweet.read` - Read user's tweets
- `users.read` - Read user profile information

You can modify these in `src/app/api/twitter/auth/route.ts` if needed.

## Next Steps

Once Twitter authentication is working:

1. **Persist user data** - Store Twitter profile data in a database
2. **Add social features** - Allow users to share NFTs on Twitter
3. **Profile verification** - Add Twitter verification badges
4. **Enhanced metadata** - Include Twitter data in NFT metadata 