import express from "express";
import { createServer as createHttpServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config({ path: ".env.local" });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database persistence note: Migrating from SQLite to Supabase for production scalability.

// Migrated logic from SQLite to Supabase

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);
  const io = new Server(httpServer);
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // SaaS Tenant Lookup
  app.get("/api/org/:slug", async (req, res) => {
    console.log(`[BACKEND] Request for org: ${req.params.slug}`);
    try {
      const { data, error } = await supabase.from('organizations').select('*').eq('slug', req.params.slug).single();
      if (error) {
        console.error(`[BACKEND] Supabase error for ${req.params.slug}:`, error.message);
        return res.status(404).json({ error: "Organização não encontrada", details: error.message });
      }
      console.log(`[BACKEND] Found org: ${data.name}`);

      // Sanitize the data to prevent secret token leakage
      const sanitizedData = {
        ...data,
        has_mp_token: !!data.mp_access_token
      };
      delete sanitizedData.mp_access_token;

      res.json(sanitizedData);
    } catch (err: any) {
      console.error(`[BACKEND] Fatal error for ${req.params.slug}:`, err.message);
      res.status(500).json({ error: "Erro interno no servidor" });
    }
  });

  // Super Admin Routes (Global)
  app.get("/api/organizations", async (req, res) => {
    const { data, error } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/organizations", async (req, res) => {
    const { name, slug, branding } = req.body;
    const { data, error } = await supabase.from('organizations').insert([{ name, slug, branding }]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  });

  app.get("/api/admin/global-metrics", async (req, res) => {
    const { data: orgs } = await supabase.from('organizations').select('id');
    const { data: orders } = await supabase.from('orders').select('total_price, payment_status');

    const totalRevenue = orders?.filter(o => o.payment_status === 'paid').reduce((acc, o) => acc + o.total_price, 0) || 0;
    const totalOrders = orders?.length || 0;
    const totalOrgs = orgs?.length || 0;

    res.json({ totalRevenue, totalOrders, totalOrgs });
  });

  // Mercado Pago Access Token config (per org)
  app.patch("/api/organizations/:id/mp-token", async (req, res) => {
    const { mp_access_token } = req.body;
    const { data, error } = await supabase
      .from('organizations')
      .update({ mp_access_token })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, org: data });
  });

  // Update org logo (branding.logoUrl)
  app.patch("/api/organizations/:id/logo", async (req, res) => {
    const { logoUrl } = req.body;
    const { data: org } = await supabase.from('organizations').select('branding').eq('id', req.params.id).single();
    const newBranding = { ...(org?.branding || {}), logoUrl };
    const { data, error } = await supabase.from('organizations').update({ branding: newBranding }).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, org: data });
  });

  // Set product promotional price (null = remove promo)
  app.patch("/api/products/:id/promo", async (req, res) => {
    const { promotional_price } = req.body;
    const { data, error } = await supabase.from('products').update({ promotional_price: promotional_price ?? null }).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // Pix QR Code generation via Mercado Pago
  app.post("/api/:orgId/pix/create", async (req, res) => {
    const { total_price, order_id, description } = req.body;

    try {
      // Get org's Mercado Pago token
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('mp_access_token, name')
        .eq('id', req.params.orgId)
        .single();

      if (orgError || !org?.mp_access_token) {
        return res.status(400).json({ error: "Loja não configurou o Mercado Pago ainda." });
      }

      // Call Mercado Pago API
      const appUrl = (process.env.VITE_APP_URL && process.env.VITE_APP_URL.length > 5)
        ? process.env.VITE_APP_URL
        : 'https://churrasco-paty-production.up.railway.app';

      const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${org.mp_access_token}`,
          "X-Idempotency-Key": `order-${order_id}-${Date.now()}`
        },
        body: JSON.stringify({
          transaction_amount: parseFloat(total_price.toFixed(2)),
          description: description || `Pedido #${order_id} - ${org.name}`,
          payment_method_id: "pix",
          payer: { email: "cliente@pedido.com" },
          notification_url: `${appUrl}/api/webhook/mercadopago`
        })
      });

      const mpData = await mpRes.json();

      if (!mpRes.ok) {
        console.error("[MP] Error Detail:", JSON.stringify(mpData, null, 2));
        return res.status(400).json({ error: "Erro ao gerar PIX. Verifique as credenciais do Mercado Pago." });
      }

      res.json({
        payment_id: mpData.id,
        qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64,
        status: mpData.status
      });

    } catch (err: any) {
      console.error("[PIX] Error:", err.message);
      res.status(500).json({ error: "Erro interno ao gerar PIX" });
    }
  });

  // Webhook Mercado Pago - payment confirmation
  app.post("/api/webhook/mercadopago", async (req, res) => {
    try {
      const { type, data } = req.body;
      if (type === 'payment' && data?.id) {
        // Find the order by looking for pending payment with this MP payment
        // Update order to paid and emit socket event
        console.log(`[WEBHOOK] MP payment confirmed: ${data.id}`);
        const { data: orders } = await supabase
          .from('orders')
          .select('id, status')
          .eq('mp_payment_id', data.id.toString())
          .limit(1);

        if (orders && orders.length > 0) {
          const currentStatus = orders[0].status;
          const newStatus = currentStatus === 'pending' ? 'preparing' : currentStatus;

          await supabase
            .from('orders')
            .update({ payment_status: 'paid', status: newStatus })
            .eq('id', orders[0].id);

          io.emit("order:payment_update", { id: orders[0].id, payment_status: 'paid' });
          if (newStatus !== currentStatus) {
            io.emit("order:update", { id: orders[0].id, status: newStatus });
          }
        }
      }
      res.sendStatus(200);
    } catch (err: any) {
      console.error("[WEBHOOK] Error:", err.message);
      res.sendStatus(500);
    }
  });


  // Saas Registration (New Store + Admin)
  app.post("/api/saas/register-store", async (req, res) => {
    const { storeName, storeSlug, adminName, adminPhone, adminPassword, adminEmail } = req.body;

    try {
      // 1. Create Organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([{
          name: storeName,
          slug: storeSlug,
          branding: { primaryColor: "#ea580c", secondaryColor: "#fb923c" }
        }])
        .select()
        .single();

      if (orgError) throw orgError;

      // 2. Create Admin Profile linked to this Org
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert([{
          name: adminName,
          phone: adminPhone,
          email: adminEmail,
          password: adminPassword,
          role: 'admin',
          org_id: org.id
        }])
        .select()
        .single();

      if (profileError) throw profileError;

      res.json({ success: true, user: profile, org });
    } catch (err: any) {
      console.error("[BACKEND] Store registration error:", err.message);
      res.status(400).json({ error: "Erro ao criar loja. Verifique se o link (slug) ou telefone já existem." });
    }
  });

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { name, phone, password } = req.body;
    try {
      // In a real app we'd use supabase.auth.signUp
      // For temporary compatibility, we insert into profiles
      const { data, error } = await supabase.from('profiles').insert([{ name, phone, password, points: 0 }]).select();
      if (error) throw error;
      res.json(data[0]);
    } catch (err) {
      res.status(400).json({ error: "Telefone já cadastrado ou erro no banco" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { phone, email, password } = req.body;
    let query = supabase.from('profiles').select('*');
    if (email) query = query.eq('email', email);
    else query = query.eq('phone', phone);

    const { data, error } = await query.single();

    if (data && data.password === password) {
      res.json(data);
    } else {
      res.status(401).json({ error: "Credenciais incorretas" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    const { data, error } = await supabase.from('profiles').select('id, name, phone, points, address, latitude, longitude').eq('id', req.params.id).single();
    if (data) {
      res.json(data);
    } else {
      res.status(404).json({ error: "Usuário não encontrado" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    const { address, latitude, longitude } = req.body;
    const { data, error } = await supabase.from('profiles').update({ address, latitude, longitude }).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: "Erro ao atualizar perfil" });
    res.json(data);
  });

  app.post("/api/tools/resolve-map-url", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL obrigatória" });

    try {
      // If it's a short URL, we need to follow redirects
      let finalUrl = url;
      if (url.includes("goo.gl") || url.includes("maps.app.goo.gl")) {
        const response = await fetch(url, { method: 'HEAD', redirect: 'manual' });
        // fetch with manual redirect might return location header in 3xx
        // or we can use default redirect: 'follow' and get response.url
        const followResponse = await fetch(url, { redirect: 'follow' });
        finalUrl = followResponse.url;
      }

      // Extract coordinates from URL
      // Patterns: 
      // 1. @-23.564,-46.654
      // 2. q=-23.564,-46.654
      // 3. !3d-23.564!4d-46.654 (data param)

      let lat = null;
      let lng = null;

      // Pattern 1: @lat,lng
      const atMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (atMatch) {
        lat = parseFloat(atMatch[1]);
        lng = parseFloat(atMatch[2]);
      }

      // Pattern 2: q=lat,lng
      if (!lat) {
        const qMatch = finalUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (qMatch) {
          lat = parseFloat(qMatch[1]);
          lng = parseFloat(qMatch[2]);
        }
      }

      // Pattern 3: !3dlat!4dlng (common in long google maps urls)
      if (!lat) {
        const data3d = finalUrl.match(/!3d(-?\d+\.\d+)/);
        const data4d = finalUrl.match(/!4d(-?\d+\.\d+)/);
        if (data3d && data4d) {
          lat = parseFloat(data3d[1]);
          lng = parseFloat(data4d[1]);
        }
      }

      if (lat && lng) {
        res.json({ latitude: lat, longitude: lng, finalUrl });
      } else {
        res.status(400).json({ error: "Não foi possível extrair coordenadas deste link" });
      }
    } catch (err) {
      console.error("Erro ao resolver URL:", err);
      res.status(500).json({ error: "Erro ao processar URL" });
    }
  });

  app.get("/api/my-orders/:userId", async (req, res) => {
    const { data: orders } = await supabase.from('orders').select('*').eq('user_id', req.params.userId).order('created_at', { ascending: false });
    const { data: activeOrders } = await supabase.from('orders').select('id, created_at').in('status', ['pending', 'preparing']).order('created_at', { ascending: true });

    const enrichedOrders = (orders || []).map(o => {
      let queuePosition = 0;
      let estimatedMinutes = 0;

      if (o.status === 'pending' || o.status === 'preparing') {
        const index = (activeOrders || []).findIndex(ao => ao.id === o.id);
        if (index !== -1) {
          queuePosition = index;
          estimatedMinutes = (index + 1) * 10;
        }
      }

      return {
        ...o,
        queuePosition,
        estimatedMinutes
      };
    });

    res.json(enrichedOrders);
  });

  // API Routes (Tenant-aware)
  app.get("/api/:orgId/products", async (req, res) => {
    const { data } = await supabase.from('products').select('*').eq('org_id', req.params.orgId);
    res.json(data);
  });

  app.post("/api/:orgId/products", async (req, res) => {
    const { name, description, price, ingredients, category = 'churrasco', image_url } = req.body;
    const { data } = await supabase.from('products').insert([{
      name, description, price, ingredients, category, image_url, org_id: req.params.orgId
    }]).select();
    res.json(data?.[0]);
  });

  app.delete("/api/products/:id", async (req, res) => {
    await supabase.from('products').delete().eq('id', req.params.id);
    res.json({ success: true });
  });

  app.patch("/api/products/:id", async (req, res) => {
    const { name, description, price, ingredients, category, image_url } = req.body;
    const { data, error } = await supabase.from('products')
      .update({ name, description, price, ingredients, category, image_url })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.get("/api/:orgId/extra-ingredients", async (req, res) => {
    const { data } = await supabase.from('extra_ingredients').select('*').eq('org_id', req.params.orgId);
    res.json(data);
  });

  app.post("/api/:orgId/extra-ingredients", async (req, res) => {
    const { name, price } = req.body;
    const { data } = await supabase.from('extra_ingredients').insert([{
      name, price, org_id: req.params.orgId
    }]).select();
    res.json(data?.[0]);
  });

  app.delete("/api/extra-ingredients/:id", async (req, res) => {
    await supabase.from('extra_ingredients').delete().eq('id', req.params.id);
    res.json({ success: true });
  });

  app.patch("/api/extra-ingredients/:id", async (req, res) => {
    const { name, price } = req.body;
    const { data, error } = await supabase.from('extra_ingredients')
      .update({ name, price })
      .eq('id', req.params.id)
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.get("/api/:orgId/orders", async (req, res) => {
    const { data } = await supabase.from('orders').select('*').eq('org_id', req.params.orgId).order('created_at', { ascending: false });
    res.json(data);
  });

  // Global orders for Courier/Delivery (simplified for now)
  app.get("/api/orders", async (req, res) => {
    const { data } = await supabase.from('orders').select('*').in('status', ['ready', 'shipped', 'preparing']).order('created_at', { ascending: false });
    res.json(data);
  });

  app.post("/api/:orgId/orders", async (req, res) => {
    try {
      const { user_id, customer_name, customer_phone, items, total_price, payment_status = 'pending', address, latitude, longitude, payment_method } = req.body;

      const initialStatus = 'pending';

      const { data: newOrder, error } = await supabase.from('orders').insert([{
        user_id, customer_name, customer_phone, items, total_price, payment_status, address, latitude, longitude, org_id: req.params.orgId, payment_method,
        status: initialStatus
      }]).select().single();

      if (error) throw error;

      io.emit("order:new", newOrder);
      res.json(newOrder);
    } catch (err: any) {
      console.error("[ORDER] Erro ao criar pedido:", err.message, err.details || "");
      res.status(500).json({ error: err.message || "Erro ao criar pedido" });
    }
  });

  app.patch("/api/orders/:id/payment", async (req, res) => {
    const { payment_status, mp_payment_id } = req.body;
    const updateData: any = {};
    if (payment_status !== undefined) updateData.payment_status = payment_status;
    if (mp_payment_id !== undefined) updateData.mp_payment_id = mp_payment_id;
    const { error } = await supabase.from('orders').update(updateData).eq('id', req.params.id);
    if (error) console.error("[PAYMENT] Erro ao atualizar:", error.message);
    if (payment_status) io.emit("order:payment_update", { id: parseInt(req.params.id), payment_status });
    res.json({ success: true });
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    const { status } = req.body;
    const orderId = req.params.id;

    // Get current order to check status and payment
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();

    if (!order) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    // Impedir entrega se pagamento não concluído
    if (status === 'delivered') {
      if (order.payment_status !== 'paid') {
        return res.status(400).json({ error: "Não é possível finalizar a entrega sem pagamento concluído." });
      }
    }

    // Award points only when transitioning to delivered for the first time
    if (order && status === 'delivered' && order.status !== 'delivered') {
      if (order.user_id) {
        const { data: profile } = await supabase.from('profiles').select('points').eq('id', order.user_id).single();
        const newPoints = (profile?.points || 0) + 2;
        await supabase.from('profiles').update({ points: newPoints }).eq('id', order.user_id);
        io.emit("user:points_update", { userId: order.user_id, points: newPoints });
      }
    }

    await supabase.from('orders').update({ status }).eq('id', orderId);
    io.emit("order:update", { id: parseInt(orderId), status });
    res.json({ success: true });
  });

  // Socket.io connection
  io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("delivery:update_location", (data) => {
      // data: { orderId: number, latitude: number, longitude: number }
      io.emit(`delivery:location:${data.orderId}`, data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

  // AI Assistant Chat Endpoint
  app.post("/api/ai/chat", async (req, res) => {
    const { messages } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return res.status(500).json({ error: "API Key do Gemini não configurada." });
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const systemPrompt = `Você é a "Paty", a assistente virtual super gente boa e especialista do "Churrasco Grego da Paty".
Seu objetivo é ajudar os clientes a escolherem os melhores lanches, explicar os ingredientes e dar sugestões deliciosas.
Diretrizes:
- Seja sempre amigável, animada e use um toque de humor brasileiro.
- Nosso carro-chefe é o "Churrasco Grego Tradicional" (carne marinada, pão francês crocante, vinagrete e maionese especial).
- Temos também opções prontas como refrigerantes e sucos.
- Você pode sugerir adicionar "Ingredientes Extras" como queijo derretido ou bacon.
- Mantenha as respostas concisas e use emojis.
- Se não souber algo sobre um pedido específico, peça para o cliente verificar no menu ou falar com a gente.
- Nunca saia do personagem. Você É a Paty.`;

      const chat = model.startChat({
        history: [
          { role: "user", parts: [{ text: "Quem é você?" }] },
          { role: "model", parts: [{ text: "Olá! Eu sou a Paty, sua mestre cuca virtual aqui do Churrasco Grego da Paty! 🍖✨ Estou aqui pra te ajudar a montar o lanche dos sonhos. Tá com fome de quê hoje?" }] },
        ],
      });

      // Format history for Gemini from provided messages
      // messages format: [{ role: 'user' | 'assistant', content: string }]
      const lastMessage = messages[messages.length - 1].content;

      const result = await chat.sendMessage(lastMessage);
      const response = await result.response;
      const text = response.text();

      res.json({ text });
    } catch (err: any) {
      console.error("[AI] Error:", err.message);
      res.status(500).json({ error: "Erro ao processar conversa com a IA." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
