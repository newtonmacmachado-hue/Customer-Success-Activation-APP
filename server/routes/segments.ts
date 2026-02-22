import { Router } from 'express';
import { ApiError } from '../utils/errorHandler.js';
import { ErrorCode } from '../../src/utils/errorTypes.js';
import { requireAdmin } from '../middleware/auth.js';
import { supabase as serviceRoleSupabase } from '../supabase.js';

const router = Router();

// Listar todos os segmentos (Aberto para todos autenticados via RLS)
router.get('/', async (req, res, next) => {
  try {
    if (!req.supabase) {
      throw new ApiError('Supabase client not initialized', 500, ErrorCode.ERR_BACK_INTERNAL);
    }
    const { data, error } = await req.supabase
      .from('account_segments')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Supabase query error (segments):', error.message);
      if (error.code === '42P01') {
        throw new ApiError('Database table "account_segments" not initialized.', 500, ErrorCode.ERR_BACK_INTERNAL);
      }
      throw error;
    }
    res.json(data || []);
  } catch (error) {
    next(error);
  }
});

// Criar novo segmento (Apenas Admins - Bypassing RLS via Service Role)
router.post('/', (req, res, next) => {
  console.log('[Segments] POST / request received');
  console.log('[Segments] requireAdmin type:', typeof requireAdmin);
  next();
}, requireAdmin, async (req, res, next) => {
  try {
    console.log('[Segments] Inside POST handler');
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const { data, error } = await serviceRoleSupabase
      .from('account_segments')
      .insert({ name, description })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('[Segments] Error in POST handler:', error);
    next(error);
  }
});

// Atualizar segmento (Apenas Admins - Bypassing RLS via Service Role)
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const { data, error } = await serviceRoleSupabase
      .from('account_segments')
      .update({ name, description })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Deletar segmento (Apenas Admins - Bypassing RLS via Service Role)
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await serviceRoleSupabase
      .from('account_segments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
