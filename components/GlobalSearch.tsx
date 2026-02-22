
import React, { useState, useEffect, useRef } from 'react';
import { Account, Meeting, SuccessPlan, Activity } from '../types';

interface SearchResult {
  id: string;
  type: 'Conta' | 'Produto' | 'Reunião' | 'Atividade' | 'Plano de Sucesso';
  title: string;
  subtitle: string;
  data?: any; // Objeto original para manipulação
  parentId?: string; // ID da conta pai (para produtos/planos)
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    accounts: Account[];
    meetings: Meeting[];
    successPlans: SuccessPlan[];
  };
  onNavigate: (result: SearchResult) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose, data, onNavigate }) => {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setTerm('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!term.trim()) {
      setResults([]);
      return;
    }

    const lowerTerm = term.toLowerCase();
    const searchResults: SearchResult[] = [];

    // 1. Buscar em Contas
    data.accounts.forEach(acc => {
      if (acc.name.toLowerCase().includes(lowerTerm) || acc.segment.toLowerCase().includes(lowerTerm)) {
        searchResults.push({
          id: acc.id,
          type: 'Conta',
          title: acc.name,
          subtitle: `Segmento: ${acc.segment}`,
          data: acc
        });
      }

      // 2. Buscar em Produtos (dentro das contas)
      acc.products.forEach(prod => {
        if (prod.name.toLowerCase().includes(lowerTerm)) {
          searchResults.push({
            id: prod.id,
            type: 'Produto',
            title: prod.name,
            subtitle: `Em: ${acc.name} • MRR: R$ ${prod.mrr}`,
            data: prod,
            parentId: acc.id
          });
        }
      });

      // 3. Buscar em Atividades
      acc.activities.forEach(act => {
        if (act.title.toLowerCase().includes(lowerTerm)) {
          searchResults.push({
            id: act.id,
            type: 'Atividade',
            title: act.title,
            subtitle: `Status: ${act.status} • ${acc.name}`,
            data: act,
            parentId: acc.id
          });
        }
      });
    });

    // 4. Buscar em Reuniões
    data.meetings.forEach(meet => {
      if (
        meet.summary.toLowerCase().includes(lowerTerm) || 
        meet.accountName.toLowerCase().includes(lowerTerm) ||
        meet.type.toLowerCase().includes(lowerTerm)
      ) {
        searchResults.push({
          id: meet.id,
          type: 'Reunião',
          title: `${meet.type} - ${meet.accountName}`,
          subtitle: meet.date.split('-').reverse().join('/'),
          data: meet,
          parentId: meet.accountId
        });
      }
    });

    // 5. Buscar em Planos de Sucesso
    data.successPlans.forEach(plan => {
      const accName = data.accounts.find(a => a.id === plan.accountId)?.name || 'N/A';
      if (plan.objective.toLowerCase().includes(lowerTerm)) {
        searchResults.push({
          id: plan.id,
          type: 'Plano de Sucesso',
          title: `Plano: ${accName}`,
          subtitle: `Progresso: ${plan.progress}%`,
          data: plan,
          parentId: plan.accountId
        });
      }
    });

    setResults(searchResults);
  }, [term, data]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'Conta': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
      case 'Produto': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14v14m0-14L4 7m8 4L4 7m0 0v10l8 4" /></svg>;
      case 'Reunião': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
      case 'Plano de Sucesso': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
      default: return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" /></svg>;
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-start justify-center pt-24 px-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[70vh]">
        <div className="p-4 border-b border-slate-100 flex items-center space-x-3">
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Busque por contas, produtos, reuniões ou atividades..." 
            className="flex-1 text-lg font-medium text-slate-900 placeholder:text-slate-400 outline-none"
            value={term}
            onChange={e => setTerm(e.target.value)}
          />
          <button onClick={onClose} className="px-2 py-1 text-xs font-bold bg-slate-100 text-slate-500 rounded border border-slate-200">ESC</button>
        </div>

        <div className="overflow-y-auto flex-1 p-2">
          {term && results.length === 0 ? (
            <div className="py-12 text-center text-slate-400 italic">
              Nenhum resultado encontrado para "{term}".
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((result, idx) => (
                <button 
                  key={`${result.type}-${result.id}-${idx}`}
                  onClick={() => onNavigate(result)}
                  className="w-full flex items-center space-x-4 p-3 hover:bg-blue-50 rounded-xl transition-colors group text-left"
                >
                  <div className={`p-2 rounded-lg ${result.type === 'Conta' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-200 group-hover:text-blue-700'}`}>
                    {getIcon(result.type)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 group-hover:text-blue-700">{result.title}</p>
                    <div className="flex items-center space-x-2">
                       <span className="text-[10px] font-black uppercase text-slate-400 border border-slate-200 px-1.5 rounded">{result.type}</span>
                       <span className="text-xs text-slate-500">{result.subtitle}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {!term && (
             <div className="py-12 text-center">
                <p className="text-slate-400 font-medium text-sm">Digite para começar a pesquisar...</p>
             </div>
          )}
        </div>
        
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between uppercase font-bold tracking-widest">
           <span>Success Platform Search</span>
           <span>{results.length} Resultados</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
