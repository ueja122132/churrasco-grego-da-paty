import express from "express";
import cors from "cors";
import { createServer as createHttpServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path, { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "crypto";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import dns from "dns/promises";
import cron from "node-cron";
import compression from "compression";

dotenv.config({ path: ".env.local" });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database persistence note: Migrating from SQLite to Supabase for production scalability.

// Password Hashing Utility
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${hash}:${salt}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) {
    // Fallback for legacy plain-text passwords during transition
    return password === storedHash;
  }
  const [hash, salt] = storedHash.split(':');
  const buffer = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), buffer);
}

// Migrated logic from SQLite to Supabase

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);
  const io = new Server(httpServer);
  const PORT = process.env.PORT || 3334;

  // Force HTTPS in production
  app.use((req, res, next) => {
    const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1' || req.hostname === '::1';
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https' && !isLocalhost) {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // CORS Configuration
  app.use(cors({
    origin: process.env.VITE_APP_URL || '*', // Restrict this in production if needed
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Security Headers
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: false // Disable HSTS locally to avoid protocol errors on http
  }));

  // Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.ip === '::1' || req.ip === '127.0.0.1' || req.hostname === 'localhost',
    message: { error: "Muitas requisições, tente novamente mais tarde." }
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // More strict for auth routes
    message: { error: "Muitas tentativas de login, tente novamente em 15 minutos." }
  });

  app.use("/api/", limiter);
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);

  // ==========================================
  // LOGO & FAVICON - CRITICAL FOR WHATSAPP/SEO
  // ==========================================
  app.get("/logo.png", async (req, res) => {
    try {
      // Optimize: Only fetch orgs that HAVE a branding logo
      const { data: orgWithLogo, error } = await supabase
        .from('organizations')
        .select('branding, name')
        .not('branding', 'is', null)
        .limit(1)
        .single();

      if (orgWithLogo && orgWithLogo.branding) {
        const logoUrl = orgWithLogo.branding.logoUrl || orgWithLogo.branding.logo || orgWithLogo.branding.logo_url;
        if (logoUrl) {
          console.log(`[LOGO] Found logo in org: ${orgWithLogo.name}`);
          if (logoUrl.startsWith('data:image')) {
            const [meta, base64Data] = logoUrl.split(',');
            const mime = meta.match(/:(.*?);/)?.[1] || 'image/png';
            const img = Buffer.from(base64Data, 'base64');
            res.writeHead(200, { 'Content-Type': mime, 'Content-Length': img.length, 'Cache-Control': 'public, max-age=86400' });
            return res.end(img);
          }
          return res.redirect(logoUrl);
        }
      }

      // Final stable fallback
      const PUBLIC_FALLBACK = "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=60";
      console.warn("[LOGO] No logo found, using public fallback");
      res.redirect(PUBLIC_FALLBACK);
    } catch (err: any) {
      console.error("[LOGO] Fatal error:", err.message);
      res.status(500).send('Internal Server Error');
    }
  });

  // Simple in-memory cache for Org Detection
  const orgCache = new Map<string, { data: any, timestamp: number }>();
  const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

  // SaaS Tenant Lookup via Domain or Slug
  app.get("/api/org/detect", async (req, res) => {
    const host = req.query.host as string || req.hostname;
    const fallbackSlug = req.query.slug as string;
    const orgId = req.query.orgId as string;
    const cacheKey = `${host}-${fallbackSlug}-${orgId}`;

    // Check Cache
    const cached = orgCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return res.json(cached.data);
    }

    console.log(`[BACKEND] Detecting org for host: ${host}, fallback: ${fallbackSlug}`);

    try {
      // Execution in parallel or sequential if needed, but optimized
      let data = null;

      if (orgId) {
        const { data: idData } = await supabase.from('organizations').select('*').eq('id', orgId).maybeSingle();
        data = idData;
      }

      if (!data && host) {
        const { data: domData } = await supabase.from('organizations').select('*').eq('custom_domain', host).maybeSingle();
        data = domData;
      }

      // Localhost Fallback for Ajeu's Dev Environment
      if (!data && (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '::ffff:127.0.0.1')) {
        console.log("[BACKEND] Localhost detected (", host, "), falling back to 'paty-churrasco' for dev experience");
        const { data: slugData } = await supabase.from('organizations').select('*').eq('slug', 'paty-churrasco').maybeSingle();
        data = slugData;
      }

      if (!data && fallbackSlug) {
        const { data: slugData } = await supabase.from('organizations').select('*').eq('slug', fallbackSlug).maybeSingle();
        data = slugData;
      }

      if (!data) return res.status(404).json({ error: "Organização não encontrada" });

      const sanitizedData = { ...data, has_mp_token: !!data.mp_access_token };
      delete sanitizedData.mp_access_token;
      
      // Update Cache
      orgCache.set(cacheKey, { data: sanitizedData, timestamp: Date.now() });
      res.json(sanitizedData);
    } catch (err: any) {
      res.status(500).json({ error: "Erro interno" });
    }
  });


  // ==========================================
  // MIDDLEWARES DE PROTEÇÃO SAAS
  // ==========================================

  const billingCache = new Map<string, { data: any, timestamp: number }>();

  const billingGuard = async (req: any, res: any, next: any) => {
    const orgId = req.params.orgId || req.body.orgId || req.query.orgId || (req.params.id && req.url.includes('/api/organizations/') ? req.params.id : null);

    // Se não for rota de tenant ou settings, deixa passar
    if (!orgId || (req.method === 'GET' && req.url.includes('/products'))) return next();

    try {
      // Cache Check
      const cached = billingCache.get(orgId);
      if (cached && (Date.now() - cached.timestamp < 1000 * 60)) { // 1 minute billing cache
        const org = cached.data;
        return processBilling(org, res, next);
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('subscription_status, next_billing_date, is_exempt, status, billing_due_date, billing_exempt')
        .eq('id', orgId)
        .single();

      if (!org) return next();
      
      billingCache.set(orgId, { data: org, timestamp: Date.now() });
      processBilling(org, res, next);
    } catch (err) {
      next();
    }
  };

  function processBilling(org: any, res: any, next: any) {
    const status = org.subscription_status || org.status || 'active';
    const dueDate = org.next_billing_date || org.billing_due_date;
    const exempt = org.is_exempt || org.billing_exempt || false;

    if (exempt) return next();
    if (status === 'suspended' || status === 'past_due' || status === 'inactive') {
      return res.status(402).json({ error: "Assinatura Pendente ou Loja Suspensa", code: "BILLING_BLOCKED" });
    }

    if (dueDate) {
      const graceDate = new Date(dueDate);
      graceDate.setDate(graceDate.getDate() + 3);
      if (new Date() > graceDate) {
        return res.status(402).json({ error: "Assinatura Vencida", code: "BILLING_BLOCKED" });
      }
    }
    next();
  }

  const superAdminGuard = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const customAdminId = req.headers['x-super-admin-id'];
    const path = req.path;

    try {
      // 1. Quick Check Custom ID Fallback
      if (customAdminId && customAdminId !== 'undefined' && customAdminId !== 'null') {
        const { data: profile } = await supabase.from('profiles').select('role, email').eq('id', customAdminId).maybeSingle();
        if (profile?.role === 'super_admin') return next();
      }

      // 2. Auth Header Check
      if (authHeader) {
        const token = authHeader.split(' ').pop();
        if (token && token !== 'undefined' && token !== 'null') {
          const { data: { user: sbUser }, error: authError } = await supabase.auth.getUser(token);
          if (sbUser && !authError) {
            const { data: profile } = await supabase.from('profiles').select('role').eq('email', sbUser.email).maybeSingle();
            if (profile?.role === 'super_admin') return next();
          }
        }
      }

      return res.status(401).json({ error: "Acesso restrito ao Super Admin" });
    } catch (err: any) {
      res.status(500).json({ error: "Erro interno de autenticação" });
    }
  };

  const adminGuard = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const customAdminId = req.headers['x-admin-id'] || req.headers['x-super-admin-id'];
    const path = req.path;

    try {
      if (customAdminId && customAdminId !== 'undefined' && customAdminId !== 'null') {
        const { data: profile } = await supabase.from('profiles').select('id, role, org_id').eq('id', customAdminId).single();
        if (profile?.role === 'admin' || profile?.role === 'super_admin') {
          req.user = profile;
          return next();
        }
      }

      if (authHeader) {
        const token = authHeader.split(' ').pop();
        if (token && token !== 'undefined' && token !== 'null') {
          const { data: { user: sbUser }, error: authError } = await supabase.auth.getUser(token);
          if (sbUser && !authError) {
            const { data: profile } = await supabase.from('profiles').select('id, role, org_id').eq('email', sbUser.email).single();
            if (profile?.role === 'admin' || profile?.role === 'super_admin') {
              req.user = profile;
              return next();
            }
          }
        }
      }

      console.warn(`[AUTH] Admin Access Denied to ${path}`);
      return res.status(401).json({ error: "Acesso restrito a administradores" });
    } catch (err: any) {
      console.error(`[AUTH] Error in adminGuard:`, err.message);
      res.status(500).json({ error: "Erro interno de autenticação" });
    }
  };

  // Super Admin Routes (Global)
  app.get("/api/organizations", superAdminGuard, async (req, res) => {
    try {
      const { data: orgs, error } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      // Optimize: Instead of fetching all orders/profiles, use SQL counts or summarized data
      // For simplicity and speed without writing custom RPC, we do it with count queries 
      // but in total (not per row) if possible. OR we keep it as is but avoid fetching the WHOLE row content.
      
      const { data: metrics } = await supabase.rpc('get_organizations_metrics');
      
      if (metrics) {
        return res.json(orgs.map(org => ({
          ...org,
          metrics: metrics.find((m: any) => m.org_id === org.id) || { total_clients: 0, total_revenue: 0, monthly_orders: 0 }
        })));
      }

      // Fallback if RPC not applied yet (but prioritized)
      res.json(orgs);
    } catch (err: any) {
      console.error("[GET ORGS] Erro:", err.message);
      res.status(500).json({ error: "Erro ao buscar organizações." });
    }
  });

  // Super Admin Routes (Global) - PROTECTED
  app.post("/api/organizations", async (req, res) => {
    const { name, slug, branding, owner_id } = req.body;
    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert([{ 
          name, 
          slug, 
          branding: branding || { primaryColor: "#ea580c", secondaryColor: "#fb923c" },
          owner_id: owner_id || null
        }])
        .select()
        .single();

      if (error) {
        console.error("[CREATE ORG ERROR]", error);
        return res.status(500).json({ error: error.message });
      }
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Excluir organização (Hard Delete) - PROTECTED
  app.delete("/api/organizations/:id", superAdminGuard, async (req, res) => {
    try {
      const { id } = req.params;

      // 1. Apagar todas as dependências locais ou confiar no ON DELETE CASCADE do Supabase.
      // O ideal é que o banco tenha CASCADE, mas faremos a limpeza dos produtos/pedidos para garantir.
      await supabase.from('products').delete().eq('org_id', id);
      await supabase.from('extra_ingredients').delete().eq('org_id', id);
      await supabase.from('orders').delete().eq('org_id', id);
      await supabase.from('expenses').delete().eq('org_id', id);
      await supabase.from('saas_payments').delete().eq('org_id', id);

      // Finalmente, excluir a organização
      const { error } = await supabase.from('organizations').delete().eq('id', id);

      if (error) {
        console.error("[DELETE ORG] Erro ao excluir organização:", error);
        return res.status(500).json({ error: "Erro ao excluir a organização do banco de dados" });
      }

      res.json({ success: true, message: "Organização excluída com sucesso" });
    } catch (err: any) {
      console.error("[DELETE ORG] Fatal Error:", err.message);
      res.status(500).json({ error: "Erro interno ao tentar excluir a loja" });
    }
  });

  app.get("/api/admin/global-metrics", superAdminGuard, async (req, res) => {
    try {
      // Use SQL Aggregations (counts/sums)
      const [
        { count: totalOrgs },
        { count: activeOrgs },
        { data: revenueData },
        { count: totalOrders }
      ] = await Promise.all([
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        supabase.from('organizations').select('*', { count: 'exact', head: true }).or('status.eq.active,status.is.null'),
        supabase.from('orders').select('total_price').eq('payment_status', 'paid'),
        supabase.from('orders').select('*', { count: 'exact', head: true })
      ]);

      const totalRevenue = revenueData?.reduce((acc, o) => acc + (Number(o.total_price) || 0), 0) || 0;

      res.json({ totalRevenue, totalOrders, totalOrgs, activeOrgs });
    } catch (err: any) {
      res.status(500).json({ error: "Erro ao gerar métricas" });
    }
  });

  // Toggle org active/inactive
  app.patch("/api/organizations/:id/status", superAdminGuard, async (req, res) => {
    const { status } = req.body;
    if (!['active', 'inactive', 'suspended', 'trial'].includes(status)) {
      return res.status(400).json({ error: "Status inválido" });
    }
    const { data, error } = await supabase
      .from('organizations')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, org: data });
  });

  // Set billing exemption
  app.patch("/api/organizations/:id/billing-exempt", superAdminGuard, async (req, res) => {
    const { billing_exempt } = req.body;
    const { data, error } = await supabase
      .from('organizations')
      .update({ is_exempt: billing_exempt, billing_exempt: billing_exempt })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, org: data });
  });

  // Update billing due date
  app.patch("/api/organizations/:id/billing-due", superAdminGuard, async (req, res) => {
    const { billing_due_date } = req.body;
    const { data, error } = await supabase
      .from('organizations')
      .update({ next_billing_date: billing_due_date, billing_due_date: billing_due_date })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, org: data });
  });

  // SaaS Global Stats
  app.get("/api/saas/stats", superAdminGuard, async (req, res) => {
    try {
      const { count: orgCount } = await supabase.from('organizations').select('*', { count: 'exact', head: true });
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { data: orders } = await supabase.from('orders').select('total_price').eq('payment_status', 'paid');

      const totalRevenue = orders?.reduce((acc, o) => acc + (o.total_price || 0), 0) || 0;

      res.json({
        total_organizations: orgCount,
        total_users: userCount,
        total_revenue: totalRevenue
      });
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });

  // Daily Cron Job to Auto-suspend overdue organizations
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running daily billing check at midnight...');
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('organizations')
      .update({ status: 'suspended' })
      .eq('billing_exempt', false)
      .eq('status', 'active')
      .lt('billing_due_date', today)
      .not('billing_due_date', 'is', null)
      .select();

    if (error) {
      console.error('[CRON] Error during daily billing check:', error.message);
    } else if (data && data.length > 0) {
      console.log(`[CRON] Automatically suspended ${data.length} overdue organizations.`);
    } else {
      console.log('[CRON] Daily check complete. No overdue organizations found.');
    }
  });

  // Manual trigger for same logic (called by Super Admin on the dashboard)
  app.post("/api/admin/run-billing-check", superAdminGuard, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('organizations')
      .update({ status: 'suspended' })
      .eq('billing_exempt', false)
      .eq('status', 'active')
      .lt('billing_due_date', today)
      .not('billing_due_date', 'is', null)
      .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ suspended: data?.length || 0, orgs: data });
  });

  // Update custom domain
  // Update custom domain - PROTECTED
  app.patch("/api/organizations/:id/custom-domain", superAdminGuard, async (req, res) => {
    const { custom_domain } = req.body;
    const { data, error } = await supabase
      .from('organizations')
      .update({ custom_domain })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, org: data });
  });

  // Verify custom domain via DNS
  app.post("/api/organizations/:id/verify-domain", superAdminGuard, async (req, res) => {
    try {
      const { data: org, error } = await supabase
        .from('organizations')
        .select('custom_domain')
        .eq('id', req.params.id)
        .single();

      if (error || !org || !org.custom_domain) {
        return res.status(400).json({ error: "Domínio customizado não configurado" });
      }

      const domain = org.custom_domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

      let verified = false;
      try {
        const records = await dns.resolveCname(domain);
        if (records && records.length > 0) verified = true;
      } catch (e) {
        try {
          const aRecords = await dns.resolve4(domain);
          if (aRecords && aRecords.length > 0) verified = true;
        } catch (e2) {
          verified = false;
        }
      }

      const newStatus = verified ? 'active' : 'failed';
      const { data: updatedOrg, error: updateError } = await supabase
        .from('organizations')
        .update({ custom_domain_status: newStatus })
        .eq('id', req.params.id)
        .select()
        .single();

      if (updateError) return res.status(500).json({ error: updateError.message });

      res.json({ success: true, verified, status: newStatus, org: updatedOrg });
    } catch (err: any) {
      res.status(500).json({ error: "Erro interno ao verificar domínio." });
    }
  });

  // ===================================================
  // SAAS FINANCEIRO - Pagamentos de Mensalidades
  // ===================================================

  // Registrar um pagamento de mensalidade de uma org
  app.post("/api/saas-payments", superAdminGuard, async (req, res) => {
    const { org_id, amount, month_ref, notes, payment_method } = req.body;
    if (!org_id || !amount || !month_ref) {
      return res.status(400).json({ error: "org_id, amount e month_ref são obrigatórios" });
    }
    const { data, error } = await supabase
      .from('saas_payments')
      .insert([{ org_id, amount, month_ref, notes, payment_method: payment_method || 'manual' }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });

    // Atualizar data de vencimento para próximo mês automaticamente
    const nextMonth = new Date(month_ref);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextDue = nextMonth.toISOString().split('T')[0];
    await supabase.from('organizations').update({ billing_due_date: nextDue, status: 'active' }).eq('id', org_id);

    res.json({ success: true, payment: data });
  });

  // Listar todos os pagamentos (com dados da org) - PROTECTED
  app.get("/api/saas-payments", superAdminGuard, async (req, res) => {
    const { data, error } = await supabase
      .from('saas_payments')
      .select('*, organization:org_id(name, slug, plan, billing_exempt, status)')
      .order('paid_at', { ascending: false })
      .limit(200);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // Resumo financeiro do SaaS - PROTECTED
  app.get("/api/saas-payments/summary", superAdminGuard, async (req, res) => {
    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const lastMonth = now.getMonth() === 0
        ? `${now.getFullYear() - 1}-12`
        : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

      const [orgsResult, paymentsResult, thisMonthResult] = await Promise.all([
        supabase.from('organizations').select('id, name, slug, status, billing_exempt, billing_due_date, plan'),
        supabase.from('saas_payments').select('amount, month_ref, org_id').order('month_ref', { ascending: false }),
        supabase.from('saas_payments').select('amount, org_id').eq('month_ref', currentMonth)
      ]);

      const orgs = orgsResult.data || [];
      const payments = paymentsResult.data || [];
      const thisMonthPayments = thisMonthResult.data || [];

      const paidOrgIds = new Set(thisMonthPayments.map((p: any) => p.org_id));
      const totalEarnedAllTime = payments.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
      const totalThisMonth = thisMonthPayments.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);

      const chargeableOrgs = orgs.filter((o: any) => !o.billing_exempt);
      const paidThisMonth = chargeableOrgs.filter((o: any) => paidOrgIds.has(o.id));
      const overdueOrgs = chargeableOrgs.filter((o: any) => {
        if (paidOrgIds.has(o.id)) return false;
        if (!o.billing_due_date) return false;
        return new Date(o.billing_due_date) < now;
      });
      const exemptOrgs = orgs.filter((o: any) => o.billing_exempt);

      res.json({
        currentMonth,
        totalEarnedAllTime,
        totalThisMonth,
        totalOrgs: orgs.length,
        chargeableOrgs: chargeableOrgs.length,
        paidThisMonth: paidThisMonth.length,
        overdueOrgs: overdueOrgs.length,
        exemptOrgs: exemptOrgs.length,
        paidList: paidThisMonth,
        overdueList: overdueOrgs,
        exemptList: exemptOrgs,
        recentPayments: payments.slice(0, 20)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Deletar um pagamento - PROTECTED
  app.delete("/api/saas-payments/:id", superAdminGuard, async (req, res) => {
    const { error } = await supabase.from('saas_payments').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // ===================================================
  // SAAS SUBSCRIPTION PIX - Pagamento para Contratar
  // ===================================================

  // Planos disponíveis
  const SAAS_PLANS = [
    { id: 'basic', name: 'Básico', price: 50.00, description: 'Até 500 pedidos/mês, 1 loja', features: ['Cardápio digital', 'Pedidos online', 'Painel admin', 'Suporte por chat'] },
    { id: 'pro', name: 'Profissional', price: 100.00, description: 'Pedidos ilimitados, 3 lojas', features: ['Tudo do Básico', 'Múltiplos entregadores', 'Relatórios avançados', 'Domínio personalizado', 'Suporte prioritário'] },
    { id: 'enterprise', name: 'Enterprise', price: 150.00, description: 'Todas as funcionalidades', features: ['Tudo do Pro', 'Lojas ilimitadas', 'API access', 'Onboarding dedicado', 'SLA garantido'] },
  ];

  app.get("/api/saas/plans", (req, res) => {
    res.json(SAAS_PLANS);
  });

  // Criar cobrança PIX para assinar o SaaS
  app.post("/api/saas/subscribe/pix", async (req, res) => {
    const { plan_id, name, email, phone, store_name, store_slug } = req.body;

    if (!plan_id || !name || !email || !store_name || !store_slug) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }

    const plan = SAAS_PLANS.find(p => p.id === plan_id);
    if (!plan) return res.status(400).json({ error: "Plano inválido" });

    // Check if slug is available
    const { data: existingOrg } = await supabase.from('organizations').select('id').eq('slug', store_slug).single();
    if (existingOrg) return res.status(400).json({ error: "Este slug já está em uso. Escolha outro nome para a URL da sua loja." });

    const SAAS_MP_TOKEN = process.env.SAAS_MP_ACCESS_TOKEN;
    if (!SAAS_MP_TOKEN) {
      // Fallback: create a pending subscription record without MP
      const { data, error: subError } = await supabase.from('saas_subscriptions').insert([{
        plan_id, name, email, phone, store_name, store_slug,
        status: 'pending',
        amount: plan.price,
        pix_qr_code: null,
        pix_qr_code_base64: null,
      }]).select().single();

      if (subError) {
        console.error('[SAAS PIX] Fallback Insert Error:', subError);
        return res.status(500).json({ error: "Erro ao registrar intenção de assinatura." });
      }

      return res.json({
        success: true,
        subscription_id: data?.id,
        message: 'Solicite o PIX via WhatsApp para ativar sua conta.',
        whatsapp: 'https://wa.me/5511999999999?text=Quero+contratar+o+plano+' + plan.name
      });
    }

    try {
      // Create Mercado Pago PIX charge
      const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SAAS_MP_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `saas-${store_slug}-${Date.now()}`
        },
        body: JSON.stringify({
          transaction_amount: plan.price,
          description: `AP Delivery SaaS - Plano ${plan.name} - ${store_name}`,
          payment_method_id: 'pix',
          payer: {
            email,
            first_name: name.split(' ')[0],
            last_name: name.split(' ').slice(1).join(' ') || 'Cliente',
            identification: { type: 'CPF', number: phone?.replace(/\D/g, '') || '00000000000' }
          },
          notification_url: `${process.env.VITE_API_URL || 'https://churrascogrego.up.railway.app'}/api/saas/subscribe/webhook`,
          metadata: { plan_id, store_name, store_slug, name, email, phone }
        })
      });

      const mpData = await mpRes.json() as any;

      if (!mpRes.ok) {
        console.error('[SAAS PIX] MP Error Status:', mpRes.status, 'Body:', mpData);
        return res.status(500).json({
          error: 'Erro ao gerar PIX no Mercado Pago.',
          details: mpData,
          status: mpRes.status
        });
      }

      // Save pending subscription
      const { data: sub, error: subError } = await supabase.from('saas_subscriptions').insert([{
        plan_id,
        name,
        email,
        phone,
        store_name,
        store_slug,
        status: 'pending',
        amount: plan.price,
        mp_payment_id: String(mpData.id),
        pix_qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
        pix_qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64,
        expires_at: mpData.date_of_expiration,
      }]).select().single();

      if (subError) {
        console.error('[SAAS PIX] Insert Error:', subError);
        return res.status(500).json({ error: "Erro ao salvar dados da assinatura." });
      }

      res.json({
        success: true,
        subscription_id: sub?.id,
        pix_qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
        pix_qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64,
        expires_at: mpData.date_of_expiration,
        amount: plan.price,
        plan: plan.name,
      });
    } catch (err: any) {
      console.error('[SAAS PIX] Error:', err);
      res.status(500).json({ error: 'Erro ao gerar PIX' });
    }
  });

  // Webhook Mercado Pago - Confirmação de pagamento SaaS
  app.post("/api/saas/subscribe/webhook", async (req, res) => {
    try {
      const { type, data } = req.body;
      if (type !== 'payment' || !data?.id) return res.sendStatus(200);

      const SAAS_MP_TOKEN = process.env.SAAS_MP_ACCESS_TOKEN;
      if (!SAAS_MP_TOKEN) return res.sendStatus(200);

      // Verificar pagamento no MP
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
        headers: { 'Authorization': `Bearer ${SAAS_MP_TOKEN}` }
      });
      const payment = await mpRes.json() as any;

      if (payment.status !== 'approved') return res.sendStatus(200);

      const meta = payment.metadata;
      const { plan_id, store_name, store_slug, name, email, phone } = meta || {};

      if (!store_slug) return res.sendStatus(200);

      // Update subscription status
      const { error: updateSubError } = await supabase.from('saas_subscriptions')
        .update({ status: 'paid', mp_payment_id: String(payment.id) })
        .eq('store_slug', store_slug)
        .eq('status', 'pending');

      if (updateSubError) {
        console.error('[SAAS WEBHOOK] Error updating subscription:', updateSubError);
      }

      // Check if org already exists
      const { data: existingOrg } = await supabase.from('organizations').select('id').eq('slug', store_slug).single();
      if (existingOrg) return res.sendStatus(200);

      // Create the organization automatically
      const plan = SAAS_PLANS.find(p => p.id === plan_id);
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

      const { data: newOrg } = await supabase.from('organizations').insert([{
        name: store_name,
        slug: store_slug,
        status: 'active',
        plan: plan_id || 'basic',
        billing_due_date: nextMonth.toISOString().split('T')[0],
        billing_exempt: false,
        branding: { primaryColor: '#ea580c', secondaryColor: '#fb923c', logoUrl: null },
      }]).select().single();

      // Register first payment
      if (newOrg) {
        const monthRef = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const { error: payError } = await supabase.from('saas_payments').insert([{
          org_id: newOrg.id,
          amount: payment.transaction_amount,
          month_ref: monthRef,
          payment_method: 'pix',
          notes: `Pagamento de assinatura via MP Payment ID: ${payment.id}`,
        }]);

        if (payError) {
          console.error('[SAAS WEBHOOK] Error registering payment record:', payError);
        }
      }

      console.log(`[SAAS WEBHOOK] ✅ Org created automatically: ${store_slug}`);
      res.sendStatus(200);
    } catch (err: any) {
      console.error('[SAAS WEBHOOK] Error:', err);
      res.sendStatus(500);
    }
  });

  // Check subscription status
  app.get("/api/saas/subscribe/status/:subscription_id", async (req, res) => {
    const { data, error } = await supabase
      .from('saas_subscriptions')
      .select('status, store_slug, plan_id, store_name')
      .eq('id', req.params.subscription_id)
      .single();

    if (error) return res.status(404).json({ error: 'Assinatura não encontrada' });
    res.json(data);
  });

  // ===================================================
  // SAAS ANALYTICS (Super Admin Dashboard)
  // ===================================================

  app.get("/api/saas-metrics", superAdminGuard, async (req, res) => {
    try {
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select('id, status, plan, billing_exempt, created_at');

      if (error) throw error;

      let totalActive = 0;
      let totalMRR = 0;
      let totalChurn = 0;
      let pendingTrial = 0; // status is something else or newly created without active billing

      orgs.forEach(org => {
        if (org.status === 'active') {
          totalActive++;
          if (!org.billing_exempt) {
            // Find plan price. Fallback to basic if not found perfectly
            const planDetails = SAAS_PLANS.find(p => p.id === org.plan);
            totalMRR += planDetails ? planDetails.price : 50; // default to 50
          }
        } else if (org.status === 'inactive' || org.status === 'canceled') {
          totalChurn++;
        } else {
          pendingTrial++;
        }
      });

      res.json({
        totalActive,
        totalMRR,
        totalChurn,
        pendingTrial,
        arpu: totalActive > 0 ? totalMRR / totalActive : 0,
      });
    } catch (err: any) {
      console.error("[SAAS METRICS ERROR]", err);
      res.status(500).json({ error: "Erro ao gerar métricas do SaaS" });
    }
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
    try {
      const logoUrl = req.body.logoUrl || req.body.logo_url;
      const { data: org } = await supabase.from('organizations').select('branding').eq('id', req.params.id).single();
      const newBranding = { ...(org?.branding || {}), logoUrl };
      const { data, error } = await supabase.from('organizations').update({ branding: newBranding }).eq('id', req.params.id).select().single();
      if (error) return res.status(500).json({ error: error.message });
      orgCache.clear(); // Important: Clear cache on update
      res.json({ success: true, org: data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update generic organization fields
  app.patch("/api/organizations/:id", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .update(req.body)
        .eq('id', req.params.id)
        .select()
        .single();
      
      if (error) return res.status(500).json({ error: error.message });
      orgCache.clear(); // Important: Clear cache on update
      res.json({ success: true, org: data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update operating hours
  app.patch("/api/organizations/:id/operating-hours", async (req, res) => {
    try {
      const { operating_hours } = req.body;
      const { data, error } = await supabase
        .from('organizations')
        .update({ operating_hours })
        .eq('id', req.params.id)
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      orgCache.clear(); // Important: Clear cache on update
      res.json({ success: true, org: data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update SaaS Plan (next billing cycle)
  app.patch("/api/organizations/:id/plan", async (req, res) => {
    try {
      const { plan } = req.body;
      const { data, error } = await supabase
        .from('organizations')
        .update({ plan: plan.toLowerCase() })
        .eq('id', req.params.id)
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      orgCache.clear(); // Important: Clear cache on update
      res.json({ success: true, org: data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Set product promotional price (null = remove promo)
  app.patch("/api/products/:id/promo", async (req, res) => {
    const { promotional_price } = req.body;
    const { data, error } = await supabase.from('products').update({ promotional_price: promotional_price ?? null }).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // Check payment status manually (Fallback for Webhooks)
  app.get("/api/orders/:id/check-payment", async (req, res) => {
    try {
      const { data: order, error } = await supabase.from('orders').select('*').eq('id', req.params.id).single();
      if (error || !order || !order.mp_payment_id) {
        return res.json({ payment_status: order?.payment_status || 'pending' });
      }

      if (order.payment_status === 'paid') return res.json({ payment_status: 'paid' });

      const { data: org } = await supabase.from('organizations').select('mp_access_token').eq('id', order.org_id).single();
      if (!org?.mp_access_token) return res.json({ payment_status: order.payment_status });

      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${order.mp_payment_id}`, {
        headers: { "Authorization": `Bearer ${org.mp_access_token}` }
      });
      const mpData = await mpRes.json();

      if (mpData.status === 'approved') {
        await supabase
          .from('orders')
          .update({ payment_status: 'paid', status: 'pending' })
          .eq('id', order.id);

        console.log(`[CHECK-PAYMENT] ID #${order.id} FORCED PENDING IN DB`);

        // Extra guard: wait a bit to ensure triggers have settled, then emit correctly
        setTimeout(async () => {
          const { data: latestOrder } = await supabase.from('orders').select('*').eq('id', order.id).single();
          console.log(`[SOCKET EMIT] Sending ID #${order.id} to kitchen as PENDING (After 100ms)`);
          io.emit("order:payment_update", { id: order.id, payment_status: 'paid' });
          io.emit("order:new", { ...(latestOrder || order), payment_status: 'paid', status: 'pending' });
        }, 100);

        return res.json({ payment_status: 'paid' });
      }

      res.json({ payment_status: order.payment_status, mp_status: mpData.status });
    } catch (err: any) {
      console.error("[CHECK-PAYMENT] Error:", err.message);
      res.status(500).json({ error: "Erro ao checar pagamento" });
    }
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

      const appUrl = (process.env.VITE_APP_URL && process.env.VITE_APP_URL.length > 5)
        ? process.env.VITE_APP_URL
        : `https://${req.get('host')}`;

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
        console.error("[PIX-ERROR-DETAIL] Webhook/API Error:", JSON.stringify(mpData, null, 2));
        const errorMsg = mpData.message || "Erro ao gerar PIX no Mercado Pago.";
        return res.status(400).json({ error: errorMsg });
      }

      if (order_id) {
        // Link the payment ID to the order so the webhook can find it
        const { error: linkErr } = await supabase
          .from('orders')
          .update({ mp_payment_id: mpData.id.toString() })
          .eq('id', order_id);
        
        if (linkErr) {
          console.error("[PIX-LINK-ERROR] Order:", order_id, linkErr);
        }
      }

      res.json({
        payment_id: mpData.id,
        qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64,
        status: mpData.status
      });

    } catch (err: any) {
      console.error("[PIX-FATAL] FATAL ERROR:", err.message);
      res.status(500).json({ error: "Erro interno ao gerar PIX" });
    }
  });

  // Generate SaaS PIX for Store Admin (Paid directly to Platform/Super Admin)
  app.post("/api/super-admin/generate-saas-pix", async (req, res) => {
    const { orgId, currentPlanId } = req.body;
    try {
      // Platform owner credentials (or hardcoded/env MP token for the SaaS owner)
      // Since this is paid to the platform, we use the PLATFORM's MP token.
      const platformMpToken = process.env.VITE_SUPER_ADMIN_MP_TOKEN;

      if (!platformMpToken) {
        // Fallback if not set: try to find the platform org or mock a success response for demo
        return res.status(400).json({ error: "Token Mercado Pago da Plataforma não configurado." });
      }

      // Fetch org to get details 
      const { data: org, error } = await supabase.from('organizations').select('name, slug').eq('id', orgId).single();
      if (error || !org) return res.status(404).json({ error: "Organização não encontrada" });

      const priceMap: Record<string, number> = {
        'starter': 49.90,
        'pro': 99.90,
        'premium': 149.90
      };
      const saasPrice = priceMap[currentPlanId || 'pro'] || 99.90;
      const description = `Mensalidade SaaS - ${org.name} (${org.slug})`;

      const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${platformMpToken}`,
          "X-Idempotency-Key": `saas-${orgId}-${Date.now()}`
        },
        body: JSON.stringify({
          transaction_amount: saasPrice,
          description: description,
          payment_method_id: "pix",
          payer: { email: `admin-${org.slug}@plataforma.com` }
        })
      });

      const mpData = await mpRes.json();
      if (!mpRes.ok) {
        console.error("[SAAS PIX] Error:", mpData);
        return res.status(400).json({ error: "Erro ao gerar PIX para a mensalidade." });
      }

      res.json({
        payment_id: mpData.id,
        qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64,
        status: mpData.status
      });
    } catch (err: any) {
      console.error("[SAAS PIX] FATAL:", err);
      res.status(500).json({ error: "Erro interno ao gerar PIX da mensalidade" });
    }
  });

  // Webhook Mercado Pago - payment confirmation - NO GUARD (Public Webhook)
  app.post("/api/webhook/mercadopago", async (req, res) => {
    try {
      console.log("[WEBHOOK] Received Payload:", JSON.stringify(req.body));
      console.log("[WEBHOOK] Received Query:", JSON.stringify(req.query));

      const typeOrTopic = req.query.topic || req.body.type || req.body.action;
      let paymentId = req.query.id || req.body.data?.id;

      if (req.body.action?.startsWith('payment.')) {
        paymentId = req.body.data?.id;
      }

      const isPaymentEvent = typeOrTopic === 'payment' || typeOrTopic?.startsWith('payment.');

      if (isPaymentEvent && paymentId) {
        console.log(`[WEBHOOK] Getting details for MP payment: ${paymentId}`);

        // We SHOULD fetch payment details to verify status, but for simplicity and speed 
        // given the user's current situation, we could also rely on the notification data if it was provided.
        // However, the standard way is to fetch. 
        // For now, let's at least check if we can skip the fetch if we have direct orders matching this ID.

        const { data: matchedOrders } = await supabase
          .from('orders')
          .select('*')
          .eq('mp_payment_id', paymentId.toString())
          .limit(1);

        if (matchedOrders && matchedOrders.length > 0) {
          const order = matchedOrders[0];

          // Fetch full payment details from MP to be sure it's approved
          const { data: org } = await supabase.from('organizations').select('mp_access_token').eq('id', order.org_id).single();

          if (org?.mp_access_token) {
            const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
              headers: { "Authorization": `Bearer ${org.mp_access_token}` }
            });
            const mpData = await mpRes.json();

            if (mpData.status === 'approved') {
              await supabase
                .from('orders')
                .update({ payment_status: 'paid', status: 'pending' })
                .eq('id', order.id);

              console.log(`[WEBHOOK-ULTRA-SAFETY] ID #${order.id} Paid and Forced PENDING`);

              // Wait 350ms to clear and force PENDING to the kitchen monitor
              setTimeout(async () => {
                const { data: latestOrder } = await supabase.from('orders').select('*').eq('id', order.id).single();
                
                // FINAL SAFETY LOCK: Force status 'pending' if not finished, specifically for PIX approved flows
                if (latestOrder?.status !== 'ready' && latestOrder?.status !== 'shipped' && latestOrder?.status !== 'delivered') {
                  const oldStatus = latestOrder?.status;
                  console.log(`[PIX SAFETY] Forcing 'pending' for #${order.id}. Current in DB: ${oldStatus}`);
                  await supabase.from('orders').update({ status: 'pending' }).eq('id', order.id);
                  latestOrder.status = 'pending';
                  console.log(`[PIX SAFETY] Order #${order.id} is now PENDING. (Was ${oldStatus})`);
                }

                io.emit("order:payment_update", { id: order.id, payment_status: 'paid' });
                // Re-emitindo como novo para garantir que apareça se o monitor ainda não o tiver no estado
                io.emit("order:new", { ...latestOrder, payment_status: 'paid', status: 'pending' });
              }, 350);
              
              console.log(`[WEBHOOK] Order #${order.id} paid via MP`);
            } else {
              console.log(`[WEBHOOK] Payment ${paymentId} status is ${mpData.status}, skipping update.`);
            }
          }
        }
      }
      res.sendStatus(200);
    } catch (err: any) {
      console.error("[WEBHOOK] Error:", err.message);
      res.sendStatus(500);
    }
  });


  // SaaS Admin Routes (Global Management) - PROTECTED
  app.get("/api/saas/organizations", superAdminGuard, async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          owner:owner_id (
            name,
            phone,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PROTECTED
  app.patch("/api/saas/organizations/:id", superAdminGuard, async (req, res) => {
    const { custom_domain, name, slug } = req.body;
    try {
      const { data, error } = await supabase
        .from('organizations')
        .update({ custom_domain, name, slug })
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) throw error;
      orgCache.clear(); // Important: Clear cache on update
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PROTECTED
  app.get("/api/saas/stats", superAdminGuard, async (req, res) => {
    try {
      const { count: orgCount } = await supabase.from('organizations').select('*', { count: 'exact', head: true });
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { data: orders } = await supabase.from('orders').select('total_price').eq('payment_status', 'paid');

      const totalRevenue = orders?.reduce((acc, o) => acc + (Number(o.total_price) || 0), 0) || 0;

      res.json({
        total_organizations: orgCount,
        total_users: userCount,
        total_revenue: totalRevenue
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PROTECTED
  app.get("/api/saas/clients", adminGuard, async (req: any, res) => {
    const profile = req.user;
    if (!profile) return res.status(401).json({ error: "Perfil não identificado" });

    try {
      // Use orgId from query (for super admins) or profile (for regular admins)
      const requestedOrgId = req.query.orgId || profile.org_id;

      if (!requestedOrgId) {
        return res.status(403).json({ error: "Nenhuma organização vinculada ou informada" });
      }

      // If regular admin, ensure they only access their own org
      if (profile.role === 'admin' && profile.org_id !== requestedOrgId) {
        return res.status(403).json({ error: "Acesso negado a esta organização" });
      }

      // Optimization: Fetch in parallel
      const [profilesRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('name, phone, created_at').eq('org_id', requestedOrgId).eq('role', 'user'),
        supabase.from('orders').select('customer_name, customer_phone, total_price, created_at, status, payment_status').eq('org_id', requestedOrgId)
      ]);

      const profiles = profilesRes.data;
      const orders = ordersRes.data;

      if (profilesRes.error) throw profilesRes.error;
      if (ordersRes.error) throw ordersRes.error;

      // Agrupar dados
      const clientMap = new Map<string, { nome: string; telefone: string; total_pedidos: number; total_gasto: number; ultimo_pedido: string }>();

      // Adicionar perfis cadastrados primeiro
      (profiles || []).forEach(p => {
        clientMap.set(p.phone, {
          nome: p.name,
          telefone: p.phone,
          total_pedidos: 0,
          total_gasto: 0,
          ultimo_pedido: p.created_at
        });
      });

      // Adicionar/Atualizar com dados de pedidos
      (orders || []).forEach(order => {
        const phone = order.customer_phone;
        const current = clientMap.get(phone) || {
          nome: order.customer_name,
          telefone: phone,
          total_pedidos: 0,
          total_gasto: 0,
          ultimo_pedido: order.created_at
        };

        // Contar todos os pedidos
        current.total_pedidos += 1;

        // Somar apenas pedidos finalizados no 'total_gasto'
        const isFinished = order.status === 'delivered' || order.payment_status === 'paid';
        if (isFinished) {
          current.total_gasto += Number(order.total_price) || 0;
        }

        // Atualizar data do último pedido e nome (se for mais recente que o atual)
        if (new Date(order.created_at) > new Date(current.ultimo_pedido)) {
          current.ultimo_pedido = order.created_at;
          current.nome = order.customer_name;
        }

        clientMap.set(phone, current);
      });

      const clientsList = Array.from(clientMap.values()).sort((a, b) => {
        // Ordenar por gasto, depois por data
        if (b.total_gasto !== a.total_gasto) return b.total_gasto - a.total_gasto;
        return new Date(b.ultimo_pedido).getTime() - new Date(a.ultimo_pedido).getTime();
      });

      res.json(clientsList);
    } catch (err: any) {
      console.error("[BACKEND] GET /api/saas/clients error:", err.message);
      res.status(500).json({ error: err.message });
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
          password: hashPassword(adminPassword),
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
    const { name, phone, password, role, org_id, commission_rate, email } = req.body;

    // Input Validation
    if (!name || !phone || !password) {
      return res.status(400).json({ error: "Nome, telefone e senha são obrigatórios" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" });
    }
    if (!/^\d+$/.test(phone)) {
      return res.status(400).json({ error: "Telefone deve conter apenas números" });
    }

    try {
      console.log(`[AUTH REGISTER] Attempting to register user: ${name}, phone: ${phone}, org_id: ${org_id}`);
      // Hardcode role to 'user' for public registration to prevent privilege escalation
      const userRole = 'user';

      // Para compatibilidade, inserimos no perfil com suporte a cargo e organização
      const { data, error } = await supabase.from('profiles').insert([{
        name, phone, password: hashPassword(password), role: userRole, org_id: org_id || null, points: 0, commission_rate: commission_rate || 0
      }]).select();
      if (error) throw error;
      res.json(data[0]);
    } catch (err: any) {
      console.error("[REGISTER ERROR]", err);
      res.status(400).json({ error: err.message || "Telefone já cadastrado ou erro no banco", details: err });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No authorization header" });

    const token = authHeader.replace("Bearer ", "");
    try {
      // Verify session with Supabase
      const { data: { user: sbUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !sbUser) return res.status(401).json({ error: "Invalid session" });

      // Get profile from our table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', sbUser.email)
        .single();

      if (profileError || !profile) {
        // If profile doesn't exist, create it (Social Login First Time)
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{
            id: sbUser.id,
            name: sbUser.user_metadata.full_name || sbUser.email?.split('@')[0] || "Usuário Google",
            email: sbUser.email,
            role: 'user',
            points: 0
          }])
          .select()
          .single();

        if (createError) throw createError;
        return res.json(newProfile);
      }

      res.json(profile);
    } catch (err: any) {
      console.error("[AUTH ME ERROR]", err);
      res.status(500).json({ error: "Internal server error during auth verification" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { phone, email, password } = req.body;
      let query = supabase.from('profiles').select('*');
      if (email) query = query.eq('email', email);
      else query = query.eq('phone', phone);

      const { data, error } = await query;

      console.log(`[LOGIN ATTEMPT] Phone/Email: ${phone || email} | Found: ${data?.length} rows`);

      if (error) {
        console.error("[LOGIN DB ERROR]", error);
        return res.status(500).json({ error: "Erro de banco de dados", details: error });
      }

      if (data && data.length > 0) {
        const user = data[0];
        if (verifyPassword(password, user.password)) {
          return res.json(user);
        } else {
          console.log(`[LOGIN FAILED] Password mismatch for ${phone || email}`);
          return res.status(401).json({ error: "Credenciais incorretas (Senha)" });
        }
      } else {
        console.log(`[LOGIN FAILED] User not found: ${phone || email}`);
        return res.status(401).json({ error: "Credenciais incorretas (Usuário não encontrado)" });
      }
    } catch (err: any) {
      console.error("[LOGIN FATAL ERROR]", err);
      res.status(500).json({ error: "Erro interno no servidor de login", details: err.message });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { identifier, newPassword } = req.body;
    if (!identifier || !newPassword) return res.status(400).json({ error: "Dados incompletos" });

    try {
      const isEmail = identifier.includes('@');
      let query = supabase.from('profiles').select('id');
      if (isEmail) query = query.eq('email', identifier);
      else query = query.eq('phone', identifier);

      const { data } = await query.maybeSingle();
      if (!data) return res.status(404).json({ error: "Usuário não encontrado" });

      const hashed = hashPassword(newPassword);
      const { error: updateError } = await supabase.from('profiles').update({ password: hashed }).eq('id', data.id);
      
      if (updateError) throw updateError;
      res.json({ success: true, message: "Senha atualizada com sucesso!" });
    } catch (err: any) {
      res.status(500).json({ error: "Erro ao resetar senha." });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    // Include org_id and role to prevent session corruption in the frontend
    const { data, error } = await supabase.from('profiles').select('id, name, phone, points, address, latitude, longitude, org_id, role').eq('id', req.params.id).single();
    if (data) {
      res.json(data);
    } else {
      res.status(404).json({ error: "Usuário não encontrado" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    const { address, latitude, longitude } = req.body;
    // Explicitly select all to ensure org_id and role are returned
    const { data, error } = await supabase.from('profiles').update({ address, latitude, longitude }).eq('id', req.params.id).select('id, name, phone, points, address, latitude, longitude, org_id, role').single();
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

    // Get active orders for EACH org involved to calculate correct queue positions
    const orgIds = [...new Set((orders || []).filter(o => o.status === 'pending' || o.status === 'preparing').map(o => o.org_id))];

    const activeOrdersMap: Record<string, any[]> = {};
    if (orgIds.length > 0) {
      const { data: allActive } = await supabase.from('orders')
        .select('id, created_at, org_id')
        .in('status', ['pending', 'preparing'])
        .in('org_id', orgIds)
        .order('created_at', { ascending: true });

      (allActive || []).forEach(ao => {
        if (!activeOrdersMap[ao.org_id]) activeOrdersMap[ao.org_id] = [];
        activeOrdersMap[ao.org_id].push(ao);
      });
    }

    const enrichedOrders = (orders || []).map(o => {
      let queuePosition = 0;
      let estimatedMinutes = 0;

      if (o.status === 'pending' || o.status === 'preparing') {
        const orgActive = activeOrdersMap[o.org_id] || [];
        const index = orgActive.findIndex(ao => ao.id === o.id);
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

  app.get("/api/:orgId/clients", async (req, res) => {
    try {
      const orgId = req.params.orgId;
      // Fetch profiles (registered users) and orders in parallel
      const [profilesRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('id, name, email, phone, created_at, avatar_url').eq('role', 'user'),
        supabase.from('orders').select('customer_name, customer_phone, total_price, created_at, status, payment_status').eq('org_id', orgId)
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (ordersRes.error) throw ordersRes.error;

      const clientMap = new Map<string, { id?: string; nome: string; telefone: string; total_pedidos: number; total_gasto: number; ultimo_pedido: string; avatar_url?: string }>();

      // Add registered profiles
      (profilesRes.data || []).forEach(p => {
        const identifier = p.phone || p.email || p.id;
        if (!identifier) return;

        clientMap.set(identifier, {
          id: p.id,
          nome: p.name || 'Cliente sem nome',
          telefone: p.phone || 'Sem Telefone',
          total_pedidos: 0,
          total_gasto: 0,
          ultimo_pedido: p.created_at,
          avatar_url: p.avatar_url
        });
      });

      // Add/Update with order data
      (ordersRes.data || []).forEach(order => {
        const phone = order.customer_phone;
        if (!phone) return;
        
        const current = clientMap.get(phone) || {
          nome: order.customer_name || 'Cliente',
          telefone: phone,
          total_pedidos: 0,
          total_gasto: 0,
          ultimo_pedido: order.created_at
        };

        current.total_pedidos += 1;
        // Count as "spent" if order is finalized or paid
        const isFinished = order.status === 'delivered' || order.status === 'ready' || order.payment_status === 'paid';
        if (isFinished) {
          current.total_gasto += Number(order.total_price) || 0;
        }

        if (new Date(order.created_at) > new Date(current.ultimo_pedido)) {
          current.ultimo_pedido = order.created_at;
          current.nome = order.customer_name || current.nome;
        }

        clientMap.set(phone, current);
      });

      const clientsList = Array.from(clientMap.values()).sort((a, b) => {
        if (b.total_gasto !== a.total_gasto) return b.total_gasto - a.total_gasto;
        return new Date(b.ultimo_pedido).getTime() - new Date(a.ultimo_pedido).getTime();
      });

      res.json(clientsList);
    } catch (err: any) {
      console.error("[SERVER] Error fetching clients:", err.message);
      res.status(500).json({ error: "Erro ao buscar clientes" });
    }
  });

  app.post("/api/products", async (req, res) => {
    const { name, description, price, ingredients, category, image_url, org_id, promotional_price } = req.body;
    const { data, error } = await supabase.from('products').insert([{
      name, description, price, ingredients, category, image_url, org_id, available: true, promotional_price
    }]).select().maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/:orgId/products", billingGuard, async (req, res) => {
    const { name, description, price, ingredients, category = 'churrasco', image_url, available, promotional_price } = req.body;
    const { data } = await supabase.from('products').insert([{
      name, description, price, ingredients, category, image_url, available: available !== false, org_id: req.params.orgId, promotional_price
    }]).select();
    res.json(data?.[0]);
  });

  app.delete("/api/products/:id", async (req, res) => {
    await supabase.from('products').delete().eq('id', req.params.id);
    res.json({ success: true });
  });

  app.patch("/api/products/:id", async (req, res) => {
    const { name, description, price, ingredients, category, image_url, available, promotional_price } = req.body;
    const updatePayload: any = { name, description, price, ingredients, category, image_url };
    if (available !== undefined) updatePayload.available = available;
    if (promotional_price !== undefined) updatePayload.promotional_price = promotional_price;

    const { data, error } = await supabase.from('products')
      .update(updatePayload)
      .eq('id', req.params.id)
      .select()
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.get("/api/:orgId/extra-ingredients", async (req, res) => {
    const { data } = await supabase.from('extra_ingredients').select('*').eq('org_id', req.params.orgId);
    res.json(data);
  });

  app.post("/api/:orgId/extra-ingredients", billingGuard, async (req, res) => {
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
      .select().maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.get("/api/:orgId/orders", billingGuard, async (req, res) => {
    const { data } = await supabase.from('orders').select('*').eq('org_id', req.params.orgId).order('created_at', { ascending: false });
    res.json(data);
  });

  // Global orders for Courier/Delivery (simplified for now)
  app.get("/api/orders", async (req, res) => {
    const { data } = await supabase.from('orders').select('*').in('status', ['ready', 'shipped', 'preparing']).order('created_at', { ascending: false });
    res.json(data);
  });

  app.get("/api/my-orders/:userId", async (req, res) => {
    const { data } = await supabase.from('orders').select('*').eq('user_id', req.params.userId).order('created_at', { ascending: false });
    res.json(data);
  });

  app.post("/api/:orgId/orders", async (req, res) => {
    try {
      const { user_id, customer_name, customer_phone, items, total_price, payment_status = 'pending', address, latitude, longitude, payment_method } = req.body;

      // Check if shop is open
      const { data: org } = await supabase.from('organizations').select('operating_hours').eq('id', req.params.orgId).single();
      if (org?.operating_hours) {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const brTime = new Date(utc + (3600000 * -3)); // UTC-3

        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const dayName = dayNames[brTime.getDay()];
        const hours = (org.operating_hours as any)[dayName];

        if (hours) {
          const currentFormatted = brTime.getHours().toString().padStart(2, '0') + ":" + brTime.getMinutes().toString().padStart(2, '0');
          if (hours.closed || currentFormatted < hours.open || currentFormatted > hours.close) {
            return res.status(403).json({ error: "Desculpe, a loja está fechada no momento." });
          }
        }
      }

      const initialStatus = 'pending';

      const { data: newOrder, error } = await supabase.from('orders').insert([{
        user_id, customer_name, customer_phone, items, total_price, payment_status, address, latitude, longitude, org_id: req.params.orgId, payment_method,
        status: initialStatus
      }]).select().maybeSingle();

      if (error) throw error;

      // Logica de Pontos: deduzir recompensa e ADICIONAR pontos do novo pedido
      const { use_reward } = req.body;
      if (user_id) {
        const { data: profile } = await supabase.from('profiles').select('points').eq('id', user_id).single();
        let currentPoints = profile?.points || 0;
        
        if (use_reward) {
          currentPoints = Math.max(0, currentPoints - 100);
        }
        
        // Usuário ganha 10 pontos na hora que faz o pedido
        currentPoints += 10;
        
        await supabase.from('profiles').update({ points: currentPoints }).eq('id', user_id);
        io.emit("user:points_update", { userId: user_id, points: currentPoints });
      }

      // Emitir para a cozinha imediatamente (no monitor ele será filtrado se for Pix pendente)
      console.log(`[SOCKET EMIT] NOVO PEDIDO: #${newOrder?.id} (${payment_method}) - Status: ${newOrder?.status}`);
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
    
    // If it's becoming paid, we need the full order to notify kitchen
    const { data: order, error } = await supabase.from('orders').update({ ...updateData, status: 'pending' }).eq('id', req.params.id).select().maybeSingle();
    
    if (error) {
      console.error("[PAYMENT] Erro ao atualizar:", error.message);
      return res.status(500).json({ error: error.message });
    }

    if (payment_status === 'paid' && order) {
      console.log(`[MANUAL PAYMENT] ID #${order.id} confirmed. Forced PENDING.`);
        // Wait 350ms to force PENDING to the kitchen monitor
        setTimeout(async () => {
          const { data: check } = await supabase.from('orders').select('status').eq('id', order.id).single();
          
          // FINAL SAFETY LOCK: Force status 'pending' if not finished
          if (check?.status !== 'ready' && check?.status !== 'shipped' && check?.status !== 'delivered') {
            const oldStatus = check?.status;
            console.log(`[MANUAL SAFETY] Forcing 'pending' for #${order.id}. Current in DB: ${oldStatus}`);
            await supabase.from('orders').update({ status: 'pending' }).eq('id', order.id);
            order.status = 'pending';
            console.log(`[MANUAL SAFETY] Order #${order.id} is now PENDING. (Was ${oldStatus})`);
          }

          io.emit("order:payment_update", { id: order.id, payment_status: 'paid' });
          io.emit("order:new", { ...order, status: 'pending', payment_status: 'paid' });
        }, 350);
    } else if (payment_status) {
      io.emit("order:payment_update", { id: parseInt(req.params.id), payment_status });
    }
    
    res.json({ success: true });
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    const { status, courier_id } = req.body;
    const orderId = req.params.id;
    console.log(`[STATUS REQUEST] Order #${orderId} -> ${status} (Requested by: ${req.ip || 'Unknown'})`);
    
    // 1. Get current order
    const { data: order, error: fetchErr } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (!order || fetchErr) return res.status(404).json({ error: "Pedido não encontrado." });

    // 2. Prepare update payload
    const updatePayload: any = { status };
    if (courier_id) updatePayload.courier_id = courier_id;
    if (status === 'shipped') updatePayload.shipped_at = new Date().toISOString();
    if (status === 'delivered') {
      updatePayload.delivered_at = new Date().toISOString();
      updatePayload.payment_status = 'paid'; // Entregue sempre marca como pago
    }

    // 3. Update DB
    const { data: updatedOrder, error: updateErr } = await supabase.from('orders').update(updatePayload).eq('id', orderId).select().maybeSingle();
    if (updateErr) return res.status(500).json({ error: "Erro ao atualizar banco." });

    // 4. Points & Post-update logic (Pontos agora são dados na criação do pedido)
    // 5. Emit updates
    io.emit("order:update", { id: parseInt(orderId), status, courier_id });
    if (status === 'delivered') io.emit("order:payment_update", { id: parseInt(orderId), payment_status: 'paid' });

    res.json({ success: true, status: updatedOrder?.status });
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

  // Courier Management
  app.get("/api/:orgId/couriers", async (req, res) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, phone, email, commission_rate')
      .eq('org_id', req.params.orgId)
      .eq('role', 'courier');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/couriers", async (req, res) => {
    const { name, phone, email, password, commission_rate, org_id } = req.body;
    const { data, error } = await supabase
      .from('profiles')
      .insert([{
        name,
        phone,
        email,
        password: hashPassword(password),
        commission_rate: commission_rate || 15,
        org_id,
        role: 'courier'
      }])
      .select()
      .maybeSingle();

    if (error) return res.status(400).json({ error: "Erro ao cadastrar: telefone já em uso ou dados inválidos." });
    res.json(data);
  });

  app.put("/api/couriers/:id", async (req, res) => {
    const { name, phone, email, password, commission_rate, org_id } = req.body;
    const updateData: any = { name, phone, email, commission_rate, org_id };
    
    if (password && password.trim().length > 0) {
      updateData.password = hashPassword(password);
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.patch("/api/couriers/:id/commission", async (req, res) => {
    const { commission_rate } = req.body;
    const { error } = await supabase.rpc('admin_update_commission', {
      user_id: req.params.id,
      new_rate: commission_rate
    });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.delete("/api/couriers/:id", async (req, res) => {
    const { id } = req.params;
    console.log(`[BACKEND] Deleting Courier Profile: ${id}`);
    try {
      const { error } = await supabase.rpc('admin_delete_profile', { user_id_p: id });
      if (error) {
        console.error(`[BACKEND-DELETE-ERROR] RPC Failed for ${id}:`, error);
        return res.status(500).json({ error: error.message });
      }
      console.log(`[BACKEND] Successfully deleted courier: ${id}`);
      res.json({ success: true });
    } catch (err: any) {
      console.error(`[BACKEND-DELETE-FATAL] ${id}:`, err);
      res.status(500).json({ error: "Erro interno ao excluir" });
    }
  });

  app.patch("/api/orders/:id/courier", async (req, res) => {
    const { courier_id, delivery_fee } = req.body;
    const { data, error } = await supabase
      .from('orders')
      .update({ courier_id, delivery_fee: delivery_fee || 0 })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });

    io.emit("order:update", { id: data.id, status: data.status, courier_id });
    res.json(data);
  });

  app.get("/api/courier/:id/orders", async (req, res) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, customer_profile:user_id(avatar_url)')
      .eq('courier_id', req.params.id)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/couriers/:id/advance", async (req, res) => {
    const { amount } = req.body;
    const courierId = req.params.id;
    const { data: courier } = await supabase.from('profiles').select('org_id, name').eq('id', courierId).maybeSingle();
    if (!courier) return res.status(404).json({ error: "Entregador não encontrado" });

    const { data, error } = await supabase.from('expenses').insert([{
      description: `Vale: ${courier.name}`,
      amount,
      category: 'Vale',
      date: new Date().toISOString(),
      org_id: courier.org_id,
      courier_id: courierId,
      settled: false
    }]).select().maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/couriers/:id/payout", async (req, res) => {
    const { error: orderError } = await supabase
      .from('orders')
      .update({ commission_paid: true })
      .eq('courier_id', req.params.id)
      .eq('status', 'delivered')
      .eq('commission_paid', false);

    if (orderError) return res.status(500).json({ error: orderError.message });

    await supabase
      .from('expenses')
      .update({ settled: true })
      .eq('courier_id', req.params.id)
      .eq('settled', false);

    res.json({ success: true });
  });

  app.get("/api/courier/:id/stats", async (req, res) => {
    // Apenas comissões não pagas
    const { data: unpaidOrders, error: unpaidError } = await supabase
      .from('orders')
      .select('delivery_fee')
      .eq('courier_id', req.params.id)
      .eq('status', 'delivered')
      .eq('commission_paid', false);

    if (unpaidError) return res.status(500).json({ error: unpaidError.message });

    // Vales não compensados (settled = false)
    const { data: advances, error: advancesError } = await supabase
      .from('expenses')
      .select('amount')
      .eq('courier_id', req.params.id)
      .eq('settled', false);

    if (advancesError) return res.status(500).json({ error: advancesError.message });

    // Todos os pedidos entregues para estatísticas (tempo médio e contagem mensal/geral)
    const { data: allDeliveredOrders, error: allOrdersError } = await supabase
      .from('orders')
      .select('created_at, shipped_at, delivered_at')
      .eq('courier_id', req.params.id)
      .eq('status', 'delivered');

    if (allOrdersError) return res.status(500).json({ error: allOrdersError.message });

    const totalCommissions = unpaidOrders.reduce((sum, o) => sum + (Number(o.delivery_fee) || 0), 0);
    const totalAdvances = advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

    // Cálculos de métricas de performance
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalLifetimeDeliveries = 0;
    let monthlyDeliveries = 0;
    let totalDeliveryTimeMins = 0;
    let timedDeliveriesCount = 0;

    for (const order of (allDeliveredOrders || [])) {
      totalLifetimeDeliveries++;
      const orderDate = order.created_at ? new Date(order.created_at) : null;
      const isThisMonth = orderDate && orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      if (isThisMonth) monthlyDeliveries++;

      if (order.shipped_at && order.delivered_at) {
        const shipped = new Date(order.shipped_at).getTime();
        const delivered = new Date(order.delivered_at).getTime();
        const minutes = (delivered - shipped) / (1000 * 60);
        if (minutes >= 0) {
          totalDeliveryTimeMins += minutes;
          timedDeliveriesCount++;
        }
      }
    }

    res.json({
      total_commissions: totalCommissions,
      total_advances: totalAdvances,
      net_pay: totalCommissions - totalAdvances,
      total_lifetime_deliveries: totalLifetimeDeliveries,
      monthly_deliveries: monthlyDeliveries,
      avg_lifetime_time_mins: timedDeliveriesCount > 0 ? Math.round(totalDeliveryTimeMins / timedDeliveriesCount) : 0,
      total_deliveries: totalLifetimeDeliveries
    });
  });

  app.get("/api/:orgId/courier-stats", async (req, res) => {
    try {
      // 1. Get all couriers for this org
      const { data: couriers } = await supabase
        .from('profiles')
        .select('id')
        .eq('org_id', req.params.orgId)
        .eq('role', 'courier');

      if (!couriers || couriers.length === 0) return res.json({});

      const courierIds = couriers.map(c => c.id);

      // 2. Get delivered orders for these couriers
      const { data: orders } = await supabase
        .from('orders')
        .select('courier_id, delivery_fee, status, commission_paid, created_at, shipped_at, delivered_at')
        .in('courier_id', courierIds)
        .eq('status', 'delivered');

      // 3. Get unpaid expenses for these couriers
      const { data: expenses } = await supabase
        .from('expenses')
        .select('courier_id, amount')
        .in('courier_id', courierIds)
        .eq('settled', false);

      const stats: any = {};
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      courierIds.forEach(id => {
        const courierOrders = (orders || []).filter(o => o.courier_id === id);
        const courierExpenses = (expenses || []).filter(e => e.courier_id === id);

        const unpaidCommissions = courierOrders.filter(o => !o.commission_paid).reduce((sum, o) => sum + (Number(o.delivery_fee) || 0), 0);
        const totalAdvances = courierExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        
        let totalLifetimeDeliveries = 0;
        let monthlyDeliveries = 0;
        let totalTime = 0;
        let timedCount = 0;

        courierOrders.forEach(o => {
          totalLifetimeDeliveries++;
          const d = o.created_at ? new Date(o.created_at) : null;
          if (d && d.getMonth() === currentMonth && d.getFullYear() === currentYear) monthlyDeliveries++;

          if (o.shipped_at && o.delivered_at) {
            const mins = (new Date(o.delivered_at).getTime() - new Date(o.shipped_at).getTime()) / 60000;
            if (mins >= 0) {
              totalTime += mins;
              timedCount++;
            }
          }
        });

        stats[id] = {
          total_commissions: unpaidCommissions,
          total_advances: totalAdvances,
          net_pay: unpaidCommissions - totalAdvances,
          total_lifetime_deliveries: totalLifetimeDeliveries,
          monthly_deliveries: monthlyDeliveries,
          avg_lifetime_time_mins: timedCount > 0 ? Math.round(totalTime / timedCount) : 0,
          total_deliveries: totalLifetimeDeliveries
        };
      });

      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/courier/:id/payout", async (req, res) => {
    // Paga comissões
    const { error: orderError } = await supabase
      .from('orders')
      .update({ commission_paid: true })
      .eq('courier_id', req.params.id)
      .eq('status', 'delivered')
      .eq('commission_paid', false);

    if (orderError) return res.status(500).json({ error: orderError.message });

    // Compensa vales
    await supabase
      .from('expenses')
      .update({ settled: true })
      .eq('courier_id', req.params.id)
      .eq('settled', false);

    res.json({ success: true });
  });

  // Expense Management
  app.get("/api/:orgId/expenses", async (req, res) => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('org_id', req.params.orgId)
      .order('date', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/:orgId/expenses", async (req, res) => {
    const { description, amount, category, date, courier_id } = req.body;
    const { data, error } = await supabase
      .from('expenses')
      .insert([{
        description,
        amount,
        category,
        date: date || new Date().toISOString(),
        org_id: req.params.orgId,
        courier_id: courier_id || null,
        settled: false
      }])
      .select()
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, the compiled server.js is inside dist/
    // So __dirname will be the dist directory itself.
    // If running from root via tsx, __dirname is root.
    const isCompiled = __dirname.endsWith('dist') || __dirname.includes('/dist/') || __dirname.includes('\\dist');
    const distPath = isCompiled ? __dirname : path.join(__dirname, "dist");

    console.log(`[SERVER] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Error Handler (Sanitized)
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("[GLOBAL ERROR]", err.stack || err);
    res.status(500).json({
      error: "Erro interno no servidor",
      message: process.env.NODE_ENV === 'development' ? err.message : "Algo deu errado. Tente novamente mais tarde."
    });
  });

  // ===================================
  // SOCKET.IO - GPS Rastreamento
  // ===================================
  io.on('connection', (sock) => {
    // Courier sends their location
    sock.on('courier:location', (data: { courierId: any, courierName: string, latitude: number, longitude: number, timestamp: number }) => {
      // Broadcast to all clients in the courier's tracking room
      io.to(`track:${data.courierId}`).emit('courier:location:update', data);
      // Also store in a Map for new joiners
      (global as any).courierLocations = (global as any).courierLocations || {};
      (global as any).courierLocations[data.courierId] = data;
    });

    // Courier stops sharing
    sock.on('courier:location:stop', (data: { courierId: any }) => {
      io.to(`track:${data.courierId}`).emit('courier:location:stopped', data);
      if ((global as any).courierLocations) {
        delete (global as any).courierLocations[data.courierId];
      }
    });

    // Client joins tracking room
    sock.on('track:join', (data: { courierId: any }) => {
      sock.join(`track:${data.courierId}`);
      // Send last known location if available
      const last = (global as any).courierLocations?.[data.courierId];
      if (last) sock.emit('courier:location:update', last);
    });

    sock.on('track:leave', (data: { courierId: any }) => {
      sock.leave(`track:${data.courierId}`);
    });
  });

  // Get last known courier location
  app.get('/api/courier/:courierId/location', (req, res) => {
    const loc = (global as any).courierLocations?.[req.params.courierId];
    if (!loc) return res.status(404).json({ error: 'Entregador sem localização ativa' });
    res.json(loc);
  });

  httpServer.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();