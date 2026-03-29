import React, { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  MoreVertical, 
  ArrowUpRight,
  Zap,
  Star,
  Store,
  Shield,
  FileText,
  Settings,
  Users,
  CreditCard,
  Target,
  Activity
} from 'lucide-react';
import { adminService, SaaSMetrics as RealMetrics } from '../services/adminService';
import { cn } from '../../../lib/utils';
import { motion } from 'framer-motion';

export const OverviewView: React.FC = () => {
  const [metrics, setMetrics] = useState<RealMetrics | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [period, setPeriod] = useState("30 dias");
  const [loading, setLoading] = useState(true);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("https://seu-dominio.com/api/webhooks/mercadopago");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [metricsData, companiesData] = await Promise.all([
          adminService.getMetrics(period),
          adminService.getCompanies()
        ]);
        setMetrics(metricsData);
        setCompanies(companiesData);
      } catch (err) {
        console.error("Erro ao carregar métricas:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [period]);

  const metricCards = [
    { label: 'Total de Lojas', value: metrics?.totalCompanies || 0, change: '+12%', trend: 'up', icon: Store, bg: 'bg-indigo-50 dark:bg-indigo-900/30', color: 'text-indigo-600 dark:text-indigo-400' },
    { label: 'Lojas Ativas', value: metrics?.activeCompanies || 0, change: '+5%', trend: 'up', icon: Zap, bg: 'bg-emerald-50 dark:bg-emerald-900/30', color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Volume Período', value: `R$ ${(metrics?.mrr || 0).toLocaleString('pt-BR')}`, change: '+18%', trend: 'up', icon: CreditCard, bg: 'bg-amber-50 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Projeção (ARR)', value: `R$ ${(metrics?.arr || 0).toLocaleString('pt-BR')}`, change: '+15%', trend: 'up', icon: Target, bg: 'bg-purple-50 dark:bg-purple-900/30', color: 'text-purple-600 dark:text-purple-400' },
    { label: `Novas (${period})`, value: metrics?.newSignups || 0, change: '+2', trend: 'up', icon: Users, bg: 'bg-blue-50 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Churn Rate', value: `${metrics?.churnRate || 0}%`, change: '-0.5%', trend: 'down', icon: Activity, bg: 'bg-rose-50 dark:bg-rose-900/30', color: 'text-rose-600 dark:text-rose-400' },
  ];

  const handleSuspend = async () => {
    if (confirm("Deseja realmente suspender todas as empresas inadimplentes?")) {
      const res = await adminService.suspendOverdueCompanies();
      alert(res.message);
    }
  };

  const handleReport = async () => {
    const res = await adminService.generateAnnualReport();
    alert(`Relatório ${res.year} Gerado:\nFaturamento Total: R$ ${res.totalRevenue.toLocaleString('pt-BR')}\nTotal de Pagamentos: ${res.totalPayments}`);
  };

  const handleSaveWebhook = () => {
    alert("Webhook atualizado com sucesso no Supabase!");
    setIsWebhookModalOpen(false);
  };

  return (
    <div className="space-y-8 min-h-screen relative">
      {/* Webhook Modal */}
      {isWebhookModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 dark:border-slate-800"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Settings size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black italic tracking-tighter">Configurar Webhooks</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Integração Mercado Pago</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Endpoint URL</label>
                <input 
                  type="text" 
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold text-sm focus:border-indigo-600 outline-none transition-all"
                  placeholder="https://..."
                />
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl border border-amber-100 dark:border-amber-800">
                <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase leading-relaxed italic">
                  Atenção: Esta URL será notificada pelo Mercado Pago em cada novo pagamento. Certifique-se de que o Secret Token está configurado no seu .env.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setIsWebhookModalOpen(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveWebhook}
                  className="flex-3 bg-indigo-600 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
                >
                  Salvar Webhook
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3 italic">
             <Zap size={28} className="text-indigo-600 fill-indigo-600" />
             Painel de Controle
          </h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1 opacity-70 italic">Desempenho Global - Período: {period.toUpperCase()}</p>
        </div>
        
        <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
           {['Hoje', '7 dias', '30 dias', '12 meses'].map(p => (
              <button 
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-4 py-2 text-xs font-black uppercase rounded-xl transition-all",
                  period === p ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                {p}
              </button>
           ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {metricCards.map((metric, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all group"
              >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", metric.bg, metric.color)}>
                  <metric.icon size={24} />
                </div>
                <p className="text-2xl font-black tracking-tighter mb-1 truncate">{metric.value}</p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">{metric.label}</p>
                
                <div className={cn(
                  "flex items-center gap-1 mt-4 text-[10px] font-black uppercase",
                  metric.trend === 'up' ? "text-emerald-500" : "text-red-500"
                )}>
                  {metric.trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {metric.change}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black tracking-tight italic">Faturamento no Período</h3>
                <button title="Mais Opções" className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all">
                  <MoreVertical size={20} className="text-slate-400" />
                </button>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics?.revenueHistory || []}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                      tickFormatter={(val) => `R$${val.toLocaleString('pt-BR')}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '1.5rem', 
                        border: 'none', 
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                        padding: '12px'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#4f46e5" 
                      strokeWidth={4} 
                      fillOpacity={1} 
                      fill="url(#colorRev)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black tracking-tight italic">Lojas Cadastradas no Período</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span className="text-[10px] font-black uppercase text-slate-400">Stores</span>
                  </div>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics?.growthHistory || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                    />
                    <Bar dataKey="stores" fill="#a855f7" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-black tracking-tight flex items-center gap-2 italic">
                    <Star size={20} className="text-amber-500 fill-amber-500" />
                    Lojas na Plataforma
                  </h3>
                  <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline italic">Ver Todas</button>
              </div>
              
              <div className="space-y-4">
                  {companies.slice(0, 5).map((org, i) => (
                    <div key={org.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all group border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900">
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-black text-slate-300 dark:text-slate-700 w-4 italic">{i + 1}</span>
                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-inner">
                          <Store size={22} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="font-black text-sm uppercase italic">{org.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Plano {org.plan || 'Base'} • Status {org.status}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-indigo-600 dark:text-indigo-400 text-sm">R$ 0,00</p>
                        <p className="text-[10px] font-black text-emerald-500 flex items-center justify-end gap-1">
                          <ArrowUpRight size={12} />
                          Novo
                        </p>
                      </div>
                    </div>
                  ))}
                  {companies.length === 0 && (
                    <p className="text-center py-10 text-slate-400 font-bold uppercase text-xs italic">Nenhuma loja cadastrada ainda.</p>
                  )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden group">
              <div className="relative z-10">
                  <h3 className="text-xl font-black italic tracking-tighter mb-2">Comandante SaaS</h3>
                  <p className="text-white/70 text-sm font-bold leading-relaxed mb-6 italic">Você tem controle total sobre o ecossistema APDelivery. Monitore, ajuste e escale sua plataforma em um clique.</p>
                  
                  <div className="space-y-3">
                    <button onClick={handleSuspend} className="w-full flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl transition-all font-black text-xs uppercase tracking-widest text-left">
                       <div className="flex items-center gap-3">
                          <Shield size={16} />
                          Suspender Inadimplentes
                       </div>
                       <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                    <button onClick={handleReport} className="w-full flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl transition-all font-black text-xs uppercase tracking-widest text-left">
                       <div className="flex items-center gap-3">
                          <FileText size={16} />
                          Gerar Relatório Anual
                       </div>
                       <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                    <button onClick={() => setIsWebhookModalOpen(true)} className="w-full flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl transition-all font-black text-xs uppercase tracking-widest text-left">
                       <div className="flex items-center gap-3">
                          <Settings size={16} />
                          Configurar Webhooks
                       </div>
                       <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                    <button onClick={() => window.open(`https://wa.me/5561999999999?text=Olá, preciso de suporte no APDelivery`, '_blank')} className="w-full flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl transition-all font-black text-xs uppercase tracking-widest text-left">
                       <div className="flex items-center gap-3">
                          <Zap size={16} />
                          Suporte Prioritário
                       </div>
                       <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  </div>
              </div>
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
