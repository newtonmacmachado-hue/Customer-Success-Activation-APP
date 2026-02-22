import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { ApiError } from '../utils/errorHandler.js';
import { ErrorCode } from '../../src/utils/errorTypes.js';

import { UserRole } from '../../types.js';
import { supabase as serviceRoleSupabase } from '../supabase.js';

// Extend Express Request type to include user and supabase client
declare global {
  namespace Express {
    interface Request {
      user?: any;
      supabase?: any;
    }
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required for auth middleware.');
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new ApiError('Missing Authorization header', 401, ErrorCode.ERR_BACK_AUTH);
    }

    const token = authHeader.replace('Bearer ', '');

    // Create a new Supabase client for this request
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Verify the user using the token explicitly
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      // Debug JWT
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          console.error('Debug Token:', {
            iss: payload.iss,
            exp: payload.exp,
            aud: payload.aud,
            now: Math.floor(Date.now() / 1000),
            serverUrl: supabaseUrl
          });
        }
      } catch (e) {
        console.error('Error decoding token for debug:', e);
      }

      console.error('Auth Error Details:', {
        message: error?.message,
        status: error?.status,
        tokenPrefix: token.substring(0, 10) + '...',
        supabaseUrl: supabaseUrl.substring(0, 20) + '...'
      });
      throw new ApiError('Invalid or expired token', 401, ErrorCode.ERR_BACK_AUTH);
    }

    // Attach user and a scoped client to request for downstream routes
    // We recreate the client with the header so RLS works for subsequent queries
    req.user = user;
    req.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    next();
  } catch (error: any) {
    console.error('requireAuth unexpected error:', error.message || error);
    next(error);
  }
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, ErrorCode.ERR_BACK_AUTH);
    }

    // Fetch user profile to check role using service role client
    const { data: profile, error } = await serviceRoleSupabase
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();

    if (error || !profile) {
        console.error(`[Auth] Profile not found for user ID: ${req.user.id}. Supabase error:`, error);
        // Return a clear error instead of creating a profile
        throw new ApiError('Access denied. User profile not found.', 403, ErrorCode.ERR_BACK_AUTH);
    }

    if (profile.role !== UserRole.ADMIN_GERAL) {
        console.warn(`[Auth] User ${req.user.id} is not admin. Role: ${profile.role}`);
        return res.status(403).json({
          status: 'error',
          code: ErrorCode.ERR_BACK_AUTH,
          message: 'Access denied. Admins only.'
        });
    }

    next();
  } catch (error) {
    console.error('[Auth] requireAdmin error:', error);
    const statusCode = (error instanceof ApiError) ? error.statusCode : 500;
    const message = (error instanceof ApiError) ? error.message : 'Internal Server Error in Auth Middleware';
    const code = (error instanceof ApiError) ? error.code : ErrorCode.ERR_BACK_INTERNAL;

    return res.status(statusCode).json({
      status: 'error',
      code: code,
      message: message
    });
  }
};
