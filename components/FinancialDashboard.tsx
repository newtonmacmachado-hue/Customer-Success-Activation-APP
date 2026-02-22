import React, { useState, useMemo } from 'react';
import { Account, FinancialRecord, FinancialMovementType } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface FinancialDashboardProps {
  financialRecords: FinancialRecord[];
  accounts: Account[];
  onImportData: (records: FinancialRecord[]) => void;
  readonly?: boolean;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ 
  financialRecords = [], 
  accounts = [], 
  onImportData, 
  readonly 
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [csvText, setCsvText] = useState('');
  
  // Filtros Globais
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterProduct, setFilterProduct] = useState('all'); 
  
  // Filtro específico da tabela (Mês)
  const [filterMonth, setFilterMonth] = useState('');

  const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterAccount(e.target.value);
    setFilterProduct('all');
  };

  // BLINDAGEM 1: Extração segura de nomes de produtos
  const availableProductNames = useMemo(() => {
    const relevantAccounts = filterAccount === 'all' 
      ? (accounts || []) 
      : (accounts || []).filter(a => a.id === filterAccount);
    
    const names = new Set<string>();
    relevantAccounts.forEach(acc => {
      (acc.products || []).forEach(p => {
        if (p?.name) names.add(p.name);
      });
    });
    
    return Array.from(names).sort();
  }, [accounts, filterAccount]);

  // BLINDAGEM 2: Filtragem Global com proteção contra campos nulos
  const filteredGlobalRecords = useMemo(() => {
    return (financialRecords || []).filter(rec => {
      if (!rec) return false;

      // Filtro de Conta
      if (filterAccount !== 'all' && rec.accountId !== filterAccount) return false;

      // Filtro de Produto
      if (filterProduct !== 'all') {
         const acc = (accounts || []).find(a => a.id === rec.accountId);
         const prod = (acc?.products || []).find(p => p.id === rec.productId);
         if (!prod || prod.name !== filterProduct) return false;
      }

      return true;
    });
  }, [financialRecords, filterAccount, filterProduct, accounts]);

  const selectedViewLabel = useMemo(() => {
    const accLabel = filterAccount === 'all' ? 'Carteira Global' : ((accounts || []).find(a => a.id === filterAccount)?.name || 'Conta');
    const prodLabel = filterProduct === 'all' ? '' : ` • ${filterProduct}`;
    return filterAccount === 'all' && filterProduct !== 'all' ? `Produto Global: ${filterProduct}` : `${accLabel}${prodLabel}`;
  }, [filterAccount, filterProduct, accounts]);

  // BLINDAGEM 3: Agrupamento de evolução financeira (Area Chart)
  const evolutionData = useMemo(() => {
    const groupedByMonth: Record<string, number> = {};
    const allMonths = new Set<string>();

    filteredGlobalRecords.forEach(rec => {
      if (!rec.date) return;
      const monthKey = rec.date.substring(0, 7); // YYYY-MM
      allMonths.add(monthKey);
      groupedByMonth[monthKey] = (groupedByMonth[monthKey] || 0) + (Number(rec.amount) || 0);
    });

    return Array.from(allMonths).sort().map(month => ({
      name: month,
      mrr: groupedByMonth[month] || 0
    }));
  }, [filteredGlobalRecords]);

  // BLINDAGEM 4: Distribuição por Produto (Pie Chart)
  const productDistributionData = useMemo(() => {
    if (filteredGlobalRecords.length === 0) return [];

    const dates = filteredGlobalRecords.map(r => r.date || '').filter(Boolean).sort();
    if (dates.length === 0) return [];
    
    const lastMonth = dates[dates.length - 1].substring(0, 7);
    const currentRecords = filteredGlobalRecords.filter(r => (r.date || '').startsWith(lastMonth));

    const groupedByProduct: Record<string, number> = {};
    
    currentRecords.forEach(rec => {
      const acc = (accounts || []).find(a => a.id === rec.accountId);
      const prod = (acc?.products || []).find(p => p.id === rec.productId);
      const prodName = prod?.name || 'Outros / Desconhecido';

      groupedByProduct[prodName] = (groupedByProduct[prodName] || 0) + (Number(rec.amount) || 0);
    });

    return Object.keys(groupedByProduct).map(key => ({
      name: key,
      value: groupedByProduct[key]
    })).sort((a, b) => b.value - a.value);

  }, [filteredGlobalRecords, accounts]);

  // BLINDAGEM 5: Tabela de registros
  const tableData = useMemo(() => {
    return filteredGlobalRecords.filter(rec => {
      if (!rec.date) return false;
      return filterMonth ? rec.date.startsWith(filterMonth) : true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredGlobalRecords, filterMonth]);

  // KPIs Calculados com proteção total
  const currentTotalMRR = evolutionData.length > 0 ? (Number(evolutionData[evolutionData.length - 1].mrr) || 0) : 0;
  const previousTotalMRR = evolutionData.length > 1 ? (Number(evolutionData[evolutionData.length - 2].mrr) || 0) : 0;
  const growth = previousTotalMRR > 0 ? ((currentTotalMRR - previousTotalMRR) / previousTotalMRR) * 100 : 0;

  // Helpers de Nome
  const getAccountName = (id: string) => (accounts || []).find(a => a.id === id)?.name || 'Conta Removida';
  const getProductName = (accId: string, prodId: string) => {
    const acc = (accounts || []).find(a => a.id === accId);
    return (acc?.products || []).find(p => p.id === prodId)?.name || 'Produto Removido';
  };

  const handleProcessImport = () => {
    const lines = (csvText || '').split('\n');
    const newRecords: FinancialRecord[] = [];
    
    lines.forEach(line => {
      const cols = line.split(';');
      if (cols.length >= 4) {
        const accName = cols[0].trim();
        const prodName = cols[1].trim();
        const date = cols[2].trim(); 
        const amount = parseFloat(cols[3].trim());

        const acc = (accounts || []).find(a => (a.name || '').toLowerCase() === accName.toLowerCase());
        if (acc) {
          const prod = (acc.products || []).find(p => (p.name || '').toLowerCase() === prodName.toLowerCase());
          if (prod) {
             newRecords.push({
               id: `fin-${Math.random().toString(36).substr(2, 9)}`,
               accountId: acc.id,
               productId: prod.id,
               date: date,
               amount: isNaN(amount) ? 0 : amount,
               type: 'Recurring'
             });
          }
        }
      }
    });

    if (newRecords.length > 0) {
      onImportData(newRecords);
      setCsvText('');
      setIsImporting(false);
      alert(`${newRecords.length} registros importados com sucesso.`);
    } else {
      alert("Nenhum registro válido encontrado. Verifique o formato: Conta;Produto;YYYY-MM-DD;Valor");
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header e Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
           <h2 className="text-3xl font-black text-slate-900 tracking-tight">Evolução Financeira</h2>
           <p className="text-slate-500 font-medium">Análise de receita recorrente e saúde da carteira.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={filterAccount} onChange={handleAccountChange} className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-4 py-3 outline-none focus:border-blue-500 shadow-sm min-w-[180px]">
            <option value="all">Todas as Contas</option>
            {(accounts || []).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>

          <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-4 py-3 outline-none focus:border-blue-500 shadow-sm min-w-[180px]">
            <option value="all">Todos os Produtos</option>
            {(availableProductNames || []).map(pName => <option key={pName} value={pName}>{pName}</option>)}
          </select>

          {!readonly && (
            <button onClick={() => setIsImporting(true)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center space-x-2 text-xs uppercase">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              <span>Importar CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI CARDS BLINDADOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 p-6 opacity-5 text-blue-600">
               <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MRR Total (Atual)</p>
            <p className="text-4xl font-black text-slate-900 mt-2">R$ {currentTotalMRR.toLocaleString()}</p>
            <div className={`mt-2 text-xs font-bold ${growth >= 0 ? 'text-green-500' : 'text-red-500'} flex items-center`}>
               {growth >= 0 ? '↑' : '↓'} {growth.toFixed(1)}% vs mês anterior
            </div>
         </div>
         <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registros Filtrados</p>
            <p className="text-4xl font-black text-slate-900 mt-2">{filteredGlobalRecords.length}</p>
         </div>
         <div className="bg-blue-600 p-6 rounded-3xl border border-blue-500 shadow-xl text-white flex flex-col justify-center">
            <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Visão Selecionada</p>
            <p className="text-xl font-black mt-2 truncate">{selectedViewLabel}</p>
         </div>
      </div>

      {/* GRÁFICOS BLINDADOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-96">
           <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Tendência de MRR</h3>
           {evolutionData.length > 0 ? (
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={evolutionData}>
                 <defs>
                   <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                 <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={(val) => `R$${val/1000}k`} />
                 <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} formatter={(value: number) => [`R$ ${value.toLocaleString()}`, 'MRR']} />
                 <Area type="monotone" dataKey="mrr" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorMrr)" />
               </AreaChart>
             </ResponsiveContainer>
           ) : (
             <div className="h-full flex items-center justify-center text-slate-400 italic">Sem dados históricos suficientes.</div>
           )}
        </div>

        <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-96 flex flex-col">
           <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Mix de Produtos</h3>
           {productDistributionData.length > 0 ? (
             <div className="flex-1 min-h-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie data={productDistributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {productDistributionData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-[10px] font-bold text-slate-600 ml-1">{value}</span>} />
                 </PieChart>
               </ResponsiveContainer>
             </div>
           ) : (
             <div className="flex-1 flex items-center justify-center text-slate-400 italic">Sem dados de distribuição.</div>
           )}
        </div>
      </div>

      {/* Tabela de Detalhes */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Detalhamento dos Registros</h3>
            <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-blue-500 shadow-sm" />
         </div>
         <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left">
               <thead className="bg-white sticky top-0 border-b border-slate-100 shadow-sm">
                  <tr>
                     <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                     <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                     <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto</th>
                     <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor MRR</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {tableData.length === 0 ? (
                     <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic text-xs">Nenhum registro encontrado.</td></tr>
                  ) : (
                     tableData.map(rec => (
                        <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                           <td className="px-6 py-3 text-xs font-bold text-slate-500">{rec.date || '—'}</td>
                           <td className="px-6 py-3 text-sm font-bold text-slate-900">{getAccountName(rec.accountId)}</td>
                           <td className="px-6 py-3 text-xs font-medium text-slate-600">{getProductName(rec.accountId, rec.productId)}</td>
                           <td className="px-6 py-3 text-sm font-black text-slate-800 text-right">R$ {(Number(rec.amount) || 0).toLocaleString()}</td>
                        </tr>
                     ))
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* Modal de Importação */}
      {isImporting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-6">
           <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">Importar Dados</h3>
                 <button onClick={() => setIsImporting(false)} className="text-slate-400 hover:text-slate-600 p-2"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="p-8 space-y-4">
                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                    <p className="font-bold mb-1">Formato CSV (ponto e vírgula):</p>
                    <code className="block bg-white p-2 rounded border border-blue-100 text-xs font-mono">NomeConta;NomeProduto;YYYY-MM-DD;Valor</code>
                 </div>
                 <textarea value={csvText} onChange={e => setCsvText(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono h-48 focus:border-blue-500 outline-none" placeholder="Bombril;PED+;2024-01-01;5000.00" />
              </div>
              <div className="p-8 flex gap-4 border-t border-slate-100">
                 <button onClick={() => setIsImporting(false)} className="flex-1 py-4 text-xs font-black text-slate-400 uppercase border border-slate-200 rounded-2xl">Cancelar</button>
                 <button onClick={handleProcessImport} className="flex-[2] py-4 text-xs font-black text-white bg-blue-600 rounded-2xl shadow-xl hover:bg-blue-700">Importar Registros</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FinancialDashboard;