import express from 'express';
import { supabase as serviceRoleSupabase } from '../supabase.js';

const router = express.Router();

// GET activities for a specific account (Uses scoped client for RLS)
router.get('/accounts/:accountId/activities', async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const { data, error } = await req.supabase
      .from('activities')
      .select('*')
      .eq('account_id', accountId);
    if (error) throw error;

    const mappedData = (data || []).map((a: any) => ({
      ...a,
      dueDate: a.due_date,
      productId: a.product_id,
      accountId: a.account_id,
      alertDays: a.alert_days
    }));

    res.json(mappedData);
  } catch (error) {
    next(error);
  }
});

// POST a new activity to an account (Bypass RLS via Service Role)
router.post('/accounts/:accountId/activities', async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const { title, category, status, dueDate, urgency, owner, productId, notes, alertDays } = req.body;
    const activityPayload = {
      title,
      category,
      status,
      due_date: dueDate,
      urgency,
      owner,
      product_id: productId,
      account_id: accountId,
      notes,
      alert_days: alertDays
    };

    const { data, error } = await serviceRoleSupabase
        .from('activities')
        .insert(activityPayload)
        .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    next(error);
  }
});

// PUT update an activity (Bypass RLS via Service Role)
router.put('/:activityId', async (req, res, next) => {
  try {
    const { activityId } = req.params;
    const { title, category, status, dueDate, urgency, owner, productId, accountId, notes, alertDays } = req.body;
    const activityPayload = {
      title,
      category,
      status,
      due_date: dueDate,
      urgency,
      owner,
      product_id: productId,
      account_id: accountId,
      notes,
      alert_days: alertDays
    };

    // Remove undefined keys to avoid overwriting existing values with null
    Object.keys(activityPayload).forEach(key => (activityPayload as any)[key] === undefined && delete (activityPayload as any)[key]);

    const { data, error } = await serviceRoleSupabase
        .from('activities')
        .update(activityPayload)
        .eq('id', activityId)
        .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
