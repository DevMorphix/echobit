// Google ID-token verification against Google's JWKS — replaces
// google-auth-library. The audience MUST stay the client ID baked into the
// published mobile app.

import { createRemoteJWKSet, jwtVerify } from 'jose';

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export interface GoogleProfile {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

export const verifyGoogleIdToken = async (
  idToken: string,
  clientId: string,
): Promise<GoogleProfile | null> => {
  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
    });
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') return null;
    return {
      sub: payload.sub,
      email: payload.email,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      picture: typeof payload.picture === 'string' ? payload.picture : undefined,
      email_verified: payload.email_verified === true,
    };
  } catch {
    return null;
  }
};
