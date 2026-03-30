import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Plus, 
  Check, 
  X, 
  Edit2, 
  Zap, 
  Shield, 
  Package,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Trash2,
  Trash,
  AlertCircle,
  RotateCw,
  Save
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const PlansView: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    setLoading(true);
    try {
      const data = await adminService.getPlans();
      setPlans(data || []);
    } catch (err) {
      console.error("Erro ao carregar planos:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setSubmitting(true);
    try {
      await adminService.updatePlan(editingPlan.id, {
        name: editingPlan.name,
        price: parseFloat(editingPlan.price),
        limits: editingPlan.limits,
        features: editingPlan.features,
        is_popular: editingPlan.is_popular
      });
      setIsEditModalOpen(false);
      setEditingPlan(null);
      await loadPlans();
      alert("Plano atualizado com sucesso!");
    } catch (err) {
      alert("Erro ao atualizar plano.");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (plan: any) => {
    setEditingPlan({ ...plan });
    setIsEditModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingPlan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                    <Edit2 size={24} />
                  </div>
                  <h3 className="text-xl font-black italic tracking-tighter uppercase">Editar Plano: {editingPlan.name}</h3>
                </div>
                <button title="Fechar Modal" onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-6 font-mono text-xs uppercase font-black">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="edit-plan-name" className="text-[10px] text-slate-400 block mb-1 tracking-widest">Nome do Plano</label>
                    <input 
                      id="edit-plan-name"
                      title="Nome do Plano"
                      required
                      type="text" 
                      value={editingPlan.name}
                      onChange={e => setEditingPlan({...editingPlan, name: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-plan-price" className="text-[10px] text-slate-400 block mb-1 tracking-widest">Preço Mensal (R$)</label>
                    <input 
                      id="edit-plan-price"
                      title="Preço Mensal"
                      required
                      type="number" 
                      step="0.01"
                      value={editingPlan.price}
                      onChange={e => setEditingPlan({...editingPlan, price: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="edit-plan-orders" className="text-[10px] text-slate-400 block mb-1 tracking-widest">Pedidos/Mês</label>
                    <input 
                      id="edit-plan-orders"
                      title="Limite de Pedidos"
                      required
                      type="text" 
                      value={editingPlan.limits.orders}
                      onChange={e => setEditingPlan({...editingPlan, limits: {...editingPlan.limits, orders: e.target.value}})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-plan-users" className="text-[10px] text-slate-400 block mb-1 tracking-widest">Usuários</label>
                    <input 
                      id="edit-plan-users"
                      title="Limite de Usuários"
                      required
                      type="text" 
                      value={editingPlan.limits.users}
                      onChange={e => setEditingPlan({...editingPlan, limits: {...editingPlan.limits, users: e.target.value}})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-plan-storage" className="text-[10px] text-slate-400 block mb-1 tracking-widest">Storage</label>
                    <input 
                      id="edit-plan-storage"
                      title="Limite de Storage"
                      required
                      type="text" 
                      value={editingPlan.limits.storage}
                      onChange={e => setEditingPlan({...editingPlan, limits: {...editingPlan.limits, storage: e.target.value}})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <input 
                      type="checkbox" 
                      id="isPopular"
                      checked={editingPlan.is_popular}
                      onChange={e => setEditingPlan({...editingPlan, is_popular: e.target.checked})}
                      className="w-5 h-5 accent-indigo-600"
                    />
                    <label htmlFor="isPopular" className="cursor-pointer">Destacar como "Mais Popular"</label>
                </div>

                <button 
                  disabled={submitting}
                  className="w-full bg-indigo-600 text-white p-5 rounded-3xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2"
                >
                  {submitting ? <RotateCw className="animate-spin w-4 h-4" /> : <Save size={18}/>}
                  Salvar Alterações
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tighter flex items-center gap-2 uppercase italic">
             <Layers size={24} className="text-indigo-600" />
             Planos & Assinaturas
          </h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-0.5 italic">Defina a estratégia de monetização do APDelivery em tempo real</p>
        </div>

        <button title="Criar Plano" className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs shadow-lg shadow-black/20 hover:scale-105 transition-all">
          <Plus size={18} />
          Criar Novo Plano
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans.map((plan, idx) => (
          <div key={idx} className={cn(
            "bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-500/20 transition-all min-h-[500px] flex flex-col",
            plan.is_popular && "border-indigo-100 dark:border-indigo-900 shadow-xl shadow-indigo-100/50"
          )}>
            {plan.is_popular && (
               <div className="absolute top-6 right-6 px-3 py-1 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-indigo-200">
                  Mais Popular
               </div>
            )}
            
            <div className="flex items-center gap-4 mb-8">
               <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                  plan.slug === 'premium' ? "bg-indigo-600 text-white" : 
                  plan.slug === 'pro' ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-400"
               )}>
                  {plan.slug === 'premium' ? <Zap size={28} /> : plan.slug === 'pro' ? <Shield size={28} /> : <Package size={28} />}
               </div>
               <div>
                  <h3 className="text-xl font-black italic tracking-tighter uppercase">{plan.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic opacity-60">ID: {plan.slug}</p>
               </div>
            </div>

            <div className="mb-8">
               <div className="flex items-baseline gap-1">
                  <span className="text-sm font-black text-slate-400">R$</span>
                  <span className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">{Number(plan.price).toFixed(2).split('.')[0]}</span>
                  <span className="text-lg font-black text-slate-400">,{Number(plan.price).toFixed(2).split('.')[1]}</span>
                  <span className="text-xs font-bold text-slate-400 ml-1">/mês</span>
               </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-slate-50 dark:border-slate-800 flex-1">
               <div>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3 italic">Limites do Sistema</p>
                  <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-400">Pedidos Mensais</span>
                          <span className="text-slate-900 dark:text-slate-200 font-black italic tabular-nums">{plan.limits?.orders}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-400">Usuários Ativos</span>
                          <span className="text-slate-900 dark:text-slate-200 font-black italic tabular-nums">{plan.limits?.users}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-400">Espaço Nuvem</span>
                          <span className="text-slate-900 dark:text-slate-200 font-black italic tabular-nums">{plan.limits?.storage}</span>
                      </div>
                  </div>
               </div>

               <div>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3 italic">Recursos Ativos</p>
                  <div className="space-y-3">
                     {(plan.features || []).map((feat: string, i: number) => (
                        <div key={i} className="flex items-start gap-2.5">
                           <div className="w-4 h-4 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 mt-0.5 shrink-0">
                              <Check size={10} strokeWidth={4} />
                           </div>
                           <span className="text-[10px] font-black uppercase text-slate-600 dark:text-white/70 italic">{feat}</span>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 pb-2">
               <button 
                onClick={() => openEdit(plan)}
                className="flex items-center justify-center gap-2 py-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
               >
                  <Edit2 size={14} />
                  Editar
               </button>
               <button className="flex items-center justify-center gap-2 py-4 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">
                  <Trash size={14} />
                  Remover
               </button>
            </div>
          </div>
        ))}
      </div>

      {/* Trial Global Settings */}
      <div className="bg-indigo-600 p-10 rounded-[3rem] text-white shadow-xl shadow-indigo-100 dark:shadow-none relative overflow-hidden group flex flex-col md:flex-row items-center justify-between gap-8">
         <div className="relative z-10 max-w-xl text-center md:text-left">
            <h3 className="text-3xl font-black italic tracking-tighter mb-4">Configuração Global de Trial</h3>
            <p className="text-white/70 font-bold mb-0 italic">Atualmente, todas as novas lojas recebem <span className="text-white underline">7 dias de acesso gratuito</span> automático ao plano Pro para testes.</p>
         </div>
         
         <div className="relative z-10 flex items-center gap-4 font-mono uppercase">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center">
               <p className="text-[10px] font-black mb-1">Duração Atual</p>
               <p className="text-2xl font-black italic">07 DIAS</p>
            </div>
            <button className="bg-white text-indigo-600 px-8 py-5 rounded-2xl font-black text-[10px] tracking-widest hover:translate-y-[-4px] transition-all shadow-xl shadow-black/10">
               Alterar período
            </button>
         </div>

         {/* Decorative Zap */}
         <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl opacity-20" />
      </div>
    </div>
  );
};

export const LogsView: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Tudo');

    async function loadLogs() {
        setLoading(true);
        try {
            const data = await adminService.getLogs();
            setLogs(data || []);
            setFilteredLogs(data || []);
        } catch (err) {
            console.error("Erro ao carregar logs:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadLogs();
    }, []);

    useEffect(() => {
        if (filter === 'Tudo') {
            setFilteredLogs(logs);
        } else {
            setFilteredLogs(logs.filter(l => l.type.toLowerCase() === filter.toLowerCase() || (filter === 'Errors' && l.type === 'error') || (filter === 'Success' && l.type === 'success')));
        }
    }, [filter, logs]);

    const handleClear = async () => {
        if (!confirm("Deseja realmente limpar todo o histórico de auditoria?")) return;
        try {
            await adminService.clearLogs();
            setLogs([]);
            alert("Logs limpos com sucesso!");
        } catch (err) {
            alert("Erro ao limpar logs.");
        }
    };

    const getRelativeTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Agora mesmo';
        if (diffMins < 60) return `Há ${diffMins} minutos`;
        if (diffHours < 24) return `Há ${diffHours} horas`;
        return `Há ${diffDays} dias`;
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tighter flex items-center gap-2 uppercase italic text-indigo-600">
               <Clock size={24} />
               Atividade do Ecossistema
            </h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-0.5 italic">Rastreamento completo de ações e segurança do SaaS</p>
          </div>
          <button onClick={loadLogs} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all hover:rotate-180 duration-500 shadow-sm" title="Atualizar Logs">
             <RotateCw size={20} />
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
           <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center font-mono">
              <div className="flex flex-wrap gap-2">
                 {['Tudo', 'Info', 'Warn', 'Success', 'Errors'].map(label => (
                    <button 
                       key={label} 
                       onClick={() => setFilter(label)}
                       className={cn(
                          "px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all border",
                          filter === label ? "bg-slate-900 border-slate-900 text-white shadow-lg" : "border-slate-100 text-slate-400 hover:bg-slate-50"
                       )}
                    >
                       {label}
                    </button>
                 ))}
              </div>
              <button 
                onClick={handleClear}
                title="Limpar Logs" 
                className="p-3 bg-red-50 dark:bg-red-900/10 rounded-2xl text-red-400 hover:text-red-500 transition-colors border border-red-50"
              >
                 <Trash2 size={20} />
              </button>
           </div>

           <div className="p-8 space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest animate-pulse italic">Escaneando ecossistema...</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-100">
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhuma atividade registrada no período.</p>
                </div>
              ) : filteredLogs.map((log, idx) => (
                 <div key={idx} className="flex items-center justify-between p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800/50 hover:border-indigo-100 transition-all group font-mono">
                    <div className="flex items-center gap-6">
                       <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                          log.type === 'error' ? "bg-red-100 text-red-600 shadow-red-50" : 
                          log.type === 'warn' ? "bg-amber-100 text-amber-600 shadow-amber-50" :
                          log.type === 'success' ? "bg-emerald-100 text-emerald-600 shadow-emerald-50" : "bg-indigo-100 text-indigo-600 shadow-indigo-50"
                       )}>
                          {log.type === 'error' ? <X size={20} /> : log.type === 'warn' ? <AlertCircle size={20} /> : <Zap size={20} />}
                       </div>
                       <div>
                          <p className="text-xs font-black uppercase tracking-tight italic">{log.action || 'ATIVIDADE'}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{log.actor}</p>
                             <div className="w-1 h-1 rounded-full bg-slate-200" />
                             <p className="text-[10px] font-black text-indigo-400 uppercase italic truncate max-w-[200px]">{log.details}</p>
                             {log.organizations?.name && (
                               <>
                                 <div className="w-1 h-1 rounded-full bg-slate-200" />
                                 <p className="text-[10px] font-black text-rose-500 uppercase italic">{log.organizations.name}</p>
                               </>
                             )}
                          </div>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{getRelativeTime(log.created_at)}</p>
                    </div>
                 </div>
              ))}
           </div>

           <div className="p-8 bg-slate-50/50 text-center font-mono border-t border-slate-100">
              <button 
                onClick={loadLogs}
                title="Ver mais logs" 
                className="text-[10px] font-black uppercase text-indigo-600 hover:underline tracking-widest italic"
              >
                Sincronizar Atividades Recentes
              </button>
           </div>
        </div>
      </div>
    );
};
