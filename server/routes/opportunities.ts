import express from 'express';
import { ApiError } from '../utils/errorHandler.js';
import { ErrorCode } from '../../src/utils/errorTypes.js';
// import { supabase } from '../supabase.js';

const router = express.Router();

// GET all opportunities
router.get('/', async (req, res, next) => {
  try {
    if (!req.supabase) {
      throw new ApiError('Supabase client not initialized', 500, ErrorCode.ERR_BACK_INTERNAL);
    }
    const { data, error } = await req.supabase.from('opportunities').select('*');
    if (error) {
      console.error('Supabase query error (opportunities):', error.message);
      if (error.code === '42P01') {
        throw new ApiError('Database table "opportunities" not initialized.', 500, ErrorCode.ERR_BACK_INTERNAL);
      }
      throw error;
    }
    res.json(data || []);
  } catch (error) {
    next(error);
  }
});

// POST create a new opportunity (Bypass RLS via Service Role)
router.post('/', async (req, res, next) => {
  try {
    const { accountId, accountName, productId, title, type, value, probability, crmStatus } = req.body;

    const opportunityPayload = {
      account_id: accountId,
      account_name: accountName,
      product_id: productId,
      title,
      type,
      value,
      probability,
      crm_status: crmStatus
    };

    const { data, error } = await serviceRoleSupabase
      .from('opportunities')
      .insert(opportunityPayload)
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    next(error);
  }
});

// PUT update an opportunity (Bypass RLS via Service Role)
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { accountId, accountName, productId, title, type, value, probability, crmStatus } = req.body;

    const opportunityPayload = {
      account_id: accountId,
      account_name: accountName,
      product_id: productId,
      title,
      type,
      value,
      probability,
      crm_status: crmStatus
    };

    // Remove undefined keys to avoid overwriting existing values with null
    Object.keys(opportunityPayload).forEach(key => (opportunityPayload as any)[key] === undefined && delete (opportunityPayload as any)[key]);

    const { data, error } = await serviceRoleSupabase
      .from('opportunities')
      .update(opportunityPayload)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
