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
  const [focusOrder, setFocusOrder] = useState<Order | null>(null);


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

      // Se marcou como pronto, fecha o foco
      if (status === 'ready' && focusOrder?.id === id) {
        setFocusOrder(null);
      }
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
    <div className="md:pt-8 p-4 max-w-5xl mx-auto">
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

      <div className="flex flex-col gap-4">
        <AnimatePresence>
          {activeOrders.map((order, idx) => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={cn(
                "bg-white p-5 rounded-3xl border-2 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center gap-6",
                idx === 0 ? "border-orange-500 bg-orange-50/20" : "border-gray-100 opacity-60 grayscale-[0.5]"
              )}
            >
              {idx === 0 && (
                <div className="absolute top-0 left-0 bg-orange-600 text-white text-[10px] font-black px-4 py-1 rounded-br-2xl uppercase tracking-[0.2em] italic">
                  FAZER AGORA! 🍢
                </div>
              )}
              
              <div className="flex-1 w-full md:w-auto">
                 <div className="flex items-center gap-4">
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">#{order.id}</span>
                    <div>
                      <h3 className="font-black text-lg uppercase italic tracking-tighter">{order.customer_name}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">
                        Pedido às {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                 </div>

                 <div className="flex gap-2 mt-3">
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      order.payment_status === 'paid' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                      {order.payment_status === 'paid' ? "PAGO" : "NA ENTREGA"}
                    </div>
                    {order.status === 'preparing' && (
                      <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-orange-100 text-orange-700 animate-pulse">
                        EM PREPARO
                      </div>
                    )}
                 </div>
              </div>

              <div className="flex flex-col gap-2 flex-1 w-full justify-center md:justify-start">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex flex-col gap-1 p-3 bg-white rounded-2xl border-2 border-gray-100">
                       <span className="font-black text-xs uppercase tracking-tighter italic">{item.quantity}x {item.name}</span>
                       {item.ingredients && (
                         <p className="text-[9px] text-gray-500 font-medium italic leading-none">{item.ingredients}</p>
                       )}
                    </div>
                  ))}
              </div>

              <div className="w-full md:w-auto flex gap-2">
                 {order.status === 'pending' ? (
                   <button
                     onClick={() => {
                        updateStatus(order.id, 'preparing');
                        setFocusOrder(order);
                     }}
                     className="flex-1 md:w-48 bg-orange-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-orange-200 active:scale-95 transition-all"
                   >
                     Começar Preparo
                   </button>
                 ) : (
                   <button
                     onClick={() => setFocusOrder(order)}
                     className="flex-1 md:w-48 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                   >
                     Ver Detalhes (Foco)
                   </button>
                 )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* MODO FOCO - TELA CHEIA */}
        <AnimatePresence>
          {focusOrder && (
            <div className="fixed inset-0 z-[200] bg-white flex flex-col p-6 overflow-y-auto">
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: 20 }}
                 className="flex flex-col h-full"
               >
                 <header className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                      <button onClick={() => setFocusOrder(null)} className="p-4 bg-gray-100 rounded-2xl" aria-label="Fechar detalhes">
                        <X size={32} />
                      </button>
                      <div>
                        <h2 className="text-4xl font-black tracking-tighter uppercase italic">Pedido #{focusOrder.id}</h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{focusOrder.customer_name}</p>
                      </div>
                    </div>
                    <div className="hidden md:block px-6 py-3 bg-orange-600 text-white rounded-3xl font-black uppercase tracking-widest text-lg animate-pulse">
                      PREPARANDO AGORA...
                    </div>
                 </header>

                 <div className="flex-1 space-y-6">
                    {focusOrder.items.map((item, idx) => {
                      const isChurrasco = item.name.toLowerCase().includes('churrasco') || item.name.toLowerCase().includes('carne');
                      return (
                        <div key={idx} className="bg-gray-50 p-8 rounded-[2.5rem] border-2 border-gray-100 shadow-sm">
                           <div className="flex justify-between items-center mb-6">
                              <span className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">
                                 {item.quantity}x {item.name}
                              </span>
                              {isChurrasco && <ChefHat size={48} className="text-orange-500 opacity-20" />}
                           </div>

                           <div className="space-y-4">
                              {item.ingredients && (
                                <div className="bg-white p-6 rounded-3xl border border-gray-100">
                                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] mb-3">Composição Padrão:</p>
                                  <p className="text-xl font-bold text-gray-600 leading-none tracking-tight">{item.ingredients}</p>
                                </div>
                              )}
                              
                              {/* REMOVIDOS - DESTAQUE VERMELHO */}
                              {item.removedIngredients && item.removedIngredients.length > 0 && (
                                 <div className="bg-red-50 p-6 rounded-3xl border-4 border-red-100 ring-4 ring-red-50">
                                    <p className="text-[10px] font-black uppercase text-red-500 tracking-[0.3em] mb-3">⚠️ REMOVER (NÃO COLOCAR):</p>
                                    <div className="flex flex-wrap gap-3">
                                       {item.removedIngredients.map(rem => (
                                         <span key={rem} className="px-4 py-2 bg-red-500 text-white rounded-xl text-xl font-black uppercase italic tracking-tighter">
                                            - {rem}
                                         </span>
                                       ))}
                                    </div>
                                 </div>
                              )}

                              {/* EXTRAS - DESTAQUE VERDE */}
                              {item.extraIngredients && (item.extraIngredients as any[]).length > 0 && (
                                 <div className="bg-green-50 p-6 rounded-3xl border-4 border-green-100 ring-4 ring-green-50">
                                    <p className="text-[10px] font-black uppercase text-green-600 tracking-[0.3em] mb-3">⭐ ADICIONAIS EXTRAS:</p>
                                    <div className="flex flex-wrap gap-3">
                                       {(item.extraIngredients as any[]).map(extra => (
                                         <span key={extra.id} className="px-4 py-2 bg-green-600 text-white rounded-xl text-xl font-black uppercase italic tracking-tighter">
                                            + {extra.name}
                                         </span>
                                       ))}
                                    </div>
                                 </div>
                              )}
                           </div>
                        </div>
                      );
                    })}
                 </div>

                 <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-200">
                    <button 
                      onClick={() => updateStatus(focusOrder.id, 'ready')}
                      className="w-full py-10 bg-green-600 text-white rounded-[3rem] text-4xl font-black uppercase italic tracking-tighter shadow-2xl shadow-green-200 flex items-center justify-center gap-6 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      <CheckCircle2 size={48} /> FINALIZAR PEDIDO (PRONTO)
                    </button>
                 </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default KitchenPage;
