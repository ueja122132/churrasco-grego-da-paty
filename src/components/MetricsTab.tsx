import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  Clock 
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";

interface MetricsTabProps {
  orgId?: string;
}

export const MetricsTab: React.FC<MetricsTabProps> = ({ orgId }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    fetch(`/api/${orgId}/orders`)
      .then(r => r.json())
      .then(data => { 
        setOrders(Array.isArray(data) ? data : []); 
        setLoading(false); 
      })
      .catch(() => setLoading(false));
  }, [orgId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // --- Compute Metrics ---
  const delivered = orders.filter(o => o.status === 'delivered' && o.payment_status === 'paid');
  const cancelled = orders.filter(o => o.status === 'cancelled');
  const totalRevenue = delivered.reduce((s, o) => s + (o.total_price || 0), 0);
  const avgTicket = delivered.length > 0 ? totalRevenue / delivered.length : 0;
  const cancelRate = orders.length > 0 ? (cancelled.length / orders.length) * 100 : 0;

  // Revenue by day (last 30 days)
  const revenueByDay: Record<string, number> = {};
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    revenueByDay[key] = 0;
  }
  delivered.forEach(o => {
    const d = new Date(o.created_at);
    const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    if (key in revenueByDay) revenueByDay[key] += o.total_price || 0;
  });
  const revenueData = Object.entries(revenueByDay).map(([date, value]) => ({ 
    date, 
    value: Number(value.toFixed(2)) 
  }));

  // Top products
  const productCount: Record<string, { name: string, count: number, revenue: number }> = {};
  delivered.forEach(o => {
    (o.items || []).forEach((item: any) => {
      const name = item.name || 'Produto';
      if (!productCount[name]) productCount[name] = { name, count: 0, revenue: 0 };
      productCount[name].count++;
      productCount[name].revenue += item.basePrice || 0;
    });
  });
  const topProducts = Object.values(productCount).sort((a, b) => b.count - a.count).slice(0, 5);

  // Peak hours
  const hourCount: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourCount[h] = 0;
  orders.forEach(o => {
    const h = new Date(o.created_at).getHours();
    hourCount[h] = (hourCount[h] || 0) + 1;
  });
  const peakData = Object.entries(hourCount)
    .filter(([h]) => Number(h) >= 6)
    .map(([hour, count]) => ({ hour: `${hour}h`, count }));

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Receita Total', value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: '💰', color: 'from-emerald-500 to-teal-600' },
          { label: 'Ticket Médio', value: `R$ ${avgTicket.toFixed(2)}`, icon: '🎟️', color: 'from-blue-500 to-indigo-600' },
          { label: 'Pedidos Entregues', value: delivered.length, icon: '✅', color: 'from-orange-500 to-red-600' },
          { label: 'Taxa Cancelamento', value: `${cancelRate.toFixed(1)}%`, icon: '❌', color: 'from-slate-500 to-slate-700' },
        ].map(card => (
          <div key={card.label} className={`bg-gradient-to-br ${card.color} rounded-3xl p-5 text-white shadow-lg`}>
            <div className="text-2xl mb-1">{card.icon}</div>
            <div className="text-2xl font-black">{card.value}</div>
            <div className="text-xs font-bold opacity-80 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Revenue by Day */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-lg">
        <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-emerald-500" /> Receita por Dia (últimos 30 dias)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${v}`} />
            <Tooltip formatter={(v: any) => [`R$ ${Number(v).toFixed(2)}`, 'Receita']} />
            <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-lg">
          <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-orange-500" /> Top 5 Produtos
          </h3>
          {topProducts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Sem dados ainda</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                <Tooltip formatter={(v: any) => [v, 'Vendas']} />
                <Bar dataKey="count" fill="#ea580c" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Peak Hours */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-lg">
          <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-blue-500" /> Horário de Pico
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={peakData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => [v, 'Pedidos']} />
              <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
