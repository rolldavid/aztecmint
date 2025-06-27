# Twitter Integration for AztecMint

This document explains the Twitter integration features in the AztecMint application.

## Current Implementation

The app currently includes a simplified Twitter integration that allows users to:

1. **Enter their Twitter username** - Users can manually enter their Twitter handle
2. **Display profile information** - Shows username, name, bio, and profile image
3. **Mock profile generation** - Creates demo profile data for testing

## Features

### Twitter Connect Component
- Located in `src/components/TwitterConnect.tsx`
- Allows users to enter their Twitter username
- Generates mock profile data for demonstration
- Uses DiceBear API for avatar generation

### Twitter Profile Component
- Located in `src/components/TwitterProfile.tsx`
- Displays connected user's profile information
- Shows username, name, bio, and profile image
- Includes disconnect functionality

### Integration in Main App
- Twitter section appears between wallet connection and NFT minting
- Profile information is displayed when connected
- Clean disconnect functionality

## Production Setup

For production use with real Twitter API integration, you'll need to:

### 1. Twitter Developer Account
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app
3. Enable OAuth 2.0
4. Set up callback URLs

### 2. Environment Variables
Add these to your `.env.local`:

```env
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
NEXTAUTH_URL=http://localhost:3000
```

### 3. API Routes (Ready for Production)
The following API routes are already set up for OAuth 2.0:

- `src/app/api/twitter/auth/route.ts` - Initiates OAuth flow
- `src/app/api/twitter/callback/route.ts` - Handles OAuth callback

### 4. Required Scopes
The OAuth implementation requests these scopes:
- `tweet.read` - Read user's tweets
- `users.read` - Read user profile information

## Usage

### For Users
1. Click "Connect Your Twitter" section
2. Enter your Twitter username
3. View your profile information
4. Disconnect when done

### For Developers
1. The Twitter integration is modular and can be easily extended
2. Mock data generation can be replaced with real API calls
3. Profile data is stored in component state (consider persistence for production)

## Future Enhancements

### Real Twitter API Integration
To replace the mock implementation:

1. **Update TwitterConnect component**:
```typescript
// Replace mock data generation with real API call
const response = await fetch('/api/twitter/auth');
const { authUrl } = await response.json();
window.location.href = authUrl;
```

2. **Handle OAuth callback**:
```typescript
// In the main page component
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  
  if (code && state) {
    // Exchange code for user data
    fetch('/api/twitter/callback?code=' + code + '&state=' + state)
      .then(res => res.json())
      .then(data => setTwitterUser(data.user));
  }
}, []);
```

### Additional Features
- Tweet sharing when minting NFTs
- Twitter profile verification badges
- Social features like following other users
- Integration with NFT metadata

## Security Considerations

1. **OAuth State Verification** - Always verify the state parameter
2. **HTTPS Required** - Twitter OAuth requires HTTPS in production
3. **Token Storage** - Store tokens securely (consider server-side sessions)
4. **Rate Limiting** - Implement proper rate limiting for API calls

## Troubleshooting

### Common Issues
1. **CORS Errors** - Ensure callback URLs are properly configured
2. **Invalid State** - Check state parameter handling
3. **Token Expiration** - Implement token refresh logic
4. **API Limits** - Monitor Twitter API rate limits

### Development vs Production
- Development: Uses mock data for easy testing
- Production: Requires real Twitter API credentials and OAuth flow

## Dependencies

- `twitter-api-v2` - Twitter API client library
- Next.js API routes for OAuth handling
- React state management for user data

## Support

For issues with Twitter integration:
1. Check Twitter Developer Portal for API status
2. Verify environment variables are set correctly
3. Ensure callback URLs match your deployment
4. Review OAuth flow implementation 