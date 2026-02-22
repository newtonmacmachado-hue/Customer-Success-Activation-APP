import express from 'express';
import { ApiError } from '../utils/errorHandler.js';
import { ErrorCode } from '../../src/utils/errorTypes.js';
import { supabase as serviceRoleSupabase } from '../supabase.js';

const router = express.Router();

// Função auxiliar para padronizar o retorno para o Front-end (camelCase)
const mapMeetingToFrontend = (m: any) => ({
  id: m.id,
  accountId: m.account_id,
  accountName: m.account_name,
  productId: m.product_id,
  productName: m.product_name,
  date: m.date,
  type: m.type,
  summary: m.summary,
  participants: m.participants,
  vocDetailed: m.voc_detailed,
  vocType: m.voc_type,
  vocUrgency: m.voc_urgency,
  vocStatus: m.voc_status,
  risks: m.risks,
  nextActions: m.next_actions,
  vocTags: m.voc_tags,
  reminderDays: m.reminder_days,
  // Campos do Snapshot Financeiro e Atividades (agora sendo mapeados corretamente)
  mrrAtTime: m.mrr_at_time,
  mrrObjectiveAtTime: m.mrr_objective_at_time,
  mrrGapAtTime: m.mrr_gap_at_time,
  actionsCount: m.actions_count
});

// GET all meetings (Uses scoped client for RLS)
router.get('/', async (req, res, next) => {
  try {
    if (!req.supabase) {
      throw new ApiError('Supabase client not initialized', 500, ErrorCode.ERR_BACK_INTERNAL);
    }
    const { data, error } = await req.supabase.from('meetings').select('*');
    if (error) {
      console.error('Supabase query error (meetings):', error.message);
      if (error.code === '42P01') {
        throw new ApiError('Database table "meetings" not initialized.', 500, ErrorCode.ERR_BACK_INTERNAL);
      }
      throw error;
    }

    const mappedData = (data || []).map(mapMeetingToFrontend);
    res.json(mappedData);
  } catch (error) {
    next(error);
  }
});

// POST create a new meeting (Bypass RLS via Service Role)
router.post('/', async (req, res, next) => {
  try {
    const { 
      accountId, accountName, productId, productName, date, type, summary, 
      participants, vocDetailed, vocType, vocUrgency, vocStatus, risks, 
      nextActions, vocTags, reminderDays, mrrAtTime, mrrObjectiveAtTime, 
      mrrGapAtTime, actionsCount 
    } = req.body;

    const meetingPayload = {
      account_id: accountId,
      account_name: accountName,
      product_id: productId,
      product_name: productName,
      date,
      type,
      summary,
      participants,
      voc_detailed: vocDetailed,
      voc_type: vocType,
      voc_urgency: vocUrgency,
      voc_status: vocStatus,
      risks,
      next_actions: nextActions,
      voc_tags: vocTags,
      reminder_days: reminderDays,
      mrr_at_time: mrrAtTime,
      mrr_objective_at_time: mrrObjectiveAtTime,
      mrr_gap_at_time: mrrGapAtTime,
      actions_count: actionsCount
    };

    const { data, error } = await serviceRoleSupabase
      .from('meetings')
      .insert(meetingPayload)
      .select();

    if (error) throw error;
    res.status(201).json(mapMeetingToFrontend(data[0]));
  } catch (error) {
    console.error('Erro no POST Meeting:', error);
    next(error);
  }
});

// PUT update a meeting (Bypass RLS via Service Role)
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      accountId, accountName, productId, productName, date, type, summary, 
      participants, vocDetailed, vocType, vocUrgency, vocStatus, risks, 
      nextActions, vocTags, reminderDays, mrrAtTime, mrrObjectiveAtTime, 
      mrrGapAtTime, actionsCount 
    } = req.body;

    const meetingPayload: any = {
      account_id: accountId,
      account_name: accountName,
      product_id: productId, // Agora aceita null vindo do front-end
      product_name: productName,
      date,
      type,
      summary,
      participants,
      voc_detailed: vocDetailed,
      voc_type: vocType,
      voc_urgency: vocUrgency,
      voc_status: vocStatus,
      risks,
      next_actions: nextActions,
      voc_tags: vocTags,
      reminder_days: reminderDays, // Agora aceita null vindo do front-end
      mrr_at_time: mrrAtTime,
      mrr_objective_at_time: mrrObjectiveAtTime,
      mrr_gap_at_time: mrrGapAtTime,
      actions_count: actionsCount
    };

    // Remove undefined keys de forma segura (mantém as chaves que vierem como null explícito)
    const cleanPayload = Object.fromEntries(
      Object.entries(meetingPayload).filter(([_, v]) => v !== undefined)
    );

    const { data, error } = await serviceRoleSupabase
      .from('meetings')
      .update(cleanPayload)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(mapMeetingToFrontend(data[0]));
  } catch (error) {
    console.error('Erro no PUT Meeting:', error);
    next(error);
  }
});

// DELETE a meeting (Bypass RLS via Service Role)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await serviceRoleSupabase.from('meetings').delete().eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;