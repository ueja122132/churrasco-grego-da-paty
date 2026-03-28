import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  Store, 
  Rocket,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { supabase } from "../supabase";
import { cn } from "../lib/utils";
import { useLocation } from "react-router-dom";

export const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isPartner = searchParams.get('type') === 'partner';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    storeName: '',
    storeSlug: ''
  });
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Create User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { 
            name: formData.name,
            phone: formData.phone
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário");

      // 2. Create Organization (ONLY if partner)
      if (isPartner) {
        const res = await fetch('/api/organizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.storeName,
            slug: formData.storeSlug,
            owner_id: authData.user.id
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Erro ao criar loja");
        }
      }

      navigate('/login');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white overflow-hidden relative py-20">
      {/* Glow Effects */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[120px] rounded-full" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Rocket className="text-white" size={20} />
            </div>
            <span className="text-2xl font-black tracking-tighter italic">PATY</span>
          </Link>
          <h2 className="text-3xl font-black mb-2 tracking-tight">
            {isPartner ? 'Mude seu jogo.' : 'Crie sua conta.'}
          </h2>
          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.3em]">
            {isPartner ? 'Crie sua infraestrutura em segundos' : 'Peça o melhor churrasco agora'}
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[3rem] shadow-2xl">
          <form onSubmit={handleRegister} className="space-y-5">
             <div className="space-y-1">
               <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Seu Nome</label>
               <div className="relative">
                 <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                 <input 
                   required
                   value={formData.name}
                   onChange={e => setFormData({...formData, name: e.target.value})}
                   className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-slate-600" 
                   placeholder="Nome Completo" 
                 />
               </div>
             </div>

             <div className="space-y-1">
               <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Email</label>
               <div className="relative">
                 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                 <input 
                   required
                   type="email"
                   value={formData.email}
                   onChange={e => setFormData({...formData, email: e.target.value})}
                   className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-slate-600" 
                   placeholder="seu@negocio.com" 
                 />
               </div>
             </div>

             <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">WhatsApp / Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input 
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-slate-600" 
                    placeholder="(00) 0 0000-0000" 
                  />
                </div>
              </div>

             <div className="space-y-1">
               <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Senha</label>
               <div className="relative">
                 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                 <input 
                   required
                   type="password"
                   value={formData.password}
                   onChange={e => setFormData({...formData, password: e.target.value})}
                   className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-slate-600" 
                   placeholder="••••••••" 
                 />
               </div>
             </div>

             {isPartner && (
               <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Nome Loja</label>
                     <input required={isPartner} value={formData.storeName} onChange={e => setFormData({...formData, storeName: e.target.value})} className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" placeholder="Ex: Burger" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">URL (Slug)</label>
                     <input required={isPartner} value={formData.storeSlug} onChange={e => setFormData({...formData, storeSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm text-indigo-400" placeholder="slug" />
                  </div>
               </div>
             )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4.5 bg-gradient-to-r from-indigo-500 to-emerald-600 text-white rounded-3xl font-black uppercase tracking-[0.2em] text-xs hover:scale-[1.02] transition-all shadow-2xl shadow-indigo-900/50 disabled:opacity-50 mt-4"
            >
              {loading ? 'Processando...' : 'Começar Agora →'}
            </button>
          </form>

          <p className="text-center mt-8 text-slate-500 text-[11px] font-bold space-y-2 flex flex-col items-center">
            <span>
              Já tem uma conta? {' '}
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300 underline decoration-indigo-500/30 underline-offset-4">Fazer Login</Link>
            </span>
            <Link 
              to={isPartner ? "/register" : "/register?type=partner"} 
              className="text-slate-400 hover:text-white transition-colors"
            >
              {isPartner ? "Quero apenas fazer pedidos (Sou Cliente)" : "Quero criar minha própria loja (Sou Parceiro)"}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
