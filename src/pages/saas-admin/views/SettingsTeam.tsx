import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  Settings, 
  Activity, 
  Globe, 
  Mail, 
  Key, 
  Zap, 
  Server, 
  Database,
  Cpu,
  MoreVertical,
  Plus,
  Trash2,
  Lock,
  Wifi
} from 'lucide-react';
import { supabase } from '../../../supabase';
import { cn } from '../../../lib/utils';
import { motion } from 'framer-motion';

export const TeamView: React.FC = () => {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
      async function getAuth() {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          setUser({ ...data.user, ...profile });
        }
      }
      getAuth();
    }, []);

    const members = [
      { 
        name: user?.full_name || user?.email?.split('@')[0] || 'Ajeu PATY', 
        role: user?.role === 'super_admin' ? 'Super Admin' : 'Administrador', 
        email: user?.email || 'admin@apdelivery.com', 
        status: 'online' 
      },
      { name: 'Suporte AP (Auto)', role: 'Bot Suporte', email: 'help@apdelivery.com', status: 'online' },
    ];
  
    return (
      <div className="space-y-8 min-h-screen">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tighter flex items-center gap-2 uppercase italic">
               <Shield size={24} className="text-indigo-600" />
               Equipe Interna
            </h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-0.5 italic">Gestão de acessos administrativos do SaaS</p>
          </div>
  
          <button className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs shadow-lg shadow-indigo-200 hover:translate-y-[-2px] transition-all">
            <Plus size={18} />
            Novo Membro
          </button>
        </div>
  
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {members.map((member, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative group overflow-hidden">
                 <div className="flex items-center justify-between mb-8">
                    <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-inner group-hover:scale-110 transition-transform">
                       <div className="w-full h-full p-3 grayscale group-hover:grayscale-0 transition-all opacity-40 group-hover:opacity-100">
                          <Users size={28} className="text-indigo-600" />
                       </div>
                    </div>
                    <div className={cn(
                       "w-3 h-3 rounded-full border-4 border-white dark:border-slate-900",
                       member.status === 'online' ? "bg-emerald-500 shadow-lg shadow-emerald-200" : "bg-slate-300"
                    )} />
                 </div>
  
                 <h4 className="text-xl font-black italic tracking-tighter uppercase">{member.name}</h4>
                 <div className="flex items-center gap-2 mb-4">
                    <span className={cn(
                       "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                       member.role.includes('Super') ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                    )}>
                       {member.role}
                    </span>
                    <span className="text-[10px] font-black text-slate-300 uppercase italic">Acesso Ativo</span>
                 </div>
  
                 <p className="text-xs font-bold text-slate-400 mb-8">{member.email}</p>
  
                 <div className="pt-6 border-t border-slate-50 dark:border-slate-800 grid grid-cols-2 gap-3 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all translate-y-4">
                    <button className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-100 transition-all">Editar</button>
                    <button className="p-3 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-red-100 transition-all">Revogar</button>
                 </div>
              </div>
           ))}
        </div>
      </div>
    );
};
  
export const SystemView: React.FC = () => {
    return (
      <div className="space-y-8 min-h-screen">
        <div>
          <h2 className="text-2xl font-black tracking-tighter flex items-center gap-2 uppercase italic">
             <Activity size={24} className="text-emerald-500" />
             Monitoramento Global
          </h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-0.5 italic">Integridade técnica do ecossistema em tempo real</p>
        </div>
  
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[
             { label: 'Status da API', status: 'Online', val: '28ms', icon: Server, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
             { label: 'Uptime (30d)', status: 'Saudável', val: '99.99%', icon: Wifi, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30' },
             { label: 'Banco de Dados', status: 'Conectado', val: 'Supabase', icon: Database, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
           ].map((m, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group">
                 <div className="flex items-center justify-between mb-8">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", m.bg, m.color)}>
                       <m.icon size={28} />
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 italic">{m.label}</p>
                       <p className="text-2xl font-black italic tracking-tight uppercase">{m.val}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full animate-pulse", m.color.replace('text', 'bg'))} />
                    <span className={cn("text-xs font-black uppercase tracking-widest italic", m.color)}>{m.status}</span>
                 </div>
              </div>
           ))}
        </div>
  
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-10">
           <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl font-black italic tracking-tighter uppercase">Carga do Cluster (Supabase Edge)</h3>
              <div className="flex gap-2">
                 <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-300"><MoreVertical size={18} /></div>
              </div>
           </div>
           
           <div className="space-y-10">
              {[
                { label: 'Requisições / Segundo', val: 12, max: 100, color: 'bg-indigo-600' },
                { label: 'Uso de Banco (CPU)', val: 5, max: 100, color: 'bg-purple-600' },
                { label: 'Armazenamento de Mídia', val: 34, max: 100, color: 'bg-blue-600' },
              ].map((bar, idx) => (
                 <div key={idx} className="space-y-3">
                    <div className="flex items-center justify-between">
                       <p className="text-[11px] font-black uppercase text-slate-500 italic">{bar.label}</p>
                       <p className="text-sm font-black italic">{bar.val}%</p>
                    </div>
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${bar.val}%` }}
                         transition={{ delay: 0.5 + (idx * 0.1), duration: 1 }}
                         className={cn("h-full rounded-full shadow-lg", bar.color)}
                       />
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </div>
    );
};
  
export const SettingsView: React.FC = () => {
    return (
      <div className="space-y-10 pb-20 min-h-screen">
        <div>
          <h2 className="text-2xl font-black tracking-tighter flex items-center gap-2 uppercase italic">
             <Settings size={24} className="text-indigo-600" />
             Configurações Globais
          </h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-0.5 italic">Parâmetros de controle da plataforma APDelivery</p>
        </div>
  
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* General Settings */}
           <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
              <h4 className="text-lg font-black uppercase italic tracking-tighter mb-4 flex items-center gap-2">
                 <Globe size={20} className="text-blue-500" />
                 Identidade & App
              </h4>
              
              <div className="space-y-4">
                 {[
                   { label: 'Nome da Plataforma', val: 'APDelivery SaaS', icon: Zap },
                   { label: 'Host Principal', val: 'apdelivery.com.br', icon: Globe },
                   { label: 'Suporte Oficial', val: 'suporte@apdelivery.com.br', icon: Mail },
                 ].map((field, idx) => (
                    <div key={idx} className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">{field.label}</label>
                       <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                          <field.icon size={18} className="text-slate-400" />
                          <input title={field.label} className="bg-transparent border-none outline-none font-black text-xs w-full" defaultValue={field.val} />
                       </div>
                    </div>
                 ))}
              </div>
           </div>
  
           {/* Security / APIs */}
           <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
              <h4 className="text-lg font-black uppercase italic tracking-tighter mb-4 flex items-center gap-2">
                 <Key size={20} className="text-amber-500" />
                 Conexão Supabase
              </h4>
              
              <div className="space-y-6">
                 {[
                   { label: 'Project Status', val: 'wzpriuuxrnbjkkoiskvw (Active)', hidden: false },
                   { label: 'Region', val: 'South America (Sao Paulo)', hidden: false },
                   { label: 'Postgres Version', val: '15.1 (Supabase)', hidden: false },
                 ].map((field, idx) => (
                    <div key={idx} className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic">{field.label}</label>
                       <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                          <Lock size={16} className="text-slate-400" />
                          <input readOnly title={field.label} className="bg-transparent border-none outline-none font-black text-xs w-full opacity-60 flex-1" value={field.val} />
                       </div>
                    </div>
                 ))}
              </div>
              
              <div className="pt-6 border-t border-slate-50 dark:border-slate-800">
                 <button className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-200 dark:shadow-none hover:translate-y-[-4px] transition-all italic">
                    Salvar Alterações do SaaS
                 </button>
              </div>
           </div>
        </div>
      </div>
    );
};
