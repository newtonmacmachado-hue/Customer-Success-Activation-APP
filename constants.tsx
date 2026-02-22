
import React from 'react';
import { Account, HealthStatus, MaturityStage, Meeting, Opportunity, VOCType, VOCUrgency, VOCStatus, CatalogProduct, User, UserRole, SuccessPlan, ContactRole, ContactSentiment, Playbook, AppPermissions, AccountSegment } from './types';

export const CATALOG_PRODUCTS: CatalogProduct[] = [
  { id: 'cp-1', name: 'PED+ PDF', description: 'Solução de automação de pedidos via PDF com inteligência artificial.' },
  { id: 'cp-2', name: 'PED+ WhatsApp', description: 'Automação via mensageria.' },
  { id: 'cp-3', name: 'Conect+ Data Hub', description: 'Centralização de dados de vendas.' },
];

export const DEFAULT_PERMISSIONS: AppPermissions = {
  dashboard: true,
  accounts: true,
  financials: true,
  tickets: true,
  playbooks: true,
  products: true,
  activities: true,
  successPlan: true,
  meetings: true,
  voc: true,
  admin: false
};

export const ADMIN_PERMISSIONS: AppPermissions = {
  ...DEFAULT_PERMISSIONS,
  admin: true
};

export const MOCK_USERS: User[] = [
  { 
    id: 'u-1', 
    name: 'Administrador Geral', 
    email: 'admin@success.com', 
    role: UserRole.ADMIN_GERAL,
    permissions: ADMIN_PERMISSIONS,
    active: true
  },
  { 
    id: 'u-2', 
    name: 'Newton Machado', 
    email: 'newton@success.com', 
    role: UserRole.ADMIN_CONTA, 
    assignedAccountIds: ['acc-bombril'],
    permissions: DEFAULT_PERMISSIONS,
    active: true
  },
];

export const MOCK_PLAYBOOKS: Playbook[] = [
  {
    id: 'pb-onboarding',
    title: 'Onboarding High-Touch',
    description: 'Processo padrão para ativação de novas contas Enterprise. Foco em garantia de Setup e Go-Live.',
    trigger: 'Nova conta criada ou Venda fechada (Closed Won)',
    tasks: [
      { title: 'Agendar Reunião de Kick-off', category: 'Adoption', urgency: 'alta', daysDue: 2, notesTemplate: 'Validar stakeholders e cronograma.' },
      { title: 'Enviar Kit de Boas-vindas e Documentação', category: 'Adoption', urgency: 'média', daysDue: 3 },
      { title: 'Realizar Treinamento Inicial (Admin)', category: 'Adoption', urgency: 'média', daysDue: 10 },
      { title: 'Configurar Ambiente de Produção', category: 'Adoption', urgency: 'alta', daysDue: 15 },
      { title: 'Agendar Go-Live Checkpoint', category: 'Adoption', urgency: 'alta', daysDue: 30 },
    ]
  },
  {
    id: 'pb-risk',
    title: 'Reversão de Risco (Churn)',
    description: 'Protocolo de emergência para contas com Health Score abaixo de 50 ou queda brusca de uso.',
    trigger: 'Health Score < 50 ou Detrator identificado',
    tasks: [
      { title: 'Diagnóstico de Saúde Profundo', category: 'Adoption', urgency: 'alta', daysDue: 1, notesTemplate: 'Analisar logs e tickets abertos.' },
      { title: 'Agendar Reunião de Crise com Decisor', category: 'Adoption', urgency: 'alta', daysDue: 3 },
      { title: 'Criar Plano de Ação de Resgate (Get Well Plan)', category: 'Adoption', urgency: 'alta', daysDue: 5 },
      { title: 'Monitoramento Diário de Adoção', category: 'Adoption', urgency: 'média', daysDue: 7 },
    ]
  },
  {
    id: 'pb-expansion',
    title: 'Campanha de Upsell Q3',
    description: 'Playbook para ofertar o módulo "WhatsApp" para clientes com alta adoção do "PDF".',
    trigger: 'Health Score > 80 e Uso > 90%',
    tasks: [
      { title: 'Mapear Potencial de Volume (WhatsApp)', category: 'Expansion', urgency: 'média', daysDue: 5 },
      { title: 'Apresentar Demo do Módulo WhatsApp', category: 'Cross-Sell', urgency: 'média', daysDue: 10 },
      { title: 'Enviar Proposta Comercial', category: 'Expansion', urgency: 'média', daysDue: 14 },
    ]
  }
];

// Exporting defaults for reuse in product creation
export const DEFAULT_RADAR = [
  { subject: 'Adoção', value: 80 },
  { subject: 'Estabilidade', value: 70 },
  { subject: 'Recorrência', value: 90 },
  { subject: 'Profundidade', value: 60 },
  { subject: 'Feedback', value: 85 },
];

export const DEFAULT_HISTORY = [
  { month: 'Mar', score: 65 },
  { month: 'Abr', score: 72 },
  { month: 'Mai', score: 80 },
];

export const DEFAULT_FEATURES = [
  { name: 'Core Platform', active: true },
  { name: 'Analytics Pro', active: false },
  { name: 'API Integration', active: true },
  { name: 'Predictive Insights', active: false },
];

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];

export const MOCK_DATA: { accounts: Account[], meetings: Meeting[], opportunities: Opportunity[], successPlans: SuccessPlan[], segments: AccountSegment[] } = {
  accounts: [
    {
      id: 'acc-bombril',
      name: 'Bombril',
      segment: 'Enterprise',
      vocPendente: 0,
      successPlanId: 'sp-1',
      activities: [
        { id: 'act-1', accountId: 'acc-bombril', title: 'Enviar lista de usuários e templates não ativos', category: 'Adoption', status: 'Pending', dueDate: tomorrowStr, urgency: 'alta', owner: 'Newton Machado' },
      ],
      contacts: [
        {
          id: 'ct-1',
          name: 'Roberto Silva',
          title: 'Diretor de TI',
          email: 'roberto@bombril.com.br',
          role: ContactRole.DECISION_MAKER,
          sentiment: ContactSentiment.NEUTRAL,
          influenceLevel: 'Alto',
          lastInteractionDate: '2024-05-15',
          notes: 'Focado em ROI e segurança de dados.'
        },
        {
          id: 'ct-2',
          name: 'Ana Paula Souza',
          title: 'Gerente de Vendas',
          email: 'ana.souza@bombril.com.br',
          role: ContactRole.CHAMPION,
          sentiment: ContactSentiment.POSITIVE,
          influenceLevel: 'Alto',
          lastInteractionDate: '2024-05-20',
          notes: 'Grande promotora da solução internamente. Nosso ponto focal.'
        },
        {
          id: 'ct-3',
          name: 'Carlos Mendez',
          title: 'Analista Sênior',
          email: 'carlos.m@bombril.com.br',
          role: ContactRole.BLOCKER,
          sentiment: ContactSentiment.NEGATIVE,
          influenceLevel: 'Médio',
          lastInteractionDate: '2024-04-10',
          notes: 'Prefere a solução do concorrente anterior. Requer atenção.'
        }
      ],
      products: [
        {
          id: 'p-ped-pdf',
          name: 'PED+ PDF',
          description: 'Solução de automação de pedidos via PDF.',
          mrr: 6100,
          mrrObjetivo: 10500,
          dataPrevistaMRRObjetivo: '2026-06-01',
          dataAtingimentoMRR: '',
          dataInicioSetup: '2025-07-01',
          dataGoLivePrevisto: '2026-02-01',
          dataGoLiveRealizado: '2026-02-01',
          healthScore: 80,
          healthStatus: HealthStatus.HEALTHY,
          maturity: MaturityStage.GROWTH_1,
          adoptionRate: 50,
          openTickets: 0,
          criticalTickets: 0,
          featuresTotal: 4,
          featuresActive: 2,
          featuresList: DEFAULT_FEATURES,
          radarDimensions: DEFAULT_RADAR,
          scoreHistory: DEFAULT_HISTORY
        }
      ]
    }
  ],
  meetings: [
    // DADOS DE TESTE: Reunião para amanhã (Gera Alerta de Reunião)
    {
      id: 'meet-mock-alert',
      accountId: 'acc-bombril',
      accountName: 'Bombril',
      productId: 'p-ped-pdf',
      productName: 'PED+ PDF',
      date: tomorrowStr,
      type: 'Cadence',
      summary: 'Reunião de alinhamento quinzenal.',
      participants: ['Newton Machado', 'Ana Paula Souza'],
      mrrAtTime: 6100,
      mrrObjectiveAtTime: 10500,
      mrrGapAtTime: -4400,
      risks: [],
      nextActions: [],
      vocTags: [],
      actionsCount: 0,
      reminderDays: 1 // Alerta 1 dia antes (hoje)
    }
  ],
  opportunities: [],
  successPlans: [],
  segments: [
    { id: '1', name: 'Enterprise', description: 'Contas de grande porte' },
    { id: '2', name: 'Mid-Market', description: 'Contas de médio porte' },
    { id: '3', name: 'SMB', description: 'Pequenas e médias empresas' }
  ]
};

export const Icons = {
  Dashboard: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  Accounts: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  Products: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14v14m0-14L4 7m8 4L4 7m0 0v10l8 4" /></svg>,
  SuccessPlan: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  Activities: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
  Meetings: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  Admin: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  Playbooks: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  Financials: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Tickets: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
};
