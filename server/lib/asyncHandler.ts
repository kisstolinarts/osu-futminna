import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps an async Express handler so any rejected promise is forwarded to the
 * error middleware (which returns a clean JSON 500) instead of crashing the
 * server or hanging the request.
 */
export function ah(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
