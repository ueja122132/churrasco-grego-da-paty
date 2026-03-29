import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Trash2, 
  CreditCard, 
  Activity,
  LogOut,
  Store,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings2,
  Users,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from '../lib/utils';
import { supabase } from '../supabase';

interface SaaSAdminPageProps {
  user: any;
  notify: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const SaaSAdminPage: React.FC<SaaSAdminPageProps> = ({ user, notify }) => {
  const [metricSummary, setMetricSummary] = useState({ 
    totalOrgs: 0, 
    activeSubs: 0, 
    monthlyRev: 0, 
    totalOrders: 0 
  });
  const [orgs, setOrgs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: metrics, error: mErr } = await supabase.rpc('get_organizations_metrics');
      if (metrics && metrics.length > 0) {
        setMetricSummary({
          totalOrgs: metrics[0].total_organizations || 0,
          activeSubs: metrics[0].active_subscriptions || 0,
          monthlyRev: metrics[0].monthly_revenue || 0,
          totalOrders: metrics[0].total_orders_completed || 0
        });
      } else {
        // Fallback for empty database
        setMetricSummary({ totalOrgs: 0, activeSubs: 0, monthlyRev: 0, totalOrders: 0 });
      }

      const { data: orgsData, error: oErr } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsData) setOrgs(orgsData);
    } catch (err) {
      notify("Erro ao carregar dados", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteOrg = async (id: string) => {
    if (!window.confirm("CUIDADO: Isso excluirá TODOS os dados desta organização (produtos, pedidos, etc). Confirmar?")) return;
    try {
      const res = await fetch(`/api/admin/organizations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        notify("Organização excluída", "success");
        fetchData();
      }
    } catch (err) {
      notify("Erro ao excluir", "error");
    }
  };

  const updateOrgField = async (id: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ [field]: value })
        .eq('id', id);
      
      if (error) throw error;
      notify("Organização atualizada!");
      fetchData();
    } catch (err) {
      notify("Erro ao atualizar campo", "error");
    }
  };

  const registerManualPayment = async () => {
    if (!selectedOrg || !paymentAmount) return;
    setIsProcessing(true);
    try {
      const res = await fetch("/api/saas-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: selectedOrg.id,
          amount: parseFloat(paymentAmount),
          month_ref: new Date().toISOString(),
          payment_method: 'manual'
        })
      });

      if (res.ok) {
        notify("Pagamento registrado e acesso renovado!", "success");
        setShowPaymentModal(false);
        setPaymentAmount("");
        fetchData();
      } else {
        const error = await res.json();
        notify(error.error || "Erro ao registrar pagamento", "error");
      }
    } catch (err) {
      notify("Erro de conexão", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const runBillingCheck = async () => {
    if (!window.confirm("Isso suspenderá todas as lojas com pagamento atrasado. Continuar?")) return;
    try {
      const res = await fetch("/api/admin/run-billing-check", { method: "POST" });
      const data = await res.json();
      notify(`${data.suspended || 0} lojas suspensas.`, "info");
      fetchData();
    } catch (err) {
      notify("Erro ao rodar cobrança", "error");
    }
  };

  const filteredOrgs = orgs.filter(o => 
    o.name.toLowerCase().includes(search.toLowerCase()) || 
    (o.slug || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="pb-24 md:pt-8 p-4 bg-slate-50 min-h-screen max-w-7xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ShieldCheck size={36} className="text-indigo-600" />
            Super Admin
          </h1>
          <p className="text-slate-500 mt-2">Visão geral do ecossistema SaaS</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={runBillingCheck}
             className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-lg border border-white/10 hover:bg-slate-800 transition-all font-bold text-xs"
           >
             <AlertCircle size={16} />
             Rodar Cobrança
           </button>

           <div className="flex bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-indigo-100 items-center gap-3">
             <DollarSign size={20} />
             <div className="text-right">
               <p className="text-[10px] font-bold uppercase opacity-80">Receita Estimada</p>
               <p className="font-black text-xl">R$ {(metricSummary.monthlyRev || 0).toLocaleString('pt-BR')}</p>
             </div>
           </div>
        </div>
      </header>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Lojas', value: metricSummary.totalOrgs, icon: Store, color: 'text-blue-600 bg-blue-100' },
          { label: 'Assinaturas', value: metricSummary.activeSubs, icon: CreditCard, color: 'text-emerald-600 bg-emerald-100' },
          { label: 'Total Pedidos', value: metricSummary.totalOrders, icon: Activity, color: 'text-orange-600 bg-orange-100' },
          { label: 'Planos Ativos', value: `${((metricSummary.activeSubs / metricSummary.totalOrgs) * 100 || 0).toFixed(1)}%`, icon: CreditCard, color: 'text-indigo-600 bg-indigo-100' },
        ].map(item => (
          <div key={item.label} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-3", item.color)}>
              <item.icon size={20} />
            </div>
            <p className="text-2xl font-black text-slate-900">{item.value}</p>
            <p className="text-xs font-bold text-slate-400 mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Orgs List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900">Gerenciar Organizações</h3>
          <div className="relative w-full md:w-64">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
              placeholder="Buscar por nome ou slug..." 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Loja</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Plano</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Cadastro</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrgs.map(org => (
                <tr key={org.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 shadow-inner overflow-hidden">
                        {org.branding?.logoUrl ? (
                           <img src={org.branding.logoUrl} className="w-full h-full object-contain" alt="" />
                        ) : (
                           <Store size={18} className="text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{org.name}</p>
                        <p className="text-[10px] text-blue-600 font-mono">/{org.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <select 
                      value={org.plan || 'free'} 
                      onChange={(e) => updateOrgField(org.id, 'plan', e.target.value)}
                      title="Selecionar Plano"
                      className="bg-slate-50 border border-slate-200 text-[10px] font-black uppercase rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="free">FREE</option>
                      <option value="pro">PRO</option>
                      <option value="enterprise">ENTERPRISE</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <button 
                        onClick={() => updateOrgField(org.id, 'status', org.status === 'active' ? 'suspended' : 'active')}
                        className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5 transition-all shadow-sm",
                          org.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        )}
                      >
                         <div className={cn("w-1.5 h-1.5 rounded-full", org.status === 'active' ? "bg-emerald-500" : "bg-red-500")} />
                         {org.status === 'active' ? 'Ativo' : 'Suspenso'}
                      </button>
                      <button 
                         onClick={() => updateOrgField(org.id, 'billing_exempt', !org.billing_exempt)}
                         className={cn("text-[8px] font-black uppercase mt-1", org.billing_exempt ? "text-indigo-600" : "text-slate-400")}
                      >
                         {org.billing_exempt ? 'Isento de Mensalidade' : 'Cobrança Ativa'}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-600">
                        {org.billing_due_date ? new Date(org.billing_due_date).toLocaleDateString('pt-BR') : 'Sem data'}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Vencimento</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => { setSelectedOrg(org); setShowPaymentModal(true); }}
                        className="p-2.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all shadow-sm"
                        title="Registrar Pagamento"
                      >
                        <DollarSign size={18} />
                      </button>
                      <button 
                        onClick={() => deleteOrg(org.id)} 
                        className="p-2.5 text-slate-400 bg-slate-50 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" 
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrgs.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-20 text-center">
                  <Activity size={40} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400 font-bold">Nenhuma loja encontrada para sua busca.</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedOrg && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-10 w-full max-w-sm shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
              <button 
                onClick={() => setShowPaymentModal(false)}
                title="Fechar Modal"
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 rounded-full transition-all"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-4">
                   <CreditCard size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Renovar Acesso</h3>
                <p className="text-sm font-bold text-slate-400 uppercase mt-1">Registrar pagamento manual</p>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                   <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Loja Selecionada</p>
                   <p className="font-black text-slate-800">{selectedOrg.name}</p>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Valor Recebido (R$)</label>
                   <input 
                     type="number"
                     step="0.01"
                     value={paymentAmount}
                     onChange={e => setPaymentAmount(e.target.value)}
                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-black text-slate-900 shadow-inner"
                     placeholder="0.00"
                   />
                </div>

                <button 
                  disabled={isProcessing || !paymentAmount}
                  onClick={registerManualPayment}
                  className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20 hover:translate-y-[-2px] active:translate-y-0 transition-all disabled:opacity-50"
                >
                  {isProcessing ? 'Processando...' : 'Confirmar e Liberar Loja'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

