import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Settings, 
  Plus, 
  Trash2, 
  Pencil, 
  CheckCircle2, 
  Clock, 
  QrCode, 
  X, 
  User, 
  TrendingUp, 
  TrendingDown, 
  Star,
  BarChart3,
  DollarSign,
  Bike,
  ShoppingBag,
  LayoutDashboard,
  Users as UsersIcon,
  Upload,
  Image as ImageIcon,
  Check,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from "motion/react";
import { cn } from '../lib/utils';
import { MetricsTab } from '../components/MetricsTab';
import { Product, ExtraIngredient } from '../types';
import FinancePage from './FinancePage';
import { useTenant } from '../context/TenantContext';

interface AdminPageProps {
  user: any;
  org: any;
  notify: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const SAAS_PLANS = [
  { id: 'free', name: 'Plano Grátis', price: 0, desc: 'Para quem está começando', features: ['Até 5 produtos', 'Relatórios básicos', 'Gestão de pedidos'] },
  { id: 'pro', name: 'Plano Pro', price: 97, desc: 'Ideal para lojas em crescimento', features: ['Produtos ilimitados', 'Relatórios avançados', 'Marketing tools', 'Suporte prioritário'] },
  { id: 'enterprise', name: 'Plano Enterprise', price: 297, desc: 'O poder total para sua rede', features: ['Multi-lojas', 'API access', 'Gerente de conta', 'SLA garantido'] }
];

const ADMIN_TABS = [
  { id: 'metrics', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Produtos', icon: ShoppingBag },
  { id: 'ingredients', label: 'Ingredientes', icon: Plus },
  { id: 'finance', label: 'Financeiro', icon: DollarSign },
  { id: 'couriers', label: 'Entregadores', icon: Bike },
  { id: 'clients', label: 'Clientes', icon: UsersIcon },
  { id: 'faturamento', label: 'Faturamento', icon: Star },
  { id: 'settings', label: 'Configurações', icon: Settings },
];


export const AdminPage: React.FC<AdminPageProps> = ({ user, org, notify }) => {
  const { refreshTenant } = useTenant();
  const [currentOrg, setCurrentOrg] = useState(org);
  const [localLoading, setLocalLoading] = useState(!org);
  const [activeTab, setActiveTab] = useState('metrics');
  
  // Products states
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProductName, setNewProductName] = useState("");
  const [newProductDesc, setNewProductDesc] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductCategory, setNewProductCategory] = useState<'churrasco' | 'ready'>('churrasco');
  const [newProductImage, setNewProductImage] = useState("");
  const [newProductPromo, setNewProductPromo] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);

  // Extra Ingredients states
  const [extraIngredients, setExtraIngredients] = useState<ExtraIngredient[]>([]);
  const [extraName, setExtraName] = useState("");
  const [extraPrice, setExtraPrice] = useState("");
  const [editingExtra, setEditingExtra] = useState<ExtraIngredient | null>(null);

  // Couriers states
  const [couriers, setCouriers] = useState<any[]>([]);
  const [courierStats, setCourierStats] = useState<any>({});
  const [newCourierName, setNewCourierName] = useState("");
  const [newCourierPhone, setNewCourierPhone] = useState("");
  const [newCourierPassword, setNewCourierPassword] = useState("");
  const [newCourierCommission, setNewCourierCommission] = useState("15");
  const [newCourierEmail, setNewCourierEmail] = useState("");
  const [editingCourier, setEditingCourier] = useState<any>(null);
  const [selectedCourier, setSelectedCourier] = useState<any>(null);
  const [modalType, setModalType] = useState<'advance' | 'payout' | 'delete_courier' | 'edit_commission' | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [editCommissionValue, setEditCommissionValue] = useState("");

  // Clients states
  const [clients, setClients] = useState<any[]>([]);

  // Settings states
  const [logoPreview, setLogoPreview] = useState(currentOrg?.branding?.logoUrl || "");
  const [logoSaving, setLogoSaving] = useState(false);
  const [loginImageUrl, setLoginImageUrl] = useState(currentOrg?.login_image_url || "");
  const [loginImageSaving, setLoginImageSaving] = useState(false);
  const [mpToken, setMpToken] = useState(""); 
  const [mpSaving, setMpSaving] = useState(false);
  const [mpSaved, setMpSaved] = useState(false);
  const [operatingHours, setOperatingHours] = useState<any>(currentOrg?.operating_hours || {});
  const [hoursSaving, setHoursSaving] = useState(false);
  const [editingPromo, setEditingPromo] = useState<number | null>(null);
  const [promoPrice, setPromoPrice] = useState("");

  // Billing states
  const [selectedPlanId, setSelectedPlanId] = useState(currentOrg?.plan_id || currentOrg?.plan || 'free');
  const [changingPlan, setChangingPlan] = useState(false);
  const [generatingSaasPix, setGeneratingSaasPix] = useState(false);
  const [saasPixData, setSaasPixData] = useState<any>(null);

  useEffect(() => {
    if (!org && user?.org_id) {
       setLocalLoading(true);
       fetch(`/api/org/detect?orgId=${user.org_id}`)
         .then(r => r.json())
         .then(data => {
           if (data && data.id) {
             console.log("[ADMIN DEBUG] Org detected:", data.id);
             setCurrentOrg(data);
             setLogoPreview(data.branding?.logoUrl || "");
             setOperatingHours(data.operating_hours || {});
             setSelectedPlanId(data.plan_id || 'free');
           }
           setLocalLoading(false);
         })
         .catch((err) => {
           console.error("[ADMIN DEBUG] Error detecting org:", err);
           setLocalLoading(false);
         });
    } else {
       setCurrentOrg(org);
       setOperatingHours(org?.operating_hours || {});
       setSelectedPlanId(org?.plan_id || org?.plan || 'free');
       if (org?.has_mp_token || org?.mp_access_token) setMpToken("********");
       setLocalLoading(false);
    }
  }, [org, user?.org_id]);

  const fetchData = async () => {
    console.log("[ADMIN DEBUG] fetchData triggered", { currentOrgId: currentOrg?.id, activeTab });
    if (!currentOrg?.id) {
      console.warn("[ADMIN DEBUG] No currentOrg.id, aborting fetch");
      return;
    }
    
    try {
      if (activeTab === 'products') {
        console.log("[ADMIN DEBUG] Fetching products for org", currentOrg.id);
        const res = await fetch(`/api/${currentOrg.id}/products`);
        if (res.ok) {
          const data = await res.json();
          console.log("[ADMIN DEBUG] Products received:", data);
          setProducts(data);
        } else {
          console.error("[ADMIN DEBUG] Error fetching products", res.status);
        }
      } else if (activeTab === 'ingredients') {
        const res = await fetch(`/api/${currentOrg.id}/extra-ingredients`);
        if (res.ok) setExtraIngredients(await res.json());
      } else if (activeTab === 'couriers') {
        const [couriersRes, statsRes] = await Promise.all([
          fetch(`/api/${currentOrg.id}/couriers`),
          fetch(`/api/${currentOrg.id}/courier-stats`)
        ]);
        if (couriersRes.ok) setCouriers(await couriersRes.json());
        if (statsRes.ok) setCourierStats(await statsRes.json());
      } else if (activeTab === 'clients') {
        const res = await fetch(`/api/${currentOrg.id}/clients`);
        if (res.ok) setClients(await res.json());
      } else if (activeTab === 'settings') {
        const res = await fetch(`/api/${currentOrg.id}/products`);
        if (res.ok) setProducts(await res.json());
      }
    } catch (err) {
      console.error("[ADMIN DEBUG] Fatal error in fetchData:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentOrg?.id, activeTab]);

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    try {
      const payload = {
        name: newProductName,
        description: newProductDesc,
        price: parseFloat(newProductPrice),
        category: newProductCategory,
        image_url: newProductImage || undefined,
        org_id: currentOrg?.id,
        promotional_price: newProductPromo ? parseFloat(newProductPromo) : null
      };
      
      const res = await fetch(editingProduct ? `/api/products/${editingProduct.id}` : "/api/products", {
        method: editingProduct ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        notify(editingProduct ? "Produto atualizado!" : "Produto criado!", "success");
        cancelEdit();
        fetchData();
      }
    } catch (err) {
      notify("Erro ao salvar produto", "error");
    } finally {
      setSavingProduct(false);
    }
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setNewProductName("");
    setNewProductDesc("");
    setNewProductPrice("");
    setNewProductImage("");
    setNewProductPromo("");
  };

  const startEdit = (p: Product) => {
    setEditingProduct(p);
    setNewProductName(p.name);
    setNewProductDesc(p.description);
    setNewProductPrice(p.price.toString());
    setNewProductPromo(p.promotional_price?.toString() || "");
    setNewProductImage(p.image_url || "");
    setNewProductCategory(p.category);
  };

  const deleteProduct = async (id: number) => {
    if (!window.confirm("Excluir este produto?")) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        notify("Produto removido", "success");
        fetchData();
      }
    } catch (err) {
      notify("Erro ao excluir", "error");
    }
  };

  const toggleAvailability = async (id: number, current: boolean) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: !current })
      });
      if (res.ok) fetchData();
    } catch (err) {
      notify("Erro ao atualizar status", "error");
    }
  };

  const saveExtraIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { name: extraName, price: parseFloat(extraPrice), org_id: currentOrg?.id };
      const res = await fetch(editingExtra ? `/api/extra-ingredients/${editingExtra.id}` : "/api/extra-ingredients", {
        method: editingExtra ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        notify(editingExtra ? "Adicional atualizado!" : "Adicional criado!", "success");
        cancelEditExtra();
        fetchData();
      }
    } catch (err) {
      notify("Erro ao salvar", "error");
    }
  };

  const cancelEditExtra = () => {
    setEditingExtra(null);
    setExtraName("");
    setExtraPrice("");
  };

  const startEditExtra = (extra: ExtraIngredient) => {
    setEditingExtra(extra);
    setExtraName(extra.name);
    setExtraPrice(extra.price.toString());
  };

  const deleteExtraIngredient = async (id: number) => {
    if (!window.confirm("Excluir este adicional?")) return;
    try {
      const res = await fetch(`/api/extra-ingredients/${id}`, { method: "DELETE" });
      if (res.ok) {
        notify("Adicional removido", "success");
        fetchData();
      }
    } catch (err) {
      notify("Erro ao excluir", "error");
    }
  };

  const saveCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg?.id) return;
    try {
      const url = editingCourier ? `/api/couriers/${editingCourier.id}` : `/api/couriers`;
      const method = editingCourier ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: currentOrg.id,
          name: newCourierName,
          phone: newCourierPhone,
          email: newCourierEmail,
          password: newCourierPassword,
          commission_rate: parseFloat(newCourierCommission)
        })
      });
      if (res.ok) {
        notify(editingCourier ? "Entregador atualizado!" : "Entregador cadastrado!", "success");
        fetchData();
        cancelEditCourier();
      } else {
        const err = await res.json();
        notify(err.error || "Erro ao processar", "error");
      }
    } catch (err) {
      console.error(err);
      notify("Erro ao processar entregador.", "error");
    }
  };

  const startEditCourier = (c: any) => {
    setEditingCourier(c);
    setNewCourierName(c.name);
    setNewCourierPhone(c.phone);
    setNewCourierEmail(c.email || "");
    setNewCourierPassword(""); 
    setNewCourierCommission(c.commission_rate.toString());
  };

  const cancelEditCourier = () => {
    setEditingCourier(null);
    setNewCourierName("");
    setNewCourierPhone("");
    setNewCourierEmail("");
    setNewCourierPassword("");
    setNewCourierCommission("15");
  };

  const deleteCourier = async (id: string | number) => {
    try {
      const res = await fetch(`/api/couriers/${id}`, { method: "DELETE" });
      if (res.ok) {
        notify("Entregador removido", "success");
        fetchData();
      }
    } catch (err) {
      notify("Erro ao excluir", "error");
    }
  };

  const handleGiveAdvance = async () => {
    if (!selectedCourier || !advanceAmount) return;
    try {
      const res = await fetch(`/api/couriers/${selectedCourier.id}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(advanceAmount) })
      });
      if (res.ok) {
        notify("Vale registrado!", "success");
        setAdvanceAmount("");
        setModalType(null);
        fetchData();
      }
    } catch (err) {
      notify("Erro ao processar vale", "error");
    }
  };

  const handlePayout = async () => {
    if (!selectedCourier) return;
    try {
      const res = await fetch(`/api/couriers/${selectedCourier.id}/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: currentOrg?.id })
      });
      if (res.ok) {
        notify("Pagamento realizado!", "success");
        setModalType(null);
        fetchData();
      }
    } catch (err) {
      notify("Erro ao processar pagamento", "error");
    }
  };

  const saveLogo = async (base64: string) => {
    setLogoSaving(true);
    try {
      const res = await fetch(`/api/organizations/${currentOrg?.id}/logo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl: base64 })
      });
      if (res.ok) notify("Logotipo atualizado!", "success");
    } catch (err) {
      notify("Erro ao salvar logo", "error");
    } finally {
      setLogoSaving(false);
    }
  };

  const saveLoginImage = async () => {
    setLoginImageSaving(true);
    try {
      const res = await fetch(`/api/organizations/${currentOrg?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login_image_url: loginImageUrl })
      });
      if (res.ok) {
        notify("Imagem de login atualizada!", "success");
        refreshTenant();
      }
    } catch (err) {
      notify("Erro ao salvar imagem", "error");
    } finally {
      setLoginImageSaving(false);
    }
  };

  const saveMpToken = async () => {
    setMpSaving(true);
    try {
      const res = await fetch(`/api/organizations/${currentOrg?.id}/mp-token`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mp_access_token: mpToken })
      });
      if (res.ok) {
        setMpSaved(true);
        notify("Token salvo com sucesso!", "success");
      }
    } catch (err) {
      notify("Erro ao salvar token", "error");
    } finally {
      setMpSaving(false);
    }
  };

  const saveHours = async () => {
    setHoursSaving(true);
    try {
      const res = await fetch(`/api/organizations/${currentOrg?.id}/operating-hours`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operating_hours: operatingHours })
      });
      if (res.ok) {
        notify("Horários salvos!", "success");
        refreshTenant();
      }
    } catch (err) {
      notify("Erro ao salvar horários", "error");
    } finally {
      setHoursSaving(false);
    }
  };

  const savePromo = async (productId: number) => {
    try {
      const res = await fetch(`/api/products/${productId}/promo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promotional_price: promoPrice ? parseFloat(promoPrice) : null })
      });
      if (res.ok) {
        setEditingPromo(null);
        fetchData();
      }
    } catch (err) {
      notify("Erro ao salvar promoção", "error");
    }
  };

  const handleSelectPlan = async (planId: string) => {
    setChangingPlan(true);
    try {
      const res = await fetch(`/api/organizations/${currentOrg?.id}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId })
      });
      if (res.ok) {
        setSelectedPlanId(planId);
        notify("Plano alterado com sucesso!", "success");
      }
    } catch (err) {
      notify("Erro ao alterar plano", "error");
    } finally {
      setChangingPlan(false);
    }
  };

  const generateSaasPix = async () => {
    setGeneratingSaasPix(true);
    try {
      const res = await fetch(`/api/organizations/${currentOrg?.id}/billing/pix`, {
        method: 'POST'
      });
      if (res.ok) {
        setSaasPixData(await res.json());
      }
    } catch (err) {
      notify("Erro ao gerar PIX", "error");
    } finally {
      setGeneratingSaasPix(false);
    }
  };

  const currentPlanObj = SAAS_PLANS.find(p => p.id === selectedPlanId) || SAAS_PLANS[0];

  return (
    <div className="md:pt-8 p-4 max-w-7xl mx-auto">
      <header className="mb-10">
        <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight flex items-center gap-4">
          <div className="w-14 h-14 bg-brand-primary/10 rounded-2xl flex items-center justify-center shadow-glow">
            <Settings size={32} className="text-brand-primary animate-spin-slow" />
          </div>
          Painel Administrativo
        </h1>
        <p className="text-slate-500 mt-3 text-lg font-medium">Controle total da sua operação com inteligência e elegância</p>
      </header>

      <div className="flex glass p-2 rounded-2xl mb-10 overflow-x-auto no-scrollbar gap-2 max-w-fit">
        {ADMIN_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all btn-premium",
                isActive ? "bg-white text-brand-secondary shadow-premium" : "text-slate-500 hover:text-brand-primary"
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'metrics' && <MetricsTab orgId={currentOrg?.id} />}

      {activeTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <form onSubmit={saveProduct} className="glass p-8 rounded-3xl border-white/50 space-y-6 sticky top-8 shadow-premium">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-slate-800">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                {editingProduct && (
                  <button type="button" onClick={cancelEdit} className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                    <X size={14} /> Cancelar
                  </button>
                )}
              </div>
              
              <div className="space-y-5">
                {editingProduct && (
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center justify-between">
                    <span className="text-blue-700 text-xs font-bold uppercase tracking-tight">Editando agora</span>
                    <button type="button" onClick={cancelEdit} className="text-[10px] bg-white px-2 py-1 rounded-md shadow-sm text-slate-400 hover:text-red-500 font-bold transition-all">Sair do Modo de Edição</button>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome do Produto</label>
                  <input required value={newProductName} onChange={e => setNewProductName(e.target.value)} className="w-full px-4 py-4 bg-white/50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium" placeholder="Ex: X-Grego Especial" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrição Gourmet</label>
                  <textarea value={newProductDesc} onChange={e => setNewProductDesc(e.target.value)} className="w-full px-4 py-4 bg-white/50 border border-slate-100 rounded-2xl outline-none h-28 focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium" placeholder="O que torna este produto único?" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Preço Elite</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase tracking-tighter">R$</span>
                      <input required type="number" step="0.01" value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-mono font-bold" placeholder="0.00" />
                    </div>
                  </div>
                  <div>
                    <label id="category-label" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoria</label>
                    <select aria-labelledby="category-label" value={newProductCategory} onChange={e => setNewProductCategory(e.target.value as any)} className="w-full px-4 py-4 bg-white/50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold text-brand-secondary">
                      <option value="churrasco">🔥 Churrasco</option>
                      <option value="ready">🥤 Bebida/Pronto</option>
                    </select>
                  </div>
                </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço Promocional (Ofertão)</label>
                       {newProductPromo && (
                         <button type="button" onClick={() => setNewProductPromo("")} className="text-[9px] text-red-500 font-bold uppercase hover:underline">Zerar Promo</button>
                       )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400 font-bold text-xs">R$</span>
                      <input type="number" step="0.01" value={newProductPromo} onChange={e => setNewProductPromo(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white/50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-mono text-orange-600 font-bold" placeholder="Deixe vazio se não houver oferta" />
                    </div>
                  </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Link da Imagem (HD)</label>
                  <input value={newProductImage} onChange={e => setNewProductImage(e.target.value)} className="w-full px-4 py-3 bg-white/50 border border-slate-100 rounded-xl outline-none text-[11px] font-mono" placeholder="https://..." />
                </div>
              </div>

              <button type="submit" disabled={savingProduct} className="w-full py-5 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:shadow-glow transition-all btn-premium disabled:opacity-50 mt-4">
                {savingProduct ? "Processando..." : editingProduct ? "Atualizar Produto" : "Lançar no Cardápio"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {products.map((p: Product) => (
              <div key={p.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-premium flex items-center gap-5 group hover:scale-[1.01] transition-all duration-300">
                {p.image_url ? (
                  <div className="relative shrink-0">
                    <img src={p.image_url} className="w-24 h-24 rounded-[1.5rem] object-cover shadow-md group-hover:shadow-glow transition-all" alt={p.name} />
                    {!p.available && <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] rounded-[1.5rem] flex items-center justify-center font-black text-[10px] text-red-600 uppercase tracking-tighter">Esgotado</div>}
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-[1.5rem] flex items-center justify-center text-3xl shrink-0 group-hover:bg-brand-primary/5 transition-colors">🍔</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900 truncate text-lg">{p.name}</h3>
                    <span className={cn("text-[10px] uppercase font-black px-2.5 py-1 rounded-full tracking-wider shadow-sm", p.available ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100")}>
                      {p.available ? 'Ativo' : 'Pausado'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 font-medium mb-2 leading-relaxed">{p.description}</p>
                  <div className="flex items-center gap-2">
                    {p.promotional_price ? (
                      <>
                        <p className="text-xl font-black text-orange-600">R$ {Number(p.promotional_price).toFixed(2)}</p>
                        <p className="text-sm line-through text-slate-400 font-bold">R$ {p.price.toFixed(2)}</p>
                      </>
                    ) : (
                      <p className="text-xl font-black text-brand-secondary">R$ {p.price.toFixed(2)}</p>
                    )}
                    {p.category === 'churrasco' && <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/5 px-2 py-0.5 rounded-lg border border-brand-primary/10">Premium</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => toggleAvailability(p.id, p.available)} className={cn("p-2.5 rounded-xl transition-all btn-premium", p.available ? "text-emerald-500 hover:bg-emerald-50" : "text-slate-300 hover:bg-slate-100")} title="Alterar disponibilidade" aria-label="Alterar disponibilidade">
                    <CheckCircle2 size={22} strokeWidth={2.5} />
                  </button>
                  <button onClick={() => startEdit(p)} className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-all btn-premium" aria-label="Editar produto" title="Editar produto">
                    <Pencil size={22} strokeWidth={2.5} />
                  </button>
                  <button onClick={() => deleteProduct(p.id)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all btn-premium" aria-label="Excluir produto" title="Excluir produto">
                    <Trash2 size={22} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center text-gray-400">
                Nenhum produto cadastrado.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'ingredients' && (
        <div className="max-w-4xl">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Ingredientes Extras (Adicionais)</h3>
              <form onSubmit={saveExtraIngredient} className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Adicional</label>
                  <input required value={extraName} onChange={e => setExtraName(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" placeholder="Ex: Bacon, Queijo Extra" />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Preço (R$)</label>
                  <input required type="number" step="0.01" value={extraPrice} onChange={e => setExtraPrice(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" placeholder="0.00" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className={cn("px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg", editingExtra ? "bg-blue-600 hover:bg-blue-700" : "bg-orange-600 hover:bg-orange-700")}>
                    {editingExtra ? 'Salvar' : 'Adicionar'}
                  </button>
                  {editingExtra && (
                    <button type="button" onClick={cancelEditExtra} className="p-3 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors" aria-label="Cancelar edição" title="Cancelar edição"><X size={20} /></button>
                  )}
                </div>
              </form>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Ingrediente</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Preço</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {extraIngredients.map((extra: ExtraIngredient) => (
                    <tr key={extra.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-800">{extra.name}</td>
                      <td className="px-6 py-4 font-mono font-bold text-orange-600">+ R$ {extra.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => startEditExtra(extra)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" aria-label="Editar adicional" title="Editar adicional"><Pencil size={18} /></button>
                          <button onClick={() => deleteExtraIngredient(extra.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" aria-label="Excluir adicional" title="Excluir adicional"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {extraIngredients.length === 0 && (
                    <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-400">Nenhum adicional cadastrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'finance' && (
        <FinancePage />
      )}

      {activeTab === 'couriers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
             <form onSubmit={saveCourier} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-lg space-y-4 sticky top-8">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">{editingCourier ? 'Editar Entregador' : 'Novo Entregador'}</h2>
                  {editingCourier && (
                    <button type="button" onClick={cancelEditCourier} className="text-xs font-bold text-gray-400 hover:text-gray-600 underline">Cancelar</button>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome Completo</label>
                  <input required value={newCourierName} onChange={e => setNewCourierName(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="Nome do entregador" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Telefone (Opcional)</label>
                  <input value={newCourierPhone} onChange={e => setNewCourierPhone(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="55779..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email de Acesso (Login)</label>
                  <input required value={newCourierEmail} onChange={e => setNewCourierEmail(e.target.value)} type="email" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="entregador@gmail.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Senha {editingCourier && '(deixe em branco se não mudar)'}</label>
                  <input required={!editingCourier} type="password" value={newCourierPassword} onChange={e => setNewCourierPassword(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="Senha de acesso" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Taxa de Comissão (%)</label>
                  <input required type="number" step="0.01" value={newCourierCommission} onChange={e => setNewCourierCommission(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="Ex: 15" />
                </div>
                <button type="submit" className={cn("w-full py-4 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all", editingCourier ? "bg-blue-600 hover:bg-blue-700" : "bg-orange-600 hover:bg-orange-700")}>
                  {editingCourier ? 'Salvar Alterações' : 'Cadastrar Entregador'}
                </button>
             </form>
          </div>
          
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead className="bg-gray-50 border-b border-gray-100">
                     <tr>
                       <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Entregador</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Métricas</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Saldo</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Ações</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {couriers.map(c => (
                       <tr key={c.id}>
                         <td className="px-6 py-4">
                           <p className="font-bold text-gray-800">{c.name}</p>
                           <p className="text-xs text-gray-400 font-mono">{c.phone}</p>
                           <p className="text-[10px] text-orange-600 font-bold mt-1">Comissão: {c.commission_rate}%</p>
                         </td>
                         <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">📦 {courierStats[c.id]?.monthly_deliveries || 0} entregas</span>
                              <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md">⏱️ {courierStats[c.id]?.avg_monthly_time_mins || 0}m méd.</span>
                            </div>
                         </td>
                         <td className="px-6 py-4">
                           <p className="text-sm font-black text-emerald-600">R$ {(courierStats[c.id]?.net_pay || 0).toFixed(2)}</p>
                           {courierStats[c.id]?.total_advances > 0 && (
                             <p className="text-[10px] text-red-500 font-bold">- R$ {courierStats[c.id].total_advances.toFixed(2)} vales</p>
                           )}
                         </td>
                         <td className="px-6 py-4 text-right">
                           <div className="flex justify-end gap-2">
                             <button onClick={() => startEditCourier(c)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100" title="Editar Entregador" aria-label="Editar Entregador"><Pencil size={18} /></button>
                              <button onClick={() => { setSelectedCourier(c); setModalType('advance'); }} className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100" title="Dar Vale" aria-label="Dar Vale"><TrendingDown size={18} /></button>
                             <button onClick={() => { setSelectedCourier(c); setModalType('payout'); }} className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700">Pagar</button>
                             <button onClick={() => { setSelectedCourier(c); setModalType('delete_courier'); }} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100" title="Remover Entregador" aria-label="Remover Entregador"><Trash2 size={18} /></button>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'clients' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Cliente</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Pedidos</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Total Gasto</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Último Pedido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clients.map(c => (
                  <tr key={c.id || c.telefone} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                          {c.avatar_url ? (
                            <img src={c.avatar_url} className="w-full h-full object-cover" alt={c.nome} />
                          ) : (
                            <User size={18} className="text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{c.nome || "Anônimo"}</p>
                          <p className="text-xs text-blue-600 font-mono">{c.telefone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-orange-100 text-orange-700 font-bold px-3 py-1 rounded-full text-sm">{c.total_pedidos}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-emerald-600">R$ {c.total_gasto.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-gray-400">
                      {new Date(c.ultimo_pedido).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'faturamento' && (
        <div className="max-w-4xl mx-auto space-y-8">
           <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-lg">
              <h2 className="text-2xl font-black mb-6 flex items-center gap-3"><Star className="text-purple-600" /> Assinatura da Loja</h2>
              
              <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
                  <div className="flex items-center gap-3">
                    <p className="text-3xl font-black text-gray-900 capitalize">{org?.subscription_status || 'Free'}</p>
                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase", org?.subscription_status === 'active' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")}>
                      {org?.subscription_status || 'DESCONHECIDO'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-400 uppercase">Vencimento</p>
                  <p className="text-xl font-black text-gray-700">{org?.billing_due_date ? new Date(org.billing_due_date).toLocaleDateString('pt-BR') : '--/--/----'}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-10">
                {SAAS_PLANS.map(plan => (
                   <div key={plan.id} className={cn("p-6 rounded-3xl border-2 transition-all", selectedPlanId === plan.id ? "border-purple-600 bg-purple-50/50" : "border-gray-100 hover:border-purple-200")}>
                      <h3 className="font-black text-lg mb-1">{plan.name}</h3>
                      <p className="text-2xl font-black text-purple-600 mb-4">R$ {plan.price.toFixed(2)}</p>
                      <button onClick={() => handleSelectPlan(plan.id)} disabled={selectedPlanId === plan.id || changingPlan} className="w-full py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold hover:border-purple-600 disabled:opacity-50">
                        {selectedPlanId === plan.id ? 'Plano Atual' : 'Escolher'}
                      </button>
                   </div>
                ))}
              </div>

              <div className="text-center pt-8 border-t border-gray-100">
                   {saasPixData ? (
                     <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 inline-block">
                        <img src={`data:image/png;base64,${saasPixData.qr_code_base64}`} className="w-48 h-48 mx-auto mb-4" alt="PIX" />
                        <p className="text-[10px] font-mono break-all line-clamp-2 max-w-[200px]">{saasPixData.qr_code}</p>
                     </div>
                   ) : (
                     <button onClick={generateSaasPix} disabled={generatingSaasPix} className="px-10 py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-all flex items-center justify-center gap-2 mx-auto">
                       <QrCode size={20} /> Gerar PIX Mensalidade
                     </button>
                   )}
              </div>
           </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-8">
           <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-lg">
                 <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Store className="text-blue-500" /> Logotipo</h2>
                 {logoPreview && <img src={logoPreview} className="h-24 mx-auto mb-6 object-contain" alt="Logo" />}
                 <label className="block w-full py-4 bg-blue-600 text-white text-center rounded-2xl font-bold cursor-pointer hover:bg-blue-700 transition">
                   <input type="file" className="hidden" accept="image/*" onChange={e => {
                     const file = e.target.files?.[0];
                     if (file) {
                       const reader = new FileReader();
                       reader.onloadend = () => {
                         const base64 = reader.result as string;
                         setLogoPreview(base64);
                         saveLogo(base64);
                       };
                       reader.readAsDataURL(file);
                     }
                   }} />
                   {logoSaving ? 'Enviando...' : 'Alterar Logotipo'}
                 </label>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-lg flex flex-col h-full">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><ImageIcon className="text-orange-500" /> Imagem de Login</h2>
                
                <div className="flex-1 flex flex-col justify-center mb-6">
                  {loginImageUrl ? (
                    <div className="relative group">
                      <img src={loginImageUrl} className="w-full h-40 object-cover rounded-2xl border-2 border-orange-50" alt="Preview Login" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                         <span className="text-white text-xs font-bold uppercase tracking-wider">Preview do Fundo</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-40 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon size={40} className="mb-2 opacity-20" />
                      <span className="text-sm font-bold">Nenhum fundo definido</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="block w-full py-4 bg-orange-600 text-white text-center rounded-2xl font-bold cursor-pointer hover:bg-orange-700 transition shadow-lg shadow-orange-100">
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const base64 = reader.result as string;
                            setLoginImageUrl(base64);
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                    <div className="flex items-center justify-center gap-2">
                       <Upload size={20} />
                       <span>{loginImageSaving ? 'Processando...' : 'Pegar do Computador'}</span>
                    </div>
                  </label>
                  
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 text-[10px] font-bold uppercase">URL</span>
                    </div>
                    <input 
                      type="text" 
                      value={loginImageUrl && !loginImageUrl.startsWith('data:') ? loginImageUrl : ""} 
                      onChange={e => setLoginImageUrl(e.target.value)} 
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-[10px] font-mono" 
                      placeholder="Ou cole o link da imagem..." 
                    />
                    {loginImageUrl && loginImageUrl.startsWith('data:') && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Arquivo local carregado" />
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={saveLoginImage} 
                    disabled={loginImageSaving || !loginImageUrl} 
                    className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                  >
                    {loginImageSaving ? (
                      <>
                        <RefreshCw className="animate-spin" size={16} />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Confirmar Alteração</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-gray-400 italic text-center font-bold">A imagem aparecerá na lateral da tela de login.</p>
                </div>
              </div>
           </div>

           <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-lg">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><QrCode className="text-emerald-500" /> Mercado Pago</h2>
              <input type="password" value={mpToken} onChange={e => setMpToken(e.target.value)} className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl mb-4 font-mono outline-none" placeholder="APP_USR-..." />
              <button onClick={saveMpToken} disabled={mpSaving} className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-900 transition">
                 {mpSaving ? 'Salvando...' : 'Salvar Token'}
              </button>
           </div>

           <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><Clock className="text-orange-500" /> Horário de Funcionamento</h2>
                <button onClick={saveHours} disabled={hoursSaving} className="bg-orange-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-orange-700">
                  {hoursSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                 {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                    const dayLabels: Record<string, string> = {
                      monday: "Segunda",
                      tuesday: "Terça",
                      wednesday: "Quarta",
                      thursday: "Quinta",
                      friday: "Sexta",
                      saturday: "Sábado",
                      sunday: "Domingo"
                    };
                    const config = operatingHours[day] || { open: '00:00', close: '23:59', closed: false };
                    return (
                      <div key={day} className={cn("p-4 rounded-2xl border-2 transition-all", config.closed ? "bg-gray-50 border-gray-200 opacity-60" : "bg-white border-orange-50")}>
                         <div className="flex justify-between items-center mb-3">
                           <label htmlFor={`closed-${day}`} className="font-bold text-gray-800 capitalize cursor-pointer">{dayLabels[day]}</label>
                           <input type="checkbox" id={`closed-${day}`} checked={config.closed} onChange={e => setOperatingHours({...operatingHours, [day]: {...config, closed: e.target.checked}})} className="w-4 h-4 accent-orange-500" />
                         </div>
                         {!config.closed && (
                           <div className="flex items-center gap-2">
                             <label htmlFor={`open-${day}`} className="sr-only">Abrir às</label>
                             <input type="time" id={`open-${day}`} value={config.open} onChange={e => setOperatingHours({...operatingHours, [day]: {...config, open: e.target.value}})} className="w-full px-2 py-1 bg-gray-50 border rounded-lg text-xs" />
                             <span className="text-[10px] text-gray-400">às</span>
                             <label htmlFor={`close-${day}`} className="sr-only">Fechar às</label>
                             <input type="time" id={`close-${day}`} value={config.close} onChange={e => setOperatingHours({...operatingHours, [day]: {...config, close: e.target.value}})} className="w-full px-2 py-1 bg-gray-50 border rounded-lg text-xs" />
                           </div>
                         )}
                      </div>
                    );
                 })}
              </div>
           </div>
        </div>
      )}

      {/* Courier Modals */}
      <AnimatePresence>
        {modalType && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-gray-800 capitalize">{modalType.replace('_', ' ')}</h3>
                  <button onClick={() => setModalType(null)} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Fechar" title="Fechar"><X size={20} /></button>
                </div>
                
                {modalType === 'advance' && (
                  <div className="space-y-4">
                    <input type="number" step="0.01" value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} className="w-full px-4 py-4 bg-gray-50 border rounded-2xl font-black text-2xl text-center" placeholder="0.00" />
                    <button onClick={handleGiveAdvance} className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black shadow-lg">Confirmar Vale</button>
                  </div>
                )}
                
                {modalType === 'payout' && (
                  <div className="space-y-4 text-center">
                    <p className="text-gray-500 mb-6">Deseja liquidar todas as comissões e vales deste entregador?</p>
                    <button onClick={handlePayout} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg">Confirmar Pagamento</button>
                  </div>
                )}
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
