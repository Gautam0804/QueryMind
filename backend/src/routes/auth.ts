
import { Router, type Request, type Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { authPool } from '../config/db';

const router = Router();

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const callbackUrl = process.env.GOOGLE_CALLBACK_URL;
const jwtSecret = process.env.AUTH_JWT_SECRET;
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

if (!clientId || !clientSecret || !callbackUrl || !jwtSecret) {
  throw new Error('Google authentication environment variables are missing.');
}

if (jwtSecret.length < 32) {
  throw new Error('AUTH_JWT_SECRET must contain at least 32 characters.');
}

const google = new OAuth2Client(clientId, clientSecret, callbackUrl);

const isProduction = process.env.NODE_ENV === 'production';
const sessionCookie = 'querymind_session';
const stateCookie = 'querymind_oauth_state';
const sessionMaxAge = 7 * 24 * 60 * 60 * 1000;

const sessionCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
};

function createSessionToken(userId: string) {
  return jwt.sign(
    { sub: userId },
    jwtSecret!,
    {
      expiresIn: '7d',
      issuer: 'querymind-api',
      audience: 'querymind-web',
      algorithm: 'HS256',
    },
  );
}

router.get('/google', (_req: Request, res: Response) => {
  const state = randomBytes(32).toString('hex');

  res.cookie(stateCookie, state, {
    ...sessionCookieOptions,
    maxAge: 10 * 60 * 1000,
  });

  const url = google.generateAuthUrl({
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
  });

  return res.redirect(url);
});

router.get('/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code;
  const returnedState = req.query.state;
  const savedState = req.cookies?.[stateCookie];

  res.clearCookie(stateCookie, sessionCookieOptions);

  if (
    typeof code !== 'string' ||
    typeof returnedState !== 'string' ||
    typeof savedState !== 'string'
  ) {
    return res.status(400).send('Invalid Google authentication response.');
  }

  const expected = Buffer.from(savedState);
  const received = Buffer.from(returnedState);

  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return res.status(400).send('Invalid OAuth state.');
  }

  try {
    const { tokens } = await google.getToken(code);

    if (!tokens.id_token) {
      return res.status(401).send('Google did not return an identity token.');
    }

    const ticket = await google.verifyIdToken({
      idToken: tokens.id_token,
      audience: clientId,
    });

    const profile = ticket.getPayload();

    if (
      !profile?.sub ||
      !profile.email ||
      !profile.email_verified ||
      !profile.name
    ) {
      return res.status(401).send('A verified Google account is required.');
    }

    const result = await authPool.query<{ id: string }>(
      `INSERT INTO public.users
         (google_sub, email, name, picture)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (google_sub)
       DO UPDATE SET
         email = EXCLUDED.email,
         name = EXCLUDED.name,
         picture = EXCLUDED.picture,
         updated_at = NOW()
       RETURNING id::text AS id`,
      [
        profile.sub,
        profile.email,
        profile.name,
        profile.picture ?? null,
      ],
    );

    const userId = result.rows[0]?.id;

    if (!userId) {
      throw new Error('User creation failed.');
    }

    const token = createSessionToken(userId);

    res.cookie(sessionCookie, token, {
      ...sessionCookieOptions,
      maxAge: sessionMaxAge,
    });

    return res.redirect(frontendUrl);
  } catch (error) {
    console.error(
      '[QueryMind Auth] Google sign-in failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    return res.redirect(
      `${frontendUrl}/?auth_error=google_signin_failed`,
    );
  }
});

router.get('/me', async (req: Request, res: Response) => {
  const token = req.cookies?.[sessionCookie];

  if (typeof token !== 'string') {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret!, {
      issuer: 'querymind-api',
      audience: 'querymind-web',
      algorithms: ['HS256'],
    });

    if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
      return res.status(401).json({ error: 'Invalid session.' });
    }

    const result = await authPool.query(
      `SELECT id::text AS id, email, name, picture
       FROM public.users
       WHERE id = $1`,
      [decoded.sub],
    );

    if (!result.rows[0]) {
      res.clearCookie(sessionCookie, sessionCookieOptions);
      return res.status(401).json({ error: 'User not found.' });
    }

    return res.json({ user: result.rows[0] });
  } catch {
    res.clearCookie(sessionCookie, sessionCookieOptions);
    return res.status(401).json({ error: 'Session expired or invalid.' });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(sessionCookie, sessionCookieOptions);
  return res.json({ success: true });
});

export default router;
