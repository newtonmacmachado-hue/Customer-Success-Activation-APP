import React, { useState, useMemo } from 'react';
import { Account, Product, Activity } from '../types';

interface ActivitiesProps {
  account?: Account; // Tornamos opcional para evitar erros se a conta sumir
  product?: Product | null;
  onUpdateActivity: (activity: Activity) => void;
  onAddActivity: (activity: Activity) => void;
  isGlobal?: boolean;
  allActivities?: Activity[];
  accounts?: Account[];
}

const Activities: React.FC<ActivitiesProps> = ({ 
  account, 
  onUpdateActivity, 
  onAddActivity, 
  isGlobal, 
  allActivities = [], 
  accounts = [] 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // BLINDAGEM 1: Definição segura da base de atividades
  const baseActivities = isGlobal ? (allActivities || []) : (account?.activities || []);

  // Estados de Filtro
  const [filterAccountId, setFilterAccountId] = useState('all');
  const [filterOwner, setFilterOwner] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Estados de Formulário (Garantindo valores iniciais seguros)
  const [formAccountId, setFormAccountId] = useState(account?.id || '');
  const [formProductId, setFormProductId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<'Expansion' | 'Adoption' | 'Cross-Sell'>('Adoption');
  const [formPriority, setFormPriority] = useState<'baixa' | 'média' | 'alta'>('média');
  const [formOwner, setFormOwner] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formAlertDays, setFormAlertDays] = useState(3);
  const [formNotes, setFormNotes] = useState('');

  // Preenche formulário para edição com proteção contra nulos
  React.useEffect(() => {
    if (editingActivity) {
      setFormAccountId(editingActivity.accountId || '');
      setFormProductId(editingActivity.productId || '');
      setFormTitle(editingActivity.title || '');
      setFormCategory(editingActivity.category || 'Adoption');
      setFormPriority(editingActivity.urgency || 'média');
      setFormOwner(editingActivity.owner || '');
      setFormDueDate(editingActivity.dueDate || '');
      setFormAlertDays(Number(editingActivity.alertDays) || 3);
      setFormNotes(editingActivity.notes || '');
    }
  }, [editingActivity]);

  // BLINDAGEM 2: Cálculos com fallback para listas vazias
  const uniqueOwners = useMemo(() => {
    const owners = new Set((baseActivities || []).map(a => a.owner).filter(Boolean));
    return Array.from(owners);
  }, [baseActivities]);

  const filteredActivities = useMemo(() => {
    return (baseActivities || []).filter(activity => {
      if (!activity) return false;
      const matchAccount = filterAccountId === 'all' || activity.accountId === filterAccountId;
      const matchOwner = filterOwner === 'all' || activity.owner === filterOwner;
      const matchPriority = filterPriority === 'all' || activity.urgency === filterPriority;
      const matchCategory = filterCategory === 'all' || activity.category === filterCategory;
      const matchStatus = filterStatus === 'all' || activity.status === filterStatus;
      return matchAccount && matchOwner && matchPriority && matchCategory && matchStatus;
    });
  }, [baseActivities, filterAccountId, filterOwner, filterPriority, filterCategory, filterStatus]);

  const handleSave = () => {
    if (!formTitle || !formAccountId) {
      alert("Título e Conta são obrigatórios.");
      return;
    }

    const payload: Activity = {
      id: editingActivity?.id || Math.random().toString(36).substr(2, 9),
      accountId: formAccountId,
      productId: formProductId || undefined,
      title: formTitle,
      category: formCategory,
      urgency: formPriority,
      owner: formOwner,
      dueDate: formDueDate,
      status: editingActivity?.status || 'Pending',
      notes: formNotes,
      alertDays: formAlertDays
    };

    if (editingActivity) {
      onUpdateActivity(payload);
    } else {
      onAddActivity(payload);
    }

    closeModals();
  };

  const closeModals = () => {
    setIsAdding(false);
    setEditingActivity(null);
    resetForm();
  };

  const resetForm = () => {
    setFormTitle('');
    setFormProductId('');
    setFormCategory('Adoption');
    setFormPriority('média');
    setFormOwner('');
    setFormDueDate('');
    setFormAlertDays(3);
    setFormNotes('');
  };

  // Helper para formatação de data segura
  const formatDate = (dateStr: string) => {
    if (!dateStr || !dateStr.includes('-')) return dateStr || '—';
    return dateStr.split('-').reverse().join('/');
  };

  const inputStyle = "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-sm shadow-sm";
  const labelStyle = "text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1";
  const filterSelectClass = "bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all min-w-[140px]";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Atividades</h2>
          <p className="text-slate-500 font-medium">
            {isGlobal ? 'Gerenciamento global de tarefas da carteira.' : `Tarefas de ${account?.name || 'Cliente'}`}
          </p>
        </div>
        <button onClick={() => setIsAdding(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all">+ Nova</button>
      </div>

      {/* BARRA DE FILTROS BLINDADA */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2 mr-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Filtros:</span>
        </div>

        {isGlobal && (
          <select value={filterAccountId} onChange={e => setFilterAccountId(e.target.value)} className={filterSelectClass}>
            <option value="all">Todas as Contas</option>
            {(accounts || []).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
        )}

        <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} className={filterSelectClass}>
          <option value="all">Todos Responsáveis</option>
          {(uniqueOwners || []).map(owner => <option key={owner} value={owner}>{owner}</option>)}
        </select>

        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className={filterSelectClass}>
          <option value="all">Todas Prioridades</option>
          <option value="alta">Alta</option>
          <option value="média">Média</option>
          <option value="baixa">Baixa</option>
        </select>

        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={filterSelectClass}>
          <option value="all">Todos os Tipos</option>
          <option value="Adoption">Adoção</option>
          <option value="Expansion">Expansão</option>
          <option value="Cross-Sell">Cross-Sell</option>
        </select>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={filterSelectClass}>
          <option value="all">Todos os Status</option>
          <option value="Pending">Pendente</option>
          <option value="In Progress">Em Andamento</option>
          <option value="Completed">Concluído</option>
        </select>

        {(filterAccountId !== 'all' || filterOwner !== 'all' || filterPriority !== 'all' || filterCategory !== 'all' || filterStatus !== 'all') && (
          <button 
            onClick={() => { 
              setFilterAccountId('all'); 
              setFilterOwner('all'); 
              setFilterPriority('all'); 
              setFilterCategory('all');
              setFilterStatus('all');
            }}
            className="text-xs font-bold text-red-400 hover:text-red-600 underline ml-auto"
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {/* TABELA DE ATIVIDADES BLINDADA */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex space-x-4 text-[10px] font-black text-slate-400 uppercase">
          <span className="w-10 text-center">Done</span>
          <span className="flex-1">Descrição</span>
          <span className="w-32">Urgência</span>
          <span className="w-32">Status</span>
          <span className="w-40">Conta</span>
          <span className="w-40">Responsável</span>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredActivities.length === 0 ? (
            <div className="p-10 text-center text-slate-400 italic text-sm">
              Nenhuma atividade encontrada com os filtros selecionados.
            </div>
          ) : (
            filteredActivities.map(activity => (
              <div 
                key={activity.id} 
                onClick={() => setEditingActivity(activity)}
                className="p-4 flex items-center space-x-4 hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <input type="checkbox" checked={activity.status === 'Completed'} className="w-5 h-5 rounded text-blue-600" readOnly />
                <div className="flex-1">
                   <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{activity.title || 'Sem título'}</p>
                   <p className="text-[10px] text-slate-400 font-bold uppercase">{activity.category || 'Geral'}</p>
                </div>
                <div className="w-32">
                   <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${activity.urgency === 'alta' ? 'bg-red-500 text-white' : activity.urgency === 'média' ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white'}`}>
                     {activity.urgency || 'média'}
                   </span>
                </div>
                <div className="w-32">
                   <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${
                     activity.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                     activity.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 
                     'bg-slate-100 text-slate-500'
                   }`}>
                     {activity.status || 'Pending'}
                   </span>
                </div>
                <div className="w-40 text-xs font-bold text-slate-500 truncate">
                  {(accounts || []).find(a => a.id === activity.accountId)?.name || '—'}
                </div>
                <div className="w-40 text-xs font-medium text-slate-600 truncate">{activity.owner || '—'}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL BLINDADO */}
      {(isAdding || editingActivity) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-6 overflow-y-auto">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingActivity ? 'Editar Atividade' : 'Nova Atividade'}</h3>
              <button onClick={closeModals} className="text-slate-400 hover:text-slate-600 p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-8 space-y-5 bg-slate-50/30">
              <div className="space-y-1">
                <label className={labelStyle}>Conta do Cliente</label>
                <select value={formAccountId} onChange={e => setFormAccountId(e.target.value)} className={inputStyle}>
                  <option value="">Selecione...</option>
                  {(accounts || []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className={labelStyle}>Título da Tarefa</label>
                <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} className={inputStyle} placeholder="O que precisa ser feito?" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelStyle}>Categoria</label>
                  <select value={formCategory} onChange={e => setFormCategory(e.target.value as any)} className={inputStyle}>
                    <option value="Adoption">Adoção</option>
                    <option value="Expansion">Expansão</option>
                    <option value="Cross-Sell">Cross-Sell</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={labelStyle}>Urgência</label>
                  <select value={formPriority} onChange={e => setFormPriority(e.target.value as any)} className={inputStyle}>
                    <option value="baixa">Baixa</option>
                    <option value="média">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelStyle}>Responsável</label>
                  <input type="text" value={formOwner} onChange={e => setFormOwner(e.target.value)} className={inputStyle} placeholder="Nome..." />
                </div>
                <div className="space-y-1">
                  <label className={labelStyle}>Data Prazo</label>
                  <input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} className={inputStyle} />
                </div>
              </div>

              <div className="space-y-1">
                <label className={labelStyle}>Notas Internas</label>
                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} className={`${inputStyle} h-24 font-normal`} placeholder="Instruções adicionais..." />
              </div>
            </div>

            <div className="p-8 bg-white border-t border-slate-100 flex gap-4">
               <button onClick={closeModals} className="flex-1 py-4 text-xs font-black text-slate-400 uppercase border border-slate-200 rounded-2xl">Cancelar</button>
               <button onClick={handleSave} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-blue-700">
                 {editingActivity ? 'Salvar Alterações' : 'Criar Atividade'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Activities;