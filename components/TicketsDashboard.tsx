import React, { useState, useMemo } from 'react';
import { Account, TicketRecord, TicketStatus, TicketPriority } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TicketsDashboardProps {
  tickets: TicketRecord[];
  accounts: Account[];
  onImportTickets: (tickets: TicketRecord[]) => void;
  readonly?: boolean;
}

const TicketsDashboard: React.FC<TicketsDashboardProps> = ({ 
  tickets = [], 
  accounts = [], 
  onImportTickets, 
  readonly 
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [csvText, setCsvText] = useState('');
  
  // Filtros
  const [filterAccount, setFilterAccount] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // BLINDAGEM 1: Cálculos de KPI protegidos contra nulos
  const safeTickets = tickets || [];
  const safeAccounts = accounts || [];

  const openTickets = safeTickets.filter(t => t && (t.status === 'Open' || t.status === 'Pending')).length;
  const criticalTickets = safeTickets.filter(t => t && t.priority === 'Critical' && (t.status === 'Open' || t.status === 'Pending')).length;
  
  // BLINDAGEM 2: Dados para Gráfico com inicialização segura
  const chartData = useMemo(() => {
    const counts: Record<string, number> = { Open: 0, Pending: 0, Resolved: 0, Closed: 0 };
    safeTickets.forEach(t => {
      if (t && t.status && counts[t.status] !== undefined) {
        counts[t.status]++;
      }
    });
    return Object.keys(counts).map(key => ({ 
      name: key, 
      count: Number(counts[key]) || 0 
    }));
  }, [safeTickets]);

  // BLINDAGEM 3: Lista Filtrada com busca segura de conta
  const filteredTickets = useMemo(() => {
    return safeTickets.filter(t => {
      if (!t) return false;
      const account = safeAccounts.find(a => a.id === t.accountId);
      const accountName = account?.name || 'Conta Removida';
      
      const matchAcc = filterAccount ? accountName.toLowerCase().includes(filterAccount.toLowerCase()) : true;
      const matchStatus = filterStatus !== 'all' ? t.status === filterStatus : true;
      
      return matchAcc && matchStatus;
    }).sort((a, b) => {
      const dateA = a.openedAt ? new Date(a.openedAt).getTime() : 0;
      const dateB = b.openedAt ? new Date(b.openedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [safeTickets, safeAccounts, filterAccount, filterStatus]);

  const handleProcessImport = () => {
    const lines = (csvText || '').split('\n');
    const newTickets: TicketRecord[] = [];

    lines.forEach(line => {
      const cols = line.split(';');
      if (cols.length >= 7) {
        const extId = cols[0].trim();
        const accName = cols[1].trim();
        const subject = cols[2].trim();
        const type = (cols[3]?.trim() as any) || 'Issue';
        const status = (cols[4]?.trim() as TicketStatus) || 'Open';
        const priority = (cols[5]?.trim() as TicketPriority) || 'Medium';
        const openedAt = cols[6]?.trim() || new Date().toISOString();
        const closedAt = cols[7]?.trim() || undefined;

        const acc = safeAccounts.find(a => (a.name || '').toLowerCase() === accName.toLowerCase());
        if (acc) {
          newTickets.push({
            id: `tick-${Math.random().toString(36).substr(2, 9)}`,
            externalId: extId,
            accountId: acc.id,
            subject: subject || 'Sem Assunto',
            type,
            status,
            priority,
            openedAt,
            closedAt
          });
        }
      }
    });

    if (newTickets.length > 0) {
      onImportTickets(newTickets);
      setCsvText('');
      setIsImporting(false);
      alert(`${newTickets.length} tickets importados com sucesso.`);
    } else {
      alert("Nenhum ticket válido encontrado. Verifique o formato e se o nome da conta existe no sistema.");
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Open': return 'bg-red-100 text-red-700';
      case 'Pending': return 'bg-amber-100 text-amber-700';
      case 'Resolved': return 'bg-green-100 text-green-700';
      case 'Closed': return 'bg-slate-100 text-slate-500';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
           <h2 className="text-3xl font-black text-slate-900 tracking-tight">Suporte & Tickets</h2>
           <p className="text-slate-500 font-medium">Monitoramento de incidentes e qualidade de serviço.</p>
        </div>
        {!readonly && (
          <button 
            onClick={() => setIsImporting(true)}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center space-x-2 text-xs uppercase"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            <span>Importar Tickets (CSV)</span>
          </button>
        )}
      </div>

      {/* KPI Cards Blindados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tickets Abertos</p>
            <p className="text-4xl font-black text-red-600 mt-2">{openTickets}</p>
         </div>
         <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Críticos (Abertos)</p>
            <p className="text-4xl font-black text-slate-900 mt-2">{criticalTickets}</p>
         </div>
         <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Importado</p>
            <p className="text-4xl font-black text-blue-600 mt-2">{safeTickets.length}</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Gráfico Blindado */}
         <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-80">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Volume por Status</h3>
            {chartData.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    <YAxis hide />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === 'Open' ? '#ef4444' : entry.name === 'Resolved' ? '#22c55e' : '#cbd5e1'} />
                      ))}
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 italic text-xs">Sem dados para exibir.</div>
            )}
         </div>

         {/* Lista Detalhada Blindada */}
         <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-80">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Monitor de Incidentes</h3>
               <div className="flex gap-2">
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black uppercase outline-none focus:border-blue-500">
                     <option value="all">Todos Status</option>
                     <option value="Open">Abertos</option>
                     <option value="Resolved">Resolvidos</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Filtrar Cliente..." 
                    value={filterAccount}
                    onChange={e => setFilterAccount(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black uppercase outline-none focus:border-blue-500"
                  />
               </div>
            </div>
            <div className="overflow-y-auto flex-1">
               <table className="w-full text-left">
                  <thead className="bg-white sticky top-0 border-b border-slate-100">
                     <tr>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase">Abertura</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase">Cliente</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase">Assunto</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase">Prioridade</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase text-right">Status</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {filteredTickets.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400 italic text-xs">Nenhum ticket encontrado.</td></tr>
                     ) : (
                        filteredTickets.map(t => (
                           <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-[10px] font-bold text-slate-500">
                                {t.openedAt ? (t.openedAt.includes('-') ? t.openedAt.split('-').reverse().join('/') : t.openedAt) : '—'}
                              </td>
                              <td className="px-4 py-3 text-xs font-bold text-slate-800">
                                {safeAccounts.find(a => a.id === t.accountId)?.name || 'Conta Removida'}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-600 truncate max-w-[150px]">{t.subject || 'Sem Assunto'}</td>
                              <td className="px-4 py-3">
                                 <span className={`text-[9px] font-black uppercase ${t.priority === 'Critical' ? 'text-red-600' : 'text-slate-400'}`}>{t.priority || 'Medium'}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                 <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${getStatusColor(t.status || 'Open')}`}>{t.status || 'Open'}</span>
                              </td>
                           </tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </div>

      {/* Modal Importação Blindado */}
      {isImporting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-6">
           <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">Importar Tickets</h3>
                 <button onClick={() => setIsImporting(false)} className="text-slate-400 hover:text-slate-600 p-2">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
              <div className="p-8 space-y-4">
                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                    <p className="font-bold mb-1">Formato CSV (ponto e vírgula):</p>
                    <code className="block bg-white p-2 rounded border border-blue-100 text-[10px] font-mono">
                       ID;Conta;Assunto;Tipo;Status;Prioridade;Abertura;Fechamento
                    </code>
                 </div>
                 <textarea 
                   value={csvText} 
                   onChange={e => setCsvText(e.target.value)} 
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono h-48 focus:border-blue-500 outline-none"
                   placeholder="T-101;Bombril;Erro Login;Bug;Open;Critical;2024-05-20;"
                 />
              </div>
              <div className="p-8 flex gap-4 border-t border-slate-100">
                 <button onClick={() => setIsImporting(false)} className="flex-1 py-4 text-xs font-black text-slate-400 uppercase border border-slate-200 rounded-2xl hover:bg-slate-50">Cancelar</button>
                 <button onClick={handleProcessImport} className="flex-[2] py-4 text-xs font-black text-white bg-blue-600 rounded-2xl shadow-xl hover:bg-blue-700">Processar Tickets</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default TicketsDashboard;