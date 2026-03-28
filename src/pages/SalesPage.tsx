import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  ShoppingBag, 
  Plus, 
  X, 
  CheckCircle2, 
  DollarSign, 
  Clock, 
  QrCode, 
  CreditCard,
  UtensilsCrossed,
  Phone,
  ArrowRight,
  LogIn,
  UserPlus,
  AlertCircle,
  Receipt,
  Truck,
  Copy,
  Trophy,
  Star
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import { useNotification } from "../context/NotificationContext";
import { supabase, socket } from "../supabase";
import { Product, OrderItem, Order, ExtraIngredient } from "../types";
import { cn } from "../lib/utils";

export const SalesPage = () => {
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

  const getStoreStatusMessage = () => {
    if (!org?.operating_hours) return "Loja Aberta";

    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayLabels: Record<string, string> = {
      monday: "segunda", tuesday: "terça", wednesday: "quarta", thursday: "quinta",
      friday: "sexta", saturday: "sábado", sunday: "domingo"
    };

    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const brTime = new Date(utc + (3600000 * -3)); // UTC-3
    const todayName = dayNames[brTime.getDay()];
    const currentTime = brTime.getHours().toString().padStart(2, '0') + ":" + brTime.getMinutes().toString().padStart(2, '0');
    
    const todayHours = (org.operating_hours as any)[todayName];

    // 1. Check if open now
    if (todayHours && !todayHours.closed && currentTime >= todayHours.open && currentTime <= todayHours.close) {
      return `Hoje estamos aberto das ${todayHours.open} até ${todayHours.close}`;
    }

    // 2. Check if will open later today
    if (todayHours && !todayHours.closed && currentTime < todayHours.open) {
      return `Abrimos hoje às ${todayHours.open} (fechamos às ${todayHours.close})`;
    }

    // 3. Find next open day
    let nextDayIdx = (brTime.getDay() + 1) % 7;
    let daysSearched = 0;
    while (daysSearched < 7) {
      const nextDayName = dayNames[nextDayIdx];
      const nextDayHours = (org.operating_hours as any)[nextDayName];
      if (nextDayHours && !nextDayHours.closed) {
        const dayLabel = dayLabels[nextDayName];
        if (daysSearched === 0) {
          return `Abrimos amanhã (${dayLabel}) das ${nextDayHours.open} até ${nextDayHours.close}`;
        }
        return `Só abrimos ${dayLabel} das ${nextDayHours.open} até ${nextDayHours.close}`;
      }
      nextDayIdx = (nextDayIdx + 1) % 7;
      daysSearched++;
    }

    return "Loja Fechada";
  };

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
        setCart([]); // Clear cart ONLY here for Pix
        notify("Pagamento confirmado, volte sempre!", "success");
      }
    };

    socket.on("order:payment_update", onPaymentUpdate);
    return () => {
      socket.off("order:payment_update", onPaymentUpdate);
    };
  }, []); // Mount only! Uses ref for closure-safe state access

  // Fallback Polling for PIX Payment
  useEffect(() => {
    if (!showPayment || !lastOrder) return;
    const interval = setInterval(() => {
      fetch(`/api/orders/${lastOrder.id}/check-payment`)
        .then(res => res.json())
        .then(data => {
          if (data.payment_status === 'paid') {
            setShowPayment(false);
            setPixData(null);
            setLastOrder(null);
            setCart([]); // Clear cart ONLY here for Pix
            notify("Pagamento confirmado, volte sempre!", "success");
            clearInterval(interval);
          }
        })
        .catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, [showPayment, lastOrder]);

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
    if (!user) {
      setNeedsLogin(true);
      return;
    }
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
      } as any];
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
    { id: 'churrasco' as const, label: 'Churrascos Gregos', icon: UtensilsCrossed },
    { id: 'ready' as const, label: 'Bebidas e Prontos', icon: ShoppingBag },
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
      setUseReward(false);

      if (paymentMethod === 'delivery') {
        setIsOrdering(false);
        setCart([]); // Clear cart for delivery immediately
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
      setCart([]); // Manual confirm clears cart
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
    <div className="md:pt-8 p-4 max-w-7xl mx-auto">
      <header className="mb-10 text-center md:text-left flex flex-col md:flex-row items-center gap-6">
        {org?.branding.logoUrl ? (
          <img src={org.branding.logoUrl} alt={org.name} className="w-24 h-24 rounded-3xl shadow-lg object-cover border-4 border-white" />
        ) : (
          <div className="w-24 h-24 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] rounded-3xl flex items-center justify-center text-white shadow-lg">
            <UtensilsCrossed size={48} />
          </div>
        )}
        <div className="flex-1 min-w-0 w-full overflow-hidden">
          <div className={cn(
            "p-4 rounded-3xl mb-6 flex items-center justify-center gap-3 shadow-xl border-4 transition-all",
            isShopOpen 
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
              : "bg-red-600 text-white border-red-500/50 animate-pulse shadow-red-100"
          )}>
            <Clock size={20} className={cn(isShopOpen ? "text-emerald-500" : "text-white")} />
            <span className="font-black uppercase tracking-widest text-[10px] md:text-xs text-center">
              {getStoreStatusMessage()}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter uppercase italic break-words shrink-0">
            <span className="text-gradient leading-tight">{org?.name || "Premium Store"}</span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium tracking-wide">
            {user ? `Bem-vindo(a), ${user.name}!` : "Bem-vindo ao melhor sabor da região!"}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
              <UtensilsCrossed size={10} className="text-orange-400" />
              <span className="text-[10px] text-gray-400 font-semibold tracking-wide">Feito por <span className="text-orange-500 font-black">Ajeu Valverde</span></span>
              <span className="text-gray-300 text-[10px]">•</span>
              <Phone size={9} className="text-gray-400" />
              <span className="text-[10px] text-gray-400">(38) 99904‑0469</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-12">
          {/* Grego Points Dashboard - PREMIUM */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-[2.5rem] shadow-glow text-white relative overflow-hidden"
            >
              {/* Background Glows */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-600/10 rounded-full blur-3xl" />
              
              <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                    <Trophy size={32} className="text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight uppercase italic flex items-center gap-2">
                       Grego Points
                       <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full not-italic tracking-normal">Beta</span>
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {user.points >= 500 ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-yellow-400">
                          <Star size={12} fill="currentColor" /> Cliente Ouro (VIP)
                        </span>
                      ) : user.points >= 300 ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-gray-300">
                           Cliente Prata
                        </span>
                      ) : user.points >= 100 ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-orange-300">
                           Cliente Bronze
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">Nível Novato</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 w-full max-w-sm">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-4xl font-black text-orange-500">{user.points} <span className="text-xs text-white/60 tracking-widest uppercase ml-1">pts</span></span>
                    <span className="text-[10px] font-bold text-white/40 uppercase">Próxima meta: 100 pts</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((user.points % 100), 100)}%` }}
                      className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full shadow-[0_0_15px_rgba(234,88,12,0.5)]"
                    />
                  </div>
                  <p className="text-[10px] text-white/50 mt-2 font-medium">
                    {user.points >= 100 
                      ? "✨ Você já pode resgatar seu desconto de 30%!" 
                      : `Faltam ${100 - (user.points % 100)} pontos para sua próxima recompensa!`}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

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
                      <button 
                        onClick={() => removeFromCart(index)} 
                        title="Remover item"
                        className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-lg transition-colors"
                      >
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
                      to="/register?type=customer"
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
                  <Link to="/register?type=customer" className="flex-1 text-center py-2 bg-white text-orange-600 border border-orange-200 rounded-xl font-bold text-xs">Cadastrar</Link>
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
              title={user ? "Finalizar Pedido" : "Entrar e Pedir"}
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
                <button 
                  onClick={() => setSelectedProduct(null)} 
                  title="Fechar"
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
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

                {pixLoading ? (
                  <div className="bg-gray-50 p-8 rounded-3xl border-2 border-dashed border-gray-200 mb-6 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500 font-medium">Gerando QR Code...</p>
                  </div>
                ) : pixData ? (
                  <div className="mb-6">
                    <div className="bg-white p-4 rounded-3xl border-2 border-dashed border-green-200 mb-4 flex items-center justify-center min-h-[220px]">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixData.qr_code)}`}
                        alt="QR Code PIX"
                        className="w-48 h-48 block mx-auto bg-white"
                      />
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
                        {pixCopied ? <><CheckCircle2 size={18} /> Código copiado!</> : <><Copy size={18} /> Copiar código</>}
                      </button>
                    )}
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2">
                      <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 text-left">Seu pedido será confirmado automaticamente após o pagamento.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200 mb-6">
                    <QrCode size={80} className="mx-auto text-gray-300 mb-3" />
                  </div>
                )}

                <button
                  onClick={() => { setShowPayment(false); setPixData(null); }}
                  className="w-full py-3 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SalesPage;
