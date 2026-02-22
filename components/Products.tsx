
import React, { useState } from 'react';
import { CatalogProduct, Account } from '../types';

interface ProductsProps {
  catalogProducts: CatalogProduct[];
  accounts: Account[];
  onAddProduct: (p: CatalogProduct) => void;
  onDeleteProduct: (id: string) => void;
}

const Products: React.FC<ProductsProps> = ({ catalogProducts, accounts, onAddProduct, onDeleteProduct }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '' });

  const getProductStats = (productName: string) => {
    let count = 0;
    let totalMRR = 0;
    accounts.forEach(acc => {
      acc.products.forEach(p => {
        if (p.name === productName) {
          count++;
          totalMRR += p.mrr;
        }
      });
    });
    return { count, totalMRR };
  };

  const handleAdd = () => {
    if (!newProduct.name) return;
    onAddProduct({
      id: Math.random().toString(36).substr(2, 9),
      name: newProduct.name,
      description: newProduct.description
    });
    setNewProduct({ name: '', description: '' });
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-[#f97316] text-white px-6 py-2.5 rounded-xl font-bold flex items-center space-x-2 shadow-lg hover:bg-[#ea580c] transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
          <span>Novo Produto</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center space-x-3">
           <svg className="w-6 h-6 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14v14m0-14L4 7m8 4L4 7m0 0v10l8 4" /></svg>
           <h2 className="text-lg font-black text-slate-900">Catálogo de Produtos</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Nome</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Descrição</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Contas</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">MRR Total (Contas)</th>
                <th className="px-6 py-4 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {catalogProducts.map((p) => {
                const stats = getProductStats(p.name);
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-5 font-bold text-slate-900">{p.name}</td>
                    <td className="px-6 py-5 text-sm text-slate-400 italic">
                       {p.description || "—"}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-600 text-white text-xs font-black">
                        {stats.count}
                      </span>
                    </td>
                    <td className="px-6 py-5 font-black text-slate-800">
                      R$ {stats.totalMRR.toLocaleString()}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button className="text-slate-400 hover:text-slate-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                         </button>
                         <button 
                           onClick={() => onDeleteProduct(p.id)}
                           className="text-red-300 hover:text-red-500"
                         >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                         </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
           <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                 <h3 className="font-black text-slate-900">Novo Produto</h3>
                 <button onClick={() => setIsAdding(false)} className="text-slate-400">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Produto</label>
                    <input 
                      type="text"
                      className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-900"
                      value={newProduct.name}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição (Opcional)</label>
                    <textarea 
                      className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-blue-500 outline-none h-24 text-slate-900"
                      value={newProduct.description}
                      onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                    />
                 </div>
                 <button 
                  onClick={handleAdd}
                  className="w-full bg-[#f97316] text-white py-4 rounded-2xl font-black shadow-lg hover:bg-[#ea580c] transition-all"
                 >
                   Criar Produto
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Products;
