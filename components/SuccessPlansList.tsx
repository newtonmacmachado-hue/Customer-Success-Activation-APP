import React from 'react';
import { SuccessPlan, Account } from '../types';

interface SuccessPlansListProps {
  plans: SuccessPlan[];
  accounts: Account[];
  onEditPlan: (plan: SuccessPlan) => void;
  onCreatePlan: () => void;
}

const SuccessPlansList: React.FC<SuccessPlansListProps> = ({ 
  plans = [], // BLINDAGEM: Fallback para lista de planos nula
  accounts = [], // BLINDAGEM: Fallback para lista de contas nula
  onEditPlan, 
  onCreatePlan 
}) => {
  // BLINDAGEM: Busca de conta protegida contra lista inexistente
  const getAccountName = (id: string) => {
    const account = (accounts || []).find(a => a.id === id);
    return account?.name || 'Conta não identificada';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo': return 'bg-green-100 text-green-700';
      case 'Pausado': return 'bg-amber-100 text-amber-700';
      case 'Concluído': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  const safePlans = plans || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Planos de Sucesso</h2>
          <p className="text-slate-500 font-medium">Gestão estratégica e acompanhamento de marcos (Milestones).</p>
        </div>
        <button 
          onClick={onCreatePlan}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          <span>Novo Plano</span>
        </button>
      </div>

      {safePlans.length === 0 ? (
        <div className="p-20 text-center bg-white border-2 border-dashed border-slate-200 rounded-[40px] animate-in fade-in duration-500">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900">Nenhum plano estratégico encontrado</h3>
          <p className="text-slate-500 mb-6 font-medium">Defina objetivos e marcos importantes para guiar a jornada dos seus clientes.</p>
          <button onClick={onCreatePlan} className="text-blue-600 font-black uppercase text-xs hover:underline tracking-widest">Criar meu primeiro plano</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {safePlans.map(plan => {
            // BLINDAGEM INTERNA DO CARD
            const progressValue = Number(plan.progress) || 0;
            const milestonesCount = (plan.milestones || []).length;
            const objectiveText = plan.objective || 'Nenhum objetivo definido.';

            return (
              <div 
                key={plan.id} 
                onClick={() => onEditPlan(plan)}
                className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer group flex flex-col justify-between h-full min-h-[320px]"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 max-w-[70%]">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Conta</p>
                      <p className="text-sm font-black text-slate-800 truncate">{getAccountName(plan.accountId)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase whitespace-nowrap ${getStatusColor(plan.status || 'Draft')}`}>
                      {plan.status || 'Draft'}
                    </span>
                  </div>

                  <div className="mb-6">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Objetivo Macro</p>
                     <p className="text-sm font-medium text-slate-600 line-clamp-3 italic leading-relaxed">"{objectiveText}"</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                     <div>
                       <span className="text-3xl font-black text-slate-900">{progressValue}%</span>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Progresso Total</p>
                     </div>
                     <div className="text-right">
                       <span className="text-lg font-black text-slate-700">{milestonesCount}</span>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Milestones</p>
                     </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                     <div 
                        className="h-full bg-blue-500 transition-all duration-700 ease-out shadow-[0_0_8px_rgba(59,130,246,0.4)]" 
                        style={{ width: `${progressValue}%` }}
                     ></div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                     <span className="text-[10px] font-black text-blue-600 uppercase flex items-center tracking-widest">
                       Ver Detalhes do Plano
                       <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                     </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SuccessPlansList;