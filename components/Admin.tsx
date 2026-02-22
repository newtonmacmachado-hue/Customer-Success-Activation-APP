
import React, { useState, useEffect } from 'react';
import { User, UserRole, Account, AppPermissions, AccountSegment } from '../types';
import { DEFAULT_PERMISSIONS } from '../constants';
import { supabase, isSupabaseConfigured } from '../src/supabase';
import { fetchWithRetry } from '../src/utils/api';
import Papa from 'papaparse';

interface AdminProps {
  users: User[];
  accounts: Account[];
  segments: AccountSegment[];
  onAddSegment: (seg: Partial<AccountSegment>) => Promise<void>;
  onDeleteSegment: (id: string) => Promise<void>;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onAddUser: (user: User) => void;
  onImportAccounts?: (accounts: Account[]) => { created: number, updated: number };
}

const Admin: React.FC<AdminProps> = ({ users, accounts, segments, onAddSegment, onDeleteSegment, onUpdateUser, onDeleteUser, onAddUser, onImportAccounts }) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'database' | 'profile' | 'imports' | 'segments'>('users');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string, details?: string } | null>(null);
  
  // Segments State
  const [newSegment, setNewSegment] = useState({ name: '', description: '' });
  const [isAddingSegment, setIsAddingSegment] = useState(false);
  const [deletingSegmentId, setDeletingSegmentId] = useState<string | null>(null);

  const handleAddSegmentInternal = async () => {
    if (!newSegment.name) return;
    setIsAddingSegment(true);
    try {
      await onAddSegment(newSegment);
      setNewSegment({ name: '', description: '' });
    } finally {
      setIsAddingSegment(false);
    }
  };

  const handleDeleteSegmentInternal = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este segmento?')) return;
    setDeletingSegmentId(id);
    try {
      await onDeleteSegment(id);
    } finally {
      setDeletingSegmentId(null);
    }
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onImportAccounts) {
      setImportStatus(null);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const importedAccounts = results.data.map((row: any) => ({
              id: row.id,
              name: row.name,
              cnpj: row.cnpj,
              segment: row.segment,
              vocPendente: 0, // Default
              successPlanId: '',
              activities: [],
              contacts: [],
              products: []
              // Poderíamos mapear mais campos aqui se o CSV suportar
            })) as Account[];

            const result = onImportAccounts(importedAccounts);
            setImportStatus({
              type: 'success',
              message: 'Importação concluída com sucesso!',
              details: `${result.created} contas criadas, ${result.updated} contas atualizadas.`
            });
          } catch (err) {
            setImportStatus({ type: 'error', message: 'Erro ao processar dados do CSV.', details: String(err) });
          }
        },
        error: (error) => {
          setImportStatus({ type: 'error', message: 'Erro ao ler o arquivo CSV.', details: error.message });
        }
      });
    }
  };
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<{ status: string, database: string } | null>(null);

  useEffect(() => {
    fetchWithRetry('/api/health')
      .then(res => res.json())
      .then(data => setDbStatus(data))
      .catch(() => setDbStatus({ status: 'error', database: 'unknown' }));
  }, []);
  const [newUser, setNewUser] = useState<Partial<User> & { password?: string }>({
    name: '',
    email: '',
    password: '',
    role: UserRole.OPERADOR,
    permissions: DEFAULT_PERMISSIONS,
    active: true
  });

  const sqlScript = `-- 1. Perfis e Usuários
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'Operador',
  permissions JSONB,
  active BOOLEAN DEFAULT true,
  assigned_account_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Catálogo de Produtos
CREATE TABLE catalog_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

-- 3. Segmentos de Contas
CREATE TABLE account_segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. Contas (Clientes)
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  segment TEXT,
  segment_id UUID REFERENCES account_segments(id),
  cnpj TEXT,
  voc_pendente INTEGER DEFAULT 0,
  success_plan_id TEXT
);

-- 4. Produtos por Conta (Instâncias de Produtos)
CREATE TABLE account_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  catalog_product_id TEXT REFERENCES catalog_products(id),
  name TEXT NOT NULL,
  description TEXT,
  mrr NUMERIC,
  mrr_objetivo NUMERIC,
  data_prevista_mrr_objetivo DATE,
  data_atingimento_mrr DATE,
  data_inicio_setup DATE,
  data_go_live_previsto DATE,
  data_go_live_realizado DATE,
  health_score INTEGER,
  health_status TEXT,
  maturity TEXT,
  adoption_rate NUMERIC,
  open_tickets INTEGER,
  critical_tickets INTEGER,
  features_total INTEGER,
  features_active INTEGER,
  features_list JSONB,
  radar_dimensions JSONB,
  score_history JSONB
);

-- 5. Planos de Sucesso
CREATE TABLE success_plans (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  level TEXT,
  objective TEXT,
  status TEXT,
  progress INTEGER,
  created_at DATE
);

-- 6. Milestones (Marcos do Plano de Sucesso)
CREATE TABLE milestones (
  id TEXT PRIMARY KEY,
  success_plan_id TEXT REFERENCES success_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT,
  due_date DATE,
  responsible TEXT,
  kpi TEXT
);

-- 7. Playbooks
CREATE TABLE playbooks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  trigger TEXT
);

-- 8. Tarefas de Playbook
CREATE TABLE playbook_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playbook_id TEXT REFERENCES playbooks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  urgency TEXT,
  days_due INTEGER,
  notes_template TEXT
);

-- 9. Reuniões e Interações
CREATE TABLE meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  account_name TEXT,
  product_id TEXT,
  product_name TEXT,
  date DATE NOT NULL,
  type TEXT,
  summary TEXT,
  participants TEXT[],
  voc_detailed TEXT,
  voc_type TEXT,
  voc_urgency TEXT,
  voc_status TEXT,
  mrr_at_time NUMERIC,
  risks TEXT[],
  next_actions TEXT[],
  voc_tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 10. Atividades e Tarefas
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  status TEXT,
  due_date DATE,
  urgency TEXT,
  owner TEXT,
  notes TEXT
);

-- 11. Registros Financeiros (MRR History)
CREATE TABLE financial_records (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  product_id TEXT,
  date DATE NOT NULL,
  amount NUMERIC,
  type TEXT
);

-- 12. Tickets de Suporte
CREATE TABLE ticket_records (
  id TEXT PRIMARY KEY,
  external_id TEXT,
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  subject TEXT,
  type TEXT,
  status TEXT,
  priority TEXT,
  opened_at DATE,
  closed_at DATE
);

-- 13. Oportunidades (Upsell/Cross-sell)
CREATE TABLE opportunities (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  account_name TEXT,
  product_id TEXT,
  title TEXT,
  type TEXT,
  value NUMERIC,
  probability NUMERIC,
  crm_status TEXT
);`;

  const rlsScript = `-- 1. Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE success_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_segments ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de Acesso Restritivas (Multi-Tenant)

-- Profiles: Usuários só podem ver seu próprio perfil
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Accounts: Acesso baseado na lista de contas atribuídas no perfil do usuário
-- Nota: Isso assume que 'profiles.assigned_account_ids' contém os IDs das contas permitidas.
-- Se for NULL ou vazio, o acesso é negado.
CREATE POLICY "Access assigned accounts" ON accounts FOR ALL TO authenticated 
USING (
  id = ANY (
    SELECT unnest(assigned_account_ids) 
    FROM profiles 
    WHERE id = auth.uid()
  )
  OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'Administrador Geral'
  )
);

-- Account Products: Acesso via relacionamento com Accounts
CREATE POLICY "Access products of assigned accounts" ON account_products FOR ALL TO authenticated 
USING (
  account_id IN (
    SELECT id FROM accounts
  )
);

-- Meetings: Acesso via relacionamento com Accounts
CREATE POLICY "Access meetings of assigned accounts" ON meetings FOR ALL TO authenticated 
USING (
  account_id IN (
    SELECT id FROM accounts
  )
);

-- Activities: Acesso via relacionamento com Accounts
CREATE POLICY "Access activities of assigned accounts" ON activities FOR ALL TO authenticated 
USING (
  account_id IN (
    SELECT id FROM accounts
  )
);

-- Success Plans: Acesso via relacionamento com Accounts
CREATE POLICY "Access success plans of assigned accounts" ON success_plans FOR ALL TO authenticated 
USING (
  account_id IN (
    SELECT id FROM accounts
  )
);

-- Milestones: Acesso via relacionamento com Success Plans
CREATE POLICY "Access milestones of assigned plans" ON milestones FOR ALL TO authenticated 
USING (
  success_plan_id IN (
    SELECT id FROM success_plans
  )
);

-- Financial Records: Acesso via relacionamento com Accounts
CREATE POLICY "Access financial records of assigned accounts" ON financial_records FOR ALL TO authenticated 
USING (
  account_id IN (
    SELECT id FROM accounts
  )
);

-- Ticket Records: Acesso via relacionamento com Accounts
CREATE POLICY "Access tickets of assigned accounts" ON ticket_records FOR ALL TO authenticated 
USING (
  account_id IN (
    SELECT id FROM accounts
  )
);

-- Opportunities: Acesso via relacionamento com Accounts
CREATE POLICY "Access opportunities of assigned accounts" ON opportunities FOR ALL TO authenticated 
USING (
  account_id IN (
    SELECT id FROM accounts
  )
);

-- Playbooks: Leitura pública para autenticados (Catálogo Global)
CREATE POLICY "Read global playbooks" ON playbooks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read global playbook tasks" ON playbook_tasks FOR SELECT TO authenticated USING (true);

-- Account Segments: Leitura pública para autenticados (Catálogo Global)
CREATE POLICY "Read global segments" ON account_segments FOR SELECT TO authenticated USING (true);

-- Políticas de Gerenciamento para Admins (Catalogos)
CREATE POLICY "Admins can manage segments" ON account_segments FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'Administrador Geral'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'Administrador Geral'
  )
);

CREATE POLICY "Admins can manage playbooks" ON playbooks FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'Administrador Geral'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'Administrador Geral'
  )
);

CREATE POLICY "Admins can manage playbook tasks" ON playbook_tasks FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'Administrador Geral'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'Administrador Geral'
  )
);

-- Correção de dados legados (se houver)
UPDATE profiles SET role = 'Administrador Geral' WHERE role = 'Admin Geral';
`;

  const handleSeed = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    try {
      const response = await fetchWithRetry('/api/admin/seed', { method: 'POST' });
      const data = await response.json();
      setSeedResult(data);
    } catch (error) {
      setSeedResult({ error: 'Erro ao conectar com o servidor.' });
    }
    setIsSeeding(false);
  };

  const handleSave = (u: User) => {
    onUpdateUser(u);
    setEditingUser(null);
  };

  const handleAdd = async () => {
    if (newUser.name && newUser.email) {
      setIsCreatingUser(true);
      try {
        const response = await fetchWithRetry('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser)
        });

        const data = await response.json();

        if (response.ok) {
          onAddUser(data);
          setIsAdding(false);
          setNewUser({
            name: '',
            email: '',
            password: '',
            role: UserRole.OPERADOR,
            permissions: DEFAULT_PERMISSIONS,
            active: true
          });
        } else {
          alert(`Erro ao criar usuário: ${data.error}`);
        }
      } catch (error) {
        alert('Erro de conexão ao criar usuário.');
      } finally {
        setIsCreatingUser(false);
      }
    }
  };

  const togglePermission = (user: User, key: keyof AppPermissions) => {
    const updatedUser = {
      ...user,
      permissions: {
        ...user.permissions,
        [key]: !user.permissions[key]
      }
    };
    if (editingUser?.id === user.id) setEditingUser(updatedUser);
    else onUpdateUser(updatedUser);
  };

  const permissionLabels: Record<keyof AppPermissions, string> = {
    dashboard: 'Dashboard',
    accounts: 'Contas',
    financials: 'Financeiro',
    tickets: 'Tickets',
    playbooks: 'Playbooks',
    products: 'Produtos',
    activities: 'Atividades',
    successPlan: 'Planos de Sucesso',
    meetings: 'Reuniões',
    voc: 'V.O.C',
    admin: 'Administração'
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'As senhas não coincidem.' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    setIsChangingPassword(true);
    setPasswordStatus(null);

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (error) setPasswordStatus({ type: 'error', message: error.message });
      else {
        setPasswordStatus({ type: 'success', message: 'Senha alterada com sucesso!' });
        setPasswordData({ newPassword: '', confirmPassword: '' });
      }
    } else {
      setTimeout(() => {
        setPasswordStatus({ type: 'success', message: 'Senha alterada com sucesso (Modo Mock)!' });
        setPasswordData({ newPassword: '', confirmPassword: '' });
        setIsChangingPassword(false);
      }, 1000);
      return;
    }
    setIsChangingPassword(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Administração</h2>
          <p className="text-slate-500 font-medium">Gestão de acessos, perfis e infraestrutura de dados.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          {dbStatus && (
            <div className="flex items-center px-4 space-x-2 border-r border-slate-200 mr-2">
              <div className={`w-2 h-2 rounded-full ${dbStatus.database === 'supabase' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
              <span className="text-[9px] font-black uppercase text-slate-500">
                DB: {dbStatus.database === 'supabase' ? 'Supabase Conectado' : 'Modo Mock'}
              </span>
            </div>
          )}
          <button 
            onClick={() => setActiveAdminTab('users')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeAdminTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Usuários
          </button>
          <button 
            onClick={() => setActiveAdminTab('database')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeAdminTab === 'database' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Banco de Dados
          </button>
          <button 
            onClick={() => setActiveAdminTab('profile')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeAdminTab === 'profile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Meu Perfil
          </button>
          <button 
            onClick={() => setActiveAdminTab('imports')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeAdminTab === 'imports' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Gestão de Dados
          </button>
          <button 
            onClick={() => setActiveAdminTab('segments')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeAdminTab === 'segments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Segmentos
          </button>
        </div>
      </div>

      {activeAdminTab === 'segments' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-tight">Gerenciar Segmentos de Clientes</h3>
            
            <div className="flex gap-4 mb-8">
              <div className="flex-1">
                <input 
                  type="text" 
                  value={newSegment.name}
                  onChange={e => setNewSegment({...newSegment, name: e.target.value})}
                  placeholder="Nome do Segmento (ex: Enterprise)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                />
              </div>
              <div className="flex-[2]">
                <input 
                  type="text" 
                  value={newSegment.description}
                  onChange={e => setNewSegment({...newSegment, description: e.target.value})}
                  placeholder="Descrição (opcional)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                />
              </div>
              <button 
                onClick={handleAddSegmentInternal}
                disabled={!newSegment.name || isAddingSegment}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAddingSegment ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Adicionando...</span>
                  </>
                ) : (
                  'Adicionar'
                )}
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Contas</th>
                    <th className="px-6 py-4 w-24"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {segments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-xs italic">
                        Nenhum segmento cadastrado.
                      </td>
                    </tr>
                  ) : (
                    segments.map(seg => {
                      const accountCount = accounts.filter(a => a.segmentId === seg.id || a.segment === seg.name).length;
                      return (
                        <tr key={seg.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-bold text-slate-900">{seg.name}</td>
                          <td className="px-6 py-4 text-xs text-slate-500">{seg.description || '-'}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-black">
                              {accountCount}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleDeleteSegmentInternal(seg.id)}
                              className="text-red-400 hover:text-red-600 p-2 disabled:opacity-30"
                              disabled={accountCount > 0 || deletingSegmentId === seg.id}
                              title={accountCount > 0 ? "Não é possível excluir um segmento com contas vinculadas" : ""}
                            >
                              {deletingSegmentId === seg.id ? (
                                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'users' && (
        <>
          <div className="flex justify-end items-center space-x-4">
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
              <span>Novo Usuário</span>
            </button>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl mb-8">
            <h4 className="text-xs font-black text-indigo-700 uppercase mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Gestão de Senhas e Acessos
            </h4>
            <p className="text-[11px] text-indigo-600 font-medium leading-relaxed">
              Para criar novos usuários: <br/>
              1. Clique em <b>"Novo Usuário"</b> e preencha os dados (incluindo a senha inicial). <br/>
              2. O sistema criará o login no Supabase Auth e o perfil de acesso automaticamente. <br/>
              3. O usuário poderá acessar imediatamente com o e-mail e senha definidos.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Perfil</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Módulos</th>
              <th className="px-6 py-4 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map(user => (
              <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${!user.active ? 'opacity-50' : ''}`}>
                <td className="px-6 py-5">
                  <div className="font-bold text-slate-900">{user.name}</div>
                  <div className="text-[10px] text-slate-400 font-medium">{user.email}</div>
                </td>
                <td className="px-6 py-5">
                  <span className={`px-2 py-1 text-[9px] font-black rounded uppercase ${
                    user.role === UserRole.ADMIN_GERAL ? 'bg-red-100 text-red-700' :
                    user.role === UserRole.ADMIN_CONTA ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-5">
                   <button 
                    onClick={() => onUpdateUser({...user, active: !user.active})}
                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all ${
                      user.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'
                    }`}
                   >
                     {user.active ? 'Ativo' : 'Inativo'}
                   </button>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(user.permissions).map(([key, enabled]) => enabled && (
                      <span key={key} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-bold rounded">
                        {permissionLabels[key as keyof AppPermissions]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-5 flex justify-end space-x-2">
                   <button onClick={() => setEditingUser(user)} className="text-slate-400 hover:text-blue-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )}

  {activeAdminTab === 'database' && (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tight">1. Inicializar Schema</h3>
          <p className="text-sm text-slate-500 mb-6">Copie o script abaixo e execute-o no <b>SQL Editor</b> do seu painel Supabase para criar as tabelas necessárias.</p>
          
          <div className="relative group">
            <pre className="bg-slate-900 text-slate-300 p-6 rounded-2xl text-[10px] font-mono overflow-x-auto max-h-96">
              {sqlScript}
            </pre>
            <button 
              onClick={() => navigator.clipboard.writeText(sqlScript)}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all"
            >
              Copiar SQL
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tight">2. Segurança (RLS)</h3>
          <p className="text-sm text-slate-500 mb-6"><b>MUITO IMPORTANTE:</b> Execute este script no SQL Editor para proteger seus dados e permitir o acesso via aplicação.</p>
          
          <div className="relative group">
            <pre className="bg-slate-900 text-slate-300 p-6 rounded-2xl text-[10px] font-mono overflow-x-auto max-h-96">
              {rlsScript}
            </pre>
            <button 
              onClick={() => navigator.clipboard.writeText(rlsScript)}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all"
            >
              Copiar RLS
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tight">3. Popular Dados (Seed)</h3>
        <p className="text-sm text-slate-500 mb-6">Após criar as tabelas e aplicar o RLS, use este botão para migrar todos os dados de demonstração.</p>
        
        <button 
          onClick={handleSeed}
          disabled={isSeeding}
          className={`w-full py-6 rounded-2xl font-black text-sm uppercase transition-all flex items-center justify-center space-x-3 ${
            isSeeding ? 'bg-slate-100 text-slate-400' : 'bg-emerald-600 text-white shadow-xl shadow-emerald-100 hover:bg-emerald-700'
          }`}
        >
          {isSeeding ? (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              <span>Migrar Dados para Supabase</span>
            </>
          )}
        </button>

        {seedResult && (
          <div className={`mt-6 p-6 rounded-2xl border ${seedResult.errors?.length > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
            <h4 className={`text-xs font-black uppercase mb-3 ${seedResult.errors?.length > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              {seedResult.errors?.length > 0 ? 'Resultado com Erros' : 'Migração Concluída!'}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-600">
                <span>Contas:</span> <span>{seedResult.accounts || 0}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-600">
                <span>Reuniões:</span> <span>{seedResult.meetings || 0}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-600">
                <span>Atividades:</span> <span>{seedResult.activities || 0}</span>
              </div>
              {seedResult.errors?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-red-100">
                  <p className="text-[9px] font-black text-red-400 uppercase mb-2">Detalhes dos Erros:</p>
                  <ul className="text-[9px] text-red-600 list-disc list-inside space-y-1">
                    {seedResult.errors.map((err: string, i: number) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )}

  {activeAdminTab === 'profile' && (
    <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[40px] p-10 border border-slate-200 shadow-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Segurança da Conta</h3>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Alterar sua senha de acesso</p>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-6">
          {passwordStatus && (
            <div className={`p-4 rounded-2xl text-xs font-bold text-center border ${
              passwordStatus.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'
            }`}>
              {passwordStatus.message}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
            <input 
              type="password" 
              required 
              value={passwordData.newPassword}
              onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
            <input 
              type="password" 
              required 
              value={passwordData.confirmPassword}
              onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              placeholder="Repita a senha"
            />
          </div>

          <button 
            type="submit" 
            disabled={isChangingPassword}
            className="w-full bg-indigo-600 text-white py-5 rounded-[20px] font-black text-sm uppercase shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2"
          >
            {isChangingPassword ? 'Alterando...' : 'Atualizar Senha'}
          </button>
        </form>
      </div>
    </div>
  )}

      {(editingUser || isAdding) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
           <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
              <h3 className="text-xl font-black text-slate-900 mb-6">{isAdding ? 'Novo Usuário' : 'Editar Usuário'}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nome</label>
                    <input 
                      type="text"
                      value={isAdding ? newUser.name : editingUser?.name}
                      onChange={e => isAdding ? setNewUser({...newUser, name: e.target.value}) : setEditingUser({...editingUser!, name: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">CNPJ</label>
                    <input 
                      type="text"
                      value={isAdding ? newUser.cnpj || '' : editingUser?.cnpj || ''}
                      onChange={e => isAdding ? setNewUser({...newUser, cnpj: e.target.value}) : setEditingUser({...editingUser!, cnpj: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">E-mail</label>
                    <input 
                      type="email"
                      value={isAdding ? newUser.email : editingUser?.email}
                      onChange={e => isAdding ? setNewUser({...newUser, email: e.target.value}) : setEditingUser({...editingUser!, email: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Perfil</label>
                    <select 
                      value={isAdding ? newUser.role : editingUser?.role} 
                      onChange={e => isAdding ? setNewUser({...newUser, role: e.target.value as UserRole}) : setEditingUser({...editingUser!, role: e.target.value as UserRole})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                    >
                      {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  {isAdding && (
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Senha Inicial</label>
                      <input 
                        type="password"
                        value={newUser.password}
                        onChange={e => setNewUser({...newUser, password: e.target.value})}
                        placeholder="Padrão: Success123!"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      />
                    </div>
                  )}

                  {((isAdding ? newUser.role : editingUser?.role) === UserRole.ADMIN_CONTA) && (
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Atribuir Contas</label>
                      <div className="max-h-40 overflow-y-auto space-y-2 border border-slate-100 p-3 rounded-xl bg-slate-50">
                         {accounts.map(acc => (
                           <label key={acc.id} className="flex items-center space-x-2 text-xs font-bold text-slate-600 cursor-pointer">
                             <input 
                               type="checkbox" 
                               checked={isAdding ? newUser.assignedAccountIds?.includes(acc.id) : editingUser?.assignedAccountIds?.includes(acc.id)}
                               onChange={e => {
                                 const current = (isAdding ? newUser.assignedAccountIds : editingUser?.assignedAccountIds) || [];
                                 const next = e.target.checked ? [...current, acc.id] : current.filter(id => id !== acc.id);
                                 if (isAdding) setNewUser({...newUser, assignedAccountIds: next});
                                 else setEditingUser({...editingUser!, assignedAccountIds: next});
                               }}
                             />
                             <span>{acc.name}</span>
                           </label>
                         ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Permissões de Módulos</label>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.keys(permissionLabels).map((key) => {
                      const k = key as keyof AppPermissions;
                      const isEnabled = isAdding ? newUser.permissions?.[k] : editingUser?.permissions?.[k];
                      return (
                        <button
                          key={k}
                          onClick={() => {
                            if (isAdding) {
                              setNewUser({
                                ...newUser,
                                permissions: { ...newUser.permissions!, [k]: !newUser.permissions![k] }
                              });
                            } else {
                              togglePermission(editingUser!, k);
                            }
                          }}
                          className={`flex items-center justify-between px-4 py-2 rounded-xl border transition-all ${
                            isEnabled ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-100 text-slate-400'
                          }`}
                        >
                          <span className="text-xs font-bold">{permissionLabels[k]}</span>
                          <div className={`w-8 h-4 rounded-full relative transition-all ${isEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex space-x-3">
                 <button onClick={() => { setEditingUser(null); setIsAdding(false); }} className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-400 text-xs font-black uppercase">Cancelar</button>
                 <button 
                  onClick={() => isAdding ? handleAdd() : handleSave(editingUser!)} 
                  className="flex-2 py-4 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase shadow-xl shadow-indigo-100"
                 >
                   {isAdding ? 'Criar Usuário' : 'Salvar Alterações'}
                 </button>
              </div>
           </div>
        </div>
       )}

      {activeAdminTab === 'imports' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tight">Importação de Contas</h3>
            <p className="text-sm text-slate-500 mb-6">
              Utilize esta ferramenta para importar ou atualizar contas em massa via arquivo CSV.
              <br/>
              O sistema utiliza o <b>ID</b> ou o <b>Nome</b> da conta para identificar duplicatas. Se a conta já existir, os dados serão atualizados (Upsert).
            </p>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8">
              <h4 className="text-xs font-black text-slate-700 uppercase mb-3">Campos Esperados (CSV)</h4>
              <ul className="text-xs text-slate-600 space-y-2 font-mono">
                <li><span className="font-bold text-slate-900">id</span> (Opcional): Identificador único. Se vazio, será gerado automaticamente.</li>
                <li><span className="font-bold text-slate-900">name</span> (Obrigatório): Nome da conta/cliente.</li>
                <li><span className="font-bold text-slate-900">segment</span> (Opcional): Segmento (Enterprise, Mid-Market, SMB).</li>
              </ul>
              <p className="text-[10px] text-slate-400 mt-4 italic">
                * A primeira linha do arquivo deve conter os cabeçalhos exatamente como descrito acima.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl p-10 hover:bg-slate-50 transition-colors">
              <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              <p className="text-sm font-bold text-slate-600 mb-2">Arraste seu arquivo CSV aqui ou clique para selecionar</p>
              <label htmlFor="csv-upload-tab" className="mt-4 bg-indigo-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all cursor-pointer">
                Selecionar Arquivo
              </label>
              <input id="csv-upload-tab" type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
            </div>

            {importStatus && (
              <div className={`mt-8 p-6 rounded-2xl border flex items-start space-x-4 ${importStatus.type === 'success' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                <div className={`p-2 rounded-full ${importStatus.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                  {importStatus.type === 'success' ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  )}
                </div>
                <div>
                  <h4 className={`text-sm font-black uppercase mb-1 ${importStatus.type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>
                    {importStatus.message}
                  </h4>
                  {importStatus.details && (
                    <p className={`text-xs font-medium ${importStatus.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {importStatus.details}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
