import React, { useState, useEffect } from 'react';
import { 
  Rocket, 
  Check, 
  ShieldCheck, 
  Globe, 
  Smartphone, 
  Zap, 
  ArrowRight, 
  User, 
  Store, 
  Mail, 
  Lock, 
  QrCode, 
  Layout, 
  Clock, 
  Heart,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from "motion/react";
import { useNotification } from "../context/NotificationContext";
import { supabase } from "../supabase";
import { cn } from "../lib/utils";
import { Link, useNavigate } from "react-router-dom";

const SAAS_PLANS = [
  {
    id: 'free',
    name: 'Essencial Free',
    price: 0,
    desc: 'Para quem está começando seu império',
    color: 'slate',
    features: ['Até 5 produtos ativos', 'Gestão de pedidos básica', 'Link personalizado da loja', 'Relatórios diários']
  },
  {
    id: 'pro',
    name: 'Professional Pro',
    price: 97,
    desc: 'O kit completo para crescer rápido',
    color: 'indigo',
    popular: true,
    features: ['Produtos ILIMITADOS', 'Configuração de entregadores', 'Métricas avançadas', 'Suporte prioritário via WhatsApp', 'Controle de adicionais']
  },
  {
    id: 'enterprise',
    name: 'Rede Enterprise',
    price: 297,
    desc: 'Poder total para expansão em massa',
    color: 'purple',
    features: ['Múltiplas lojas (até 3)', 'API para integrações', 'Gerente de conta dedicado', 'Customização total de tema', 'Dashboard de rede']
  }
];

export const SubscribePage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'plans' | 'register' | 'payment' | 'success'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    storeName: '',
    storeSlug: ''
  });
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<any>(null);

  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan);
    setStep('register');
  };

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

      // 2. Create Organization
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.storeName,
          slug: formData.storeSlug,
          owner_id: authData.user.id,
          plan_id: selectedPlan.id
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao criar loja");
      }

      const org = await res.json();

      if (selectedPlan.price > 0) {
        // Generate PIX
        const pixRes = await fetch(`/api/organizations/${org.id}/billing/pix`, { method: 'POST' });
        if (pixRes.ok) {
          setPixData(await pixRes.json());
          setStep('payment');
        } else {
          setStep('success'); // Fallback if payment generation fails
        }
      } else {
        setStep('success');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <header className="text-center mb-16">
          <Link to="/" className="inline-flex items-center gap-2 mb-8 group">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Rocket className="text-white" size={20} />
            </div>
            <span className="text-2xl font-black tracking-taller italic">PATY STORE</span>
          </Link>
          
          <h1 className="text-5xl md:text-6xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-500">
            Comece a Transformar seu <br />
            <span className="text-indigo-500 italic">Negócio hoje.</span>
          </h1>
          
          {/* Progress Stepper */}
          <div className="flex items-center justify-center gap-3 mt-12">
            {[
              { id: 'plans', label: 'Planos' },
              { id: 'register', label: 'Cadastro' },
              { id: 'payment', label: 'Pagamento' }
            ].map((s, idx) => (
              <React.Fragment key={s.id}>
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all",
                  step === s.id ? "bg-indigo-600 text-white scale-110" : "bg-white/5 text-slate-500"
                )}>
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px]", step === s.id ? "bg-white text-indigo-600" : "bg-slate-800")}>
                    {idx + 1}
                  </div>
                  {s.label}
                </div>
                {idx < 2 && <div className="w-8 h-[2px] bg-white/5" />}
              </React.Fragment>
            ))}
          </div>
        </header>

        {/* Plans Step */}
        {step === 'plans' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-3 gap-8">
            {SAAS_PLANS.map(plan => (
              <div key={plan.id} className={cn(
                "group relative p-8 rounded-[2.5rem] border-2 transition-all hover:-translate-y-2",
                plan.popular ? "bg-indigo-950/20 border-indigo-500 shadow-2xl shadow-indigo-900/20" : "bg-white/5 border-white/10 hover:border-white/20"
              )}>
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Mais Popular
                  </div>
                )}
                
                <h3 className="text-2xl font-black mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-black">R$ {plan.price}</span>
                  <span className="text-slate-500 text-sm font-bold">/mês</span>
                </div>
                <p className="text-slate-400 text-sm mb-8">{plan.desc}</p>
                
                <ul className="space-y-4 mb-10">
                  {plan.features.map(feat => (
                    <li key={feat} className="flex items-start gap-3 text-sm text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="text-emerald-500" size={12} strokeWidth={4} />
                      </div>
                      {feat}
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => handleSelectPlan(plan)}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl",
                    plan.popular ? "bg-white text-slate-950 hover:bg-slate-100" : "bg-indigo-600 text-white hover:bg-indigo-700"
                  )}
                >
                  SelecionarPlano
                </button>
              </div>
            ))}
          </motion.div>
        )}

        {/* Register Step */}
        {step === 'register' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto">
            <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] backdrop-blur-xl">
              <form onSubmit={handleRegister} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Seu Nome</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        required
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" 
                        placeholder="Nome Completo" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Email Profissional</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        required
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold font-mono" 
                        placeholder="email@servico.com" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">WhatsApp / Telefone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        required
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" 
                        placeholder="(00) 0 0000-0000" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Senha de Acesso</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      required
                      type="password"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" 
                      placeholder="Mínimo 6 caracteres" 
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Nome da Loja</label>
                      <div className="relative">
                        <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          required
                          value={formData.storeName}
                          onChange={e => setFormData({...formData, storeName: e.target.value})}
                          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" 
                          placeholder="Hamburgueria do Vale" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">URL da Loja</label>
                      <div className="flex bg-white/5 border border-white/10 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                        <span className="px-4 py-4 bg-white/5 text-slate-500 text-xs font-black self-center">/</span>
                        <input 
                          required
                          value={formData.storeSlug}
                          onChange={e => setFormData({...formData, storeSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                          className="flex-1 pr-4 py-4 bg-transparent outline-none font-black text-indigo-400" 
                          placeholder="minha-loja" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-3xl font-black uppercase tracking-[0.2em] text-sm hover:scale-[1.02] transition-all shadow-2xl shadow-indigo-900/50 disabled:opacity-50"
                >
                  {loading ? 'Processando...' : 'Criar minha Loja →'}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* Payment Step */}
        {step === 'payment' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
            <div className="bg-white p-8 rounded-[3rem] text-slate-900 text-center shadow-2xl border-4 border-indigo-500/20">
              <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-200">
                <QrCode size={32} />
              </div>
              <h2 className="text-3xl font-black mb-2">Pague com PIX</h2>
              <p className="text-slate-500 text-sm mb-8">Copie o código abaixo ou escaneie o QR Code no seu banco.</p>
              
              <div className="bg-slate-100 p-6 rounded-3xl mb-8 border border-slate-200">
                <img src={`data:image/png;base64,${pixData.qr_code_base64}`} className="w-full aspect-square rounded-2xl shadow-sm mb-4" alt="QR Code" />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(pixData.qr_code);
                    alert("Copiado!");
                  }}
                  className="w-full py-3 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors"
                >
                  Copiar Código PIX
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-indigo-600 font-bold animate-pulse">
                <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                Aguardando confirmação...
              </div>
              <p className="text-slate-400 text-[10px] mt-4">Valor: R$ {pixData.amount?.toFixed(2)} · Plano {selectedPlan?.name}</p>
            </div>
          </motion.div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto text-center">
            <div className="bg-gradient-to-b from-emerald-900/30 to-emerald-950/30 border border-emerald-500/30 rounded-[3rem] p-12 backdrop-blur-xl">
              <div className="w-20 h-20 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 text-4xl shadow-2xl shadow-emerald-500/20">
                🎉
              </div>
              <h2 className="text-3xl font-black text-white mb-3">Tudo Pronto!</h2>
              <p className="text-slate-400 mb-8">Sua loja foi criada com sucesso. Você já pode fazer login e começar a vender.</p>
              <Link to="/login">
                <button className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black rounded-3xl hover:shadow-2xl hover:shadow-emerald-500/20 transition-all uppercase tracking-widest text-sm">
                  Acessar Painel →
                </button>
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
