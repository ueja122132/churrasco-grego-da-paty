import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from "react-router-dom";
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
  Bike
} from "lucide-react";
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { socket } from '../supabase';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { org } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [isConnected, setIsConnected] = useState(socket.connected);

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

  const navItems = [
    { id: 'store', label: 'Cardápio', icon: ShoppingBag, path: '/', show: !!org && !isCourier },
    { id: 'history', label: 'Meus Pedidos', icon: History, path: '/history', show: !!org && !!user && !isAdmin && !isCourier },
    { id: 'profile', label: 'Meu Perfil', icon: User, path: '/profile', show: !!user },
    { id: 'admin', label: 'Cozinha', icon: ChefHat, path: '/kitchen', show: isAdmin },
    { id: 'delivery', label: 'Entregas', icon: Truck, path: '/delivery', show: isAdmin },
    { id: 'finance', label: 'Financeiro', icon: DollarSign, path: '/finance', show: isAdmin },
    { id: 'settings', label: 'Painel', icon: Settings, path: '/admin', show: isAdmin },
    { id: 'courier', label: isCourier ? 'Entregas' : 'Modo Entregador', icon: Bike, path: '/courier', show: isCourier || isAdmin },
  ];

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 md:top-0 md:bottom-auto md:left-0 md:w-20 md:h-full z-50 flex md:flex-col items-center justify-around md:justify-start md:py-8 md:gap-8 px-2 py-3 shadow-lg md:shadow-none transition-all duration-500",
      isCourier ? "glass-dark border-white/5 md:border-r" : "glass border-t md:border-t-0 md:border-r border-white/20"
    )}>
      <div className="hidden md:block h-8" /> {/* Espaçador no topo */}

      {/* Ícone de Vendas do App (Landing Page) */}
      <Link 
        to="/start" 
        title="Venda do App"
        className="hidden md:flex w-12 h-12 bg-brand-secondary rounded-2xl items-center justify-center text-white shadow-glow mb-4 scale-90 hover:scale-110 transition-transform btn-premium"
      >
        <ShoppingBag size={24} />
      </Link>

      {navItems.filter(item => item.show).map(item => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.id}
            to={item.path}
            className={cn(
              "flex flex-col md:flex-row items-center justify-center md:w-12 md:h-12 rounded-2xl transition-all gap-1 md:gap-0 btn-premium",
              isActive ? "text-brand-secondary md:bg-brand-primary/10" : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
            )}
          >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span className={cn("text-[10px] md:hidden font-bold", isActive ? "text-brand-secondary" : "text-slate-400")}>{item.label}</span>
          </Link>
        );
      })}

      <div className="md:mt-auto flex md:flex-col items-center gap-4">
        {user ? (
          <button 
            onClick={logout}
            className="flex flex-col md:flex-row items-center justify-center md:w-12 md:h-12 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all gap-1 btn-premium"
          >
            <LogOut size={24} />
            <span className="text-[10px] md:hidden font-bold">Sair</span>
          </button>
        ) : (
          <Link 
            to="/login"
            className="flex flex-col md:flex-row items-center justify-center md:w-12 md:h-12 rounded-2xl text-slate-400 hover:text-brand-secondary hover:bg-brand-primary/10 transition-all gap-1 btn-premium"
          >
            <LogIn size={24} />
            <span className="text-[10px] md:hidden font-bold">Login</span>
          </Link>
        )}
        <div className={cn("w-2 h-2 rounded-full hidden md:block", isConnected ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]" : "bg-red-500 animate-pulse")} title={isConnected ? "Conectado" : "Desconectado"} />
      </div>
    </nav>
  );
};
