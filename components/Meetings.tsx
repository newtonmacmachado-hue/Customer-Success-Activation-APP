import React, { useState } from 'react';
import { Meeting, Account, Product, VOCType, VOCUrgency, VOCStatus, Activity } from '../types';

interface MeetingsProps {
  meetings: Meeting[];
  accounts: Account[];
  selectedAccountFromParent: Account | null;
  product: Product | null;
  onAddMeeting: (m: Meeting) => void;
  onUpdateMeeting: (m: Meeting) => void;
  onDeleteMeeting: (id: string) => void;
  onAddActivity: (a: Activity) => void;
}

const Meetings: React.FC<MeetingsProps> = ({ meetings, accounts, selectedAccountFromParent, onAddMeeting, onUpdateMeeting, onDeleteMeeting, onAddActivity }) => {
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(meetings[0] || null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formAccount, setFormAccount] = useState<string>(selectedAccountFromParent?.id || '');
  const [formProduct, setFormProduct] = useState<string>('');
  const [formType, setFormType] = useState<'QBR' | 'MBR' | 'Cadence'>('Cadence');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formSummary, setFormSummary] = useState('');
  const [formRisks, setFormRisks] = useState('');
  const [formParticipants, setFormParticipants] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formReminderDays, setFormReminderDays] = useState<number>(0);

  // Estados para Ações/Atividades
  interface ActionItem {
    description: string;
    owner: string;
    dueDate: string;
  }
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [newActionDesc, setNewActionDesc] = useState('');
  const [newActionOwner, setNewActionOwner] = useState('');
  const [newActionDate, setNewActionDate] = useState('');

  // Novos campos para VOC
  const [formVocDetailed, setFormVocDetailed] = useState('');
  const [formVocType, setFormVocType] = useState<VOCType>(VOCType.OTHER);
  const [formVocUrgency, setFormVocUrgency] = useState<VOCUrgency>(VOCUrgency.MEDIUM);
  const [formVocStatus, setFormVocStatus] = useState<VOCStatus>(VOCStatus.PENDING);

  // Helper para classes de input
  const inputClass = "w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:border-blue-500 outline-none font-semibold text-sm text-slate-900";

  const handleEdit = (meeting: Meeting) => {
    setFormAccount(meeting.accountId || '');
    setFormProduct(meeting.productId || '');
    setFormType(meeting.type || 'Cadence');
    setFormDate(meeting.date || new Date().toISOString().split('T')[0]);
    setFormSummary(meeting.summary || '');
    
    // Blindagem para arrays no modo edição
    setFormRisks((meeting.risks || []).join('\n'));
    setFormParticipants((meeting.participants || []).join(', '));
    setFormTags((meeting.vocTags || []).join(', '));
    
    setFormReminderDays(meeting.reminderDays || 0);
    setFormVocDetailed(meeting.vocDetailed || '');
    setFormVocType(meeting.vocType || VOCType.OTHER);
    setFormVocUrgency(meeting.vocUrgency || VOCUrgency.MEDIUM);
    setFormVocStatus(meeting.vocStatus || VOCStatus.PENDING);
    
    setActionItems([]); 
    setIsEditing(true);
    setIsAdding(true);
  };

  const handleAddActionItem = () => {
    if (!newActionDesc || !newActionOwner) return;
    setActionItems([...actionItems, { 
      description: newActionDesc, 
      owner: newActionOwner, 
      dueDate: newActionDate || new Date().toISOString().split('T')[0] 
    }]);
    setNewActionDesc('');
    setNewActionOwner('');
    setNewActionDate('');
  };

  const handleRemoveActionItem = (idx: number) => {
    setActionItems(actionItems.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    const acc = accounts.find(a => a.id === formAccount);
    const prod = acc?.products?.find(p => p.id === formProduct);
    if (!acc) return alert("Selecione uma conta.");

    // Gera atividades reais para cada novo item de ação
    actionItems.forEach(item => {
      const newActivity: Activity = {
        id: `act-${Math.random().toString(36).substr(2, 9)}`,
        accountId: acc.id,
        title: `[Via Reunião] ${item.description}`,
        category: 'Adoption',
        status: 'Pending',
        dueDate: item.dueDate,
        urgency: 'média',
        owner: item.owner,
        alertDays: 2
      };
      onAddActivity(newActivity);
    });

    const oldActions = isEditing && selectedMeeting ? (selectedMeeting.nextActions || []) : [];
    const newActionsDisplay = actionItems.map(a => `${a.description} (${a.owner} - ${a.dueDate})`);

    // Lógica do Snapshot Financeiro
    const currentMrr = prod?.mrr || 0;
    const currentObjective = prod?.mrrObjetivo || 0;
    const currentGap = currentMrr - currentObjective;

    // Compilação defensiva
    const isSameProduct = Boolean(isEditing && selectedMeeting && selectedMeeting.productId === formProduct);
    
    const snapshotMrr = (isSameProduct && selectedMeeting?.mrrAtTime !== undefined) ? selectedMeeting.mrrAtTime : currentMrr;
    const snapshotObjective = (isSameProduct && selectedMeeting?.mrrObjectiveAtTime !== undefined) ? selectedMeeting.mrrObjectiveAtTime : currentObjective;
    const snapshotGap = (isSameProduct && selectedMeeting?.mrrGapAtTime !== undefined) ? selectedMeeting.mrrGapAtTime : currentGap;

    const meetingPayload: Meeting = {
      id: isEditing && selectedMeeting ? selectedMeeting.id : Math.random().toString(36).substr(2, 9),
      accountId: acc.id,
      accountName: acc.name,
      productId: prod?.id || null, 
      productName: prod?.name || 'Geral',
      date: formDate,
      type: formType,
      summary: formSummary,
      participants: formParticipants.split(',').map(s => s.trim()).filter(Boolean),
      
      // Financeiro
      mrrAtTime: snapshotMrr,
      mrrObjectiveAtTime: snapshotObjective,
      mrrGapAtTime: snapshotGap,

      risks: formRisks.split('\n').filter(Boolean),
      nextActions: [...oldActions, ...newActionsDisplay],
      vocTags: formTags.split(',').filter(Boolean),
      actionsCount: (isEditing && selectedMeeting ? (selectedMeeting.actionsCount || 0) : 0) + actionItems.length,
      reminderDays: formReminderDays > 0 ? formReminderDays : null, 
      
      // VOC
      vocDetailed: formVocDetailed,
      vocType: formVocType,
      vocUrgency: formVocUrgency,
      vocStatus: formVocStatus
    };

    if (isEditing) {
      onUpdateMeeting(meetingPayload);
    } else {
      onAddMeeting(meetingPayload);
    }

    setIsAdding(false);
    setIsEditing(false);
    setSelectedMeeting(meetingPayload);
    resetForm();
  };

  const resetForm = () => {
    setFormSummary('');
    setFormRisks('');
    setActionItems([]);
    setFormParticipants('');
    setFormTags('');
    setFormVocDetailed('');
    setFormReminderDays(0);
    setFormVocType(VOCType.OTHER);
    setFormVocUrgency(VOCUrgency.MEDIUM);
    setFormVocStatus(VOCStatus.PENDING);
    setIsEditing(false);
  };

  const selectedAccInForm = accounts.find(a => a.id === formAccount);

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '—';
    if (dateStr.includes('/')) return dateStr;
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-160px)]">
      {/* COLUNA ESQUERDA: LISTA DE REUNIÕES */}
      <div className="lg:col-span-1 flex flex-col bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-black text-slate-800 uppercase tracking-widest text-xs">Histórico</h2>
          <button onClick={() => { setIsAdding(true); setIsEditing(false); resetForm(); }} className="text-blue-600 font-black text-xs uppercase">+ Nova</button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {(meetings || []).map(m => (
            <div key={m.id} onClick={() => { setSelectedMeeting(m); setIsAdding(false); }} className={`p-4 cursor-pointer hover:bg-slate-50 ${selectedMeeting?.id === m.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
              <div className="flex justify-between mb-1">
                <span className="text-[9px] font-black uppercase text-slate-400">{m.type}</span>
                <span className="text-[9px] font-bold text-slate-400">{formatDateLabel(m.date)}</span>
              </div>
              <p className="text-sm font-bold text-slate-800 truncate">{m.accountName}</p>
              <p className="text-[10px] text-slate-500 truncate">{m.summary}</p>
              <div className="flex space-x-2 mt-2">
                {m.vocDetailed && (
                  <span className="inline-block px-1.5 py-0.5 bg-orange-100 text-orange-600 text-[8px] font-black uppercase rounded">VOC</span>
                )}
                {m.reminderDays && (
                   <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[8px] font-black uppercase rounded flex items-center">
                     <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>
                     Lembrete
                   </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COLUNA DIREITA: FORMULÁRIO OU DETALHES */}
      <div className="lg:col-span-2 overflow-y-auto pr-2 pb-10">
        {isAdding ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-8 animate-in slide-in-from-bottom-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{isEditing ? 'Editar Reunião' : 'Registro de Reunião Estratégica'}</h2>
              <p className="text-slate-500 text-sm">Preencha a ata e defina atividades de follow-up.</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase">Conta</label>
                <select value={formAccount} onChange={e => setFormAccount(e.target.value)} className={inputClass}>
                  <option value="">Selecione...</option>
                  {(accounts || []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase">Produto Contexto</label>
                <select value={formProduct} onChange={e => setFormProduct(e.target.value)} className={inputClass}>
                  <option value="">Geral</option>
                  {(selectedAccInForm?.products || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              
              {/* LINHAS QUEBRADAS PARA EVITAR CORTE */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase">Tipo de Reunião</label>
                <select value={formType} onChange={e => setFormType(e.target.value as any)} className={inputClass}>
                  <option value="Cadence">Cadência</option>
                  <option value="MBR">MBR</option>
                  <option value="QBR">QBR</option>
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase">Data</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-400 uppercase">Lembrete Prévio (Reunião)</label>
              <div className="relative">
                <select value={formReminderDays} onChange={e => setFormReminderDays(Number(e.target.value))} className={inputClass}>
                  <option value={0}>Sem lembrete</option>
                  <option value={1}>1 dia antes</option>
                  <option value={2}>2 dias antes</option>
                  <option value={3}>3 dias antes</option>
                  <option value={7}>1 semana antes</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">Resumo da Reunião (Ata)</label>
              <textarea value={formSummary} onChange={e => setFormSummary(e.target.value)} className={`${inputClass} h-24`} placeholder="O que foi discutido?" />
            </div>

            <div className="space-y-1">
               <label className="text-xs font-black text-slate-400 uppercase">Riscos (por linha)</label>
               <textarea value={formRisks} onChange={e => setFormRisks(e.target.value)} className={`${inputClass} h-20 focus:border-red-500`} placeholder="Identificou algum perigo?" />
            </div>

            {/* SEÇÃO DE AÇÕES / ATIVIDADES */}
            <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 space-y-4">
              <div className="flex items-center space-x-2 border-b border-blue-100 pb-2 mb-2">
                 <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest">Plano de Ação (Gerar Atividades)</h3>
              </div>
              
              <div className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 w-full space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">O que fazer?</label>
                  <input type="text" value={newActionDesc} onChange={e => setNewActionDesc(e.target.value)} className={inputClass} placeholder="Descrição da atividade..." />
                </div>
                <div className="w-full md:w-40 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Quem?</label>
                  <input type="text" value={newActionOwner} onChange={e => setNewActionOwner(e.target.value)} className={inputClass} placeholder="Nome" />
                </div>
                <div className="w-full md:w-32 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Até quando?</label>
                  <input type="date" value={newActionDate} onChange={e => setNewActionDate(e.target.value)} className={inputClass} />
                </div>
                <button onClick={handleAddActionItem} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
              </div>

              {actionItems.length > 0 && (
                <div className="mt-4 space-y-2">
                  {actionItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                       <div>
                          <p className="text-xs font-bold text-slate-800">{item.description}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-bold">{item.owner} • {formatDateLabel(item.dueDate)}</p>
                       </div>
                       <button onClick={() => handleRemoveActionItem(idx)} className="text-red-300 hover:text-red-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                       </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">Participantes (separados por vírgula)</label>
              <input value={formParticipants} onChange={e => setFormParticipants(e.target.value)} className={inputClass} placeholder="Ex: João, Maria, José..." />
            </div>

            {/* SEÇÃO VOC */}
            <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100 space-y-4">
              <div className="flex items-center space-x-2">
                 <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                 <h3 className="text-xs font-black text-orange-600 uppercase tracking-widest">Vincular Voice of Customer (VOC)</h3>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Feedback Detalhado</label>
                <textarea value={formVocDetailed} onChange={e => setFormVocDetailed(e.target.value)} className="w-full bg-white border border-orange-200 p-3 rounded-xl h-20 focus:border-orange-500 outline-none text-sm font-medium text-slate-900" placeholder="Se vazio, este campo será ignorado." />
              </div>

              <div className="grid grid-cols-3 gap-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Tipo</label>
                    <select value={formVocType} onChange={e => setFormVocType(e.target.value as VOCType)} className="w-full bg-white border border-orange-200 p-2 rounded-lg text-xs font-bold focus:border-orange-500 outline-none text-slate-900">
                       {Object.values(VOCType).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Urgência</label>
                    <select value={formVocUrgency} onChange={e => setFormVocUrgency(e.target.value as VOCUrgency)} className="w-full bg-white border border-orange-200 p-2 rounded-lg text-xs font-bold focus:border-orange-500 outline-none text-slate-900">
                       {Object.values(VOCUrgency).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Status</label>
                    <select value={formVocStatus} onChange={e => setFormVocStatus(e.target.value as VOCStatus)} className="w-full bg-white border border-orange-200 p-2 rounded-lg text-xs font-bold focus:border-orange-500 outline-none text-slate-900">
                       {Object.values(VOCStatus).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                 </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Tags VOC (vírgula)</label>
                <input value={formTags} onChange={e => setFormTags(e.target.value)} className="w-full bg-white border border-orange-200 p-3 rounded-xl text-sm font-medium focus:border-orange-500 outline-none text-slate-900" placeholder="Ex: Bug, Sugestão, Comercial..." />
              </div>
            </div>

            <div className="flex space-x-4">
               <button onClick={() => { setIsAdding(false); setIsEditing(false); }} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 transition-all">Cancelar</button>
               <button onClick={handleSave} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-blue-700 transition-all active:scale-[0.98]">{isEditing ? 'Atualizar Registro' : 'Salvar Registro Completo'}</button>
            </div>
          </div>
        ) : selectedMeeting ? (
          <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm space-y-10">
            <header className="flex justify-between items-start border-b border-slate-50 pb-8">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest">{selectedMeeting.type || 'Geral'}</span>
                  {selectedMeeting.reminderDays && (
                    <span className="flex items-center space-x-1 bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest">
                       <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>
                       <span>Lembrete: {selectedMeeting.reminderDays}d</span>
                    </span>
                  )}
                </div>
                <h2 className="text-4xl font-black text-slate-900 mt-2 tracking-tighter">{selectedMeeting.accountName || 'Conta não informada'}</h2>
                <div className="flex items-center space-x-3 mt-2">
                   <p className="text-slate-500 font-bold text-sm">{formatDateLabel(selectedMeeting.date)}</p>
                   <span className="text-slate-300">•</span>
                   <p className="text-blue-600 font-black text-[10px] uppercase">{selectedMeeting.productName || 'Geral'}</p>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                 <button 
                  onClick={() => handleEdit(selectedMeeting)}
                  className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all mb-2"
                 >
                   Editar
                 </button>
                 <div className="flex flex-col items-end">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Participantes</p>
                   <div className="flex flex-wrap justify-end gap-1 max-w-[200px]">
                      {(selectedMeeting.participants || []).map((p,i)=><span key={i} className="bg-slate-100 px-2 py-1 rounded text-[9px] font-bold text-slate-600">{p}</span>)}
                   </div>
                 </div>
              </div>
            </header>

            <div className="space-y-10">
               {/* SNAPSHOT FINANCEIRO BLINDADO */}
               <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                    <svg className="w-24 h-24 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </div>
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 relative z-10">Contexto Financeiro (Snapshot do Momento)</h3>
                 <div className="grid grid-cols-3 gap-8 relative z-10">
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">MRR na época</p>
                      <p className="text-2xl font-black text-slate-900">R$ {(Number(selectedMeeting.mrrAtTime) || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">Objetivo na época</p>
                      <p className="text-2xl font-black text-slate-500">R$ {(Number(selectedMeeting.mrrObjectiveAtTime) || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">GAP na época</p>
                      <p className={`text-2xl font-black ${(Number(selectedMeeting.mrrGapAtTime) || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        R$ {(Number(selectedMeeting.mrrGapAtTime) || 0).toLocaleString()}
                      </p>
                    </div>
                 </div>
               </section>

               <section>
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Síntese da Reunião</h3>
                 <div className="bg-slate-50/50 p-6 rounded-2xl text-slate-700 leading-relaxed font-medium italic border border-slate-100">
                    "{selectedMeeting.summary || 'Nenhum resumo adicionado.'}"
                 </div>
               </section>

               <div className="grid grid-cols-2 gap-10">
                  <section>
                    <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-4">Riscos & Alertas</h3>
                    <div className="space-y-2">
                      {(selectedMeeting.risks && selectedMeeting.risks.length > 0) ? selectedMeeting.risks.map((r,i)=>(
                        <div key={i} className="flex items-center space-x-3 text-xs font-bold text-slate-600 bg-red-50/50 p-2 rounded-lg">
                           <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                           <span>{r}</span>
                        </div>
                      )) : <p className="text-xs text-slate-400 italic font-medium">Nenhum risco apontado.</p>}
                    </div>
                  </section>
                  <section>
                    <h3 className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] mb-4">Próximas Ações (Registradas)</h3>
                    <div className="space-y-2">
                      {(selectedMeeting.nextActions && selectedMeeting.nextActions.length > 0) ? selectedMeeting.nextActions.map((a,i)=>(
                        <div key={i} className="flex items-center space-x-3 text-xs font-bold text-slate-600 bg-green-50/50 p-2 rounded-lg">
                           <div className="w-1 h-1 bg-green-600 rounded-full"></div>
                           <span>{a}</span>
                        </div>
                      )) : <p className="text-xs text-slate-400 italic font-medium">Nenhuma ação imediata.</p>}
                    </div>
                    <p className="text-[9px] text-slate-400 mt-2 italic">*Novas atividades criadas vão para o menu Atividades.</p>
                  </section>
               </div>

               {selectedMeeting.vocDetailed && (
                 <section className="pt-8 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                       <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">Voice of Customer (VOC)</h3>
                       <div className="flex space-x-2">
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[9px] font-black rounded uppercase">{selectedMeeting.vocType || 'Geral'}</span>
                          <span className="px-2 py-0.5 bg-slate-800 text-white text-[9px] font-black rounded uppercase">{selectedMeeting.vocUrgency || 'Média'}</span>
                       </div>
                    </div>
                    <div className="bg-orange-50/30 border border-orange-100 p-6 rounded-2xl italic text-slate-700 text-sm font-medium">
                       {selectedMeeting.vocDetailed}
                    </div>
                    {(selectedMeeting.vocTags && selectedMeeting.vocTags.length > 0) && (
                      <div className="mt-4 flex flex-wrap gap-2">
                         {selectedMeeting.vocTags.map((tag, i) => (
                           <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-400 uppercase tracking-tighter">#{tag}</span>
                         ))}
                      </div>
                    )}
                 </section>
               )}
            </div>
            
            <div className="pt-8 flex justify-end">
               <button onClick={() => onDeleteMeeting(selectedMeeting.id)} className="text-red-300 hover:text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  <span>Excluir Registro</span>
               </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 italic border-2 border-dashed border-slate-100 rounded-3xl font-medium">Selecione uma reunião para visualizar os detalhes.</div>
        )}
      </div>
    </div>
  );
};

export default Meetings;