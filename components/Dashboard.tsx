
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { Account, Meeting, Opportunity, Activity, FinancialRecord, TicketRecord } from '../types';

interface DashboardProps {
  accounts: Account[];
  onSelectAccount: (acc: Account) => void;
  meetings: Meeting[];
  opportunities: Opportunity[];
  onNavigateTo: (tab: string) => void;
  financialRecords?: FinancialRecord[];
  ticketRecords?: TicketRecord[];
}

const Dashboard: React.FC<DashboardProps> = ({ accounts = [], onSelectAccount, meetings = [], opportunities = [], onNavigateTo, financialRecords = [], ticketRecords = [] }) => {
  // CORREÇÃO: Removido o "accounts.length === 0". Agora ele só mostra "Carregando" se a variável for estritamente nula/indefinida.
  if (!accounts) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 font-medium">Carregando dados do dashboard...</div>
      </div>
    );
  }

  const [showAlert, setShowAlert] = useState(true);

  // Helper para detectar atividades e reuniões próximas
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parseMeetingDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    if (dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/');
        return new Date(`${y}-${m}-${d}`);
    }
    return new Date(dateStr);
  };

  const nearActivities = accounts.flatMap(a => a.activities || [])
    .filter(act => {
      if (!act || act.status === 'Completed' || !act.dueDate) return false;
      const dueDate = new Date(act.dueDate);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const alertDays = act.alertDays || 1;
      return diffDays >= 0 && diffDays <= alertDays;
    });

  const nearMeetings = meetings.filter(m => {
    if (!m || !m.date) return false;
    const meetingDate = parseMeetingDate(m.date);
    const diffTime = meetingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const reminderDays = m.reminderDays || 0;
    return reminderDays > 0 && diffDays >= 0 && diffDays <= reminderDays;
  });

  // --- LOGICA DE ALERTAS INTELIGENTES ---
  const criticalTickets = useMemo(() => {
    return ticketRecords.filter(t => t.priority === 'Critical' && (t.status === 'Open' || t.status === 'Pending'));
  }, [ticketRecords]);

  const riskFinancials = useMemo(() => {
    const recentRecords = financialRecords.filter(f => f.type === 'Churn' || f.type === 'Contraction');
    return recentRecords.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
  }, [financialRecords]);

  // Cálculos de métricas gerais com programação defensiva (Number() || 0)
  const totalMRR = accounts.reduce((acc, a) => acc + (a.products || []).reduce((pAcc, p) => pAcc + (Number(p.mrr) || 0), 0), 0);
  const totalObjective = accounts.reduce((acc, a) => acc + (a.products || []).reduce((pAcc, p) => pAcc + (Number(p.mrrObjetivo) || 0), 0), 0);
  const mrrGap = totalMRR - totalObjective;
  
  const avgHealthRaw = accounts.reduce((acc, a) => acc + (Number((a.products || [])[0]?.healthScore) || 0), 0) / (accounts.length || 1);
  const avgHealth = Math.round(avgHealthRaw);
  
  const expansionValue = opportunities.reduce((acc, o) => acc + (Number(o.value) || 0), 0);
  const pendingVOC = meetings.filter(m => m.vocDetailed && m.vocStatus !== 'Resolvido').length;

  const attentionRequired = accounts.filter(a => (a.products || []).some(p => (Number(p.healthScore) || 0) < 70));

  const chartData = accounts.map(a => ({
    id: a.id,
    name: a.name || 'Sem Nome',
    health: Number((a.products || [])[0]?.healthScore) || 0,
    original: a
  }));

  const handleBarClick = (data: any) => {
    if (data && data.original) {
      onSelectAccount(data.original);
    }
  };

  const hasAlerts = nearActivities.length > 0 || nearMeetings.length > 0 || criticalTickets.length > 0 || riskFinancials.length > 0;

  return (
    <div className="space-y-6">
      {/* Alerta Superior Combinado */}
      {showAlert && hasAlerts && (
        <div 
          className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative flex flex-col gap-4 animate-in slide-in-from-top-4 duration-300"
        >
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
             <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 animate-pulse">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </div>
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Painel de Alertas Prioritários</h3>
             </div>
             <button onClick={() => setShowAlert(false)} className="text-slate-400 hover:text-slate-600">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {riskFinancials.length > 0 && (
                <div onClick={() => onNavigateTo('financials')} className="cursor-pointer group bg-red-50 p-3 rounded-xl border border-red-100">
                   <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Risco Financeiro (Recente)</p>
                   {riskFinancials.map(r => {
                      const accName = accounts.find(a => a.id === r.accountId)?.name || 'Conta';
                      return (
                        <div key={r.id} className="text-xs font-bold text-red-800 flex justify-between">
                           <span>{accName}</span>
                           <span>{r.type === 'Churn' ? 'Churn' : '-MRR'}</span>
                        </div>
                      )
                   })}
                </div>
             )}

             {criticalTickets.length > 0 && (
                <div onClick={() => onNavigateTo('tickets')} className="cursor-pointer group bg-orange-50 p-3 rounded-xl border border-orange-100">
                   <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Tickets Críticos ({criticalTickets.length})</p>
                   {criticalTickets.slice(0, 2).map(t => {
                      const accName = accounts.find(a => a.id === t.accountId)?.name || 'Conta';
                      return (
                        <div key={t.id} className="text-xs font-bold text-orange-800 truncate">
                           {accName}: {t.subject}
                        </div>
                      )
                   })}
                </div>
             )}

             {nearActivities.length > 0 && (
                <div onClick={() => onNavigateTo('activities')} className="cursor-pointer group bg-blue-50 p-3 rounded-xl border border-blue-100">
                   <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Atividades ({nearActivities.length})</p>
                   {nearActivities.slice(0, 2).map(act => (
                      <div key={act.id} className="text-xs font-bold text-blue-800 truncate">• {act.title}</div>
                   ))}
                </div>
             )}

             {nearMeetings.length > 0 && (
                <div onClick={() => onNavigateTo('meetings')} className="cursor-pointer group bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                   <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Reuniões ({nearMeetings.length})</p>
                   {nearMeetings.slice(0, 2).map(m => (
                      <div key={m.id} className="text-xs font-bold text-indigo-800 truncate">• {m.accountName || 'Geral'} ({m.type || 'Geral'})</div>
                   ))}
                </div>
             )}
          </div>
        </div>
      )}

      {/* Grid de Métricas Centrais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div 
          onClick={() => onNavigateTo('accounts')}
          className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:bg-slate-50 transition-all active:scale-[0.98]"
        >
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-900">Contas Ativas</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">{accounts.length}</p>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-2">Health médio: <span className="text-green-500">{avgHealth}</span></p>
        </div>

        <div 
          onClick={() => onNavigateTo('accounts')}
          className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:bg-slate-50 transition-all active:scale-[0.98]"
        >
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-900">MRR Total</span>
              <span className="text-orange-400 font-bold">$</span>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">R$ {Math.round(totalMRR/1000)}k</p>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-2">{accounts.length} contas</p>
        </div>

        <div onClick={() => onNavigateTo('tickets')} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-900">Tickets Críticos</span>
              <svg className={`w-4 h-4 ${criticalTickets.length > 0 ? 'text-red-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <p className={`text-2xl font-black mt-2 ${criticalTickets.length > 0 ? 'text-red-600' : 'text-slate-900'}`}>{criticalTickets.length}</p>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-2">Integrado c/ Zendesk</p>
        </div>

        <div 
          onClick={() => onNavigateTo('expansion')}
          className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:bg-slate-50 transition-all active:scale-[0.98]"
        >
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-900">Pipeline Expansão</span>
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">R$ {Math.round(expansionValue/1000)}k</p>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-2">{opportunities.length} oportunidades</p>
        </div>

        <div 
          onClick={() => onNavigateTo('voc')}
          className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:bg-slate-50 transition-all active:scale-[0.98]"
        >
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-900">VOC Pendente</span>
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">{pendingVOC}</p>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-2">Total registrados</p>
        </div>

        <div 
          onClick={() => onNavigateTo('accounts')}
          className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:bg-slate-50 transition-all active:scale-[0.98]"
        >
          <div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-900">GAP MRR</span>
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" /></svg>
            </div>
            <p className="text-2xl font-black text-red-500 mt-2">R$ {Math.round(mrrGap/1000)}k</p>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-2">{accounts.length} contas · {accounts.flatMap(a=>(a.products || [])).length} produtos</p>
        </div>
      </div>

      {/* Gráfico de Saúde e Atenção */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
           <div className="flex items-center space-x-2 mb-8">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              <h3 className="text-sm font-bold text-slate-800">Health Score por Conta</h3>
           </div>
           <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData} margin={{ top: 0, right: 0, left: -40, bottom: 0 }} onClick={(data: any) => {
                  if (data && data.activePayload && data.activePayload.length > 0) {
                    handleBarClick(data.activePayload[0].payload);
                  }
               }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 100]} />
                 <Bar dataKey="health" radius={[4, 4, 0, 0]} barSize={160} style={{ cursor: 'pointer' }}>
                   {chartData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.health >= 70 ? "#4ade80" : "#fbbf24"} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-6">Contas que precisam de atenção (Health &lt; 70)</h3>
          <div className="space-y-4">
            {attentionRequired.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm italic">Nenhuma conta com saúde crítica baseada no score manual.</div>
            ) : (
              attentionRequired.map(acc => (
                <div key={acc.id} onClick={() => onSelectAccount(acc)} className="p-4 bg-red-50 rounded-xl border border-red-100 flex justify-between items-center cursor-pointer hover:bg-red-100 transition-colors">
                  <div>
                    <p className="text-sm font-bold text-red-900">{acc.name}</p>
                    <p className="text-[10px] text-red-600 font-bold uppercase">{acc.segment || 'Geral'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-red-600">{Number((acc.products || [])[0]?.healthScore) || 0}</p>
                    <p className="text-[10px] text-red-400 font-bold uppercase">Health</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Rodapé: Reuniões e Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-6">Próximas Reuniões</h3>
          <div className="space-y-4">
            {meetings.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Sem reuniões recentes.</p>
            ) : (
              meetings.slice(0, 3).map(m => (
                <div 
                  key={m.id} 
                  onClick={() => onNavigateTo('meetings')}
                  className="flex justify-between items-center p-4 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors rounded-xl"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">{m.accountName || 'Geral'}</p>
                    <p className="text-[11px] text-slate-500">
                      {m.productName || 'Geral'} · {m.type || 'Geral'} · {(m.date || '').includes('-') ? m.date.split('-').reverse().join('/') : (m.date || 'Sem data')}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className="text-xs font-bold text-slate-600">MRR: R$ {(Number(m.mrrAtTime) || 0).toLocaleString()}</p>
                    <span className="bg-slate-700 text-white px-3 py-0.5 rounded-full text-[10px] font-black uppercase mt-1">
                      {Number(m.actionsCount) || 0} ações
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-6">Pipeline de Expansão</h3>
          <div className="space-y-4">
            {opportunities.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Sem oportunidades ativas.</p>
            ) : (
              opportunities.slice(0, 3).map(opp => (
                <div 
                  key={opp.id} 
                  onClick={() => onNavigateTo('expansion')}
                  className="flex justify-between items-center p-4 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors rounded-xl"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">{opp.title || 'Sem Título'}</p>
                    <p className="text-[11px] text-slate-500">{opp.accountName || 'Geral'} · {opp.type || 'Geral'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">R$ {Math.round((Number(opp.value) || 0)/1000)}k</p>
                    <p className="text-[10px] text-slate-400 font-bold">{Number(opp.probability) || 0}%</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;