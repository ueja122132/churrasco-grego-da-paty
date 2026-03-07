import express from "express";
import { createServer as createHttpServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "crypto";

dotenv.config({ path: ".env.local" });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  const PORT = process.env.PORT || 3000;

  // Force HTTPS in production
  app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ==========================================
  // LOGO & FAVICON - CRITICAL FOR WHATSAPP/SEO
  // ==========================================
  app.get("/logo.png", async (req, res) => {
    try {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('branding, name, slug');

      const orgWithLogo = orgs?.find(o => o.branding?.logoUrl || o.branding?.logo || o.branding?.logo_url);

      if (orgWithLogo) {
        const logoUrl = orgWithLogo.branding.logoUrl || orgWithLogo.branding.logo || orgWithLogo.branding.logo_url;
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

      // Final stable fallback
      const PUBLIC_FALLBACK = "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=60";
      console.warn("[LOGO] No logo found, using public fallback");
      res.redirect(PUBLIC_FALLBACK);
    } catch (err: any) {
      console.error("[LOGO] Fatal error:", err.message);
      res.status(500).send('Internal Server Error');
    }
  });

  app.get("/favicon.ico", (req, res) => {
    res.redirect('/logo.png');
  });

  // SaaS Tenant Lookup via Domain or Slug
  app.get("/api/org/detect", async (req, res) => {
    const host = req.query.host as string || req.hostname;
    const fallbackSlug = req.query.slug as string;

    console.log(`[BACKEND] Detecting org for host: ${host}, fallback: ${fallbackSlug}`);

    try {
      // 1. Try by custom domain
      let { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('custom_domain', host)
        .single();

      // 2. If not found and host contains a subdomain of your main apps (optional logic)
      // For now, if not found by domain, try the fallback slug
      if (error && fallbackSlug) {
        const { data: slugData, error: slugError } = await supabase
          .from('organizations')
          .select('*')
          .eq('slug', fallbackSlug)
          .single();
        data = slugData;
        error = slugError;
      }

      if (error || !data) {
        return res.status(404).json({ error: "Organização não encontrada" });
      }

      const sanitizedData = {
        ...data,
        has_mp_token: !!data.mp_access_token
      };
      delete sanitizedData.mp_access_token;
      res.json(sanitizedData);
    } catch (err: any) {
      res.status(500).json({ error: "Erro interno" });
    }
  });


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
    const { data: orgs } = await supabase.from('organizations').select('id, status');
    const { data: orders } = await supabase.from('orders').select('total_price, payment_status');

    const totalRevenue = orders?.filter(o => o.payment_status === 'paid').reduce((acc, o) => acc + o.total_price, 0) || 0;
    const totalOrders = orders?.length || 0;
    const totalOrgs = orgs?.length || 0;
    const activeOrgs = orgs?.filter(o => o.status === 'active' || !o.status).length || 0;

    res.json({ totalRevenue, totalOrders, totalOrgs, activeOrgs });
  });

  // Toggle org active/inactive
  app.patch("/api/organizations/:id/status", async (req, res) => {
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
  app.patch("/api/organizations/:id/billing-exempt", async (req, res) => {
    const { billing_exempt } = req.body;
    const { data, error } = await supabase
      .from('organizations')
      .update({ billing_exempt: !!billing_exempt })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, org: data });
  });

  // Set billing due date
  app.patch("/api/organizations/:id/billing-due", async (req, res) => {
    const { billing_due_date, plan } = req.body;
    const { data, error } = await supabase
      .from('organizations')
      .update({ billing_due_date, plan })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, org: data });
  });

  // Auto-suspend overdue organizations (called on each API check)
  app.post("/api/admin/run-billing-check", async (req, res) => {
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
  app.patch("/api/organizations/:id/custom-domain", async (req, res) => {
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

  // ===================================================
  // SAAS FINANCEIRO - Pagamentos de Mensalidades
  // ===================================================

  // Registrar um pagamento de mensalidade de uma org
  app.post("/api/saas-payments", async (req, res) => {
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

  // Listar todos os pagamentos (com dados da org)
  app.get("/api/saas-payments", async (req, res) => {
    const { data, error } = await supabase
      .from('saas_payments')
      .select('*, organization:org_id(name, slug, plan, billing_exempt, status)')
      .order('paid_at', { ascending: false })
      .limit(200);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // Resumo financeiro do SaaS
  app.get("/api/saas-payments/summary", async (req, res) => {
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

  // Deletar um pagamento
  app.delete("/api/saas-payments/:id", async (req, res) => {
    const { error } = await supabase.from('saas_payments').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // ===================================================
  // SAAS SUBSCRIPTION PIX - Pagamento para Contratar
  // ===================================================

  // Planos disponíveis
  const SAAS_PLANS = [
    { id: 'basic', name: 'Básico', price: 149.90, description: 'Até 500 pedidos/mês, 1 loja', features: ['Cardápio digital', 'Pedidos online', 'Painel admin', 'Suporte por chat'] },
    { id: 'pro', name: 'Profissional', price: 299.90, description: 'Pedidos ilimitados, 3 lojas', features: ['Tudo do Básico', 'Múltiplos entregadores', 'Relatórios avançados', 'Domínio personalizado', 'Suporte prioritário'] },
    { id: 'enterprise', name: 'Enterprise', price: 599.90, description: 'Todas as funcionalidades', features: ['Tudo do Pro', 'Lojas ilimitadas', 'API access', 'Onboarding dedicado', 'SLA garantido'] },
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
      const { data } = await supabase.from('saas_subscriptions').insert([{
        plan_id, name, email, phone, store_name, store_slug,
        status: 'pending',
        amount: plan.price,
        pix_qr_code: null,
        pix_qr_code_base64: null,
      }]).select().single();
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
        console.error('[SAAS PIX] MP Error:', mpData);
        return res.status(500).json({ error: 'Erro ao gerar PIX. Tente novamente.' });
      }

      // Save pending subscription
      const { data: sub } = await supabase.from('saas_subscriptions').insert([{
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
      await supabase.from('saas_subscriptions')
        .update({ status: 'paid', mp_payment_id: String(payment.id) })
        .eq('store_slug', store_slug)
        .eq('status', 'pending');

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
        await supabase.from('saas_payments').insert([{
          org_id: newOrg.id,
          amount: payment.transaction_amount,
          month_ref: monthRef,
          payment_method: 'pix',
          notes: `Pagamento de assinatura via MP Payment ID: ${payment.id}`,
        }]);
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
      res.json({ success: true, org: data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update operating hours
  app.patch("/api/organizations/:id/operating-hours", async (req, res) => {
    const { operating_hours } = req.body;
    const { data, error } = await supabase
      .from('organizations')
      .update({ operating_hours })
      .eq('id', req.params.id)
      .select()
      .single();
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

      const appUrl = (process.env.VITE_APP_URL && process.env.VITE_APP_URL.length > 5)
        ? process.env.VITE_APP_URL
        : 'https://churrascogregodapaty.com';

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

      if (order_id) {
        // Link the payment ID to the order so the webhook can find it
        await supabase
          .from('orders')
          .update({ mp_payment_id: mpData.id.toString() })
          .eq('id', order_id);
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
          .select('id, status, org_id')
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
              const currentStatus = order.status;
              const newStatus = currentStatus === 'pending' ? 'preparing' : currentStatus;

              await supabase
                .from('orders')
                .update({ payment_status: 'paid', status: newStatus })
                .eq('id', order.id);

              io.emit("order:payment_update", { id: order.id, payment_status: 'paid' });
              if (newStatus !== currentStatus) {
                io.emit("order:update", { id: order.id, status: newStatus });
              }
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


  // SaaS Admin Routes (Global Management)
  app.get("/api/saas/organizations", async (req, res) => {
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

  app.patch("/api/saas/organizations/:id", async (req, res) => {
    const { custom_domain, name, slug } = req.body;
    try {
      const { data, error } = await supabase
        .from('organizations')
        .update({ custom_domain, name, slug })
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/saas/stats", async (req, res) => {
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
    const { name, phone, password, role, org_id, commission_rate } = req.body;
    try {
      // Para compatibilidade, inserimos no perfil com suporte a cargo e organização
      const { data, error } = await supabase.from('profiles').insert([{
        name, phone, password: hashPassword(password), role: role || 'user', org_id: org_id || null, points: 0, commission_rate: commission_rate || 0
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

    // Impedir entrega se pagamento não concluído (exceto pagamento em mãos/cartão presencial)
    if (status === 'delivered') {
      if (order.payment_status !== 'paid') {
        if (order.payment_method === 'pix') {
          return res.status(400).json({ error: "Não é possível finalizar a entrega sem pagamento concluído." });
        } else {
          // Para entregas onde o pagamento é no ato (Dinheiro/Cartão), marcamos como pago
          await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', orderId);
          order.payment_status = 'paid';
          io.emit("order:payment_update", { id: parseInt(orderId), payment_status: 'paid' });
        }
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

    console.log(`[Status Update] Order ID: ${orderId}, New Status: ${status}`);
    const { error: updateError } = await supabase.from('orders').update({ status }).eq('id', orderId);

    if (updateError) {
      console.error("[Status Update Error]:", updateError);
      return res.status(500).json({ error: "Erro ao atualizar status no banco de dados." });
    }

    console.log(`[Status Update Success] Order ${orderId} is now ${status}`);
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

  // Courier Management
  app.get("/api/:orgId/couriers", async (req, res) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, phone, commission_rate')
      .eq('org_id', req.params.orgId)
      .eq('role', 'courier');
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
    const { error } = await supabase.rpc('admin_delete_profile', { user_id: req.params.id });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.patch("/api/orders/:id/courier", async (req, res) => {
    const { courier_id, delivery_fee } = req.body;
    const { data, error } = await supabase
      .from('orders')
      .update({ courier_id, delivery_fee: delivery_fee || 0, status: 'preparing' })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });

    io.emit("order:update", { id: data.id, status: 'preparing', courier_id });
    res.json(data);
  });

  app.get("/api/courier/:id/orders", async (req, res) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('courier_id', req.params.id)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.get("/api/courier/:id/stats", async (req, res) => {
    // Apenas comissões não pagas
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('delivery_fee')
      .eq('courier_id', req.params.id)
      .eq('status', 'delivered')
      .eq('commission_paid', false);

    if (ordersError) return res.status(500).json({ error: ordersError.message });

    // Vales não compensados (settled = false)
    const { data: advances, error: advancesError } = await supabase
      .from('expenses')
      .select('amount')
      .eq('courier_id', req.params.id)
      .eq('settled', false);

    if (advancesError) return res.status(500).json({ error: advancesError.message });

    const totalCommissions = orders.reduce((sum, o) => sum + (Number(o.delivery_fee) || 0), 0);
    const totalAdvances = advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const totalDeliveries = orders.length;

    res.json({
      total_commissions: totalCommissions,
      total_advances: totalAdvances,
      net_pay: totalCommissions - totalAdvances,
      total_deliveries: totalDeliveries
    });
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
      .single();

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
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

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
