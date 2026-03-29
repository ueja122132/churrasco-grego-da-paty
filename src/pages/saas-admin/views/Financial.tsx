import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  MoreVertical, 
  FileCheck, 
  AlertCircle, 
  Clock,
  Download,
  Settings,
  ShieldCheck,
  Zap,
  Package,
  Plus,
  X,
  Store,
  RotateCw
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const FinancialView: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [period, setPeriod] = useState("30 dias");
  const [loading, setLoading] = useState(true);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  
  // New Payment state
  const [newPayment, setNewPayment] = useState({
    org_id: '',
    amount: '',
    month_ref: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    notes: ''
  });
  const [companies, setCompanies] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadFinancialData();
  }, [period]);

  async function loadFinancialData() {
    setLoading(true);
    try {
      const [payData, metricsData, companiesData] = await Promise.all([
        adminService.getPayments(),
        adminService.getMetrics(period),
        adminService.getCompanies()
      ]);
      setPayments(payData || []);
      setMetrics(metricsData);
      setCompanies(companiesData || []);
    } catch (err) {
      console.error("Erro ao carregar dados financeiros:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.org_id || !newPayment.amount) return;
    setSubmitting(true);
    try {
      // Logic to record manual payment using official service
      await adminService.createManualPayment({
        org_id: newPayment.org_id,
        amount: parseFloat(newPayment.amount),
        month_ref: newPayment.month_ref,
        notes: newPayment.notes
      });
      
      // Also update company to active if it was suspended
      await adminService.updateCompanyStatus(newPayment.org_id, 'active');

      setIsManualModalOpen(false);
      setNewPayment({ org_id: '', amount: '', month_ref: newPayment.month_ref, notes: '' });
      await loadFinancialData();
      alert("Pagamento registrado e empresa ativada!");
    } catch (err) {
      alert("Erro ao registrar pagamento.");
    } finally {
      setSubmitting(false);
    }
  };

  const financialMetrics = [
    { label: 'Receita Total (Período)', value: `R$ ${(metrics?.mrr || 0).toLocaleString('pt-BR')}`, icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/30', trend: period, isUp: true },
    { label: 'ARR (Projeção Anual)', value: `R$ ${(metrics?.arr || 0).toLocaleString('pt-BR')}`, icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30', trend: '+2.1%', isUp: true },
    { label: 'Calculado (Churn)', value: 'R$ 0,00', icon: ArrowDownRight, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/30', trend: '-0.5%', isUp: false },
    { label: 'Empresas Suspensas', value: metrics?.suspendedCompanies || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30', trend: 'Ação necessária', isUp: false },
  ];

  return (
    <div className="space-y-8 min-h-screen">
      {/* Manual Payment Modal */}
      <AnimatePresence>
        {isManualModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
               <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                    <Plus size={24} />
                  </div>
                  <h3 className="text-xl font-black italic tracking-tighter uppercase">Pagamento Manual</h3>
                </div>
                <button title="Fechar Modal" onClick={() => setIsManualModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleManualPayment} className="space-y-4 font-mono uppercase text-xs">
                 <div>
                    <label htmlFor="manual-org" className="text-[10px] font-black text-slate-400 block mb-1">Selecionar Empresa</label>
                    <select 
                      id="manual-org"
                      title="Selecione Empresa"
                      required
                      value={newPayment.org_id}
                      onChange={e => setNewPayment({...newPayment, org_id: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 p-4 rounded-2xl font-black outline-none focus:border-emerald-500"
                    >
                      <option value="">Selecione...</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="manual-amount" className="text-[10px] font-black text-slate-400 block mb-1">Valor (R$)</label>
                      <input 
                        id="manual-amount"
                        title="Valor do Pagamento"
                        required
                        type="number"
                        step="0.01"
                        value={newPayment.amount}
                        onChange={e => setNewPayment({...newPayment, amount: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 p-4 rounded-2xl font-black outline-none focus:border-emerald-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label htmlFor="manual-month" className="text-[10px] font-black text-slate-400 block mb-1">Mês Ref.</label>
                      <input 
                        id="manual-month"
                        title="Mês de Referência"
                        type="text"
                        value={newPayment.month_ref}
                        onChange={e => setNewPayment({...newPayment, month_ref: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 p-4 rounded-2xl font-black outline-none focus:border-emerald-500"
                      />
                    </div>
                 </div>

                 <div>
                    <label htmlFor="manual-notes" className="text-[10px] font-black text-slate-400 block mb-1">Observações</label>
                    <textarea 
                      id="manual-notes"
                      title="Observações Adicionais"
                      value={newPayment.notes}
                      onChange={e => setNewPayment({...newPayment, notes: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 p-4 rounded-2xl font-black outline-none focus:border-emerald-500 min-h-[80px]"
                      placeholder="Ex: Recebido via Pix CPF Bradesco"
                    />
                 </div>

                 <button 
                  disabled={submitting}
                  className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 mt-4 flex items-center justify-center gap-2"
                 >
                   {submitting ? <RotateCw className="animate-spin w-4 h-4" /> : <ShieldCheck size={18}/>}
                   Confirmar e Ativar Empresa
                 </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3 italic">
             <DollarSign size={28} className="text-emerald-600" />
             Gestão Financeira
          </h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1 opacity-70 italic">Fluxo de Caixa e Controle de Assinaturas SaaS</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs shadow-lg shadow-emerald-200 hover:scale-105 transition-all"
          >
            <Plus size={18} />
            Pagamento Manual
          </button>
          <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm font-mono">
            {['Hoje', '7 dias', '30 dias', '12 meses'].map(p => (
                <button 
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all",
                    period === p ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-400 hover:text-slate-900"
                  )}
                >
                  {p}
                </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* Financial Header Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {financialMetrics.map((m, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                 <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-black/5 group-hover:scale-110 transition-transform", m.bg, m.color)}>
                    <m.icon size={28} />
                 </div>
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 italic">{m.label}</p>
                 <div className="flex items-end gap-3">
                    <h4 className="text-2xl font-black tracking-tighter">{m.value}</h4>
                    <span className={cn(
                       "text-[10px] font-black pb-1.5 flex items-center gap-0.5",
                       m.isUp ? "text-emerald-500" : "text-amber-500"
                    )}>
                       {m.isUp ? <ArrowUpRight size={14} /> : <AlertCircle size={14} />}
                       {m.trend}
                    </span>
                 </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
            {/* Subscriptions Table */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
              <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                 <h3 className="text-xl font-black tracking-tight flex items-center gap-3 italic uppercase">
                    <FileCheck size={24} className="text-emerald-500" />
                    Histórico de Faturamentos Real
                 </h3>
                 <button title="Exportar CSV" className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:bg-slate-100 transition-all font-black text-[10px] tracking-widest uppercase italic">
                    <Download size={14} />
                    Exportar
                 </button>
              </div>

              <div className="overflow-x-auto flex-1 custom-scrollbar">
                 <table className="w-full text-left font-mono">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                       <tr className="uppercase text-[9px] font-black text-slate-400 tracking-widest italic border-b border-slate-50 dark:border-slate-800">
                          <th className="px-8 py-5">Cliente</th>
                          <th className="px-6 py-5">Data Pagto.</th>
                          <th className="px-6 py-5">Valor</th>
                          <th className="px-6 py-5">Método</th>
                          <th className="px-8 py-5 text-right">Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                       {payments.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-8 py-20 text-center text-slate-300 font-black italic uppercase tracking-widest text-xs">
                              Nenhum pagamento registrado ainda
                            </td>
                          </tr>
                       ) : (
                        payments.map((pay, i) => (
                          <tr key={pay.id} className="group hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-all">
                            <td className="px-8 py-5">
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-900 shadow-inner">
                                     <Store size={18} />
                                  </div>
                                  <div>
                                     <p className="font-black text-xs uppercase tracking-tighter opacity-90">{pay.organizations?.name || 'Ex-Cliente'}</p>
                                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ref: {pay.month_ref}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-6 py-5">
                               <p className="text-xs font-black text-slate-900 dark:text-slate-300">
                                  {new Date(pay.paid_at).toLocaleDateString('pt-BR')}
                               </p>
                               <p className="text-[9px] font-black text-indigo-500 uppercase italic">Confirmado</p>
                            </td>
                            <td className="px-6 py-5 font-black text-emerald-600 dark:text-emerald-400 text-sm italic">
                               R$ {Number(pay.amount).toLocaleString('pt-BR')}
                            </td>
                            <td className="px-6 py-5">
                               <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{pay.payment_method || 'PIX'}</span>
                               </div>
                            </td>
                            <td className="px-8 py-5 text-right">
                               <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                                  Confirmado
                               </span>
                            </td>
                          </tr>
                        ))
                       )}
                    </tbody>
                 </table>
              </div>
            </div>

            {/* Integration Column */}
            <div className="space-y-8">
               {/* Inadimplentes Highlights */}
               <div className="bg-red-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-red-200 dark:shadow-none relative overflow-hidden group">
                  <div className="relative z-10">
                     <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                        <ShieldCheck size={24} className="animate-pulse" />
                     </div>
                     <h4 className="text-2xl font-black italic tracking-tighter mb-2 uppercase">Ação Necessária</h4>
                     <p className="text-white/70 text-sm font-bold leading-tight mb-8 italic">Temos <span className="text-white underline">{metrics?.suspendedCompanies || 0} empresas</span> suspensas. Verifique as notificações e os comprovantes manuais.</p>
                     
                     <button 
                      onClick={() => window.open(`https://wa.me/5561999999999?text=Olá, verifiquei uma pendência na sua conta APDelivery.`, '_blank')}
                      className="w-full flex items-center justify-between p-4 bg-white text-red-600 rounded-2xl transition-all font-black text-[10px] tracking-widest uppercase hover:translate-y-[-4px] active:translate-y-0 shadow-lg shadow-black/10 italic"
                     >
                        Notificar WhatsApp
                        <Zap size={16} />
                     </button>
                  </div>
                  <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
               </div>

               {/* Gateway Integration */}
               <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden group">
                  <div className="flex items-center justify-between mb-8">
                     <h3 className="text-lg font-black tracking-tight uppercase italic">Integração Gateway</h3>
                     <Settings size={20} className="text-slate-300 group-hover:rotate-90 transition-transform duration-500" />
                  </div>

                  <div className="space-y-4">
                     <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 group/gate">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-[#009EE3] text-white rounded-xl flex items-center justify-center font-black italic shadow-md uppercase">MP</div>
                           <div>
                              <p className="font-black text-xs uppercase tracking-tighter">Mercado Pago</p>
                              <p className="text-[10px] font-bold text-emerald-500 italic">CONECTADO / LIVE</p>
                           </div>
                        </div>
                        <button onClick={() => alert("Ajustes de Gateway via .env e Dashboard do MP")} className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-widest italic">Ajustar</button>
                     </div>

                     <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 group/gate opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-not-allowed">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-[#635BFF] text-white rounded-xl flex items-center justify-center font-black italic uppercase">S</div>
                           <div>
                              <p className="font-black text-xs uppercase tracking-tighter">Stripe</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Desconectado</p>
                           </div>
                        </div>
                        <button disabled className="text-[10px] font-black text-indigo-600 opacity-30 uppercase tracking-widest italic">Ativar</button>
                     </div>
                  </div>

                  <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                     <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400 leading-tight italic font-mono uppercase">Status Local: O faturamento via Mercado Pago está ativo nas suas configurações locais (.env).</p>
                  </div>
               </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
