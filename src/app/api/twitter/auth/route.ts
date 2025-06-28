import { TwitterApi } from "twitter-api-v2";
import crypto from "crypto";

export const runtime = "nodejs";

// Twitter OAuth 2.0 configuration
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID!;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET!;
const REDIRECT_URI = process.env.NEXTAUTH_URL + "/api/twitter/callback";

// Generate PKCE code verifier and challenge
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

export async function GET() {
  try {
    if (!TWITTER_CLIENT_ID || !TWITTER_CLIENT_SECRET) {
      return new Response(JSON.stringify({ error: "Twitter credentials not configured" }), { status: 500 });
    }

    // Create Twitter client
    const client = new TwitterApi({
      clientId: TWITTER_CLIENT_ID,
      clientSecret: TWITTER_CLIENT_SECRET,
    });

    // Generate PKCE values
    const { codeVerifier, codeChallenge } = generatePKCE();

    // Generate OAuth 2.0 authorization URL
    const authUrl = await client.generateOAuth2AuthLink(REDIRECT_URI, {
      scope: ["tweet.read", "users.read"],
    });

    // Add PKCE parameters to the URL
    const url = new URL(authUrl.url);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');

    // Store state and code verifier in cookies for verification
    const response = new Response(JSON.stringify({ 
      authUrl: { 
        url: url.toString(), 
        state: authUrl.state 
      } 
    }), { status: 200 });
    
    response.headers.set("Set-Cookie", [
      `twitter_oauth_state=${authUrl.state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
      `twitter_code_verifier=${codeVerifier}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
    ].join(', '));
    
    return response;
  } catch (error) {
    console.error("Twitter auth error:", error);
    return new Response(JSON.stringify({ error: "Failed to initialize Twitter auth" }), { status: 500 });
  }
} 