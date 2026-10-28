
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const jwtSecret: string = process.env.AUTH_JWT_SECRET ?? '';

if (jwtSecret.length < 32) {
  throw new Error(
    'AUTH_JWT_SECRET must be configured with at least 32 characters.',
  );
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const token: unknown = req.cookies?.querymind_session;

  if (typeof token !== 'string' || token.length === 0) {
    return res.status(401).json({
      error: 'Authentication required.',
    });
  }

  try {
    const payload = jwt.verify(token, jwtSecret, {
      issuer: 'querymind-api',
      audience: 'querymind-web',
      algorithms: ['HS256'],
    });

    if (
      typeof payload === 'string' ||
      typeof payload.sub !== 'string' ||
      payload.sub.length === 0
    ) {
      return res.status(401).json({
        error: 'Invalid session.',
      });
    }

    req.userId = payload.sub;

    return next();
  } catch {
    return res.status(401).json({
      error: 'Session expired or invalid.',
    });
  }
}
