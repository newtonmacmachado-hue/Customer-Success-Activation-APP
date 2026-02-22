import React, { useState } from 'react';
import { Account, SuccessPlan, Milestone } from '../types';

interface SuccessPlanFormProps {
  accounts: Account[];
  initialPlan?: SuccessPlan;
  onSave: (plan: SuccessPlan) => void;
  onCancel: () => void;
}

const SuccessPlanForm: React.FC<SuccessPlanFormProps> = ({ 
  accounts = [], // BLINDAGEM: Fallback para lista vazia
  initialPlan, 
  onSave, 
  onCancel 
}) => {
  const [accountId, setAccountId] = useState(initialPlan?.accountId || '');
  const [level, setLevel] = useState(initialPlan?.level || 'Conta (geral)');
  const [objective, setObjective] = useState(initialPlan?.objective || '');
  const [status, setStatus] = useState<SuccessPlan['status']>(initialPlan?.status || 'Ativo');
  const [progress, setProgress] = useState(Number(initialPlan?.progress) || 0);
  const [milestones, setMilestones] = useState<Milestone[]>(initialPlan?.milestones || []);

  // BLINDAGEM: Busca segura da conta selecionada
  const selectedAccount = (accounts || []).find(a => a.id === accountId);

  const handleAddMilestone = () => {
    const newMilestone: Milestone = {
      id: `ms-${Math.random().toString(36).substr(2, 9)}`,
      title: '',
      status: 'Pendente',
      dueDate: new Date().toISOString().split('T')[0],
      responsible: '',
      kpi: ''
    };
    setMilestones([...milestones, newMilestone]);
  };

  const handleUpdateMilestone = (id: string, updates: Partial<Milestone>) => {
    setMilestones(milestones.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const handleRemoveMilestone = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id));
  };

  const handleSave = () => {
    if (!accountId || !objective) return alert("Por favor, preencha a conta e o objetivo do plano.");
    
    const plan: SuccessPlan = {
      id: initialPlan?.id || `plan-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: initialPlan?.createdAt || new Date().toISOString().split('T')[0],
      accountId,
      level,
      objective,
      status,
      progress: Number(progress) || 0,
      milestones: milestones || []
    };
    onSave(plan);
  };

  const inputStyles = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-sm mb-4";
  const labelStyles = "text-sm font-bold text-slate-700 block mb-2";

  return (
    <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100 mx-auto animate-in zoom-in-95 duration-300">
      <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">
          {initialPlan ? 'Editar Plano de Sucesso' : 'Novo Plano de Sucesso'}
        </h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-2 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto bg-[#fafafa]">
        {/* Conta */}
        <div>
          <label className={labelStyles}>Conta do Cliente</label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)} className={inputStyles}>
            <option value="">Selecione uma conta...</option>
            {(accounts || []).map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name || 'Conta sem nome'}</option>
            ))}
          </select>
        </div>

        {/* Nível - BLINDAGEM: Mapeamento seguro de produtos */}
        <div>
          <label className={labelStyles}>Foco do Plano (Nível)</label>
          <select value={level} onChange={e => setLevel(e.target.value)} className={inputStyles}>
            <option value="Conta (geral)">Conta (geral)</option>
            {(selectedAccount?.products || []).map(p => (
              <option key={p.id} value={p.name}>{p.name || 'Produto'}</option>
            ))}
          </select>
        </div>

        {/* Objetivo */}
        <div>
          <label className={labelStyles}>Objetivo Estratégico</label>
          <textarea 
            value={objective} 
            onChange={e => setObjective(e.target.value)} 
            className={`${inputStyles} h-24 resize-none font-normal`} 
            placeholder="Qual o principal resultado esperado com este plano?"
          />
        </div>

        {/* Status e Progresso */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelStyles}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as any)} className={inputStyles}>
              <option value="Draft">Draft</option>
              <option value="Ativo">Ativo</option>
              <option value="Pausado">Pausado</option>
              <option value="Concluído">Concluído</option>
            </select>
          </div>
          <div>
            <label className={labelStyles}>Progresso atual (%)</label>
            <input 
              type="number" 
              value={progress} 
              onChange={e => setProgress(Number(e.target.value))} 
              className={inputStyles} 
              min="0" max="100"
            />
          </div>
        </div>

        {/* Milestones Blindados */}
        <div className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Milestones (Marcos de Sucesso)</h4>
            <button 
              onClick={handleAddMilestone}
              className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-blue-600 hover:border-blue-500 transition-all shadow-sm"
            >
              + Adicionar Marco
            </button>
          </div>

          <div className="space-y-4">
            {(milestones || []).length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs italic">
                Nenhum milestone adicionado ainda.
              </div>
            ) : (
              milestones.map((m) => (
                <div key={m.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group animate-in slide-in-from-top-2">
                  <button 
                    onClick={() => handleRemoveMilestone(m.id)}
                    className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                  
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      placeholder="Título do Milestone" 
                      value={m.title || ''}
                      onChange={e => handleUpdateMilestone(m.id, { title: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <select 
                        value={m.status || 'Pendente'}
                        onChange={e => handleUpdateMilestone(m.id, { status: e.target.value as any })}
                        className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                      >
                        <option value="Pendente">Pendente</option>
                        <option value="Em Andamento">Em Andamento</option>
                        <option value="Concluído">Concluído</option>
                      </select>
                      <input 
                        type="date" 
                        value={m.dueDate || ''}
                        onChange={e => handleUpdateMilestone(m.id, { dueDate: e.target.value })}
                        className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                      />
                    </div>
                    
                    <input 
                      type="text" 
                      placeholder="Responsável (Nome)" 
                      value={m.responsible || ''}
                      onChange={e => handleUpdateMilestone(m.id, { responsible: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm font-medium text-slate-900"
                    />
                    
                    <input 
                      type="text" 
                      placeholder="KPI de Sucesso (Ex: Adoção > 80%)" 
                      value={m.kpi || ''}
                      onChange={e => handleUpdateMilestone(m.id, { kpi: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 italic"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="p-8 bg-slate-50 border-t border-slate-100 flex space-x-4">
        <button onClick={onCancel} className="flex-1 py-4 rounded-2xl bg-white border border-slate-200 text-slate-400 text-xs font-black uppercase hover:bg-slate-100 transition-all">
          Cancelar
        </button>
        <button onClick={handleSave} className="flex-[2] py-4 rounded-2xl bg-blue-600 text-white text-xs font-black uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-[0.98]">
          Salvar Plano Estratégico
        </button>
      </div>
    </div>
  );
};

export default SuccessPlanForm;