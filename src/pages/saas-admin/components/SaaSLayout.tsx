import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Store, 
  CreditCard, 
  Layers, 
  FileText, 
  Settings, 
  Shield, 
  Activity, 
  Search, 
  Bell, 
  Menu, 
  X,
  Sun,
  Moon,
  ChevronDown,
  User,
  LogOut,
  Zap,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';
import { supabase } from '../../../supabase';

interface SaaSLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const SaaSLayout: React.FC<SaaSLayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'companies', label: 'Empresas', icon: Store },
    { id: 'financial', label: 'Financeiro', icon: CreditCard },
    { id: 'plans', label: 'Planos SaaS', icon: Layers },
    { id: 'logs', label: 'Logs & Auditoria', icon: FileText },
    { id: 'team', label: 'Equipe Interna', icon: Shield },
    { id: 'system', label: 'Status do Sistema', icon: Activity },
    { id: 'settings', label: 'Configurações', icon: Settings },
    { id: 'fix-rls', label: 'Reparar Sistema', icon: Shield },
  ];

  return (
    <div className={cn(
      "min-h-screen flex transition-colors duration-300",
      isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
    )}>
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(true)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-50 w-72 transform transition-all duration-300 ease-in-out border-r shrink-0",
        isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xl shadow-slate-200/50",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:w-20"
      )}>
        <div className="h-full flex flex-col p-4">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 mb-10 mt-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
              <Zap size={24} fill="currentColor" />
            </div>
            {isSidebarOpen && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-black text-2xl tracking-tighter"
              >
                AP<span className="text-indigo-600">DELIVERY</span>
              </motion.div>
            )}
          </div>

          {/* Nav Links */}
          <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm relative group",
                  activeTab === item.id 
                    ? (isDarkMode ? "bg-indigo-600/10 text-indigo-400" : "bg-indigo-50 text-indigo-600")
                    : "text-slate-500 hover:bg-slate-100/50"
                )}
              >
                {activeTab === item.id && (
                  <motion.div 
                    layoutId="activeNav"
                    className="absolute left-0 w-1 h-6 bg-indigo-600 rounded-r-full"
                  />
                )}
                <item.icon size={20} className={cn("shrink-0 transition-transform group-hover:scale-110", activeTab === item.id && "scale-110")} />
                {isSidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* Bottom Footer */}
          <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
             <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all font-bold text-sm">
                <LogOut size={20} />
                {isSidebarOpen && <span>Sair do Painel</span>}
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className={cn(
          "h-20 flex items-center justify-between px-6 border-b shrink-0 z-30 sticky top-0",
          isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-slate-100",
          "backdrop-blur-md"
        )}>
          <div className="flex items-center gap-4">
            <button 
              title={isSidebarOpen ? "Recolher Menu" : "Expandir Menu"}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 rounded-xl hover:bg-slate-100 transition-colors hidden md:block"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 rounded-2xl w-64 md:w-96 border border-transparent focus-within:border-indigo-500/50 transition-all">
              <Search size={18} className="text-slate-400" />
              <input 
                placeholder="Buscar em todo o SaaS..."
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            <button 
              title={isDarkMode ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button title="Notificações" className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 relative transition-all">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
            </button>

            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 p-1 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-indigo-200 dark:shadow-none">
                  <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center text-white font-black text-xs uppercase">
                    SA
                  </div>
                </div>
                <div className="hidden md:block text-left mr-2">
                   <p className="text-xs font-black tracking-tight leading-none uppercase">Super Admin</p>
                   <p className="text-[10px] text-slate-500 font-bold opacity-70">Ajeu PATY</p>
                </div>
                <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isProfileOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl p-2 z-50 overflow-hidden"
                  >
                    {[
                      { icon: User, label: 'Meu Perfil' },
                      { icon: Globe, label: 'Logs Globais' },
                      { icon: LogOut, label: 'Sair do Sistema', color: 'text-red-500 hover:bg-red-50' }
                    ].map((item, idx) => (
                      <button 
                        key={idx}
                        onClick={item.label === 'Sair do Sistema' ? handleLogout : undefined}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                          item.color || "hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                      >
                        <item.icon size={18} />
                        {item.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
};
