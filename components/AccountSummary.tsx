
import React, { useState, useEffect } from 'react';
import { Account, Meeting, CatalogProduct, Product, Opportunity, SuccessPlan, VOCType, VOCUrgency, VOCStatus, MaturityStage, HealthStatus, Contact } from '../types';
import AccountTimeline from './AccountTimeline';
import Stakeholders from './Stakeholders';

interface AccountSummaryProps {
  account: Account;
  meetings: Meeting[];
  opportunities: Opportunity[];
  successPlan?: SuccessPlan;
  onNavigateTo: (tab: string) => void;
  catalogProducts: CatalogProduct[];
  onLinkProduct: (accountId: string, catalogP: CatalogProduct, customData: Partial<Product>) => void;
  onUpdateProduct: (accountId: string, updatedProd: Product) => void;
  onUpdateAccount: (updatedAcc: Account) => void;
  onSelectProduct: (prod: Product) => void;
  readonly?: boolean;
}

const AccountSummary: React.FC<AccountSummaryProps> = ({ 
  account, 
  meetings = [], 
  opportunities = [], 
  successPlan, 
  onNavigateTo, 
  catalogProducts = [], 
  onLinkProduct, 
  onUpdateProduct, 
  onUpdateAccount, 
  onSelectProduct, 
  readonly 
}) => {
  const [internalTab, setInternalTab] = useState<'overview' | 'timeline' | 'stakeholders'>('overview');

  const [isLinkingProduct, setIsLinkingProduct] = useState(false);
  const [linkingStep, setLinkingStep] = useState<1 | 2>(1);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<CatalogProduct | null>(null);
  
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [accName, setAccName] = useState(account?.name || '');
  const [accSegment, setAccSegment] = useState(account?.segment || 'Enterprise');

  // Form State
  const [formMRR, setFormMRR] = useState('0');
  const [formMRRObjetivo, setFormMRRObjetivo] = useState('0');
  const [formDateObjetivo, setFormDateObjetivo] = useState('');
  const [formDateSetup, setFormDateSetup] = useState('');
  const [formDateGoLivePrevisto, setFormDateGoLivePrevisto] = useState('');
  const [formDateGoLiveRealizado, setFormDateGoLiveRealizado] = useState('');
  const [formDateAtingimento, setFormDateAtingimento] = useState('');
  const [formHealthScore, setFormHealthScore] = useState('100');
  const [formMaturity, setFormMaturity] = useState<MaturityStage>(MaturityStage.GROWTH_1);
  const [formAdoptionRate, setFormAdoptionRate] = useState('0');
  const [formFeaturesTotal, setFormFeaturesTotal] = useState('5');

  useEffect(() => {
    if (editingProduct) {
      setFormMRR((editingProduct.mrr || 0).toString());
      setFormMRRObjetivo((editingProduct.mrrObjetivo || 0).toString());
      setFormDateObjetivo(editingProduct.dataPrevistaMRRObjetivo || '');
      setFormDateSetup(editingProduct.dataInicioSetup || '');
      setFormDateGoLivePrevisto(editingProduct.dataGoLivePrevisto || '');
      setFormDateGoLiveRealizado(editingProduct.dataGoLiveRealizado || '');
      setFormDateAtingimento(editingProduct.dataAtingimentoMRR || '');
      setFormHealthScore((editingProduct.healthScore || 100).toString());
      setFormMaturity(editingProduct.maturity || MaturityStage.GROWTH_1);
      setFormAdoptionRate((editingProduct.adoptionRate || 0).toString());
      setFormFeaturesTotal((editingProduct.featuresTotal || 5).toString());
    }
  }, [editingProduct]);

  // --- CÁLCULOS BLINDADOS (Onde ocorria o erro reduce) ---
  const safeProducts = account?.products || [];
  const safeActivities = account?.activities || [];
  const safeContacts = account?.contacts || [];
  const safeMeetings = meetings || [];

  const avgHealth = Math.round(
    safeProducts.reduce((sum, p) => sum + (Number(p.healthScore) || 0), 0) / (safeProducts.length || 1)
  );
  
  const pendingActivities = safeActivities.filter(a => a.status === 'Pending');

  const totalMRR = safeProducts.reduce((s, p) => s + (Number(p.mrr) || 0), 0);
  const totalMRRObjetivo = safeProducts.reduce((s, p) => s + (Number(p.mrrObjetivo) || 0), 0);
  const gapMRR = totalMRR - totalMRRObjetivo;

  const calculateMonthsRemaining = () => {
    if (safeProducts.length === 0) return "—";
    const dates = safeProducts
      .map(p => p.dataPrevistaMRRObjetivo)
      .filter(Boolean)
      .map(d => new Date(d).getTime());
    
    if (dates.length === 0) return "—";
    const latestTargetDate = Math.max(...dates);
    const now = Date.now();
    const diffInMs = latestTargetDate - now;
    if (diffInMs <= 0) return "Vencido";
    const months = diffInMs / (1000 * 60 * 60 * 24 * 30.44);
    return months.toFixed(1);
  };

  const monthsRemaining = calculateMonthsRemaining();
  const recentMeetings = [...safeMeetings]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 2);

  const recentVOC = safeMeetings
    .filter(m => m.vocDetailed)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const handleStartLinkingForm = (cp: CatalogProduct) => {
    setSelectedCatalogProduct(cp);
    setLinkingStep(2);
  };

  const handleStartEditingProduct = (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    setEditingProduct(p);
  };

  const handleSaveProduct = () => {
    const productPayload = {
      mrr: Number(formMRR),
      mrrObjetivo: Number(formMRRObjetivo),
      dataPrevistaMRRObjetivo: formDateObjetivo,
      dataInicioSetup: formDateSetup,
      dataGoLivePrevisto: formDateGoLivePrevisto,
      dataGoLiveRealizado: formDateGoLiveRealizado,
      dataAtingimentoMRR: formDateAtingimento,
      healthScore: Number(formHealthScore),
      healthStatus: Number(formHealthScore) >= 70 ? HealthStatus.HEALTHY : HealthStatus.AT_RISK,
      maturity: formMaturity,
      adoptionRate: Number(formAdoptionRate),
      featuresTotal: Number(formFeaturesTotal),
    };

    if (editingProduct) {
      onUpdateProduct(account.id, { ...editingProduct, ...productPayload });
    } else if (selectedCatalogProduct) {
      onLinkProduct(account.id, selectedCatalogProduct, productPayload);
    }
    resetModals();
  };

  const handleSaveAccount = () => {
    onUpdateAccount({ ...account, name: accName, segment: accSegment });
    setIsEditingAccount(false);
  };

  const handleUpdateContacts = (contacts: Contact[]) => {
    onUpdateAccount({ ...account, contacts });
  };

  const resetModals = () => {
    setIsLinkingProduct(false);
    setLinkingStep(1);
    setEditingProduct(null);
    setSelectedCatalogProduct(null);
    setFormMRR('0');
    setFormMRRObjetivo('0');
    setFormDateObjetivo('');
    setFormDateSetup('');
    setFormDateGoLivePrevisto('');
    setFormDateGoLiveRealizado('');
    setFormDateAtingimento('');
    setFormHealthScore('100');
    setFormMaturity(MaturityStage.GROWTH_1);
    setFormAdoptionRate('0');
    setFormFeaturesTotal('5');
  };

  const handleTimelineClick = (type: string, id: string) => {
    if (type === 'MILESTONE') onNavigateTo('success-plan');
    else if (type === 'MEETING') onNavigateTo('meetings');
    else if (type === 'ACTIVITY') onNavigateTo('activities');
  };

  const cardBaseStyle = "bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col";
  const cardTitleStyle = "text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 block";
  const inputStyle = "w-full bg-white border border-slate-300 p-3 rounded-xl focus:border-blue-500 outline-none text-sm font-bold text-slate-900 transition-all";
  const labelStyle = "text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block";

  if (!account) return <div className="p-10 text-center text-slate-400 font-bold">Conta não encontrada.</div>;

  return (
    <div className="space-y-8 pb-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center space-x-4">
             <h1 className="text-5xl font-black text-slate-900 tracking-tighter">{account.name}</h1>
             {!readonly && (
               <button onClick={() => setIsEditingAccount(true)} className="p-2 text-slate-300 hover:text-blue-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
               </button>
             )}
          </div>
          <p className="text-slate-500 font-bold mt-2 uppercase text-xs tracking-widest">{account.segment} • VISÃO 360º DO CLIENTE</p>
        </div>

        <div className="bg-slate-100 p-1 rounded-xl flex space-x-1">
          {(['overview', 'timeline', 'stakeholders'] as const).map(tab => (
            <button 
              key={tab}
              onClick={() => setInternalTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${internalTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab === 'overview' ? 'Visão Geral' : tab === 'timeline' ? 'Jornada' : 'Stakeholders'}
              {tab === 'stakeholders' && safeContacts.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full text-[9px]">{safeContacts.length}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      {internalTab === 'timeline' && (
        <div className="animate-in fade-in duration-300">
          <AccountTimeline account={account} meetings={safeMeetings} activities={safeActivities} products={safeProducts} successPlan={successPlan} onEventClick={handleTimelineClick} />
        </div>
      )}

      {internalTab === 'stakeholders' && (
        <div className="animate-in fade-in duration-300">
           <Stakeholders account={account} onUpdateContacts={handleUpdateContacts} readonly={readonly} />
        </div>
      )}

      {internalTab === 'overview' && (
        <div className="animate-in fade-in duration-300 space-y-8">
          {/* KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Saúde Média</p>
              <p className={`text-4xl font-black text-center ${avgHealth >= 70 ? 'text-green-500' : 'text-amber-500'}`}>{avgHealth}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">MRR Atual</p>
              <p className="text-2xl font-black text-slate-900">R$ {totalMRR.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center text-center border-b-4 border-b-blue-500">
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 font-bold">MRR Objetivo</p>
              <p className="text-2xl font-black text-slate-800">R$ {totalMRRObjetivo.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">GAP MRR</p>
              <p className={`text-2xl font-black ${gapMRR >= 0 ? 'text-green-600' : 'text-red-500'}`}>R$ {gapMRR.toLocaleString()}</p>
            </div>
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-center relative overflow-hidden text-center text-white">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Tempo p/ Meta</p>
              <div className="flex items-baseline justify-center space-x-1">
                <p className="text-3xl font-black">{monthsRemaining}</p>
                {monthsRemaining !== "—" && monthsRemaining !== "Vencido" && <span className="text-[10px] font-black text-blue-400 uppercase">meses</span>}
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Atividades</p>
              <p className="text-4xl font-black text-slate-900">{pendingActivities.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <div className={cardBaseStyle}>
                  <div className="flex justify-between items-center mb-8">
                    <span className={cardTitleStyle.replace('mb-6', 'mb-0')}>Produtos Ativos</span>
                    {!readonly && (
                      <button onClick={() => setIsLinkingProduct(true)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">+ Vincular Novo Produto</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {safeProducts.length === 0 ? (
                      <div className="col-span-2 py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 text-sm font-medium">Nenhum produto vinculado.</div>
                    ) : (
                      safeProducts.map(p => {
                        const gap = (Number(p.mrr) || 0) - (Number(p.mrrObjetivo) || 0);
                        return (
                            <div key={p.id} onClick={() => onSelectProduct(p)} className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:border-blue-500 hover:bg-white transition-all cursor-pointer group shadow-sm relative overflow-hidden">
                              <div className="flex justify-between items-start mb-4">
                                  <h4 className="font-black text-slate-900 group-hover:text-blue-600 transition-colors">{p.name || 'Produto'}</h4>
                                  <div className="flex space-x-2">
                                    <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded uppercase">{p.maturity || 'Fase'}</span>
                                    {!readonly && (
                                      <button onClick={(e) => handleStartEditingProduct(e, p)} className="p-1 text-slate-300 hover:text-blue-500 bg-white rounded shadow-sm border border-slate-100">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                      </button>
                                    )}
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mt-4 border-t border-slate-100 pt-4">
                                  <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Atual</p>
                                    <p className="text-sm font-black text-slate-800">R$ {(Number(p.mrr) || 0).toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Objetivo</p>
                                    <p className="text-sm font-black text-slate-500">R$ {(Number(p.mrrObjetivo) || 0).toLocaleString()}</p>
                                  </div>
                              </div>
                              <div className="flex justify-between items-center mt-4">
                                  <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${gap >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    GAP: R$ {gap.toLocaleString()}
                                  </div>
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border-2 ${(Number(p.healthScore) || 0) >= 70 ? 'bg-green-50 border-green-200 text-green-600' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
                                    {Number(p.healthScore) || 0}
                                  </div>
                              </div>
                            </div>
                        )
                      })
                    )}
                  </div>
              </div>

              <div className={cardBaseStyle}>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Últimas Reuniões</span>
                    {!readonly && (
                      <button onClick={() => onNavigateTo('meetings')} className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline">+ Nova</button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {recentMeetings.length === 0 ? (
                      <p className="text-sm text-slate-400 italic text-center py-4">Nenhuma reunião registrada.</p>
                    ) : (
                      recentMeetings.map(m => (
                        <div key={m.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-blue-600 font-black text-xs">{(m.type || 'C')[0]}</div>
                              <div>
                                <p className="text-sm font-black text-slate-800">{m.type} - {m.productName || 'Geral'}</p>
                                <p className="text-xs text-slate-400 font-bold">{(m.date || '').includes('-') ? m.date.split('-').reverse().join('/') : m.date}</p>
                              </div>
                            </div>
                            <button onClick={() => onNavigateTo('meetings')} className="text-slate-400 hover:text-blue-600">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                      ))
                    )}
                  </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className={`${cardBaseStyle} bg-slate-900 border-none text-white`}>
                  <span className={`${cardTitleStyle} text-slate-500`}>Plano de Sucesso</span>
                  {successPlan ? (
                    <div className="space-y-6">
                      <p className="text-sm font-bold text-slate-200 italic leading-relaxed">"{successPlan.objective}"</p>
                      <div>
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-[10px] font-black text-slate-500 uppercase">Progresso</p>
                            <p className="text-xs font-black text-blue-400">{successPlan.progress || 0}%</p>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${successPlan.progress || 0}%` }}></div>
                          </div>
                      </div>
                      <button onClick={() => onNavigateTo('success-plan')} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase hover:bg-white/10 transition-all">Editar Plano</button>
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <p className="text-xs text-slate-500 mb-4 italic">Sem plano estratégico.</p>
                      {!readonly && <button onClick={() => onNavigateTo('success-plan')} className="text-xs font-black text-blue-400 uppercase tracking-widest">+ Criar Agora</button>}
                    </div>
                  )}
              </div>
              
              <div className={cardBaseStyle}>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Atividades Pendentes</span>
                  </div>
                  <div className="space-y-3">
                    {pendingActivities.length === 0 ? (
                        <p className="text-sm text-slate-400 italic text-center py-4">Nenhuma atividade pendente.</p>
                    ) : (
                        pendingActivities.slice(0, 3).map(act => (
                          <div key={act.id} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${act.urgency === 'alta' ? 'bg-red-500' : 'bg-blue-400'}`}></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-slate-800 truncate">{act.title}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase">{(act.dueDate || '').includes('-') ? act.dueDate.split('-').reverse().join('/') : act.dueDate}</p>
                              </div>
                          </div>
                        ))
                    )}
                    {pendingActivities.length > 0 && (
                      <button onClick={() => onNavigateTo('activities')} className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline text-center w-full pt-2">Ver Todas</button>
                    )}
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIÇÃO CONTA */}
      {isEditingAccount && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-6">
           <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">Editar Cadastro</h3>
                 <button onClick={() => setIsEditingAccount(false)} className="text-slate-400 hover:text-slate-600">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
              <div className="p-8 space-y-4">
                 <div className="space-y-1">
                    <label className={labelStyle}>Nome da Conta</label>
                    <input type="text" value={accName} onChange={e => setAccName(e.target.value)} className={inputStyle} />
                 </div>
                 <div className="space-y-1">
                    <label className={labelStyle}>Segmento</label>
                    <select value={accSegment} onChange={e => setAccSegment(e.target.value)} className={inputStyle}>
                       <option value="Enterprise">Enterprise</option>
                       <option value="Mid-Market">Mid-Market</option>
                       <option value="SMB">SMB</option>
                    </select>
                 </div>
              </div>
              <div className="p-8 flex gap-4">
                 <button onClick={() => setIsEditingAccount(false)} className="flex-1 py-4 text-xs font-black text-slate-400 uppercase border border-slate-200 rounded-2xl">Cancelar</button>
                 <button onClick={handleSaveAccount} className="flex-1 py-4 text-xs font-black text-white bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20">Salvar</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL PRODUTO */}
      {(isLinkingProduct || editingProduct) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-6">
           <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                   {editingProduct ? `Editar ${editingProduct.name}` : (linkingStep === 1 ? 'Passo 1: Selecionar Produto' : `Passo 2: Configurar ${selectedCatalogProduct?.name}`)}
                 </h3>
                 <button onClick={resetModals} className="text-slate-400 hover:text-slate-600 p-2">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
              
              <div className="p-8 bg-slate-50/30 overflow-y-auto max-h-[70vh]">
                {linkingStep === 1 && !editingProduct ? (
                  <div className="grid grid-cols-1 gap-4">
                    {catalogProducts.map(cp => {
                      const alreadyHas = safeProducts.some(p => p.name === cp.name);
                      return (
                        <button key={cp.id} disabled={alreadyHas} onClick={() => handleStartLinkingForm(cp)} className={`w-full text-left p-6 rounded-3xl border-2 transition-all flex items-center justify-between ${alreadyHas ? 'bg-slate-100 border-slate-100 opacity-50 cursor-not-allowed' : 'bg-white border-slate-100 hover:border-blue-500 hover:shadow-lg'}`}>
                          <div className="flex-1 pr-4">
                            <h4 className="font-black text-slate-900">{cp.name}</h4>
                            <p className="text-[10px] text-slate-400 mt-1 font-medium">{cp.description}</p>
                          </div>
                          {!alreadyHas ? <div className="text-blue-600 font-black text-xs uppercase tracking-widest">Selecionar →</div> : <span className="text-[8px] font-black uppercase text-slate-400">Já Ativo</span>}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                       <h4 className="col-span-2 text-xs font-black text-blue-600 uppercase tracking-widest border-b border-blue-100 pb-2">Dados Financeiros</h4>
                       <div className="space-y-1">
                          <label className={labelStyle}>MRR Atual (R$)</label>
                          <input type="number" value={formMRR} onChange={e => setFormMRR(e.target.value)} className={inputStyle} />
                       </div>
                       <div className="space-y-1">
                          <label className={labelStyle}>MRR Objetivo (R$)</label>
                          <input type="number" value={formMRRObjetivo} onChange={e => setFormMRRObjetivo(e.target.value)} className={inputStyle} />
                       </div>
                       <div className="space-y-1">
                          <label className={labelStyle}>Data Prevista Meta</label>
                          <input type="date" value={formDateObjetivo} onChange={e => setFormDateObjetivo(e.target.value)} className={inputStyle} />
                       </div>
                       <div className="space-y-1">
                          <label className={labelStyle}>Data Atingimento (Real)</label>
                          <input type="date" value={formDateAtingimento} onChange={e => setFormDateAtingimento(e.target.value)} className={inputStyle} />
                       </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                       <h4 className="col-span-3 text-xs font-black text-blue-600 uppercase tracking-widest border-b border-blue-100 pb-2">Cronograma</h4>
                       <div className="space-y-1">
                          <label className={labelStyle}>Início Setup</label>
                          <input type="date" value={formDateSetup} onChange={e => setFormDateSetup(e.target.value)} className={inputStyle} />
                       </div>
                       <div className="space-y-1">
                          <label className={labelStyle}>Go-Live Previsto</label>
                          <input type="date" value={formDateGoLivePrevisto} onChange={e => setFormDateGoLivePrevisto(e.target.value)} className={inputStyle} />
                       </div>
                       <div className="space-y-1">
                          <label className={labelStyle}>Go-Live Realizado</label>
                          <input type="date" value={formDateGoLiveRealizado} onChange={e => setFormDateGoLiveRealizado(e.target.value)} className={inputStyle} />
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                       <h4 className="col-span-2 text-xs font-black text-blue-600 uppercase tracking-widest border-b border-blue-100 pb-2">Indicadores</h4>
                       <div className="space-y-1">
                          <label className={labelStyle}>Health Score (0-100)</label>
                          <input type="number" value={formHealthScore} onChange={e => setFormHealthScore(e.target.value)} className={inputStyle} />
                       </div>
                       <div className="space-y-1">
                          <label className={labelStyle}>Maturidade</label>
                          <select value={formMaturity} onChange={e => setFormMaturity(e.target.value as MaturityStage)} className={inputStyle}>
                             {Object.values(MaturityStage).map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                       </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-white border-t border-slate-50 flex gap-4">
                 {(linkingStep === 2 || editingProduct) && (
                   <button onClick={editingProduct ? resetModals : () => setLinkingStep(1)} className="flex-1 py-4 text-xs font-black text-slate-400 uppercase tracking-widest border border-slate-200 rounded-2xl hover:bg-slate-50">
                     {editingProduct ? 'Cancelar' : 'Voltar'}
                   </button>
                 )}
                 <button 
                   onClick={linkingStep === 1 && !editingProduct ? undefined : handleSaveProduct} 
                   className={`flex-[2] py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${linkingStep === 1 && !editingProduct ? 'bg-slate-100 text-slate-300' : 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 hover:bg-blue-700'}`}
                 >
                   {editingProduct ? 'Salvar Alterações' : (linkingStep === 1 ? 'Selecione um produto' : 'Vincular Produto')}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AccountSummary;