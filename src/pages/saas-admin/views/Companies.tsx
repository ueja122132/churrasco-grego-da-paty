import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  Mail, 
  Calendar, 
  ExternalLink, 
  ShieldAlert, 
  CheckCircle2, 
  ShieldX,
  Trash2,
  Edit2,
  X,
  RotateCw,
  Image as ImageIcon,
  Upload,
  Gift,
  TrendingUp,
  DollarSign,
  Users,
  ShoppingBag,
  TrendingDown,
  ArrowDownCircle
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const CompaniesView: React.FC = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: '', slug: '', plan: 'basic', logoUrl: '' });
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    setLoading(true);
    try {
      const data = await adminService.getCompanies();
      setCompanies(data || []);
    } catch (err) {
      console.error("Erro ao carregar empresas:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminService.createCompany(newOrg);
      setIsModalOpen(false);
      setNewOrg({ name: '', slug: '', plan: 'basic', logoUrl: '' });
      await loadCompanies();
      alert("Empresa cadastrada com sucesso!");
    } catch (err: any) {
      alert("Erro ao cadastrar: " + (err.message || "Verifique se o slug já existe"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;
    setSubmitting(true);
    try {
      await adminService.updateCompany(editingOrg.id, {
        name: editingOrg.name,
        slug: editingOrg.slug,
        plan: editingOrg.plan,
        logoUrl: editingOrg.logoUrl
      });
      setIsEditModalOpen(false);
      setEditingOrg(null);
      await loadCompanies();
      alert("Alterações salvas com sucesso!");
    } catch (err: any) {
      alert("Erro ao atualizar: " + (err.message || "Erro desconhecido"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`DESEJA REALMENTE EXCLUIR A EMPRESA "${name.toUpperCase()}"?\n\nEsta ação é irreversível e apagará TODOS os dados da loja.`)) {
      try {
        await adminService.deleteCompany(id);
        await loadCompanies();
        alert("Empresa removida com sucesso.");
      } catch (err) {
        alert("Erro ao excluir empresa.");
      }
    }
  };

  const handleUpdateStatus = async (id: string, currentStatus: string) => {
    const normalizedStatus = (currentStatus || '').toLowerCase();
    const newStatus = normalizedStatus === 'active' ? 'suspended' : 'active';
    
    console.log("[STATUS] Mudando para:", newStatus);
    
    try {
      setLoading(true);
      const result = await adminService.updateCompanyStatus(id, newStatus);
      console.log("[STATUS] Sucesso:", result);
      await loadCompanies();
    } catch (err: any) {
      console.error("[STATUS] Erro:", err);
      alert("Erro ao atualizar status: " + (err.message || "Verifique o console"));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExemption = async (id: string, name: string) => {
    try {
      setLoading(true);
      const result = await adminService.toggleExemption(id);
      console.log("[EXEMPTION] Sucesso:", result);
      await loadCompanies();
    } catch (err: any) {
       console.error("[EXEMPTION] Erro:", err);
       alert("Erro ao alternar isenção: " + (err.message || "Verifique o console"));
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (org: any) => {
    setEditingOrg({
      ...org,
      logoUrl: org.branding?.logoUrl || ''
    });
    setIsEditModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("A imagem deve ter menos de 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingOrg({ ...editingOrg, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChangeNew = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("A imagem deve ter menos de 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewOrg({ ...newOrg, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const filtered = companies.filter(org => {
     const nameMatch = org.name.toLowerCase().includes(search.toLowerCase());
     const slugMatch = org.slug && org.slug.toLowerCase().includes(search.toLowerCase());
     const matchesSearch = nameMatch || slugMatch;
     const matchesStatus = statusFilter === 'all' || org.status === statusFilter;
     return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                    <Plus size={24} />
                  </div>
                  <h3 className="text-xl font-black italic tracking-tighter uppercase">Nova Loja SaaS</h3>
                </div>
                <button title="Fechar Modal" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label htmlFor="comp-name" className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block font-mono">Nome da Empresa</label>
                  <input 
                    id="comp-name"
                    required
                    type="text" 
                    value={newOrg.name}
                    onChange={e => setNewOrg({...newOrg, name: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold text-sm focus:border-indigo-600 outline-none transition-all placeholder:opacity-30"
                    placeholder="Ex: Churrasco da Paty"
                  />
                </div>

                <div>
                  <label htmlFor="comp-slug" className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block font-mono">Slug da URL (Subdomínio)</label>
                  <input 
                    id="comp-slug"
                    required
                    type="text" 
                    value={newOrg.slug}
                    onChange={e => setNewOrg({...newOrg, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold text-sm focus:border-indigo-600 outline-none transition-all"
                    placeholder="churrasco-paty"
                  />
                </div>

                <div className="space-y-4 font-mono">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Identidade Visual (Logo)</label>
                  
                  <div className="flex items-center gap-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center p-2 border border-slate-100 shadow-sm overflow-hidden shrink-0">
                      {newOrg.logoUrl ? (
                        <img src={newOrg.logoUrl} alt="Preview" className="w-full h-full object-contain" />
                      ) : (
                        <Store size={24} className="text-slate-300" />
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <label 
                        htmlFor="logo-upload-create" 
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-indigo-200"
                      >
                        <Upload size={14} />
                        Escolher Foto
                      </label>
                      <input 
                        id="logo-upload-create"
                        type="file" 
                        accept="image/*"
                        onChange={handleFileChangeNew}
                        className="hidden"
                      />
                      <input 
                        type="text" 
                        value={newOrg.logoUrl.startsWith('data:') ? '' : newOrg.logoUrl}
                        onChange={e => setNewOrg({...newOrg, logoUrl: e.target.value})}
                        className="w-full bg-transparent border-b border-slate-200 p-1 text-[10px] outline-none focus:border-indigo-600"
                        placeholder="Link da imagem (opcional)"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="comp-plan" className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block font-mono">Plano de Assinatura</label>
                  <select 
                    id="comp-plan"
                    title="Selecione o Plano"
                    value={newOrg.plan}
                    onChange={e => setNewOrg({...newOrg, plan: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-black uppercase text-[10px] outline-none focus:border-indigo-600 transition-all cursor-pointer"
                  >
                    <option value="basic">Plano Basic</option>
                    <option value="pro">Plano Pro</option>
                    <option value="premium">Plano Premium (Completo)</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-indigo-600 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? <RotateCw className="animate-spin w-4 h-4" /> : <Store size={18}/>}
                    Criar Organização
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingOrg && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
                    <Edit2 size={24} />
                  </div>
                  <h3 className="text-xl font-black italic tracking-tighter uppercase">Editar Empresa</h3>
                </div>
                <button title="Fechar Modal" onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label htmlFor="edit-name" className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block font-mono">Nome da Empresa</label>
                  <input 
                    id="edit-name"
                    required
                    type="text" 
                    value={editingOrg.name}
                    onChange={e => setEditingOrg({...editingOrg, name: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold text-sm focus:border-amber-500 outline-none transition-all placeholder:opacity-30"
                  />
                </div>

                <div>
                  <label htmlFor="edit-slug" className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block font-mono">Slug da URL</label>
                  <input 
                    id="edit-slug"
                    required
                    type="text" 
                    value={editingOrg.slug}
                    onChange={e => setEditingOrg({...editingOrg, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold text-sm focus:border-amber-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-4 font-mono">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Identidade Visual (Logo)</label>
                  
                  <div className="flex items-center gap-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center p-2 border border-slate-100 shadow-sm overflow-hidden shrink-0">
                      {editingOrg?.logoUrl ? (
                        <img src={editingOrg.logoUrl} alt="Preview" className="w-full h-full object-contain" />
                      ) : (
                        <Store size={32} className="text-slate-300" />
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <label 
                        htmlFor="logo-upload-edit" 
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-amber-200"
                      >
                        <Upload size={14} />
                        Escolher Foto
                      </label>
                      <input 
                        id="logo-upload-edit"
                        type="file" 
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <p className="text-[9px] text-slate-400 leading-tight">Ou cole o link:</p>
                      <input 
                        type="text" 
                        value={editingOrg?.logoUrl?.startsWith('data:') ? '' : editingOrg?.logoUrl}
                        onChange={e => setEditingOrg({...editingOrg, logoUrl: e.target.value})}
                        className="w-full bg-transparent border-b border-slate-200 p-1 text-[10px] outline-none focus:border-amber-500"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-plan" className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block font-mono">Alterar Plano</label>
                  <select 
                    id="edit-plan"
                    title="Altere o Plano"
                    value={editingOrg.plan}
                    onChange={e => setEditingOrg({...editingOrg, plan: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-black uppercase text-[10px] outline-none focus:border-amber-500 transition-all cursor-pointer"
                  >
                    <option value="basic">Plano Basic</option>
                    <option value="pro">Plano Pro</option>
                    <option value="premium">Plano Premium (Completo)</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-amber-500 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 shadow-xl shadow-amber-200 transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? <RotateCw className="animate-spin w-4 h-4" /> : <CheckCircle2 size={18}/>}
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tighter flex items-center gap-2 uppercase italic">
             <Store size={24} className="text-indigo-600" />
             Gestão de Clientes
          </h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-0.5 italic text-opacity-70 font-mono">Controle total sobre as empresas cadastradas no APDelivery</p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs shadow-lg shadow-indigo-200 hover:translate-y-[-2px] transition-all"
        >
          <Plus size={18} />
          Nova Empresa
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-sm">
        <div className="flex-1 relative">
           <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
           <input 
             title="Buscar"
             placeholder="Buscar por nome ou slug..."
             value={search}
             onChange={e => setSearch(e.target.value)}
             className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
           />
        </div>

        <div className="flex gap-2">
           <select 
             title="Filtrar por Status"
             value={statusFilter}
             onChange={e => setStatusFilter(e.target.value)}
             className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-black uppercase outline-none cursor-pointer"
           >
             <option value="all">Todos Status</option>
             <option value="active">Ativos</option>
             <option value="suspended">Suspensos</option>
           </select>
           
           <button title="Recarregar" onClick={loadCompanies} className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl hover:bg-slate-100 transition-all text-slate-400">
              <RotateCw size={18} className={cn(loading && "animate-spin")} />
           </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
         {loading ? (
            <div className="flex items-center justify-center h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
         ) : (
          <div className="overflow-x-auto overflow-y-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <tr className="uppercase text-[10px] font-black text-slate-400 tracking-widest italic">
                      <th className="px-8 py-5 font-mono">Empresa / Slug</th>
                      <th className="px-6 py-5 font-mono">Plano Atual</th>
                      <th className="px-6 py-5 font-mono text-center min-w-[180px]">Raio-X (Finanças & Base)</th>
                      <th className="px-6 py-5 text-center font-mono">Status</th>
                      <th className="px-6 py-5 text-center font-mono">Data Registro</th>
                      <th className="px-8 py-5 text-right font-mono">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800 font-mono">
                    {filtered.map((org) => (
                      <motion.tr 
                        key={org.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all"
                      >
                        <td className="px-8 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
                                  {org.branding?.logoUrl ? (
                                    <img src={org.branding.logoUrl} alt="" className="w-full h-full object-contain" />
                                  ) : (
                                    <Store size={22} className="text-slate-400" />
                                  )}
                              </div>
                              <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-black text-sm text-slate-900 dark:text-white uppercase italic">{org.name}</p>
                                    {org.is_exempt && (
                                      <span className="px-2 py-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[8px] font-black uppercase rounded-lg shadow-lg shadow-purple-200 animate-pulse">VIP/ISENTO</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60 italic">/{org.slug}</p>
                              </div>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="space-y-1">
                              <span className={cn(
                                  "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                  (org.plan || '').toLowerCase() === 'premium' ? "bg-amber-100 text-amber-700 border-amber-200" : 
                                  (org.plan || '').toLowerCase() === 'pro' ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-slate-100 text-slate-600 border-slate-200"
                              )}>
                                  {org.plan || 'basic'}
                              </span>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex flex-col gap-2 min-w-[200px]">
                                {/* Histórico e Clientes */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                      <DollarSign size={13} className="shrink-0" />
                                      <span className="text-xs font-black tracking-tighter">
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(org.metrics?.totalSales || 0)}
                                      </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-slate-400">
                                      <Users size={12} />
                                      <span className="text-[10px] font-bold">{org.metrics?.totalClients || 0}</span>
                                  </div>
                                </div>

                                <div className="h-px bg-slate-100 dark:bg-slate-800 w-full" />

                                {/* Pedidos: Hoje e Mês */}
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter">
                                    <div className="flex items-center gap-1 text-indigo-500">
                                        <ShoppingBag size={11} />
                                        <span>Hoje: {org.metrics?.todayOrders || 0}</span>
                                    </div>
                                    <div className="text-slate-300">|</div>
                                    <div className="flex items-center gap-1 text-indigo-400 opacity-60">
                                        <span>Mês: {org.metrics?.monthOrders || 0}</span>
                                    </div>
                                </div>

                                {/* Despesas: Hoje e Mês */}
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter">
                                    <div className="flex items-center gap-1 text-rose-500">
                                        <ArrowDownCircle size={11} />
                                        <span>-R$ {org.metrics?.todayExpenses || 0}</span>
                                    </div>
                                    <div className="text-slate-300">|</div>
                                    <div className="flex items-center gap-1 text-rose-400 opacity-60">
                                        <TrendingDown size={11} />
                                        <span>-R$ {new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(org.metrics?.monthExpenses || 0)}</span>
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                            <button 
                              title="Alternar Status"
                              onClick={() => handleUpdateStatus(org.id, org.status)}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all hover:scale-105 active:scale-95",
                                org.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                            )}>
                              {org.status === 'active' ? <CheckCircle2 size={12} /> : <ShieldX size={12} />}
                              {(org.status || 'suspended').toUpperCase()}
                            </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center">
                              <Calendar size={14} className="text-slate-300 mb-1" />
                              <p className="text-xs font-black text-slate-600 dark:text-slate-400 tracking-tighter">
                                  {new Date(org.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                        </td>
                        <td className="px-8 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button 
                                onClick={() => handleToggleExemption(org.id, org.name)} 
                                className={cn(
                                  "p-2.5 rounded-xl transition-all",
                                  org.is_exempt ? "bg-purple-100 text-purple-600 hover:bg-purple-200" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                )}
                                title={org.is_exempt ? "Remover Isenção" : "Dar Isenção (VIP)"}
                              >
                                  <Gift size={16} fill={org.is_exempt ? "currentColor" : "none"} />
                              </button>
                              <button onClick={() => openEdit(org)} className="p-2.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all" title="Editar">
                                  <Edit2 size={16} />
                              </button>
                              <button onClick={() => handleDelete(org.id, org.name)} className="p-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all" title="Excluir">
                                  <Trash2 size={16} />
                              </button>
                            </div>
                        </td>
                      </motion.tr>
                    ))}
                </tbody>
              </table>
          </div>
         )}
      </div>
    </div>
  );
};
