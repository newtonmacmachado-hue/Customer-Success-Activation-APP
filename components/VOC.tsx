
import React, { useState } from 'react';
import { Meeting, Account, Product, VOCStatus, VOCUrgency, VOCType } from '../types';

interface VOCProps {
  meetings: Meeting[];
  accounts: Account[];
  product: Product | null;
  onUpdateMeeting?: (m: Meeting) => void;
}

const VOC: React.FC<VOCProps> = ({ meetings, accounts, product, onUpdateMeeting }) => {
  const [editingVoc, setEditingVoc] = useState<Meeting | null>(null);

  // Filtros Globais
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Estados locais para edição rápida (Modal)
  const [formDetailed, setFormDetailed] = useState('');
  const [formType, setFormType] = useState<VOCType>(VOCType.OTHER);
  const [formUrgency, setFormUrgency] = useState<VOCUrgency>(VOCUrgency.MEDIUM);
  const [formStatus, setFormStatus] = useState<VOCStatus>(VOCStatus.PENDING);

  // Filtragem dos dados
  const filteredMeetings = meetings
    .filter(m => {
      // Deve ter VOC detalhado
      if (!m.vocDetailed) return false;
      // Filtro de produto (se vier de uma prop de contexto, geralmente null na view global)
      if (product && m.productId !== product.id) return false;
      
      // Filtros de UI
      if (filterAccount !== 'all' && m.accountId !== filterAccount) return false;
      if (filterType !== 'all' && m.vocType !== filterType) return false;
      if (filterUrgency !== 'all' && m.vocUrgency !== filterUrgency) return false;
      if (filterStatus !== 'all' && m.vocStatus !== filterStatus) return false;

      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getUrgencyColor = (urgency?: VOCUrgency) => {
    switch (urgency) {
      case VOCUrgency.CRITICAL: return 'bg-red-500 text-white';
      case VOCUrgency.HIGH: return 'bg-orange-500 text-white';
      case VOCUrgency.MEDIUM: return 'bg-blue-500 text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  const handleEdit = (m: Meeting) => {
    setEditingVoc(m);
    setFormDetailed(m.vocDetailed || '');
    setFormType(m.vocType || VOCType.OTHER);
    setFormUrgency(m.vocUrgency || VOCUrgency.MEDIUM);
    setFormStatus(m.vocStatus || VOCStatus.PENDING);
  };

  const handleSave = () => {
    if (editingVoc && onUpdateMeeting) {
      onUpdateMeeting({
        ...editingVoc,
        vocDetailed: formDetailed,
        vocType: formType,
        vocUrgency: formUrgency,
        vocStatus: formStatus
      });
      setEditingVoc(null);
    }
  };

  // Styles
  const filterSelectClass = "bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all min-w-[140px]";

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Voice of Customer</h2>
          <p className="text-slate-500 font-medium">Gestão centralizada de feedbacks, bugs e sugestões.</p>
        </div>
        <div className="flex space-x-4">
           <div className="bg-orange-50 px-4 py-2 rounded-xl border border-orange-100 text-center">
              <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Abertos</p>
              <p className="text-2xl font-black text-orange-600">
                {meetings.filter(m => m.vocDetailed && m.vocStatus !== VOCStatus.RESOLVED && m.vocStatus !== VOCStatus.CLOSED).length}
              </p>
           </div>
        </div>
      </header>

      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Filtros:</span>
        </div>
        
        <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className={filterSelectClass}>
           <option value="all">Todas as Contas</option>
           {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
        </select>

        <select value={filterType} onChange={e => setFilterType(e.target.value)} className={filterSelectClass}>
           <option value="all">Todos os Tipos</option>
           {Object.values(VOCType).map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)} className={filterSelectClass}>
           <option value="all">Todas as Prioridades</option>
           {Object.values(VOCUrgency).map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={filterSelectClass}>
           <option value="all">Todos os Status</option>
           {Object.values(VOCStatus).map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        {(filterAccount !== 'all' || filterType !== 'all' || filterUrgency !== 'all' || filterStatus !== 'all') && (
          <button 
            onClick={() => { setFilterAccount('all'); setFilterType('all'); setFilterUrgency('all'); setFilterStatus('all'); }}
            className="text-xs font-bold text-red-400 hover:text-red-600 underline"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="space-y-6">
        {filteredMeetings.length === 0 ? (
          <div className="p-20 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
            <p className="text-slate-400 font-medium italic">Nenhum VOC encontrado com os filtros selecionados.</p>
          </div>
        ) : (
          filteredMeetings.map((m) => (
            <div key={m.id} className="relative pl-8 border-l-2 border-slate-100 pb-8 last:pb-0 group">
               <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full border-4 border-white shadow-sm ${
                 m.vocStatus === VOCStatus.RESOLVED ? 'bg-green-500' : 'bg-orange-400'
               }`}></div>
               
               <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative">
                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEdit(m)}
                      className="text-slate-300 hover:text-blue-500 bg-slate-50 p-2 rounded-lg"
                      title="Editar VOC"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                  </div>

                  <div className="flex justify-between items-start mb-6">
                     <div className="space-y-1">
                        <div className="flex items-center space-x-3 mb-1">
                           <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{m.date.split('-').reverse().join('/')}</span>
                           <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase ${getUrgencyColor(m.vocUrgency)}`}>
                             {m.vocUrgency}
                           </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">{m.accountName} · <span className="text-slate-500 text-sm font-medium">{m.productName || 'Geral'}</span></h3>
                     </div>
                     <div className="flex flex-col items-end space-y-2 mr-10">
                        <span className="px-3 py-1 bg-slate-100 text-slate-700 text-[10px] font-black rounded-full uppercase border border-slate-200">
                          {m.vocType}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                          m.vocStatus === VOCStatus.RESOLVED ? 'bg-green-100 text-green-700' : 
                          m.vocStatus === VOCStatus.CLOSED ? 'bg-slate-100 text-slate-500' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {m.vocStatus}
                        </span>
                     </div>
                  </div>
                  
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 italic text-slate-700 font-medium relative">
                    <span className="absolute top-2 left-2 text-3xl text-slate-200 leading-none">“</span>
                    {m.vocDetailed}
                    <span className="absolute bottom-2 right-2 text-3xl text-slate-200 leading-none">”</span>
                  </div>
               </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Edição de VOC */}
      {editingVoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-6">
           <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">Editar VOC</h3>
                 <button onClick={() => setEditingVoc(null)} className="text-slate-400 hover:text-slate-600">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
              <div className="p-8 space-y-4">
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                    <p className="text-xs font-bold text-slate-700 mb-1">{editingVoc.accountName}</p>
                    <p className="text-[10px] text-slate-400 uppercase">Ref. Reunião: {editingVoc.date}</p>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Feedback Detalhado</label>
                    <textarea 
                      value={formDetailed} 
                      onChange={e => setFormDetailed(e.target.value)} 
                      className="w-full bg-white border border-slate-300 p-3 rounded-xl h-24 focus:border-blue-500 outline-none text-sm font-bold text-slate-900" 
                    />
                 </div>
                 <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo</label>
                       <select value={formType} onChange={e => setFormType(e.target.value as VOCType)} className="w-full bg-white border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900">
                          {Object.values(VOCType).map(v => <option key={v} value={v}>{v}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Urgência</label>
                       <select value={formUrgency} onChange={e => setFormUrgency(e.target.value as VOCUrgency)} className="w-full bg-white border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900">
                          {Object.values(VOCUrgency).map(v => <option key={v} value={v}>{v}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</label>
                       <select value={formStatus} onChange={e => setFormStatus(e.target.value as VOCStatus)} className="w-full bg-white border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900">
                          {Object.values(VOCStatus).map(v => <option key={v} value={v}>{v}</option>)}
                       </select>
                    </div>
                 </div>
              </div>
              <div className="p-8 flex gap-4">
                 <button onClick={() => setEditingVoc(null)} className="flex-1 py-4 text-xs font-black text-slate-400 uppercase border border-slate-200 rounded-2xl">Cancelar</button>
                 <button onClick={handleSave} className="flex-1 py-4 text-xs font-black text-white bg-blue-600 rounded-2xl shadow-xl hover:bg-blue-700">Salvar Alterações</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default VOC;
