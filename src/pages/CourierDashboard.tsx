import React, { useState, useEffect } from 'react';
import { 
  Navigation, 
  Package, 
  CheckCircle2, 
  MapPin, 
  Activity, 
  LogOut, 
  DollarSign,
  Clock,
  Truck,
  QrCode,
  X,
  CreditCard,
  Banknote,
  Phone,
  User,
  ArrowLeft
} from 'lucide-react';
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useTenant } from "../context/TenantContext";
import { socket, supabase } from "../supabase";
import { cn, getTimeAgo } from "../lib/utils";
import { Order } from "../types";

interface CourierDashboardProps {
  user: any;
  notify: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onLogout: () => void;
}

export const CourierDashboard: React.FC<CourierDashboardProps> = ({ user, notify, onLogout }) => {
  const { org } = useTenant();
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [stats, setStats] = useState({ total_deliveries: 0, net_pay: 0 });
  const [loading, setLoading] = useState(true);
  
  const [showQrModal, setShowQrModal] = useState<any>(null);
  const [pixData, setPixData] = useState<any>(null);
  const [pixLoading, setPixLoading] = useState(false);
  
  const watchId = React.useRef<number | null>(null);
  const [amountReceived, setAmountReceived] = useState<string>('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user.id]);

  // Real-time connection to Org Room for Deliveries
  useEffect(() => {
    if (!org?.id) return;
    if (!socket.connected) socket.connect();
    socket.emit("join:org", org.id);

    // Refresh when something changes related to orders
    const handleUpdate = () => fetchData();
    
    socket.on("order:status_update", handleUpdate);
    socket.on("order:new", handleUpdate);
    socket.on("order:payment_update", handleUpdate);

    return () => {
      socket.off("order:status_update", handleUpdate);
      socket.off("order:new", handleUpdate);
      socket.off("order:payment_update", handleUpdate);
    };
  }, [org?.id]);

  const fetchData = async () => {
    try {
      const [ordersRes, statsRes] = await Promise.all([
        fetch(`/api/courier/${user.id}/orders`),
        fetch(`/api/courier/${user.id}/stats`)
      ]);
      if (ordersRes.ok) setAllOrders(await ordersRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleOnline = () => {
    if (!isOnline) {
      if (!navigator.geolocation) {
        notify("GPS não suportado neste navegador", "error");
        return;
      }
      setIsOnline(true);
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(coords);
          socket.emit('courier:location:update', {
            courierId: user.id,
            courierName: user.user_metadata?.name || 'Entregador',
            latitude: coords.lat,
            longitude: coords.lng
          });
        },
        (err) => notify("Erro ao obter GPS: " + err.message, "error"),
        { enableHighAccuracy: true }
      );
    } else {
      setIsOnline(false);
      socket.emit('courier:location:stopped', { courierId: user.id });
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    }
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        notify("Pedido atualizado!", "success");
        fetchData();
      }
    } catch (err) {
      notify("Erro ao atualizar pedido", "error");
    }
  };

  const generatePixAndShow = async (order: any) => {
    setShowQrModal(order);
    setPixLoading(true);
    try {
      const res = await fetch(`/api/${org?.id}/pix/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total_price: order.total_price,
          order_id: order.id,
          description: `Pedido #${order.id} (Entregador)`
        })
      });
      const data = await res.json();
      if (data.qr_code) setPixData(data);
    } catch (err) {
      notify("Erro ao gerar PIX", "error");
    } finally {
      setPixLoading(false);
    }
  };

  const confirmPaidManually = async (order: any) => {
    await fetch(`/api/orders/${order.id}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_status: 'paid' })
    });
    await updateOrderStatus(order.id, 'delivered');
    setShowQrModal(null);
    setAmountReceived('');
  };

  useEffect(() => {
    if (!showQrModal || showQrModal.payment_status === 'paid') return;
    const interval = setInterval(() => {
      fetch(`/api/orders/${showQrModal.id}/check-payment`)
        .then(res => res.json())
        .then(async data => {
          if (data.payment_status === 'paid') {
            notify("Pagamento Recebido!", "success");
            await updateOrderStatus(showQrModal.id, 'delivered');
            setShowQrModal(null);
            clearInterval(interval);
          }
        })
        .catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, [showQrModal]);

  const pendingOrders = allOrders.filter(o => o.status === 'ready' || o.status === 'shipped' || o.status === 'preparing' || o.status === 'pending');
  const completedOrders = allOrders.filter(o => o.status === 'delivered' || o.status === 'cancelled');

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 pb-24 relative overflow-hidden">
      {/* Mesh Gradient Backgrounds */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-orange-600/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-8 pt-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-orange-500/30 p-[2px]">
              <div className="w-full h-full bg-[#020617] rounded-[1.125rem] flex items-center justify-center">
                 <Truck size={28} className="text-orange-500" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">ENTREGADOR PRO</h1>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{user?.name || 'Motorista Parceiro'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(user?.role === 'admin' || user?.role === 'super_admin') && (
              <Link to="/admin" aria-label="Voltar ao Painel" className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all group">
                <ArrowLeft size={20} className="text-slate-500 group-hover:text-white transition-colors" />
              </Link>
            )}
            <button onClick={onLogout} aria-label="Sair" className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/20 transition-all group">
              <LogOut size={20} className="text-slate-500 group-hover:text-red-500 transition-colors" />
            </button>
          </div>
        </header>

        {/* Online Toggle Card */}
        <motion.div 
          layout
          className={cn(
            "mb-8 p-1 rounded-[2.8rem] transition-all duration-700 shadow-2xl",
            isOnline ? "bg-emerald-500" : "bg-white/10"
          )}
        >
          <div className="bg-[#0f172a] rounded-[2.7rem] p-6 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                  isOnline ? "bg-emerald-500/20 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "bg-white/5 text-slate-500"
                )}>
                  {isOnline ? <Activity size={28} /> : <Clock size={28} />}
                </div>
                {isOnline && <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#0f172a] rounded-full animate-ping" />}
              </div>
              <div>
                <p className="font-black text-xl tracking-tight leading-tight">{isOnline ? 'ESTOU ONLINE' : 'ESTOU OFFLINE'}</p>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{isOnline ? 'Buscando entregas...' : 'Fique online para faturar'}</p>
              </div>
            </div>
            
            <button 
              onClick={toggleOnline}
              aria-label={isOnline ? "Ficar Offline" : "Ficar Online"}
              className={cn(
                "w-16 h-10 rounded-full p-1 transition-all duration-500 relative shadow-inner cursor-pointer",
                isOnline ? "bg-emerald-500" : "bg-slate-800"
              )}
            >
              <div className={cn(
                "w-8 h-8 bg-white rounded-full transition-all duration-500 shadow-xl flex items-center justify-center",
                isOnline ? "translate-x-6" : "translate-x-0"
              )}>
                 <div className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-emerald-500" : "bg-slate-300")} />
              </div>
            </button>
          </div>
        </motion.div>

        {/* Wallet Summary */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-[2.2rem] border border-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-600/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-600/10 transition-colors" />
            <Package size={20} className="text-orange-500 mb-4" />
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Total Entregas</p>
            <p className="text-3xl font-black italic">{stats.total_deliveries}</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-[2.2rem] border border-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-600/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-emerald-600/10 transition-colors" />
            <DollarSign size={20} className="text-emerald-500 mb-4" />
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Ganhos (Mês)</p>
            <div className="flex items-baseline gap-1">
               <span className="text-xs font-black text-emerald-500">R$</span>
               <p className={cn("text-3xl font-black italic", stats.net_pay < 0 ? "text-red-400" : "text-emerald-400")}>
                 {stats.net_pay.toFixed(2)}
               </p>
            </div>
          </div>
        </div>

        {/* Tab System */}
        <div className="flex bg-white/5 p-1 rounded-2xl mb-8 border border-white/5">
           <button 
             onClick={() => setActiveTab('pending')}
             className={cn(
               "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
               activeTab === 'pending' ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-500 hover:text-slate-300"
             )}
           >
             Em Rota ({pendingOrders.length})
           </button>
           <button 
             onClick={() => setActiveTab('completed')}
             className={cn(
               "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
               activeTab === 'completed' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-slate-300"
             )}
           >
             Concluídas ({completedOrders.length})
           </button>
        </div>

        <div className="flex items-center justify-between mb-6 px-2">
           <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
             {activeTab === 'pending' ? 'Pedidos Ativos' : 'Histórico Recent'}
           </h2>
           <div className="h-[1px] flex-1 bg-white/5 mx-4" />
           <div className={cn(
             "text-[10px] font-black px-2 py-0.5 rounded-md",
             activeTab === 'pending' ? "bg-orange-500/10 text-orange-500" : "bg-emerald-500/10 text-emerald-500"
           )}>
             {activeTab === 'pending' ? pendingOrders.length : completedOrders.length}
           </div>
        </div>
        
        <div className="space-y-5">
          <AnimatePresence mode="popLayout">
            {(activeTab === 'pending' ? pendingOrders : completedOrders).map(order => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.9 }}
                key={order.id} 
                className="bg-white/5 backdrop-blur-xl rounded-[2.2rem] border border-white/10 overflow-hidden relative group"
              >
                <div className={cn(
                  "absolute top-0 left-0 w-1.5 h-full opacity-50",
                  order.status === 'delivered' ? "bg-emerald-500" : "bg-gradient-to-b from-orange-500 to-red-600"
                )} />
                
                <div className="p-7">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("w-1.5 h-1.5 rounded-full", order.status === 'delivered' ? "bg-emerald-500" : "bg-orange-500")} />
                        <p className={cn("text-[10px] font-black uppercase tracking-widest", order.status === 'delivered' ? "text-emerald-500" : "text-orange-500")}>
                           {order.status === 'delivered' ? 'ENTREGA CONCLUÍDA' : 'PEDIDO INTERNO'}
                        </p>
                      </div>
                      <p className="text-2xl font-black italic tracking-tighter">ORD-{order.id.toString().padStart(4, '0')}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                         <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-widest">
                            {order.status === 'delivered' ? 'RECEBIDO: ' : 'VOCÊ GANHA: '} R$ {parseFloat(order.delivery_fee || 0).toFixed(2)}
                         </span>
                         {order.cash_change_requested && (
                           <span className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded uppercase tracking-widest border border-orange-500/20">
                             Troco p/ R$ {order.cash_change_requested.toFixed(2)}
                           </span>
                         )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <div className={cn(
                         "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest",
                         order.status === 'shipped' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : 
                         order.status === 'delivered' ? "bg-emerald-500/10 text-emerald-500" :
                         "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                       )}>
                         {order.status === 'delivered' ? 'Entregue' : order.status === 'shipped' ? 'Em Rota' : 'Pendente'}
                       </div>
                       <div className={cn(
                         "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tighter",
                         order.payment_status === 'paid' ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                       )}>
                         {order.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                       </div>
                    </div>
                  </div>

                  {/* Customer Info Card */}
                  <div className="space-y-3 mb-8">
                    <div className="bg-white/5 rounded-2xl p-5 border border-white/5 flex items-start gap-4">
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
                         {order.customer_profile?.avatar_url ? (
                           <img src={order.customer_profile.avatar_url} alt={order.customer_name} className="w-full h-full object-cover" />
                         ) : (
                           <User size={24} className="text-blue-500" />
                         )}
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Cliente</p>
                        <p className="text-sm font-bold text-slate-200 leading-tight">{order.customer_name}</p>
                        {order.status !== 'delivered' && (
                          <a 
                            href={`https://wa.me/55${order.customer_phone?.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest mt-2 hover:bg-emerald-500/20 transition-colors"
                          >
                             <Phone size={10} /> WhatsApp
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-2xl p-5 border border-white/5 flex items-start gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                         <MapPin size={20} className="text-slate-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Local da Entrega</p>
                        <p className="text-sm font-bold text-slate-200 leading-tight">{order.address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex gap-4">
                      {order.status === 'ready' && (
                        <button 
                          onClick={() => updateOrderStatus(order.id, 'shipped')}
                          className="flex-1 py-5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                          Confirmar Retirada
                        </button>
                      )}

                      {order.status === 'shipped' && (
                        <>
                          {order.payment_status === 'paid' ? (
                            <button 
                              onClick={() => updateOrderStatus(order.id, 'delivered')}
                              className="flex-1 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                              <CheckCircle2 size={20} /> Finalizar Entrega
                            </button>
                          ) : (
                            <button 
                              onClick={() => generatePixAndShow(order)}
                              className="flex-1 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                              <QrCode size={20} /> Cobrar Pedido
                            </button>
                          )}
                        </>
                      )}
                      
                      <a 
                        href={order.latitude && order.longitude 
                          ? `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}` 
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address || "")}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all shadow-lg"
                        title="Abrir no GPS"
                      >
                         <Navigation size={24} className="text-blue-500" />
                      </a>
                    </div>

                    {/* Só mostra cancelar se não estiver entregue nem cancelado */}
                    {!['delivered', 'cancelled'].includes(order.status) && (
                      <button 
                        onClick={() => {
                          if (window.confirm("CONFIRMAR CANCELAMENTO: Este pedido foi recusado ou é um erro?")) {
                            updateOrderStatus(order.id, 'cancelled');
                          }
                        }}
                        className="w-full py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-500/20 transition-all"
                      >
                        Recusado / Cancelar Pedido ❌
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {(activeTab === 'pending' ? pendingOrders : completedOrders).length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="py-24 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10"
            >
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-orange-600/20 blur-2xl rounded-full" />
                <div className="relative w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-5xl">
                   {activeTab === 'pending' ? '😴' : '📦'}
                </div>
              </div>
              <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-xs">
                {activeTab === 'pending' ? 'Buscando novos pedidos' : 'Nenhuma entrega concluída'}
              </p>
              <p className="text-slate-600 text-[10px] font-bold mt-2">
                {activeTab === 'pending' ? 'Aguarde as ordens da central' : 'O histórico aparecerá aqui'}
              </p>
            </motion.div>
          )}
        </div>
      
      {/* PIX Payment Modal */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0f172a] w-full max-w-sm rounded-[3rem] p-8 border border-white/10 shadow-2xl relative"
            >
              <button
                onClick={() => setShowQrModal(null)}
                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Voltar"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-8">
                <div className="inline-flex w-16 h-16 bg-blue-500/10 text-blue-500 rounded-3xl items-center justify-center mb-6">
                   <QrCode size={32} />
                </div>
                <h3 className="text-2xl font-black italic tracking-tighter">MODO COBRANÇA</h3>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">Apenas via PIX Oficial</p>
              </div>

              <div className="bg-white/5 rounded-[2rem] p-8 text-center mb-8 border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Valor Total a Pagar</p>
                <div className="flex items-center justify-center gap-2">
                   <span className="text-lg font-black text-blue-500">R$</span>
                   <p className="text-5xl font-black italic tracking-tighter text-white">
                     {showQrModal.total_price.toFixed(2)}
                   </p>
                </div>
                
                <div className="mt-8 flex justify-center min-h-[180px]">
                  {pixLoading ? (
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-[10px] text-slate-500 font-black uppercase">Gerando Código...</p>
                    </div>
                  ) : pixData ? (
                    <div className="bg-white p-4 rounded-3xl inline-block border-2 border-white/10 shadow-2xl">
                      {pixData.qr_code_base64 ? (
                        <img
                          src={`data:image/png;base64,${pixData.qr_code_base64}`}
                          alt="QR Code PIX"
                          className="w-[180px] h-[180px]"
                        />
                      ) : (
                        <QrCode size={180} className="text-slate-800" />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center text-red-400 text-xs font-bold font-black">
                      Erro ao gerar QR Code
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Calculadora de Troco</p>
                    {showQrModal.cash_change_requested && (
                      <span className="text-[9px] font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded">
                        Pedido p/ R$ {showQrModal.cash_change_requested.toFixed(2)}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-600 uppercase mb-1 block">Valor Recebido (Dinheiro)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">R$</span>
                        <input 
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00"
                          value={amountReceived}
                          onChange={(e) => setAmountReceived(e.target.value.replace(',', '.'))}
                          className="w-full bg-[#020617] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-white focus:border-emerald-500 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {amountReceived && parseFloat(amountReceived) > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "p-3 rounded-xl flex justify-between items-center",
                          parseFloat(amountReceived) >= showQrModal.total_price 
                            ? "bg-emerald-500/10 border border-emerald-500/20" 
                            : "bg-red-500/10 border border-red-500/20"
                        )}
                      >
                        <span className="text-[10px] font-black uppercase text-slate-400">
                          {parseFloat(amountReceived) >= showQrModal.total_price ? "Troco a devolver" : "Falta receber"}
                        </span>
                        <span className={cn(
                          "text-lg font-black italic",
                          (parseFloat(amountReceived) || 0) >= showQrModal.total_price ? "text-emerald-400" : "text-red-400"
                        )}>
                          R$ {Math.abs((parseFloat(amountReceived) || 0) - showQrModal.total_price).toFixed(2)}
                        </span>
                      </motion.div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => confirmPaidManually(showQrModal)}
                  className="w-full py-5 bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-500 border border-white/10 hover:border-emerald-500/20 text-slate-300 font-black uppercase text-xs tracking-widest rounded-2xl flex items-center justify-center gap-3 transition-all"
                >
                  <Banknote size={20} /> Confirmar Recebimento
                </button>
                
                <div className="pt-2 text-center">
                   <p className="text-[10px] text-slate-600 font-bold animate-pulse">
                     O sistema fecha automaticamente após o pagamento PIX
                   </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  </div>
);
};
