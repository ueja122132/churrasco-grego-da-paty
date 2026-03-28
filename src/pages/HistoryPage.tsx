import React, { useState, useEffect } from 'react';
import { 
  History as HistoryIcon, 
  MapPin, 
  Clock, 
  Zap, 
  ChevronRight, 
  TrendingUp,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { cn, getTimeAgo } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

export const HistoryPage = () => {
  const { user } = useAuth();
  const { org } = useTenant();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !org) return;
    fetch(`/api/${org.id}/customer/${user.phone}/orders`)
      .then(r => r.json())
      .then(data => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, org]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending': return { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' };
      case 'preparing': return { label: 'Preparando', color: 'bg-blue-100 text-blue-700', icon: '👨‍🍳' };
      case 'ready': return { label: 'Pronto', color: 'bg-indigo-100 text-indigo-700', icon: '✅' };
      case 'shipped': return { label: 'Em Rota', color: 'bg-orange-100 text-orange-700', icon: '🛵' };
      case 'delivered': return { label: 'Entregue', color: 'bg-emerald-100 text-emerald-700', icon: '📦' };
      default: return { label: status, color: 'bg-gray-100 text-gray-700', icon: '•' };
    }
  };

  const totalSpent = orders.reduce((s, o) => s + (o.total_price || 0), 0);
  const totalPoints = orders.length * 10;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="pb-24 max-w-2xl mx-auto p-4 md:pt-8">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3 italic">
          <HistoryIcon className="text-orange-600" size={32} />
          MEUS PEDIDOS
        </h1>
        <p className="text-gray-400 mt-1 font-bold">Histórico de compras em {org?.name}</p>
      </header>

      {/* Profile Overview */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100">
          <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Pontos Fidelidade</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black">{totalPoints}</span>
            <Star size={18} fill="currentColor" className="text-yellow-400" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Total Gasto</p>
          <p className="text-2xl font-black text-emerald-600">R$ {totalSpent.toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-4">
        {orders.map((order, idx) => {
          const status = getStatusInfo(order.status);
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={order.id}
              className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-black text-gray-400">#{order.id.toString().slice(-4)}</span>
                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase", status.color)}>
                      {status.icon} {status.label}
                    </span>
                  </div>
                  <p className="text-gray-400 text-[10px] font-bold uppercase">{getTimeAgo(order.created_at)}</p>
                </div>
                <p className="text-xl font-black text-gray-900">R$ {order.total_price.toFixed(2)}</p>
              </div>

              <div className="space-y-1 relative z-10">
                {order.items.map((item: any, i: number) => (
                  <p key={i} className="text-xs text-gray-600 flex items-center gap-2">
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    {item.name}
                  </p>
                ))}
              </div>

              {order.status === 'shipped' && (
                <Link 
                  to={`/track/${order.courier_id || 'active'}`}
                  className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-orange-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all"
                >
                  <MapPin size={16} /> Rastrear Entrega <ChevronRight size={16} />
                </Link>
              )}
            </motion.div>
          );
        })}

        {orders.length === 0 && (
          <div className="py-20 text-center opacity-40">
            <div className="text-6xl mb-4">😿</div>
            <p className="font-black uppercase tracking-widest">Nenhum pedido ainda</p>
            <Link to="/" className="text-orange-600 text-sm font-bold mt-2 inline-block">Fazer meu primeiro pedido →</Link>
          </div>
        )}
      </div>
    </div>
  );
};
