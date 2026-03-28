import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  ChefHat, 
  Bell, 
  X, 
  Plus, 
  CheckCircle2, 
  DollarSign, 
  Truck 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTenant } from "../context/TenantContext";
import { socket } from "../supabase";
import { Order, Product } from "../types";
import { cn, getTimeAgo } from "../lib/utils";

export const KitchenPage: React.FC<{ notify: any }> = ({ notify }) => {
  const { org } = useTenant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);


  // Play a beep alert
  const playAlert = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) { /* Browser may block before user interaction */ }
  }, []);

  // Request browser push notification permission
  const requestNotifPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifEnabled(perm === 'granted');
  }, []);

  // Show OS notification
  const showPushNotif = useCallback((order: Order) => {
    if (Notification.permission === 'granted') {
      new Notification('🔔 Novo Pedido!', {
        body: `${order.customer_name} — ${order.items?.length ?? 1} item(s) — R$ ${order.total_price?.toFixed(2)}`,
        icon: '/favicon.ico',
        tag: `order-${order.id}`,
        requireInteraction: true,
      });
    }
  }, []);

  useEffect(() => {
    // Auto-check permission on mount
    if ('Notification' in window) {
      setNotifEnabled(Notification.permission === 'granted');
    }

    // Load initial data with sorting
    const loadOrders = async () => {
      try {
        const res = await fetch(`/api/${org.id}/orders`);
        const data = await res.json();
        // Sort ascending by ID (lowest/oldest first)
        const sorted = data.sort((a: any, b: any) => a.id - b.id);
        // Only show pending and preparing for kitchen
        setOrders(sorted.filter((o: Order) => o.status === 'pending' || o.status === 'preparing'));
      } catch (err) {
        console.error("Erro ao carregar pedidos:", err);
      }
    };

    const loadProducts = async () => {
      const res = await fetch(`/api/${org.id}/products`);
      const data = await res.json();
      setProducts(data);
    };

    loadOrders();
    loadProducts();

    if (!socket.connected) socket.connect();

    socket.on("order:new", (newOrder: Order) => {
      // Comparison with toString() to be safe with UUIDs/Strings/Numbers
      if (newOrder.org_id?.toString() === org.id?.toString()) {
        const kitchenOrder = { ...newOrder, status: 'pending' as any };
        setOrders(prev => {
          // Check if already in list to avoid duplicates
          if (prev.some(o => o.id === newOrder.id)) return prev;
          // Add and maintain ascending order
          const updated = [...prev, kitchenOrder];
          return updated.sort((a, b) => a.id - b.id);
        });
        notify(`Novo pedido #${newOrder.id} recebido!`, "info");
        playAlert();
        showPushNotif(newOrder);
      }
    });

    socket.on("order:update", ({ id, status }: { id: number, status: string }) => {
      setOrders(prev => {
        // If it's a "terminal" status for the kitchen, remove it
        if (status === 'ready' || status === 'shipped' || status === 'delivered' || status === 'cancelled') {
          return prev.filter(o => o.id !== id);
        }
        return prev.map(o => o.id === id ? { ...o, status: status as any } : o);
      });
    });

    socket.on("order:payment_update", ({ id, payment_status }: { id: number, payment_status: string }) => {
      setOrders(prev => {
        const orderIndex = prev.findIndex(o => o.id === id);
        if (orderIndex === -1) return prev;
        
        const oldOrder = prev[orderIndex];
        const newOrders = [...prev];
        newOrders[orderIndex] = { ...oldOrder, payment_status: payment_status as any };

        // Alerta sonoro quando o PIX é aprovado (momento que a cozinha vê o pedido)
        if (payment_status === 'paid' && (oldOrder as any).payment_method === 'pix') {
          playAlert();
          notify(`Pedido #${id} PAGO! Pode começar. 🍢`, "success");
        }
        
        return newOrders;
      });
    });

    return () => {
      socket.off("order:new");
      socket.off("order:update");
      socket.off("order:payment_update");
    };
  }, [org, playAlert, showPushNotif, notify]);

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Falha ao atualizar status');
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar o status do pedido");
    }
  };

  const confirmDeliveryPayment = async (orderId: number) => {
    await fetch(`/api/orders/${orderId}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_status: 'paid' })
    });
  };

  const activeOrders = orders.filter(o => {
    // Hidden until paid if it's Pix
    if ((o as any).payment_method === 'pix' && o.payment_status === 'pending') return false;
    return o.status === 'pending' || o.status === 'preparing';
  });

  return (
    <div className="pb-24 md:pl-24 md:pt-8 p-4 max-w-5xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-5xl font-black text-gradient uppercase tracking-tighter flex items-center justify-center md:justify-start gap-3">
            <ChefHat size={48} />
            Cozinha
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Pedidos em tempo real para {org?.name}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <button
            onClick={requestNotifPermission}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm border transition-all",
              notifEnabled
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-orange-50 text-orange-700 border-orange-200 animate-pulse"
            )}
          >
            <Bell size={16} />
            {notifEnabled ? '🔔 Notificações ativas' : '🔕 Ativar notificações'}
          </button>
          <div className="bg-[var(--primary)]/10 text-[var(--primary)] px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest border border-[var(--primary)]/20 shadow-inner">
            {activeOrders.length} Pedidos Ativos
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {activeOrders.map(order => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "bg-white p-6 rounded-3xl border-2 shadow-sm relative overflow-hidden flex flex-col",
                order.status === 'pending' ? "border-red-100" : "border-orange-100"
              )}
            >
              {order.status === 'pending' && (
                <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                  Novo
                </div>
              )}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-xl">#{order.id}</h3>
                  <p className="text-sm font-medium text-gray-600">{order.customer_name}</p>
                  <div className="mt-1 flex gap-1 items-center">
                    <div className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                      order.payment_status === 'paid' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                      {order.payment_status === 'paid' ? "Pago" : "Pendente"}
                    </div>
                    {(order as any).payment_method === 'delivery' && (
                      <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700 flex items-center gap-1">
                        <Truck size={10} /> Entrega
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-gray-400 text-xs text-right">
                  <span className="block">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              <div className="space-y-2 mb-6 flex-1">
                {order.items.map((item, idx) => {
                  const product = products.find(p => p.id === item.id || p.name === item.name);
                  const ingredients = item.ingredients || product?.ingredients;
                  const isChurrasco = product?.category === 'churrasco' || item.name.toLowerCase().includes('churrasco') || item.name.toLowerCase().includes('carne');

                  return (
                    <div key={idx} className="flex flex-col bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900 uppercase">{item.quantity}x {item.name}</span>
                      </div>

                      {isChurrasco && ingredients && (
                        <div className="mt-1.5 pt-1.5 border-t border-gray-50">
                          <p className="text-[11px] text-gray-500 leading-relaxed italic">
                            {ingredients}
                          </p>
                        </div>
                      )}

                      {item.removedIngredients && item.removedIngredients.length > 0 && (
                        <div className="mt-1.5 px-2 py-1 bg-red-50 rounded-lg border border-red-100">
                          <span className="text-[9px] text-red-600 font-black uppercase flex items-center gap-1">
                            <X size={10} strokeWidth={3} /> SEM: {item.removedIngredients.join(', ')}
                          </span>
                        </div>
                      )}

                      {item.extraIngredients && item.extraIngredients.length > 0 && (
                        <div className="mt-1.5 px-2 py-1 bg-green-50 rounded-lg border border-green-100">
                          <span className="text-[9px] text-green-700 font-black uppercase flex items-center gap-1">
                            <Plus size={10} strokeWidth={3} /> EXTRA: {(item.extraIngredients as any[]).map(e => e.name).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto pt-4 border-t border-gray-50 flex flex-col gap-2">
                {order.payment_status === 'pending' && (
                  <button
                    onClick={() => confirmDeliveryPayment(order.id)}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-2xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-95"
                  >
                    <DollarSign size={14} /> {(order as any).payment_method === 'pix' ? "Confirmar Pix Manual" : "Confirmar Recebimento"}
                  </button>
                )}

                <div className="flex gap-2">
                  {order.status === 'pending' ? (
                    <button
                      onClick={() => updateStatus(order.id, 'preparing')}
                      className="flex-1 bg-orange-600 text-white py-3 rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 active:scale-95"
                    >
                      Começar Preparo
                    </button>
                  ) : (
                    <button
                      disabled={order.payment_status === 'pending' && (order as any).payment_method === 'pix'}
                      onClick={() => updateStatus(order.id, 'ready')}
                      className={cn(
                        "flex-1 bg-green-600 text-white py-3 rounded-2xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100 active:scale-95",
                        order.payment_status === 'pending' && (order as any).payment_method === 'pix' ? "opacity-50 cursor-not-allowed" : ""
                      )}
                    >
                      <CheckCircle2 size={20} /> Pronto
                    </button>
                  )}
                </div>

                {order.payment_status === 'pending' && (order as any).payment_method === 'pix' && (
                  <p className="text-[10px] text-gray-400 text-center italic mt-1 font-medium">Aguardando pagamento PIX para finalizar.</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default KitchenPage;
