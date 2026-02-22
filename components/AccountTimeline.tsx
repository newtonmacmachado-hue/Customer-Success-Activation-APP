import React, { useState } from 'react';
import { Account, Meeting, Activity, Product, SuccessPlan } from '../types';

interface AccountTimelineProps {
  account: Account;
  meetings: Meeting[];
  activities: Activity[];
  products: Product[];
  successPlan?: SuccessPlan;
  onEventClick?: (type: string, id: string) => void;
}

type TimelineEventType = 'MEETING' | 'ACTIVITY' | 'VOC' | 'PRODUCT' | 'MILESTONE' | 'SUCCESS_PLAN_START' | 'HEALTH_SCORE';

type TimelineEvent = {
  id: string;
  originalId: string;
  date: string; // YYYY-MM-DD
  type: TimelineEventType;
  title: string;
  description?: string;
  tags: string[];
  subtitle?: string; 
  meta?: any;
};

const AccountTimeline: React.FC<AccountTimelineProps> = ({ account, meetings = [], activities = [], products = [], successPlan, onEventClick }) => {
  // Filtros padrão ativos
  const [activeFilters, setActiveFilters] = useState<TimelineEventType[]>(['MEETING', 'ACTIVITY', 'VOC', 'HEALTH_SCORE', 'PRODUCT', 'MILESTONE', 'SUCCESS_PLAN_START']);

  const toggleFilter = (type: TimelineEventType | 'ALL') => {
    if (type === 'ALL') {
       setActiveFilters(['MEETING', 'ACTIVITY', 'VOC', 'HEALTH_SCORE', 'PRODUCT', 'MILESTONE', 'SUCCESS_PLAN_START']);
       return;
    }
    
    // Lógica para Health Score agrupar PRODUCT e HEALTH_SCORE
    const typesToToggle: TimelineEventType[] = type === 'HEALTH_SCORE' ? ['HEALTH_SCORE', 'PRODUCT'] : [type];

    const isAllActive = typesToToggle.every(t => activeFilters.includes(t));
    
    if (isAllActive) {
      // Remover
      setActiveFilters(activeFilters.filter(f => !typesToToggle.includes(f)));
    } else {
      // Adicionar
      setActiveFilters([...activeFilters, ...typesToToggle]);
    }
  };

  const isFilterActive = (type: TimelineEventType) => {
     if (type === 'HEALTH_SCORE') return activeFilters.includes('HEALTH_SCORE') || activeFilters.includes('PRODUCT');
     return activeFilters.includes(type);
  };

  // --- GERAÇÃO DE EVENTOS (COM PROGRAMAÇÃO DEFENSIVA) ---
  const events: TimelineEvent[] = [];

  // A. Reuniões e VOCs
  (meetings || []).forEach(m => {
    // Blindagem: Garante que risks e participants sejam sempre arrays
    const safeRisks = m.risks || [];
    const safeParticipants = m.participants || [];

    events.push({
      id: `meet-${m.id}`,
      originalId: m.id,
      date: m.date,
      type: 'MEETING',
      title: m.summary || `${m.type} - ${m.accountName}`,
      description: safeRisks.length > 0 ? `Riscos: ${safeRisks.join(', ')}` : undefined,
      tags: [m.type, m.productName || 'Geral'],
      subtitle: `${safeParticipants.length} participantes`,
      meta: { participants: safeParticipants }
    });

    if (m.vocDetailed) {
       events.push({
         id: `voc-${m.id}`,
         originalId: m.id,
         date: m.date,
         type: 'VOC',
         title: `VOC: ${m.vocDetailed.substring(0, 60)}${m.vocDetailed.length > 60 ? '...' : ''}`,
         description: m.vocDetailed,
         tags: [m.vocType || 'Feedback', m.vocUrgency || 'Média'],
         subtitle: `Status: ${m.vocStatus || 'Pendente'}`,
         meta: { urgency: m.vocUrgency, status: m.vocStatus }
       });
    }
  });

  // B. Atividades
  (activities || []).forEach(a => {
    const prodName = (products || []).find(p => p.id === a.productId)?.name;
    events.push({
      id: `act-${a.id}`,
      originalId: a.id,
      date: a.dueDate,
      type: 'ACTIVITY',
      title: a.title,
      description: a.notes,
      tags: [a.status === 'Completed' ? 'Concluído' : 'Pendente', a.urgency, prodName].filter(Boolean) as string[],
      subtitle: `${a.status || 'Sem status'} • ${a.category || 'Geral'} • ${a.owner || 'Sem dono'}`,
      meta: { 
        owner: a.owner,
        status: a.status,
        category: a.category
      }
    });
  });

  // C. Produtos (Lifecycle) e Health Score History
  (products || []).forEach(p => {
    // Lifecycle Events
    const setupDate = p.dataInicioSetup;
    if (setupDate) {
      events.push({
        id: `prod-setup-${p.id}`,
        originalId: p.id,
        date: setupDate,
        type: 'PRODUCT',
        title: `Início de Setup: ${p.name}`,
        description: 'Início oficial do processo de implantação.',
        tags: ['Setup', p.name],
        subtitle: 'Fase de Ativação',
        meta: { mrr: p.mrr }
      });
    }
    
    const goLiveDate = p.dataGoLiveRealizado || p.dataGoLivePrevisto;
    if (goLiveDate) {
        events.push({
            id: `prod-golive-${p.id}`,
            originalId: p.id,
            date: goLiveDate,
            type: 'PRODUCT',
            title: `Go-Live: ${p.name}`,
            description: p.dataGoLiveRealizado ? 'Produto entrou em produção com sucesso.' : 'Previsão de entrada em produção.',
            tags: ['Go-Live', p.name],
            subtitle: p.dataGoLiveRealizado ? 'Realizado' : 'Previsto',
            meta: { mrr: p.mrr }
        });
    }

    // Health Score History
    if (p.scoreHistory && Array.isArray(p.scoreHistory) && p.scoreHistory.length > 0) {
        const currentYear = new Date().getFullYear();
        const monthMap: Record<string, string> = { 
            'Jan': '01', 'Fev': '02', 'Mar': '03', 'Abr': '04', 'Mai': '05', 'Jun': '06', 
            'Jul': '07', 'Ago': '08', 'Set': '09', 'Out': '10', 'Nov': '11', 'Dez': '12' 
        };
        
        p.scoreHistory.forEach((hist, idx) => {
            const m = monthMap[hist.month] || '01';
            const d = new Date();
            const isPast = Number(m) > (d.getMonth() + 1); 
            const year = isPast ? currentYear - 1 : currentYear;
            const fullDate = `${year}-${m}-15`; 

            events.push({
                id: `hs-${p.id}-${idx}`,
                originalId: p.id,
                date: fullDate,
                type: 'HEALTH_SCORE',
                title: `Health Score: ${hist.score}`,
                description: `Registro histórico de saúde do produto.`,
                tags: [p.name, hist.score >= 70 ? 'Saudável' : 'Risco'],
                subtitle: `Score ${hist.score}/100`,
                meta: { score: hist.score }
            });
        });
    }
  });

  // D. Planos de Sucesso
  if (successPlan) {
    if (successPlan.createdAt) {
      events.push({
        id: `sp-start-${successPlan.id}`,
        originalId: successPlan.id,
        date: successPlan.createdAt,
        type: 'SUCCESS_PLAN_START',
        title: `Plano de Sucesso Iniciado`,
        description: `Objetivo: "${successPlan.objective || 'Não definido'}"`,
        tags: ['Estratégia', successPlan.status || 'Ativo'],
        subtitle: `${(successPlan.milestones || []).length} milestones definidos`
      });
    }

    if (successPlan.milestones && Array.isArray(successPlan.milestones)) {
      successPlan.milestones.forEach(milestone => {
        events.push({
          id: `milestone-${milestone.id}`,
          originalId: milestone.id,
          date: milestone.dueDate,
          type: 'MILESTONE',
          title: `Marco: ${milestone.title}`,
          description: milestone.kpi ? `KPI Alvo: ${milestone.kpi}` : undefined,
          tags: [milestone.status || 'Pendente'],
          subtitle: `Responsável: ${milestone.responsible || 'Sem dono'}`,
          meta: { status: milestone.status }
        });
      });
    }
  }

  // Filtragem e Ordenação
  const filteredEvents = events
    .filter(evt => activeFilters.includes(evt.type))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // --- HELPERS VISUAIS ---

  function formatDate(dateStr: string) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  const getIcon = (evt: TimelineEvent) => {
    const baseClass = "w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-white z-10 relative";
    
    switch (evt.type) {
      case 'MEETING':
        return <div className={`${baseClass} bg-blue-100 text-blue-600`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div>;
      
      case 'ACTIVITY':
        const isDone = evt.meta?.status === 'Completed';
        return <div className={`${baseClass} ${isDone ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg></div>;
      
      case 'VOC':
        return <div className={`${baseClass} bg-orange-100 text-orange-600`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg></div>;
      
      case 'PRODUCT':
      case 'HEALTH_SCORE':
        return <div className={`${baseClass} bg-purple-100 text-purple-600`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg></div>;
      
      default:
        return <div className={`${baseClass} bg-slate-100 text-slate-500`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>;
    }
  };

  const getButtonClass = (isActive: boolean, colorClass: string) => 
    `px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${isActive ? `${colorClass} text-white shadow-md border-transparent` : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-black text-slate-900">Jornada do Cliente</h2>
           <p className="text-slate-500 font-medium text-sm">Linha do tempo interativa de eventos e marcos.</p>
        </div>
        
        {/* BARRA DE FILTROS */}
        <div className="flex flex-wrap gap-2">
           <button 
             onClick={() => toggleFilter('MEETING')} 
             className={getButtonClass(isFilterActive('MEETING'), 'bg-[#ea580c]')}
           >
             Reuniões
           </button>
           <button 
             onClick={() => toggleFilter('ACTIVITY')} 
             className={getButtonClass(isFilterActive('ACTIVITY'), 'bg-[#f97316]')}
           >
             Atividades
           </button>
           <button 
             onClick={() => toggleFilter('VOC')} 
             className={getButtonClass(isFilterActive('VOC'), 'bg-[#ea580c]')}
           >
             VOC
           </button>
           <button 
             onClick={() => toggleFilter('HEALTH_SCORE')} 
             className={getButtonClass(isFilterActive('HEALTH_SCORE'), 'bg-[#f97316]')}
           >
             Health Score
           </button>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="p-16 text-center border-2 border-dashed border-slate-200 rounded-[32px] bg-slate-50">
           <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           <p className="text-slate-400 font-bold text-sm">Nenhum evento encontrado com os filtros atuais.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 ml-5 space-y-8 pb-10">
          {filteredEvents.map((evt, idx) => {
            const isClickable = ['MEETING', 'ACTIVITY', 'VOC', 'SUCCESS_PLAN_START', 'MILESTONE'].includes(evt.type) && !!onEventClick;

            return (
              <div key={`${evt.type}-${evt.id}-${idx}`} className="relative pl-8 group animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                {/* ÍCONE NA LINHA DO TEMPO */}
                <div className="absolute -left-[21px] top-0 transition-transform group-hover:scale-110">
                  {getIcon(evt)}
                </div>

                {/* CARD DO EVENTO */}
                <div 
                  onClick={() => isClickable && onEventClick && onEventClick(evt.type === 'SUCCESS_PLAN_START' ? 'MILESTONE' : evt.type, evt.originalId)}
                  className={`bg-white rounded-2xl p-5 border transition-all ${
                    isClickable ? 'cursor-pointer hover:shadow-md hover:border-blue-300' : ''
                  } ${evt.type === 'HEALTH_SCORE' ? 'border-purple-100 bg-purple-50/20' : 'border-slate-100'}`}
                >
                  <div className="flex flex-col gap-1 mb-2">
                     <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wide">{formatDate(evt.date)}</span>
                        {evt.tags.map((tag, i) => (
                           <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 uppercase whitespace-nowrap">
                             {tag}
                           </span>
                        ))}
                     </div>
                     <h3 className={`text-base font-black ${isClickable ? 'text-slate-900 group-hover:text-blue-600' : 'text-slate-800'}`}>
                        {evt.title}
                     </h3>
                  </div>

                  {evt.description && (
                    <p className="text-sm text-slate-600 leading-relaxed font-medium mb-3">
                       {evt.description}
                    </p>
                  )}

                  {evt.subtitle && (
                    <div className="pt-3 mt-1 border-t border-slate-50 flex items-center text-xs font-bold text-slate-400">
                       {evt.type === 'ACTIVITY' && <div className={`w-2 h-2 rounded-full mr-2 ${evt.meta?.status === 'Completed' ? 'bg-green-500' : 'bg-amber-500'}`}></div>}
                       {evt.subtitle}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AccountTimeline;