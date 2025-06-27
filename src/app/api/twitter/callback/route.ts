import { NextRequest } from "next/server";
import { TwitterApi } from "twitter-api-v2";

export const runtime = "nodejs";

// Twitter OAuth 2.0 configuration
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID!;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET!;
const REDIRECT_URI = process.env.NEXTAUTH_URL + "/api/twitter/callback";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return new Response(JSON.stringify({ error: "Twitter authorization denied" }), { status: 400 });
    }

    if (!code || !state) {
      return new Response(JSON.stringify({ error: "Missing authorization code or state" }), { status: 400 });
    }

    // Verify state and get code verifier from cookies
    const cookies = request.headers.get("cookie");
    const stateCookie = cookies?.split(";").find(c => c.trim().startsWith("twitter_oauth_state="));
    const codeVerifierCookie = cookies?.split(";").find(c => c.trim().startsWith("twitter_code_verifier="));
    
    const storedState = stateCookie?.split("=")[1];
    const codeVerifier = codeVerifierCookie?.split("=")[1];

    if (state !== storedState) {
      return new Response(JSON.stringify({ error: "Invalid state parameter" }), { status: 400 });
    }

    if (!codeVerifier) {
      return new Response(JSON.stringify({ error: "Missing code verifier" }), { status: 400 });
    }

    // Create Twitter client
    const client = new TwitterApi({
      clientId: TWITTER_CLIENT_ID,
      clientSecret: TWITTER_CLIENT_SECRET,
    });

    // Exchange code for access token using PKCE
    const { accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: REDIRECT_URI,
    });

    // Create authenticated client
    const authenticatedClient = new TwitterApi(accessToken);

    // Get user data
    const user = await authenticatedClient.v2.me({
      "user.fields": ["username", "description", "profile_image_url", "name"],
    });

    if (!user.data) {
      return new Response(JSON.stringify({ error: "Failed to fetch user data" }), { status: 500 });
    }

    const userData = {
      id: user.data.id,
      username: user.data.username,
      name: user.data.name,
      bio: user.data.description,
      profileImage: user.data.profile_image_url,
      accessToken,
      refreshToken,
      expiresIn,
    };

    // Store user data in session/cookie (you might want to use a proper session management solution)
    const response = new Response(JSON.stringify({ 
      success: true, 
      user: userData 
    }), { status: 200 });
    
    // Clear the OAuth cookies
    response.headers.set("Set-Cookie", [
      "twitter_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
      "twitter_code_verifier=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
    ].join(', '));
    
    return response;
  } catch (error) {
    console.error("Twitter callback error:", error);
    return new Response(JSON.stringify({ error: "Failed to complete Twitter authentication" }), { status: 500 });
  }
} 