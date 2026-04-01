import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  Clock, 
  DollarSign, 
  Eye, 
  EyeOff, 
  Wallet, 
  AlertCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Zap
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { cn } from "../lib/utils";

interface MetricsTabProps {
  orgId?: string;
  adminId?: string; // New prop for authentication
}

export const MetricsTab: React.FC<MetricsTabProps> = ({ orgId, adminId }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(false);
  const [period, setPeriod] = useState<'today' | 'month' | 'all'>('today');

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    
    const fetchAll = async () => {
      try {
        const headers: any = { 'Content-Type': 'application/json' };
        if (adminId) headers['x-admin-id'] = adminId;

        const [ordRes, expRes, invRes, prodRes] = await Promise.all([
          fetch(`/api/${orgId}/orders`, { headers }).then(r => r.json()),
          fetch(`/api/${orgId}/expenses`, { headers }).then(r => r.json()),
          fetch(`/api/${orgId}/inventory`, { headers }).then(r => r.json()), 
          fetch(`/api/${orgId}/products`, { headers }).then(r => r.json())
        ]);

        setOrders(Array.isArray(ordRes) ? ordRes : []);
        setExpenses(Array.isArray(expRes) ? expRes : []);
        setInventory(Array.isArray(invRes) ? invRes : []);
        setProducts(Array.isArray(prodRes) ? prodRes : []);
      } catch (err) {
        console.error("Erro ao carregar métricas:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [orgId, adminId]);

  // --- Calculations ---

  const productCosts = useMemo(() => {
    const costs: Record<string, number> = {};
    products.forEach(p => {
      let cost = 0;
      (p.product_ingredients || []).forEach((pi: any) => {
        const item = inventory.find(i => i.id === (pi.inventory_item_id || pi.inventory_item?.id));
        if (item) cost += pi.quantity * (item.current_avg_cost || 0);
      });
      costs[p.id] = cost;
    });
    return costs;
  }, [products, inventory]);

  const filteredData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const checkPeriod = (dateStr: string) => {
      const d = new Date(dateStr).getTime();
      if (period === 'today') return d >= startOfToday;
      if (period === 'month') return d >= now.getTime() - (30 * 24 * 60 * 60 * 1000); 
      return true;
    };

    const fOrders = orders.filter(o => o.status !== 'cancelled' && checkPeriod(o.created_at));
    const fExpenses = expenses.filter(e => checkPeriod(e.date || e.created_at));

    const revenue = fOrders.reduce((acc, o) => acc + (o.total_price || 0), 0);
    const cmv = fOrders.reduce((acc, o) => {
      return acc + (o.items?.reduce((sc: number, item: any) => sc + (productCosts[item.id] || 0), 0) || 0);
    }, 0);

    const courierCosts = fOrders.reduce((acc, o) => {
      if (o.courier_id) {
        const orderCmv = o.items?.reduce((sc: number, item: any) => sc + (productCosts[item.id] || 0), 0) || 0;
        const gross = Math.max(0, (o.total_price || 0) - orderCmv);
        return acc + (gross * 0.18);
      }
      return acc;
    }, 0);

    const mpFees = fOrders.reduce((acc, o) => {
      const method = (o.payment_method || '').toLowerCase();
      const isPix = method.includes('pix') || o.payment_status === 'paid_pix';
      const isCard = method.includes('card') || o.payment_status === 'paid_card';
      if (!isPix && !isCard) return acc;
      const rate = isPix ? 0.49 : 3.49;
      return acc + ((o.total_price || 0) * (rate / 100));
    }, 0);

    const filteredExpenses = fExpenses.filter(e => 
      e.category !== 'Comissão (Resgate)' && 
      e.category !== 'Adiantamento'
    );
    const totalExpensesValue = filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    const mpOutflows = fExpenses
      .filter(e => (e.payment_method || '').toLowerCase() === 'mercadopago')
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    const estimatedBalance = fOrders.reduce((acc, o) => {
      const method = (o.payment_method || '').toLowerCase();
      const isPix = method.includes('pix') || o.payment_status === 'paid_pix';
      const isCard = method.includes('card') || o.payment_status === 'paid_card';
      if (isPix || isCard) return acc + (o.total_price || 0);
      return acc;
    }, 0) - mpOutflows - mpFees;

    const netProfit = revenue - cmv - courierCosts - mpFees - totalExpensesValue;

    return {
      revenue,
      expenses: totalExpensesValue,
      netProfit,
      cmv,
      mpFees,
      courierCosts,
      estimatedBalance,
      ordersCount: fOrders.length,
      ticket: fOrders.length > 0 ? revenue / fOrders.length : 0
    };
  }, [orders, expenses, period, productCosts]);

  // Chart Data (Last 30 days)
  const chartData = useMemo(() => {
    const days: Record<string, { date: string, revenue: number, profit: number }> = {};
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      days[key] = { date: key, revenue: 0, profit: 0 };
    }

    orders.filter(o => o.status !== 'cancelled').forEach(o => {
      const d = new Date(o.created_at);
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (key in days) {
        days[key].revenue += o.total_price || 0;
        const orderCmv = o.items?.reduce((sc: number, item: any) => sc + (productCosts[item.id] || 0), 0) || 0;
        const gross = (o.total_price || 0) - orderCmv;
        const fees = o.courier_id ? (gross * 0.18) : 0;
        days[key].profit += (gross - fees);
      }
    });

    return Object.values(days);
  }, [orders, productCosts]);

  // Top products
  const topProductsSorted = useMemo(() => {
    const counts: Record<string, { name: string, count: number }> = {};
    orders.filter(o => o.status === 'delivered').forEach(o => {
      (o.items || []).forEach((item: any) => {
        const id = item.id || item.product_id;
        if (!id) return;
        if (!counts[id]) counts[id] = { name: item.name, count: 0 };
        counts[id].count++;
      });
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [orders]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 font-bold animate-pulse text-center">Paty está calculando o lucro real...<br/><span className="text-[10px] opacity-70">Aguarde um instante</span></p>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header with Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800">Visão Geral da Loja</h2>
          <p className="text-gray-500 text-sm font-medium">Controle financeiro e operacional em tempo real.</p>
        </div>
        <div className="bg-gray-100 p-1.5 rounded-2xl flex gap-1 shadow-inner">
          {[
            { id: 'today', label: 'Hoje' },
            { id: 'month', label: '30 Dias' },
            { id: 'all', label: 'Tudo' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id as any)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black transition-all",
                period === p.id ? "bg-white text-orange-600 shadow-md transform scale-[1.02]" : "text-gray-500 hover:text-gray-800"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Real Profit Card */}
        <div className={cn(
          "p-6 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group transition-all",
          filteredData.netProfit >= 0 ? "bg-gradient-to-br from-gray-900 to-black" : "bg-gradient-to-br from-red-900 to-black"
        )}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-700">
            <Zap size={80} />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <span className="bg-white/10 text-white/80 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">Lucro Líquido Real</span>
              <BarChart3 className={cn("animate-pulse", filteredData.netProfit >= 0 ? "text-green-500" : "text-red-500")} size={18} />
            </div>
            <div className="text-4xl font-black flex items-baseline gap-1">
              <span className="text-base font-bold text-gray-400">R$</span>
              {filteredData.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-gray-400">
              {filteredData.netProfit >= 0 ? (
                <ArrowUpRight className="text-green-500" size={16} />
              ) : (
                <ArrowDownRight className="text-red-500" size={16} />
              )}
              <span>Saldo final descontado</span>
            </div>
          </div>
        </div>

        {/* Revenue Card */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-100/50">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
              <TrendingUp size={24} />
            </div>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">RECEITA BRUTA</span>
          </div>
          <div className="text-3xl font-black text-gray-800">
            <span className="text-sm font-bold text-gray-400 mr-1">R$</span>
            {filteredData.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs font-medium text-gray-400 mt-2">{filteredData.ordersCount} pedidos finalizados</p>
        </div>

        {/* Expenses Card */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-100/50">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-50 rounded-2xl text-red-600">
              <ArrowDownRight size={24} />
            </div>
            <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-lg">DESPESAS + TAXAS</span>
          </div>
          <div className="text-3xl font-black text-gray-800">
            <span className="text-sm font-bold text-gray-400 mr-1">R$</span>
            {(filteredData.expenses + filteredData.mpFees + filteredData.courierCosts).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs font-medium text-gray-400 mt-2">CMV estimado: R$ {filteredData.cmv.toFixed(2)}</p>
        </div>

        {/* MP Balance Card */}
        <div className="bg-blue-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-blue-200 relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Wallet size={24} />
            </div>
            <button 
              onClick={() => setShowBalance(!showBalance)}
              className="p-4 -m-4 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
              title={showBalance ? "Ocultar Saldo" : "Mostrar Saldo"}
            >
              {showBalance ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          
          <div className="animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="text-3xl font-black">
              <span className="text-sm font-bold text-blue-200 mr-1">R$</span>
              {showBalance 
                ? filteredData.estimatedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : '******'}
            </div>
            <div className="mt-2 text-[10px] font-black uppercase tracking-wider text-blue-100 flex flex-col gap-0.5 opacity-80">
              <p>Faturamento Pix/Card no período</p>
              <p className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded-md w-fit">Descontando saídas MP registradas</p>
            </div>
            <a 
              href="https://www.mercadopago.com.br/activities" 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-[10px] font-black uppercase transition-colors"
            >
              Abrir Mercado Pago <ArrowUpRight size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-100/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h3 className="font-black text-gray-800 flex items-center gap-2">
              <TrendingUp size={20} className="text-orange-500" /> Fluxo Financeiro (30 dias)
            </h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500" /> VENDA
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> LUCRO BRUTO
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                formatter={(v: any) => [`R$ ${v.toFixed(2)}`]}
              />
              <Area type="monotone" dataKey="revenue" name="Venda" stroke="#f97316" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
              <Area type="monotone" dataKey="profit" name="Lucro Bruto" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorProfit)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-6">
          {/* Top Products */}
          <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-100/50">
            <h3 className="font-black text-gray-800 mb-6 flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-500" /> Mais Vendidos
            </h3>
            <div className="space-y-3">
              {topProductsSorted.map((p, idx) => (
                <div key={p.name} className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "w-9 h-9 flex items-center justify-center rounded-xl font-black text-xs",
                      idx === 0 ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-400"
                    )}>{idx + 1}</span>
                    <span className="font-bold text-gray-700 text-sm">{p.name}</span>
                  </div>
                  <span className="font-black text-gray-800 text-sm">{p.count} <span className="text-[10px] text-gray-400 uppercase">pedidos</span></span>
                </div>
              ))}
              {topProductsSorted.length === 0 && (
                <p className="text-center text-gray-400 text-xs py-12 font-medium">Nenhuma venda entregue ainda.</p>
              )}
            </div>
          </div>

          <div className="bg-orange-600 p-8 rounded-[3rem] text-white overflow-hidden relative group shadow-xl shadow-orange-100">
             <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:rotate-12 transition-transform duration-500">
               <TrendingUp size={120} />
             </div>
             <h4 className="font-black uppercase tracking-widest text-[10px] mb-2 text-orange-200">Ticket Médio</h4>
             <div className="text-3xl font-black flex items-baseline gap-1">
               <span className="text-sm font-bold text-orange-200">R$</span>
               {filteredData.ticket.toFixed(2)}
             </div>
             <p className="text-xs font-bold text-orange-100 mt-3 opacity-80 leading-relaxed italic">Baseado em {filteredData.ordersCount} faturamentos no período selecionado.</p>
          </div>
        </div>
      </div>

      {/* Operational Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl">
           <h3 className="font-black text-gray-800 mb-6 flex items-center gap-2">
             <Clock size={20} className="text-indigo-500" /> Pedidos por Hora
           </h3>
           <ResponsiveContainer width="100%" height={220}>
              <BarChart data={Object.entries(orders.reduce((acc: any, o) => {
                const h = new Date(o.created_at).getHours();
                acc[h] = (acc[h] || 0) + 1;
                return acc;
              }, {})).map(([h, c]) => ({ hour: `${h}h`, count: c }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fontWeight: 'black', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fontWeight: 'black', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" name="Pedidos" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
           </ResponsiveContainer>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl flex flex-col justify-center gap-6">
           <div className="flex items-center gap-4">
             <div className="p-4 bg-orange-50 text-orange-600 rounded-[1.5rem]">
               <Calendar size={28} />
             </div>
             <div>
               <h4 className="font-black text-gray-800 text-lg">Fechamento Consolidado</h4>
               <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Controle de Margem por Período</p>
             </div>
           </div>
           
           <div className="grid grid-cols-2 gap-6">
              <div className="p-5 bg-gray-50/50 rounded-3xl border border-gray-100 hover:border-orange-200 transition-colors">
                <span className="text-[10px] font-black text-gray-400 block mb-1 uppercase tracking-widest">MARGEM LÍQUIDA</span>
                <span className={cn(
                  "text-2xl font-black",
                  filteredData.netProfit >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {filteredData.revenue > 0 ? ((filteredData.netProfit / filteredData.revenue) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="p-5 bg-gray-50/50 rounded-3xl border border-gray-100 hover:border-blue-200 transition-colors">
                <span className="text-[10px] font-black text-gray-400 block mb-1 uppercase tracking-widest">TAXAS MP</span>
                <span className="text-2xl font-black text-gray-800">
                  <span className="text-xs font-bold text-gray-400 mr-0.5">R$</span>
                  {filteredData.mpFees.toFixed(2)}
                </span>
              </div>
           </div>
           
           <div className="p-5 bg-gray-900 rounded-[2rem] text-white flex justify-between items-center group cursor-help">
             <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Custos de Insumos (CMV)</p>
                <div className="text-xl font-black text-orange-400">
                  <span className="text-xs font-bold mr-1">R$</span>
                  {filteredData.cmv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
             </div>
             <Zap size={20} className="text-gray-600 group-hover:text-white transition-colors" />
           </div>
        </div>
      </div>
    </div>
  );
};
