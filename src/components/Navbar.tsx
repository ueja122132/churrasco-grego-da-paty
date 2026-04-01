import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from "react-router-dom";
import { SUPER_ADMIN_EMAIL } from '../App';
import { 
  ShoppingBag, 
  ChefHat, 
  Truck, 
  Settings, 
  History, 
  User, 
  LogOut, 
  LogIn, 
  UserPlus,
  DollarSign,
  Bike,
  ShieldCheck,
  Menu,
  X
} from "lucide-react";
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { socket } from '../supabase';
import { motion, AnimatePresence } from 'framer-motion';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { org } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isCourier = user?.role === 'courier';

  const allNavItems = [
    { id: 'store', label: 'Cardápio', icon: ShoppingBag, path: '/', show: !!org && !isCourier, primary: true },
    { id: 'history', label: 'Pedidos', icon: History, path: '/history', show: !!org && !!user && !isAdmin && !isCourier, primary: true },
    { id: 'profile', label: 'Perfil', icon: User, path: '/profile', show: !!user, primary: true },
    { id: 'admin', label: 'Cozinha', icon: ChefHat, path: '/kitchen', show: isAdmin, primary: true },
    { id: 'delivery', label: 'Entregas', icon: Truck, path: '/delivery', show: isAdmin, primary: true },
    { id: 'finance', label: 'Dinheiro', icon: DollarSign, path: '/finance', show: isAdmin, primary: false },
    { id: 'settings', label: 'Painel', icon: Settings, path: '/admin', show: isAdmin, primary: false },
    { id: 'courier', label: 'Modo Motoboy', icon: Bike, path: '/courier', show: isCourier || isAdmin, primary: isCourier },
    { id: 'saas', label: 'Portal SaaS', icon: ShieldCheck, path: '/saas', show: user?.role === 'super_admin' && user?.email === SUPER_ADMIN_EMAIL, primary: false },
  ];

  const visibleItems = allNavItems.filter(item => item.show);
  
  // No mobile, mostramos apenas os itens marcados como 'primary' na barra principal (máximo 3) + Botão "Mais"
  const primaryMobileItems = visibleItems.filter(item => item.primary).slice(0, 3);
  const secondaryMobileItems = visibleItems.filter(item => !primaryMobileItems.find(p => p.id === item.id));

  const NavItem = ({ item, onClick, isActiveOverride }: { item: any, onClick?: () => void, isActiveOverride?: boolean, key?: string | number }) => {
    const Icon = item.icon;
    const isActive = isActiveOverride ?? (location.pathname === item.path);
    return (
      <Link
        to={item.path}
        onClick={() => {
          setIsMenuOpen(false);
          if (onClick) onClick();
        }}
        className={cn(
          "flex flex-col md:flex-row items-center justify-center md:w-14 md:h-14 rounded-2xl transition-all gap-1 md:gap-0 btn-premium relative",
          isActive ? "text-brand-secondary md:bg-brand-primary/10" : "text-slate-400 hover:text-slate-600 md:hover:bg-white/50"
        )}
      >
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
        <span className={cn("text-[9px] md:hidden font-bold truncate max-w-[60px]", isActive ? "text-brand-secondary" : "text-slate-400")}>
          {item.label}
        </span>
        {isActive && (
          <motion.div 
            layoutId="activeTab"
            className="absolute -bottom-1 w-1 h-1 bg-brand-secondary rounded-full md:hidden"
          />
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Barra de Navegação Principal */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 md:top-0 md:bottom-auto md:left-0 md:w-20 md:h-full z-[60] flex md:flex-col items-center justify-around md:justify-start md:py-8 md:gap-8 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:shadow-none transition-all duration-500",
        isCourier ? "glass-dark border-white/5 md:border-r" : "glass border-t md:border-t-0 md:border-r border-white/20"
      )}>
        <div className="hidden md:block h-8" />
        
        <Link 
          to="/start" 
          title="Home"
          className="hidden md:flex w-12 h-12 bg-brand-secondary rounded-2xl items-center justify-center text-white shadow-glow mb-4 scale-90 hover:scale-110 transition-transform btn-premium"
        >
          <ShoppingBag size={24} />
        </Link>

        {/* Desktop: Todos os itens | Mobile: Apenas Primários */}
        <div className="flex md:flex-col items-center justify-around w-full md:w-auto md:gap-6">
          {/* Mobile View logic */}
          <div className="flex md:hidden items-center justify-around w-full">
            {primaryMobileItems.map(item => <NavItem key={item.id} item={item} />)}
            
            {/* Botão "Mais" apenas no Mobile */}
            {secondaryMobileItems.length > 0 && (
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Mais opções"
                className={cn(
                  "flex flex-col items-center justify-center transition-all gap-1 btn-premium relative",
                  isMenuOpen ? "text-brand-secondary" : "text-slate-400"
                )}
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                <span className="text-[9px] font-bold">Mais</span>
              </button>
            )}
          </div>

          {/* Desktop View logic (Md and up) */}
          <div className="hidden md:flex md:flex-col items-center md:gap-6">
            {visibleItems.map(item => <NavItem key={item.id} item={item} />)}
          </div>
        </div>

        <div className="md:mt-auto hidden md:flex md:flex-col items-center gap-4">
          {user ? (
            <button 
              onClick={logout}
              aria-label="Sair"
              className="flex flex-col md:flex-row items-center justify-center md:w-12 md:h-12 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all gap-1 btn-premium"
            >
              <LogOut size={24} />
            </button>
          ) : (
            <Link 
              to="/login"
              aria-label="Fazer login"
              className="flex flex-col md:flex-row items-center justify-center md:w-12 md:h-12 rounded-2xl text-slate-400 hover:text-brand-secondary hover:bg-brand-primary/10 transition-all gap-1 btn-premium"
            >
              <LogIn size={24} />
            </Link>
          )}
          <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]" : "bg-red-500 animate-pulse")} title={isConnected ? "Conectado" : "Desconectado"} />
        </div>
      </nav>


      {/* Menu "Mais" Overlay (Mobile Only Bottom Sheet) */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] md:hidden"
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-[72px] left-4 right-4 z-[58] md:hidden"
            >
              <div className="glass-dark border border-white/10 rounded-3xl p-4 shadow-2xl overflow-hidden overflow-y-auto max-h-[60vh]">
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2 ml-2">Explorar</p>
                  <div className="grid grid-cols-2 gap-2">
                    {secondaryMobileItems.map(item => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.id}
                          to={item.path}
                          onClick={() => setIsMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 p-4 rounded-2xl transition-all",
                            isActive ? "bg-brand-secondary/20 text-brand-secondary" : "bg-white/5 text-slate-300 hover:bg-white/10"
                          )}
                        >
                          <Icon size={20} />
                          <span className="text-sm font-bold">{item.label}</span>
                        </Link>
                      );
                    })}
                    
                    {user && (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          logout();
                        }}
                        className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 text-red-400 col-span-2 border border-red-500/20"
                      >
                        <LogOut size={20} />
                        <span className="text-sm font-bold">Sair da Conta</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

