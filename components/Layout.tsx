
import React, { useState } from 'react';
import { Icons } from '../constants';
import { User, UserRole, AppNotification } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onGoHome: () => void;
  onOpenSearch: () => void;
  user: User;
  notifications?: AppNotification[];
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onGoHome, onOpenSearch, user, notifications = [], onLogout }) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Geral', icon: Icons.Dashboard, permission: 'dashboard' },
    { id: 'accounts', label: 'Contas', icon: Icons.Accounts, permission: 'accounts' },
    { id: 'financials', label: 'Financeiro (MRR)', icon: Icons.Financials, permission: 'financials' },
    { id: 'tickets', label: 'Suporte / Tickets', icon: Icons.Tickets, permission: 'tickets' },
    { id: 'playbooks', label: 'Playbooks', icon: Icons.Playbooks, permission: 'playbooks' },
    { id: 'products', label: 'Catálogo de Produtos', icon: Icons.Products, permission: 'products' },
    { id: 'activities', label: 'Atividades', icon: Icons.Activities, permission: 'activities' },
    { id: 'success-plan', label: 'Planos de Sucesso', icon: Icons.SuccessPlan, permission: 'successPlan' },
    { id: 'meetings', label: 'Reuniões', icon: Icons.Meetings, permission: 'meetings' },
    { id: 'admin', label: 'Administração', icon: Icons.Admin, permission: 'admin' },
  ];

  const visibleItems = navItems.filter(item => {
    const permKey = item.permission as keyof typeof user.permissions;
    return user.permissions[permKey];
  });
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (n: AppNotification) => {
    if (n.linkTo) {
      setActiveTab(n.linkTo);
      setIsNotifOpen(false);
    }
  };

  const getNotifIcon = (type: string) => {
    switch(type) {
      case 'Risk': return <span className="text-red-500">⚠️</span>;
      case 'Opportunity': return <span className="text-green-500">💰</span>;
      case 'Task': return <span className="text-blue-500">⚡</span>;
      default: return <span className="text-slate-500">📢</span>;
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col z-20 shadow-sm relative">
        <div className="p-8 border-b border-slate-100 cursor-pointer flex items-center space-x-3" onClick={onGoHome}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xl italic shadow-blue-500/20 shadow-lg">S</div>
          <p className="text-lg font-black text-slate-900 tracking-tighter">SUCCESS PLATFORM</p>
        </div>
        
        <div className="px-6 pt-6 pb-2">
           <div className="flex gap-2">
              {/* Botão de Busca */}
              <button 
                onClick={onOpenSearch}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl transition-all text-slate-500 hover:bg-blue-50 hover:text-blue-600 border border-slate-100 hover:border-blue-200 bg-slate-50/50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </button>

              {/* Botão de Notificações */}
              <div className="relative">
                <button 
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className={`w-12 h-full flex items-center justify-center rounded-xl transition-all border ${isNotifOpen ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50/50 text-slate-500 border-slate-100 hover:border-blue-200 hover:text-blue-600'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown de Notificações */}
                {isNotifOpen && (
                  <div className="absolute left-0 top-14 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200 origin-top-left">
                     <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Notificações ({notifications.length})</h3>
                        <button onClick={() => setIsNotifOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                     </div>
                     <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-xs italic">Tudo limpo por aqui!</div>
                        ) : (
                          notifications.map(n => (
                            <div 
                              key={n.id} 
                              onClick={() => handleNotificationClick(n)}
                              className="p-4 border-b border-slate-50 hover:bg-blue-50 cursor-pointer transition-colors group"
                            >
                               <div className="flex justify-between items-start mb-1">
                                  <span className="text-xs">{getNotifIcon(n.type)}</span>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">{n.timestamp.toLocaleDateString()}</span>
                               </div>
                               <p className="text-xs font-black text-slate-800 group-hover:text-blue-600">{n.title}</p>
                               <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                            </div>
                          ))
                        )}
                     </div>
                     <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                        <span className="text-[9px] font-bold text-blue-500 cursor-pointer hover:underline uppercase tracking-widest">Marcar todas como lidas</span>
                     </div>
                  </div>
                )}
              </div>
           </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id)} 
              className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <item.icon />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
           <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-500 uppercase shadow-sm">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-xs font-black text-slate-900 truncate">{user.name}</p>
                 <p className="text-[9px] text-slate-400 font-bold uppercase truncate">{user.role}</p>
              </div>
           </div>
           <button 
             onClick={onLogout}
             className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors"
           >
             Sair do Sistema
           </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6 md:p-10 relative">{children}</main>
    </div>
  );
};

export default Layout;
