import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Store, 
  Rocket,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import { useNotification } from "../context/NotificationContext";
import { supabase } from "../supabase";
import { cn } from "../lib/utils";

export const LoginPage = () => {
  const { org } = useTenant();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRecuperar, setShowRecuperar] = useState(false);
  const [recuperarId, setRecuperarId] = useState("");
  const [recoverPassword, setRecoverPassword] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);

  const tryCustomLogin = async (credentials: any) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Credenciais inválidas");
    }
    
    const data = await res.json();
    login(data); // Using the object returned by the API
    return data;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalRole = 'user';

      if (email.includes('@')) {
        // Tenta Supabase Auth Primeiro
        const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
           // Se falhar, tenta nossa API (pode ser um perfil sem conta auth)
           const customUser = await tryCustomLogin({ email, password });
           finalRole = (customUser as any).role || 'user';
        } else if (authData.user) {
           // Se logou pelo Supabase, busca o perfil para saber a Role antes de navegar
           const { data: profile } = await supabase.from('profiles').select('role').eq('id', authData.user.id).single();
           finalRole = profile?.role || 'user';
        }
      } else {
        // Login por telefone - Somente via API Customizada
        const customUser = await tryCustomLogin({ phone: email, password });
        finalRole = (customUser as any).role || 'user';
      }
      
      // Navegação Inteligente Baseada na Role
      if (finalRole === 'super_admin') {
        navigate('/saas');
      } else if (finalRole === 'courier') {
        navigate('/courier');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recoverPassword.length < 6) return alert("A senha deve ter pelo menos 6 dígitos");
    setIsRecovering(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: recuperarId, newPassword: recoverPassword })
      });
      const data = await res.json();
      if (res.ok) {
        alert("Senha redefinida com sucesso! Agora você pode entrar.");
        setShowRecuperar(false);
        setRecuperarId("");
        setRecoverPassword("");
      } else {
        alert(data.error || "Erro ao recuperar");
      }
    } catch (err) {
      alert("Erro ao conectar ao servidor.");
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-white overflow-hidden relative">
      {/* Left Side: Premium Image (Desktop only) */}
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950 z-10" />
        <img 
          src={org?.login_image_url || "/churrasco_premium.png"} 
          alt={org?.name || "Premium Background"} 
          className="w-full h-full object-cover transition-transform duration-[10000ms] group-hover:scale-125" 
        />
        <div className="absolute bottom-12 left-12 z-20 max-w-md">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
             <h1 className="text-6xl font-black tracking-tighter mb-4 leading-none text-white drop-shadow-2xl uppercase">
               {org?.name ? (
                 <><span className="text-orange-500">{org.name}</span> <br/>O MELHOR <br/>DA CIDADE</>
               ) : (
                 <><span className="text-orange-500">CHURRASCO</span> <br/>O MELHOR <br/>DA CIDADE</>
               )}
             </h1>
             <p className="text-slate-300 font-bold text-lg max-w-xs leading-tight opacity-70">
               {org?.description || "Gerencie sua loja com a potência da Paty e escale seu negócio."}
             </p>
          </motion.div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {/* Glow Effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full" />

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md relative z-10">
          <div className="text-center mb-10">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-500/20 overflow-hidden">
                {org?.branding?.logoUrl ? (
                  <img src={org.branding.logoUrl} className="w-full h-full object-contain" alt="Logo" />
                ) : (
                  <Rocket className="text-white" size={24} />
                )}
              </div>
              <span className="text-3xl font-black tracking-tighter italic uppercase">{org?.name || 'PATY'}</span>
            </Link>
            <h2 className="text-4xl font-black mb-2 tracking-tight">Bem-vindo.</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Acesse seu centro de comando</p>
          </div>

          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Email ou Telefone</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    required
                    type="text" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="username"
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold placeholder:text-slate-600 text-white" 
                    placeholder="email@adm.com ou 119..." 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Senha Secreta</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    required
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold placeholder:text-slate-600 text-white" 
                    placeholder="••••••••" 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:translate-y-[-2px] hover:shadow-2xl hover:shadow-orange-500/40 active:translate-y-[0] transition-all disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Entrar Agora'}
              </button>
            </form>

             <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
                   <Link to="/register?type=customer" className="text-orange-500 hover:text-orange-400">Novo aqui? Cadastrar</Link>
                   <Link to="/start" className="text-slate-400 hover:text-white">Seja Parceiro</Link>
                </div>
                <div className="text-center">
                   <button 
                     type="button" 
                     onClick={() => setShowRecuperar(true)}
                     className="text-[9px] text-slate-600 hover:text-slate-500 uppercase tracking-[0.2em] font-bold"
                   >
                     Esqueceu sua senha?
                   </button>
                </div>
             </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showRecuperar && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-white/10 p-10 rounded-[2.5rem] w-full max-w-sm shadow-2xl relative"
            >
              <button onClick={() => setShowRecuperar(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white" title="Fechar" aria-label="Fechar"><X size={20} /></button>
              
              <div className="text-center mb-8">
                <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-orange-500">
                  <Lock size={24} />
                </div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter">Recuperar Senha</h3>
                <p className="text-slate-500 text-[10px] font-bold uppercase mt-2">Crie uma nova senha secreta</p>
              </div>

              <form onSubmit={handleRecuperar} className="space-y-4">
                <div>
                   <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Seu E-mail ou Telefone</label>
                   <input 
                    required 
                    type="text" 
                    value={recuperarId} 
                    onChange={e => setRecuperarId(e.target.value)}
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold text-white text-sm"
                    placeholder="Ex: 62999..."
                   />
                </div>
                <div>
                   <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Nova Senha Escolhida</label>
                   <input 
                    required 
                    type="password" 
                    value={recoverPassword} 
                    onChange={e => setRecoverPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold text-white text-sm"
                    placeholder="Mínimo 6 caracteres"
                   />
                </div>
                <button 
                  type="submit" 
                  disabled={isRecovering}
                  className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50"
                >
                  {isRecovering ? 'Salvando...' : 'Redefinir Senha'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
