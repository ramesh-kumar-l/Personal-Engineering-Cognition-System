import type { Request, Response, NextFunction } from 'express';

export function authMiddleware(expectedToken: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ') || auth.slice(7) !== expectedToken) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  };
}
