import express from 'express';
import { ApiError } from '../utils/errorHandler.js';
import { ErrorCode } from '../../src/utils/errorTypes.js';
import { supabase as serviceRoleSupabase } from '../supabase.js';

const router = express.Router();

// GET all accounts (Uses scoped client for RLS)
router.get('/', async (req, res, next) => {
  try {
    if (!req.supabase) {
      throw new ApiError('Supabase client not initialized', 500, ErrorCode.ERR_BACK_INTERNAL);
    }

    const { data, error } = await req.supabase
      .from('accounts')
      .select(`
        *,
        products:account_products(*),
        activities(*)
      `);
    
    if (error) {
      console.error('Supabase query error (accounts):', error.message);
      if (error.code === '42P01') {
        throw new ApiError('Database tables not initialized. Please run the SQL script in Admin panel.', 500, ErrorCode.ERR_BACK_INTERNAL);
      }
      throw error;
    }
    
    res.json(data || []);
  } catch (error) {
    next(error);
  }
});

// PUT update an account (Bypass RLS via Service Role)
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, segment, segmentId, cnpj, vocPendente, successPlanId, products, activities, contacts } = req.body;

    const payload: any = {
      name,
      segment,
      segment_id: segmentId,
      cnpj,
      voc_pendente: vocPendente,
      success_plan_id: successPlanId
    };

    // Remove undefined keys
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const { data, error } = await serviceRoleSupabase
      .from('accounts')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE an account (Bypass RLS via Service Role)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`[DELETE] Attempting to delete account with ID: ${id}`);

    // 1. Delete related records first to avoid FK constraints
    // In a production app, ON DELETE CASCADE in DB is preferred.
    // Here we do it manually to ensure the account can be deleted.
    
    await serviceRoleSupabase.from('account_products').delete().eq('account_id', id);
    await serviceRoleSupabase.from('meetings').delete().eq('account_id', id);
    await serviceRoleSupabase.from('opportunities').delete().eq('account_id', id);
    await serviceRoleSupabase.from('success_plans').delete().eq('account_id', id);
    await serviceRoleSupabase.from('activities').delete().eq('account_id', id);

    // 2. Now delete the account
    const { error, count } = await serviceRoleSupabase
      .from('accounts')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) {
      console.error('[DELETE] Error deleting account:', error);
      throw new ApiError(`Erro ao deletar conta: ${error.message}`, 500, ErrorCode.ERR_BACK_DB);
    }

    console.log(`[DELETE] Deleted ${count} rows.`);
    
    if (count === 0) {
       console.warn(`[DELETE] No account found with ID: ${id}`);
       throw new ApiError('Conta não encontrada no banco de dados.', 404, ErrorCode.ERR_BACK_DB);
    }

    res.status(204).send();
  } catch (error) {
    console.error('[DELETE] Exception:', error);
    next(error);
  }
});

// POST create a new account (Bypass RLS via Service Role)
router.post('/', async (req, res, next) => {
  try {
    const { id, name, segment, segmentId, cnpj, vocPendente, successPlanId } = req.body;
    
    if (!name) {
      throw new ApiError('Account name is required', 400, ErrorCode.ERR_FRONT_VALIDATION);
    }

    const payload: any = {
      id,
      name,
      segment,
      segment_id: segmentId,
      cnpj,
      voc_pendente: vocPendente,
      success_plan_id: successPlanId
    };

    // Remove undefined keys
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const { data, error } = await serviceRoleSupabase
      .from('accounts')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error (accounts):', error);
      if (error.code === '42P01') {
        throw new ApiError('Database table "accounts" not initialized.', 500, ErrorCode.ERR_BACK_INTERNAL);
      }
      if (error.code === '23505') { // Unique violation
        throw new ApiError('Account with this ID already exists.', 409, ErrorCode.ERR_BACK_DB);
      }
      throw new ApiError(error.message, 500, ErrorCode.ERR_BACK_DB);
    }
    
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
