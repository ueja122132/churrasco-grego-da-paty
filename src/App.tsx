import React, { useState, useEffect, useMemo, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate } from "react-router-dom";
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
  Send
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

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface User {
  id: string | number;
  name: string;
  phone: string;
  email?: string;
  role?: 'user' | 'admin' | 'super_admin';
  points: number;
  address?: string;
  latitude?: number;
  longitude?: number;
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
    { path: "/admin", icon: Settings, label: "Admin", roles: ['admin', 'super_admin'] },
    { path: "/finance", icon: DollarSign, label: "Caixa", roles: ['admin', 'super_admin'] },
    { path: "/saas-admin", icon: Activity, label: "SaaS", roles: ['super_admin'] },
    { path: "/super-admin", icon: Lock, label: "Super", roles: ['super_admin'] },
    { path: "/profile", icon: User, label: "Perfil", roles: ['user', 'admin', 'super_admin'] },
  ].filter(item => item.roles.includes(user?.role || 'user'));

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-morphism border-t border-white/20 px-4 py-2 flex justify-around items-center z-50 md:top-0 md:bottom-auto md:flex-col md:w-20 md:h-full md:border-t-0 md:border-r">
      <div className="hidden md:flex mb-8 mt-4 relative">
        <motion.div
          animate={{ rotate: isConnected ? 360 : 0 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <UtensilsCrossed className="text-[var(--primary)] w-8 h-8" />
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

  const isPublicRoute = location.pathname === "/login" || location.pathname === "/register" || location.pathname.startsWith("/venda");

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

  // Auth Guard
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
      !isPublicRoute ? "pb-20 md:pb-0 md:pl-20" : ""
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
      {!isPublicRoute && <Navbar />}
      <main className={cn(
        "animate-in fade-in slide-in-from-bottom-4 duration-1000",
        isPublicRoute ? "w-full min-h-screen" : "max-w-7xl mx-auto p-4 md:p-8"
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
          <Route path="/courier" element={<CourierPage />} />
          <Route path="/venda" element={<SaaSLandingPage />} />
          <Route path="/venda/cadastro" element={<SaaSStoreRegister />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
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
    const slug = "paty-churrasco";
    fetch(`/api/org/${slug}`)
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <TenantContext.Provider value={{ org, loading: loadingOrg }}>
      <AuthContext.Provider value={{ user, login, logout }}>
        <Router>
          <AppInner />
        </Router>
      </AuthContext.Provider>
    </TenantContext.Provider>
  );
}

// --- Pages ---

const SalesPage = () => {
  const { user, login, logout } = useAuth();
  const { org } = useTenant();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isOrdering, setIsOrdering] = useState(false);

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
      navigate("/login");
      return;
    }
    if (cart.length === 0) return;
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
      setLastOrder(data);
      setCart([]);
      setUseReward(false);

      if (paymentMethod === 'delivery') {
        setIsOrdering(false);
        alert("Pedido realizado com sucesso! O pagamento será feito na entrega.");
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
      alert(err.message || "Erro ao finalizar pedido. Tente novamente.");
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
      alert("Pagamento confirmado! Seu pedido já está na cozinha. 🍢");
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
                  {catProducts.map(product => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col"
                    >
                      {product.image_url && (
                        <div className="w-full h-40 mb-4 rounded-2xl overflow-hidden bg-gray-50 relative">
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          {(product as any).promotional_price != null && (
                            <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wide shadow-lg flex items-center gap-1">
                              🔥 PROMOÇÃO
                            </div>
                          )}
                        </div>
                      )}
                      {!(product as any).promotional_price && !product.image_url && null}
                      {(product as any).promotional_price != null && !product.image_url && (
                        <div className="mb-2">
                          <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wide">🔥 Promoção</span>
                        </div>
                      )}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg leading-tight group-hover:text-orange-600 transition-colors break-words">{product.name}</h3>
                          <p className="text-sm text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                          {product.category === 'churrasco' && product.ingredients && (
                            <p className="text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-wider">Ingredientes: {product.ingredients}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {(product as any).promotional_price != null ? (
                            <>
                              <span className="block font-mono font-black text-lg text-red-600">R$ {Number((product as any).promotional_price).toFixed(2)}</span>
                              <span className="block font-mono text-xs text-gray-400 line-through">R$ {product.price.toFixed(2)}</span>
                            </>
                          ) : (
                            <span className="font-mono font-bold text-lg text-orange-600">R$ {product.price.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddClick(product)}
                        className="mt-auto mt-6 w-full bg-[var(--primary)] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--secondary)] shadow-xl shadow-[var(--primary)]/20 transition-all active:scale-95"
                      >
                        <Plus size={20} strokeWidth={3} /> Adicionar
                      </button>
                    </motion.div>
                  ))}
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
            {!user && (
              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-sm text-orange-800 mb-4">
                <p className="font-bold flex items-center gap-2">
                  <LogIn size={16} /> Faça login para pedir
                </p>
                <p className="mt-1">Você precisa estar logado para finalizar seu pedido e acompanhar o status.</p>
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
              disabled={isOrdering || cart.length === 0}
              onClick={placeOrder}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isOrdering ? "Processando..." : user ? "Finalizar Pedido" : "Entrar e Pedir"}
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
                <h3 className="text-xl sm:text-2xl font-bold mb-1 break-words px-2">Pagar com PIX</h3>
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
                    <div className="bg-gray-50 p-4 rounded-3xl border-2 border-dashed border-green-200 mb-4">
                      {pixData.qr_code_base64 ? (
                        <img
                          src={`data:image/png;base64,${pixData.qr_code_base64}`}
                          alt="QR Code PIX"
                          className="mx-auto w-48 h-48 rounded-xl shadow-lg border-4 border-white"
                        />
                      ) : (
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixData.qr_code)}`}
                          alt="QR Code PIX"
                          className="mx-auto w-48 h-48 rounded-xl shadow-lg border-4 border-white"
                          referrerPolicy="no-referrer"
                        />
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

  const { org } = useTenant();

  useEffect(() => {
    if (!org) return;
    fetch(`/api/${org.id}/orders`).then(res => res.json()).then(setOrders);
    fetch(`/api/${org.id}/products`).then(res => res.json()).then(setProducts);

    socket.on("order:new", (newOrder: Order) => {
      if (newOrder.org_id === org.id) {
        setOrders(prev => [newOrder, ...prev]);
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
  }, []);

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
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
        <div className="bg-[var(--primary)]/10 text-[var(--primary)] px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest border border-[var(--primary)]/20 shadow-inner">
          {activeOrders.length} Pedidos Ativos
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

              {order.payment_status === 'pending' && (order as any).payment_method === 'delivery' && (
                <button
                  onClick={() => confirmDeliveryPayment(order.id)}
                  className="w-full mb-4 bg-blue-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                >
                  <DollarSign size={14} /> Confirmar Recebimento
                </button>
              )}

              <div className="space-y-2 mb-6">
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

              <div className="flex gap-2 mt-auto pt-2">
                {order.status === 'pending' ? (
                  <button
                    onClick={() => updateStatus(order.id, 'preparing')}
                    className="flex-1 bg-orange-600 text-white py-3 rounded-2xl font-bold hover:bg-orange-700 transition-colors"
                  >
                    Começar Preparo
                  </button>
                ) : (
                  <button
                    disabled={order.payment_status === 'pending' && (order as any).payment_method === 'pix'}
                    onClick={() => updateStatus(order.id, 'ready')}
                    className={cn(
                      "flex-1 bg-green-600 text-white py-3 rounded-2xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2",
                      order.payment_status === 'pending' && (order as any).payment_method === 'pix' ? "opacity-50 cursor-not-allowed" : ""
                    )}
                  >
                    <CheckCircle2 size={20} /> Pronto
                  </button>
                )}
              </div>
              {order.payment_status === 'pending' && (order as any).payment_method === 'pix' && (
                <p className="text-[9px] text-gray-400 text-center italic mt-2">Aguardando pagamento PIX para finalizar.</p>
              )}
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

  const { org } = useTenant();

  useEffect(() => {
    if (!org) return;
    fetch(`/api/${org.id}/orders`).then(res => res.json()).then(setOrders);

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

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
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
                    {order.customer_phone && (
                      <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                        <Phone size={14} /> {order.customer_phone}
                      </p>
                    )}
                    {order.address && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <p className="text-xs font-bold text-blue-800 uppercase mb-1 flex items-center gap-1">
                          <MapPin size={10} /> Endereço de Entrega
                        </p>
                        <p className="text-sm text-blue-900 font-medium leading-tight">{order.address}</p>
                        {order.latitude && order.longitude && (
                          <a
                            href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                          >
                            Abrir no Google Maps <ArrowRight size={10} />
                          </a>
                        )}
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
                <div className="bg-gray-50 p-4 rounded-2xl mb-6">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Itens</p>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="mb-2 last:mb-0 bg-white p-2 rounded-xl border border-gray-100">
                      <p className="text-sm font-bold">{item.quantity}x {item.name}</p>
                      {item.ingredients && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {item.ingredients}
                        </p>
                      )}
                      {item.removedIngredients && item.removedIngredients.length > 0 && (
                        <p className="text-[10px] text-red-500 font-bold uppercase mt-0.5">
                          SEM: {item.removedIngredients.join(', ')}
                        </p>
                      )}
                      {item.extraIngredients && item.extraIngredients.length > 0 && (
                        <p className="text-[10px] text-green-700 font-bold uppercase mt-0.5">
                          EXTRA: {item.extraIngredients.map(e => e.name).join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {order.status === 'ready' ? (
                <button
                  onClick={() => updateStatus(order.id, 'shipped')}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Truck size={20} /> Saiu para Entrega
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
                  <CheckCircle2 size={20} /> Entregue
                </button>
              )}
            </motion.div>
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

const SuperAdminPage = () => {
  const [metrics, setMetrics] = useState({ totalRevenue: 0, totalOrders: 0, totalOrgs: 0 });
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mRes, oRes] = await Promise.all([
          fetch("/api/admin/global-metrics"),
          fetch("/api/organizations")
        ]);
        const mData = await mRes.json();
        const oData = await oRes.json();
        setMetrics(mData);
        setOrganizations(oData);
      } catch (err) {
        console.error("Erro ao carregar dados do Super Admin:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const createOrg = async () => {
    const name = prompt("Nome da Loja:");
    const slug = prompt("Slug da Loja (ex: paty-churrasco):");
    if (!name || !slug) return;

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          branding: { primaryColor: "#ea580c", secondaryColor: "#fb923c" }
        })
      });
      if (res.ok) {
        const newOrg = await res.json();
        setOrganizations([newOrg, ...organizations]);
        alert("Loja criada com sucesso!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-center">Carregando métricas globais...</div>;

  return (
    <div className="pb-24 md:pt-8 p-4 max-w-7xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-5xl font-black text-gradient uppercase tracking-tighter italic flex items-center gap-3">
            <Lock size={48} />
            Super Admin
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Controle Total da Plataforma SaaS</p>
        </div>
        <button
          onClick={createOrg}
          className="bg-[var(--primary)] text-white px-8 py-4 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-[var(--primary)]/20 hover:scale-105 transition-all flex items-center gap-2"
        >
          <Plus size={24} strokeWidth={3} /> Nova Loja
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="premium-card p-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-4">
            <TrendingUp size={32} />
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Faturamento Global</p>
          <p className="text-4xl font-black text-slate-900 mt-2">R$ {metrics.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="premium-card p-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-4">
            <ShoppingBag size={32} />
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Pedidos Totais</p>
          <p className="text-4xl font-black text-slate-900 mt-2">{metrics.totalOrders}</p>
        </div>
        <div className="premium-card p-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center mb-4">
            <Store size={32} />
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Lojas Ativas</p>
          <p className="text-4xl font-black text-slate-900 mt-2">{metrics.totalOrgs}</p>
        </div>
      </div>

      <div className="premium-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 font-black text-xl uppercase tracking-tighter">
          Gestão de Parceiros
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-widest">
                <th className="p-6">Organização</th>
                <th className="p-6">Link (Slug)</th>
                <th className="p-6">Criado em</th>
                <th className="p-6">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {organizations.map(org => (
                <tr key={org.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center font-black text-slate-500 text-lg group-hover:bg-[var(--primary)] group-hover:text-white transition-all">
                        {org.name[0]}
                      </div>
                      <span className="font-bold text-slate-900">{org.name}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-slate-500 font-mono text-xs">{org.slug}</span>
                  </td>
                  <td className="p-6 text-slate-500 font-medium">
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-6">
                    <button className="text-slate-300 hover:text-[var(--primary)] transition-colors">
                      <Settings size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SaaSAdminPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  const { org } = useTenant();

  useEffect(() => {
    if (!org) return;
    fetch(`/api/${org.id}/orders`).then(res => res.json()).then(setOrders);
  }, [org]);

  const totalRevenue = orders.filter(o => o.payment_status === 'paid').reduce((acc, o) => acc + o.total_price, 0);
  const totalOrders = orders.length;
  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing').length;

  const chartData = [
    { name: 'Seg', revenue: 400, orders: 24 },
    { name: 'Ter', revenue: 300, orders: 18 },
    { name: 'Qua', revenue: 550, orders: 32 },
    { name: 'Qui', revenue: 450, orders: 28 },
    { name: 'Sex', revenue: 800, orders: 45 },
    { name: 'Sáb', revenue: 1200, orders: 60 },
    { name: 'Dom', revenue: 950, orders: 50 },
  ];

  return (
    <div className="pb-24 md:pl-24 md:pt-8 p-4 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <Activity size={36} className="text-indigo-600" />
          SaaS Dashboard
        </h1>
        <p className="text-gray-500 mt-2">Visão geral do sistema e métricas de desempenho</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Receita Total</p>
            <p className="text-2xl font-black text-gray-900">R$ {totalRevenue.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Pedidos</p>
            <p className="text-2xl font-black text-gray-900">{totalOrders}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Pedidos Ativos</p>
            <p className="text-2xl font-black text-gray-900">{activeOrders}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Store size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Lojas Ativas</p>
            <p className="text-2xl font-black text-gray-900">1</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Receita Semanal</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(value) => `R$${value}`} />
                <Tooltip
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Volume de Pedidos</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Lojas (Tenants)</h3>
          <button className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors">
            Adicionar Loja
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Loja</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Plano</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Faturamento (Mês)</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                      PC
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Paty Churrasco</p>
                      <p className="text-xs text-gray-500">paty@churrasco.com</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">Pro</span>
                </td>
                <td className="p-4">
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold flex items-center gap-1 w-max">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Ativo
                  </span>
                </td>
                <td className="p-4 font-bold text-gray-900">
                  R$ {totalRevenue.toFixed(2)}
                </td>
                <td className="p-4">
                  <button className="text-gray-400 hover:text-indigo-600 transition-colors">
                    <Settings size={18} />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const FinancePage = () => {
  const { org } = useTenant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');

  useEffect(() => {
    if (!org) return;
    setLoading(true);
    fetch(`/api/${org.id}/orders`)
      .then(r => r.json())
      .then(data => { setOrders(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [org]);

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
          <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center mb-3">
            <Clock size={20} className="text-amber-600" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase">A Receber</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{formatCurrency(pendingRevenue)}</p>
          <p className="text-xs text-gray-400 mt-1">pagamentos pendentes</p>
        </div>
      </div>

      {/* Mini Bar Chart - last 7 days */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-8">
        <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-green-500" />
          Faturamento — Últimos 7 dias
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

  const [extraName, setExtraName] = useState("");
  const [extraPrice, setExtraPrice] = useState("");

  const { org } = useTenant();

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
  }, [org]);

  // Mercado Pago settings
  const [mpToken, setMpToken] = useState("");
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
    const price = promoPrice.trim() === "" ? null : parseFloat(promoPrice);
    try {
      const res = await fetch(`/api/products/${productId}/promo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promotional_price: price })
      });
      if (res.ok) {
        const updated = await res.json();
        setProducts(products.map(p => p.id === productId ? { ...p, promotional_price: updated.promotional_price } : p));
      } else {
        const errText = await res.text();
        console.error("Save promo error:", errText);
        alert("Erro ao salvar promoção: " + errText);
      }
    } catch (e) {
      console.error("Network error on savePromo:", e);
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
        body: JSON.stringify({ logoUrl: dataUrl })
      });
      if (res.ok) {
        setLogoSaved(true);
        setTimeout(() => setLogoSaved(false), 3000);
      }
    } finally {
      setLogoSaving(false);
    }
  };

  const saveMpToken = async () => {
    if (!org || !mpToken.trim()) return;
    setMpSaving(true);
    try {
      const res = await fetch(`/api/organizations/${org.id}/mp-token`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mp_access_token: mpToken.trim() })
      });
      if (res.ok) {
        setMpSaved(true);
        setMpToken("");
        setTimeout(() => setMpSaved(false), 3000);
      } else {
        alert("Erro ao salvar. Verifique o Access Token.");
      }
    } catch (err) {
      alert("Erro ao salvar token do Mercado Pago.");
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setName(""); setDescription(""); setPrice(""); setIngredients(""); setImageUrl("");
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        // Editar produto existente
        const res = await fetch(`/api/products/${editingProduct.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, price: parseFloat(price), ingredients, category, image_url: imageUrl })
        });
        if (!res.ok) throw new Error("Erro ao atualizar produto");
        setProducts(products.map(p => p.id === editingProduct.id
          ? { ...p, name, description, price: parseFloat(price), ingredients, category, image_url: imageUrl }
          : p
        ));
        setEditingProduct(null);
        alert("Produto atualizado com sucesso!");
      } else {
        // Criar novo produto
        const res = await fetch(`/api/${org?.id}/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, price: parseFloat(price), ingredients, category, image_url: imageUrl })
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Erro ao salvar produto");
        }
        const data = await res.json();
        setProducts([...products, { id: data.id, name, description, price: parseFloat(price), ingredients, category, image_url: imageUrl }]);
        alert("Produto salvo com sucesso!");
      }
      setName(""); setDescription(""); setPrice(""); setIngredients(""); setImageUrl("");
    } catch (err: any) {
      console.error("Erro ao salvar produto:", err);
      alert(err.message || "Erro ao salvar produto. Verifique se a imagem não é muito grande.");
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
        <p className="text-gray-500 mt-2">Gerencie seu cardápio e produtos</p>
      </header>

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
      </div>

      {/* Logo da Loja */}
      <div className="mt-10 bg-white rounded-3xl border border-gray-200 shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
            <Store size={24} className="text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Logo da Loja</h2>
            <p className="text-sm text-gray-500">Faça upload de uma imagem para usar como logo</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="shrink-0">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-24 h-24 rounded-2xl object-cover border-2 border-gray-200 shadow-sm" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                <Store size={32} className="text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <label className="block cursor-pointer">
              <span className="block text-xs font-bold text-gray-400 uppercase mb-2">Selecionar Imagem</span>
              <div className="flex items-center gap-3 bg-gray-50 border-2 border-dashed border-gray-300 hover:border-orange-400 rounded-2xl p-4 transition-colors group">
                <div className="w-10 h-10 bg-orange-100 group-hover:bg-orange-200 rounded-xl flex items-center justify-center transition-colors shrink-0">
                  <Plus size={20} className="text-orange-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-700 text-sm">Clique para escolher uma imagem</p>
                  <p className="text-xs text-gray-400">PNG, JPG, WEBP até 5MB</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const dataUrl = reader.result as string;
                      setLogoPreview(dataUrl);
                      saveLogo(dataUrl);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
            </label>
            {logoPreview && (
              <div className="flex gap-2">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                  logoSaved ? "bg-green-100 text-green-700" : logoSaving ? "bg-gray-100 text-gray-500" : "bg-orange-50 text-orange-600"
                )}>
                  {logoSaved ? <><CheckCircle2 size={14} /> Logo salva!</> : logoSaving ? "Salvando..." : <><CheckCircle2 size={14} /> Pronto para salvar</>}
                </div>
                <button
                  type="button"
                  onClick={() => { setLogoPreview(""); saveLogo(""); }}
                  className="text-xs text-red-400 hover:text-red-600 px-3 py-1.5 rounded-xl hover:bg-red-50 transition-colors"
                >
                  Remover logo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Promoções de Produtos */}
      <div className="mt-10 bg-white rounded-3xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
            <TrendingDown size={24} className="text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Promoções</h2>
            <p className="text-sm text-gray-500">Defina preços promocionais para seus produtos</p>
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase">Produto</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase">Preço Normal</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase">Preço Promo</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.map(product => (
              <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {product.image_url && <img src={product.image_url} alt={product.name} className="w-9 h-9 rounded-lg object-cover bg-gray-100" referrerPolicy="no-referrer" />}
                    <span className="font-bold text-gray-800 text-sm">{product.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono font-medium text-gray-500">R$ {product.price.toFixed(2)}</td>
                <td className="px-6 py-4">
                  {editingPromo === product.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={promoPrice}
                        onChange={e => setPromoPrice(e.target.value)}
                        placeholder="Deixe vazio p/ remover"
                        className="w-36 px-3 py-1.5 text-sm border border-orange-300 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none"
                        autoFocus
                      />
                      <button onClick={() => savePromo(product.id)} className="text-green-600 hover:text-green-800 p-1.5 rounded-lg hover:bg-green-50 transition-colors">
                        <CheckCircle2 size={18} />
                      </button>
                      <button onClick={() => { setEditingPromo(null); setPromoPrice(""); }} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <X size={18} />
                      </button>
                    </div>
                  ) : (product as any).promotional_price != null ? (
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-black">
                      🔥 R$ {Number((product as any).promotional_price).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-sm">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => { setEditingPromo(product.id); setPromoPrice((product as any).promotional_price?.toString() || ""); }}
                    className="text-orange-400 hover:text-orange-600 p-2 rounded-lg hover:bg-orange-50 transition-colors"
                    title="Definir promoção"
                  >
                    <Pencil size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mercado Pago Configuration */}
      <div className="mt-10 bg-white rounded-3xl border border-gray-200 shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-sky-100 rounded-2xl flex items-center justify-center">
            <QrCode size={24} className="text-sky-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Pagamento via PIX</h2>
            <p className="text-sm text-gray-500">Conecte sua conta do Mercado Pago para receber pagamentos automáticos</p>
          </div>
        </div>

        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle size={18} className="text-sky-600 shrink-0 mt-0.5" />
          <div className="text-sm text-sky-800">
            <p className="font-bold mb-1">Como obter seu Access Token:</p>
            <ol className="list-decimal list-inside space-y-1 text-sky-700">
              <li>Acesse <strong>mercadopago.com.br</strong></li>
              <li>Vá em <strong>Suas integrações → Credenciais</strong></li>
              <li>Copie o <strong>Access Token de Produção</strong></li>
              <li>Cole abaixo e clique em Salvar</li>
            </ol>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="password"
            value={mpToken}
            onChange={e => setMpToken(e.target.value)}
            placeholder="APP_USR-xxxx... (Access Token do Mercado Pago)"
            className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400"
          />
          <button
            onClick={saveMpToken}
            disabled={mpSaving || !mpToken.trim()}
            className={cn(
              "px-6 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap",
              mpSaved
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-100"
            )}
          >
            {mpSaving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando...</>
            ) : mpSaved ? (
              <><CheckCircle2 size={18} /> Token salvo!</>
            ) : (
              "Salvar Token"
            )}
          </button>
        </div>

        {mpSaved && (
          <div className="mt-3 flex items-center gap-2 text-green-700 text-sm font-medium">
            <CheckCircle2 size={16} />
            Mercado Pago configurado! Seus clientes já podem pagar via PIX automático. 🎉
          </div>
        )}
      </div>
    </div>
  );
};

const LoginPage = () => {
  const { login } = useAuth();
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
            Transforme seu negócio com o <span className="text-gradient">SaaS que mais cresce</span> no Brasil
          </h1>
          <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
            Gestão completa, multitenant, painel de entregas e fidelidade. Tudo o que você precisa para escalar sua rede de churrasco grego.
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
        alert(`Loja ${data.org.name} criada com sucesso! Redirecionando para login...`);
        navigate("/login");
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
            <div className="bg-orange-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-10 shadow-lg shadow-orange-600/20">
              <Store size={32} strokeWidth={3} />
            </div>
            <h2 className="text-4xl font-black leading-tight mb-6">
              Em minutos, sua loja <span className="text-orange-500 italic">online e vendendo</span>.
            </h2>
            <p className="text-slate-400 font-medium">
              Preencha os dados ao lado para criar sua instância exclusiva do melhor SaaS de Churrasco Grego do mundo.
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
    await fetch(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
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

// End of App
