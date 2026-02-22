
import React, { useState } from 'react';
import { Account, Contact, ContactRole, ContactSentiment } from '../types';

interface StakeholdersProps {
  account: Account;
  onUpdateContacts: (contacts: Contact[]) => void;
  readonly?: boolean;
}

const Stakeholders: React.FC<StakeholdersProps> = ({ account, onUpdateContacts, readonly }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<ContactRole>(ContactRole.USER);
  const [formSentiment, setFormSentiment] = useState<ContactSentiment>(ContactSentiment.NEUTRAL);
  const [formInfluence, setFormInfluence] = useState<'Alto' | 'Médio' | 'Baixo'>('Médio');
    const [formNotes, setFormNotes] = useState('');

  const contacts = account.contacts || [];

  

  const handleEdit = (c: Contact) => {
    setEditingContact(c);
    setFormName(c.name);
    setFormTitle(c.title);
    setFormEmail(c.email);
    setFormPhone(c.phone || '');
    setFormRole(c.role);
    setFormSentiment(c.sentiment);
    setFormInfluence(c.influenceLevel);
    setFormNotes(c.notes || '');
    setIsAdding(true);
  };

  const handleAddNew = () => {
    setEditingContact(null);
    setFormName('');
    setFormTitle('');
    setFormEmail('');
    setFormPhone('');
    setFormRole(ContactRole.USER);
    setFormSentiment(ContactSentiment.NEUTRAL);
    setFormInfluence('Médio');
    setFormNotes('');
    setIsAdding(true);
  };

  const handleSave = () => {
    if (!formName || !formEmail) return alert("Nome e Email obrigatórios");

    const payload: Contact = {
      id: editingContact ? editingContact.id : Math.random().toString(36).substr(2, 9),
      name: formName,
      title: formTitle,
      email: formEmail,
      phone: formPhone,
      role: formRole,
      sentiment: formSentiment,
      influenceLevel: formInfluence,
      notes: formNotes,
      lastInteractionDate: editingContact ? editingContact.lastInteractionDate : new Date().toISOString().split('T')[0]
    };

    let newContacts;
    if (editingContact) {
      newContacts = contacts.map(c => c.id === editingContact.id ? payload : c);
    } else {
      newContacts = [...contacts, payload];
    }

    onUpdateContacts(newContacts);
    setIsAdding(false);
    setEditingContact(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover este contato?')) {
      onUpdateContacts(contacts.filter(c => c.id !== id));
    }
  };

  const getRoleBadgeColor = (role: ContactRole) => {
    switch (role) {
      case ContactRole.DECISION_MAKER: return 'bg-purple-100 text-purple-700 border-purple-200';
      case ContactRole.CHAMPION: return 'bg-green-100 text-green-700 border-green-200';
      case ContactRole.BLOCKER: return 'bg-red-100 text-red-700 border-red-200';
      case ContactRole.INFLUENCER: return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getSentimentIcon = (sentiment: ContactSentiment) => {
    switch (sentiment) {
      case ContactSentiment.POSITIVE: return <span className="text-green-500 text-lg">😊</span>;
      case ContactSentiment.NEUTRAL: return <span className="text-slate-400 text-lg">😐</span>;
      case ContactSentiment.NEGATIVE: return <span className="text-red-500 text-lg">😡</span>;
    }
  };

  const inputStyle = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-sm";
  const labelStyle = "text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1";

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Mapa de Influência</h2>
            <p className="text-slate-500 font-medium">Gestão de stakeholders e análise de sentimento.</p>
          </div>
          {!readonly && (
            <button 
              onClick={handleAddNew}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-blue-700 transition-all active:scale-95"
            >
              + Novo Contato
            </button>
          )}
       </div>

       {!contacts || contacts.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
             <p className="text-slate-400 italic font-medium">Nenhum stakeholder mapeado.</p>
          </div>
       ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {contacts.map(contact => (
                <div key={contact.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative">
                   <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                         <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-sm border border-slate-200">
                            {contact.name.charAt(0)}
                         </div>
                         <div>
                            <h3 className="font-bold text-slate-900 leading-tight">{contact.name}</h3>
                            <p className="text-xs text-slate-500 font-medium">{contact.title}</p>
                         </div>
                      </div>
                      <div className="flex flex-col items-end">
                         {getSentimentIcon(contact.sentiment)}
                      </div>
                   </div>

                   <div className="mb-4">
                      <span className={`inline-block px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${getRoleBadgeColor(contact.role)}`}>
                        {contact.role}
                      </span>
                   </div>

                   <div className="space-y-2 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl">
                      <div className="flex items-center space-x-2">
                         <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                         <span className="truncate">{contact.email}</span>
                      </div>
                      {contact.phone && (
                        <div className="flex items-center space-x-2">
                           <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                           <span>{contact.phone}</span>
                        </div>
                      )}
                   </div>
                   
                   <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="flex items-center space-x-1">
                         <span className="text-[9px] font-black text-slate-400 uppercase">Influência:</span>
                         <div className="flex space-x-0.5">
                            {[1, 2, 3].map(i => {
                              const level = contact.influenceLevel === 'Alto' ? 3 : contact.influenceLevel === 'Médio' ? 2 : 1;
                              return <div key={i} className={`w-1.5 h-3 rounded-sm ${i <= level ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
                            })}
                         </div>
                      </div>
                      {!readonly && (
                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => handleEdit(contact)} className="text-slate-400 hover:text-blue-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                           </button>
                           <button onClick={() => handleDelete(contact.id)} className="text-slate-400 hover:text-red-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                           </button>
                        </div>
                      )}
                   </div>
                </div>
             ))}
          </div>
       )}

       {/* MODAL EDIT/ADD */}
       {isAdding && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-6">
            <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
               <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingContact ? 'Editar Stakeholder' : 'Novo Stakeholder'}</h3>
                  <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
               </div>
               
               <div className="p-8 space-y-5 bg-slate-50/30">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className={labelStyle}>Nome Completo</label>
                        <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className={inputStyle} />
                     </div>
                     <div className="space-y-1">
                        <label className={labelStyle}>Cargo / Title</label>
                        <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} className={inputStyle} />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className={labelStyle}>E-mail</label>
                        <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className={inputStyle} />
                     </div>
                     <div className="space-y-1">
                        <label className={labelStyle}>Telefone</label>
                        <input type="text" value={formPhone} onChange={e => setFormPhone(e.target.value)} className={inputStyle} placeholder="(xx) xxxx-xxxx" />
                     </div>
                  </div>

                  <div className="space-y-1">
                     <label className={labelStyle}>Papel na Conta</label>
                     <select value={formRole} onChange={e => setFormRole(e.target.value as ContactRole)} className={inputStyle}>
                        {Object.values(ContactRole).map(r => <option key={r} value={r}>{r}</option>)}
                     </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className={labelStyle}>Sentimento</label>
                        <select value={formSentiment} onChange={e => setFormSentiment(e.target.value as ContactSentiment)} className={inputStyle}>
                           {Object.values(ContactSentiment).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                     </div>
                     <div className="space-y-1">
                        <label className={labelStyle}>Nível de Influência</label>
                        <select value={formInfluence} onChange={e => setFormInfluence(e.target.value as any)} className={inputStyle}>
                           <option value="Alto">Alto</option>
                           <option value="Médio">Médio</option>
                           <option value="Baixo">Baixo</option>
                        </select>
                     </div>
                  </div>

                  <div className="space-y-1">
                     <label className={labelStyle}>Notas de Relacionamento</label>
                     <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} className={`${inputStyle} h-24 font-normal`} placeholder="Histórico, preferências, pautas..." />
                  </div>
               </div>

               <div className="p-8 border-t border-slate-100 flex gap-4 bg-white sticky bottom-0">
                  <button onClick={() => setIsAdding(false)} className="flex-1 py-4 text-xs font-black text-slate-400 uppercase border border-slate-200 rounded-2xl hover:bg-slate-50">Cancelar</button>
                  <button onClick={handleSave} className="flex-1 py-4 text-xs font-black text-white bg-blue-600 rounded-2xl shadow-xl hover:bg-blue-700">Salvar</button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};

export default Stakeholders;
