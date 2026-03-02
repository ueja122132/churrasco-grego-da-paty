import express from "express";
import { createServer as createHttpServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

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
      res.json(data);
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
      const { data, error } = await supabase.from('profiles').insert([{ name, phone, points: 0 }]).select();
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

  app.get("/api/:orgId/orders", async (req, res) => {
    const { data } = await supabase.from('orders').select('*').eq('org_id', req.params.orgId).order('created_at', { ascending: false });
    res.json(data);
  });

  app.post("/api/:orgId/orders", async (req, res) => {
    try {
      const { user_id, customer_name, customer_phone, items, total_price, payment_status = 'pending', address, latitude, longitude } = req.body;

      const { data: newOrder, error } = await supabase.from('orders').insert([{
        user_id, customer_name, customer_phone, items, total_price, payment_status, address, latitude, longitude, org_id: req.params.orgId
      }]).select().single();

      if (error) throw error;

      io.emit("order:new", newOrder);
      res.json(newOrder);
    } catch (err: any) {
      res.status(500).json({ error: "Erro ao criar pedido" });
    }
  });

  app.patch("/api/orders/:id/payment", async (req, res) => {
    const { payment_status } = req.body;
    await supabase.from('orders').update({ payment_status }).eq('id', req.params.id);
    io.emit("order:payment_update", { id: parseInt(req.params.id), payment_status });
    res.json({ success: true });
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    const { status } = req.body;
    const orderId = req.params.id;

    // Get current order to check if it's being delivered
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();

    if (order && status === 'delivered' && order.status !== 'delivered') {
      // Award 2 points to the user if they are logged in
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
