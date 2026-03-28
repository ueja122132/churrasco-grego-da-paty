import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Store, 
  Smartphone, 
  Zap, 
  Globe, 
  CheckCircle2, 
  UserPlus 
} from 'lucide-react';
import { motion } from "motion/react";
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export const OrgManagePage = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [userOrgs, setUserOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/user/${user.id}/organizations`)
      .then(r => r.json())
      .then(data => {
        setUserOrgs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const createOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    // Logic for creating organization
    notify("Funcionalidade em desenvolvimento", "info");
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 md:pt-8">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
          <Store size={36} className="text-indigo-600" />
          Minhas Lojas
        </h1>
        <p className="text-gray-500 mt-2 font-bold">Gerencie todas as suas instâncias do Churrasco Grego</p>
      </header>

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {userOrgs.map(org => (
          <motion.div 
            whileHover={{ y: -5 }}
            key={org.id} 
            className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center text-white text-2xl shadow-lg shadow-indigo-100">
                {org.branding?.logoUrl ? <img src={org.branding.logoUrl} className="w-full h-full object-contain p-2" alt="" /> : "🍔"}
              </div>
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase",
                org.subscription_status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              )}>
                {org.subscription_status || 'Inativo'}
              </span>
            </div>

            <h2 className="text-2xl font-black text-gray-900 mb-1">{org.name}</h2>
            <p className="text-blue-600 font-bold text-sm mb-6 flex items-center gap-1">
              <Globe size={14} /> patystore.com.br/{org.slug}
            </p>

            <div className="flex gap-2">
              <a 
                href={`/${org.slug}/admin`}
                className="flex-1 py-3 bg-gray-900 text-white text-center rounded-2xl font-bold text-sm hover:bg-black transition-colors"
              >
                Gerenciar Painel
              </a>
              <a 
                href={`/${org.slug}`}
                target="_blank"
                className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-colors"
              >
                <Zap size={20} />
              </a>
            </div>
          </motion.div>
        ))}

        <button 
          onClick={() => notify("Novo plano necessário para criar mais lojas", "warning")}
          className="border-4 border-dashed border-gray-100 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-gray-300 hover:border-indigo-200 hover:text-indigo-400 transition-all gap-4"
        >
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
            <Plus size={32} />
          </div>
          <span className="font-black uppercase tracking-widest text-sm text-center">Adicionar Nova Loja</span>
        </button>
      </div>

      <div className="bg-indigo-900 p-8 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-indigo-200 relative overflow-hidden">
        <div className="relative z-10 text-center md:text-left">
           <h3 className="text-2xl font-black mb-2">Quer expandir seu negócio?</h3>
           <p className="text-indigo-200 font-medium max-w-sm">No plano Enterprise você pode gerenciar até 3 lojas simultaneamente com o mesmo login.</p>
        </div>
        <button className="relative z-10 px-8 py-4 bg-white text-indigo-900 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-all shadow-xl">
           Ver Planos
        </button>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
