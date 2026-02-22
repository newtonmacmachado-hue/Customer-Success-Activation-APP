
import React, { useState, useEffect, useMemo } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, BarChart, Bar, Legend } from 'recharts';
import { Product, MaturityStage, HealthStatus, ProductFeature, RadarDimension, ScoreHistory, FinancialRecord, TicketRecord } from '../types';

interface MaturityProps {
  product: Product;
  accountId: string;
  onUpdateProduct: (accountId: string, updatedProd: Product) => void;
  financialRecords?: FinancialRecord[];
  ticketRecords?: TicketRecord[];
  readonly?: boolean;
}

const Maturity: React.FC<MaturityProps> = ({ product, accountId, onUpdateProduct, financialRecords = [], ticketRecords = [], readonly }) => {
  const [isEditing, setIsEditing] = useState(false);

  // Estados de formulário para os campos básicos
  const [formName, setFormName] = useState(product.name);
  const [formDescription, setFormDescription] = useState(product.description);
  const [formHealthScore, setFormHealthScore] = useState(product.healthScore.toString());
  const [formMaturity, setFormMaturity] = useState<MaturityStage>(product.maturity);
  const [formAdoptionRate, setFormAdoptionRate] = useState(product.adoptionRate.toString());
  
  // Estados para as listas dinâmicas (CRUD Real)
  const [formFeatures, setFormFeatures] = useState<ProductFeature[]>([]);
  const [formRadar, setFormRadar] = useState<RadarDimension[]>([]);
  const [formHistory, setFormHistory] = useState<ScoreHistory[]>([]);

  // Sincroniza estados ao carregar ou trocar de produto
  useEffect(() => {
    setFormName(product.name);
    setFormDescription(product.description);
    setFormHealthScore(product.healthScore.toString());
    setFormMaturity(product.maturity);
    setFormAdoptionRate(product.adoptionRate.toString());
    setFormFeatures([...(product.featuresList || [])]);
    setFormRadar([...(product.radarDimensions || [])]);
    setFormHistory([...(product.scoreHistory || [])]);
  }, [product]);

  // --- DADOS DOS GRÁFICOS NOVOS ---

  // 1. MRR Real vs Objetivo
  const mrrEvolutionData = useMemo(() => {
    // Filtra registros financeiros deste produto nesta conta
    const productFinancials = financialRecords
      .filter(r => r.accountId === accountId && r.productId === product.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Se não houver histórico, cria pelo menos um ponto com o atual se disponível
    if (productFinancials.length === 0) return [];

    return productFinancials.map(r => ({
      date: r.date.substring(0, 7), // YYYY-MM
      real: r.amount,
      goal: product.mrrObjetivo // Usa a meta atual como referência (ou poderia vir do histórico se tivéssemos)
    }));
  }, [financialRecords, accountId, product.id, product.mrrObjetivo]);

  // 2. Histórico de Tickets por Tipo
  const ticketsEvolutionData = useMemo(() => {
    // Filtra tickets desta conta (Assumindo que tickets são a nível de conta, contexto relevante para o produto)
    const accountTickets = ticketRecords
      .filter(t => t.accountId === accountId)
      .sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());

    if (accountTickets.length === 0) return [];

    // Agrupa por Mês e Tipo
    const groupedByMonth: Record<string, Record<string, number>> = {};
    const allTypes = new Set<string>();

    accountTickets.forEach(t => {
      const month = t.openedAt.substring(0, 7);
      if (!groupedByMonth[month]) groupedByMonth[month] = {};
      
      const type = t.type || 'Outros';
      groupedByMonth[month][type] = (groupedByMonth[month][type] || 0) + 1;
      allTypes.add(type);
    });

    // Formata para Recharts
    return Object.keys(groupedByMonth).sort().map(month => {
      const entry: any = { month };
      allTypes.forEach(type => {
        entry[type] = groupedByMonth[month][type] || 0;
      });
      return entry;
    });
  }, [ticketRecords, accountId]);

  const ticketTypeColors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

  const handleSave = () => {
    const activeCount = formFeatures.filter(f => f.active).length;
    
    const updatedProduct: Product = {
      ...product,
      name: formName,
      description: formDescription,
      healthScore: Number(formHealthScore),
      healthStatus: Number(formHealthScore) >= 70 ? HealthStatus.HEALTHY : HealthStatus.AT_RISK,
      maturity: formMaturity,
      adoptionRate: Number(formAdoptionRate),
      featuresTotal: formFeatures.length,
      featuresActive: activeCount,
      featuresList: formFeatures,
      radarDimensions: formRadar,
      scoreHistory: formHistory,
    };

    onUpdateProduct(accountId, updatedProduct);
    setIsEditing(false);
  };

  // --- LÓGICA DE CRUD DINÂMICO ---

  // Features (Módulos)
  const addFeature = () => {
    setFormFeatures([...formFeatures, { name: 'Novo Recurso', active: false }]);
  };
  const removeFeature = (idx: number) => {
    setFormFeatures(formFeatures.filter((_, i) => i !== idx));
  };
  const toggleFeature = (idx: number) => {
    setFormFeatures(prev => prev.map((f, i) => 
      i === idx ? { ...f, active: !f.active } : f
    ));
  };
  const updateFeatureName = (idx: number, name: string) => {
    setFormFeatures(prev => prev.map((f, i) => 
      i === idx ? { ...f, name } : f
    ));
  };

  // Radar (Dimensões)
  const addRadarDim = () => {
    setFormRadar([...formRadar, { subject: 'Nova Métrica', value: 50 }]);
  };
  const removeRadarDim = (idx: number) => {
    setFormRadar(formRadar.filter((_, i) => i !== idx));
  };
  const updateRadarDim = (idx: number, field: 'subject' | 'value', val: string | number) => {
    setFormRadar(prev => prev.map((r, i) => 
      i === idx ? { ...r, [field]: val } : r
    ));
  };

  // Histórico (Meses e Scores)
  const addHistoryPoint = () => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    let nextMonth = "Mês";
    if (formHistory.length > 0) {
      const lastMonth = formHistory[formHistory.length - 1].month;
      const idx = months.indexOf(lastMonth);
      if (idx !== -1) nextMonth = months[(idx + 1) % 12];
    }
    setFormHistory([...formHistory, { month: nextMonth, score: 70 }]);
  };
  const removeHistoryPoint = (idx: number) => {
    setFormHistory(formHistory.filter((_, i) => i !== idx));
  };
  const updateHistory = (idx: number, field: 'month' | 'score', val: string | number) => {
    setFormHistory(prev => prev.map((h, i) => 
      i === idx ? { ...h, [field]: val } : h
    ));
  };

  const inputStyle = "w-full bg-white border border-slate-300 p-2.5 rounded-xl focus:border-blue-500 outline-none text-xs font-bold text-slate-900 transition-all";
  const labelStyle = "text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block";

  // Formatação para os Gráficos
  const radarChartData = formRadar.map(d => ({ subject: d.subject, A: d.value, fullMark: 100 }));
  const historyChartData = formHistory.map(h => ({ name: h.month, value: h.score }));

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER HERO */}
      <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
          <div className="space-y-6 max-w-lg w-full">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-2">Saúde & Maturidade do Produto</h2>
                <h3 className="text-5xl font-black text-slate-900 tracking-tighter">{product.name}</h3>
                <p className="text-slate-500 font-bold mt-2 uppercase text-xs tracking-widest">{product.maturity}</p>
              </div>
              {!readonly && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
                >
                  Editar Indicadores
                </button>
              )}
            </div>
            
            <p className="text-slate-500 leading-relaxed text-sm font-medium">
              {product.description || "Nenhuma descrição definida para este produto."}
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50 mt-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Health Score</p>
                <p className={`text-3xl font-black ${product.healthScore >= 70 ? 'text-green-500' : 'text-amber-500'}`}>{product.healthScore}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Taxa de Adoção</p>
                <p className="text-3xl font-black text-slate-900">{product.adoptionRate}%</p>
              </div>
            </div>

            {/* Progress Tracker de Maturidade */}
            <div className="flex space-x-2 pt-2">
              {[1, 2, 3, 4, 5].map(i => {
                 const stageLevel = Number(product.maturity.split(' ')[1]) || 1;
                 return (
                    <div key={i} className={`h-2.5 flex-1 rounded-full ${i <= stageLevel ? 'bg-blue-600' : 'bg-slate-100'}`} />
                 );
              })}
            </div>
          </div>
          
          {/* GRÁFICO DE RADAR */}
          <div className="h-72 w-full md:w-96 bg-slate-50/50 rounded-3xl p-4 border border-slate-100 shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarChartData.length > 0 ? radarChartData : [{subject: '', A: 0}]}>
                <PolarGrid stroke="#cbd5e1" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                <Radar name="Status" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* GRÁFICO DE EVOLUÇÃO SCORE */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8">Evolução Histórica do Score</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LISTA DE MÓDULOS */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Módulos e Recursos Habilitados</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100 mb-4">
               <div>
                  <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Taxa de Ativação</p>
                  <p className="text-lg font-black text-blue-900">{product.featuresActive} de {product.featuresTotal} módulos</p>
               </div>
               <div className="w-12 h-12 rounded-full border-4 border-white bg-blue-600 flex items-center justify-center text-white font-black text-xs">
                 {product.featuresTotal > 0 ? Math.round((product.featuresActive / product.featuresTotal) * 100) : 0}%
               </div>
            </div>
            {product.featuresList?.map((f, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <span className="text-sm font-bold text-slate-700">{f.name}</span>
                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${
                  f.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  {f.active ? 'Ativado' : 'Bloqueado'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NOVA SEÇÃO: PERFORMANCE FINANCEIRA E SUPORTE */}
      <h3 className="text-xl font-black text-slate-900 mt-10 mb-6 flex items-center gap-3">
         <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
         Performance Financeira & Operacional
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Gráfico MRR vs Meta */}
         <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-96">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Evolução MRR vs Meta (Realizado)</h3>
            {mrrEvolutionData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mrrEvolutionData}>
                     <defs>
                        <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                           <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={(val) => `R$${val/1000}k`} />
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                        formatter={(value: number, name: string) => [`R$ ${value.toLocaleString()}`, name === 'real' ? 'MRR Real' : 'Meta']}
                     />
                     <Legend verticalAlign="top" height={36} iconType="circle" />
                     <Area type="monotone" dataKey="real" name="Realizado" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorReal)" />
                     <Line type="monotone" dataKey="goal" name="Objetivo Atual" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </AreaChart>
               </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-slate-400 italic bg-slate-50 rounded-2xl">
                  Sem dados financeiros importados para este produto.
               </div>
            )}
         </div>

         {/* Gráfico Tickets (Barras Empilhadas) */}
         <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-96">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Volume de Tickets (Conta)</h3>
            {ticketsEvolutionData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketsEvolutionData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                        cursor={{fill: '#f1f5f9'}}
                     />
                     <Legend verticalAlign="top" height={36} iconType="circle" />
                     {Object.keys(ticketsEvolutionData[0]).filter(k => k !== 'month').map((type, index) => (
                        <Bar key={type} dataKey={type} stackId="a" fill={ticketTypeColors[index % ticketTypeColors.length]} radius={[4, 4, 0, 0]} />
                     ))}
                  </BarChart>
               </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-slate-400 italic bg-slate-50 rounded-2xl">
                  Sem tickets registrados para esta conta.
               </div>
            )}
         </div>
      </div>

      {/* MODAL DE EDIÇÃO AVANÇADA */}
      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-6 overflow-y-auto">
           <div className="bg-white rounded-[40px] w-full max-w-5xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 my-8">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">Painel de Configuração Avançada</h3>
                 <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 p-2">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>

              <div className="p-8 bg-slate-50/30 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-h-[70vh] overflow-y-auto">
                
                {/* COLUNA 1: DADOS GERAIS E RADAR */}
                <div className="space-y-6">
                   <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                      <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-blue-50 pb-2">Informações Base</h4>
                      <div className="space-y-1">
                        <label className={labelStyle}>Maturidade</label>
                        <select value={formMaturity} onChange={e => setFormMaturity(e.target.value as MaturityStage)} className={inputStyle}>
                           {Object.values(MaturityStage).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className={labelStyle}>Health Score</label>
                          <input type="number" value={formHealthScore} onChange={e => setFormHealthScore(e.target.value)} className={inputStyle} />
                        </div>
                        <div className="space-y-1">
                          <label className={labelStyle}>Adoção (%)</label>
                          <input type="number" value={formAdoptionRate} onChange={e => setFormAdoptionRate(e.target.value)} className={inputStyle} />
                        </div>
                      </div>
                   </section>

                   <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                      <div className="flex justify-between items-center border-b border-blue-50 pb-2">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Dimensões do Radar</h4>
                        <button onClick={addRadarDim} className="text-[9px] font-black text-blue-500 uppercase">+ Adicionar</button>
                      </div>
                      <div className="space-y-4">
                         {formRadar.map((dim, idx) => (
                           <div key={idx} className="space-y-2 group">
                              <div className="flex justify-between">
                                <input 
                                  className="text-[10px] font-bold text-slate-800 bg-transparent border-none outline-none focus:ring-0 w-32 uppercase" 
                                  value={dim.subject} 
                                  onChange={e => updateRadarDim(idx, 'subject', e.target.value)} 
                                />
                                <button onClick={() => removeRadarDim(idx)} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                              <div className="flex items-center space-x-3">
                                <input 
                                  type="range" min="0" max="100" 
                                  value={dim.value} 
                                  onChange={e => updateRadarDim(idx, 'value', Number(e.target.value))}
                                  className="flex-1 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                                />
                                <span className="text-[10px] font-black text-slate-900 w-6 text-right">{dim.value}</span>
                              </div>
                           </div>
                         ))}
                      </div>
                   </section>
                </div>

                {/* COLUNA 2: HISTÓRICO DE SCORE */}
                <div className="space-y-6">
                   <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                      <div className="flex justify-between items-center border-b border-blue-50 pb-2">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Score por Mês (Linha)</h4>
                        <button onClick={addHistoryPoint} className="text-[9px] font-black text-blue-500 uppercase">+ Novo Ponto</button>
                      </div>
                      <div className="space-y-3">
                         {formHistory.map((hist, idx) => (
                           <div key={idx} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl group border border-slate-100">
                              <input 
                                type="text" 
                                value={hist.month} 
                                onChange={e => updateHistory(idx, 'month', e.target.value)} 
                                className="w-14 bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] font-black text-slate-800 uppercase text-center outline-none focus:border-blue-500" 
                              />
                              <input 
                                type="number" 
                                value={hist.score} 
                                onChange={e => updateHistory(idx, 'score', Number(e.target.value))} 
                                className="w-16 bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] font-black text-slate-800 text-center outline-none focus:border-blue-500" 
                              />
                              <div className="flex-1 text-right">
                                <button onClick={() => removeHistoryPoint(idx)} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                           </div>
                         ))}
                      </div>
                      {formHistory.length === 0 && <p className="text-[10px] text-slate-400 italic text-center py-4">Sem histórico registrado.</p>}
                   </section>
                </div>

                {/* COLUNA 3: MÓDULOS (CRUD) */}
                <div className="space-y-6">
                   <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                      <div className="flex justify-between items-center border-b border-blue-50 pb-2">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Gestão de Módulos</h4>
                        <button onClick={addFeature} className="text-[9px] font-black text-blue-500 uppercase">+ Novo Módulo</button>
                      </div>
                      <div className="space-y-2">
                         {formFeatures.map((feat, idx) => (
                           <div 
                             key={idx} 
                             className={`flex items-center justify-between p-3 rounded-xl border transition-all group ${feat.active ? 'bg-blue-50/30 border-blue-200' : 'bg-slate-50 border-slate-100'}`}
                           >
                              <div className="flex items-center space-x-3 flex-1">
                                 <input 
                                   type="checkbox" 
                                   checked={feat.active} 
                                   onChange={() => toggleFeature(idx)}
                                   className="w-4 h-4 rounded text-blue-600 cursor-pointer" 
                                 />
                                 <input 
                                   type="text" 
                                   value={feat.name} 
                                   onChange={e => updateFeatureName(idx, e.target.value)}
                                   className="bg-transparent border-none outline-none focus:ring-0 text-xs font-bold text-slate-700 w-full"
                                 />
                              </div>
                              <button onClick={() => removeFeature(idx)} className="text-red-200 hover:text-red-500 ml-2 opacity-0 group-hover:opacity-100 transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                           </div>
                         ))}
                      </div>
                   </section>
                </div>
              </div>

              {/* RODAPÉ DO MODAL */}
              <div className="p-8 bg-white border-t border-slate-100 flex gap-4">
                 <button onClick={() => setIsEditing(false)} className="flex-1 py-4 text-xs font-black text-slate-400 uppercase border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors">Cancelar</button>
                 <button onClick={handleSave} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-[0.98]">
                    Sincronizar e Atualizar Painel
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Maturity;
