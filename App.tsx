
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AccountSummary from './components/AccountSummary';
import Meetings from './components/Meetings';
import Expansion from './components/Expansion';
import Activities from './components/Activities';
import VOC from './components/VOC';
import Products from './components/Products';
import Maturity from './components/Maturity';
import AccountsList from './components/AccountsList';
import SuccessPlanForm from './components/SuccessPlanForm';
import SuccessPlansList from './components/SuccessPlansList';
import Admin from './components/Admin';
import Login from './components/Login';
import GlobalSearch from './components/GlobalSearch';
import Playbooks from './components/Playbooks';
import ChatBot from './components/ChatBot';
import FinancialDashboard from './components/FinancialDashboard';
import TicketsDashboard from './components/TicketsDashboard'; 

import { MOCK_DATA, CATALOG_PRODUCTS, MOCK_USERS, DEFAULT_FEATURES, DEFAULT_RADAR, DEFAULT_HISTORY, MOCK_PLAYBOOKS } from './constants';
import { Account, Product, Meeting, Activity, CatalogProduct, User, UserRole, SuccessPlan, HealthStatus, MaturityStage, Playbook, FinancialRecord, TicketRecord, AppNotification, Opportunity, AccountSegment } from './types';
import { supabase, isSupabaseConfigured } from './src/supabase';
import { fetchWithRetry, safeJson } from './src/utils/api';
import { useToast } from './components/Toast';
import { ErrorCode, getUserMessage } from './src/utils/errorTypes';

import ConfirmationModal from './components/ConfirmationModal';

const App: React.FC = () => {
  const { addToast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState<{ 
    accounts: Account[], 
    meetings: Meeting[], 
    opportunities: Opportunity[], 
    successPlans: SuccessPlan[],
    segments: AccountSegment[]
  }>({ 
    accounts: [], 
    meetings: [], 
    opportunities: [], 
    successPlans: [],
    segments: []
  });
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [playbooksList, setPlaybooksList] = useState<Playbook[]>([]);

  // Estados Transacionais (Origem da Verdade)
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [ticketRecords, setTicketRecords] = useState<TicketRecord[]>([]);

  useEffect(() => {
    if (isSupabaseConfigured() && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
          setCurrentUser(null);
          setActiveTab('dashboard');
        } else if (session?.user) {
          fetchUserProfile(session.user.id, session.user.email!);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const fetchUserProfile = async (userId: string, userEmail: string) => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileData) {
          setCurrentUser(profileData as User);
        }
      } catch (e) {
        console.error("Error fetching profile:", e);
      }
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      if (isSupabaseConfigured() && supabase) {
        const { data: usersData, error } = await supabase.from('profiles').select('*');
        if (error) {
          console.error('Error fetching users:', error);
        } else {
          setUsers(usersData as User[]);
        }
      } else {
        setUsers(MOCK_USERS);
      }

      try {
        const accountsRes = await fetchWithRetry('/api/accounts');
        const accountsData = await safeJson<Account[]>(accountsRes);
        
        const meetingsRes = await fetchWithRetry('/api/meetings');
        const meetingsData = await safeJson<Meeting[]>(meetingsRes);
        
        const opportunitiesRes = await fetchWithRetry('/api/opportunities');
        const opportunitiesData = await safeJson<Opportunity[]>(opportunitiesRes);

        const successPlansRes = await fetchWithRetry('/api/success-plans');
        const successPlansData = await safeJson<SuccessPlan[]>(successPlansRes);

        const segmentsRes = await fetchWithRetry('/api/segments');
        const segmentsData = await safeJson<AccountSegment[]>(segmentsRes);

        setData({
          accounts: accountsData,
          meetings: meetingsData,
          opportunities: opportunitiesData,
          successPlans: successPlansData,
          segments: segmentsData
        });

      } catch (error: any) { 
        console.error("Error fetching data:", error);
        
        const defaultMsg = getUserMessage(error.code || ErrorCode.ERR_BACK_INTERNAL);
        const message = (error.message && !error.message.includes('Server Error')) ? error.message : defaultMsg;
        addToast(message, 'error');
        
        // If it's an auth error, force logout
        if (error.code === ErrorCode.ERR_BACK_AUTH) {
          handleLogout();
        }
        
        setData(MOCK_DATA);
      }

      setCatalog(CATALOG_PRODUCTS);
      setPlaybooksList(MOCK_PLAYBOOKS);
      setFinancialRecords([]);
      setTicketRecords([]);

      setIsLoading(false);
    };

    initializeData();
  }, []);



  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<{ id: string; callback: () => void } | null>(null);
  const [isEditingSuccessPlan, setIsEditingSuccessPlan] = useState(false);
  const [editingPlanData, setEditingPlanData] = useState<SuccessPlan | undefined>(undefined);

  const canModify = currentUser?.role !== UserRole.VISUALIZADOR;
  const isAdminGeral = currentUser?.role === UserRole.ADMIN_GERAL;

  const filteredAccounts = isAdminGeral || currentUser?.role === UserRole.OPERADOR || currentUser?.role === UserRole.VISUALIZADOR 
    ? data.accounts 
    : data.accounts.filter(a => currentUser?.assignedAccountIds?.includes(a.id));

  // --- ENGINE DE NOTIFICAÇÕES (NOVO) ---
  const notifications = useMemo(() => {
    const notifs: AppNotification[] = [];
    const today = new Date();

    // 1. Notificações de Tickets Críticos
    const criticalOpenTickets = ticketRecords.filter(t => t.priority === 'Critical' && t.status !== 'Closed' && t.status !== 'Resolved');
    criticalOpenTickets.forEach(t => {
      const acc = data.accounts.find(a => a.id === t.accountId);
      notifs.push({
        id: `notif-tick-${t.id}`,
        type: 'Risk',
        title: `Ticket Crítico: ${acc?.name || 'Cliente'}`,
        message: t.subject,
        timestamp: new Date(t.openedAt),
        read: false,
        linkTo: 'tickets'
      });
    });

    // 2. Notificações de Risco Financeiro (Churn/Contraction recente)
    const recentRisks = financialRecords.filter(f => (f.type === 'Churn' || f.type === 'Contraction') && f.date.startsWith(today.toISOString().substring(0, 7))); // Mes atual
    recentRisks.forEach(r => {
      const acc = data.accounts.find(a => a.id === r.accountId);
      notifs.push({
        id: `notif-fin-${r.id}`,
        type: 'Risk',
        title: `Alerta Financeiro: ${acc?.name || 'Cliente'}`,
        message: `Registro de ${r.type} identificado no valor de R$ ${r.amount}.`,
        timestamp: new Date(r.date),
        read: false,
        linkTo: 'financials'
      });
    });

    // 3. Reuniões Próximas (Hoje/Amanhã)
    data.meetings.forEach(m => {
      const meetDate = new Date(m.date);
      const diffTime = meetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays <= 1) {
         notifs.push({
           id: `notif-meet-${m.id}`,
           type: 'Task',
           title: `Reunião Próxima: ${m.accountName}`,
           message: `${m.type} agendada para ${diffDays === 0 ? 'Hoje' : 'Amanhã'}. Prepare a pauta.`,
           timestamp: new Date(),
           read: false,
           linkTo: 'meetings'
         });
      }
    });

    return notifs.sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [ticketRecords, financialRecords, data.meetings, data.accounts]);

  // --- MOTOR DE CÁLCULO E SINCRONIZAÇÃO ---
  useEffect(() => {
    const updatedAccounts = data.accounts.map(acc => {
      let accHasChanges = false;

      const updatedProducts = (acc.products || []).map(prod => {
        const prodRecords = financialRecords
          .filter(r => r.productId === prod.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const latestRecord = prodRecords[0];
        if (latestRecord && latestRecord.amount !== prod.mrr) {
          accHasChanges = true;
          return { ...prod, mrr: latestRecord.amount };
        }
        return prod;
      });

      const accTickets = ticketRecords.filter(t => t.accountId === acc.id && (t.status === 'Open' || t.status === 'Pending'));
      const criticalTickets = accTickets.filter(t => t.priority === 'Critical').length;
      
      if (updatedProducts.length > 0) {
         const p0 = updatedProducts[0];
         if (p0.openTickets !== accTickets.length || p0.criticalTickets !== criticalTickets) {
            updatedProducts[0] = { ...p0, openTickets: accTickets.length, criticalTickets: criticalTickets };
            accHasChanges = true;
         }
      }

      if (accHasChanges) {
        return { ...acc, products: updatedProducts };
      }
      return acc;
    });

    if (JSON.stringify(updatedAccounts) !== JSON.stringify(data.accounts)) {
       setData(prev => ({ ...prev, accounts: updatedAccounts }));
       if (selectedAccount) {
          const updatedSelected = updatedAccounts.find(a => a.id === selectedAccount.id);
          if (updatedSelected) setSelectedAccount(updatedSelected);
       }
    }

  }, [financialRecords, ticketRecords, data.accounts.length]);

  // --- BUSCA GLOBAL ---
  const handleSearchNavigation = (result: any) => {
    setIsSearchOpen(false);
    
    let targetAccount = null;
    if (result.type === 'Conta') {
      targetAccount = result.data;
    } else if (result.parentId) {
      targetAccount = data.accounts.find(a => a.id === result.parentId);
    }

    if (targetAccount) {
      setSelectedAccount(targetAccount);
    }

    switch (result.type) {
      case 'Conta':
        setActiveTab('account-summary');
        setSelectedProduct(null);
        break;
      case 'Produto':
        setSelectedProduct(result.data);
        setActiveTab('product-detail');
        break;
      case 'Reunião':
        setActiveTab('meetings'); 
        break;
      case 'Atividade':
        setActiveTab('activities');
        break;
      case 'Plano de Sucesso':
        setActiveTab('success-plan');
        break;
      default:
        setActiveTab('dashboard');
    }
  };

  const handleImportFinancialData = (newRecords: FinancialRecord[]) => {
    if (!canModify) return;
    const updatedRecords = [...financialRecords];
    newRecords.forEach(nr => {
      const idx = updatedRecords.findIndex(r => r.accountId === nr.accountId && r.productId === nr.productId && r.date === nr.date);
      if (idx >= 0) updatedRecords[idx] = nr;
      else updatedRecords.push(nr);
    });
    setFinancialRecords(updatedRecords);
  };

  const handleImportTickets = (newTickets: TicketRecord[]) => {
    if (!canModify) return;
    const updatedRecords = [...ticketRecords];
    newTickets.forEach(nt => {
      const idx = updatedRecords.findIndex(t => t.externalId === nt.externalId);
      if (idx >= 0) updatedRecords[idx] = nt;
      else updatedRecords.push(nt);
    });
    setTicketRecords(updatedRecords);
  };

  const handleUpdateActivity = async (updatedActivity: Activity) => {
    if (!canModify) return;
    try {
      const response = await fetchWithRetry(`/api/activities/${updatedActivity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedActivity)
      });
      if (response.ok) {
        const savedActivity = await response.json();
        const updatedAccounts = data.accounts.map(acc => 
          acc.id === savedActivity.accountId 
            ? { ...acc, activities: acc.activities.map(act => act.id === savedActivity.id ? savedActivity : act) } 
            : acc
        );
        setData({ ...data, accounts: updatedAccounts });
        if (selectedAccount?.id === savedActivity.accountId) {
          setSelectedAccount(prev => prev ? { ...prev, activities: prev.activities.map(act => act.id === savedActivity.id ? savedActivity : act) } : null);
        }
      }
    } catch (error) {
      console.error("Error updating activity:", error);
    }
  };

  const handleAddActivity = async (newActivity: Activity) => {
    if (!canModify) return;
    try {
      const response = await fetchWithRetry(`/api/accounts/${newActivity.accountId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newActivity)
      });
      if (response.ok) {
        const savedActivity = await response.json();
        const updatedAccounts = data.accounts.map(acc => 
          acc.id === savedActivity.accountId 
            ? { ...acc, activities: [...acc.activities, savedActivity] } 
            : acc
        );
        setData({ ...data, accounts: updatedAccounts });
        if (selectedAccount?.id === savedActivity.accountId) {
          setSelectedAccount(prev => prev ? { ...prev, activities: [...prev.activities, savedActivity] } : null);
        }
      }
    } catch (error) {
      console.error("Error adding activity:", error);
    }
  };

  const handleApplyPlaybook = (playbook: Playbook, accountId: string) => {
    if (!canModify) return;
    const newActivities: Activity[] = playbook.tasks.map(task => {
       const dueDate = new Date();
       dueDate.setDate(dueDate.getDate() + task.daysDue);
       return {
         id: `act-pb-${Math.random().toString(36).substr(2, 9)}`,
         accountId: accountId,
         title: `[${playbook.title}] ${task.title}`,
         category: task.category,
         urgency: task.urgency,
         status: 'Pending',
         owner: currentUser?.name || 'A definir',
         dueDate: dueDate.toISOString().split('T')[0],
         alertDays: 2,
         notes: task.notesTemplate || `Gerado automaticamente pelo playbook: ${playbook.title}`
       };
    });
    const updatedAccounts = data.accounts.map(acc => acc.id === accountId ? { ...acc, activities: [...acc.activities, ...newActivities] } : acc);
    setData({ ...data, accounts: updatedAccounts });
    if (selectedAccount?.id === accountId) {
      const acc = updatedAccounts.find(a => a.id === accountId);
      if (acc) setSelectedAccount(acc);
      setActiveTab('activities');
    }
  };

  const handleAddPlaybook = (pb: Playbook) => { if (!canModify) return; setPlaybooksList([...playbooksList, pb]); };
  const handleUpdatePlaybook = (pb: Playbook) => { if (!canModify) return; setPlaybooksList(playbooksList.map(p => p.id === pb.id ? pb : p)); };
  const handleDeletePlaybook = (id: string) => { if (!canModify) return; setPlaybooksList(playbooksList.filter(p => p.id !== id)); };

  const handleUpdateAccount = async (updatedAcc: Account) => {
    if (!canModify) return;

    try {
      const response = await fetchWithRetry(`/api/accounts/${updatedAcc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAcc)
      });

      if (response.ok) {
        const savedAccount = await response.json();
        const updatedAccounts = data.accounts.map(a => a.id === savedAccount.id ? savedAccount : a);
        setData({ ...data, accounts: updatedAccounts });
        if (selectedAccount?.id === savedAccount.id) setSelectedAccount(savedAccount);
      } else {
        console.error("Failed to update account on server");
      }
    } catch (error) {
      console.error("Error updating account:", error);
    }
  };

  const handleAddAccount = async (newAcc: Account) => {
    if (!canModify) return;
    try {
      const response = await fetchWithRetry('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAcc)
      });

      const savedAccount = await safeJson<Account>(response);
      // Ensure arrays exist
      savedAccount.products = savedAccount.products || [];
      savedAccount.activities = savedAccount.activities || [];
      setData({ ...data, accounts: [...data.accounts, savedAccount] });
      addToast('Conta criada com sucesso!', 'success');
    } catch (error: any) {
      const defaultMsg = getUserMessage(error.code || ErrorCode.ERR_BACK_INTERNAL);
      const message = (error.message && !error.message.includes('Server Error')) ? error.message : defaultMsg;
      addToast(message, 'error');
      console.error("Error creating account:", error);
    }
  };

  const handleDeleteAccount = async (id: string, callback: () => void): Promise<void> => {
    if (!isAdminGeral) {
       console.warn('[App] User is not admin, aborting delete.');
       callback(); // Ensure spinner stops
       return;
    }
    
    try {
      console.log(`[App] Sending DELETE request to /api/accounts/${id}`);
      const response = await fetchWithRetry(`/api/accounts/${id}`, { method: 'DELETE' });
      console.log(`[App] DELETE response status: ${response.status}`);

      if (response.ok) {
        setData(prev => ({ 
          ...prev, 
          accounts: prev.accounts.filter(a => a.id !== id),
          meetings: prev.meetings.filter(m => m.accountId !== id),
          opportunities: prev.opportunities.filter(o => o.accountId !== id),
          successPlans: prev.successPlans.filter(p => p.accountId !== id)
        }));
        if (selectedAccount?.id === id) setSelectedAccount(null);
        addToast('Conta excluída com sucesso!', 'success');
      } else {
        const errorData = await response.json();
        console.error('[App] Delete failed with response:', errorData);
        throw new Error(errorData.message || 'Erro ao excluir conta.');
      }
    } catch (error: any) {
      console.error("Error deleting account:", error);
      addToast(error.message || 'Erro ao excluir conta.', 'error');
    } finally {
      callback();
    }
  };

  const handleAddSegment = async (newSeg: Partial<AccountSegment>) => {
    if (!isAdminGeral) return;
    try {
      const response = await fetchWithRetry('/api/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSeg)
      });
      
      const savedSeg = await safeJson<AccountSegment>(response);
      setData(prev => ({ ...prev, segments: [...prev.segments, savedSeg] }));
      addToast('Segmento criado com sucesso!', 'success');
    } catch (error: any) {
      console.error("Error adding segment:", error);
      const defaultMsg = getUserMessage(error.code || ErrorCode.ERR_BACK_INTERNAL);
      const message = (error.message && !error.message.includes('Server Error')) ? error.message : defaultMsg;
      addToast(message, 'error');
    }
  };

  const handleDeleteSegment = async (id: string) => {
    if (!isAdminGeral) return;
    try {
      const response = await fetchWithRetry(`/api/segments/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setData(prev => ({ ...prev, segments: prev.segments.filter(s => s.id !== id) }));
        addToast('Segmento excluído com sucesso!', 'success');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir segmento.');
      }
    } catch (error: any) {
      console.error("Error deleting segment:", error);
      addToast(error.message || 'Erro ao excluir segmento.', 'error');
    }
  };

  // Funções refatoradas para gravar no Banco de Dados
  const handleUpdateProduct = async (accountId: string, updatedProd: Product) => {
    if (!canModify) return;

    const accToUpdate = data.accounts.find(a => a.id === accountId);
    if (!accToUpdate) return;

    const updatedAcc = { 
       ...accToUpdate, 
       products: (accToUpdate.products || []).map(p => p.id === updatedProd.id ? updatedProd : p) 
    };

    const updatedAccounts = data.accounts.map(acc => acc.id === accountId ? updatedAcc : acc);
    setData({ ...data, accounts: updatedAccounts });
    
    if (selectedAccount?.id === accountId) setSelectedAccount(updatedAcc);
    if (selectedProduct?.id === updatedProd.id) setSelectedProduct(updatedProd);

    // Salva a alteração da conta com o novo produto na API
    await handleUpdateAccount(updatedAcc);
  };

  const handleLinkProduct = async (accountId: string, catalogProduct: CatalogProduct, customData: Partial<Product>) => {
    if (!canModify) return;

    const newProduct: Product = {
      id: `p-${Math.random().toString(36).substr(2, 5)}`,
      name: catalogProduct.name,
      description: catalogProduct.description,
      mrr: Number(customData.mrr) || 0,
      mrrObjetivo: Number(customData.mrrObjetivo) || 0,
      dataPrevistaMRRObjetivo: customData.dataPrevistaMRRObjetivo || '',
      dataAtingimentoMRR: customData.dataAtingimentoMRR || '',
      dataInicioSetup: customData.dataInicioSetup || '',
      dataGoLivePrevisto: customData.dataGoLivePrevisto || '',
      dataGoLiveRealizado: customData.dataGoLiveRealizado || '',
      healthScore: Number(customData.healthScore) || 100,
      healthStatus: (Number(customData.healthScore) || 100) >= 70 ? HealthStatus.HEALTHY : HealthStatus.AT_RISK,
      maturity: customData.maturity || MaturityStage.GROWTH_1,
      adoptionRate: Number(customData.adoptionRate) || 0,
      openTickets: 0,
      criticalTickets: 0,
      featuresTotal: Number(customData.featuresTotal) || 5,
      featuresActive: 0,
      featuresList: customData.featuresList || DEFAULT_FEATURES,
      radarDimensions: customData.radarDimensions || DEFAULT_RADAR,
      scoreHistory: customData.scoreHistory || DEFAULT_HISTORY
    };

    const accToUpdate = data.accounts.find(a => a.id === accountId);
    if (!accToUpdate) return;

    const updatedAcc = { 
      ...accToUpdate, 
      products: [...(accToUpdate.products || []), newProduct] 
    };

    const updatedAccounts = data.accounts.map(acc => acc.id === accountId ? updatedAcc : acc);
    setData({ ...data, accounts: updatedAccounts });
    if (selectedAccount?.id === accountId) setSelectedAccount(updatedAcc);

    // Salva a vinculação no banco de dados
    await handleUpdateAccount(updatedAcc);
  };

  const handleSaveSuccessPlan = async (plan: SuccessPlan) => {
    if (!canModify) return;
    try {
      const isNew = !data.successPlans.some(p => p.id === plan.id);
      const url = isNew ? '/api/success-plans' : `/api/success-plans/${plan.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetchWithRetry(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan)
      });

      if (response.ok) {
        const savedPlan = await response.json();
        const updatedPlans = isNew 
          ? [...data.successPlans, savedPlan]
          : data.successPlans.map(p => p.id === savedPlan.id ? savedPlan : p);
        
        const updatedAccounts = data.accounts.map(acc => acc.id === savedPlan.accountId ? { ...acc, successPlanId: savedPlan.id } : acc);
        setData({ ...data, successPlans: updatedPlans, accounts: updatedAccounts });
        if (selectedAccount?.id === savedPlan.accountId) setSelectedAccount(prev => prev ? { ...prev, successPlanId: savedPlan.id } : null);
        
        setIsEditingSuccessPlan(false);
        setEditingPlanData(undefined);
        if (selectedAccount) setActiveTab('account-summary');
      }
    } catch (error) {
      console.error("Error saving success plan:", error);
    }
  };

  const handleAddCatalogProduct = (p: CatalogProduct) => setCatalog([...catalog, p]);
  const handleDeleteCatalogProduct = (id: string) => setCatalog(catalog.filter(c => c.id !== id));
  
  const handleAddMeeting = async (meeting: Meeting) => {
    if (!canModify) return;
    try {
      const response = await fetchWithRetry('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meeting)
      });
      if (response.ok) {
        const savedMeeting = await response.json();
        setData({ ...data, meetings: [savedMeeting, ...data.meetings] });
      }
    } catch (error) {
      console.error("Error adding meeting:", error);
    }
  };

  const handleUpdateMeeting = async (updatedMeeting: Meeting) => { 
    if (!canModify) return; 
    try {
      const response = await fetchWithRetry(`/api/meetings/${updatedMeeting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMeeting)
      });
      if (response.ok) {
        const savedMeeting = await response.json();
        setData({ ...data, meetings: data.meetings.map(m => m.id === savedMeeting.id ? savedMeeting : m) });
      }
    } catch (error) {
      console.error("Error updating meeting:", error);
    }
  };

  const handleDeleteMeeting = async (id: string) => { 
    if (!canModify) return; 
    try {
      const response = await fetchWithRetry(`/api/meetings/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setData({ ...data, meetings: data.meetings.filter(m => m.id !== id) });
      }
    } catch (error) {
      console.error("Error deleting meeting:", error);
    }
  };

  const handleSelectAccount = (acc: Account) => { setSelectedAccount(acc); setSelectedProduct(null); setActiveTab('account-summary'); };
  const handleSelectProduct = (prod: Product) => { setSelectedProduct(prod); setActiveTab('product-detail'); };
  const handleLogin = (user: User) => { setCurrentUser(user); setActiveTab('dashboard'); };

  const handleUpdateUser = (updatedUser: User) => {
    if (!isAdminGeral) return;
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    // In a real app, this would be a fetch to /api/users/:id
  };

  const handleAddUser = (newUser: User) => {
    if (!isAdminGeral) return;
    setUsers([...users, newUser]);
    // In a real app, this would be a fetch to /api/users
  };

  const handleImportAccounts = (importedAccounts: Account[]) => {
    if (!canModify) return { created: 0, updated: 0 };
    
    const currentAccounts = [...data.accounts];
    let createdCount = 0;
    let updatedCount = 0;

    importedAccounts.forEach(imported => {
      const existingIndex = currentAccounts.findIndex(
        acc => (imported.id && acc.id === imported.id) || acc.name.toLowerCase() === imported.name.toLowerCase()
      );

      if (existingIndex >= 0) {
        currentAccounts[existingIndex] = { ...currentAccounts[existingIndex], ...imported };
        updatedCount++;
      } else {
        const newAccount = {
            ...imported,
            id: imported.id || `acc-${Math.random().toString(36).substr(2, 9)}`,
            products: imported.products || [],
            activities: imported.activities || [],
            contacts: imported.contacts || []
        };
        currentAccounts.push(newAccount);
        createdCount++;
      }
    });

    setData({ ...data, accounts: currentAccounts });
    return { created: createdCount, updated: updatedCount };
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Carregando plataforma...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    if (activeTab === 'account-summary' && selectedAccount) {
      const plan = data.successPlans.find(p => p.id === selectedAccount.successPlanId);
      const accMeetings = data.meetings.filter(m => m.accountId === selectedAccount.id);
      return (
        <AccountSummary 
          account={selectedAccount} 
          meetings={accMeetings} 
          opportunities={data.opportunities.filter(o => o.accountId === selectedAccount.id)}
          successPlan={plan}
          onNavigateTo={(tab) => {
             if (tab === 'success-plan') {
                 setEditingPlanData(plan);
                 setIsEditingSuccessPlan(true);
             }
             setActiveTab(tab);
          }}
          catalogProducts={catalog}
          onLinkProduct={handleLinkProduct}
          onUpdateProduct={handleUpdateProduct}
          onUpdateAccount={handleUpdateAccount}
          onSelectProduct={handleSelectProduct}
          readonly={!canModify}
        />
      );
    }

    if (activeTab === 'product-detail' && selectedProduct && selectedAccount) {
      return (
        <div className="space-y-6">
           <button 
             onClick={() => setActiveTab('account-summary')}
             className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 flex items-center space-x-2"
           >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              <span>Voltar para {selectedAccount.name}</span>
           </button>
           <Maturity 
             product={selectedProduct} 
             accountId={selectedAccount.id} 
             onUpdateProduct={handleUpdateProduct}
             financialRecords={financialRecords}
             ticketRecords={ticketRecords}
             readonly={!canModify}
           />
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard accounts={filteredAccounts} onSelectAccount={handleSelectAccount} meetings={data.meetings} opportunities={data.opportunities} onNavigateTo={setActiveTab} financialRecords={financialRecords} ticketRecords={ticketRecords} />;
      case 'accounts': return <AccountsList accounts={filteredAccounts} segments={data.segments} onSelectAccount={handleSelectAccount} onUpdateAccount={handleUpdateAccount} onAddAccount={handleAddAccount} onDeleteAccount={async (id, callback) => { setAccountToDelete({ id, callback }); setIsConfirmationModalOpen(true); }} isAdmin={isAdminGeral} />;
      case 'financials': return <FinancialDashboard financialRecords={financialRecords} accounts={filteredAccounts} onImportData={handleImportFinancialData} readonly={!canModify} />;
      case 'tickets': return <TicketsDashboard tickets={ticketRecords} accounts={filteredAccounts} onImportTickets={handleImportTickets} readonly={!canModify} />;
      case 'playbooks': return <Playbooks playbooks={playbooksList} accounts={filteredAccounts} onApplyPlaybook={handleApplyPlaybook} onAddPlaybook={handleAddPlaybook} onUpdatePlaybook={handleUpdatePlaybook} onDeletePlaybook={handleDeletePlaybook} readonly={!canModify} />;
      case 'products': return <Products catalogProducts={catalog} accounts={filteredAccounts} onAddProduct={handleAddCatalogProduct} onDeleteProduct={handleDeleteCatalogProduct} />;
      case 'activities': return <Activities account={selectedAccount || filteredAccounts[0]} onUpdateActivity={handleUpdateActivity} onAddActivity={handleAddActivity} accounts={filteredAccounts} product={null} isGlobal={!selectedAccount} allActivities={data.accounts.flatMap(a => (a.activities || []).map(act => ({...act, accountId: a.id})))} />;
      case 'success-plan':
        if (isEditingSuccessPlan) return <SuccessPlanForm accounts={filteredAccounts} initialPlan={editingPlanData} onSave={handleSaveSuccessPlan} onCancel={() => { setIsEditingSuccessPlan(false); setEditingPlanData(undefined); }} />;
        return <SuccessPlansList plans={data.successPlans} accounts={filteredAccounts} onEditPlan={(plan) => { setEditingPlanData(plan); setIsEditingSuccessPlan(true); }} onCreatePlan={() => { setEditingPlanData(undefined); setIsEditingSuccessPlan(true); }} />;
      case 'admin': return isAdminGeral ? <Admin users={users} accounts={data.accounts} segments={data.segments} onAddSegment={handleAddSegment} onDeleteSegment={handleDeleteSegment} onUpdateUser={handleUpdateUser} onDeleteUser={() => {}} onAddUser={handleAddUser} onImportAccounts={handleImportAccounts} /> : <div className="p-10 text-center text-slate-400">Acesso negado.</div>;
      case 'meetings': return <Meetings meetings={data.meetings} accounts={filteredAccounts} selectedAccountFromParent={selectedAccount} onAddMeeting={handleAddMeeting} onUpdateMeeting={handleUpdateMeeting} onDeleteMeeting={handleDeleteMeeting} onAddActivity={handleAddActivity} product={null} />;
      case 'voc': return <VOC meetings={data.meetings} accounts={filteredAccounts} product={null} onUpdateMeeting={handleUpdateMeeting} />;
      default: return <Dashboard accounts={filteredAccounts} onSelectAccount={handleSelectAccount} meetings={data.meetings} opportunities={data.opportunities} onNavigateTo={setActiveTab} />;
    }
  };

  return (
    <>
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onGoHome={() => { setSelectedAccount(null); setSelectedProduct(null); setActiveTab('dashboard'); }}
        onOpenSearch={() => setIsSearchOpen(true)}
        user={currentUser}
        notifications={notifications}
        onLogout={handleLogout}
      >
        {renderContent()}
      </Layout>
      <GlobalSearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        data={{
          accounts: filteredAccounts,
          meetings: data.meetings,
          successPlans: data.successPlans
        }}
        onNavigate={handleSearchNavigation}
      />
      <ConfirmationModal 
        isOpen={isConfirmationModalOpen}
        onClose={() => {
          if (accountToDelete) accountToDelete.callback(); // Stop spinner on cancel
          setIsConfirmationModalOpen(false);
          setAccountToDelete(null);
        }}
        onConfirm={() => {
          if (accountToDelete) {
            handleDeleteAccount(accountToDelete.id, accountToDelete.callback);
          }
          setIsConfirmationModalOpen(false);
          setAccountToDelete(null);
        }}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir esta conta e TODOS os seus registros (produtos, reuniões, atividades, etc)? A ação não pode ser desfeita."
        confirmText="Excluir Conta"
      />
      <ChatBot data={{ accounts: filteredAccounts, meetings: data.meetings, successPlans: data.successPlans, opportunities: data.opportunities }} />
    </>
  );
};

export default App;