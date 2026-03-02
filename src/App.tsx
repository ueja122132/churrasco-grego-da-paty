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
  Activity,
  MapPin,
  Lock,
  Navigation,
  StopCircle
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
}

interface ExtraIngredient {
  id: number;
  name: string;
  price: number;
}

interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  ingredients?: string;
  removedIngredients?: string[];
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
          <Route path="/saas-admin" element={<SaaSAdminPage />} />
          <Route path="/super-admin" element={<SuperAdminPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/venda" element={<SaaSLandingPage />} />
          <Route path="/venda/cadastro" element={<SaaSStoreRegister />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
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

  // Payment Modal State
  const [showPayment, setShowPayment] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

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
    const finalPrice = product.price + extrasPrice;

    setCart(prev => {
      // We check for exact same product with exact same removed ingredients and exact same extras to group them
      const existingIndex = prev.findIndex(item =>
        item.id === product.id &&
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
        quantity: 1,
        ingredients: ingredientsStr,
        removedIngredients: removedIngredients.length > 0 ? removedIngredients : undefined,
        extraIngredients: extras.length > 0 ? extras : undefined
      }];
    });
    setSelectedProduct(null);
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
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
          longitude: user.longitude
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
      setShowPayment(true);
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
      alert("Pagamento confirmado! Seu pedido já está na cozinha.");
    } catch (err) {
      console.error(err);
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
                      className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden"
                    >
                      {product.image_url && (
                        <div className="w-full h-40 mb-4 rounded-2xl overflow-hidden bg-gray-50">
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg group-hover:text-orange-600 transition-colors">{product.name}</h3>
                          <p className="text-sm text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                          {product.category === 'churrasco' && product.ingredients && (
                            <p className="text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-wider">Ingredientes: {product.ingredients}</p>
                          )}
                        </div>
                        <span className="font-mono font-bold text-lg text-orange-600 ml-4">R$ {product.price.toFixed(2)}</span>
                      </div>
                      <button
                        onClick={() => handleAddClick(product)}
                        className="mt-6 w-full bg-[var(--primary)] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--secondary)] shadow-xl shadow-[var(--primary)]/20 transition-all active:scale-95"
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
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold">{item.quantity}x</span>
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600">
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
                    <p className="text-[10px] text-green-600 font-medium ml-8">
                      Extra: {item.extraIngredients.map(e => e.name).join(', ')}
                    </p>
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
                <div>
                  <h3 className="text-xl font-bold">{selectedProduct.name}</h3>
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

              <div className="p-6 bg-gray-50 flex gap-3 border-t border-gray-100">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1 py-3 font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => addToCart(selectedProduct, tempIngredients, selectedExtras)}
                  className="flex-[2] bg-orange-600 text-white py-3 rounded-2xl font-bold hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2"
                >
                  Confirmar <Plus size={18} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPayment && lastOrder && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 text-center">
                <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <QrCode className="text-orange-600" size={40} />
                </div>
                <h3 className="text-2xl font-bold mb-2">Pagamento via PIX</h3>
                <p className="text-gray-500 mb-8">Escaneie o QR Code abaixo para pagar</p>

                <div className="bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200 mb-8">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=paty-churrasco-order-${lastOrder.id}`}
                    alt="PIX QR Code"
                    className="mx-auto w-48 h-48 rounded-xl shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                  <div className="mt-6 flex flex-col gap-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Valor a pagar</p>
                    <p className="text-3xl font-mono font-bold text-orange-600">R$ {lastOrder.total_price.toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`paty-churrasco-key-${lastOrder.id}`);
                      alert("Chave PIX copiada!");
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <Copy size={18} /> Copiar Chave PIX
                  </button>
                  <button
                    onClick={confirmPayment}
                    className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold hover:bg-green-700 shadow-lg shadow-green-100 transition-all flex items-center justify-center gap-2"
                  >
                    Já paguei! <CheckCircle2 size={20} />
                  </button>
                </div>

                <p className="mt-6 text-[10px] text-gray-400 flex items-center justify-center gap-1">
                  <AlertCircle size={12} /> Seu pedido só será preparado após a confirmação
                </p>
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
                "bg-white p-6 rounded-3xl border-2 shadow-sm relative overflow-hidden",
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
                  <div className={cn(
                    "mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block",
                    order.payment_status === 'paid' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {order.payment_status === 'paid' ? "Pago" : "Pagamento Pendente"}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                  <Clock size={12} />
                  {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

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

              <div className="flex gap-2">
                {order.status === 'pending' ? (
                  <button
                    onClick={() => updateStatus(order.id, 'preparing')}
                    className="flex-1 bg-orange-600 text-white py-3 rounded-2xl font-bold hover:bg-orange-700 transition-colors"
                  >
                    Preparar
                  </button>
                ) : (
                  <button
                    onClick={() => updateStatus(order.id, 'ready')}
                    className="flex-1 bg-green-600 text-white py-3 rounded-2xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={20} /> Pronto
                  </button>
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

  const { org } = useTenant();

  useEffect(() => {
    if (!org) return;
    fetch(`/api/${org.id}/orders`).then(res => res.json()).then(setOrders);

    socket.on("order:update", ({ id, status }: { id: number, status: string }) => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: status as any } : o));
    });

    return () => socket.off("order:update");
  }, [org]);

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
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
                  <div className="text-right">
                    <p className="font-mono font-bold text-xl">R$ {order.total_price.toFixed(2)}</p>
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
                  onClick={() => updateStatus(order.id, 'delivered')}
                  className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={20} /> Entregue
                </button>
              )}
            </motion.div>
          ))
        )}
      </div>
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

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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
      setName("");
      setDescription("");
      setPrice("");
      setIngredients("");
      setImageUrl("");
      alert("Produto salvo com sucesso!");
    } catch (err: any) {
      console.error("Erro ao salvar produto:", err);
      alert(err.message || "Erro ao salvar produto. Verifique se a imagem não é muito grande.");
    }
  };

  const deleteProduct = async (id: number) => {
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    setProducts(products.filter(p => p.id !== id));
  };

  const addExtraIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/extra-ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: extraName, price: parseFloat(extraPrice) })
    });
    const data = await res.json();
    setExtraIngredients([...extraIngredients, { id: data.id, name: extraName, price: parseFloat(extraPrice) }]);
    setExtraName("");
    setExtraPrice("");
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
          <form onSubmit={addProduct} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-lg space-y-4 sticky top-8">
            <h2 className="text-xl font-bold mb-4">Novo Produto</h2>
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    placeholder="Cole uma URL ou envie um arquivo"
                  />
                  <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-xl transition-colors flex items-center justify-center">
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
            <button className="w-full bg-black text-white py-3 rounded-2xl font-bold hover:bg-gray-800 transition-colors">
              Salvar Produto
            </button>
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
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
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
              <form onSubmit={addExtraIngredient} className="flex gap-4 items-end">
                <div className="flex-1">
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
                <button type="submit" className="bg-orange-600 text-white px-6 py-2 h-[42px] rounded-xl font-bold hover:bg-orange-700 transition-colors">
                  Adicionar
                </button>
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
                        <button
                          onClick={() => deleteExtraIngredient(extra.id)}
                          className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/orders").then(res => res.json()).then(setOrders);

    socket.on("order:new", (newOrder: Order) => {
      setOrders(prev => [newOrder, ...prev]);
    });

    socket.on("order:update", ({ id, status }: { id: number, status: string }) => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: status as any } : o));
    });

    return () => {
      socket.off("order:new");
      socket.off("order:update");
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const startTracking = (orderId: number) => {
    if (trackingOrderId === orderId) {
      // Stop tracking
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
          socket.emit("delivery:update_location", {
            orderId,
            latitude,
            longitude
          });
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
            <div key={order.id} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-xl">#{order.id}</h3>
                  <p className="text-gray-600 font-medium">{order.customer_name}</p>
                  <p className="text-sm text-gray-400">{order.address || "Sem endereço cadastrado"}</p>
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase",
                  order.status === 'shipped' ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                )}>
                  {order.status === 'shipped' ? "Em Rota" : "Pronto"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      )}
                    >
                      {trackingOrderId === order.id ? (
                        <><StopCircle size={18} /> Parar GPS</>
                      ) : (
                        <><Navigation size={18} /> Ligar GPS</>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        updateStatus(order.id, 'delivered');
                        setTrackingOrderId(null);
                        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
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
                  Transmitindo localização: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
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
