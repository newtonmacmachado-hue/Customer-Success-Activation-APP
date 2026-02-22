
import React from 'react';
import { Opportunity } from '../types';

interface ExpansionProps {
  opportunities: Opportunity[];
}

const Expansion: React.FC<ExpansionProps> = ({ opportunities }) => {
  const totalValue = opportunities.reduce((acc, o) => acc + o.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Pipeline de Expansão</h2>
          <p className="text-slate-500">Gestão de cross-sell e upsell integrada ao CRM.</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Potencial Total</p>
          <p className="text-3xl font-black text-blue-600">${totalValue.toLocaleString()}.00</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Oportunidade</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Estimado</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Probabilidade</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status CRM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {opportunities.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Nenhuma oportunidade registrada para esta seleção.</td>
              </tr>
            ) : (
              opportunities.map((opp) => (
                <tr key={opp.id} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                  <td className="px-6 py-5">
                    <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{opp.title}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Prod ID: {opp.productId}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-2 py-1 text-[10px] font-black rounded uppercase tracking-tighter ${
                      opp.type === 'Cross-Sell' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {opp.type}
                    </span>
                  </td>
                  <td className="px-6 py-5 font-bold text-slate-700">
                    ${opp.value.toLocaleString()}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 bg-slate-100 h-1.5 w-16 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${opp.probability > 60 ? 'bg-green-500' : 'bg-amber-400'}`} 
                          style={{ width: `${opp.probability}%` }}
                        />
                      </div>
                      <span className="text-xs font-black text-slate-500">{opp.probability}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-bold text-slate-600">{opp.crmStatus}</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center space-x-2 text-blue-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
              <span>Inteligência de Vendas</span>
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-3">
                <span className="text-slate-400 font-medium">Ciclo médio</span>
                <span className="font-black">45 dias</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-3">
                <span className="text-slate-400 font-medium">Win Rate Atual</span>
                <span className="font-black">32%</span>
              </div>
            </div>
          </div>
          <button className="w-full mt-8 py-3 bg-blue-600 rounded-xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg active:scale-95">
            Ver Insights de Expansão
          </button>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 tracking-tight">Status da Sincronização</h3>
          <div className="flex items-center space-x-4 mb-6 p-4 bg-slate-50 rounded-2xl">
            <div className="w-12 h-12 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center font-black text-blue-600 italic">CRM</div>
            <div>
              <p className="text-sm font-black text-slate-800">Salesforce v2.4</p>
              <p className="text-[10px] text-green-500 font-black uppercase tracking-widest">Conectado • Online</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-medium italic">
            Alterações realizadas no pipeline refletem instantaneamente no CRM da conta global. 
            Contate o Admin em caso de divergências.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Expansion;
