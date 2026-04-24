import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@vibe-router/shared-utils';
import { ApiResponse } from '@vibe-router/shared-types';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    tenantId: string;
    role: string;
  };
}

export function authenticate(req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);
  const secret = process.env.JWT_SECRET || '';

  try {
    const payload = verifyToken(token, secret);
    req.user = {
      id: payload.sub as string,
      email: payload.email as string,
      tenantId: payload.tenantId as string,
      role: payload.role as string,
    };
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
