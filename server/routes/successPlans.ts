import express from 'express';
import { ApiError } from '../utils/errorHandler.js';
import { ErrorCode } from '../../src/utils/errorTypes.js';
import { supabase as serviceRoleSupabase } from '../supabase.js';

const router = express.Router();

// GET all success plans (Uses scoped client for RLS)
router.get('/', async (req, res, next) => {
  try {
    if (!req.supabase) {
      throw new ApiError('Supabase client not initialized', 500, ErrorCode.ERR_BACK_INTERNAL);
    }
    const { data, error } = await req.supabase.from('success_plans').select('*');
    if (error) {
      console.error('Supabase query error (success_plans):', error.message);
      if (error.code === '42P01') {
        throw new ApiError('Database table "success_plans" not initialized.', 500, ErrorCode.ERR_BACK_INTERNAL);
      }
      throw error;
    }

    const mappedData = (data || []).map((plan: any) => ({
      ...plan,
      accountId: plan.account_id,
      createdAt: plan.created_at,
      milestones: plan.milestones?.map((m: any) => ({
        ...m,
        dueDate: m.due_date,
        responsible: m.responsible,
        kpi: m.kpi
      }))
    }));

    res.json(mappedData);
  } catch (error) {
    next(error);
  }
});

// POST create a new success plan (Bypass RLS via Service Role)
router.post('/', async (req, res, next) => {
  try {
    const { accountId, level, objective, status, progress, createdAt, milestones } = req.body;

    const planPayload = {
      account_id: accountId,
      level,
      objective,
      status,
      progress,
      created_at: createdAt,
      milestones: milestones?.map((m: any) => ({
        ...m,
        due_date: m.dueDate,
        responsible: m.responsible,
        kpi: m.kpi
      }))
    };

    const { data, error } = await serviceRoleSupabase
      .from('success_plans')
      .insert(planPayload)
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    next(error);
  }
});

// PUT update a success plan (Bypass RLS via Service Role)
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { accountId, level, objective, status, progress, createdAt, milestones } = req.body;

    const planPayload = {
      account_id: accountId,
      level,
      objective,
      status,
      progress,
      created_at: createdAt,
      milestones: milestones?.map((m: any) => ({
        id: m.id,
        title: m.title,
        status: m.status,
        due_date: m.dueDate,
        responsible: m.responsible,
        kpi: m.kpi
      }))
    };

    // Remove undefined keys to avoid overwriting existing values with null
    Object.keys(planPayload).forEach(key => (planPayload as any)[key] === undefined && delete (planPayload as any)[key]);

    const { data, error } = await serviceRoleSupabase
      .from('success_plans')
      .update(planPayload)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
