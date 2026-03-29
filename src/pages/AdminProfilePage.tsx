import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle2, 
  LogOut, 
  Trophy, 
  Star, 
  Clock, 
  MapPin, 
  Smartphone, 
  Mail,
  ChevronRight,
  Package,
  Bike,
  Edit,
  Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { cn, getTimeAgo } from '../lib/utils';
import { supabase, socket } from '../supabase';
import { LocationPicker } from '../components/LocationPicker';
import { StaticMap } from '../components/StaticMap';

export const AdminProfilePage = () => {
  const { user, logout, refreshProfile } = useAuth();
  const { org } = useTenant();
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Forçar recarga das informações do perfil quando o usuário estiver disponível
  useEffect(() => {
    if (user?.id) {
      refreshProfile().finally(() => setLoading(false));
    } else if (!useAuth().loading) {
      setLoading(false);
    }
  }, [user?.id]);

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage (Bucket: profiles)
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // Update Profile table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      // Refresh local user state if possible
      await refreshProfile();
      window.location.reload(); 
    } catch (error: any) {
      console.error("Erro no upload:", error.message);
      alert("Erro ao enviar foto: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateLocation = async (lat: number, lng: number, address: string) => {
    if (!user) return;
    try {
      setSavingLocation(true);
      const { error } = await supabase
        .from('profiles')
        .update({ latitude: lat, longitude: lng, address })
        .eq('id', user.id);

      if (error) throw error;
      await refreshProfile();
      setShowMap(false);
    } catch (error: any) {
      alert("Erro ao salvar localização: " + error.message);
    } finally {
      setSavingLocation(false);
    }
  };

  const fetchOrders = () => {
    if (!user || !org) return;
    fetch(`/api/my-orders/${user.id}`)
      .then(res => res.json())
      .then(data => {
        // Filter only non-delivered orders for tracking
        const active = (Array.isArray(data) ? data : []).filter(o => o.status !== 'delivered');
        setActiveOrders(active);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();

    // Listen to real-time status updates
    const onStatusUpdate = ({ id, status }: { id: number, status: string }) => {
       fetchOrders();
    };

    socket.on("order:update", onStatusUpdate);
    return () => {
      socket.off("order:update", onStatusUpdate);
    };
  }, [user, org]);

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'pending': return 1;
      case 'preparing': return 2;
      case 'ready': return 3;
      case 'shipped': return 4;
      case 'delivered': return 5;
      default: return 0;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return "Aguardando Preparo";
      case 'preparing': return "Na Brasa (Em Preparo)";
      case 'ready': return "Pronto para Entrega";
      case 'shipped': return "Saiu para Entrega (Em Rota)";
      case 'delivered': return "Entregue";
      default: return status;
    }
  };

  const getUserTier = (points: number) => {
    if (points >= 500) return { label: "Cliente Ouro", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" };
    if (points >= 300) return { label: "Cliente Prata", color: "text-slate-200", bg: "bg-slate-200/10", border: "border-slate-200/20" };
    if (points >= 100) return { label: "Cliente Bronze", color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" };
    return { label: "Novato", color: "text-slate-400", bg: "bg-white/5", border: "border-white/10" };
  };

  const tier = getUserTier(user?.points || 0);

  return (
    <div className="max-w-4xl mx-auto p-4 md:pt-8 min-h-screen pb-24">
      {/* 👑 VIP Header Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-slate-900 rounded-[2.5rem] p-8 md:p-12 overflow-hidden shadow-2xl border border-white/5"
      >
        {/* Abstract Background Lights */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-orange-600/20 rounded-full blur-[100px] -mr-40 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          {/* Avatar Container */}
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-gradient-to-br from-orange-400 to-red-600 p-1 flex items-center justify-center shadow-glow shadow-orange-500/30 ring-8 ring-white/5 transition-transform hover:scale-105 active:scale-95 duration-500">
              <div className="w-full h-full rounded-[2.3rem] bg-slate-900 flex items-center justify-center text-5xl font-black text-white relative overflow-hidden group">
                {user?.avatar_url ? (
                  <img 
                    src={user.avatar_url.includes('?') ? user.avatar_url : `${user.avatar_url}?v=${new Date().getTime()}`} 
                    alt={user.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  user?.name?.[0]?.toUpperCase()
                )}
                
                {/* Upload Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white">
                   <Star size={18} fill="currentColor" className="mb-1 text-orange-400" />
                   <span className="text-[8px] font-black uppercase tracking-widest">Alterar Foto</span>
                </div>

                {uploading && (
                   <div className="absolute inset-0 bg-slate-900/90 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                   </div>
                )}
              </div>
            </div>
            {/* Hidden Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleUploadAvatar} 
              title="Carregar foto de perfil"
            />
            {/* VIP Label Badge */}
            <div className={cn(
              "absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg whitespace-nowrap",
              tier.bg, tier.color, tier.border, "border"
            )}>
              {tier.label}
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <p className="text-orange-400 font-black text-sm uppercase tracking-widest mb-2 italic">Churrasco Lover</p>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none mb-4">
              {user?.name || "Guerreiro(a)"}
            </h1>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md">
                <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Total Pontos</p>
                <p className="text-xl font-black text-orange-500">{user?.points || 0} PTS</p>
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md">
                <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Desde</p>
                <p className="text-xl font-black text-white">{new Date(user?.created_at || Date.now()).getFullYear()}</p>
              </div>
            </div>
          </div>

          <button 
            onClick={logout}
            className="md:self-start bg-red-500/10 text-red-400 p-4 rounded-2xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
            title="Sair da Conta"
          >
            <LogOut size={24} />
          </button>
        </div>
      </motion.div>

      {/* 🚀 Active Orders Tracking -Surprise- */}
      <div className="mt-12 space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <Package className="text-orange-500" /> Rastreio Automático
          </h2>
          {activeOrders.length > 0 && (
             <span className="bg-orange-600 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase animate-pulse">
               Ativo
             </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {activeOrders.map(order => {
              const currentStep = getStatusStep(order.status);
              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white p-6 rounded-[2rem] border-2 border-orange-100 shadow-xl shadow-orange-900/5 relative overflow-hidden group"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-2">
                         <span className="text-sm font-black text-slate-300">#{order.id.toString().slice(-4)}</span>
                         <h4 className="font-bold text-slate-900 capitalize">{getStatusLabel(order.status)}</h4>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{getTimeAgo(order.created_at)}</p>
                    </div>
                    <div className="bg-orange-100 p-3 rounded-2xl">
                       {order.status === 'shipped' ? <Bike className="text-orange-600 animate-bounce" /> : <Clock className="text-orange-600 animate-pulse" />}
                    </div>
                  </div>

                  {/* Progress Line */}
                  <div className="relative mt-8 mb-6 h-1 bg-slate-100 rounded-full flex justify-between items-center px-1">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(currentStep / 4) * 100}%` }}
                      className="absolute inset-0 h-1 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full" 
                    />
                    
                    {[1, 2, 3, 4].map(step => (
                      <div 
                        key={step} 
                        className={cn(
                          "w-4 h-4 rounded-full border-2 transition-all relative z-10",
                          step <= currentStep ? "bg-orange-500 border-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" : "bg-white border-slate-200"
                        )}
                      />
                    ))}
                  </div>

                  <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-tighter mb-6 px-1">
                      <span>Início</span>
                      <span>Preparo</span>
                      <span>Pronto</span>
                      <span>Rota</span>
                  </div>

                  {/* Tracking Link for Shipped */}
                  {order.status === 'shipped' && (
                    <Link 
                      to={`/track/${order.courier_id || 'active'}`}
                      className="flex items-center justify-between w-full p-4 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-colors shadow-lg shadow-orange-200"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin size={16} /> Ver no Mapa
                      </div>
                      <ChevronRight size={16} />
                    </Link>
                  )}
                  
                  {order.status !== 'shipped' && (
                     <div className="text-center bg-gray-50 rounded-2xl py-3 border border-gray-100">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-tighter italic">O melhor sabor está a caminho...</span>
                     </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {activeOrders.length === 0 && (
            <div className="md:col-span-2 py-12 rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center opacity-40 bg-white/50">
               <div className="text-5xl mb-4 grayscale opacity-50">🍱</div>
               <p className="font-bold text-gray-400 tracking-tight">Nenhum pedido em produção no momento.</p>
               <Link to="/" className="mt-4 text-xs font-black uppercase text-orange-600 border-b-2 border-orange-200 hover:text-orange-700 transition-colors">Bora pedir um Grego? →</Link>
            </div>
          )}
        </div>
      </div>

      {/* 📋 Additional Information */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 h-fit group">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
            <Smartphone size={20} className="text-indigo-600" /> Meus Contatos
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1 ml-2">Telefone Principal</label>
              <div className="p-4 bg-gray-50 rounded-2xl text-gray-800 font-mono font-bold border border-transparent hover:border-indigo-100 transition-all cursor-default">
                {user?.phone}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1 ml-2">Email</label>
              <div className="p-4 bg-gray-50 rounded-2xl text-gray-800 font-medium border border-transparent hover:border-indigo-100 transition-all flex items-center gap-2 cursor-default">
                <Mail size={16} className="text-gray-400" />
                {user?.email || "Nenhum email vinculado"}
              </div>
            </div>
          </div>
        </div>

        {/* 🛰️ Delivery Location Card */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col group relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <MapPin size={100} fill="currentColor" />
           </div>
           
           <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <MapPin size={24} className="text-orange-500" /> Local de Entrega
           </h3>
           
           <div className="flex-1 space-y-4 relative z-10">
              {user?.latitude && user?.longitude ? (
                <div className="space-y-4">
                  <StaticMap 
                    lat={Number(user.latitude)} 
                    lng={Number(user.longitude)} 
                    className="h-32 bg-slate-50 rounded-2xl overflow-hidden border-2 border-slate-100 group-hover:border-orange-100 transition-colors shadow-inner"
                  />
                  <div className="p-4 bg-slate-50 rounded-2xl text-[11px] font-bold text-slate-600 leading-tight border border-transparent shadow-sm">
                    {user.address || 'Localização sem endereço definido...'}
                  </div>
                  <button 
                    onClick={() => setShowMap(true)}
                    className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-900/5"
                  >
                    <Edit size={14} /> Atualizar Localização
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-4">
                  <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-400 animate-pulse">
                     <Navigation size={32} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">GPS não configurado</h4>
                    <p className="text-[10px] font-medium text-slate-400 mt-1 max-w-[200px] mx-auto">
                      Ative seu GPS para que os entregadores cheguem com precisão total.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowMap(true)}
                    className="px-8 py-4 rounded-2xl bg-orange-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-xl shadow-orange-200"
                  >
                    <MapPin size={14} /> Marcar no Mapa Agora
                  </button>
                </div>
              )}
           </div>
        </div>

        <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 space-y-4 flex flex-col justify-center relative overflow-hidden group">
          {/* Decorative Stars */}
          <Star size={100} className="absolute -bottom-10 -right-10 text-white/5 -rotate-12 transition-transform group-hover:rotate-0 duration-700" fill="currentColor" />
          
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center relative z-10">
            <Star size={24} className="text-yellow-400" fill="currentColor" />
          </div>
          <h3 className="text-3xl font-black italic uppercase leading-none tracking-tighter relative z-10">
            Benefícios <span className="text-yellow-400">Premium</span>
          </h3>
          <ul className="space-y-3 opacity-90 mt-2 relative z-10">
            <li className="flex items-center gap-3 text-sm font-medium">
               <div className="w-2 h-2 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.5)]" /> 1 lanche grátis a cada 10 pedidos.
            </li>
            <li className="flex items-center gap-3 text-sm font-medium">
               <div className="w-2 h-2 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.5)]" /> Entrega em até 30 min garantida.
            </li>
            <li className="flex items-center gap-3 text-sm font-medium">
               <div className="w-2 h-2 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.5)]" /> Acesso antecipado a novos sabores.
            </li>
          </ul>
        </div>
      </div>

      <AnimatePresence>
        {showMap && (
          <LocationPicker 
            onClose={() => setShowMap(false)}
            onLocationSelected={handleUpdateLocation}
            initialLocation={user?.latitude && user?.longitude ? { lat: Number(user.latitude), lng: Number(user.longitude) } : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
