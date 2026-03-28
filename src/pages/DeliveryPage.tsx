import React, { useState, useEffect } from "react";
import { 
  Truck, 
  User, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  QrCode, 
  X, 
  AlertCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTenant } from "../context/TenantContext";
import { socket } from "../supabase";
import { Order, User as UserType } from "../types";
import { cn, getTimeAgo } from "../lib/utils";

export const DeliveryPage: React.FC<{ notify: any }> = ({ notify }) => {
  const { org } = useTenant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [showQrModal, setShowQrModal] = useState<Order | null>(null);
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string; payment_id: number } | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [couriers, setCouriers] = useState<UserType[]>([]);
  const [showDispatchModal, setShowDispatchModal] = useState<Order | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("0");



  useEffect(() => {
    if (showDispatchModal && selectedCourierId) {
      const selectedCourier = couriers.find(c => String(c.id) === String(selectedCourierId));
      if (selectedCourier && selectedCourier.commission_rate) {
        const fee = (showDispatchModal.total_price * (selectedCourier.commission_rate / 100)).toFixed(2);
        setDeliveryFee(fee);
      } else {
        setDeliveryFee("0");
      }
    }
  }, [selectedCourierId, showDispatchModal, couriers]);

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

  const confirmPaymentAndDeliver = async (order: Order) => {
    await fetch(`/api/orders/${order.id}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_status: 'paid' })
    });
    await updateStatus(order.id, 'delivered');
    setShowQrModal(null);
  };

  useEffect(() => {
    if (!org) return;
    fetch(`/api/${org.id}/orders`).then(res => res.json()).then(setOrders);
    fetch(`/api/${org.id}/couriers`).then(res => res.json()).then(setCouriers);

    socket.on("order:update", ({ id, status }: { id: number, status: string }) => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: status as any } : o));
    });

    socket.on("order:payment_update", ({ id, payment_status }: { id: number, payment_status: string }) => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, payment_status: payment_status as any } : o));
    });

    return () => {
      socket.off("order:update");
      socket.off("order:payment_update");
    };
  }, [org]);

  useEffect(() => {
    if (showQrModal && org) {
      const currentOrder = orders.find(o => o.id === showQrModal.id);
      if (currentOrder && currentOrder.payment_status === 'paid') {
        updateStatus(currentOrder.id, 'delivered');
        setShowQrModal(null);
        alert("Pagamento confirmado, volte sempre!");
      }
    }
  }, [orders, showQrModal, org]);

  // Fallback Polling for PIX Payment (Delivery)
  useEffect(() => {
    if (!showQrModal || showQrModal.payment_status === 'paid') return;
    const interval = setInterval(() => {
      fetch(`/api/orders/${showQrModal.id}/check-payment`)
        .then(res => res.json())
        .then(data => {
          if (data.payment_status === 'paid') {
            updateStatus(showQrModal.id, 'delivered');
            setShowQrModal(null);
            alert("Pagamento confirmado, volte sempre!");
            clearInterval(interval);
          }
        })
        .catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, [showQrModal]);

  useEffect(() => {
    if (showQrModal && showQrModal.payment_status !== 'paid' && org) {
      setPixLoading(true);
      fetch(`/api/${org.id}/pix/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total_price: showQrModal.total_price,
          order_id: showQrModal.id,
          description: `Pedido #${showQrModal.id} (Entrega)`
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.qr_code) setPixData(data);
          if (data.payment_id) {
            fetch(`/api/orders/${showQrModal.id}/payment`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mp_payment_id: data.payment_id.toString() })
            });
          }
        })
        .catch(console.error)
        .finally(() => setPixLoading(false));
    } else {
      setPixData(null);
    }
  }, [showQrModal, org]);

  const deployOrder = async () => {
    if (!showDispatchModal || !selectedCourierId) return;
    try {
      const res = await fetch(`/api/orders/${showDispatchModal.id}/courier`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courier_id: selectedCourierId,
          delivery_fee: parseFloat(deliveryFee)
        })
      });
      if (res.ok) {
        await updateStatus(showDispatchModal.id, 'shipped');
        setShowDispatchModal(null);
        setSelectedCourierId("");
        setDeliveryFee("0");
        fetch(`/api/${org.id}/orders`).then(res => res.json()).then(setOrders);
      }
    } catch (error) {
      alert("Erro ao despachar pedido");
    }
  };

  const deliveryOrders = orders.filter(o => o.status === 'ready' || o.status === 'shipped');

  return (
    <div className="md:pt-8 p-4 max-w-5xl mx-auto">
      <header className="mb-10">
        <h1 className="text-5xl font-black text-indigo-600 uppercase tracking-tighter flex items-center gap-3 italic">
          <Truck size={48} />
          Entregas
        </h1>
        <p className="text-slate-500 mt-2 font-medium">Logística de saída - {org?.name}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {deliveryOrders.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <Truck size={64} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-400 font-medium">Nenhum pedido para entrega no momento</p>
          </div>
        ) : (
          deliveryOrders.map(order => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded",
                      order.status === 'ready' ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                    )}>
                      {order.status === 'ready' ? "Pronto" : "Em Rota"}
                    </span>
                    <h3 className="font-bold text-2xl mt-1">Pedido #{order.id}</h3>
                    <p className="text-gray-600 font-medium">{order.customer_name}</p>
                    {(order as any).courier_name && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-orange-600 uppercase">
                        <User size={12} /> Entregador: {(order as any).courier_name}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right">
                    <p className="font-mono font-bold text-xl">R$ {order.total_price.toFixed(2)}</p>
                    {order.payment_status === 'paid' ? (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-[10px] font-bold flex items-center gap-1 uppercase">
                        <CheckCircle2 size={12} /> Pago
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-[10px] font-bold flex items-center gap-1 uppercase">
                        <Clock size={12} /> A Receber
                      </span>
                    )}
                  </div>
                </div>
                {order.address && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-800 uppercase mb-1 flex items-center gap-1">
                      <MapPin size={10} /> {order.address}
                    </p>
                    {order.latitude && order.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 underline"
                      >
                        Ver no Mapa
                      </a>
                    )}
                  </div>
                )}
                <div className="bg-gray-50 p-4 rounded-2xl mb-6">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Itens</p>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="mb-2 last:mb-0 text-xs font-bold">
                      {item.quantity}x {item.name}
                    </div>
                  ))}
                </div>
              </div>
              {order.status === 'ready' ? (
                <button
                  onClick={() => setShowDispatchModal(order)}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Truck size={20} /> Despachar Pedido
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (order.payment_status !== 'paid') {
                      setShowQrModal(order);
                    } else {
                      updateStatus(order.id, 'delivered');
                    }
                  }}
                  className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  title="Concluir Entrega"
                >
                  <CheckCircle2 size={20} /> Concluir Entrega
                </button>
              )}
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showDispatchModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
              <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2"><Truck className="text-orange-600" /> Despachar Pedido</h3>
              <div className="space-y-6">
                <div>
                  <label id="courier-select-label" className="block text-xs font-bold text-gray-400 uppercase mb-2">Selecionar Entregador</label>
                  <select
                    aria-labelledby="courier-select-label"
                    value={selectedCourierId}
                    onChange={e => setSelectedCourierId(e.target.value)}
                    className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-orange-500 font-bold"
                  >
                    <option value="">Escolha quem vai levar...</option>
                    {couriers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="delivery-fee-input" className="block text-xs font-bold text-gray-400 uppercase mb-2">Taxa de Entrega (Comissão R$)</label>
                  <input
                    id="delivery-fee-input"
                    type="number"
                    step="0.10"
                    placeholder="0.00"
                    value={deliveryFee}
                    onChange={e => setDeliveryFee(e.target.value)}
                    className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-orange-500 font-mono text-xl font-black"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button onClick={() => setShowDispatchModal(null)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold">Cancelar</button>
                  <button
                    onClick={deployOrder}
                    disabled={!selectedCourierId}
                    className="flex-2 px-8 py-4 bg-orange-600 text-white rounded-2xl font-bold shadow-lg shadow-orange-100 disabled:opacity-50"
                  >
                    Confirmar Envio
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <QrCode className="text-blue-600" /> Cobrar Pedido
                </h3>
                <button
                  onClick={() => setShowQrModal(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Fechar Modal"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="text-center mb-6">
                <p className="text-gray-500 mb-2">Total a receber:</p>
                <p className="text-4xl font-black text-blue-600">
                  R$ {showQrModal.total_price.toFixed(2)}
                </p>
                <div className="mt-6 flex justify-center min-h-[220px]">
                  {pixLoading ? (
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-gray-500 font-medium">Gerando PIX...</p>
                    </div>
                  ) : pixData ? (
                    <div className="bg-gray-100 p-4 rounded-3xl inline-block border-4 border-white shadow-xl">
                      {pixData.qr_code_base64 ? (
                        <img
                          src={`data:image/png;base64,${pixData.qr_code_base64}`}
                          alt="QR Code"
                          className="w-[180px] h-[180px]"
                        />
                      ) : (
                        <QrCode size={180} className="text-gray-800" />
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-100 p-4 rounded-3xl inline-block border-4 border-white shadow-xl flex items-center justify-center w-[210px] h-[210px]">
                      <p className="text-gray-400 text-sm">Erro ao gerar PIX</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => confirmPaymentAndDeliver(showQrModal)}
                  className="w-full bg-orange-100 text-orange-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-200 transition"
                >
                  <CheckCircle2 size={18} /> Recebi em Dinheiro/Cartão
                </button>
                <button
                  onClick={() => setShowQrModal(null)}
                  className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition"
                >
                  Voltar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeliveryPage;
