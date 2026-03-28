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
  DollarSign
} from 'lucide-react';
import { motion } from "motion/react";
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: metrics, error: mErr } = await supabase.rpc('get_organizations_metrics');
      if (metrics?.[0]) {
        setMetricSummary({
          totalOrgs: metrics[0].total_organizations,
          activeSubs: metrics[0].active_subscriptions,
          monthlyRev: metrics[0].monthly_revenue,
          totalOrders: metrics[0].total_orders_completed
        });
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

  const toggleSuperAdmin = async (userId: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: !current ? 'super_admin' : 'admin' })
        .eq('id', userId);
      if (!error) notify("Permissão atualizada!");
    } catch (err) {
      notify("Erro ao atualizar super-admin", "error");
    }
  };

  const filteredOrgs = orgs.filter(o => 
    o.name.toLowerCase().includes(search.toLowerCase()) || 
    o.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="pb-24 md:pl-24 md:pt-8 p-4 bg-slate-50 min-h-screen">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ShieldCheck size={36} className="text-indigo-600" />
            Super Admin
          </h1>
          <p className="text-slate-500 mt-2">Visão geral do ecossistema SaaS</p>
        </div>
        
        <div className="flex bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-indigo-100 items-center gap-3">
          <DollarSign size={20} />
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase opacity-80">Receita Estimada</p>
            <p className="font-black text-xl">R$ {metricSummary.monthlyRev.toLocaleString('pt-BR')}</p>
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
                      {org.branding?.logoUrl ? (
                         <img src={org.branding.logoUrl} className="w-8 h-8 rounded-lg object-contain" alt="" />
                      ) : (
                         <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs">🍔</div>
                      )}
                      <div>
                        <p className="font-bold text-slate-800">{org.name}</p>
                        <p className="text-[10px] text-blue-600 font-mono">/{org.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                      org.plan_id === 'enterprise' ? "bg-purple-100 text-purple-700" :
                      org.plan_id === 'pro' ? "bg-indigo-100 text-indigo-700" :
                      "bg-slate-100 text-slate-600"
                    )}>
                      {org.plan_id || 'free'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={cn(
                        "w-2 h-2 rounded-full mb-1",
                        org.subscription_status === 'active' ? "bg-emerald-500 scale-125 animate-pulse" : "bg-slate-300"
                      )} />
                      <span className="text-[8px] font-black uppercase text-slate-400">{org.subscription_status || 'inactive'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <p className="text-xs font-bold text-slate-500">{new Date(org.created_at).toLocaleDateString('pt-BR')}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => deleteOrg(org.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredOrgs.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Nenhuma loja encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

