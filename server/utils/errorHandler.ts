import { Request, Response, NextFunction } from 'express';
import { ErrorCode } from '../../src/utils/errorTypes.js';

export class ApiError extends Error {
  public statusCode: number;
  public code: ErrorCode;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, code: ErrorCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      status: 'error',
      code: err.code,
      message: err.message,
    });
  }

  // Log the full error for debugging
  console.error('Unexpected Error:', err.message || err);
  if (err.stack) {
    console.error(err.stack);
  }

  // If it's a Supabase error, it might have a message
  const errorMessage = err.message || 'Internal Server Error';
  const errorCode = err.code || ErrorCode.ERR_BACK_INTERNAL;

  // Default to 500 Internal Server Error
  return res.status(500).json({
    status: 'error',
    code: errorCode,
    message: errorMessage,
  });
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
