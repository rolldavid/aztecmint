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
      // Redirect back to main page with error
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const isProduction = process.env.NEXTAUTH_URL?.startsWith('https://');
      const secureFlag = isProduction ? 'Secure; ' : '';
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${baseUrl}?twitter_error=authorization_denied`,
          'Set-Cookie': [
            `twitter_oauth_state=; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=0`,
            `twitter_code_verifier=; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=0`
          ].join(', ')
        }
      });
    }

    if (!code || !state) {
      // Redirect back to main page with error
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const isProduction = process.env.NEXTAUTH_URL?.startsWith('https://');
      const secureFlag = isProduction ? 'Secure; ' : '';
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${baseUrl}?twitter_error=missing_params`,
          'Set-Cookie': [
            `twitter_oauth_state=; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=0`,
            `twitter_code_verifier=; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=0`
          ].join(', ')
        }
      });
    }

    // Verify state and get code verifier from cookies
    const cookies = request.headers.get("cookie");
    console.log("Received cookies:", cookies);
    
    const stateCookie = cookies?.split(";").find(c => c.trim().startsWith("twitter_oauth_state="));
    const codeVerifierCookie = cookies?.split(";").find(c => c.trim().startsWith("twitter_code_verifier="));
    
    const storedState = stateCookie?.split("=")[1];
    const codeVerifier = codeVerifierCookie?.split("=")[1];
    
    console.log("Received state:", state);
    console.log("Stored state:", storedState);
    console.log("Code verifier present:", !!codeVerifier);

    if (state !== storedState) {
      console.error("State mismatch:", { received: state, stored: storedState });
      // Redirect back to main page with error
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const isProduction = process.env.NEXTAUTH_URL?.startsWith('https://');
      const secureFlag = isProduction ? 'Secure; ' : '';
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${baseUrl}?twitter_error=invalid_state`,
          'Set-Cookie': [
            `twitter_oauth_state=; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=0`,
            `twitter_code_verifier=; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=0`
          ].join(', ')
        }
      });
    }

    if (!codeVerifier) {
      // Redirect back to main page with error
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const isProduction = process.env.NEXTAUTH_URL?.startsWith('https://');
      const secureFlag = isProduction ? 'Secure; ' : '';
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${baseUrl}?twitter_error=missing_verifier`,
          'Set-Cookie': [
            `twitter_oauth_state=; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=0`,
            `twitter_code_verifier=; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=0`
          ].join(', ')
        }
      });
    }

    // Create Twitter client
    const client = new TwitterApi({
      clientId: TWITTER_CLIENT_ID,
      clientSecret: TWITTER_CLIENT_SECRET,
    });

    // Exchange code for access token using PKCE
    const { accessToken } = await client.loginWithOAuth2({
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
      // Redirect back to main page with error
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const isProduction = process.env.NEXTAUTH_URL?.startsWith('https://');
      const secureFlag = isProduction ? 'Secure; ' : '';
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${baseUrl}?twitter_error=fetch_failed`,
          'Set-Cookie': [
            `twitter_oauth_state=; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=0`,
            `twitter_code_verifier=; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=0`
          ].join(', ')
        }
      });
    }

    const userData = {
      id: user.data.id,
      username: user.data.username,
      name: user.data.name,
      bio: user.data.description,
      profileImage: user.data.profile_image_url?.replace('_normal', '') || '',
    };

    // Redirect back to main page with success and user data
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const redirectUrl = new URL(baseUrl);
    redirectUrl.searchParams.set('twitter_success', 'true');
    redirectUrl.searchParams.set('twitter_user', JSON.stringify(userData));
    
    const isProduction = process.env.NEXTAUTH_URL?.startsWith('https://');
    const secureFlag = isProduction ? 'Secure; ' : '';
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl.toString(),
        'Set-Cookie': [
          `twitter_oauth_state=; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=0`,
          `twitter_code_verifier=; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=0`
        ].join(', ')
      }
    });
  } catch (error) {
    console.error("Twitter callback error:", error);
    // Redirect back to main page with error
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const isProduction = process.env.NEXTAUTH_URL?.startsWith('https://');
    const secureFlag = isProduction ? 'Secure; ' : '';
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${baseUrl}?twitter_error=authentication_failed`,
        'Set-Cookie': [
          `twitter_oauth_state=; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=0`,
          `twitter_code_verifier=; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=0`
        ].join(', ')
      }
    });
  }
} 