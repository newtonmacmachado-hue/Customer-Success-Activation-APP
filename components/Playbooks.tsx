import React, { useState } from 'react';
import { Playbook, Account, PlaybookTaskTemplate } from '../types';

interface PlaybooksProps {
  playbooks: Playbook[];
  accounts: Account[];
  onApplyPlaybook: (playbook: Playbook, accountId: string) => void;
  onAddPlaybook?: (playbook: Playbook) => void;
  onUpdatePlaybook?: (playbook: Playbook) => void;
  onDeletePlaybook?: (id: string) => void;
  readonly?: boolean;
}

const Playbooks: React.FC<PlaybooksProps> = ({ 
  playbooks = [], // BLINDAGEM: Fallback para lista nula
  accounts = [],  // BLINDAGEM: Fallback para lista nula
  onApplyPlaybook, 
  onAddPlaybook, 
  onUpdatePlaybook, 
  onDeletePlaybook, 
  readonly 
}) => {
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
  const [targetAccount, setTargetAccount] = useState('');

  // States para Formulário
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTrigger, setFormTrigger] = useState('');
  const [formTasks, setFormTasks] = useState<PlaybookTaskTemplate[]>([]);

  // BLINDAGEM: Garantia de dados limpos ao abrir formulário
  const handleOpenForm = (pb?: Playbook) => {
    if (pb) {
      setEditingId(pb.id || null);
      setFormTitle(pb.title || '');
      setFormDesc(pb.description || '');
      setFormTrigger(pb.trigger || '');
      setFormTasks([...(pb.tasks || [])]);
    } else {
      setEditingId(null);
      setFormTitle('');
      setFormDesc('');
      setFormTrigger('');
      setFormTasks([]);
    }
    setIsEditing(true);
  };

  const handleApply = () => {
    if (selectedPlaybook && targetAccount) {
      onApplyPlaybook(selectedPlaybook, targetAccount);
      setTargetAccount('');
      setSelectedPlaybook(null);
      alert('Playbook iniciado com sucesso! As atividades foram geradas na conta selecionada.');
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este Playbook permanentemente?')) {
      if (onDeletePlaybook) onDeletePlaybook(id);
      if (selectedPlaybook?.id === id) setSelectedPlaybook(null);
    }
  };

  const handleSave = () => {
    if (!formTitle.trim()) return alert("O título do Playbook é obrigatório.");
    if (formTasks.length === 0) return alert("Adicione pelo menos uma tarefa ao modelo.");

    const payload: Playbook = {
      id: editingId || `pb-${Math.random().toString(36).substr(2, 6)}`,
      title: formTitle,
      description: formDesc,
      trigger: formTrigger,
      tasks: formTasks || []
    };

    if (editingId && onUpdatePlaybook) {
      onUpdatePlaybook(payload);
      if (selectedPlaybook?.id === editingId) setSelectedPlaybook(payload);
    } else if (!editingId && onAddPlaybook) {
      onAddPlaybook(payload);
    }

    setIsEditing(false);
  };

  const addTask = () => {
    setFormTasks([...formTasks, { title: '', category: 'Adoption', urgency: 'média', daysDue: 0 }]);
  };

  const removeTask = (idx: number) => {
    setFormTasks(formTasks.filter((_, i) => i !== idx));
  };

  const updateTask = (idx: number, field: keyof PlaybookTaskTemplate, value: any) => {
    setFormTasks(formTasks.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const inputStyle = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-sm";
  const labelStyle = "text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1";

  // Variáveis seguras para renderização
  const safePlaybooks = playbooks || [];
  const safeAccounts = accounts || [];

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Biblioteca de Playbooks</h2>
          <p className="text-slate-500 font-medium">Padronize seus processos de Customer Success.</p>
        </div>
        {!readonly && (
          <button 
            onClick={() => handleOpenForm()}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center space-x-2 whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            <span>Novo Playbook</span>
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de Playbooks Blindada */}
        <div className="lg:col-span-1 space-y-4">
          {safePlaybooks.length === 0 ? (
             <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400 italic bg-white/50">
               Nenhum playbook cadastrado.
             </div>
          ) : (
            safePlaybooks.map(pb => (
              <div 
                key={pb.id}
                onClick={() => setSelectedPlaybook(pb)}
                className={`p-6 rounded-3xl border transition-all cursor-pointer group ${selectedPlaybook?.id === pb.id ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-500/30' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'}`}
              >
                <h3 className={`font-black text-lg ${selectedPlaybook?.id === pb.id ? 'text-white' : 'text-slate-900'}`}>{pb.title || 'Sem título'}</h3>
                <p className={`text-xs mt-2 font-medium line-clamp-2 leading-relaxed ${selectedPlaybook?.id === pb.id ? 'text-blue-100' : 'text-slate-500'}`}>{pb.description || 'Sem descrição.'}</p>
                <div className={`mt-4 pt-4 border-t ${selectedPlaybook?.id === pb.id ? 'border-white/20' : 'border-slate-100'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${selectedPlaybook?.id === pb.id ? 'text-blue-200' : 'text-slate-400'}`}>Gatilho Sugerido</p>
                  <p className={`text-xs font-bold truncate ${selectedPlaybook?.id === pb.id ? 'text-white' : 'text-slate-700'}`}>{pb.trigger || 'Manual'}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detalhes Blindados */}
        <div className="lg:col-span-2">
           {selectedPlaybook ? (
             <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden sticky top-6 animate-in fade-in duration-300">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                   <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-100 px-2.5 py-1 rounded-full">Modelo Operacional</span>
                        <h2 className="text-3xl font-black text-slate-900 mt-3 tracking-tight">{selectedPlaybook.title}</h2>
                      </div>
                      {!readonly && (
                        <div className="flex space-x-2">
                           <button onClick={() => handleOpenForm(selectedPlaybook)} className="bg-white border border-slate-200 p-3 rounded-2xl text-slate-400 hover:text-blue-600 transition-all shadow-sm">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                           </button>
                           <button onClick={() => handleDelete(selectedPlaybook.id)} className="bg-white border border-slate-200 p-3 rounded-2xl text-slate-400 hover:text-red-500 transition-all shadow-sm">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                           </button>
                        </div>
                      )}
                   </div>
                </div>
                
                <div className="p-8">
                   <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Plano de Atividades Geradas:</h4>
                   <div className="space-y-4">
                      {(selectedPlaybook.tasks || []).length === 0 ? (
                        <p className="text-sm text-slate-400 italic">Este playbook não possui tarefas cadastradas.</p>
                      ) : (
                        selectedPlaybook.tasks.map((task, idx) => (
                          <div key={idx} className="flex items-center p-5 bg-slate-50 rounded-[24px] border border-slate-100">
                             <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-slate-500 mr-4 shadow-sm">
                               {idx + 1}
                             </div>
                             <div className="flex-1">
                                <p className="font-bold text-slate-800 text-sm">{task.title || 'Tarefa sem título'}</p>
                                <div className="flex items-center space-x-3 mt-1.5">
                                   <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${task.urgency === 'alta' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>{task.urgency || 'média'}</span>
                                   <span className="text-[10px] font-bold text-slate-400">Prazo: +{Number(task.daysDue) || 0} dias</span>
                                   <span className="text-[10px] font-bold text-slate-400">• {task.category || 'Geral'}</span>
                                </div>
                             </div>
                          </div>
                        ))
                      )}
                   </div>

                   <div className="mt-10 pt-10 border-t border-slate-100 bg-slate-50/30 -mx-8 px-8 pb-8">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Vincular e Executar na conta:</label>
                      <div className="flex flex-col md:flex-row gap-4">
                         <select 
                           value={targetAccount} 
                           onChange={e => setTargetAccount(e.target.value)}
                           className="flex-1 bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 shadow-sm"
                           disabled={readonly}
                         >
                            <option value="">Selecione um cliente...</option>
                            {safeAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                         </select>
                         <button 
                           onClick={handleApply}
                           disabled={!targetAccount || readonly}
                           className={`px-10 py-4 rounded-2xl font-black text-xs uppercase shadow-xl transition-all active:scale-95 ${!targetAccount || readonly ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                         >
                           Disparar Atividades
                         </button>
                      </div>
                   </div>
                </div>
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 rounded-[40px] text-slate-400 bg-slate-50/50 min-h-[450px]">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                  <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                </div>
                <p className="font-black text-xl text-slate-900">Selecione um Playbook</p>
                <p className="text-sm mt-3 max-w-xs font-medium leading-relaxed">Escolha um processo operacional ao lado ou crie um novo para escalar sua operação.</p>
             </div>
           )}
        </div>
      </div>

      {/* MODAL BLINDADO */}
      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[110] p-6 animate-in fade-in duration-300">
           <div className="bg-white rounded-[48px] w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                 <h3 className="text-3xl font-black text-slate-900 tracking-tight">{editingId ? 'Refinar Playbook' : 'Desenhar Novo Playbook'}</h3>
                 <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-900 p-2 transition-colors">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>

              <div className="p-10 space-y-8 overflow-y-auto bg-[#fafafa]">
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1">
                       <label className={labelStyle}>Nome do Processo</label>
                       <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} className={inputStyle} placeholder="Ex: Onboarding High-Touch" />
                    </div>
                    <div className="space-y-1">
                       <label className={labelStyle}>Gatilho (Trigger)</label>
                       <input type="text" value={formTrigger} onChange={e => setFormTrigger(e.target.value)} className={inputStyle} placeholder="Ex: Churn Risk Identificado" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className={labelStyle}>Descrição Estratégica</label>
                    <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} className={`${inputStyle} h-24 font-normal`} placeholder="Descreva o propósito deste playbook..." />
                 </div>

                 <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                       <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Fluxo de Tarefas</h4>
                       <button onClick={addTask} className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-all border border-blue-100">+ Adicionar Tarefa</button>
                    </div>

                    <div className="space-y-4">
                       {formTasks.length === 0 ? (
                          <p className="text-center text-slate-400 text-xs italic py-8 border-2 border-dashed border-slate-100 rounded-3xl">Nenhuma tarefa definida. O playbook precisa de pelo menos uma ação.</p>
                       ) : (
                         formTasks.map((task, idx) => (
                          <div key={idx} className="bg-slate-50/50 p-5 rounded-3xl border border-slate-200 relative group animate-in slide-in-from-top-2">
                             <button onClick={() => removeTask(idx)} className="absolute -top-2 -right-2 bg-white text-slate-300 hover:text-red-500 p-1.5 rounded-full border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                             </button>
                             
                             <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                <div className="md:col-span-1 flex justify-center pt-3">
                                   <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">{idx + 1}</div>
                                </div>
                                <div className="md:col-span-11 grid grid-cols-1 md:grid-cols-4 gap-4">
                                   <div className="md:col-span-2 space-y-1">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase">Título da Ação</label>
                                      <input type="text" value={task.title} onChange={e => updateTask(idx, 'title', e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold outline-none focus:border-blue-500 shadow-sm" />
                                   </div>
                                   <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase">Categoria</label>
                                      <select value={task.category} onChange={e => updateTask(idx, 'category', e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold outline-none shadow-sm">
                                         <option value="Adoption">Adoção</option><option value="Expansion">Expansão</option><option value="Cross-Sell">Cross-Sell</option>
                                      </select>
                                   </div>
                                   <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase">Urgência</label>
                                      <select value={task.urgency} onChange={e => updateTask(idx, 'urgency', e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold outline-none shadow-sm">
                                         <option value="alta">Alta</option><option value="média">Média</option><option value="baixa">Baixa</option>
                                      </select>
                                   </div>
                                   <div className="md:col-span-1 space-y-1">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase">Prazo (+ dias)</label>
                                      <input type="number" value={task.daysDue} onChange={e => updateTask(idx, 'daysDue', Number(e.target.value))} className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold outline-none shadow-sm" />
                                   </div>
                                   <div className="md:col-span-3 space-y-1">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase">Instruções para o CSM</label>
                                      <input type="text" value={task.notesTemplate || ''} onChange={e => updateTask(idx, 'notesTemplate', e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-medium outline-none shadow-sm" placeholder="Procedimento padrão..." />
                                   </div>
                                </div>
                             </div>
                          </div>
                         ))
                       )}
                    </div>
                 </div>
              </div>

              <div className="p-10 border-t border-slate-100 flex gap-6 bg-white sticky bottom-0">
                 <button onClick={() => setIsEditing(false)} className="flex-1 py-5 text-xs font-black text-slate-400 uppercase border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all">Cancelar</button>
                 <button onClick={handleSave} className="flex-[2] py-5 text-xs font-black text-white bg-blue-600 rounded-2xl shadow-2xl shadow-blue-500/30 hover:bg-blue-700 transition-all">Salvar Playbook Estratégico</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Playbooks;