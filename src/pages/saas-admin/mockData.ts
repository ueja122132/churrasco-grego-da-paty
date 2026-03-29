import { 
  Store, 
  Users, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  DollarSign,
  Activity,
  Globe,
  ShieldCheck,
  Zap
} from 'lucide-react';

export const SaaSMetrics = {
  overview: [
    { label: 'Total de Empresas', value: '142', change: '+12%', trend: 'up', icon: Store, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Empresas Ativas', value: '128', change: '+8%', trend: 'up', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'MRR (Mensal)', value: 'R$ 42.500', change: '+15%', trend: 'up', icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'ARR (Anual)', value: 'R$ 510.000', change: '+18%', trend: 'up', icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Taxa de Churn', value: '2.4%', change: '-0.5%', trend: 'down', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'LTV Médio', value: 'R$ 3.200', change: '+5%', trend: 'up', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
  ],
  revenueData: [
    { name: 'Jan', value: 28000, churn: 1200 },
    { name: 'Fev', value: 31000, churn: 1100 },
    { name: 'Mar', value: 33500, churn: 1500 },
    { name: 'Abr', value: 35000, churn: 900 },
    { name: 'Mai', value: 38200, churn: 1300 },
    { name: 'Jun', value: 42500, churn: 1000 },
  ],
  customerGrowth: [
    { name: 'Jan', users: 80, companies: 100 },
    { name: 'Fev', users: 120, companies: 112 },
    { name: 'Mar', users: 190, companies: 121 },
    { name: 'Abr', users: 240, companies: 128 },
    { name: 'Mai', users: 310, companies: 135 },
    { name: 'Jun', users: 420, companies: 142 },
  ]
};

export const MockCompanies = [
  { id: '1', name: 'Burger King Local', email: 'contato@bklocal.com.br', plan: 'Premium', status: 'active', registeredAt: '2026-01-15', revenue: 15400, orders: 450, churnRisk: 'low' },
  { id: '2', name: 'Pizzaria do Bairro', email: 'admin@pizzabairro.com', plan: 'Pro', status: 'active', registeredAt: '2026-02-10', revenue: 8900, orders: 280, churnRisk: 'low' },
  { id: '3', name: 'Sushimania House', email: 'sushi@house.com', plan: 'Premium', status: 'inadimplente', registeredAt: '2026-01-05', revenue: 21000, orders: 620, churnRisk: 'high' },
  { id: '4', name: 'Açaí do Porto', email: 'acai@porto.com', plan: 'Basic', status: 'suspended', registeredAt: '2026-03-01', revenue: 0, orders: 0, churnRisk: 'neutral' },
  { id: '5', name: 'Pastelaria da Vovó', email: 'vovo@pastéis.com.br', plan: 'Pro', status: 'active', registeredAt: '2026-02-28', revenue: 4200, orders: 150, churnRisk: 'medium' },
];

export const MockPlans = [
  { id: 'p1', name: 'Basic', price: 99.90, limits: { orders: 500, users: 2, storage: '1GB' }, features: ['Painel Admin', 'Cardápio Digital', 'WhatsApp Bot'] },
  { id: 'p2', name: 'Pro', price: 199.90, limits: { orders: 2000, users: 5, storage: '5GB' }, features: ['Tudo do Basic', 'Gestão Financeira', 'Múltiplas Impressoras'] },
  { id: 'p3', name: 'Premium', price: 399.90, limits: { orders: 'Ilimitado', users: 15, storage: '20GB' }, features: ['Tudo do Pro', 'App Próprio', 'Suporte VIP'] },
];

export const SystemLogs = [
  { id: 'l1', user: 'Admin Master', action: 'Alteração de Plano', target: 'Pizzaria do Bairro', date: '2026-03-28 14:30', type: 'info' },
  { id: 'l2', user: 'Sistema', action: 'Bloqueio Automático', target: 'Sushimania House', date: '2026-03-28 12:00', type: 'warning' },
  { id: 'l3', user: 'Tiago (Suporte)', action: 'Login Efetuado', target: '-', date: '2026-03-28 09:15', type: 'success' },
  { id: 'l4', user: 'API Gateway', action: 'Erro de Autenticação', target: 'Webhook Stripe', date: '2026-03-28 08:45', type: 'error' },
];
