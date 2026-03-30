import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { 
  DollarSign, 
  Plus, 
  TrendingUp, 
  TrendingDown,
  ShoppingBag, 
  Activity, 
  X,
  Package,
  Calculator,
  Save,
  ShoppingCart,
  Layers,
  Trash2,
  Percent,
  Edit2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTenant } from "../context/TenantContext";
import { useNotification } from "../context/NotificationContext";
import { supabase } from "../supabase";
import { Order, InventoryItem, Product, ProductIngredient } from "../types";
import { cn } from "../lib/utils";

export const FinancePage = () => {
  const { org } = useTenant();
  const { notify } = useNotification();
  const location = useLocation();
  const isNested = location.pathname === '/admin';
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'simulator' | 'recipe' | 'reports'>('dashboard');
  const [selectedReportDate, setSelectedReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<(Product & { ingredients: ProductIngredient[] })[]>([]);
  const [loading, setLoading] = useState(true);

  // Mercado Pago Fee State
  const [mpPixRate, setMpPixRate] = useState<number>(0.49); // 0.49% para PIX
  const [mpCardRate, setMpCardRate] = useState<number>(3.49); // 3.49% para crédito à vista

  // Simulator State
  const [simQuantities, setSimQuantities] = useState<Record<number, number>>({});
  const [targetMargin, setTargetMargin] = useState<number>(50); // Default 50% profit margin

  // Technical Sheet Editor State
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);
  const [isAddingIngredient, setIsAddingIngredient] = useState(false);
  const [newIngId, setNewIngId] = useState("");
  const [newIngQty, setNewIngQty] = useState("");

  // Batch Entry State
  const [isAddingPurchase, setIsAddingPurchase] = useState(false);
  const [isAddingNewMaterial, setIsAddingNewMaterial] = useState(false);
  const [selectedInsumo, setSelectedInsumo] = useState<string>("");
  const [purchaseWeight, setPurchaseWeight] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");

  const [newMaterial, setNewMaterial] = useState({
    name: "",
    unit: "Kg",
    category: "Carne",
    initial_cost: ""
  });
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);

  // Dashboard Metrics & Filters
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | '7d' | 'month' | 'all'>('today');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: 'Avulsa' });

  // Temp editing state to prevent focus loss and sync issues
  const [editingIngValues, setEditingIngValues] = useState<Record<string, string>>({});

  const fetchData = useCallback(async (isInitial = false) => {
    if (!org) return;
    if (isInitial) setLoading(true);
    try {
      const [ordRes, invRes, prodRes, expRes] = await Promise.all([
        supabase.from('orders').select('*').eq('org_id', org.id),
        supabase.from('inventory_items').select('*').eq('org_id', org.id),
        supabase.from('products').select('*, product_ingredients(*, inventory_items(*))').eq('org_id', org.id),
        supabase.from('expenses').select('*').eq('org_id', org.id).order('date', { ascending: false })
      ]);

      setOrders(ordRes.data || []);
      setInventory(invRes.data || []);
      setExpenses(expRes.data || []);

      const formattedProds = (prodRes.data || []).map(p => ({
        ...p,
        ingredients: (p.product_ingredients || []).map((pi: any) => ({
          ...pi,
          inventory_item: pi.inventory_items
        }))
      }));
      setProducts(formattedProds);
    } catch (err) {
      console.error(err);
      notify("Erro ao carregar dados financeiros.", "error");
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [org, notify]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const handleUpdatePrice = async () => {
    if (!selectedInsumo || !purchasePrice || !purchaseWeight) return;
    const price = parseFloat(purchasePrice);
    const weight = parseFloat(purchaseWeight);
    const avgCost = price / weight;

    try {
      // Fetch current history
      const currentItem = inventory.find(i => i.id === selectedInsumo);
      const history = Array.isArray(currentItem?.price_history) ? currentItem.price_history : [];
      
      // Add OLD price to history BEFORE updating to the new one
      const oldPrice = Number(currentItem?.current_avg_cost || 0);
      const newHistory = [oldPrice, ...history].slice(0, 5); // Keep up to 5 last prices

      const { error } = await supabase
        .from('inventory_items')
        .update({ 
          current_avg_cost: avgCost, 
          last_purchase_price: price,
          price_history: newHistory,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedInsumo);

      if (error) throw error;
      notify("Preço de custo atualizado!", "success");
      fetchData();
      setIsAddingPurchase(false);
      setPurchasePrice("");
      setPurchaseWeight("");
    } catch (err: any) {
      notify("Erro ao atualizar custo: " + err.message, "error");
    }
  };

  const handleCreateMaterial = async () => {
    if (!org || !newMaterial.name || !newMaterial.unit) return;
    try {
      if (editingMaterialId) {
        // Mode: Update
        const { error } = await supabase.from('inventory_items').update({
          name: newMaterial.name,
          unit: newMaterial.unit,
          category: newMaterial.category,
          current_avg_cost: parseFloat(newMaterial.initial_cost) || 0,
          updated_at: new Date().toISOString()
        }).eq('id', editingMaterialId);

        if (error) throw error;
        notify("Material atualizado!", "success");
      } else {
        // Mode: Create
        const { error } = await supabase.from('inventory_items').insert([{
          name: newMaterial.name,
          unit: newMaterial.unit,
          category: newMaterial.category,
          current_avg_cost: parseFloat(newMaterial.initial_cost) || 0,
          org_id: org.id,
          updated_at: new Date().toISOString()
        }]);

        if (error) throw error;
        notify("Material cadastrado!", "success");
      }

      setIsAddingNewMaterial(false);
      setEditingMaterialId(null);
      setNewMaterial({ name: "", unit: "Kg", category: "Proteína", initial_cost: "" });
      fetchData();
    } catch (err: any) {
      notify("Erro ao salvar: " + err.message, "error");
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm("Excluir este material permanentemente? Isso pode afetar o cálculo de custo de pratos que usam este insumo.")) return;
    try {
      const { error } = await supabase.from('inventory_items').delete().eq('id', id);
      if (error) throw error;
      notify("Material excluído!", "success");
      fetchData();
    } catch (err: any) {
      notify("Erro ao excluir: " + err.message, "error");
    }
  };

  const handleUpdateIngredient = async (ingId: string, value: string) => {
    setEditingIngValues(prev => ({ ...prev, [ingId]: value }));

    const quantity = parseFloat(value);
    if (isNaN(quantity)) return;

    setProducts(prev => prev.map(p => ({
      ...p,
      ingredients: p.ingredients.map(ing => ing.id === ingId ? { ...ing, quantity } : ing)
    })));

    try {
      const { error } = await supabase.from('product_ingredients').update({ quantity }).eq('id', ingId);
      if (error) throw error;
    } catch (err: any) {
      console.error("Sync error:", err);
    }
  };

  const handleDeleteIngredient = async (ingId: string) => {
    if (!confirm("Remover este ingrediente da ficha técnica?")) return;
    try {
      const { error } = await supabase.from('product_ingredients').delete().eq('id', ingId);
      if (error) throw error;
      notify("Ingrediente removido!", "success");
      fetchData();
    } catch (err: any) {
      notify("Erro ao remover: " + err.message, "error");
    }
  };

  const handleAddIngredient = async () => {
    if (!selectedProductId || !newIngId || !newIngQty) return;
    try {
      const { error } = await supabase.from('product_ingredients').insert([{
        product_id: selectedProductId,
        inventory_item_id: newIngId,
        quantity: parseFloat(newIngQty)
      }]);
      if (error) throw error;
      notify("Ingrediente adicionado!", "success");
      fetchData();
      setIsAddingIngredient(false);
      setNewIngId("");
      setNewIngQty("");
    } catch (err: any) {
      notify("Erro ao adicionar: " + err.message, "error");
    }
  };

  // Calculations
  const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
  
  const productCosts = useMemo(() => {
    const costs: Record<number, number> = {};
    products.forEach(p => {
      let total = 0;
      p.ingredients.forEach(ing => {
        const item = inventory.find(i => i.id === ing.inventory_item_id);
        if (item) {
          total += (item.current_avg_cost * Number(ing.quantity));
        }
      });
      costs[p.id] = total;
    });
    return costs;
  }, [products, inventory]);

  const groupedIngredients = useMemo(() => {
    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (!selectedProduct) return {};
    
    const groups: Record<string, ProductIngredient[]> = {};
    selectedProduct.ingredients.forEach(ing => {
      const cat = (ing as any).inventory_item?.category || 'Insumo';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(ing);
    });
    return groups;
  }, [products, selectedProductId]);


  // Filtered Data for Dashboard
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    return orders.filter(o => {
      const orderDate = new Date(o.created_at).getTime();
      if (selectedPeriod === 'today') return orderDate >= today;
      if (selectedPeriod === '7d') return orderDate >= today - (7 * 24 * 60 * 60 * 1000);
      if (selectedPeriod === 'month') return orderDate >= today - (30 * 24 * 60 * 60 * 1000);
      return true;
    });
  }, [orders, selectedPeriod]);

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    return expenses.filter(e => {
      const expDate = new Date(e.date || e.created_at).getTime();
      if (selectedPeriod === 'today') return expDate >= today;
      if (selectedPeriod === '7d') return expDate >= today - (7 * 24 * 60 * 60 * 1000);
      if (selectedPeriod === 'month') return expDate >= today - (30 * 24 * 60 * 60 * 1000);
      return true;
    });
  }, [expenses, selectedPeriod]);

  const financialMetrics = useMemo(() => {
    const revenue = filteredOrders.reduce((acc, o) => acc + o.total_price, 0);
    const count = filteredOrders.length;
    const ticket = count > 0 ? revenue / count : 0;
    
    const cmv = filteredOrders.reduce((acc, o) => {
      return acc + (o.items.reduce((sc, item) => sc + (productCosts[item.id] || 0), 0));
    }, 0);
    
    const courierCosts = filteredOrders.reduce((acc, o) => {
      if (o.courier_id) {
        const orderCmv = o.items.reduce((sc, item: any) => sc + (productCosts[item.id] || 0), 0);
        const orderGrossProfit = Math.max(0, o.total_price - orderCmv);
        return acc + (orderGrossProfit * 0.18);
      }
      return acc;
    }, 0);

    // Mercado Pago fees: PIX = mpPixRate%, Card/others = mpCardRate%
    const mpFees = filteredOrders.reduce((acc, o) => {
      const rate = (o.payment_method === 'pix' || o.payment_status === 'paid_pix') ? mpPixRate : mpCardRate;
      return acc + (o.total_price * (rate / 100));
    }, 0);

    const expTotal = filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const avulsasTotal = filteredExpenses
      .filter(e => e.category === 'Avulsa')
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    
    return {
      revenue,
      count,
      ticket,
      cmv,
      courierCosts,
      mpFees,
      expenses: expTotal,
      avulsas: avulsasTotal,
      netProfit: revenue - cmv - expTotal - courierCosts - mpFees
    };
  }, [filteredOrders, filteredExpenses, productCosts, mpPixRate, mpCardRate]);

  // Daily Report Data
  const reportData = useMemo(() => {
    const dayOrders = orders.filter(o => o.created_at.startsWith(selectedReportDate));
    const dayExpenses = expenses.filter(e => (e.date || e.created_at).startsWith(selectedReportDate));

    const revenue = dayOrders.reduce((acc, o) => acc + o.total_price, 0);
    const cmv = dayOrders.reduce((acc, o) => {
      return acc + (o.items.reduce((sc, item: any) => sc + (productCosts[item.id] || 0), 0));
    }, 0);
    const courierCosts = dayOrders.reduce((acc, o) => {
      if (o.courier_id) {
        const orderCmv = o.items.reduce((sc, item: any) => sc + (productCosts[item.id] || 0), 0);
        const orderGrossProfit = Math.max(0, o.total_price - orderCmv);
        return acc + (orderGrossProfit * 0.18);
      }
      return acc;
    }, 0);
    const mpFees = dayOrders.reduce((acc, o) => {
      const rate = (o.payment_method === 'pix' || o.payment_status === 'paid_pix') ? mpPixRate : mpCardRate;
      return acc + (o.total_price * (rate / 100));
    }, 0);
    const expTotal = dayExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    return {
      revenue,
      cmv,
      courierCosts,
      mpFees,
      expenses: expTotal,
      netProfit: revenue - cmv - courierCosts - mpFees - expTotal,
      orders: dayOrders.map(o => {
        const orderCmv = o.items.reduce((sc, item: any) => sc + (productCosts[item.id] || 0), 0);
        const orderGrossProfit = Math.max(0, o.total_price - orderCmv);
        const orderCourier = o.courier_id ? (orderGrossProfit * 0.18) : 0;
        const orderMpFee = o.total_price * ((o.payment_method === 'pix' || o.payment_status === 'paid_pix' ? mpPixRate : mpCardRate) / 100);
        return {
          ...o,
          cmv: orderCmv,
          courierCost: orderCourier,
          mpFee: orderMpFee,
          profit: orderGrossProfit - orderCourier - orderMpFee
        };
      })
    };
  }, [orders, expenses, selectedReportDate, productCosts, mpPixRate, mpCardRate]);

  // Quick Fix for CMV scaling bug (Molho/Pão)
  const handleRepairData = async () => {
    try {
      // 1. Fix Molho da Casa (if it's R$ 37/ml, set to R$ 0.037/ml)
      const molho = inventory.find(i => i.name.toLowerCase().includes('molho'));
      if (molho && Number(molho.current_avg_cost) > 5) { // Threshold for ML scale error
        await supabase.from('inventory_items').update({ current_avg_cost: 0.037 }).eq('id', molho.id);
      }

      // 2. Fix Pão Francês for Grego Tradicional (if it's 0.225, set to 1)
      const trad = products.find(p => p.name.toLowerCase().includes('tradicional'));
      if (trad) {
        const pao = trad.ingredients.find(ing => (ing as any).inventory_item?.name.toLowerCase().includes('pão'));
        if (pao && Number(pao.quantity) < 0.5) {
          await supabase.from('product_ingredients').update({ quantity: 1 }).eq('id', pao.id);
        }
      }

      notify("Dados reparados com sucesso!", "success");
      fetchData();
    } catch (err) {
      notify("Erro ao reparar dados.", "error");
    }
  };

  const handleAddExpense = async () => {
    if (!org || !newExpense.description || !newExpense.amount) return;
    try {
      const { error } = await supabase.from('expenses').insert([{
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        category: newExpense.category,
        date: new Date().toISOString(),
        org_id: org.id,
        settled: true
      }]);
      if (error) throw error;
      notify("Despesa registrada!", "success");
      setIsAddingExpense(false);
      setNewExpense({ description: '', amount: '', category: 'Avulsa' });
      fetchData();
    } catch (err: any) {
      notify("Erro ao salvar despesa: " + err.message, "error");
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm("Excluir esta despesa?")) return;
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      notify("Despesa removida!", "success");
      fetchData();
    } catch (err: any) {
      notify("Erro ao remover: " + err.message, "error");
    }
  };

  const simulationTotals = useMemo(() => {
    let totalCost = 0;
    let totalRevenue = 0;
    Object.entries(simQuantities).forEach(([id, qty]) => {
      const pid = parseInt(id);
      const prod = products.find(p => p.id === pid);
      if (prod) {
        const quantity = Number(qty) || 0;
        totalCost += (productCosts[pid] || 0) * quantity;
        totalRevenue += Number(prod.price || 0) * quantity;
      }
    });
    return { totalCost, totalRevenue, profit: totalRevenue - totalCost };
  }, [simQuantities, products, productCosts]);

  if (loading) return <div className="p-8 text-center text-gray-400">Carregando dados financeiros...</div>;

  return (
    <div className={cn(
      "max-w-6xl mx-auto",
      !isNested && "pb-8 md:pt-8 p-4 min-h-screen"
    )}>
      {!isNested && (
        <header className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <DollarSign size={40} className="text-orange-600" />
            Financeiro & Precificação
          </h1>
          <div className="flex gap-2 mt-6 overflow-x-auto pb-2 noscrollbar">
            {/* Tabs are kept below */}
          </div>
        </header>
      )}

      {/* Tabs navigation for Finance (always show unless you want Admin to control it) */}
      <div className={cn("flex gap-2 overflow-x-auto pb-2 noscrollbar", isNested ? "mb-6" : "hidden")}>
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={cn("px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all whitespace-nowrap", activeTab === 'dashboard' ? "bg-orange-600 text-white shadow-lg" : "bg-white text-gray-500")}
        >
          <TrendingUp size={18} /> Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          className={cn("px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all whitespace-nowrap", activeTab === 'inventory' ? "bg-orange-600 text-white shadow-lg" : "bg-white text-gray-500")}
        >
          <Package size={18} /> Inventário
        </button>
        <button 
          onClick={() => setActiveTab('recipe')}
          className={cn("px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all whitespace-nowrap", activeTab === 'recipe' ? "bg-orange-600 text-white shadow-lg" : "bg-white text-gray-500")}
        >
          <Layers size={18} /> Ficha Técnica
        </button>
        <button 
          onClick={() => setActiveTab('simulator')}
          className={cn("px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all whitespace-nowrap", activeTab === 'simulator' ? "bg-orange-600 text-white shadow-lg" : "bg-white text-gray-500")}
        >
          <Calculator size={18} /> Simulador
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={cn("px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all whitespace-nowrap", activeTab === 'reports' ? "bg-orange-600 text-white shadow-lg" : "bg-white text-gray-500")}
        >
          <Activity size={18} /> Relatório Diário
        </button>
      </div>

      {!isNested && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 noscrollbar">
            <button onClick={() => setActiveTab('dashboard')} className={cn("px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all whitespace-nowrap", activeTab === 'dashboard' ? "bg-orange-600 text-white shadow-lg" : "bg-white text-gray-500")}><TrendingUp size={18} /> Dashboard</button>
            <button onClick={() => setActiveTab('inventory')} className={cn("px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all whitespace-nowrap", activeTab === 'inventory' ? "bg-orange-600 text-white shadow-lg" : "bg-white text-gray-500")}><Package size={18} /> Inventário</button>
            <button onClick={() => setActiveTab('recipe')} className={cn("px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all whitespace-nowrap", activeTab === 'recipe' ? "bg-orange-600 text-white shadow-lg" : "bg-white text-gray-500")}><Layers size={18} /> Ficha Técnica</button>
            <button onClick={() => setActiveTab('simulator')} className={cn("px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all whitespace-nowrap", activeTab === 'simulator' ? "bg-orange-600 text-white shadow-lg" : "bg-white text-gray-500")}><Calculator size={18} /> Simulador</button>
        </div>
      )}

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
           {/* Period Filter */}
           <div className="flex justify-between items-center bg-white p-2 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto gap-2">
             <div className="flex gap-1">
               {(['today', '7d', 'month', 'all'] as const).map(p => (
                 <button 
                  key={p}
                  onClick={() => setSelectedPeriod(p)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                    selectedPeriod === p ? "bg-orange-100 text-orange-600" : "text-gray-400 hover:bg-gray-50"
                  )}
                 >
                   {p === 'today' ? 'Hoje' : p === '7d' ? '7 Dias' : p === 'month' ? 'Mensal' : 'Tudo'}
                 </button>
               ))}
             </div>
             
             <div className="flex gap-2">
               <button 
                 onClick={() => setIsAddingExpense(true)}
                 className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-red-600 hover:text-white transition-all shadow-sm"
               >
                 <Plus size={14} /> Nova Despesa
               </button>

               {financialMetrics.cmv > 0 && (
                 <button 
                   onClick={handleRepairData}
                   aria-label="Corrigir erros comuns de escala no CMV"
                   className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                 >
                   <Activity size={14} /> Reparar CMV
                 </button>
               )}
             </div>
           </div>

           {/* Mercado Pago Rate Config */}
           <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-wrap items-center gap-4">
             <div className="flex items-center gap-2">
               <span className="text-blue-600 text-lg">💳</span>
               <span className="text-xs font-black text-blue-800 uppercase tracking-widest">Taxa Mercado Pago</span>
             </div>
             <div className="flex items-center gap-3 flex-wrap">
               <label className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-blue-100 shadow-sm">
                 <span className="text-xs font-bold text-blue-600">PIX</span>
                 <input
                   type="number" step="0.01" min="0" max="10"
                   value={mpPixRate}
                   onChange={e => setMpPixRate(parseFloat(e.target.value) || 0)}
                   className="w-14 text-xs font-black text-center outline-none text-blue-800"
                 />
                 <span className="text-xs text-blue-400 font-bold">%</span>
               </label>
               <label className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-blue-100 shadow-sm">
                 <span className="text-xs font-bold text-blue-600">Cartão</span>
                 <input
                   type="number" step="0.01" min="0" max="20"
                   value={mpCardRate}
                   onChange={e => setMpCardRate(parseFloat(e.target.value) || 0)}
                   className="w-14 text-xs font-black text-center outline-none text-blue-800"
                 />
                 <span className="text-xs text-blue-400 font-bold">%</span>
               </label>
             </div>
             <p className="text-[10px] text-blue-500 font-medium">
               Taxa MP: <strong>{formatCurrency(financialMetrics.mpFees)}</strong> descontados do lucro neste período.
             </p>
           </div>

           {/* Metrics Grid - 6 Cards */}
           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">💰 Faturamento</p>
                <p className="text-xl font-black text-gray-900">{formatCurrency(financialMetrics.revenue)}</p>
              </div>
              <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">📦 Pedidos</p>
                <p className="text-xl font-black text-gray-900">{financialMetrics.count}</p>
              </div>
              <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">🎟️ Ticket Médio</p>
                <p className="text-xl font-black text-gray-900">{formatCurrency(financialMetrics.ticket)}</p>
              </div>
              <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between">
                 <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">💸 Despesas</p>
                   <p className="text-xl font-black text-red-500">- {formatCurrency(financialMetrics.expenses)}</p>
                 </div>
                 {financialMetrics.avulsas > 0 && (
                   <div className="mt-2 text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full w-fit">
                     Avulsas: {formatCurrency(financialMetrics.avulsas)}
                   </div>
                 )}
              </div>
              <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-blue-100">
                <p className="text-[10px] font-black text-blue-400 uppercase mb-1 tracking-widest">💳 Taxa MP</p>
                <p className="text-xl font-black text-blue-600">- {formatCurrency(financialMetrics.mpFees)}</p>
              </div>
              <div className={cn("p-5 rounded-[2rem] shadow-lg text-white transition-all col-span-2 sm:col-span-1", financialMetrics.netProfit >= 0 ? "bg-orange-600" : "bg-red-600")}>
                <p className="text-[10px] font-bold opacity-80 uppercase mb-1 tracking-widest text-white">📉 Lucro Líquido</p>
                <p className="text-xl font-black text-white">{formatCurrency(financialMetrics.netProfit)}</p>
              </div>
           </div>
           
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Orders List */}
             <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
               <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                 <h2 className="font-bold text-gray-800 flex items-center gap-2"><ShoppingCart size={18} className="text-orange-600" /> Vendas do Período</h2>
               </div>
               <div className="overflow-x-auto max-h-[400px]">
                 <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 sticky top-0">
                      <tr>
                        <th className="px-6 py-3">Data</th>
                        <th className="px-6 py-3">Cliente</th>
                        <th className="px-6 py-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredOrders.length === 0 ? (
                        <tr><td colSpan={3} className="p-10 text-center text-gray-400 text-xs font-bold uppercase italic">Nenhuma venda encontrada</td></tr>
                      ) : (
                        filteredOrders.slice().reverse().map(o => (
                          <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 text-[10px] text-gray-400">{new Date(o.created_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4 font-bold text-gray-800 text-sm">{o.customer_name}</td>
                            <td className="px-6 py-4 text-right font-black text-gray-900">{formatCurrency(o.total_price)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                 </table>
               </div>
             </div>

             {/* Expenses List */}
             <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm flex flex-col">
               <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                 <h2 className="font-bold text-gray-800 flex items-center gap-2"><TrendingDown size={18} className="text-red-500" /> Gestão de Despesas</h2>
                 <button 
                  onClick={() => setIsAddingExpense(true)}
                  aria-label="Registrar nova despesa"
                  title="Adicionar Despesa"
                  className="p-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                 >
                   <Plus size={18} />
                 </button>
               </div>
               <div className="overflow-y-auto max-h-[400px] flex-1">
                 {filteredExpenses.length === 0 ? (
                   <div className="p-20 text-center text-gray-300 font-black uppercase text-xs">Sem despesas registradas</div>
                 ) : (
                   <div className="divide-y divide-gray-50">
                     {filteredExpenses.map(exp => (
                        <div key={exp.id} className={cn("p-4 flex justify-between items-center transition-colors group", exp.category === 'Avulsa' ? "bg-amber-50/30 hover:bg-amber-100/40" : "hover:bg-red-50/30")}>
                           <div className="flex gap-3 items-center">
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", exp.category === 'Avulsa' ? "bg-amber-100 text-amber-600" : "bg-red-50 text-red-500")}>
                                 {exp.category === 'Avulsa' ? <Activity size={14} /> : <DollarSign size={14} />}
                              </div>
                              <div>
                                 <p className="text-sm font-bold text-gray-800">{exp.description}</p>
                                 <p className={cn("text-[10px] font-black uppercase tracking-widest", exp.category === 'Avulsa' ? "text-amber-600" : "text-gray-400")}>
                                    {exp.category} • {new Date(exp.date || exp.created_at).toLocaleDateString()}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-3">
                              <p className="font-black text-red-500 text-sm">-{formatCurrency(Number(exp.amount))}</p>
                              <button 
                                onClick={() => handleDeleteExpense(exp.id)}
                                aria-label="Excluir despesa"
                                title="Excluir"
                                className="p-2 text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                 <Trash2 size={14} />
                              </button>
                           </div>
                        </div>
                     ))}
                   </div>
                 )}
               </div>
             </div>
           </div>
        </motion.div>
      )}

      {/* INVENTORY TAB */}
      {activeTab === 'inventory' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
           <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden">
             <div className="flex items-center justify-between mb-8">
               <div>
                  <h2 className="text-2xl font-black text-gray-900">Gerenciar Materiais</h2>
                  <p className="text-sm text-gray-400">Cadastre aqui proteínas, bebidas e embalagens</p>
               </div>
               <div className="flex items-center gap-3">
                 <button 
                   onClick={() => setIsAddingNewMaterial(true)}
                   className="bg-white text-orange-600 border-2 border-orange-100 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-orange-50 transition-colors shadow-sm"
                 >
                   <Plus size={20} /> Novo Insumo
                 </button>
                 <button 
                  onClick={() => setIsAddingPurchase(true)}
                  className="bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-orange-100"
                 >
                   <ShoppingCart size={20} /> Registrar Compra
                 </button>
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventory.map(item => (
                  <div key={item.id} className="p-5 bg-gray-50 rounded-3xl border border-gray-100 group hover:border-orange-200 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] font-black uppercase text-orange-600 tracking-widest bg-orange-50 px-2 py-0.5 rounded-full">{(item as any).category || 'Material'}</span>
                       <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingMaterialId(item.id);
                              setNewMaterial({
                                name: item.name,
                                unit: item.unit,
                                category: (item as any).category || "Carne",
                                initial_cost: String(item.current_avg_cost || "")
                              });
                              setIsAddingNewMaterial(true);
                            }}
                            className="p-1.5 bg-white text-indigo-600 rounded-lg shadow-sm hover:bg-indigo-50"
                            title="Editar Material"
                          >
                             <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteMaterial(item.id)}
                            className="p-1.5 bg-white text-red-600 rounded-lg shadow-sm hover:bg-red-50"
                            title="Excluir Material"
                          >
                             <Trash2 size={14} />
                          </button>
                       </div>
                    </div>
                    <h3 className="text-lg font-black text-gray-800 mb-1">{item.name}</h3>
                    <p className="text-2xl font-black text-orange-600">
                      {formatCurrency(Number(item.current_avg_cost))} 
                      <small className="text-xs font-bold text-gray-400 ml-1">/{item.unit}</small>
                    </p>

                    {/* Histórico de Preços */}
                    {Array.isArray(item.price_history) && item.price_history.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-dashed border-gray-100">
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-2 flex items-center gap-1">
                          <Activity size={10} /> Histórico (Últimos 3)
                        </p>
                        <div className="flex gap-2">
                           {item.price_history.slice(0, 3).map((oldPrice, idx) => (
                             <div key={idx} className="bg-gray-100 px-2 py-1 rounded-lg text-[9px] font-black text-gray-500">
                               {formatCurrency(Number(oldPrice))}
                             </div>
                           ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
             </div>
           </div>
        </motion.div>
      )}

      {/* RECIPE EDITOR TAB (Ficha Técnica) */}
      {activeTab === 'recipe' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {/* Product List */}
             <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 h-fit">
                <h3 className="text-lg font-black text-gray-900 mb-4">Selecione o Produto</h3>
                <div className="space-y-2">
                  {products.filter(p => p.category === 'churrasco').map(prod => (
                    <button
                      key={prod.id}
                      onClick={() => {
                        setSelectedProductId(prod.id);
                        setIsEditingRecipe(true);
                      }}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl font-bold transition-all flex items-center justify-between",
                        selectedProductId === prod.id ? "bg-orange-600 text-white shadow-lg" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      {prod.name}
                      <span className="text-xs opacity-60">{formatCurrency(prod.price)}</span>
                    </button>
                  ))}
                </div>
             </div>

             {/* Ingredient Editor */}
             <div className="md:col-span-2 space-y-4">
               {selectedProductId ? (
                 <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 min-h-[400px]">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-2xl font-black text-gray-900">Ficha Técnica: {products.find(p => p.id === selectedProductId)?.name}</h2>
                        <p className="text-sm text-gray-400">Ajuste aqui as gramas e embalagens deste item</p>
                      </div>
                      <button 
                        onClick={() => setIsAddingIngredient(true)}
                        className="p-3 bg-orange-50 text-orange-600 rounded-2xl hover:bg-orange-600 hover:text-white transition-all flex items-center gap-2 font-bold"
                      >
                        <Plus size={20} /> Add Ingrediente
                      </button>
                    </div>

                    <div className="space-y-6">
                      {(() => {
                        const categoryOrder = ['Carne', 'Queijo', 'Hortifruti', 'Insumo', 'Embalagem'];
                        const availableCategories = Object.keys(groupedIngredients).sort((a, b) => {
                          const indexA = categoryOrder.indexOf(a);
                          const indexB = categoryOrder.indexOf(b);
                          if (indexA === -1 && indexB === -1) return a.localeCompare(b);
                          if (indexA === -1) return 1;
                          if (indexB === -1) return -1;
                          return indexA - indexB;
                        });

                        return availableCategories.map(cat => (
                          <div key={cat} className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-1 ml-1">{cat}</h4>
                            <div className="space-y-2">
                              {groupedIngredients[cat].map(ing => (
                                <div key={ing.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-600 font-black border border-gray-200">
                                       <Package size={20} />
                                    </div>
                                    <div>
                                       <p className="font-bold text-gray-800">{(ing as any).inventory_item?.name || 'Item'}</p>
                                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Custo: {formatCurrency(Number((ing as any).inventory_item?.current_avg_cost || 0))} / {(ing as any).inventory_item?.unit}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                     <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200">
                                       <input 
                                         type="number"
                                         step="0.001"
                                         value={editingIngValues[ing.id] ?? ing.quantity}
                                         aria-label={`Quantidade de ${(ing as any).inventory_item?.name}`}
                                         title="Ajustar quantidade na ficha técnica"
                                         onChange={(e) => handleUpdateIngredient(ing.id, e.target.value)}
                                         className="w-16 font-black text-gray-900 outline-none bg-transparent text-center"
                                       />
                                       <span className="text-xs font-bold text-gray-400">{(ing as any).inventory_item?.unit}</span>
                                     </div>
                                     <button 
                                      onClick={() => handleDeleteIngredient(ing.id)}
                                      aria-label="Remover item da ficha técnica"
                                      title="Remover ingrediente"
                                      className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                     >
                                        <Trash2 size={18} />
                                     </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>

                    <div className="mt-8 pt-8 border-t border-dashed border-gray-200 flex justify-between items-center">
                       <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Custo Total de Produção</span>
                       <span className="text-2xl font-black text-orange-600">{formatCurrency(productCosts[selectedProductId] || 0)}</span>
                    </div>
                 </div>
               ) : (
                 <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center">
                    <Layers size={64} className="text-gray-100 mb-4" />
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Selecione um produto para editar <br/> a ficha técnica</p>
                 </div>
               )}
             </div>
           </div>
        </motion.div>
      )}

      {/* SIMULATOR TAB */}
      {activeTab === 'simulator' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="space-y-6">
             <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
               <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                 <ShoppingCart size={24} className="text-orange-600" /> Vendas Simuladas
               </h2>
               <div className="space-y-6">
                 {products.filter(p => p.category === 'churrasco').map(prod => (
                    <div key={prod.id} className="space-y-4 p-4 rounded-3xl bg-gray-50/50 border border-gray-100">
                      <div className="flex items-center justify-between">
                         <div>
                            <p className="font-bold text-gray-800">{prod.name}</p>
                            <p className="text-xs text-gray-400">Custo: {formatCurrency(productCosts[prod.id] || 0)}</p>
                         </div>
                         <div className="flex items-center gap-4 bg-white p-1 rounded-2xl border border-gray-100">
                            <button 
                              onClick={() => setSimQuantities(prev => ({ ...prev, [prod.id]: Math.max(0, (prev[prod.id] || 0) - 1) }))}
                              className="w-10 h-10 bg-gray-50 rounded-xl font-black text-gray-500 hover:text-orange-600"
                            >-</button>
                            <input 
                              type="number" 
                              aria-label={`Quantidade de ${prod.name}`}
                              value={simQuantities[prod.id] || 0} 
                              onChange={(e) => setSimQuantities(prev => ({ ...prev, [prod.id]: parseInt(e.target.value) || 0 }))}
                              className="w-12 bg-transparent text-center font-black text-gray-900 outline-none"
                            />
                            <button 
                              onClick={() => setSimQuantities(prev => ({ ...prev, [prod.id]: (prev[prod.id] || 0) + 1 }))}
                              className="w-10 h-10 bg-gray-50 rounded-xl font-black text-gray-500 hover:text-orange-600"
                            >+</button>
                         </div>
                      </div>
                      
                      {/* PREÇO SUGERIDO CALC */}
                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">Preço Sugerido ({targetMargin}% lucro)</span>
                         <span className="text-sm font-black text-green-600">
                           {formatCurrency(((productCosts[prod.id] || 0) / (Math.max(0.01, 1 - (targetMargin / 100)))))}
                         </span>
                      </div>
                    </div>
                 ))}
               </div>
             </div>
           </div>

           <div className="space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                 <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                    <Percent size={20} className="text-orange-600" /> Meta de Rentabilidade
                 </h2>
                 <div className="space-y-4">
                    <input 
                      type="range"
                      min="10"
                      max="80"
                      step="5"
                      value={targetMargin}
                      aria-label="Ajustar meta de rentabilidade"
                      title="Deslize para alterar a margem de lucro desejada"
                      onChange={(e) => setTargetMargin(parseInt(e.target.value))}
                      className="w-full accent-orange-600"
                    />
                    <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-tighter">
                       <span>10% (Giro)</span>
                       <span className="text-orange-600 font-black">{targetMargin}% Margem Alvo</span>
                       <span>80% (Premium)</span>
                    </div>
                 </div>
              </div>

              <div className="bg-orange-600 p-10 rounded-[3rem] shadow-2xl text-white relative overflow-hidden">
                 <div className="relative z-10">
                   <p className="text-sm font-bold opacity-80 uppercase tracking-widest mb-2">Resumo da Simulação</p>
                   <div className="grid grid-cols-2 gap-8 mt-6">
                     <div>
                       <p className="text-xs opacity-60 font-black flex items-center gap-1 uppercase tracking-tighter"><TrendingDown size={14}/> Custo Produção</p>
                       <p className="text-2xl font-black">{formatCurrency(simulationTotals.totalCost)}</p>
                     </div>
                     <div>
                       <p className="text-xs opacity-60 font-black flex items-center gap-1 uppercase tracking-tighter"><TrendingUp size={14}/> Receita Total</p>
                       <p className="text-2xl font-black">{formatCurrency(simulationTotals.totalRevenue)}</p>
                     </div>
                   </div>
                   <div className="mt-10 pt-10 border-t border-white/20">
                     <p className="text-xs opacity-60 font-black uppercase tracking-tighter">Lucro Líquido Operacional</p>
                     <p className="text-6xl font-black tracking-tighter">{formatCurrency(simulationTotals.profit)}</p>
                     <p className="text-sm font-bold mt-2 opacity-80">ROI aproximado: {simulationTotals.totalCost > 0 ? ((simulationTotals.profit / simulationTotals.totalCost) * 100).toFixed(1) : 0}%</p>
                   </div>
                 </div>
                 <Activity size={200} className="absolute -bottom-10 -right-10 opacity-10 text-white" />
              </div>
           </div>
        </motion.div>
      )}

      {activeTab === 'reports' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Relatório Diário de Lucro</h2>
              <p className="text-gray-500">Selecione uma data para ver o desempenho real.</p>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100">
              <span className="text-sm font-bold text-gray-400 ml-2">DATA:</span>
              <input 
                type="date" 
                value={selectedReportDate}
                title="Escolher data do relatório"
                placeholder="Selecione uma data"
                onChange={(e) => setSelectedReportDate(e.target.value)}
                className="bg-white px-4 py-2 rounded-xl font-bold text-gray-700 outline-none border border-gray-100 shadow-sm focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-gray-400 text-sm font-bold uppercase mb-1">Faturamento</p>
              <h3 className="text-2xl font-black text-gray-900">{formatCurrency(reportData.revenue)}</h3>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-red-400 text-sm font-bold uppercase mb-1">CMV (Insumos)</p>
              <h3 className="text-2xl font-black text-red-600">-{formatCurrency(reportData.cmv)}</h3>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-orange-400 text-sm font-bold uppercase mb-1">Entrega (18%)</p>
              <h3 className="text-2xl font-black text-orange-600">-{formatCurrency(reportData.courierCosts)}</h3>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100">
              <p className="text-blue-400 text-sm font-bold uppercase mb-1">💳 Taxa MP</p>
              <h3 className="text-2xl font-black text-blue-600">-{formatCurrency(reportData.mpFees)}</h3>
              <p className="text-[10px] text-blue-300 font-bold mt-1">PIX {mpPixRate}% / Cartão {mpCardRate}%</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-purple-400 text-sm font-bold uppercase mb-1">Despesas Extras</p>
              <h3 className="text-2xl font-black text-purple-600">-{formatCurrency(reportData.expenses)}</h3>
            </div>
            <div className={cn(
              "p-6 rounded-3xl shadow-lg border-2 col-span-2 md:col-span-1",
              reportData.netProfit >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
            )}>
              <p className={cn("text-sm font-bold uppercase mb-1", reportData.netProfit >= 0 ? "text-green-600" : "text-red-600")}>
                Lucro Líquido Real
              </p>
              <h3 className={cn("text-3xl font-black", reportData.netProfit >= 0 ? "text-green-700" : "text-red-700")}>
                {formatCurrency(reportData.netProfit)}
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-black text-gray-900 flex items-center gap-2">
                <ShoppingCart size={20} className="text-orange-600" />
                Vendas do Dia ({reportData.orders.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-400 text-xs font-black uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Valor Pedido</th>
                    <th className="px-6 py-4">Insumos</th>
                    <th className="px-6 py-4">Entrega (18%)</th>
                    <th className="px-6 py-4">💳 Taxa MP</th>
                    <th className="px-6 py-4 text-right">Lucro Real</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reportData.orders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors transition-all duration-200 group">
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase",
                          o.status === 'delivered' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                        )}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-800">{o.customer_name}</p>
                        <p className="text-xs text-gray-400 font-medium">#{o.id}</p>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        {formatCurrency(o.total_price)}
                      </td>
                      <td className="px-6 py-4 font-bold text-red-500 text-sm">
                        -{formatCurrency(o.cmv)}
                      </td>
                      <td className="px-6 py-4 font-bold text-orange-500 text-sm">
                        -{formatCurrency(o.courierCost)}
                      </td>
                      <td className="px-6 py-4 font-bold text-blue-500 text-sm">
                        -{formatCurrency(o.mpFee || 0)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn(
                          "font-black text-lg",
                          o.profit >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {formatCurrency(o.profit)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {reportData.orders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-bold">
                        Nenhum pedido encontrado para esta data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* MODAL INGREDIENT (Ficha Técnica Add) */}
      <AnimatePresence>
        {isAddingIngredient && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl"
            >
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black text-gray-900">Novo Insumo</h3>
                  <button 
                    onClick={() => setIsAddingIngredient(false)} 
                    className="p-2 hover:bg-gray-100 rounded-full"
                    aria-label="Fechar"
                    title="Fechar modal"
                  >
                    <X />
                  </button>
               </div>
               <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Material</label>
                    <select 
                      value={newIngId}
                      onChange={(e) => setNewIngId(e.target.value)}
                      aria-label="Selecionar Insumo para Ficha Técnica"
                      title="Escolha um material do inventário"
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none"
                    >
                      <option value="">Escolha...</option>
                      {(() => {
                        const currentProduct = products.find(p => p.id === selectedProductId);
                        const existingIngIds = currentProduct?.ingredients.map(ing => ing.inventory_item_id) || [];
                        return inventory
                          .filter(inv => !existingIngIds.includes(inv.id))
                          .map(inv => (
                            <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>
                          ));
                      })()}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Quantidade (Gramas/Un)</label>
                    <input 
                      type="number"
                      value={newIngQty}
                      onChange={(e) => setNewIngQty(e.target.value)}
                      aria-label="Quantidade do ingrediente"
                      placeholder="Ex: 0,150 ou 1"
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none"
                    />
                  </div>
                  <button 
                    onClick={handleAddIngredient}
                    className="w-full py-5 bg-orange-600 text-white rounded-[2rem] font-black text-lg"
                  >
                    Adicionar na Receita
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL NEW MATERIAL (Cadastrar Novo Insumo) */}
      <AnimatePresence>
        {isAddingNewMaterial && (
          <div className="fixed inset-0 z-[125] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                  <Layers className="text-orange-600" /> {editingMaterialId ? "Editar Material" : "Novo Material"}
                </h3>
                <button 
                  onClick={() => setIsAddingNewMaterial(false)} 
                  className="p-2 hover:bg-gray-100 rounded-full"
                  aria-label="Fechar"
                >
                  <X />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Nome do Insumo</label>
                  <input 
                    type="text"
                    placeholder="Ex: Carne de Filé"
                    value={newMaterial.name}
                    onChange={(e) => setNewMaterial(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Unidade</label>
                    <select 
                      title="Selecione a unidade de medida"
                      value={newMaterial.unit}
                      onChange={(e) => setNewMaterial(p => ({ ...p, unit: e.target.value }))}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:border-orange-500"
                    >
                      <option value="Kg">Kg</option>
                      <option value="Gramas">Gramas</option>
                      <option value="Un">Unidade</option>
                      <option value="ML">ML</option>
                      <option value="L">Litro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Categoria</label>
                    <select 
                      title="Selecione a categoria do material"
                      value={newMaterial.category}
                      onChange={(e) => setNewMaterial(p => ({ ...p, category: e.target.value }))}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:border-orange-500"
                    >
                      <option value="Carne">Carne</option>
                      <option value="Queijo">Queijo</option>
                      <option value="Hortifruti">Hortifruti</option>
                      <option value="Bebida">Bebida</option>
                      <option value="Embalagem">Embalagem</option>
                      <option value="Insumo">Insumo Geral</option>
                      <option value="Acompanhamento">Acompanhamento</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Custo Médio Inicial (R$)</label>
                  <input 
                    type="number"
                    step="0.001"
                    placeholder="0.00"
                    value={newMaterial.initial_cost}
                    onChange={(e) => setNewMaterial(p => ({ ...p, initial_cost: e.target.value }))}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:border-orange-500"
                  />
                </div>

                <button 
                  onClick={handleCreateMaterial}
                  className="w-full py-5 bg-orange-600 text-white rounded-[2rem] font-black text-lg shadow-xl"
                >
                  {editingMaterialId ? "Salvar Alterações" : "Cadastrar Material"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL PURCHASE (Registrar Compra por Lote) */}
      <AnimatePresence>
        {isAddingPurchase && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                  <Package className="text-orange-600" /> Registrar Compra
                </h3>
                <button 
                  onClick={() => setIsAddingPurchase(false)} 
                  className="p-2 hover:bg-gray-100 rounded-full"
                  aria-label="Fechar modal de compra"
                  title="Fechar"
                >
                  <X />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Selecione o Material</label>
                  <select 
                    value={selectedInsumo}
                    aria-label="Selecionar material para registro de compra"
                    title="Escolha o material que você comprou"
                    onChange={(e) => setSelectedInsumo(e.target.value)}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:border-orange-500"
                  >
                    <option value="">Escolher material...</option>
                    {inventory.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Peso/Qtd Total</label>
                    <input 
                      type="number"
                      step="0.001"
                      placeholder="Ex: 10"
                      value={purchaseWeight}
                      aria-label="Quantidade ou peso total comprado"
                      onChange={(e) => setPurchaseWeight(e.target.value)}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Valor Pago (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      placeholder="Ex: 300.00"
                      value={purchasePrice}
                      aria-label="Valor total pago pela compra"
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {purchasePrice && purchaseWeight && (
                  <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 text-center">
                    <p className="text-xs font-bold text-orange-600 uppercase">Custo Unitário Calculado</p>
                    <p className="text-xl font-black text-orange-900">{formatCurrency(parseFloat(purchasePrice) / parseFloat(purchaseWeight))} por {inventory.find(i => i.id === selectedInsumo)?.unit}</p>
                  </div>
                )}

                <button 
                  onClick={handleUpdatePrice}
                  className="w-full py-5 bg-orange-600 text-white rounded-[2rem] font-black text-lg shadow-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                >
                  <Save size={20} /> Salvar novo preço de custo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL EXPENSE (Nova Despesa) */}
      <AnimatePresence>
        {isAddingExpense && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                  <TrendingDown className="text-red-500" /> Nova Despesa
                </h3>
                <button 
                  onClick={() => setIsAddingExpense(false)} 
                  className="p-2 hover:bg-gray-100 rounded-full"
                  aria-label="Fechar modal de despesa"
                >
                  <X />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Descrição</label>
                  <input 
                    type="text"
                    placeholder="Ex: Aluguel, Luz, Vale PATY..."
                    value={newExpense.description}
                    aria-label="Descrição da despesa"
                    onChange={(e) => setNewExpense(p => ({ ...p, description: e.target.value }))}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Valor (R$)</label>
                  <input 
                    type="number"
                    placeholder="50.00"
                    value={newExpense.amount}
                    aria-label="Valor da despesa"
                    onChange={(e) => setNewExpense(p => ({ ...p, amount: e.target.value }))}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Categoria</label>
                  <select 
                    value={newExpense.category}
                    aria-label="Categoria da despesa"
                    onChange={(e) => setNewExpense(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none focus:border-orange-500"
                  >
                    <option value="Avulsa">Avulsa (Um gasto extra)</option>
                    <option value="Fixo">Fixo (Aluguel, Luz...)</option>
                    <option value="Variável">Variável</option>
                    <option value="Vale">Vale funcionário</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <button 
                  onClick={handleAddExpense}
                  className="w-full py-5 bg-orange-600 text-white rounded-[2rem] font-black text-lg shadow-xl"
                >
                  Salvar Despesa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FinancePage;
