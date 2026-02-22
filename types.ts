
export enum HealthStatus {
  HEALTHY = 'Healthy',
  AT_RISK = 'At Risk',
  CRITICAL = 'Critical'
}

export enum MaturityStage {
  GROWTH_1 = 'Growth 1',
  GROWTH_2 = 'Growth 2',
  GROWTH_3 = 'Growth 3',
  GROWTH_4 = 'Growth 4',
  GROWTH_5 = 'Growth 5'
}

export enum VOCType {
  FEEDBACK_POSITIVE = 'Feedback Positivo',
  COMPLAINT = 'Reclamação',
  BUG = 'Bug / Problema Técnico',
  FEATURE_REQUEST = 'Sugestão de Melhoria',
  OTHER = 'Outros'
}

export enum VOCUrgency {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta',
  CRITICAL = 'Crítica'
}

export enum VOCStatus {
  PENDING = 'Pendente',
  IN_PROGRESS = 'Em Análise',
  RESOLVED = 'Resolvido',
  CLOSED = 'Arquivado'
}

export enum UserRole {
  ADMIN_GERAL = 'Administrador Geral',
  ADMIN_CONTA = 'Administrador de Conta',
  OPERADOR = 'Operador',
  VISUALIZADOR = 'Visualizador'
}

export enum ContactRole {
  DECISION_MAKER = 'Decisor Econômico',
  CHAMPION = 'Champion (Defensor)',
  INFLUENCER = 'Influenciador',
  USER = 'Usuário Chave',
  BLOCKER = 'Detrator / Bloqueador'
}

export enum ContactSentiment {
  POSITIVE = 'Positivo',
  NEUTRAL = 'Neutro',
  NEGATIVE = 'Negativo'
}

export interface AppPermissions {
  dashboard: boolean;
  accounts: boolean;
  financials: boolean;
  tickets: boolean;
  playbooks: boolean;
  products: boolean;
  activities: boolean;
  successPlan: boolean;
  meetings: boolean;
  voc: boolean;
  admin: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedAccountIds?: string[];
  permissions: AppPermissions;
  active: boolean;
  cnpj?: string;
}

export interface Contact {
  id: string;
  name: string;
  title: string; // Cargo
  email: string;
  phone?: string;
  role: ContactRole;
  sentiment: ContactSentiment;
  influenceLevel: 'Alto' | 'Médio' | 'Baixo';
  lastInteractionDate?: string;
  notes?: string;
}

export interface Milestone {
  id: string;
  title: string;
  status: 'Pendente' | 'Em Andamento' | 'Concluído';
  dueDate: string;
  responsible: string;
  kpi?: string;
}

export interface SuccessPlan {
  id: string;
  accountId: string;
  level: 'Conta (geral)' | string;
  objective: string;
  status: 'Ativo' | 'Pausado' | 'Concluído' | 'Draft';
  progress: number;
  createdAt?: string; // Campo novo para rastrear início na timeline
  milestones: Milestone[];
}

export interface Activity {
  id: string;
  title: string;
  category: 'Expansion' | 'Adoption' | 'Cross-Sell';
  status: 'Pending' | 'In Progress' | 'Completed';
  dueDate: string;
  urgency: 'baixa' | 'média' | 'alta';
  owner: string;
  productId?: string;
  accountId?: string;
  notes?: string;
  alertDays?: number;
}

// --- NOVOS TIPOS PARA PLAYBOOKS ---
export interface PlaybookTaskTemplate {
  title: string;
  category: 'Expansion' | 'Adoption' | 'Cross-Sell';
  urgency: 'baixa' | 'média' | 'alta';
  daysDue: number; // Dias para vencimento a partir da aplicação
  notesTemplate?: string;
}

export interface Playbook {
  id: string;
  title: string;
  description: string;
  trigger: string; // Descrição do gatilho (ex: "Health Score < 50")
  tasks: PlaybookTaskTemplate[];
}
// ----------------------------------

// --- MODULO FINANCEIRO ---
export type FinancialMovementType = 'New' | 'Expansion' | 'Contraction' | 'Churn' | 'Recurring' | 'Resurrection';

export interface FinancialRecord {
  id: string;
  accountId: string;
  productId: string; // Opcional se for a nível de conta, mas idealmente por produto
  date: string; // YYYY-MM-01
  amount: number;
  type: FinancialMovementType; 
}
// -------------------------

// --- MODULO DE TICKETS (NOVO) ---
export type TicketStatus = 'Open' | 'Pending' | 'Resolved' | 'Closed';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface TicketRecord {
  id: string;
  externalId: string; // ID no sistema de origem (Zendesk, Jira)
  accountId: string;
  subject: string;
  type: 'Bug' | 'Incident' | 'Question' | 'Task';
  status: TicketStatus;
  priority: TicketPriority;
  openedAt: string; // YYYY-MM-DD
  closedAt?: string;
}
// --------------------------------

// --- CENTRAL DE NOTIFICAÇÕES (NOVO) ---
export interface AppNotification {
  id: string;
  type: 'Risk' | 'Opportunity' | 'Task' | 'System';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  linkTo?: string; // Tab ID para navegação
}
// --------------------------------------

export interface CatalogProduct {
  id: string;
  name: string;
  description: string;
}

export interface ProductFeature {
  name: string;
  active: boolean;
}

export interface RadarDimension {
  subject: string;
  value: number;
}

export interface ScoreHistory {
  month: string;
  score: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  mrr: number;
  mrrObjetivo: number;
  dataPrevistaMRRObjetivo: string;
  dataAtingimentoMRR: string;
  dataInicioSetup: string;
  dataGoLivePrevisto: string;
  dataGoLiveRealizado: string;
  healthScore: number;
  healthStatus: HealthStatus;
  maturity: MaturityStage;
  adoptionRate: number;
  openTickets: number;
  criticalTickets: number;
  featuresTotal: number;
  featuresActive: number;
  featuresList: ProductFeature[];
  radarDimensions: RadarDimension[];
  scoreHistory: ScoreHistory[];
}

export interface AccountSegment {
  id: string;
  name: string;
  description?: string;
}

export interface Account {
  id: string;
  name: string;
  cnpj?: string;
  segment: string;
  segmentId?: string;
  products: Product[];
  activities: Activity[];
  contacts?: Contact[];
  vocPendente: number;
  successPlanId?: string;
}

export interface Meeting {
  id: string;
  accountId: string;
  accountName: string;
  productId?: string;
  productName?: string;
  date: string;
  type: 'QBR' | 'MBR' | 'Cadence';
  summary: string;
  participants: string[];
  vocDetailed?: string;
  vocType?: VOCType;
  vocUrgency?: VOCUrgency;
  vocStatus?: VOCStatus;
  
  mrrAtTime: number;
  mrrObjectiveAtTime?: number;
  mrrGapAtTime?: number;

  risks: string[];
  nextActions: string[];
  vocTags: string[];
  actionsCount: number;
  reminderDays?: number;
}

export interface Opportunity {
  id: string;
  accountId: string;
  accountName: string;
  productId: string;
  title: string;
  type: 'Cross-Sell' | 'Upsell';
  value: number;
  probability: number;
  crmStatus: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}
