
import React, { useState, useEffect } from 'react';
import { Account, AccountSegment } from '../types';
import { fetchWithRetry } from '../src/utils/api';

interface AccountsListProps {
  accounts: Account[];
  segments: AccountSegment[];
  isAdmin: boolean;
  onSelectAccount: (acc: Account) => void;
  onUpdateAccount: (acc: Account) => void;
  onAddAccount: (acc: Account) => void;
  onDeleteAccount: (id: string, callback: () => void) => Promise<void>;
}

const AccountsList: React.FC<AccountsListProps> = ({ accounts, segments, isAdmin, onSelectAccount, onUpdateAccount, onAddAccount, onDeleteAccount }) => {
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingAccountId(id);
    onDeleteAccount(id, () => setDeletingAccountId(null));
  };
  
  // States para Nova Conta
  const [isAdding, setIsAdding] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccCnpj, setNewAccCnpj] = useState('');
  const [newAccSegment, setNewAccSegment] = useState('');

  useEffect(() => {
    if (segments.length > 0 && !newAccSegment) {
      setNewAccSegment(segments[0].name);
    }
  }, [segments]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    if (dateStr.includes('/')) return dateStr;
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleQuickEdit = (e: React.MouseEvent, acc: Account) => {
    e.stopPropagation();
    setEditingAccount(acc);
  };

  const saveEdit = () => {
    if (editingAccount) {
      onUpdateAccount(editingAccount);
      setEditingAccount(null);
    }
  };

  const handleCreateAccount = () => {
    if (!newAccName) return;
    
    // Encontrar o objeto do segmento selecionado
    const selectedSegmentObj = segments.find(s => s.name === newAccSegment);

    const newAccount: Account = {
        id: `acc-${Math.random().toString(36).substr(2, 6)}`,
        name: newAccName,
        cnpj: newAccCnpj,
        segment: newAccSegment,
        segmentId: selectedSegmentObj?.id, // Send ID if available
        products: [],
        activities: [],
        vocPendente: 0
    };

    onAddAccount(newAccount);
    setIsAdding(false);
    setNewAccName('');
    setNewAccCnpj('');
    if (segments.length > 0) setNewAccSegment(segments[0].name);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Contas Ativas</h1>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95"
        >
          + Nova Conta
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map(acc => {
          const totalMRR = (acc.products || []).reduce((s, p) => s + p.mrr, 0);
          const totalMrrObjetivo = (acc.products || []).reduce((s, p) => s + p.mrrObjetivo, 0);
          const gap = totalMRR - totalMrrObjetivo;
          const dataObjetivo = (acc.products || []).length > 0 ? acc.products[0].dataPrevistaMRRObjetivo : '';

          return (
            <div key={acc.id} onClick={() => onSelectAccount(acc)} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group relative">
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-xl font-black text-slate-800 group-hover:text-blue-600 truncate flex-1">{acc.name}</h3>
                <div className="flex items-center space-x-2">
                  <button onClick={(e) => handleQuickEdit(e, acc)} className="p-1.5 bg-slate-50 rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-all opacity-0 group-hover:opacity-100">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={(e) => handleDeleteClick(e, acc.id)} 
                      className="p-1.5 bg-slate-50 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      disabled={deletingAccountId === acc.id}
                    >
                      {deletingAccountId === acc.id ? (
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      )}
                    </button>
                  )}
                  <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-[10px] font-black text-slate-400 uppercase">{(acc.products || [])[0]?.healthScore || 0} HP</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{acc.segment}</p>
              
              <div className="mt-6 grid grid-cols-2 gap-y-4 gap-x-2">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">MRR Atual</p>
                   <p className="text-lg font-black text-slate-900">R$ {totalMRR.toLocaleString()}</p>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">MRR Objetivo</p>
                   <p className="text-lg font-black text-slate-600">R$ {totalMrrObjetivo.toLocaleString()}</p>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">GAP MRR</p>
                   <p className={`text-lg font-black ${gap < 0 ? 'text-red-500' : 'text-green-500'}`}>
                     R$ {gap.toLocaleString()}
                   </p>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Data Objetivo</p>
                   <p className="text-sm font-bold text-slate-500">{formatDate(dataObjetivo)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editingAccount && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-6">
           <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">Editar Conta</h3>
                 <button onClick={() => setEditingAccount(null)} className="text-slate-400 hover:text-slate-600">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
              <div className="p-8 space-y-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome</label>
                    <input type="text" value={editingAccount.name} onChange={e => setEditingAccount({...editingAccount, name: e.target.value})} className="w-full bg-white border border-slate-300 p-3 rounded-xl focus:border-blue-500 outline-none text-sm font-bold text-slate-900" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CNPJ</label>
                    <input type="text" value={editingAccount.cnpj || ''} onChange={e => setEditingAccount({...editingAccount, cnpj: e.target.value})} className="w-full bg-white border border-slate-300 p-3 rounded-xl focus:border-blue-500 outline-none text-sm font-bold text-slate-900" placeholder="00.000.000/0000-00" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Segmento</label>
                    <select 
                      value={editingAccount.segment} 
                      onChange={e => {
                        const newName = e.target.value;
                        const segObj = segments.find(s => s.name === newName);
                        setEditingAccount({
                          ...editingAccount, 
                          segment: newName,
                          segmentId: segObj?.id
                        });
                      }} 
                      className="w-full bg-white border border-slate-300 p-3 rounded-xl focus:border-blue-500 outline-none text-sm font-bold text-slate-900"
                    >
                       {segments.map(seg => (
                         <option key={seg.id} value={seg.name}>{seg.name}</option>
                       ))}
                       {segments.length === 0 && <option value="Enterprise">Enterprise</option>}
                    </select>
                 </div>
              </div>
              <div className="p-8 flex gap-4">
                 <button onClick={() => setEditingAccount(null)} className="flex-1 py-4 text-xs font-black text-slate-400 uppercase border border-slate-200 rounded-2xl">Cancelar</button>
                 <button onClick={saveEdit} className="flex-1 py-4 text-xs font-black text-white bg-blue-600 rounded-2xl">Salvar</button>
              </div>
           </div>
        </div>
      )}

      {/* Modal Nova Conta */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-6">
           <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">Nova Conta</h3>
                 <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
              <div className="p-8 space-y-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome da Empresa</label>
                    <input 
                      type="text" 
                      value={newAccName} 
                      onChange={e => setNewAccName(e.target.value)} 
                      className="w-full bg-white border border-slate-300 p-3 rounded-xl focus:border-blue-500 outline-none text-sm font-bold text-slate-900"
                      placeholder="Ex: Acme Corp"
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CNPJ</label>
                    <input 
                      type="text" 
                      value={newAccCnpj} 
                      onChange={e => setNewAccCnpj(e.target.value)} 
                      className="w-full bg-white border border-slate-300 p-3 rounded-xl focus:border-blue-500 outline-none text-sm font-bold text-slate-900"
                      placeholder="00.000.000/0000-00"
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Segmento</label>
                    <select value={newAccSegment} onChange={e => setNewAccSegment(e.target.value)} className="w-full bg-white border border-slate-300 p-3 rounded-xl focus:border-blue-500 outline-none text-sm font-bold text-slate-900">
                       {segments.map(seg => (
                         <option key={seg.id} value={seg.name}>{seg.name}</option>
                       ))}
                       {segments.length === 0 && <option value="Enterprise">Enterprise</option>}
                    </select>
                 </div>
              </div>
              <div className="p-8 flex gap-4">
                 <button onClick={() => setIsAdding(false)} className="flex-1 py-4 text-xs font-black text-slate-400 uppercase border border-slate-200 rounded-2xl">Cancelar</button>
                 <button onClick={handleCreateAccount} className="flex-1 py-4 text-xs font-black text-white bg-blue-600 rounded-2xl shadow-xl hover:bg-blue-700">Criar Conta</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AccountsList;
