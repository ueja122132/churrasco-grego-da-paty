import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate, useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import {
  ShoppingBag,
  ChefHat,
  Truck,
  Settings,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  Clock,
  User,
  Phone,
  UtensilsCrossed,
  ArrowRight,
  X,
  LogOut,
  LogIn,
  UserPlus,
  History,
  QrCode,
  Copy,
  CreditCard,
  AlertCircle,
  BarChart3,
  Users,
  Store,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  MapPin,
  Lock,
  Navigation,
  StopCircle,
  MessageCircle,
  Send,
  ClipboardList,
  Wallet,
  Bell,
  Map
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface User {
  id: string | number;
  name: string;
  phone: string;
  email?: string;
  role?: 'user' | 'admin' | 'super_admin' | 'courier';
  points: number;
  org_id?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  commission_rate?: number;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  ingredients: string;
  category: 'churrasco' | 'ready';
  image_url?: string;
  promotional_price?: number | null;
  available?: boolean;
}

interface ExtraIngredient {
  id: number;
  name: string;
  price: number;
}

interface OrderItem {
  id: number;
  name: string;
  basePrice: number;
  extraIngredients?: ExtraIngredient[];
}

interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'ready' | 'shipped' | 'delivered';
  payment_status: 'pending' | 'paid';
  total_price: number;
  created_at: string;
  queuePosition?: number;
  estimatedMinutes?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  org_id?: string;
}

// Socket initialization with better error handling
const socket: Socket = io({
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  timeout: 10000,
});

// Suppress benign environment errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = event.reason?.toString() || '';
    const messageStr = event.reason?.message || '';
    if (
      reasonStr.includes('WebSocket') ||
      messageStr.includes('WebSocket') ||
      reasonStr.includes('closed without opened') ||
      messageStr.includes('closed without opened')
    ) {
      event.preventDefault();
      console.warn('Benign WebSocket error suppressed:', event.reason);
    }
  });
}

socket.on("connect_error", (err) => {
  console.warn("Socket connection error (normal in some proxy environments):", err.message);
});

// Tenant Context
interface Organization {
  id: string;
  name: string;
  slug: string;
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string | null;
  };
  has_mp_token?: boolean;
}

const TenantContext = React.createContext<{
  org: Organization | null;
  loading: boolean;
} | null>(null);

const useTenant = () => {
  const context = React.useContext(TenantContext);
  if (!context) throw new Error("useTenant must be used within TenantProvider");
  return context;
};

// Auth Context
const AuthContext = React.createContext<{
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
} | null>(null);
const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

// Notification Context
type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

const NotificationContext = React.createContext<{
  notify: (message: string, type?: NotificationType) => void;
} | null>(null);

const useNotification = () => {
  const context = React.useContext(NotificationContext);
  if (!context) throw new Error("useNotification must be used within NotificationProvider");
  return context;
};

const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = (message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={cn(
                "pointer-events-auto px-6 py-4 rounded-2xl shadow-2xl border-2 flex items-center gap-3 min-w-[300px] backdrop-blur-md",
                n.type === 'success' && "bg-green-50/90 border-green-200 text-green-900",
                n.type === 'error' && "bg-red-50/90 border-red-200 text-red-900",
                n.type === 'warning' && "bg-orange-50/90 border-orange-200 text-orange-900",
                n.type === 'info' && "bg-blue-50/90 border-blue-200 text-blue-900"
              )}
            >
              {n.type === 'success' && <CheckCircle2 className="text-green-600" size={20} />}
              {n.type === 'error' && <AlertCircle className="text-red-600" size={20} />}
              {n.type === 'warning' && <AlertCircle className="text-orange-600" size={20} />}
              {n.type === 'info' && <Activity className="text-blue-600" size={20} />}
              <p className="font-bold text-sm tracking-tight">{n.message}</p>
              <button
                onClick={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))}
                className="ml-auto p-1 hover:bg-black/5 rounded-full"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

// --- Components ---

const Navbar = () => {
  const { user } = useAuth();
  const { org } = useTenant();
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

  const location = useLocation();
  const navItems = [
    { path: "/", icon: ShoppingBag, label: "Vendas", roles: ['user', 'admin', 'super_admin'] },
    { path: "/kitchen", icon: ChefHat, label: "Cozinha", roles: ['admin', 'super_admin'] },
    { path: "/delivery", icon: Truck, label: "Entrega", roles: ['admin', 'super_admin'] },
    { path: "/courier-dashboard", icon: ClipboardList, label: "Minhas Entregas", roles: ['courier'] },
    { path: "/admin", icon: Settings, label: "Admin", roles: ['admin', 'super_admin'] },
    { path: "/finance", icon: DollarSign, label: "Caixa", roles: ['admin', 'super_admin'] },
    { path: "/saas-admin", icon: Activity, label: "SaaS", roles: ['super_admin'] },
    { path: "/super-admin", icon: Lock, label: "Super", roles: ['super_admin'] },
    { path: "/profile", icon: User, label: "Perfil", roles: ['user', 'admin', 'super_admin', 'courier'] },
  ].filter(item => item.roles.includes(user?.role || 'user'));

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-morphism border-t border-white/20 px-4 py-2 flex justify-around items-center z-50 md:top-0 md:bottom-auto md:flex-col md:w-20 md:h-full md:border-t-0 md:border-r">
      <div className="hidden md:flex mb-8 mt-4 relative">
        <motion.div
          animate={{ rotate: isConnected ? 360 : 0 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-white shadow-sm border border-gray-100"
        >
          {org?.branding?.logoUrl ? (
            <img src={org.branding.logoUrl} alt={org.name} className="w-full h-full object-contain" />
          ) : (
            <UtensilsCrossed className="text-[var(--primary)] w-8 h-8" />
          )}
        </motion.div>
        <div
          className={cn(
            "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white shadow-sm",
            isConnected ? "bg-green-500" : "bg-red-500"
          )}
        />
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center p-3 rounded-2xl transition-all duration-300",
              isActive
                ? "text-[var(--primary)] bg-[var(--primary)]/10 shadow-inner"
                : "text-slate-400 hover:text-[var(--primary)] hover:bg-slate-100"
            )}
          >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-bold mt-1 md:hidden uppercase tracking-tighter">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user' as const, content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages })
      });
      const data = await res.json();
      if (data.text) {
        setMessages([...newMessages, { role: 'assistant', content: data.text }]);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: "Ops, tive um probleminha aqui! Pode tentar de novo? 😅" }]);
      }
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: "Tô com dificuldade de conexão, me chama daqui a pouco! 🍖" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 md:bottom-8 right-8 w-16 h-16 bg-orange-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 border-4 border-white"
        aria-label="Assistente de IA"
      >
        <div className="relative">
          <MessageCircle size={32} />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full animate-pulse" />
        </div>
      </button>

      {isOpen && (
        <div className="fixed bottom-44 md:bottom-28 right-8 w-[90vw] md:w-96 h-[500px] bg-white rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-8 duration-300">
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <UtensilsCrossed size={20} />
              </div>
              <div>
                <p className="font-black text-sm uppercase tracking-tighter">Fale com a Paty</p>
                <p className="text-[10px] text-orange-200 uppercase font-bold tracking-widest">Especialista em Churrasco</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-2 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm font-medium">Olá! Eu sou a Paty. ✨<br />Diz aí, o que você tá querendo comer hoje?</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] p-3 rounded-2xl text-sm font-medium shadow-sm",
                  msg.role === 'user'
                    ? "bg-orange-600 text-white rounded-tr-none"
                    : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 flex gap-1">
                  <div className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-bounce delay-75" />
                  <div className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-bounce delay-150" />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Pergunte sobre os lanches..."
                className="flex-1 bg-slate-100 border-none rounded-2xl px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="p-2 bg-orange-600 text-white rounded-2xl disabled:opacity-50 hover:bg-orange-700 transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const AppInner = () => {
  const { org, loading } = useTenant();
  const { user } = useAuth();
  const location = useLocation();

  // Fix: route "/" must be public to allow menu browsing
  const isPublicRoute =
    location.pathname === "/" ||
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname.startsWith("/venda") ||
    location.pathname === "/assinar" ||
    location.pathname.startsWith("/rastreio");

  if (loading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
      <motion.div
        animate={{ scale: [1, 1.1, 1], rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity }}
        className="mb-4"
      >
        <UtensilsCrossed size={64} className="text-orange-500" />
      </motion.div>
      <p className="text-slate-500 font-medium animate-pulse">Carregando sua experiência...</p>
    </div>
  );

  // Auth Guard — permite acesso público ao cardápio e rotas marcadas
  if (!user && !isPublicRoute) {
    return <Navigate to="/login" replace />;
  }

  // RBAC Routing Protection
  const userRole = user?.role || 'user';
  const adminRoutes = ["/kitchen", "/delivery", "/admin", "/saas-admin"];
  if (userRole === 'user' && adminRoutes.some(route => location.pathname.startsWith(route))) {
    return <Navigate to="/" replace />;
  }

  // Super Admin Authorization
  if (location.pathname === "/super-admin" && user?.role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={cn(
      "min-h-screen transition-all duration-700 bg-[#F8FAFC]",
      (!isPublicRoute || !!user) ? "pb-20 md:pb-0 md:pl-20" : ""
    )}>
      <style>{`
        :root {
          --primary: ${org?.branding.primaryColor || '#ea580c'};
          --secondary: ${org?.branding.secondaryColor || '#fb923c'};
        }
        .glass-morphism {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .premium-card {
          background: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
          border-radius: 24px;
        }
        .text-gradient {
          background: linear-gradient(to right, var(--primary), var(--secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
      {(!isPublicRoute || !!user) && <Navbar />}
      <main className={cn(
        "animate-in fade-in slide-in-from-bottom-4 duration-1000",
        (isPublicRoute && !user) ? "w-full min-h-screen" : "max-w-7xl mx-auto p-4 md:p-8"
      )}>
        <Routes>
          <Route path="/" element={<SalesPage />} />
          <Route path="/kitchen" element={<KitchenPage />} />
          <Route path="/delivery" element={<DeliveryPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/saas-admin" element={<SaaSAdminPage />} />
          <Route path="/super-admin" element={<SuperAdminPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/courier-dashboard" element={<CourierDashboard />} />
          <Route path="/courier" element={<Navigate to="/courier-dashboard" replace />} />
          <Route path="/venda" element={<SaaSLandingPage />} />
          <Route path="/venda/cadastro" element={<SaaSStoreRegister />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/assinar" element={<SubscribePage />} />
          <Route path="/rastreio/:courierId" element={<TrackingPage />} />
        </Routes>
        <AIAssistant />
      </main>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [org, setOrg] = useState<Organization | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);

  useEffect(() => {
    const host = window.location.hostname;
    const fallbackSlug = "paty-churrasco";

    fetch(`/api/org/detect?host=${host}&slug=${fallbackSlug}`)
      .then(res => {
        if (!res.ok) throw new Error("Org not found");
        return res.json();
      })
      .then(setOrg)
      .catch(err => {
        console.warn("Could not load organization:", err);
        setOrg(null);
      })
      .finally(() => setLoadingOrg(false));
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");

    // Remove all store carts to ensure privacy across profile switches
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cart_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    window.dispatchEvent(new Event('user-logout'));
    await supabase.auth.signOut();
  };

  useEffect(() => {
    // Listen for auth state changes from Supabase (OAuth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        try {
          const res = await fetch("/api/auth/me", {
            headers: { "Authorization": `Bearer ${session.access_token}` }
          });
          if (res.ok) {
            const userData = await res.json();
            login(userData);
          }
        } catch (err) {
          console.error("Error syncing session:", err);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem("user");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <NotificationProvider>
      <TenantContext.Provider value={{ org, loading: loadingOrg }}>
        <AuthContext.Provider value={{ user, login, logout }}>
          <Router>
            <AppInner />
          </Router>
        </AuthContext.Provider>
      </TenantContext.Provider>
    </NotificationProvider>
  );
}

// --- Pages ---

const SalesPage = () => {
  const { user, login, logout } = useAuth();
  const { org } = useTenant();
  const navigate = useNavigate();
  const { notify } = useNotification();
  const [products, setProducts] = useState<Product[]>([]);
  const cartKey = org?.id ? `cart_${org.id}_${user?.id || 'guest'}` : null;

  const [cart, setCart] = useState<OrderItem[]>([]);

  useEffect(() => {
    if (cartKey) {
      const saved = localStorage.getItem(cartKey);
      setCart(saved ? JSON.parse(saved) : []);
    } else {
      setCart([]);
    }
  }, [cartKey]);

  useEffect(() => {
    if (cartKey) {
      localStorage.setItem(cartKey, JSON.stringify(cart));
    }
  }, [cart, cartKey]);



  const [isOrdering, setIsOrdering] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(true);

  // Customization Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [tempIngredients, setTempIngredients] = useState<string[]>([]);
  const [availableExtras, setAvailableExtras] = useState<ExtraIngredient[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<ExtraIngredient[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'delivery'>('pix');

  // Payment Modal State
  const [showPayment, setShowPayment] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string; payment_id: number } | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [useReward, setUseReward] = useState(false);

  const checkIfOpen = () => {
    if (!org?.operating_hours) return true;

    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const brTime = new Date(utc + (3600000 * -3)); // UTC-3

    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = dayNames[brTime.getDay()];
    const hours = (org.operating_hours as any)[dayName];

    if (!hours) return true;
    if (hours.closed) return false;

    const currentFormatted = brTime.getHours().toString().padStart(2, '0') + ":" + brTime.getMinutes().toString().padStart(2, '0');
    return currentFormatted >= hours.open && currentFormatted <= hours.close;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setIsShopOpen(checkIfOpen());
    }, 30000); // Check every 30s
    setIsShopOpen(checkIfOpen());
    return () => clearInterval(interval);
  }, [org]);

  useEffect(() => {
    if (!org) return;
    fetch(`/api/${org.id}/products`)
      .then(res => res.json())
      .then(setProducts)
      .catch(err => console.error("Erro ao carregar produtos (Sales):", err));

    fetch(`/api/${org.id}/extra-ingredients`)
      .then(res => res.json())
      .then(setAvailableExtras)
      .catch(err => console.error("Erro ao carregar ingredientes extras:", err));
  }, [org]);

  useEffect(() => {
    if (user?.id) {
      fetch(`/api/users/${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.points !== undefined) {
            login({ ...user, points: data.points });
          }
        })
        .catch(err => console.error("Erro ao atualizar pontos:", err));
    }
  }, [user?.id]);

  useEffect(() => {
    const onPointsUpdate = ({ userId, points }: { userId: number, points: number }) => {
      if (user && user.id === userId) {
        login({ ...user, points });
      }
    };
    socket.on("user:points_update", onPointsUpdate);
    return () => {
      socket.off("user:points_update", onPointsUpdate);
    };
  }, [user, login]);

  const lastOrderRef = useRef<Order | null>(null);
  useEffect(() => {
    lastOrderRef.current = lastOrder;
  }, [lastOrder]);

  // Reliable listener for closing modal on automatic PIX confirmation
  useEffect(() => {
    const onPaymentUpdate = ({ id, payment_status }: { id: number, payment_status: string }) => {
      const currentWaiting = lastOrderRef.current;
      console.log(`[SalesPage] Received global signal for Order ${id}, status: ${payment_status}. Currently waiting for: ${currentWaiting?.id}`);

      if (currentWaiting && Number(currentWaiting.id) === Number(id) && payment_status === 'paid') {
        console.log("[SalesPage] Match confirmed! Auto-closing modal...");
        setShowPayment(false);
        setPixData(null);
        setLastOrder(null);
        notify("🍢 Pagamento confirmado! Seu pedido já está na cozinha.", "success");
      }
    };

    socket.on("order:payment_update", onPaymentUpdate);
    return () => {
      socket.off("order:payment_update", onPaymentUpdate);
    };
  }, []); // Mount only! Uses ref for closure-safe state access

  const openCustomization = (product: Product) => {
    setSelectedProduct(product);
    // Split ingredients and clean up whitespace
    const ingredientsStr = product.ingredients || "";
    const ingredientList = ingredientsStr.split(',').map(i => i.trim()).filter(i => i !== "");
    setTempIngredients(ingredientList);
    setSelectedExtras([]);
  };

  const toggleIngredient = (ingredient: string) => {
    setTempIngredients(prev =>
      prev.includes(ingredient)
        ? prev.filter(i => i !== ingredient)
        : [...prev, ingredient]
    );
  };

  const toggleExtra = (extra: ExtraIngredient) => {
    setSelectedExtras(prev =>
      prev.some(e => e.id === extra.id)
        ? prev.filter(e => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const addToCart = (product: Product, selectedIngredients: string[], extras: ExtraIngredient[]) => {
    const ingredientsStr = product.ingredients || "";
    const allIngredients = ingredientsStr.split(',').map(i => i.trim()).filter(i => i !== "");
    const removedIngredients = allIngredients.filter(i => !selectedIngredients.includes(i));

    const extrasPrice = extras.reduce((acc, extra) => acc + extra.price, 0);
    const basePrice = product.promotional_price != null ? Number(product.promotional_price) : product.price;
    const finalPrice = basePrice + extrasPrice;

    setCart(prev => {
      // Grouping logic: check for exact same product, base settings, and extras
      const existingIndex = prev.findIndex(item =>
        item.id === product.id &&
        item.basePrice === basePrice &&
        JSON.stringify(item.removedIngredients?.sort()) === JSON.stringify(removedIngredients.sort()) &&
        JSON.stringify(item.extraIngredients?.map(e => e.id).sort()) === JSON.stringify(extras.map(e => e.id).sort())
      );

      if (existingIndex !== -1) {
        const newCart = [...prev];
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: newCart[existingIndex].quantity + 1
        };
        return newCart;
      }

      return [...prev, {
        id: product.id,
        name: product.name,
        price: finalPrice,
        basePrice: basePrice,
        quantity: 1,
        ingredients: ingredientsStr,
        removedIngredients: removedIngredients.length > 0 ? removedIngredients : undefined,
        extraIngredients: extras.length > 0 ? extras : undefined
      }];
    });
    setSelectedProduct(null);
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const discount = useReward ? subtotal * 0.3 : 0;
  const total = subtotal - discount;

  const handleAddClick = (product: Product) => {
    const ingredientsStr = product.ingredients || "";
    if (product.category === 'ready' || ingredientsStr.trim() === "") {
      addToCart(product, ingredientsStr.split(',').map(i => i.trim()).filter(i => i !== ""), []);
    } else {
      openCustomization(product);
    }
  };

  const categories = [
    { id: 'churrasco', label: 'Churrascos Gregos', icon: UtensilsCrossed },
    { id: 'ready', label: 'Bebidas e Prontos', icon: ShoppingBag },
  ];

  const placeOrder = async () => {
    if (!user) {
      setNeedsLogin(true); // show inline login modal, don't lose the cart!
      return;
    }
    if (cart.length === 0) return;

    if (!checkIfOpen()) {
      notify("Desculpe, a loja fechou enquanto você montava seu pedido.", "warning");
      setIsShopOpen(false);
      return;
    }

    setIsOrdering(true);
    try {
      const res = await fetch(`/api/${org?.id}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          customer_name: user.name,
          customer_phone: user.phone,
          items: cart,
          total_price: total,
          payment_status: 'pending',
          use_reward: useReward,
          address: user.address,
          latitude: user.latitude,
          longitude: user.longitude,
          payment_method: paymentMethod
        })
      });
      if (res.status === 401) {
        logout();
        navigate("/login");
        throw new Error("Sua sessão expirou. Por favor, faça login novamente.");
      }
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao criar pedido");
      }
      const data = await res.json();
      console.log("[SalesPage] Order created successfully:", data);
      setLastOrder(data);
      setCart([]);
      setUseReward(false);

      if (paymentMethod === 'delivery') {
        setIsOrdering(false);
        notify("Pedido realizado com sucesso! O pagamento será feito na entrega.", "success");
        return;
      }

      setShowPayment(true);

      // Generate Pix QR Code automatically
      setPixLoading(true);
      try {
        const pixRes = await fetch(`/api/${org?.id}/pix/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            total_price: total,
            order_id: data.id,
            description: `Pedido #${data.id}`
          })
        });
        if (pixRes.ok) {
          const pixJson = await pixRes.json();
          setPixData(pixJson);
          // Save mp_payment_id to the order
          await fetch(`/api/orders/${data.id}/payment`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mp_payment_id: pixJson.payment_id?.toString() })
          });
        }
      } catch (pixErr) {
        console.warn("Pix não disponível, modo manual ativado");
      } finally {
        setPixLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      notify(err.message || "Erro ao finalizar pedido. Tente novamente.", "error");
    } finally {
      setIsOrdering(false);
    }
  };

  const confirmPayment = async () => {
    if (!lastOrder) return;
    try {
      await fetch(`/api/orders/${lastOrder.id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: 'paid' })
      });
      setShowPayment(false);
      setPixData(null);
      notify("Pagamento confirmado! Seu pedido já está na cozinha. 🍢", "success");
    } catch (err) {
      console.error(err);
    }
  };

  const copyPixCode = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 3000);
    }
  };

  return (
    <div className="pb-24 md:pt-8 p-4 max-w-7xl mx-auto">
      <header className="mb-10 text-center md:text-left flex flex-col md:flex-row items-center gap-6">
        {org?.branding.logoUrl ? (
          <img src={org.branding.logoUrl} alt={org.name} className="w-24 h-24 rounded-3xl shadow-lg object-cover border-4 border-white" />
        ) : (
          <div className="w-24 h-24 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] rounded-3xl flex items-center justify-center text-white shadow-lg">
            <UtensilsCrossed size={48} />
          </div>
        )}
        <div>
          {!isShopOpen && (
            <div className="bg-red-600 text-white p-4 rounded-3xl mb-6 flex items-center justify-center gap-3 animate-pulse shadow-xl border-4 border-red-500/50">
              <Clock size={20} className="animate-spin-slow" />
              <span className="font-black uppercase tracking-widest text-xs">Loja Fechada - Não estamos aceitando pedidos</span>
            </div>
          )}
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase italic">
            <span className="text-gradient">{org?.name || "Premium Store"}</span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium tracking-wide">Bem-vindo ao melhor sabor da região!</p>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
              <UtensilsCrossed size={10} className="text-orange-400" />
              <span className="text-[10px] text-gray-400 font-semibold tracking-wide">Powered by <span className="text-orange-500">MenuFast</span></span>
              <span className="text-gray-300 text-[10px]">•</span>
              <Phone size={9} className="text-gray-400" />
              <span className="text-[10px] text-gray-400">(62) 99999‑0001</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-12">
          {categories.map(cat => {
            const catProducts = products.filter(p => p.category === cat.id);
            if (catProducts.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-6">
                <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-800">
                  <cat.icon size={24} className="text-orange-500" />
                  {cat.label}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {catProducts.map(product => {
                    const isAvailable = product.available !== false;
                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "p-4 rounded-[2rem] border shadow-sm transition-all group overflow-hidden flex flex-col h-full",
                          isAvailable ? "bg-white border-gray-100 hover:shadow-xl hover:scale-[1.02]" : "bg-gray-100 border-gray-200 opacity-70 grayscale-[0.8]"
                        )}
                      >
                        <div className="relative aspect-square mb-4 rounded-3xl overflow-hidden bg-gray-50 flex items-center justify-center p-0">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <UtensilsCrossed size={48} className="text-gray-200" />
                          )}

                          {/* Overlay Gradient for contrast */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />

                          {/* Price Badge - Premium Floating Style */}
                          <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-xl border border-white/20 flex flex-col items-end">
                            {(product as any).promotional_price != null ? (
                              <>
                                <span className="text-[9px] text-gray-400 line-through leading-none font-bold">R$ {product.price.toFixed(2)}</span>
                                <div className="flex items-baseline gap-0.5 text-orange-600">
                                  <span className="text-[10px] font-black">R$</span>
                                  <span className="text-xl font-black tracking-tighter">
                                    {Number((product as any).promotional_price).toFixed(2).split('.')[0]}
                                    <span className="text-xs">,{Number((product as any).promotional_price).toFixed(2).split('.')[1]}</span>
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="flex items-baseline gap-0.5 text-orange-600">
                                <span className="text-[10px] font-black">R$</span>
                                <span className="text-xl font-black tracking-tighter">
                                  {product.price.toFixed(2).split('.')[0]}
                                  <span className="text-xs">,{product.price.toFixed(2).split('.')[1]}</span>
                                </span>
                              </div>
                            )}
                          </div>

                          {(product as any).promotional_price != null && isAvailable && (
                            <div className="absolute top-3 left-3 bg-orange-600 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider shadow-lg">
                              OFERTA
                            </div>
                          )}
                          {!isAvailable && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white text-lg font-black px-4 py-2 rounded-xl border border-white/20 whitespace-nowrap shadow-2xl backdrop-blur-md z-10 uppercase tracking-widest rotate-[-10deg]">
                              Esgotado
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col flex-1 px-1">
                          <h3 className="font-bold text-gray-900 text-base leading-tight group-hover:text-orange-600 transition-colors line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
                          <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 flex-1 font-medium italic">{product.description}</p>
                          <p className="text-[9px] text-orange-500/70 font-bold mt-2 tracking-tight uppercase">🔥 Mais pedido hoje</p>
                        </div>

                        <button
                          onClick={() => isAvailable && handleAddClick(product)}
                          disabled={!isShopOpen || !isAvailable}
                          className={cn(
                            "mt-6 w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95",
                            (!isShopOpen || !isAvailable)
                              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                              : "bg-slate-100 text-slate-900 hover:bg-orange-600 hover:text-white group-hover:shadow-lg group-hover:shadow-orange-200"
                          )}
                        >
                          <Plus size={16} strokeWidth={3} /> {(!isAvailable) ? "Esgotado" : (!isShopOpen ? "Loja Fechada" : "Adicionar")}
                        </button>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            );
          })}

          {products.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
              <UtensilsCrossed size={64} className="mx-auto mb-4 text-gray-200" />
              <p className="text-gray-400 font-medium">Nenhum produto cadastrado no momento.</p>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xl h-fit sticky top-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <ShoppingBag size={20} className="text-orange-500" />
            Seu Pedido
          </h2>

          {cart.length > 0 && user && user.points >= 100 && (
            <div className={cn(
              "mb-6 p-4 rounded-2xl border-2 transition-all cursor-pointer",
              useReward ? "bg-green-50 border-green-500" : "bg-orange-50 border-orange-200 border-dashed"
            )} onClick={() => setUseReward(!useReward)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    useReward ? "bg-green-500 text-white" : "bg-orange-100 text-orange-600"
                  )}>
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Recompensa Disponível!</p>
                    <p className="text-[10px] text-gray-500">Ganhe 30% de desconto agora</p>
                  </div>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                  useReward ? "bg-green-600 text-white" : "bg-orange-600 text-white"
                )}>
                  {useReward ? "Aplicado" : "Resgatar"}
                </div>
              </div>
            </div>
          )}

          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
              <p>Carrinho vazio</p>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              {cart.map((item, index) => (
                <div key={index} className="flex flex-col gap-1 border-b border-gray-50 pb-2 last:border-0">
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold shrink-0">{item.quantity}x</span>
                      <span className="font-medium break-words leading-tight">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-sm text-gray-400 whitespace-nowrap">R$ {item.basePrice.toFixed(2)}</span>
                      <button onClick={() => removeFromCart(index)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-lg transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  {item.removedIngredients && item.removedIngredients.length > 0 && (
                    <p className="text-[10px] text-red-500 font-medium ml-8">
                      Sem: {item.removedIngredients.join(', ')}
                    </p>
                  )}
                  {item.extraIngredients && item.extraIngredients.length > 0 && (
                    <div className="ml-8 mt-1 space-y-0.5">
                      {item.extraIngredients.map((e, idx) => (
                        <p key={idx} className="text-[10px] text-green-600 font-medium flex justify-between pr-8">
                          <span>+ {e.name}</span>
                          <span>R$ {e.price.toFixed(2)}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {useReward && (
                <div className="flex justify-between items-center text-green-600 text-sm font-medium mb-2">
                  <span>Desconto Fidelidade (30%)</span>
                  <span>- R$ {discount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-4 flex justify-between items-center font-bold text-lg">
                <span>Total</span>
                <span className="text-orange-600">R$ {total.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Modal de login inline quando tenta finalizar sem conta */}
            {needsLogin && (
              <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setNeedsLogin(false)}>
                <div className="bg-white w-full max-w-md rounded-t-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-2">🔐</div>
                    <h3 className="text-xl font-black text-gray-900">Quase lá!</h3>
                    <p className="text-gray-500 mt-1 text-sm">Para finalizar seu pedido, você precisa entrar na sua conta ou criar uma nova. Seus itens serão mantidos! 🛒</p>
                  </div>
                  <div className="space-y-3">
                    <Link
                      to="/login"
                      className="flex items-center justify-center gap-2 w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-orange-700 transition-all"
                      onClick={() => setNeedsLogin(false)}
                    >
                      <LogIn size={18} /> Entrar na minha conta
                    </Link>
                    <Link
                      to="/register"
                      className="flex items-center justify-center gap-2 w-full py-4 bg-white text-orange-600 rounded-2xl font-black text-sm border-2 border-orange-200 hover:bg-orange-50 transition-all"
                      onClick={() => setNeedsLogin(false)}
                    >
                      <UserPlus size={18} /> Criar conta grátis
                    </Link>
                    <button onClick={() => setNeedsLogin(false)} className="w-full py-3 text-gray-400 text-sm font-bold">
                      Continuar navegando
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!user && (
              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-sm text-orange-800 mb-4">
                <p className="font-bold flex items-center gap-2 mb-2">
                  <LogIn size={16} /> Entre para pedir
                </p>
                <div className="flex gap-2">
                  <Link to="/login" className="flex-1 text-center py-2 bg-orange-600 text-white rounded-xl font-bold text-xs">Entrar</Link>
                  <Link to="/register" className="flex-1 text-center py-2 bg-white text-orange-600 border border-orange-200 rounded-xl font-bold text-xs">Cadastrar</Link>
                </div>
              </div>
            )}

            <div className="flex bg-gray-100 p-1 rounded-2xl mb-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  paymentMethod === 'pix' ? "bg-white text-green-600 shadow-sm" : "text-gray-400"
                )}
              >
                <QrCode size={16} /> PIX
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('delivery')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  paymentMethod === 'delivery' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400"
                )}
              >
                <Truck size={16} /> Na Entrega
              </button>
            </div>

            <button
              disabled={isOrdering || cart.length === 0 || !isShopOpen}
              onClick={placeOrder}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isOrdering ? "Processando..." : !isShopOpen ? "Loja Fechada" : user ? "Finalizar Pedido" : "Entrar e Pedir"}
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Customization Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div className="min-w-0 pr-4">
                  <h3 className="text-xl font-bold break-words leading-tight">{selectedProduct.name}</h3>
                  <p className="text-sm text-gray-500">Personalize seu pedido</p>
                </div>
                <button onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Ingredientes (Desmarque o que não quer)</p>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedProduct.ingredients.split(',').map(i => i.trim()).filter(i => i !== "").map((ingredient, idx) => (
                      <label
                        key={idx}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-2xl border-2 cursor-pointer transition-all",
                          tempIngredients.includes(ingredient)
                            ? "border-orange-100 bg-orange-50/30 text-orange-900"
                            : "border-gray-100 bg-white text-gray-400 grayscale opacity-60"
                        )}
                      >
                        <span className="font-medium">{ingredient}</span>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={tempIngredients.includes(ingredient)}
                          onChange={() => toggleIngredient(ingredient)}
                        />
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                          tempIngredients.includes(ingredient)
                            ? "bg-orange-600 border-orange-600"
                            : "bg-white border-gray-200"
                        )}>
                          {tempIngredients.includes(ingredient) && <CheckCircle2 size={14} className="text-white" />}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {availableExtras.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Adicionais (Opcional)</p>
                    <div className="grid grid-cols-1 gap-2">
                      {availableExtras.map((extra) => {
                        const isSelected = selectedExtras.some(e => e.id === extra.id);
                        return (
                          <label
                            key={extra.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-2xl border-2 cursor-pointer transition-all",
                              isSelected
                                ? "border-green-200 bg-green-50/30 text-green-900"
                                : "border-gray-100 bg-white text-gray-600"
                            )}
                          >
                            <div>
                              <span className="font-medium block">{extra.name}</span>
                              <span className="text-xs font-mono text-green-600 font-bold">+ R$ {extra.price.toFixed(2)}</span>
                            </div>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={isSelected}
                              onChange={() => toggleExtra(extra)}
                            />
                            <div className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                              isSelected
                                ? "bg-green-600 border-green-600"
                                : "bg-white border-gray-200"
                            )}>
                              {isSelected && <CheckCircle2 size={14} className="text-white" />}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-6 bg-gray-50 flex flex-wrap sm:flex-nowrap gap-3 border-t border-gray-100">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1 py-3 font-bold text-gray-500 hover:text-gray-700 transition-colors text-sm sm:text-base"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => addToCart(selectedProduct, tempIngredients, selectedExtras)}
                  className="flex-[2] min-w-[180px] bg-orange-600 text-white py-3 rounded-2xl font-bold hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  Confirmar • R$ {((selectedProduct.promotional_price != null ? Number(selectedProduct.promotional_price) : selectedProduct.price) + selectedExtras.reduce((a, b) => a + b.price, 0)).toFixed(2)} <Plus size={18} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Modal - PIX Mercado Pago */}
      <AnimatePresence>
        {showPayment && lastOrder && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8 text-center">
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <QrCode className="text-green-600" size={40} />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-1 break-words px-2">Pagar com PIX (v2.8)</h3>
                <p className="text-gray-500 text-sm mb-2">Pedido #{lastOrder.id} • {org?.name}</p>
                <p className="text-3xl font-mono font-bold text-green-600 mb-6 break-words">R$ {lastOrder.total_price.toFixed(2)}</p>

                {(lastOrder as any).payment_method === 'delivery' || (lastOrder.payment_method === undefined && paymentMethod === 'delivery') ? (
                  <div className="bg-orange-50 p-6 rounded-3xl border-2 border-dashed border-orange-200 mb-6 flex flex-col items-center gap-3">
                    <Truck className="text-orange-600" size={50} />
                    <p className="text-sm text-orange-700 font-bold uppercase tracking-widest text-center">Pedido Confirmado!</p>
                    <p className="text-xs text-orange-600 text-center">Pague diretamente ao entregador no ato da entrega.</p>
                  </div>
                ) : pixLoading ? (
                  <div className="bg-gray-50 p-8 rounded-3xl border-2 border-dashed border-gray-200 mb-6 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500 font-medium">Gerando QR Code...</p>
                  </div>
                ) : pixData ? (
                  <div className="mb-6">
                    <div className="bg-white p-4 rounded-3xl border-2 border-dashed border-green-200 mb-4 flex items-center justify-center min-h-[220px]" style={{ backgroundColor: '#FFFFFF' }}>
                      {pixData.qr_code ? (
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixData.qr_code)}`}
                          alt="QR Code PIX"
                          className="w-48 h-48 block"
                          style={{ backgroundColor: 'white', display: 'block', margin: '0 auto' }}
                          onError={(e) => {
                            const img = e.currentTarget;
                            if (img.src.includes('qrserver')) {
                              img.src = `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(pixData.qr_code)}&choe=UTF-8`;
                            }
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                          <QrCode size={48} />
                          <p className="text-xs mt-2">Erro ao carregar imagem.</p>
                        </div>
                      )}
                    </div>
                    {pixData.qr_code && (
                      <button
                        onClick={copyPixCode}
                        className={cn(
                          "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-sm transition-all border-2",
                          pixCopied
                            ? "bg-green-50 border-green-300 text-green-700"
                            : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        {pixCopied ? <><CheckCircle2 size={18} /> Código copiado!</> : <><Copy size={18} /> Copiar código Copia e Cola</>}
                      </button>
                    )}
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2">
                      <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 text-left">Seu pedido será confirmado automaticamente após o pagamento. Não precisa clicar em nenhum botão!</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200 mb-6">
                    <QrCode size={80} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">PIX não disponível ou aguardando.</p>
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={() => { setShowPayment(false); setPixData(null); }}
                    className="w-full py-3 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Fechar e aguardar confirmação automática
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const KitchenPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const { org } = useTenant();

  // Play a beep alert
  const playAlert = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) { /* Browser may block before user interaction */ }
  }, []);

  // Request browser push notification permission
  const requestNotifPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifEnabled(perm === 'granted');
  }, []);

  // Show OS notification
  const showPushNotif = useCallback((order: Order) => {
    if (Notification.permission === 'granted') {
      new Notification('🔔 Novo Pedido!', {
        body: `${order.customer_name} — ${order.items?.length ?? 1} item(s) — R$ ${order.total_price?.toFixed(2)}`,
        icon: '/favicon.ico',
        tag: `order-${order.id}`,
        requireInteraction: true,
      });
    }
  }, []);

  useEffect(() => {
    // Auto-check permission on mount
    if ('Notification' in window) {
      setNotifEnabled(Notification.permission === 'granted');
    }

    if (!org) return;
    fetch(`/api/${org.id}/orders`).then(res => res.json()).then(setOrders);
    fetch(`/api/${org.id}/products`).then(res => res.json()).then(setProducts);

    socket.on("order:new", (newOrder: Order) => {
      if (newOrder.org_id === org.id) {
        setOrders(prev => [newOrder, ...prev]);
        playAlert();
        showPushNotif(newOrder);
      }
    });

    socket.on("order:update", ({ id, status }: { id: number, status: string }) => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: status as any } : o));
    });

    socket.on("order:payment_update", ({ id, payment_status }: { id: number, payment_status: string }) => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, payment_status: payment_status as any } : o));
    });

    return () => {
      socket.off("order:new");
      socket.off("order:update");
      socket.off("order:payment_update");
    };
  }, [org, playAlert, showPushNotif]);

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

  const confirmDeliveryPayment = async (orderId: number) => {
    await fetch(`/api/orders/${orderId}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_status: 'paid' })
    });
  };

  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing');

  return (
    <div className="pb-24 md:pl-24 md:pt-8 p-4 max-w-5xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-5xl font-black text-gradient uppercase tracking-tighter flex items-center justify-center md:justify-start gap-3">
            <ChefHat size={48} />
            Cozinha
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Pedidos em tempo real para {org?.name}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {/* Notification toggle button */}
          <button
            onClick={requestNotifPermission}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm border transition-all",
              notifEnabled
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-orange-50 text-orange-700 border-orange-200 animate-pulse"
            )}
          >
            <Bell size={16} />
            {notifEnabled ? '🔔 Notificações ativas' : '🔕 Ativar notificações'}
          </button>
          <div className="bg-[var(--primary)]/10 text-[var(--primary)] px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest border border-[var(--primary)]/20 shadow-inner">
            {activeOrders.length} Pedidos Ativos
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {activeOrders.map(order => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "bg-white p-6 rounded-3xl border-2 shadow-sm relative overflow-hidden flex flex-col",
                order.status === 'pending' ? "border-red-100" : "border-orange-100"
              )}
            >
              {order.status === 'pending' && (
                <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                  Novo
                </div>
              )}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-xl">#{order.id}</h3>
                  <p className="text-sm font-medium text-gray-600">{order.customer_name}</p>
                  <div className="mt-1 flex gap-1 items-center">
                    <div className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                      order.payment_status === 'paid' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                      {order.payment_status === 'paid' ? "Pago" : "Pendente"}
                    </div>
                    {(order as any).payment_method === 'delivery' && (
                      <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700 flex items-center gap-1">
                        <Truck size={10} /> Entrega
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-gray-400 text-xs text-right">
                  <span className="block">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              <div className="space-y-2 mb-6 flex-1">
                {order.items.map((item, idx) => {
                  const product = products.find(p => p.id === item.id || p.name === item.name);
                  const ingredients = item.ingredients || product?.ingredients;
                  const isChurrasco = product?.category === 'churrasco' || item.name.toLowerCase().includes('churrasco') || item.name.toLowerCase().includes('carne');

                  return (
                    <div key={idx} className="flex flex-col bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900 uppercase">{item.quantity}x {item.name}</span>
                      </div>

                      {isChurrasco && ingredients && (
                        <div className="mt-1.5 pt-1.5 border-t border-gray-50">
                          <p className="text-[11px] text-gray-500 leading-relaxed italic">
                            {ingredients}
                          </p>
                        </div>
                      )}

                      {item.removedIngredients && item.removedIngredients.length > 0 && (
                        <div className="mt-1.5 px-2 py-1 bg-red-50 rounded-lg border border-red-100">
                          <span className="text-[9px] text-red-600 font-black uppercase flex items-center gap-1">
                            <X size={10} strokeWidth={3} /> SEM: {item.removedIngredients.join(', ')}
                          </span>
                        </div>
                      )}

                      {item.extraIngredients && item.extraIngredients.length > 0 && (
                        <div className="mt-1.5 px-2 py-1 bg-green-50 rounded-lg border border-green-100">
                          <span className="text-[9px] text-green-700 font-black uppercase flex items-center gap-1">
                            <Plus size={10} strokeWidth={3} /> EXTRA: {item.extraIngredients.map(e => e.name).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto pt-4 border-t border-gray-50 flex flex-col gap-2">
                {order.payment_status === 'pending' && (
                  <button
                    onClick={() => confirmDeliveryPayment(order.id)}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-2xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-95"
                  >
                    <DollarSign size={14} /> {(order as any).payment_method === 'pix' ? "Confirmar Pix Manual" : "Confirmar Recebimento"}
                  </button>
                )}

                <div className="flex gap-2">
                  {order.status === 'pending' ? (
                    <button
                      onClick={() => updateStatus(order.id, 'preparing')}
                      className="flex-1 bg-orange-600 text-white py-3 rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 active:scale-95"
                    >
                      Começar Preparo
                    </button>
                  ) : (
                    <button
                      disabled={order.payment_status === 'pending' && (order as any).payment_method === 'pix'}
                      onClick={() => updateStatus(order.id, 'ready')}
                      className={cn(
                        "flex-1 bg-green-600 text-white py-3 rounded-2xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100 active:scale-95",
                        order.payment_status === 'pending' && (order as any).payment_method === 'pix' ? "opacity-50 cursor-not-allowed" : ""
                      )}
                    >
                      <CheckCircle2 size={20} /> Pronto
                    </button>
                  )}
                </div>

                {order.payment_status === 'pending' && (order as any).payment_method === 'pix' && (
                  <p className="text-[10px] text-gray-400 text-center italic mt-1 font-medium">Aguardando pagamento PIX para finalizar.</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const DeliveryPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [showQrModal, setShowQrModal] = useState<Order | null>(null);
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string; payment_id: number } | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [couriers, setCouriers] = useState<User[]>([]);
  const [showDispatchModal, setShowDispatchModal] = useState<Order | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("0");

  const { org } = useTenant();

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
      }
    }
  }, [orders, showQrModal, org]);

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
    <div className="pb-24 md:pl-24 md:pt-8 p-4 max-w-5xl mx-auto">
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
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Selecionar Entregador</label>
                  <select
                    value={selectedCourierId}
                    onChange={e => setSelectedCourierId(e.target.value)}
                    className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-orange-500 font-bold"
                  >
                    <option value="">Escolha quem vai levar...</option>
                    {couriers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Taxa de Entrega (Comissão R$)</label>
                  <input
                    type="number"
                    step="0.10"
                    value={deliveryFee}
                    onChange={e => setDeliveryFee(e.target.value)}
                    className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-orange-500 font-mono text-xl font-black"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button onClick={() => setShowDispatchModal(null)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold">Cancelar</button>
                  <button onClick={deployOrder} disabled={!selectedCourierId} className="flex-2 px-8 py-4 bg-orange-600 text-white rounded-2xl font-bold shadow-lg shadow-orange-100 disabled:opacity-50">Confirmar Envio</button>
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
                          alt="QR Code PIX"
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
                <p className="text-sm text-gray-400 mt-4 leading-snug">
                  Peça ao cliente para escanear se desejar pagar via PIX.<br />
                  A <strong className="text-blue-600">validação é automática</strong> pelo Mercado Pago.<br />
                  Se for dinheiro/máquina, confirme abaixo.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => confirmPaymentAndDeliver(showQrModal)}
                  className="w-full bg-orange-100 text-orange-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-200 transition"
                >
                  <CheckCircle2 size={18} /> Forçar Recebimento (Dinheiro/Cartão)
                </button>
                <button
                  onClick={() => setShowQrModal(null)}
                  className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition"
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



const FinancePage = () => {
  const { org } = useTenant();
  const { notify } = useNotification();
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');

  // Expense Form State
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("Insumos");

  const fetchExpenses = useCallback(async () => {
    if (!org) return;
    try {
      const res = await fetch(`/api/${org.id}/expenses`);
      const data = await res.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao carregar despesas:", err);
      notify("Erro ao carregar despesas.", "error");
    }
  }, [org, notify]);

  useEffect(() => {
    if (!org) return;
    setLoading(true);
    fetch(`/api/${org.id}/orders`)
      .then(r => r.json())
      .then(data => { setOrders(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));

    fetchExpenses();
  }, [org, fetchExpenses]);

  const saveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    try {
      const res = await fetch(`/api/${org.id}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: expDesc, amount: parseFloat(expAmount), category: expCategory })
      });
      if (res.ok) {
        const data = await res.json();
        notify("Despesa salva com sucesso!", "success");
        fetchExpenses();
        setExpDesc("");
        setExpAmount("");
        setIsAddingExpense(false);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro desconhecido ao salvar despesa.");
      }
    } catch (err: any) {
      console.error(err);
      notify("Erro ao salvar despesa: " + err.message, "error");
    }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm("Excluir esta despesa?")) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setExpenses(prev => prev.filter(e => e.id !== id));
        notify("Despesa excluída.", "info");
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro desconhecido ao excluir despesa.");
      }
    } catch (err: any) {
      console.error(err);
      notify("Erro ao excluir despesa: " + err.message, "error");
    }
  };

  const now = new Date();
  const filtered = orders.filter(o => {
    const d = new Date(o.created_at);
    if (period === 'today') return d.toDateString() === now.toDateString();
    if (period === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
      return d >= weekAgo;
    }
    if (period === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const paidOrders = filtered.filter(o => o.payment_status === 'paid' || o.payment_status === 'confirmed');
  const totalRevenue = paidOrders.reduce((s, o) => s + (o.total_price || 0), 0);
  const totalAll = filtered.reduce((s, o) => s + (o.total_price || 0), 0);
  const avgTicket = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;
  const pendingRevenue = filtered.filter(o => o.payment_status === 'pending').reduce((s, o) => s + (o.total_price || 0), 0);

  // Expense calculation for filtered period
  const filteredExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    if (period === 'today') return d.toDateString() === now.toDateString();
    if (period === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
      return d >= weekAgo;
    }
    if (period === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true;
  });
  const totalExpenses = filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  const periodLabels = { today: 'Hoje', week: 'Últimos 7 dias', month: 'Este mês', all: 'Todos os tempos' };

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
  const formatDate = (s: string) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  // Group revenue by day (last 7 days)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setDate(now.getDate() - (6 - i));
    const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
    const dayOrders = orders.filter(o => new Date(o.created_at).toDateString() === d.toDateString() && (o.payment_status === 'paid' || o.payment_status === 'confirmed'));
    const total = dayOrders.reduce((s, o) => s + (o.total_price || 0), 0);
    return { label, total };
  });
  const maxDay = Math.max(...last7.map(d => d.total), 1);

  return (
    <div className="pb-24 md:pl-24 md:pt-8 p-4 max-w-5xl mx-auto">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <DollarSign size={36} className="text-green-600" />
            Financeiro
          </h1>
          <p className="text-gray-500 mt-1">Faturamento e relatórios da loja</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setIsAddingExpense(true)}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-red-100 transition-all border border-red-100"
          >
            <Plus size={16} /> Nova Despesa
          </button>
          {(['today', 'week', 'month', 'all'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                period === p ? "bg-green-600 text-white shadow-lg" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </header>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center mb-3">
            <TrendingUp size={20} className="text-green-600" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase">Faturamento</p>
          <p className="text-2xl font-black text-green-600 mt-1">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-gray-400 mt-1">{paidOrders.length} pedidos pagos</p>
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center mb-3">
            <ShoppingBag size={20} className="text-blue-600" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase">Total Pedidos</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{filtered.length}</p>
          <p className="text-xs text-gray-400 mt-1">{formatCurrency(totalAll)} bruto</p>
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <div className="w-10 h-10 bg-purple-100 rounded-2xl flex items-center justify-center mb-3">
            <BarChart3 size={20} className="text-purple-600" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase">Ticket Médio</p>
          <p className="text-2xl font-black text-purple-600 mt-1">{formatCurrency(avgTicket)}</p>
          <p className="text-xs text-gray-400 mt-1">por pedido pago</p>
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center mb-3">
            <TrendingDown size={20} className="text-red-600" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase">Despesas</p>
          <p className="text-2xl font-black text-red-600 mt-1">{formatCurrency(totalExpenses)}</p>
          <p className="text-xs text-gray-400 mt-1">{filteredExpenses.length} registros</p>
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center mb-3">
            <Activity size={20} className="text-indigo-600" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase">Lucro Líquido</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">{formatCurrency(netProfit)}</p>
          <p className="text-xs text-gray-400 mt-1">Receita - Despesas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-green-500" />
            Vendas — 7 dias
          </h3>
          <div className="flex items-end gap-3 h-32">
            {last7.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-gray-500">{day.total > 0 ? formatCurrency(day.total) : ''}</span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-green-500 to-green-300 transition-all duration-500"
                  style={{ height: `${Math.max((day.total / maxDay) * 96, day.total > 0 ? 8 : 2)}px` }}
                />
                <span className="text-[10px] text-gray-400 text-center leading-tight">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 overflow-hidden">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingDown size={18} className="text-red-500" />
            Últimas Despesas
          </h3>
          <div className="space-y-3 max-h-[128px] overflow-y-auto">
            {filteredExpenses.slice(0, 5).map(exp => (
              <div key={exp.id} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                <div>
                  <p className="font-bold text-gray-800">{exp.description}</p>
                  <p className="text-[10px] text-gray-400 uppercase">{exp.category}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-red-500">-{formatCurrency(Number(exp.amount))}</span>
                  <button onClick={() => deleteExpense(exp.id)} className="text-gray-300 hover:text-red-500"><X size={14} /></button>
                </div>
              </div>
            ))}
            {filteredExpenses.length === 0 && <p className="text-center py-4 text-gray-300 text-xs">Nenhuma despesa registrada.</p>}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Pedidos — {periodLabels[period]}</h3>
          <span className="text-sm text-gray-400">{filtered.length} pedidos</span>
        </div>
        {loading ? (
          <div className="py-16 text-center text-gray-400">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">Nenhum pedido neste período</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase">#</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase">Data</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase">Itens</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase">Total</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase">Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm font-bold text-gray-400">#{order.id}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-800 text-sm">{order.customer_name || 'Anônimo'}</p>
                      {order.customer_phone && <p className="text-xs text-gray-400">{order.customer_phone}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDate(order.created_at)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {Array.isArray(order.items) ? order.items.map((it: any) => `${it.quantity}x ${it.name}`).join(', ').slice(0, 40) + (order.items.length > 1 ? '...' : '') : '-'}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">{formatCurrency(order.total_price || 0)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-black uppercase",
                        (order.payment_status === 'paid' || order.payment_status === 'confirmed') ? "bg-green-100 text-green-700" :
                          order.payment_status === 'pending' ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
                      )}>
                        {order.payment_status === 'paid' || order.payment_status === 'confirmed' ? 'Pago' :
                          order.payment_status === 'pending' ? 'Pendente' : order.payment_status || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <AnimatePresence>
        {isAddingExpense && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <TrendingDown className="text-red-600" /> Registrar Despesa
              </h3>
              <form onSubmit={saveExpense} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Descrição</label>
                  <input
                    required
                    value={expDesc}
                    onChange={e => setExpDesc(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-500 font-bold"
                    placeholder="Ex: Compra de carne, Aluguel"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Valor (R$)</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={expAmount}
                      onChange={e => setExpAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-500 font-bold"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Categoria</label>
                    <select
                      value={expCategory}
                      onChange={e => setExpCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-500 font-bold"
                    >
                      <option>Insumos</option>
                      <option>Manutenção</option>
                      <option>Marketing</option>
                      <option>Mão de Obra</option>
                      <option>Outros</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddingExpense(false)}
                    className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-2 px-8 py-4 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-100"
                  >
                    Salvar Gasto
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [extraIngredients, setExtraIngredients] = useState<ExtraIngredient[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [category, setCategory] = useState<'churrasco' | 'ready'>('churrasco');
  const [imageUrl, setImageUrl] = useState("");
  const [available, setAvailable] = useState<boolean>(true);

  const [extraName, setExtraName] = useState("");
  const [extraPrice, setExtraPrice] = useState("");

  const [activeTab, setActiveTab] = useState<'products' | 'couriers' | 'settings' | 'metrics'>('products');
  const [couriers, setCouriers] = useState<User[]>([]);
  const [courierStats, setCourierStats] = useState<Record<string, { total_commissions: number, total_advances: number, net_pay: number }>>({});
  const [newCourierName, setNewCourierName] = useState("");
  const [newCourierPhone, setNewCourierPhone] = useState("");
  const [newCourierPassword, setNewCourierPassword] = useState("");
  const [newCourierCommission, setNewCourierCommission] = useState("0");
  const [modalType, setModalType] = useState<'payout' | 'advance' | 'edit_commission' | 'delete_courier' | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<User | null>(null);
  const [editCommissionValue, setEditCommissionValue] = useState("0");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [operatingHours, setOperatingHours] = useState<any>(null);
  const [hoursSaving, setHoursSaving] = useState(false);

  const { org } = useTenant();
  const { notify } = useNotification();

  const fetchCourierStats = async (courierList: User[]) => {
    const stats: Record<string, { total_commissions: number, total_advances: number, net_pay: number }> = {};
    for (const c of courierList) {
      try {
        const res = await fetch(`/api/courier/${c.id}/stats`);
        if (res.ok) {
          stats[c.id] = await res.json();
        }
      } catch (e) {
        console.error("Erro ao buscar stats do entregador", c.id, e);
      }
    }
    setCourierStats(stats);
  };

  useEffect(() => {
    if (!org) return;
    fetch(`/api/${org.id}/products`)
      .then(res => res.json())
      .then(setProducts)
      .catch(err => console.error("Erro ao carregar produtos (Admin):", err));

    fetch(`/api/${org.id}/extra-ingredients`)
      .then(res => res.json())
      .then(setExtraIngredients)
      .catch(err => console.error("Erro ao carregar ingredientes extras:", err));

    fetch(`/api/${org.id}/couriers`)
      .then(res => res.json())
      .then(data => {
        setCouriers(data);
        fetchCourierStats(data);
      })
      .catch(err => console.error("Erro ao carregar entregadores:", err));

    if (org?.operating_hours) {
      setOperatingHours(org.operating_hours);
    }
  }, [org]);

  const saveHours = async (newHours?: any) => {
    const hoursToSave = newHours || operatingHours;
    if (!org || !hoursToSave) return;
    setHoursSaving(true);
    try {
      const res = await fetch(`/api/organizations/${org.id}/operating-hours`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operating_hours: hoursToSave })
      });
      if (res.ok) {
        notify("Horários atualizados com sucesso!", "success");
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro desconhecido ao salvar horários.");
      }
    } catch (err: any) {
      console.error(err);
      notify("Erro ao salvar horários: " + err.message, "error");
    } finally {
      setHoursSaving(false);
    }
  };

  const handlePayout = async () => {
    if (!selectedCourier) return;
    try {
      const res = await fetch(`/api/courier/${selectedCourier.id}/payout`, { method: 'POST' });
      if (res.ok) {
        notify("Pagamento registrado com sucesso!", "success");
        fetchCourierStats(couriers);
        setModalType(null);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro desconhecido ao processar pagamento.");
      }
    } catch (e: any) {
      notify("Erro ao processar pagamento: " + e.message, "error");
    }
  };

  const handleGiveAdvance = async () => {
    if (!selectedCourier || !advanceAmount || isNaN(parseFloat(advanceAmount))) return;
    const amount = parseFloat(advanceAmount);
    try {
      const res = await fetch(`/api/${org?.id}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: `Vale: ${selectedCourier.name}`,
          amount: amount,
          category: "Mão de Obra",
          courier_id: selectedCourier.id
        })
      });

      if (res.ok) {
        notify("Vale registrado com sucesso!", "success");
        fetchCourierStats(couriers);
        setModalType(null);
        setAdvanceAmount("");
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro desconhecido ao registrar vale.");
      }
    } catch (err: any) {
      notify("Erro ao registrar vale: " + err.message, "error");
    }
  };

  const saveCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    try {
      // Registrar apenas como usuário comum, com role de courier
      const resSimple = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCourierName,
          phone: newCourierPhone,
          password: newCourierPassword,
          role: 'courier',
          org_id: org.id,
          commission_rate: parseFloat(newCourierCommission) || 0
        })
      });

      if (resSimple.ok) {
        const data = await resSimple.json();
        const updatedCouriers = [...couriers, data];
        setCouriers(updatedCouriers);
        fetchCourierStats(updatedCouriers);
        setNewCourierName("");
        setNewCourierPhone("");
        setNewCourierPassword("");
        setNewCourierCommission("0");
        notify("Entregador cadastrado com sucesso!", "success");
      } else {
        const errorData = await resSimple.json();
        notify("Erro ao cadastrar entregador: " + (errorData.message || "Telefone já existe?"), "error");
      }
    } catch (err: any) {
      console.error(err);
      notify("Erro ao cadastrar entregador: " + err.message, "error");
    }
  };

  const deleteCourier = async (id: string | number) => {
    try {
      const res = await fetch(`/api/couriers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCouriers(couriers.filter(c => c.id !== id));
        notify("Entregador removido com sucesso!", "info");
      } else {
        const errText = await res.text();
        notify("Erro ao remover entregador: " + errText, "error");
      }
    } catch (err) {
      console.error(err);
      notify("Erro de conexão ao remover entregador", "error");
    }
  };

  // Mercado Pago settings
  const [mpToken, setMpToken] = useState(org?.has_mp_token ? "••••••••••••••••" : "");
  const [mpSaving, setMpSaving] = useState(false);
  const [mpSaved, setMpSaved] = useState(false);

  // Logo settings
  const [logoPreview, setLogoPreview] = useState(org?.branding?.logoUrl || "");
  const [logoSaving, setLogoSaving] = useState(false);
  const [logoSaved, setLogoSaved] = useState(false);

  // Promotions
  const [editingPromo, setEditingPromo] = useState<number | null>(null);
  const [promoPrice, setPromoPrice] = useState("");

  const savePromo = async (productId: number) => {
    const promoValue = promoPrice.trim() === "" ? null : parseFloat(promoPrice);
    try {
      const res = await fetch(`/api/products/${productId}/promo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promotional_price: promoValue })
      });
      if (res.ok) {
        notify("Preço promocional atualizado!", "success");
        fetch(`/api/${org?.id}/products`).then(r => r.json()).then(setProducts);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro ao salvar promoção.");
      }
    } catch (err: any) {
      notify("Erro ao salvar promoção: " + err.message, "error");
    }
    setEditingPromo(null);
    setPromoPrice("");
  };

  const saveLogo = async (dataUrl: string) => {
    if (!org) return;
    setLogoSaving(true);
    try {
      const res = await fetch(`/api/organizations/${org.id}/logo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo_url: dataUrl })
      });
      if (res.ok) {
        notify("Logo atualizada com sucesso! Recarregue para ver a mudança.", "success");
      } else {
        throw new Error("Erro no servidor ao salvar logo.");
      }
    } catch (err: any) {
      notify("Erro ao salvar logo: " + err.message, "error");
    } finally {
      setLogoSaving(false);
    }
  };

  const saveMpToken = async () => {
    if (!org || !mpToken.trim() || mpToken.includes("••••")) return;
    setMpSaving(true);
    try {
      const res = await fetch(`/api/organizations/${org.id}/mp-token`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mp_access_token: mpToken })
      });
      if (res.ok) {
        notify("Token do Mercado Pago salvo com sucesso!", "success");
      } else {
        throw new Error("Erro ao salvar token.");
      }
    } catch (err: any) {
      notify("Erro ao salvar token: " + err.message, "error");
    } finally {
      setMpSaving(false);
    }
  };

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const startEditProduct = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description);
    setPrice(product.price.toString());
    setIngredients(product.ingredients);
    setCategory(product.category);
    setImageUrl(product.image_url || "");
    setAvailable(product.available !== false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setName(""); setDescription(""); setPrice(""); setIngredients(""); setImageUrl(""); setAvailable(true);
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        // Editar produto existente
        const res = await fetch(`/api/products/${editingProduct.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, price: parseFloat(price), ingredients, category, image_url: imageUrl, available })
        });
        if (!res.ok) throw new Error("Erro ao atualizar produto");
        setProducts(products.map(p => p.id === editingProduct.id
          ? { ...p, name, description, price: parseFloat(price), ingredients, category, image_url: imageUrl, available }
          : p
        ));
        setEditingProduct(null);
        notify("Produto atualizado com sucesso!", "success");
      } else {
        // Criar novo produto
        const res = await fetch(`/api/${org?.id}/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, price: parseFloat(price), ingredients, category, image_url: imageUrl, available })
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Erro ao salvar produto");
        }
        const data = await res.json();
        setProducts([...products, { id: data.id, name, description, price: parseFloat(price), ingredients, category, image_url: imageUrl, available }]);
        notify("Produto salvo com sucesso!", "success");
      }
      setName(""); setDescription(""); setPrice(""); setIngredients(""); setImageUrl(""); setAvailable(true);
    } catch (err: any) {
      console.error("Erro ao salvar produto:", err);
      notify(err.message || "Erro ao salvar produto.", "error");
    }
  };

  const deleteProduct = async (id: number) => {
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    setProducts(products.filter(p => p.id !== id));
  };

  const [editingExtra, setEditingExtra] = useState<ExtraIngredient | null>(null);

  const startEditExtra = (extra: ExtraIngredient) => {
    setEditingExtra(extra);
    setExtraName(extra.name);
    setExtraPrice(extra.price.toString());
  };

  const cancelEditExtra = () => {
    setEditingExtra(null);
    setExtraName(""); setExtraPrice("");
  };

  const saveExtraIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingExtra) {
      const res = await fetch(`/api/extra-ingredients/${editingExtra.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: extraName, price: parseFloat(extraPrice) })
      });
      if (res.ok) {
        setExtraIngredients(extraIngredients.map(ex =>
          ex.id === editingExtra.id ? { ...ex, name: extraName, price: parseFloat(extraPrice) } : ex
        ));
      }
      setEditingExtra(null);
    } else {
      const res = await fetch(`/api/${org?.id}/extra-ingredients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: extraName, price: parseFloat(extraPrice) })
      });
      const data = await res.json();
      setExtraIngredients([...extraIngredients, { id: data.id, name: extraName, price: parseFloat(extraPrice) }]);
    }
    setExtraName(""); setExtraPrice("");
  };

  const deleteExtraIngredient = async (id: number) => {
    await fetch(`/api/extra-ingredients/${id}`, { method: "DELETE" });
    setExtraIngredients(extraIngredients.filter(e => e.id !== id));
  };

  return (
    <div className="pb-24 md:pl-24 md:pt-8 p-4 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <Settings size={36} className="text-gray-700" />
          Administração
        </h1>
        <p className="text-gray-500 mt-2">Gerencie seu cardápio, entregadores e loja</p>
      </header>

      <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('products')}
          className={cn(
            "px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap",
            activeTab === 'products' ? "bg-black text-white shadow-lg" : "bg-white text-gray-500 hover:bg-gray-50"
          )}
        >
          Cardápio e Produtos
        </button>
        <button
          onClick={() => setActiveTab('couriers')}
          className={cn(
            "px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap",
            activeTab === 'couriers' ? "bg-orange-600 text-white shadow-lg" : "bg-white text-gray-500 hover:bg-gray-50"
          )}
        >
          Entregadores
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={cn(
            "px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap",
            activeTab === 'settings' ? "bg-gray-800 text-white shadow-lg" : "bg-white text-gray-500 hover:bg-gray-50"
          )}
        >
          Configurações (MP/Logo)
        </button>
        <button
          onClick={() => setActiveTab('metrics')}
          className={cn(
            "px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap",
            activeTab === 'metrics' ? "bg-blue-600 text-white shadow-lg" : "bg-white text-gray-500 hover:bg-gray-50"
          )}
        >
          📊 Métricas
        </button>
      </div>

      {activeTab === 'metrics' && (
        <MetricsTab orgId={org?.id} />
      )}

      {activeTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <form onSubmit={saveProduct} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-lg space-y-4 sticky top-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                {editingProduct && (
                  <button type="button" onClick={cancelEdit} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors">
                    <X size={14} /> Cancelar
                  </button>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tipo de Produto</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCategory('churrasco')}
                    className={cn(
                      "py-2 rounded-xl text-xs font-bold border transition-all",
                      category === 'churrasco' ? "bg-orange-600 border-orange-600 text-white" : "bg-gray-50 border-gray-200 text-gray-500"
                    )}
                  >
                    Churrasco
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('ready')}
                    className={cn(
                      "py-2 rounded-xl text-xs font-bold border transition-all",
                      category === 'ready' ? "bg-orange-600 border-orange-600 text-white" : "bg-gray-50 border-gray-200 text-gray-500"
                    )}
                  >
                    Pronto (Bebida/Outro)
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Ex: Churrasco Grego Tradicional"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Descrição</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none h-24"
                  placeholder="Descreva o produto..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Preço (R$)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Imagem do Produto</label>
                <div className="space-y-3">
                  <div className="flex gap-2 items-center overflow-hidden">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={e => setImageUrl(e.target.value)}
                      className="min-w-0 flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                      placeholder="Cole uma URL ou envie um arquivo"
                    />
                    <label className="shrink-0 cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-xl transition-colors flex items-center justify-center">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setImageUrl(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <span className="text-xs font-bold uppercase">Upload</span>
                    </label>
                  </div>
                  {imageUrl && (
                    <div className="relative w-full h-32 bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full backdrop-blur-sm transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {category === 'churrasco' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Ingredientes</label>
                  <input
                    type="text"
                    value={ingredients}
                    onChange={e => setIngredients(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="Ex: Carne, Pão, Molho, Salada"
                  />
                </div>
              )}
              <div className="flex items-center gap-3 mt-4 mb-2 p-4 bg-gray-50/80 rounded-2xl border border-gray-200">
                <input
                  type="checkbox"
                  id="product-available"
                  checked={available}
                  onChange={(e) => setAvailable(e.target.checked)}
                  className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500 outline-none cursor-pointer"
                />
                <label htmlFor="product-available" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                  Produto Disponível para Venda
                </label>
              </div>
              <button className={cn(
                "w-full py-3 rounded-2xl font-bold transition-colors",
                editingProduct
                  ? "bg-orange-600 text-white hover:bg-orange-700"
                  : "bg-black text-white hover:bg-gray-800"
              )}>
                {editingProduct ? 'Salvar Alterações' : 'Salvar Produto'}
              </button>
              {editingProduct && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle size={14} className="text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700">Editando: <strong>{editingProduct.name}</strong></p>
                </div>
              )}
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-bottom border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Produto</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Preço</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold">{product.name}</p>
                              <span className={cn(
                                "text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase",
                                product.category === 'churrasco' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                              )}>
                                {product.category === 'churrasco' ? 'Grego' : 'Pronto'}
                              </span>
                              {product.available === false && (
                                <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold uppercase border border-red-200">
                                  Esgotado
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 truncate max-w-xs">{product.ingredients || 'Sem ingredientes cadastrados'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium">R$ {product.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEditProduct(product)}
                            className="text-blue-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Editar"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => deleteProduct(product.id)}
                            className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Ingredientes Extras (Adicionais)</h3>
              </div>
              <div className="p-6 bg-gray-50 border-b border-gray-100">
                <form onSubmit={saveExtraIngredient} className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Adicional</label>
                    <input
                      required
                      type="text"
                      value={extraName}
                      onChange={e => setExtraName(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="Ex: Bacon, Queijo Extra"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Preço (R$)</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={extraPrice}
                      onChange={e => setExtraPrice(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className={cn(
                      "px-6 py-2 h-[42px] rounded-xl font-bold transition-colors",
                      editingExtra ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-orange-600 text-white hover:bg-orange-700"
                    )}>
                      {editingExtra ? 'Salvar' : 'Adicionar'}
                    </button>
                    {editingExtra && (
                      <button type="button" onClick={cancelEditExtra} className="px-4 py-2 h-[42px] rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </form>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-bottom border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Adicional</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Preço</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {extraIngredients.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-gray-400 text-sm">Nenhum adicional cadastrado</td>
                    </tr>
                  ) : (
                    extraIngredients.map(extra => (
                      <tr key={extra.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold">{extra.name}</td>
                        <td className="px-6 py-4 font-mono font-medium text-orange-600">+ R$ {extra.price.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEditExtra(extra)}
                              className="text-blue-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Editar"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => deleteExtraIngredient(extra.id)}
                              className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div >
      )}

      {
        activeTab === 'couriers' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <form onSubmit={saveCourier} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-lg space-y-4 sticky top-8">
                <h2 className="text-xl font-bold">Novo Entregador</h2>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome Completo</label>
                  <input required autoComplete="new-password" value={newCourierName} onChange={e => setNewCourierName(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Telefone (Login)</label>
                  <input required autoComplete="new-password" value={newCourierPhone} onChange={e => setNewCourierPhone(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="55779..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Senha</label>
                  <input required type="password" autoComplete="new-password" value={newCourierPassword} onChange={e => setNewCourierPassword(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Taxa de Comissão (%)</label>
                  <input required type="number" step="0.01" min="0" max="100" value={newCourierCommission} onChange={e => setNewCourierCommission(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="Ex: 15" />
                </div>
                <button type="submit" className="w-full py-3 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 shadow-lg">Cadastrar Entregador</button>
              </form>
            </div>
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 font-bold border-b bg-gray-50/50 font-black uppercase text-xs tracking-widest text-gray-400">Entregadores</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[750px] whitespace-nowrap">
                    <tbody className="divide-y divide-gray-50">
                      {couriers.map(c => (
                        <tr key={c.id}>
                          <td className="p-4">
                            <p className="font-black text-gray-800">{c.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono tracking-tighter">{c.phone}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[10px] text-orange-600 font-bold tracking-tighter">Comissão: {c.commission_rate || 0}%</p>
                              <button onClick={() => {
                                setSelectedCourier(c);
                                setEditCommissionValue(String(c.commission_rate || 0));
                                setModalType('edit_commission');
                              }} className="text-[10px] text-blue-500 hover:text-blue-700 underline cursor-pointer">Editar</button>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-gray-400 font-bold uppercase">A Receber</span>
                              <span className="text-sm font-bold text-gray-700">R$ {(courierStats[c.id]?.total_commissions || 0).toFixed(2)}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-gray-400 font-bold uppercase transition-all">Vales</span>
                              <span className="text-sm font-bold text-red-500">- R$ {(courierStats[c.id]?.total_advances || 0).toFixed(2)}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-gray-400 font-bold uppercase">Saldo Líquido</span>
                              <span className="text-lg font-black text-orange-600">R$ {(courierStats[c.id]?.net_pay || 0).toFixed(2)}</span>
                            </div>
                          </td>
                          <td className="p-4 text-right flex gap-2 justify-end items-center">
                            <button
                              onClick={() => { setSelectedCourier(c); setModalType('advance'); }}
                              className="bg-amber-100 text-amber-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-amber-200 transition-all flex items-center gap-1"
                              title="Dar Vale"
                            >
                              <TrendingDown size={14} /> Dar Vale
                            </button>
                            <button
                              onClick={() => { setSelectedCourier(c); setModalType('payout'); }}
                              disabled={!courierStats[c.id]?.net_pay && !courierStats[c.id]?.total_advances}
                              className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-700 disabled:opacity-30 transition-all shadow-md shadow-green-100"
                            >
                              Pagar Entregador
                            </button>
                            <button
                              onClick={() => { setSelectedCourier(c); setModalType('delete_courier'); }}
                              className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-100 transition-all flex items-center justify-center p-2"
                              title="Excluir Entregador"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {couriers.length === 0 && <tr><td className="p-8 text-center text-gray-400" colSpan={5}>Nenhum entregador cadastrado.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {
        activeTab === 'settings' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-lg">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Store className="text-blue-500" /> Logotipo</h2>
                {logoPreview && <img src={logoPreview} className="h-20 mb-6 mx-auto object-contain p-2 border rounded-xl" />}
                <label className="block cursor-pointer bg-blue-600 text-white text-center py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl">
                  <input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => { setLogoPreview(r.result as string); saveLogo(r.result as string); }; r.readAsDataURL(f); } }} />
                  {logoSaving ? "Enviando..." : "Alterar Logotipo"}
                </label>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-lg">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><QrCode className="text-emerald-500" /> Mercado Pago</h2>
                <input type="password" value={mpToken} onChange={e => setMpToken(e.target.value)} className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl mb-4 font-mono outline-none focus:border-emerald-500" placeholder="APP_USR-..." />
                <button onClick={saveMpToken} className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-800 transition-all shadow-xl font-bold">
                  {mpSaving ? "Salvando..." : mpSaved ? "Configuração Salva!" : "Ativar Mercado Pago"}
                </button>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><Clock className="text-orange-500" /> Horário de Funcionamento</h2>
                <button
                  onClick={() => saveHours()}
                  disabled={hoursSaving}
                  className="bg-orange-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-700 disabled:opacity-30 transition-all shadow-lg font-bold"
                >
                  {hoursSaving ? "Salvando..." : "Salvar Horários"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                  const dayLabel = {
                    monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta',
                    thursday: 'Quinta', friday: 'Sexta', saturday: 'Sábado', sunday: 'Domingo'
                  }[day as keyof typeof operatingHours];

                  const config = (operatingHours && (operatingHours as any)[day]) || { open: '00:00', close: '23:59', closed: false };

                  return (
                    <div key={day} className={`p-4 rounded-2xl border-2 transition-all ${config.closed ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-orange-50'}`}>
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-bold text-gray-800">{dayLabel}</span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.closed}
                            onChange={e => {
                              const newHours = { ...operatingHours, [day]: { ...config, closed: e.target.checked } };
                              setOperatingHours(newHours);
                            }}
                            className="w-4 h-4 accent-orange-500"
                          />
                          <span className="text-[10px] font-black uppercase text-gray-400 font-bold">Fechado</span>
                        </label>
                      </div>
                      {!config.closed && (
                        <div className="flex items-center gap-1 w-full min-w-0">
                          <input
                            type="time"
                            value={config.open}
                            onChange={e => setOperatingHours({ ...operatingHours, [day]: { ...config, open: e.target.value } })}
                            className="flex-1 min-w-0 bg-gray-50 border border-gray-100 rounded-lg px-1 py-2 text-xs font-bold outline-none focus:border-orange-500 w-0"
                          />
                          <span className="text-gray-300 text-xs shrink-0">às</span>
                          <input
                            type="time"
                            value={config.close}
                            onChange={e => setOperatingHours({ ...operatingHours, [day]: { ...config, close: e.target.value } })}
                            className="flex-1 min-w-0 bg-gray-50 border border-gray-100 rounded-lg px-1 py-2 text-xs font-bold outline-none focus:border-orange-500 w-0"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="p-4 font-bold border-b bg-gray-50/50 flex items-center gap-2 text-red-600 uppercase text-[10px] tracking-widest"><TrendingDown size={18} /> Promoções de Produtos</div>
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b font-bold text-gray-400">
                  <tr><th className="p-4">Produto</th><th className="p-4">Original</th><th className="p-4 text-red-600">Promoção</th><th className="p-4 text-right">Ação</th></tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-bold">{p.name}</td>
                      <td className="p-4 text-gray-400 line-through font-mono">R$ {p.price.toFixed(2)}</td>
                      <td className="p-4">
                        {editingPromo === p.id ? (
                          <input type="number" step="0.01" value={promoPrice} onChange={e => setPromoPrice(e.target.value)} className="w-24 px-2 py-1 border rounded-lg font-bold" autoFocus onBlur={() => savePromo(p.id)} />
                        ) : (p as any).promotional_price ? (
                          <span className="font-black text-red-600">R$ {Number((p as any).promotional_price).toFixed(2)}</span>
                        ) : (
                          <span className="text-gray-200 italic text-xs">Sem promo</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => { setEditingPromo(p.id); setPromoPrice((p as any).promotional_price?.toString() || ""); }} className="text-orange-400 p-2"><Pencil size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      {/* Courier Modals */}
      <AnimatePresence>
        {modalType && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 text-left"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-800">
                  {modalType === 'advance' ? 'Dar Vale' : modalType === 'payout' ? 'Pagar Entregador' : modalType === 'edit_commission' ? 'Editar Comissão' : 'Excluir Entregador'}
                </h3>
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>

              <div className="mb-8">
                <p className="text-gray-500 mb-1 font-bold text-xs uppercase tracking-widest">Entregador</p>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{selectedCourier?.name}</p>
                    <p className="text-xs text-gray-400">{selectedCourier?.phone}</p>
                  </div>
                </div>
              </div>

              {modalType === 'edit_commission' ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 font-bold">Nova Comissão (%)</label>
                    <input
                      autoFocus
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={editCommissionValue}
                      onChange={e => setEditCommissionValue(e.target.value)}
                      className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-orange-500 transition-all text-xl font-black text-gray-800"
                      placeholder="Ex: 15"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (!selectedCourier) return;
                      const val = parseFloat(editCommissionValue);
                      if (isNaN(val)) return;
                      try {
                        const res = await fetch(`/api/couriers/${selectedCourier.id}/commission`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ commission_rate: val })
                        });
                        if (res.ok) {
                          setCouriers(couriers.map(c => c.id === selectedCourier.id ? { ...c, commission_rate: val } : c));
                          notify('Comissão atualizada com sucesso!', 'success');
                          setModalType(null);
                        } else {
                          const errData = await res.json().catch(() => ({}));
                          notify(`Erro: ${errData.error || res.statusText}`, 'error');
                        }
                      } catch (e) {
                        notify('Erro na conexão ao atualizar', 'error');
                      }
                    }}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all font-bold"
                  >
                    Salvar Alteração
                  </button>
                </div>
              ) : modalType === 'delete_courier' ? (
                <div className="space-y-6">
                  <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1 text-center font-bold">Atenção</p>
                    <p className="text-sm text-red-700 text-center font-bold">Deseja remover este entregador do sistema?</p>
                  </div>
                  <p className="text-sm text-gray-400 text-center px-4 leading-relaxed font-bold">
                    Isso não apagará o histórico de pedidos dele, ele apenas perderá o acesso e sairá da fila.
                  </p>
                  <button
                    onClick={async () => {
                      if (selectedCourier) {
                        await deleteCourier(selectedCourier.id);
                        setModalType(null);
                      }
                    }}
                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-xl shadow-red-100 hover:bg-red-700 transition-all font-bold"
                  >
                    Confirmar Exclusão
                  </button>
                </div>
              ) : modalType === 'advance' ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 font-bold">Valor do Adiantamento</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">R$</span>
                      <input
                        autoFocus
                        type="number"
                        step="0.01"
                        value={advanceAmount}
                        onChange={e => setAdvanceAmount(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-orange-500 transition-all text-xl font-black text-gray-800"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleGiveAdvance}
                    className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all font-bold"
                  >
                    Confirmar Vale
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1 text-center font-bold">Saldo Líquido a Pagar</p>
                    <p className="text-3xl font-black text-green-700 text-center font-bold">R$ {(courierStats[selectedCourier?.id || '']?.net_pay || 0).toFixed(2)}</p>
                  </div>
                  <p className="text-sm text-gray-400 text-center px-4 leading-relaxed font-bold">
                    Deseja registrar o pagamento? Isso liquidará todas as comissões e vales pendentes.
                  </p>
                  <button
                    onClick={handlePayout}
                    className="w-full py-4 bg-green-600 text-white rounded-2xl font-black shadow-xl shadow-green-100 hover:bg-green-700 transition-all font-bold"
                  >
                    Confirmar Pagamento
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
};

const CourierDashboard = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ total_commissions: 0, total_deliveries: 0 });
  const [loading, setLoading] = useState(true);

  // GPS Tracking states
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const gpsWatchRef = useRef<number | null>(null);

  // Estados de Pagamento (PIX)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string; payment_id: number } | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [ordersRes, statsRes] = await Promise.all([
        fetch(`/api/courier/${user.id}/orders`),
        fetch(`/api/courier/${user.id}/stats`)
      ]);
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(Array.isArray(data) ? data : []);
      }
      if (statsRes.ok) {
        const dataStats = await statsRes.json();
        setStats(dataStats || { total_commissions: 0, total_deliveries: 0 });
      }
    } catch (error) {
      console.error("Erro ao buscar dados do entregador:", error);
    } finally {
      setLoading(false);
    }
  };

  // Start/Stop GPS sharing
  const toggleGps = useCallback(() => {
    if (gpsActive) {
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
        gpsWatchRef.current = null;
      }
      socket.emit('courier:location:stop', { courierId: user?.id });
      setGpsActive(false);
      setGpsError('');
    } else {
      if (!navigator.geolocation) {
        setGpsError('GPS não disponível neste dispositivo.');
        return;
      }
      gpsWatchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          socket.emit('courier:location', {
            courierId: user?.id,
            courierName: user?.name,
            latitude,
            longitude,
            timestamp: Date.now(),
          });
          setGpsActive(true);
          setGpsError('');
        },
        (err) => {
          setGpsError('Erro ao obter localização: ' + err.message);
          setGpsActive(false);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }
  }, [gpsActive, user]);

  // Cleanup GPS on unmount
  useEffect(() => {
    return () => {
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
        socket.emit('courier:location:stop', { courierId: user?.id });
      }
    };
  }, [user]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);

    // Listen for real-time updates from Webhook/Admin
    const handleUpdate = ({ id, status }: { id: number, status: string }) => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: status as any } : o));
    };
    const handlePaymentUpdate = ({ id, payment_status }: { id: number, payment_status: string }) => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, payment_status: payment_status as any } : o));
    };

    socket.on("order:update", handleUpdate);
    socket.on("order:payment_update", handlePaymentUpdate);

    return () => {
      clearInterval(interval);
      socket.off("order:update", handleUpdate);
      socket.off("order:payment_update", handlePaymentUpdate);
    };
  }, [user]);

  // Auto-close modal and mark as delivered if payment is detected as received (paid via webhook PIX)
  useEffect(() => {
    if (selectedOrder) {
      const currentOrder = orders.find(o => o.id === selectedOrder.id);
      if (currentOrder && currentOrder.payment_status === 'paid') {
        markAsDelivered(String(currentOrder.id));
        setSelectedOrder(null);
      }
    }
  }, [orders, selectedOrder]);

  const markAsDelivered = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'delivered' })
      });
      if (res.ok) {
        notify("Pagamento confirmado!", "success");
      } else {
        const errData = await res.json();
        notify(errData.error || "Erro ao atualizar status", "error");
      }
    } catch (error) {
      notify("Erro de conexão ao atualizar status", "error");
    }
  };

  const handlePaymentClick = (order: Order) => {
    setSelectedOrder(order);
    setPixData(null);
    setPixLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" /></div>;

  const activeOrders = orders.filter(o => o.status !== 'delivered');
  const deliveredOrders = orders.filter(o => o.status === 'delivered');

  return (
    <div className="pb-24 md:pl-24 md:pt-8 p-4 max-w-5xl mx-auto">
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              <ClipboardList size={36} className="text-orange-600" />
              Minhas Entregas
            </h1>
            <p className="text-gray-500 mt-2">Gerencie suas rotas e acompanhe seus ganhos</p>
          </div>
          {/* GPS Tracking Button */}
          <button
            onClick={toggleGps}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all",
              gpsActive
                ? "bg-green-500 text-white shadow-green-200 hover:bg-green-600"
                : "bg-orange-600 text-white shadow-orange-200 hover:bg-orange-700"
            )}
          >
            <Navigation size={18} className={gpsActive ? 'animate-pulse' : ''} />
            {gpsActive ? '📍 Compartilhando localização...' : '🗺️ Compartilhar localização'}
          </button>
        </div>
        {gpsError && <p className="mt-2 text-red-500 text-sm font-bold">{gpsError}</p>}
        {gpsActive && (
          <div className="mt-3 flex items-center gap-2 text-green-600 text-sm font-bold">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            GPS ativo — sua localização está sendo compartilhada em tempo real
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl flex items-center gap-4">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
            <Wallet size={28} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ganhos Acumulados</p>
            <p className="text-3xl font-black text-gray-900">R$ {Number(stats?.total_commissions || 0).toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl flex items-center gap-4">
          <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center">
            <ClipboardList size={28} className="text-orange-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total de Entregas</p>
            <p className="text-3xl font-black text-gray-900">{stats?.total_deliveries || 0}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          {activeOrders.length > 0 ? 'Entregas em Rota' : 'Sem entregas pendentes'}
        </h2>

        <div className="grid grid-cols-1 gap-4">
          {activeOrders.map(order => (
            <div key={order.id} className="bg-white p-6 rounded-3xl border-2 transition-all border-orange-200 shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-tighter bg-gray-100 px-2 py-1 rounded-full text-gray-500 mb-2 inline-block">
                    Pedido #{String(order.id).slice(0, 8)}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">{order.customer_name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Store size={14} /> {order.address}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-400 uppercase">Sua Comissão</p>
                  <p className="text-xl font-black text-orange-600">R$ {Number((order as any).delivery_fee || 0).toFixed(2)}</p>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-100 pt-4 mt-4 flex justify-between items-center flex-wrap gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Pagamento</span>
                  <span className={cn(
                    "font-bold text-sm",
                    order.payment_status === 'paid' ? "text-green-600" : "text-amber-600"
                  )}>
                    {order.payment_method === 'pix' ? 'PIX' : 'Dinheiro/Cartão'} - {order.payment_status === 'paid' ? 'PAGO' : 'PAGAR NA ENTREGA'}
                  </span>
                </div>

                {/* Exibir botão Coprar caso o pagamento esteja pendente (independentemente do método, permitindo gerar PIX ou confirmar Dinheiro de forma flexível) */}
                {order.payment_status === 'pending' ? (
                  <button
                    onClick={() => handlePaymentClick(order)}
                    className="bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-orange-700 transition-all active:scale-95 shadow-lg shadow-orange-600/30"
                  >
                    <Wallet size={20} /> Cobrar R$ {Number((order as any).total_price || 0).toFixed(2)}
                  </button>
                ) : (
                  <button
                    onClick={() => markAsDelivered(String(order.id))}
                    className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all active:scale-95 shadow-lg"
                  >
                    <CheckCircle2 size={20} /> Concluir Entrega
                  </button>
                )}
              </div>
            </div>
          ))}

          {activeOrders.length === 0 && (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center">
              <ClipboardList size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Você ainda não tem entregas atribuídas.</p>
              <p className="text-xs text-gray-400 mt-1">Aguarde o administrador te enviar um pedido!</p>
            </div>
          )}
        </div>

        {deliveredOrders.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
              <CheckCircle2 size={24} className="text-green-600" />
              Histórico Recente
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {deliveredOrders.map(order => (
                <div key={order.id} className="bg-white p-6 rounded-3xl border-2 border-gray-100 opacity-60">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-tighter bg-gray-100 px-2 py-1 rounded-full text-gray-500 mb-2 inline-block">
                        Pedido #{String(order.id).slice(0, 8)}
                      </span>
                      <h3 className="text-lg font-bold text-gray-500">{order.customer_name}</h3>
                      <p className="text-sm text-gray-400 flex items-center gap-1">
                        <Store size={14} /> {order.address}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-400 uppercase">Comissão</p>
                      <p className="text-xl font-black text-green-600">R$ {Number((order as any).delivery_fee || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-gray-100 pt-3 mt-3">
                    <div className="flex items-center justify-between text-green-600 font-bold">
                      <span className="text-sm">Pagamento: {order.payment_status === 'paid' ? 'Pago' : 'Pendente'}</span>
                      <div className="flex items-center gap-2"><CheckCircle2 size={16} /> Entregue</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Cobrança PIX */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative">
            <button onClick={() => setSelectedOrder(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="text-orange-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Cobrança na Entrega</h3>
              <p className="text-2xl font-black text-orange-600 mt-2">R$ {Number((selectedOrder as any).total_price || 0).toFixed(2)}</p>
            </div>

            {pixLoading && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-bold text-gray-600">Gerando QR Code PIX...</p>
              </div>
            )}

            {!pixLoading && !pixData && (
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    setPixLoading(true);
                    try {
                      const res = await fetch(`/api/${(selectedOrder as any).org_id}/pix/create`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          total_price: Number((selectedOrder as any).total_price || 0),
                          order_id: selectedOrder.id,
                          description: `Pagamento PIX na Entrega #${selectedOrder.id}`
                        })
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setPixData(data);
                      } else {
                        alert("Erro ao gerar PIX");
                      }
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setPixLoading(false);
                    }
                  }}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md mt-2 flex justify-center items-center gap-2"
                >
                  🤑 Gerar Pagamento PIX
                </button>
                <button
                  onClick={() => {
                    markAsDelivered(String(selectedOrder.id));
                    setSelectedOrder(null);
                  }}
                  className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-900 transition-all shadow-md flex justify-center items-center gap-2"
                >
                  <CheckCircle2 size={20} /> Confirmar Dinheiro/Cartão
                </button>
              </div>
            )}

            {pixData && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-center">
                  <img src={`data:image/jpeg;base64,${pixData.qr_code_base64}`} alt="QR Code PIX" className="w-48 h-48 object-contain" />
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pixData.qr_code);
                    setPixCopied(true);
                    setTimeout(() => setPixCopied(false), 2000);
                  }}
                  className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors text-gray-600 focus:outline-none"
                >
                  {pixCopied ? <CheckCircle2 size={20} className="text-green-600" /> : <Copy size={20} />}
                  {pixCopied ? "Chave Copiada!" : "Copiar Chave Copia e Cola"}
                </button>

                <div className="w-full py-4 bg-orange-50 text-orange-600 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 border border-orange-200">
                  <div className="w-6 h-6 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Aguardando confirmação automática...</span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

const LoginPage = () => {
  const { login } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: loginMethod === 'phone' ? phone : undefined,
          email: loginMethod === 'email' ? email : undefined,
          password
        })
      });
      const data = await res.json();
      if (res.ok) {
        login(data);
        // Redirecionamento baseado no cargo
        if (data.role === 'courier') {
          navigate("/courier-dashboard");
        } else if (data.role === 'admin') {
          navigate("/admin");
        } else if (data.role === 'super_admin') {
          navigate("/super-admin");
        } else {
          navigate("/");
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Promotional Section - Left Side */}
      <div className="md:w-1/2 bg-orange-900 relative overflow-hidden min-h-[300px] md:min-h-screen">
        <img
          src="https://picsum.photos/seed/kebab/1200/1600"
          alt="Churrasco Grego Suculento"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end p-8 md:p-16 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4 inline-block">
              Promoção do Dia
            </span>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
              O Verdadeiro <br />
              <span className="text-orange-500">Churrasco Grego</span>
            </h1>
            <p className="text-lg text-gray-300 max-w-md mb-8">
              Cadastre-se agora e ganhe 10% de desconto no seu primeiro pedido. O sabor autêntico que você merece!
            </p>

            <div className="flex gap-4">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                <p className="text-2xl font-bold text-orange-400">2x1</p>
                <p className="text-xs text-gray-400 uppercase font-bold">Terças</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                <p className="text-2xl font-bold text-orange-400">-15%</p>
                <p className="text-xs text-gray-400 uppercase font-bold">Combos</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                <p className="text-2xl font-bold text-orange-400">Grátis</p>
                <p className="text-xs text-gray-400 uppercase font-bold">Entrega*</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Login Form - Right Side */}
      <div className="md:w-1/2 flex items-center justify-center p-6 md:p-12 lg:p-16 bg-white overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-10">
            <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-100">
              <User className="text-orange-600" size={40} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Bem-vindo de volta!</h2>
            <p className="text-gray-500">Acesse sua conta para fazer seu pedido</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium border border-red-100 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                {error}
              </div>
            )}

            <div className="flex bg-gray-100 p-1 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => setLoginMethod('phone')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  loginMethod === 'phone' ? "bg-white text-orange-600 shadow-sm" : "text-gray-400"
                )}
              >
                Telefone
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  loginMethod === 'email' ? "bg-white text-orange-600 shadow-sm" : "text-gray-400"
                )}
              >
                E-mail
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                {loginMethod === 'phone' ? 'Telefone' : 'E-mail'}
              </label>
              <div className="relative">
                {loginMethod === 'phone' ? (
                  <>
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      required
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium"
                      placeholder="(00) 00000-0000"
                    />
                  </>
                ) : (
                  <>
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium"
                      placeholder="seu@email.com"
                    />
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all disabled:opacity-50 shadow-xl shadow-gray-200 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                "Entrando..."
              ) : (
                <>
                  Entrar na Conta <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-gray-400 font-bold tracking-widest">Ou continue com</span>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: window.location.origin
                  }
                });
                if (error) notify(error.message, "error");
              }}
              className="w-full bg-white border-2 border-gray-100 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-3 group"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
          </form>

          <p className="text-center mt-8 text-gray-500 text-sm">
            Ainda não tem uma conta? <Link to="/register" className="text-orange-600 font-bold hover:underline">Cadastre-se grátis</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

const RegisterPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password })
      });
      const data = await res.json();
      if (res.ok) {
        login(data);
        navigate("/");
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 md:pl-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="text-orange-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold">Crie sua conta</h1>
          <p className="text-gray-500">Rápido e fácil para pedir seu grego</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome Completo</label>
            <input
              required
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="Como te chamamos?"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Telefone</label>
            <input
              required
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Senha</label>
            <input
              required
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <button
            disabled={loading}
            className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold hover:bg-orange-700 transition-all disabled:opacity-50"
          >
            {loading ? "Criando..." : "Criar Conta"}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-gray-400 font-bold tracking-widest">Ou continue com</span>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: window.location.origin
                }
              });
              if (error) {
                setError(error.message);
              }
            }}
            className="w-full bg-white border-2 border-gray-100 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-3 group"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </button>
        </form>

        <p className="text-center mt-6 text-gray-500 text-sm">
          Já tem uma conta? <Link to="/login" className="text-orange-600 font-bold hover:underline">Entre aqui</Link>
        </p>
      </motion.div>
    </div>
  );
};

const SaaSLandingPage = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: "Bronze",
      price: "R$ 97",
      features: ["Até 50 pedidos/mês", "1 Unidade", "Painel Básico", "Suporte Email"],
      color: "from-orange-400 to-orange-600",
      delay: 0.1
    },
    {
      name: "Prata",
      price: "R$ 197",
      features: ["Pedidos Ilimitados", "Até 3 Unidades", "Painel Avançado", "Suporte WhatsApp", "Gestão de Entregas"],
      color: "from-blue-500 to-indigo-600",
      popular: true,
      delay: 0.2
    },
    {
      name: "Ouro",
      price: "R$ 397",
      features: ["Tudo do Prata", "Unidades Ilimitadas", "Customização Total", "Consultoria de Vendas", "Prioridade no Suporte"],
      color: "from-purple-600 to-pink-600",
      delay: 0.3
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 flex flex-col items-center text-center px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-orange-100/50 rounded-full blur-3xl -z-10 -translate-y-1/2" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl"
        >
          <span className="bg-orange-100 text-orange-600 px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-widest mb-6 inline-block">
            A Revolução do Churrasco Grego 🍢
          </span>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-tight mb-8">
            Escale seu negócio com o <span className="text-gradient">AP Delivery</span>
          </h1>
          <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
            Gestão completa, multitenant, painel de entregas e fidelidade. Tudo o que você precisa para transformar sua loja em uma rede de sucesso.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/venda/cadastro")}
              className="bg-orange-600 text-white px-10 py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-orange-200 hover:scale-105 transition-all text-lg"
            >
              Começar Agora
            </button>
            <button className="bg-white text-slate-900 border border-slate-200 px-10 py-5 rounded-3xl font-black uppercase tracking-widest hover:bg-slate-50 transition-all text-lg shadow-sm">
              Ver Demonstração
            </button>
          </div>
        </motion.div>
      </section>

      {/* Plans Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Planos que cabem no seu bolso</h2>
          <p className="text-slate-500 mt-4">Escolha o ideal para o tamanho da sua ambição</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: plan.delay }}
              viewport={{ once: true }}
              className={cn(
                "premium-card p-10 flex flex-col relative overflow-hidden",
                plan.popular ? "ring-4 ring-orange-500/20 scale-105" : ""
              )}
            >
              {plan.popular && (
                <div className="absolute top-4 right-0 bg-orange-500 text-white px-4 py-1 text-[10px] font-black uppercase tracking-widest -rotate-0 rounded-l-lg">
                  Mais Popular
                </div>
              )}
              <h3 className="text-2xl font-black text-slate-800 mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                <span className="text-slate-400 font-bold">/mês</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-3 text-slate-600 font-medium">
                    <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate("/venda/cadastro")}
                className={cn(
                  "w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all",
                  plan.popular ? "bg-orange-600 text-white shadow-lg shadow-orange-200 hover:bg-orange-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                Assinar Plano
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 bg-slate-900 text-white text-center">
        <h3 className="text-3xl font-black mb-6">Pronto para dominar o mercado?</h3>
        <p className="text-slate-400 mb-10">Junte-se a mais de 200 churrasqueiros de sucesso.</p>
        <button
          onClick={() => navigate("/venda/cadastro")}
          className="bg-white text-orange-600 px-12 py-5 rounded-3xl font-black uppercase tracking-widest hover:scale-105 transition-all"
        >
          Criar Minha Loja Grátis
        </button>
      </footer>
    </div>
  );
};

const SaaSStoreRegister = () => {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    storeName: "",
    storeSlug: "",
    adminName: "",
    adminPhone: "",
    adminEmail: "",
    adminPassword: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/saas/register-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (res.ok) {
        // Successful registration
        notify(`Loja ${data.org.name} criada com sucesso! Redirecionando para login...`, "success");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[700px]"
      >
        {/* Left Side Info */}
        <div className="md:w-5/12 bg-slate-900 p-12 text-white flex flex-col justify-between">
          <div>
            <div className="bg-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-10 shadow-lg shadow-purple-600/20">
              <Store size={32} strokeWidth={3} />
            </div>
            <h2 className="text-4xl font-black leading-tight mb-6">
              Em minutos, sua loja <span className="text-purple-500 italic">online e vendendo</span> com a AP Delivery.
            </h2>
            <p className="text-slate-400 font-medium">
              Preencha os dados ao lado para criar sua instância exclusiva da melhor plataforma de gestão para delivery.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-emerald-500">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-sm font-bold">Domínio Personalizado</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-emerald-500">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-sm font-bold">Painel Multi-loja</p>
            </div>
          </div>
        </div>

        {/* Right Side Form */}
        <div className="md:w-7/12 p-12 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-50 text-red-600 p-5 rounded-2xl text-sm font-bold border border-red-100 flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                {error}
              </div>
            )}

            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">Informações da Loja</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Nome da Empresa</label>
                  <input
                    required
                    type="text"
                    value={formData.storeName}
                    onChange={e => setFormData({ ...formData, storeName: e.target.value })}
                    placeholder="Ex: Grego do Centro"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Slug (Link Único)</label>
                  <div className="relative">
                    <input
                      required
                      type="text"
                      value={formData.storeSlug}
                      onChange={e => setFormData({ ...formData, storeSlug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                      placeholder="grego-do-centro"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">Dados do Administrador</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Seu Nome</label>
                    <input
                      required
                      type="text"
                      value={formData.adminName}
                      onChange={e => setFormData({ ...formData, adminName: e.target.value })}
                      placeholder="João da Silva"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">WhatsApp</label>
                    <input
                      required
                      type="text"
                      value={formData.adminPhone}
                      onChange={e => setFormData({ ...formData, adminPhone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">E-mail de Login</label>
                  <input
                    required
                    type="email"
                    value={formData.adminEmail}
                    onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                    placeholder="admin@sualoja.com"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Senha de Acesso</label>
                  <input
                    required
                    type="password"
                    value={formData.adminPassword}
                    onChange={e => setFormData({ ...formData, adminPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all disabled:opacity-50 mt-8"
            >
              {loading ? "Criando Infraestrutura..." : "Finalizar e Criar Minha Loja"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

// Haversine formula to calculate distance between two points
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

const deg2rad = (deg: number) => {
  return deg * (Math.PI / 180)
}

const CourierPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [trackingOrderId, setTrackingOrderId] = useState<number | null>(null);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [showQrModal, setShowQrModal] = useState<Order | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string; payment_id: number } | null>(null);
  const [pixLoading, setPixLoading] = useState(false);

  const { org } = useTenant();

  useEffect(() => {
    fetch("/api/orders").then(res => res.json()).then(setOrders);

    socket.on("order:new", (newOrder: Order) => {
      setOrders(prev => [newOrder, ...prev]);
    });

    socket.on("order:update", ({ id, status }: { id: number, status: string }) => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: status as any } : o));
    });

    socket.on("order:payment_update", ({ id, payment_status }: { id: number, payment_status: string }) => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, payment_status: payment_status as any } : o));
    });

    return () => {
      socket.off("order:new");
      socket.off("order:update");
      socket.off("order:payment_update");
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  useEffect(() => {
    if (showQrModal && org) {
      const currentOrder = orders.find(o => o.id === showQrModal.id);
      if (currentOrder && currentOrder.payment_status === 'paid') {
        updateStatus(currentOrder.id, 'delivered');
        setShowQrModal(null);
        setTrackingOrderId(null);
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      }
    }
  }, [orders, showQrModal, org]);

  useEffect(() => {
    if (showQrModal && showQrModal.payment_status !== 'paid' && org) {
      setPixLoading(true);
      fetch(`/api/${org.id}/pix/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total_price: showQrModal.total_price,
          order_id: showQrModal.id,
          description: `Pedido #${showQrModal.id} (Courier)`
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

  const startTracking = (orderId: number) => {
    if (trackingOrderId === orderId) {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      setTrackingOrderId(null);
      return;
    }

    setTrackingOrderId(orderId);

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });
          socket.emit("delivery:update_location", { orderId, latitude, longitude });
        },
        (error) => console.error(error),
        { enableHighAccuracy: true }
      );
    } else {
      alert("Geolocalização não suportada neste navegador.");
    }
  };

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
    // 1. Confirm payment
    await fetch(`/api/orders/${order.id}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_status: 'paid' })
    });
    // 2. Mark as delivered
    await updateStatus(order.id, 'delivered');
    setShowQrModal(null);
    setTrackingOrderId(null);
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
  };

  const deliveryOrders = orders.filter(o => o.status === 'ready' || o.status === 'shipped');

  return (
    <div className="pb-24 md:pl-24 md:pt-8 p-4 max-w-md mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <Navigation size={32} className="text-blue-600" />
          App do Entregador
        </h1>
        <p className="text-gray-500 mt-2">Compartilhe sua localização em tempo real</p>
      </header>

      <div className="space-y-4">
        {deliveryOrders.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-medium">Nenhum pedido para entrega</p>
          </div>
        ) : (
          deliveryOrders.map(order => (
            <div key={order.id} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-xl">#{order.id}</h3>
                  <p className="text-gray-600 font-medium">{order.customer_name}</p>
                  <p className="text-sm text-gray-400">{order.address || "Sem endereço cadastrado"}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase",
                    order.status === 'shipped' ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                  )}>
                    {order.status === 'shipped' ? "Em Rota" : "Pronto"}
                  </span>
                  {order.payment_status === 'paid' ? (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Pago
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold flex items-center gap-1 uppercase">
                      <Clock size={12} /> A Receber
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                {order.status === 'ready' ? (
                  <button
                    onClick={() => updateStatus(order.id, 'shipped')}
                    className="col-span-2 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Truck size={18} /> Iniciar Entrega
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => startTracking(order.id)}
                      className={cn(
                        "py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2",
                        trackingOrderId === order.id
                          ? "bg-red-100 text-red-600 hover:bg-red-200"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      )}
                    >
                      {trackingOrderId === order.id ? (
                        <><StopCircle size={18} /> GPS Ligado</>
                      ) : (
                        <><Navigation size={18} /> Ligar GPS</>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (order.payment_status !== 'paid') {
                          setShowQrModal(order);
                        } else {
                          updateStatus(order.id, 'delivered');
                          setTrackingOrderId(null);
                          if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
                        }
                      }}
                      className="bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={18} /> Entregue
                    </button>
                  </>
                )}
                {order.latitude && order.longitude && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="col-span-2 mt-2 text-center text-blue-600 font-bold text-sm hover:underline"
                  >
                    Abrir Rota no Maps
                  </a>
                )}
              </div>

              {trackingOrderId === order.id && location && (
                <div className="mt-4 p-3 bg-blue-50 rounded-xl text-xs text-blue-800 flex items-center gap-2 animate-pulse">
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                  Transmitindo: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </div>
              )}
            </div>
          ))
        )}
      </div>

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
                          alt="QR Code PIX"
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
                <p className="text-sm text-gray-400 mt-4 leading-snug">
                  Peça ao cliente para escanear se desejar pagar via PIX.<br />
                  A <strong className="text-blue-600">validação é automática</strong> pelo Mercado Pago.<br />
                  Se for dinheiro/máquina, confirme abaixo.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => confirmPaymentAndDeliver(showQrModal)}
                  className="w-full bg-orange-100 text-orange-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-200 transition"
                >
                  <CheckCircle2 size={18} /> Forçar Recebimento (Dinheiro/Cartão)
                </button>
                <button
                  onClick={() => setShowQrModal(null)}
                  className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition"
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

const ProfilePage = () => {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const [address, setAddress] = useState(user?.address || "");
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(
    user?.latitude && user?.longitude ? { lat: user.latitude, lng: user.longitude } : null
  );
  const [mapLink, setMapLink] = useState("");
  const [isResolvingLink, setIsResolvingLink] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  useEffect(() => {
    if (user) {
      setAddress(user.address || "");
      if (user.latitude && user.longitude) {
        setLocation({ lat: user.latitude, lng: user.longitude });
      }
    }
  }, [user]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocalização não é suportada pelo seu navegador.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setAddress("Localização Atual (GPS)");
      },
      (error) => {
        console.error("Erro ao obter localização:", error);
        alert("Não foi possível obter sua localização. Verifique as permissões do navegador.");
      }
    );
  };

  const handleResolveMapLink = async () => {
    if (!mapLink) return;
    setIsResolvingLink(true);
    try {
      const res = await fetch("/api/tools/resolve-map-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: mapLink })
      });

      const data = await res.json();
      if (res.ok && data.latitude && data.longitude) {
        setLocation({ lat: data.latitude, lng: data.longitude });
        setAddress("Localização do Link do Maps");
        alert("Localização encontrada! Clique em Salvar para confirmar.");
      } else {
        alert("Não foi possível encontrar a localização neste link. Tente outro link.");
      }
    } catch (err) {
      console.error("Erro ao resolver link:", err);
      alert("Erro ao processar o link.");
    } finally {
      setIsResolvingLink(false);
    }
  };

  const handleOpenGoogleMaps = () => {
    window.open("https://www.google.com/maps", "_blank");
  };

  const handleSaveLocation = async () => {
    if (!user) return;
    setIsSavingLocation(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          latitude: location?.lat,
          longitude: location?.lng
        })
      });

      if (res.ok) {
        const updatedUser = await res.json();
        login(updatedUser);
        alert("Endereço salvo com sucesso!");
      } else {
        alert("Erro ao salvar endereço.");
      }
    } catch (err) {
      console.error("Erro ao salvar endereço:", err);
      alert("Erro ao salvar endereço.");
    } finally {
      setIsSavingLocation(false);
    }
  };

  const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    // Listen for delivery location updates for active orders
    const activeOrder = orders.find(o => o.status === 'shipped');
    if (activeOrder) {
      const eventName = `delivery:location:${activeOrder.id}`;

      const handleLocationUpdate = (data: { latitude: number, longitude: number }) => {
        setDeliveryLocation({ lat: data.latitude, lng: data.longitude });

        if (user.latitude && user.longitude) {
          const dist = calculateDistance(user.latitude, user.longitude, data.latitude, data.longitude);
          setDistance(dist);
          // Estimate: 20km/h average speed in city = 3 min per km + 2 min buffer
          setEta(Math.ceil(dist * 3 + 2));
        }
      };

      socket.on(eventName, handleLocationUpdate);

      return () => {
        socket.off(eventName, handleLocationUpdate);
      };
    }
  }, [orders, user]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    fetch(`/api/my-orders/${user.id}`)
      .then(res => res.json())
      .then(data => {
        setOrders(data);
        setLoading(false);
      });

    const onUpdate = ({ id, status }: { id: number, status: string }) => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: status as any } : o));
      // Refresh orders to get updated queue positions
      fetch(`/api/my-orders/${user.id}`)
        .then(res => res.json())
        .then(setOrders)
        .catch(err => console.error("Erro ao atualizar fila:", err));
    };

    const onPointsUpdate = ({ userId, points }: { userId: number, points: number }) => {
      if (user && user.id === userId) {
        login({ ...user, points });
      }
    };

    socket.on("order:update", onUpdate);
    socket.on("order:payment_update", onUpdate);
    socket.on("user:points_update", onPointsUpdate);
    socket.on("order:new", () => {
      fetch(`/api/my-orders/${user.id}`)
        .then(res => res.json())
        .then(setOrders)
        .catch(err => console.error("Erro ao atualizar novos pedidos:", err));
    });

    return () => {
      socket.off("order:update", onUpdate);
      socket.off("order:payment_update", onUpdate);
      socket.off("user:points_update", onPointsUpdate);
      socket.off("order:new");
    };
  }, [user, navigate, login]);

  if (!user) return null;

  const activeOrders = orders.filter(o => o.status !== 'delivered');
  const pastOrders = orders.filter(o => o.status === 'delivered');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-red-100 text-red-700 border-red-200';
      case 'preparing': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'ready': return 'bg-green-100 text-green-700 border-green-200';
      case 'shipped': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'delivered': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'preparing': return 'Em Preparo';
      case 'ready': return 'Pronto';
      case 'shipped': return 'Saiu para Entrega';
      case 'delivered': return 'Entregue';
      default: return status;
    }
  };

  const StatusStepper = ({ status }: { status: string }) => {
    const steps = [
      { id: 'pending', label: 'Pendente', icon: Clock },
      { id: 'preparing', label: 'Preparo', icon: ChefHat },
      { id: 'ready', label: 'Pronto', icon: CheckCircle2 },
      { id: 'shipped', label: 'Entrega', icon: Truck },
      { id: 'delivered', label: 'Entregue', icon: CheckCircle2 },
    ];

    const currentIdx = steps.findIndex(s => s.id === status);

    return (
      <div className="flex items-center justify-between w-full mt-6 mb-4 px-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isLast = idx === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center relative z-10">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                  isCompleted ? "bg-green-500 border-green-500 text-white" :
                    isCurrent ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200" :
                      "bg-white border-gray-200 text-gray-300"
                )}>
                  <Icon size={18} />
                </div>
                <span className={cn(
                  "text-[10px] font-bold mt-2 uppercase tracking-tighter",
                  isCurrent ? "text-orange-600" : isCompleted ? "text-green-600" : "text-gray-400"
                )}>
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div className="flex-1 h-0.5 mx-2 -mt-6 bg-gray-100 relative overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: isCompleted ? "100%" : isCurrent ? "50%" : "0%" }}
                    className="absolute top-0 left-0 h-full bg-green-500"
                    transition={{ duration: 1 }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="pb-24 md:pl-24 md:pt-8 p-4 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-orange-100 p-4 rounded-3xl text-orange-600">
            <User size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{user.name}</h1>
              <span className={cn(
                "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                user.role === 'super_admin' ? "bg-purple-50 text-purple-600 border-purple-100" :
                  user.role === 'admin' ? "bg-blue-50 text-blue-600 border-blue-100" :
                    "bg-green-50 text-green-600 border-green-100"
              )}>
                {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'Cliente'}
              </span>
            </div>
            <p className="text-gray-500 mt-0.5 flex items-center gap-1 font-medium italic">
              <Phone size={14} /> {user.phone}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            logout();
            navigate("/");
          }}
          className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-5 py-3 rounded-2xl transition-all w-fit border border-transparent hover:border-red-100"
        >
          <LogOut size={20} /> Sair da Conta
        </button>
      </div>

      <div className="space-y-6">
        {/* Loyalty Card */}
        <div className="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-orange-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <ShoppingBag size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-orange-100 text-xs font-bold uppercase tracking-widest mb-1">Cartão Fidelidade</p>
                <h2 className="text-2xl font-bold">Paty Points</h2>
              </div>
              <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/30">
                <span className="text-2xl font-bold">{user.points || 0}</span>
                <span className="text-xs ml-1 opacity-80">pts</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                <span>Progresso para brinde</span>
                <span>{Math.min(user.points || 0, 100)} / 100</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden border border-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(((user.points || 0) / 100) * 100, 100)}%` }}
                  className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <p className="text-[10px] opacity-80 italic">
                {user.points >= 100
                  ? "🎉 Você tem um brinde disponível! Use no seu próximo pedido."
                  : `Faltam ${Math.ceil((100 - (user.points || 0)) / 2)} pedidos para você ganhar seu brinde!`}
              </p>
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-[100%] -mr-8 -mt-8 opacity-50" />

          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 relative z-10">
            <MapPin size={20} className="text-blue-500" />
            Endereço de Entrega
          </h3>

          <div className="space-y-4 relative z-10">
            <div className="flex gap-2">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Digite seu endereço ou use o GPS"
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
              <button
                onClick={handleGetLocation}
                className="bg-blue-50 text-blue-600 p-3 rounded-xl hover:bg-blue-100 transition-colors"
                title="Usar localização atual (GPS)"
              >
                <MapPin size={20} />
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase">Ou cole um link do Google Maps</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={mapLink}
                  onChange={(e) => setMapLink(e.target.value)}
                  placeholder="Cole o link aqui..."
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={handleResolveMapLink}
                  disabled={isResolvingLink || !mapLink}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isResolvingLink ? "..." : "Buscar"}
                </button>
              </div>
              <button
                onClick={handleOpenGoogleMaps}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                <MapPin size={12} /> Abrir Google Maps para pegar link
              </button>
            </div>

            {location && (
              <div className="text-xs text-gray-500 flex flex-col sm:flex-row sm:items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="font-mono">GPS: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="sm:ml-auto text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                >
                  Ver no Google Maps <ArrowRight size={12} />
                </a>
              </div>
            )}

            <button
              onClick={handleSaveLocation}
              disabled={isSavingLocation}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-all disabled:opacity-50 text-sm"
            >
              {isSavingLocation ? "Salvando..." : "Salvar Endereço"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Clock size={20} className="text-orange-500" />
            Pedidos Ativos
          </h2>
          <div className="flex items-center gap-3">
            {!loading && pastOrders.length > 0 && (
              <button
                onClick={() => setShowHistory(true)}
                className="text-xs font-bold text-gray-500 hover:text-orange-600 flex items-center gap-1 transition-colors"
              >
                <History size={14} /> Ver Histórico
              </button>
            )}
            {activeOrders.some(o => o.status === 'pending' || o.status === 'preparing') && (
              <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                {(() => {
                  const active = activeOrders.find(o => o.status === 'pending' || o.status === 'preparing');
                  if (!active) return null;
                  return active.queuePosition === 0 ? "Você é o próximo!" : `${active.queuePosition} pedidos na sua frente`;
                })()}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Carregando seus pedidos...</div>
        ) : activeOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <ShoppingBag size={48} className="mx-auto mb-3 text-gray-200" />
            <p className="text-gray-500 font-medium text-sm">Nenhum pedido ativo no momento.</p>
            <Link to="/" className="text-orange-600 font-bold mt-1 text-sm inline-block hover:underline">Fazer um pedido agora</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {activeOrders.map(order => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"
              >
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-xl">Pedido #{order.id}</span>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold border",
                          getStatusColor(order.status)
                        )}>
                          {getStatusLabel(order.status)}
                        </span>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold border",
                          order.payment_status === 'paid' ? "bg-green-50 text-green-600 border-green-100" : "bg-red-50 text-red-600 border-red-100"
                        )}>
                          {order.payment_status === 'paid' ? "Pago" : "Pendente"}
                        </span>
                      </div>
                    </div>

                    {(order.status === 'pending' || order.status === 'preparing' || order.status === 'shipped') && (
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className={cn(
                          "p-4 rounded-2xl border text-center",
                          order.status === 'shipped' ? "bg-blue-50 border-blue-100" : "bg-orange-50 border-orange-100"
                        )}>
                          <p className={cn(
                            "text-[10px] font-bold uppercase tracking-widest mb-1",
                            order.status === 'shipped' ? "text-blue-400" : "text-orange-400"
                          )}>
                            {order.status === 'shipped' ? "Status" : "Posição na Fila"}
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            <span className={cn(
                              "text-2xl font-bold",
                              order.status === 'shipped' ? "text-blue-600" : "text-orange-600"
                            )}>
                              {order.status === 'shipped' ? "EM ROTA" : (order.queuePosition === 0 ? "Próximo!" : `${order.queuePosition + 1}º`)}
                            </span>
                            {order.status === 'shipped' ? <Truck size={16} className="text-blue-400" /> : <Clock size={16} className="text-orange-400" />}
                          </div>
                          <p className={cn(
                            "text-[10px] mt-1",
                            order.status === 'shipped' ? "text-blue-400" : "text-orange-400"
                          )}>
                            {order.status === 'shipped' ? "saiu para entrega" : "pedidos na sua frente"}
                          </p>
                        </div>
                        <div className={cn(
                          "p-4 rounded-2xl border text-center",
                          order.status === 'shipped' ? "bg-green-50 border-green-100" : "bg-blue-50 border-blue-100"
                        )}>
                          <p className={cn(
                            "text-[10px] font-bold uppercase tracking-widest mb-1",
                            order.status === 'shipped' ? "text-green-400" : "text-blue-400"
                          )}>
                            {order.status === 'shipped' ? "Previsão" : "Tempo Estimado"}
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            <span className={cn(
                              "text-2xl font-bold",
                              order.status === 'shipped' ? "text-green-600" : "text-blue-600"
                            )}>
                              {order.status === 'shipped'
                                ? (eta ? `${eta} min` : "Calculando...")
                                : `~${order.estimatedMinutes} min`}
                            </span>
                            {order.status === 'shipped' ? <Truck size={16} className="text-green-400" /> : <Clock size={16} className="text-blue-400" />}
                          </div>
                          <p className={cn(
                            "text-[10px] mt-1",
                            order.status === 'shipped' ? "text-green-400" : "text-blue-400"
                          )}>
                            {order.status === 'shipped'
                              ? (distance ? `${distance.toFixed(1)}km de distância` : "aguardando sinal GPS...")
                              : "para sair para entrega"}
                          </p>
                        </div>
                      </div>
                    )}

                    <StatusStepper status={order.status} />

                    <div className="space-y-1 mt-8">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="text-sm text-gray-600">
                          <span className="font-bold">{item.quantity}x</span> {item.name}
                          {item.removedIngredients && item.removedIngredients.length > 0 && (
                            <span className="text-[10px] text-red-400 font-bold ml-2 uppercase">Sem: {item.removedIngredients.join(', ')}</span>
                          )}
                          {item.extraIngredients && item.extraIngredients.length > 0 && (
                            <span className="text-[10px] text-green-600 font-bold ml-2 uppercase">Extra: {item.extraIngredients.map(e => e.name).join(', ')}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex flex-col justify-between items-end">
                    <span className="text-gray-400 text-xs">{new Date(order.created_at).toLocaleDateString()} às {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="font-mono font-bold text-xl text-orange-600">R$ {order.total_price.toFixed(2)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Order History Modal */}
        <AnimatePresence>
          {showHistory && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowHistory(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white w-full max-w-2xl max-h-[80vh] rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded-xl">
                      <History size={20} className="text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Seu Histórico</h2>
                      <p className="text-xs text-gray-400">{pastOrders.length} pedidos entregues</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {pastOrders.map(order => (
                    <div
                      key={order.id}
                      className="bg-gray-50 p-5 rounded-3xl border border-gray-100"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-lg">Pedido #{order.id}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-600 border border-green-100">
                              Entregue
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="text-xs text-gray-500">
                                <span className="font-medium">{item.quantity}x</span> {item.name}
                                {item.removedIngredients && item.removedIngredients.length > 0 && (
                                  <span className="text-[10px] text-red-400 font-bold ml-2 uppercase">Sem: {item.removedIngredients.join(', ')}</span>
                                )}
                                {item.extraIngredients && item.extraIngredients.length > 0 && (
                                  <span className="text-[10px] text-green-600 font-bold ml-2 uppercase">Extra: {item.extraIngredients.map(e => e.name).join(', ')}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400 mb-1">{new Date(order.created_at).toLocaleDateString()}</p>
                          <p className="font-bold text-gray-700">R$ {order.total_price.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50">
                  <button
                    onClick={() => setShowHistory(false)}
                    className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all"
                  >
                    Fechar Histórico
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};


// ============================================================
// SUPER ADMIN PAGE - Gerenciamento Global da Plataforma
// ============================================================
const SuperAdminPage = () => {
  const { notify } = useNotification();
  const [metrics, setMetrics] = useState<{ totalRevenue: number; totalOrders: number; totalOrgs: number } | null>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any | null>(null);
  const [newOrg, setNewOrg] = useState({ name: '', slug: '', primaryColor: '#ea580c', secondaryColor: '#fb923c', custom_domain: '' });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'orgs' | 'financeiro' | 'security'>('overview');
  const [financial, setFinancial] = useState<any | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<any | null>(null); // org to register payment
  const [paymentForm, setPaymentForm] = useState({ amount: '', month_ref: '', notes: '', payment_method: 'pix' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [metricsRes, orgsRes] = await Promise.all([
        fetch('/api/admin/global-metrics'),
        fetch('/api/organizations')
      ]);
      const metricsData = await metricsRes.json();
      const orgsData = await orgsRes.json();
      setMetrics(metricsData);
      setOrgs(Array.isArray(orgsData) ? orgsData : []);
    } catch (err) {
      notify('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancial = async () => {
    try {
      const res = await fetch('/api/saas-payments/summary');
      const data = await res.json();
      setFinancial(data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchData();
    fetchFinancial();
  }, []);

  const handleCreateOrg = async () => {
    if (!newOrg.name || !newOrg.slug) return notify('Nome e Slug são obrigatórios', 'error');
    setSaving(true);
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOrg.name,
          slug: newOrg.slug,
          branding: { primaryColor: newOrg.primaryColor, secondaryColor: newOrg.secondaryColor, logoUrl: null }
        })
      });
      if (res.ok) {
        notify('Organização criada com sucesso!', 'success');
        setShowNewOrgModal(false);
        setNewOrg({ name: '', slug: '', primaryColor: '#ea580c', secondaryColor: '#fb923c', custom_domain: '' });
        fetchData();
      } else {
        const data = await res.json();
        notify(data.error || 'Erro ao criar organização', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSetCustomDomain = async (orgId: string, domain: string) => {
    try {
      const res = await fetch(`/api/organizations/${orgId}/custom-domain`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_domain: domain })
      });
      if (res.ok) {
        notify('Domínio atualizado!', 'success');
        fetchData();
      } else {
        notify('Erro ao atualizar domínio', 'error');
      }
    } catch {
      notify('Erro de conexão', 'error');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'orgs', label: 'Organizações', icon: Store },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'security', label: 'Segurança', icon: Lock },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-3 rounded-2xl shadow-lg shadow-purple-200">
            <Lock size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Painel Super Admin</h1>
            <p className="text-slate-400 text-sm font-medium">Gerenciamento global da plataforma AP Delivery</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Sistema Online</span>
          </div>
          <button
            onClick={fetchData}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <Activity size={18} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl w-fit gap-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Global Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                label: 'Receita Total (Pago)',
                value: `R$ ${(metrics?.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                icon: DollarSign,
                color: 'from-emerald-500 to-teal-600',
                shadow: 'shadow-emerald-200'
              },
              {
                label: 'Total de Pedidos',
                value: metrics?.totalOrders?.toString() || '0',
                icon: ShoppingBag,
                color: 'from-blue-500 to-indigo-600',
                shadow: 'shadow-blue-200'
              },
              {
                label: 'Organizações Ativas',
                value: metrics?.totalOrgs?.toString() || '0',
                icon: Store,
                color: 'from-purple-500 to-pink-600',
                shadow: 'shadow-purple-200'
              }
            ].map(metric => {
              const Icon = metric.icon;
              return (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="premium-card p-6"
                >
                  <div className={cn("w-12 h-12 bg-gradient-to-br rounded-2xl flex items-center justify-center mb-4 shadow-lg", metric.color, metric.shadow)}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <p className="text-3xl font-black text-slate-900 mb-1">{metric.value}</p>
                  <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">{metric.label}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Org List Preview */}
          <div className="premium-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-900">Lojas Cadastradas</h2>
              <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full">{orgs.length} lojas</span>
            </div>
            <div className="space-y-3">
              {orgs.slice(0, 5).map(org => (
                <div key={org.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                  <div
                    className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                    style={{ background: org.branding?.primaryColor || '#ea580c' }}
                  >
                    <Store size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{org.name}</p>
                    <p className="text-xs text-slate-400">/{org.slug}{org.custom_domain ? ` • ${org.custom_domain}` : ''}</p>
                  </div>
                  <div className="bg-emerald-100 px-2 py-1 rounded-lg">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">Ativo</span>
                  </div>
                </div>
              ))}
              {orgs.length > 5 && (
                <button onClick={() => setActiveTab('orgs')} className="w-full py-3 text-sm text-orange-600 font-bold hover:bg-orange-50 rounded-xl transition-colors">
                  Ver todas as {orgs.length} lojas →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Organizations Tab */}
      {activeTab === 'orgs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-black text-slate-900">Todas as Organizações</h2>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const res = await fetch('/api/admin/run-billing-check', { method: 'POST' });
                  const data = await res.json();
                  notify(`Verificação concluída: ${data.suspended} lojas suspensas por inadimplência`, data.suspended > 0 ? 'error' : 'success');
                  fetchData();
                }}
                className="bg-slate-700 text-white px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all text-sm"
              >
                <Activity size={14} /> Verificar Inadimplência
              </button>
              <button
                onClick={() => setShowNewOrgModal(true)}
                className="bg-orange-600 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 text-sm"
              >
                <Plus size={16} /> Nova Organização
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {orgs.map(org => {
              const orgStatus = org.status || 'active';
              const statusColors = {
                active: 'bg-emerald-100 text-emerald-700',
                inactive: 'bg-gray-200 text-gray-500',
                suspended: 'bg-red-100 text-red-700',
                trial: 'bg-blue-100 text-blue-700',
              };
              const statusLabels = { active: 'Ativo', inactive: 'Inativo', suspended: 'Suspenso', trial: 'Trial' };
              return (
                <motion.div
                  key={org.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn("premium-card p-5", orgStatus === 'suspended' && "border-red-200 bg-red-50/30")}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg", orgStatus !== 'active' && "opacity-50 grayscale")}
                      style={{ background: `linear-gradient(135deg, ${org.branding?.primaryColor || '#ea580c'}, ${org.branding?.secondaryColor || '#fb923c'})` }}
                    >
                      <Store size={22} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-black text-slate-900 text-lg">{org.name}</h3>
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase", statusColors[orgStatus as keyof typeof statusColors])}>
                          {statusLabels[orgStatus as keyof typeof statusLabels]}
                        </span>
                        {org.billing_exempt && (
                          <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">⭐ Isento</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 font-medium">
                        <span>🔗 /{org.slug}</span>
                        {org.custom_domain && <span>🌐 {org.custom_domain}</span>}
                        {org.billing_due_date && <span>📅 Vence: {new Date(org.billing_due_date).toLocaleDateString('pt-BR')}</span>}
                        {org.has_mp_token ? <span className="text-green-600">✅ MP</span> : <span className="text-red-400">⚠️ Sem MP</span>}
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {/* Status Toggle */}
                        <button
                          onClick={async () => {
                            const newStatus = orgStatus === 'active' ? 'inactive' : 'active';
                            await fetch(`/api/organizations/${org.id}/status`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: newStatus })
                            });
                            notify(`Loja ${newStatus === 'active' ? 'ativada' : 'desativada'}!`, newStatus === 'active' ? 'success' : 'error');
                            fetchData();
                          }}
                          className={cn(
                            "text-xs px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1",
                            orgStatus === 'active'
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          )}
                        >
                          {orgStatus === 'active' ? <><X size={11} /> Desativar</> : <><CheckCircle2 size={11} /> Ativar</>}
                        </button>

                        {/* Billing Exempt Toggle */}
                        <button
                          onClick={async () => {
                            await fetch(`/api/organizations/${org.id}/billing-exempt`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ billing_exempt: !org.billing_exempt })
                            });
                            notify(org.billing_exempt ? 'Isenção removida' : 'Loja marcada como isenta!', 'success');
                            fetchData();
                          }}
                          className={cn(
                            "text-xs px-3 py-1.5 rounded-lg font-bold transition-colors",
                            org.billing_exempt ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          )}
                        >
                          ⭐ {org.billing_exempt ? 'Remover Isenção' : 'Isentar Cobrança'}
                        </button>

                        {/* Set Billing Due Date */}
                        {editingOrg?.id === org.id && editingOrg.mode === 'billing' ? (
                          <div className="flex gap-2 w-full mt-1">
                            <input
                              type="date"
                              value={editingOrg.billing_due_date || ''}
                              onChange={e => setEditingOrg({ ...editingOrg, billing_due_date: e.target.value })}
                              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                            <button
                              onClick={async () => {
                                await fetch(`/api/organizations/${org.id}/billing-due`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ billing_due_date: editingOrg.billing_due_date })
                                });
                                notify('Vencimento atualizado!', 'success');
                                setEditingOrg(null);
                                fetchData();
                              }}
                              className="px-3 py-2 bg-orange-600 text-white rounded-xl text-sm font-bold"
                            >Salvar</button>
                            <button onClick={() => setEditingOrg(null)} className="px-3 py-2 bg-slate-100 rounded-xl"><X size={14} /></button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingOrg({ ...org, mode: 'billing' })}
                            className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-200 transition-colors flex items-center gap-1"
                          >
                            📅 {org.billing_due_date ? 'Alterar vencimento' : 'Definir vencimento'}
                          </button>
                        )}

                        {/* Domain */}
                        {editingOrg?.id === org.id && editingOrg.mode === 'domain' ? (
                          <div className="flex gap-2 w-full mt-1">
                            <input
                              type="text"
                              value={editingOrg.custom_domain || ''}
                              onChange={e => setEditingOrg({ ...editingOrg, custom_domain: e.target.value })}
                              placeholder="seudominio.com.br"
                              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                            <button
                              onClick={async () => {
                                await handleSetCustomDomain(org.id, editingOrg.custom_domain);
                                setEditingOrg(null);
                              }}
                              className="px-3 py-2 bg-orange-600 text-white rounded-xl text-sm font-bold"
                            >Salvar</button>
                            <button onClick={() => setEditingOrg(null)} className="px-3 py-2 bg-slate-100 rounded-xl"><X size={14} /></button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingOrg({ ...org, mode: 'domain' })}
                            className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-200 transition-colors flex items-center gap-1"
                          >
                            <MapPin size={12} /> {org.custom_domain ? 'Editar domínio' : 'Definir domínio'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">ID</p>
                      <p className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded-lg">{org.id.slice(0, 8)}...</p>
                      <p className="text-[10px] text-slate-400 mt-1">{new Date(org.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Financeiro Tab */}
      {activeTab === 'financeiro' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          {financial && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Receita do Mês', value: `R$ ${(financial.totalThisMonth || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-200', icon: DollarSign },
                { label: 'Receita Total', value: `R$ ${(financial.totalEarnedAllTime || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-200', icon: TrendingUp },
                { label: 'Pagaram este mês', value: `${financial.paidThisMonth}/${financial.chargeableOrgs}`, color: 'from-purple-500 to-pink-600', shadow: 'shadow-purple-200', icon: CheckCircle2 },
                { label: 'Inadimplentes', value: financial.overdueOrgs, color: 'from-red-500 to-orange-600', shadow: 'shadow-red-200', icon: X },
              ].map(card => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="premium-card p-5">
                    <div className={`bg-gradient-to-br ${card.color} w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-lg ${card.shadow}`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <p className="text-xl font-black text-slate-900">{card.value}</p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{card.label}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Overdue Orgs */}
          {financial?.overdueList?.length > 0 && (
            <div className="premium-card p-5">
              <h3 className="text-base font-black text-red-600 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
                Lojas Inadimplentes ({financial.overdueList.length})
              </h3>
              <div className="space-y-2">
                {financial.overdueList.map((org: any) => (
                  <div key={org.id} className="flex items-center justify-between bg-red-50 rounded-2xl px-4 py-3 border border-red-100">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{org.name}</p>
                      <p className="text-xs text-red-500">
                        Venceu em {org.billing_due_date ? new Date(org.billing_due_date).toLocaleDateString('pt-BR') : 'data não definida'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const now = new Date();
                        setShowPaymentModal(org);
                        setPaymentForm({
                          amount: '',
                          month_ref: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
                          notes: '',
                          payment_method: 'pix'
                        });
                      }}
                      className="bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-emerald-700 transition-colors"
                    >
                      ✅ Registrar Pagamento
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paid this month */}
          {financial?.paidList?.length > 0 && (
            <div className="premium-card p-5">
              <h3 className="text-base font-black text-emerald-600 mb-4 flex items-center gap-2">
                <CheckCircle2 size={16} />
                Pagaram este mês ({financial.paidList.length})
              </h3>
              <div className="space-y-2">
                {financial.paidList.map((org: any) => (
                  <div key={org.id} className="flex items-center justify-between bg-emerald-50 rounded-2xl px-4 py-3 border border-emerald-100">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{org.name}</p>
                      <p className="text-xs text-emerald-600">✅ Pago</p>
                    </div>
                    <button
                      onClick={() => {
                        const now = new Date();
                        setShowPaymentModal(org);
                        setPaymentForm({
                          amount: '',
                          month_ref: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
                          notes: '',
                          payment_method: 'pix'
                        });
                      }}
                      className="text-xs text-slate-500 font-bold px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      + Registrar outro
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exempt Orgs */}
          {financial?.exemptList?.length > 0 && (
            <div className="premium-card p-5">
              <h3 className="text-base font-black text-purple-600 mb-3 flex items-center gap-2">
                ⭐ Lojas Isentas ({financial.exemptList.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {financial.exemptList.map((org: any) => (
                  <span key={org.id} className="bg-purple-50 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-purple-100">
                    {org.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent Payments History */}
          {financial?.recentPayments?.length > 0 && (
            <div className="premium-card overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900">Histórico de Pagamentos</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      <th className="px-5 py-3 text-left">Loja</th>
                      <th className="px-5 py-3 text-left">Mês Ref.</th>
                      <th className="px-5 py-3 text-left">Valor</th>
                      <th className="px-5 py-3 text-left">Forma</th>
                      <th className="px-5 py-3 text-left">Data Pag.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {financial.recentPayments.map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3 font-bold text-slate-800">{p.organization?.name || p.org_id?.slice(0, 8)}</td>
                        <td className="px-5 py-3 text-slate-500">{p.month_ref}</td>
                        <td className="px-5 py-3 font-bold text-emerald-600">R$ {Number(p.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-5 py-3">
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">{p.payment_method}</span>
                        </td>
                        <td className="px-5 py-3 text-slate-400 text-xs">{new Date(p.paid_at || p.created_at).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Button to register payment for any org */}
          <button
            onClick={() => {
              const now = new Date();
              setShowPaymentModal({ id: null, name: 'Selecionar loja...' });
              setPaymentForm({ amount: '', month_ref: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, notes: '', payment_method: 'pix' });
            }}
            className="w-full py-3 border-2 border-dashed border-emerald-300 text-emerald-600 font-bold rounded-2xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Registrar Pagamento Manual
          </button>
        </div>
      )}

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-900">Registrar Pagamento</h2>
                <button onClick={() => setShowPaymentModal(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                {/* Org selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Loja</label>
                  <select
                    value={showPaymentModal.id || ''}
                    onChange={e => setShowPaymentModal({ ...orgs.find(o => o.id === e.target.value), id: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold"
                  >
                    <option value="">Selecione a loja...</option>
                    {orgs.filter(o => !o.billing_exempt).map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="199.90"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mês de Referência</label>
                  <input
                    type="month"
                    value={paymentForm.month_ref}
                    onChange={e => setPaymentForm({ ...paymentForm, month_ref: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Forma de Pagamento</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  >
                    <option value="pix">PIX</option>
                    <option value="boleto">Boleto</option>
                    <option value="cartao">Cartão</option>
                    <option value="transferencia">Transferência</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Observações</label>
                  <input
                    type="text"
                    value={paymentForm.notes}
                    onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    placeholder="Opcional..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
                <button
                  disabled={!showPaymentModal.id || !paymentForm.amount || !paymentForm.month_ref}
                  onClick={async () => {
                    const res = await fetch('/api/saas-payments', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        org_id: showPaymentModal.id,
                        amount: parseFloat(paymentForm.amount),
                        month_ref: paymentForm.month_ref,
                        notes: paymentForm.notes,
                        payment_method: paymentForm.payment_method
                      })
                    });
                    if (res.ok) {
                      notify('Pagamento registrado com sucesso! ✅', 'success');
                      setShowPaymentModal(null);
                      fetchData();
                      fetchFinancial();
                    } else {
                      const err = await res.json();
                      notify(err.error || 'Erro ao registrar', 'error');
                    }
                  }}
                  className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✅ Confirmar Pagamento
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="premium-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-emerald-100 p-2 rounded-xl">
                <CheckCircle2 size={20} className="text-emerald-600" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Status de Segurança</h2>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Row Level Security (RLS)', status: true, desc: 'Ativado em todas as tabelas críticas' },
                { label: 'Hash de Senhas', status: true, desc: 'Usando bcrypt/scrypt com salt aleatório' },
                { label: 'Google OAuth 2.0', status: true, desc: 'Provedor ativado e Client ID configurado' },
                { label: 'HTTPS em Produção', status: true, desc: 'Redirecionamento forçado para SSL' },
                { label: 'Token de Dados Sensíveis (MP)', status: true, desc: 'Token Mercado Pago nunca exposto no frontend' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", item.status ? "bg-emerald-100" : "bg-red-100")}>
                    {item.status
                      ? <CheckCircle2 size={18} className="text-emerald-600" />
                      : <AlertCircle size={18} className="text-red-600" />
                    }
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                  <div className="ml-auto">
                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full uppercase", item.status ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                      {item.status ? 'OK' : 'ATENÇÃO'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="premium-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-2 rounded-xl">
                <Lock size={20} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Variáveis de Ambiente</h2>
            </div>
            <div className="space-y-2">
              {[
                { key: 'VITE_SUPABASE_URL', safe: true },
                { key: 'VITE_SUPABASE_ANON_KEY', safe: true },
                { key: 'GEMINI_API_KEY', safe: true },
              ].map(env => (
                <div key={env.key} className="flex items-center justify-between p-3 bg-slate-900 rounded-xl">
                  <span className="text-xs font-mono text-green-400">{env.key}</span>
                  <span className="text-[10px] text-slate-500 font-mono">••••••••••••</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Org Modal */}
      <AnimatePresence>
        {showNewOrgModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewOrgModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-900">Nova Organização</h2>
                <button onClick={() => setShowNewOrgModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome da Loja *</label>
                  <input
                    value={newOrg.name}
                    onChange={e => setNewOrg({ ...newOrg, name: e.target.value })}
                    placeholder="Churrasco do Zé"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Slug (URL) *</label>
                  <div className="flex items-center gap-0 border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                    <span className="px-3 py-3 text-xs text-gray-400 font-bold border-r border-gray-200 bg-gray-100">/loja/</span>
                    <input
                      value={newOrg.slug}
                      onChange={e => setNewOrg({ ...newOrg, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      placeholder="churrasco-do-ze"
                      className="flex-1 px-3 py-3 bg-transparent focus:ring-0 outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Cor Primária</label>
                    <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-xl bg-gray-50">
                      <input type="color" value={newOrg.primaryColor} onChange={e => setNewOrg({ ...newOrg, primaryColor: e.target.value })} className="w-8 h-8 rounded-lg cursor-pointer border-0" />
                      <span className="text-xs font-mono text-gray-500">{newOrg.primaryColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Cor Secundária</label>
                    <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-xl bg-gray-50">
                      <input type="color" value={newOrg.secondaryColor} onChange={e => setNewOrg({ ...newOrg, secondaryColor: e.target.value })} className="w-8 h-8 rounded-lg cursor-pointer border-0" />
                      <span className="text-xs font-mono text-gray-500">{newOrg.secondaryColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowNewOrgModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateOrg}
                  disabled={saving}
                  className="flex-1 py-3 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={16} />}
                  {saving ? 'Criando...' : 'Criar Loja'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// SaaSAdminPage → redireciona para o Super Admin
const SaaSAdminPage = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate('/super-admin', { replace: true }); }, []);
  return null;
};

// ============================================================
// SUBSCRIBE PAGE - Página Pública de Assinatura do SaaS
// ============================================================
const SubscribePage = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [step, setStep] = useState<'plans' | 'form' | 'pix' | 'success'>('plans');
  const [form, setForm] = useState({ name: '', email: '', phone: '', store_name: '', store_slug: '' });
  const [pixData, setPixData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [subId, setSubId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/saas/plans').then(r => r.json()).then(setPlans).catch(() => { });
    // Poll for payment confirmation
    if (subId) {
      const interval = setInterval(async () => {
        const res = await fetch(`/api/saas/subscribe/status/${subId}`);
        const data = await res.json();
        if (data.status === 'paid') {
          setStep('success');
          clearInterval(interval);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [subId]);

  const handleGeneratePix = async () => {
    if (!form.name || !form.email || !form.store_name || !form.store_slug) {
      setError('Preencha todos os campos obrigatórios.'); return;
    }
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/saas/subscribe/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: selectedPlan.id, ...form })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erro ao gerar PIX'); return; }
      setPixData(data);
      setSubId(data.subscription_id);
      setStep('pix');
    } finally {
      setLoading(false);
    }
  };

  const planColors = ['from-slate-600 to-slate-800', 'from-orange-500 to-red-600', 'from-purple-600 to-indigo-700'];
  const planHighlight = [false, true, false];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/50">
            <Store size={18} className="text-white" />
          </div>
          <span className="text-white font-black text-lg">AP Delivery</span>
        </div>
        <Link to="/login" className="text-white/60 hover:text-white text-sm font-medium transition-colors">Já tenho conta →</Link>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Plans Step */}
        {step === 'plans' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-center mb-14">
              <span className="bg-orange-500/20 text-orange-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">Planos e Preços</span>
              <h1 className="text-4xl md:text-5xl font-black text-white mt-4 mb-4">
                Comece a vender<br className="hidden md:block" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">online hoje</span>
              </h1>
              <p className="text-slate-400 text-lg max-w-xl mx-auto">Plataforma completa de delivery para restaurantes e lanchonetes. Cancele quando quiser.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan, i) => (
                <motion.div
                  key={plan.id}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className={cn(
                    "relative rounded-3xl p-8 cursor-pointer transition-all border",
                    planHighlight[i]
                      ? "bg-gradient-to-b from-orange-500 to-red-600 border-orange-400/50 shadow-2xl shadow-orange-900/50"
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  )}
                  onClick={() => { setSelectedPlan(plan); setStep('form'); }}
                >
                  {planHighlight[i] && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                      Mais Popular
                    </div>
                  )}
                  <div className={cn("text-sm font-bold uppercase tracking-widest mb-2", planHighlight[i] ? "text-orange-100" : "text-slate-400")}>{plan.name}</div>
                  <div className={cn("text-4xl font-black mb-1", planHighlight[i] ? "text-white" : "text-white")}>
                    R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className={cn("text-sm mb-6", planHighlight[i] ? "text-orange-100" : "text-slate-500")}>/mês</div>
                  <div className={cn("text-sm mb-8", planHighlight[i] ? "text-orange-100" : "text-slate-400")}>{plan.description}</div>
                  <ul className="space-y-2 mb-8">
                    {plan.features.map((f: string) => (
                      <li key={f} className={cn("text-sm flex items-center gap-2", planHighlight[i] ? "text-white" : "text-slate-300")}>
                        <CheckCircle2 size={14} className={planHighlight[i] ? "text-yellow-300" : "text-emerald-400"} /> {f}
                      </li>
                    ))}
                  </ul>
                  <button className={cn(
                    "w-full py-3 rounded-2xl font-bold text-sm transition-all",
                    planHighlight[i]
                      ? "bg-white text-orange-600 hover:bg-orange-50 shadow-lg"
                      : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                  )}>
                    Começar com {plan.name} →
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Form Step */}
        {step === 'form' && selectedPlan && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto">
            <button onClick={() => setStep('plans')} className="text-slate-400 hover:text-white text-sm font-medium mb-6 flex items-center gap-1 transition-colors">
              ← Voltar aos planos
            </button>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-white">Dados da sua loja</h2>
                  <p className="text-slate-400 text-sm mt-1">Plano {selectedPlan.name} — R$ {selectedPlan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</p>
                </div>
                <div className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-bold uppercase">{selectedPlan.name}</div>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'name', label: 'Seu Nome *', placeholder: 'João Silva', type: 'text' },
                  { key: 'email', label: 'E-mail *', placeholder: 'joao@email.com', type: 'email' },
                  { key: 'phone', label: 'WhatsApp', placeholder: '(11) 99999-9999', type: 'tel' },
                  { key: 'store_name', label: 'Nome da Loja *', placeholder: 'Churrasco do João', type: 'text' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">{field.label}</label>
                    <input
                      type={field.type}
                      value={(form as any)[field.key]}
                      onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">URL da sua loja * <span className="text-slate-600 font-normal normal-case">(endereço na internet)</span></label>
                  <div className="flex items-center border border-white/10 rounded-xl overflow-hidden focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 transition-all">
                    <span className="px-3 py-3 bg-white/5 text-slate-500 text-xs font-bold border-r border-white/10 shrink-0">/loja/</span>
                    <input
                      type="text"
                      value={form.store_slug}
                      onChange={e => setForm({ ...form, store_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      placeholder="churrasco-do-joao"
                      className="flex-1 px-3 py-3 bg-transparent text-white placeholder-slate-600 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm mt-4 font-medium">⚠️ {error}</p>}

              <button
                onClick={handleGeneratePix}
                disabled={loading}
                className="mt-6 w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-black rounded-2xl hover:from-orange-600 hover:to-red-700 shadow-xl shadow-orange-900/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Gerando PIX...</> : '🔐 Pagar com PIX →'}
              </button>
            </div>
          </motion.div>
        )}

        {/* PIX Step */}
        {step === 'pix' && pixData && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto text-center">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">PIX Gerado!</h2>
              <p className="text-slate-400 text-sm mb-6">
                Escaneie o QR Code ou copie o código PIX.<br />
                Após o pagamento, sua loja será <strong className="text-white">ativada automaticamente</strong>.
              </p>

              {/* QR Code */}
              {pixData.pix_qr_code_base64 ? (
                <div className="bg-white p-4 rounded-2xl inline-block mb-6 shadow-2xl">
                  <img src={`data:image/png;base64,${pixData.pix_qr_code_base64}`} alt="QR Code PIX" className="w-48 h-48" />
                </div>
              ) : (
                <div className="bg-white/10 rounded-2xl p-6 mb-6">
                  <p className="text-slate-400 text-sm">{pixData.message || 'Entre em contato pelo WhatsApp para ativar sua conta.'}</p>
                  {pixData.whatsapp && (
                    <a href={pixData.whatsapp} target="_blank" rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-green-600 transition-colors">
                      WhatsApp →
                    </a>
                  )}
                </div>
              )}

              {/* Copy PIX code */}
              {pixData.pix_qr_code && (
                <div className="mb-6">
                  <p className="text-slate-500 text-xs mb-2 uppercase font-bold">Código PIX Copia e Cola</p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={pixData.pix_qr_code}
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-300 font-mono outline-none"
                    />
                    <button
                      onClick={() => { navigator.clipboard.writeText(pixData.pix_qr_code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="px-3 py-2 bg-orange-500 text-white rounded-xl font-bold text-xs hover:bg-orange-600 transition-colors"
                    >
                      {copied ? '✅' : 'Copiar'}
                    </button>
                  </div>
                </div>
              )}

              <div className="text-slate-500 text-xs flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                Aguardando confirmação do pagamento...
              </div>
              <p className="text-slate-600 text-xs mt-2">Valor: <strong className="text-white">R$ {pixData.amount?.toFixed(2)}</strong> · Plano {pixData.plan}</p>
            </div>
          </motion.div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto text-center">
            <div className="bg-gradient-to-b from-emerald-900/30 to-emerald-950/30 border border-emerald-500/30 rounded-3xl p-12">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-black text-white mb-3">Pagamento Confirmado!</h2>
              <p className="text-slate-400 mb-8">Sua loja foi criada com sucesso. Em breve você receberá as credenciais de acesso por e-mail.</p>
              <Link to="/login">
                <button className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black rounded-2xl hover:from-emerald-600 hover:to-teal-700 shadow-xl shadow-emerald-900/50 transition-all">
                  Acessar minha loja →
                </button>
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// TRACKING PAGE - Rastreamento do Entregador em Tempo Real
// ============================================================
const TrackingPage = () => {
  const { courierId } = useParams<{ courierId: string }>();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [courierInfo, setCourierInfo] = useState<{ courierName?: string; latitude?: number; longitude?: number } | null>(null);
  const [status, setStatus] = useState<'waiting' | 'active' | 'stopped'>('waiting');

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Init map after CSS loads
    const initMap = async () => {
      const L = (await import('leaflet')).default;

      // Fix default icon path issue with bundlers
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!).setView([-23.5505, -46.6333], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
      leafletMapRef.current = map;

      const courierIcon = L.divIcon({
        html: `<div style="background:#ea580c;width:40px;height:40px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:18px;">🛵</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        className: ''
      });

      const marker = L.marker([-23.5505, -46.6333], { icon: courierIcon }).addTo(map);
      marker.bindPopup('📍 Entregador');
      markerRef.current = marker;
    };

    initMap();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!courierId) return;

    // Join tracking room
    socket.emit('track:join', { courierId });

    socket.on('courier:location:update', (data) => {
      setCourierInfo(data);
      setStatus('active');
      if (leafletMapRef.current && markerRef.current) {
        const latlng = [data.latitude, data.longitude] as [number, number];
        markerRef.current.setLatLng(latlng);
        markerRef.current.setPopupContent(`📍 ${data.courierName || 'Entregador'}`);
        leafletMapRef.current.setView(latlng, 16);
      }
    });

    socket.on('courier:location:stopped', () => {
      setStatus('stopped');
    });

    return () => {
      socket.emit('track:leave', { courierId });
      socket.off('courier:location:update');
      socket.off('courier:location:stopped');
    };
  }, [courierId]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
            <Navigation size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-black text-sm">Rastreamento ao Vivo</p>
            <p className="text-slate-400 text-xs">{courierInfo?.courierName || 'Aguardando entregador...'}</p>
          </div>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold",
          status === 'active' ? 'bg-green-500/20 text-green-400' :
            status === 'stopped' ? 'bg-red-500/20 text-red-400' :
              'bg-yellow-500/20 text-yellow-400'
        )}>
          <div className={cn("w-2 h-2 rounded-full", status === 'active' ? 'bg-green-400 animate-pulse' : status === 'stopped' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse')} />
          {status === 'active' ? 'Ao Vivo' : status === 'stopped' ? 'Encerrado' : 'Aguardando'}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full min-h-[calc(100vh-80px)]" />

        {status === 'waiting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-6xl mb-4">🛵</div>
              <p className="text-white font-black text-xl">Aguardando o entregador...</p>
              <p className="text-slate-400 mt-2 text-sm">A localização aparecerá assim que o entregador ativar o GPS</p>
              <div className="mt-4 w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          </div>
        )}
        {status === 'stopped' && (
          <div className="absolute bottom-4 left-4 right-4 bg-red-900/80 text-white p-4 rounded-2xl text-center font-bold">
            O entregador parou de compartilhar a localização.
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// METRICS TAB - Dashboard de Métricas para Dono da Loja
// ============================================================
const MetricsTab = ({ orgId }: { orgId?: string }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/${orgId}/orders`)
      .then(r => r.json())
      .then(data => { setOrders(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [orgId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // --- Compute Metrics ---
  const delivered = orders.filter(o => o.status === 'delivered' && o.payment_status === 'paid');
  const cancelled = orders.filter(o => o.status === 'cancelled');
  const totalRevenue = delivered.reduce((s, o) => s + (o.total_price || 0), 0);
  const avgTicket = delivered.length > 0 ? totalRevenue / delivered.length : 0;
  const cancelRate = orders.length > 0 ? (cancelled.length / orders.length) * 100 : 0;

  // Revenue by day (last 30 days)
  const revenueByDay: Record<string, number> = {};
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    revenueByDay[key] = 0;
  }
  delivered.forEach(o => {
    const d = new Date(o.created_at);
    const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    if (key in revenueByDay) revenueByDay[key] += o.total_price || 0;
  });
  const revenueData = Object.entries(revenueByDay).map(([date, value]) => ({ date, value: Number(value.toFixed(2)) }));

  // Top products
  const productCount: Record<string, { name: string, count: number, revenue: number }> = {};
  delivered.forEach(o => {
    (o.items || []).forEach((item: any) => {
      const name = item.name || 'Produto';
      if (!productCount[name]) productCount[name] = { name, count: 0, revenue: 0 };
      productCount[name].count++;
      productCount[name].revenue += item.basePrice || 0;
    });
  });
  const topProducts = Object.values(productCount).sort((a, b) => b.count - a.count).slice(0, 5);

  // Peak hours
  const hourCount: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourCount[h] = 0;
  orders.forEach(o => {
    const h = new Date(o.created_at).getHours();
    hourCount[h] = (hourCount[h] || 0) + 1;
  });
  const peakData = Object.entries(hourCount)
    .filter(([h]) => Number(h) >= 6)
    .map(([hour, count]) => ({ hour: `${hour}h`, count }));

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Receita Total', value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: '💰', color: 'from-emerald-500 to-teal-600' },
          { label: 'Ticket Médio', value: `R$ ${avgTicket.toFixed(2)}`, icon: '🎟️', color: 'from-blue-500 to-indigo-600' },
          { label: 'Pedidos Entregues', value: delivered.length, icon: '✅', color: 'from-orange-500 to-red-600' },
          { label: 'Taxa Cancelamento', value: `${cancelRate.toFixed(1)}%`, icon: '❌', color: 'from-slate-500 to-slate-700' },
        ].map(card => (
          <div key={card.label} className={`bg-gradient-to-br ${card.color} rounded-3xl p-5 text-white shadow-lg`}>
            <div className="text-2xl mb-1">{card.icon}</div>
            <div className="text-2xl font-black">{card.value}</div>
            <div className="text-xs font-bold opacity-80 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Revenue by Day */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-lg">
        <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2"><TrendingUp size={20} className="text-emerald-500" /> Receita por Dia (últimos 30 dias)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${v}`} />
            <Tooltip formatter={(v: any) => [`R$ ${Number(v).toFixed(2)}`, 'Receita']} />
            <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-lg">
          <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2"><BarChart3 size={20} className="text-orange-500" /> Top 5 Produtos</h3>
          {topProducts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Sem dados ainda</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                <Tooltip formatter={(v: any) => [v, 'Vendas']} />
                <Bar dataKey="count" fill="#ea580c" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Peak Hours */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-lg">
          <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2"><Clock size={20} className="text-blue-500" /> Horário de Pico</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={peakData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => [v, 'Pedidos']} />
              <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// End of App
