import { supabase } from "../../../supabase";

export interface SaaSMetrics {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  newSignups: number; // For the selected period
  mrr: number; // Volume in the selected period
  arr: number; 
  churnRate: number;
  revenueHistory: { name: string, value: number }[];
  growthHistory: { name: string, stores: number }[];
}

export const adminService = {
  // Get main dashboard metrics and chart data with filters
  async getMetrics(period: string = '30 dias'): Promise<SaaSMetrics> {
    try {
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('status, plan, created_at');

      if (orgsError) {
        console.error("[ADMIN_SERVICE] Erro RLS em Organizations:", orgsError);
        // Fallback para evitar quebra total se o RLS estiver bloqueando a leitura direta
      }

      const safeOrgs = orgs || [];
      const total = safeOrgs.length;
      const active = safeOrgs.filter(o => o.status === 'active').length;
      const suspended = safeOrgs.filter(o => o.status !== 'active').length;
      
      const now = new Date();
      const startDate = new Date();
      
      if (period === 'Hoje') {
        startDate.setHours(0,0,0,0);
      } else if (period === '7 dias') {
        startDate.setDate(now.getDate() - 7);
      } else if (period === '12 meses') {
        startDate.setFullYear(now.getFullYear() - 1);
      } else {
        startDate.setDate(now.getDate() - 30);
      }

      const newSignups = safeOrgs.filter(o => new Date(o.created_at) >= startDate).length;

      // 1. Fetch relevant payments
      const { data: allPayments, error: payError } = await supabase
        .from('saas_payments')
        .select('amount, paid_at');

      if (payError) console.error("[ADMIN_SERVICE] Erro RLS em Payments:", payError);

      const safePayments = allPayments || [];
      const filteredPayments = safePayments.filter(p => new Date(p.paid_at) >= startDate);
      const mrr = filteredPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const arr = mrr * (period === '12 meses' ? 1 : 12);

      const revenueHistory: { name: string, value: number }[] = [];
      const growthHistory: { name: string, stores: number }[] = [];

      if (period === '12 meses') {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        months.forEach((month, i) => {
          const rev = safePayments.filter(p => new Date(p.paid_at).getMonth() === i).reduce((sum, p) => sum + Number(p.amount || 0), 0);
          const gro = safeOrgs.filter(o => new Date(o.created_at).getMonth() === i).length;
          revenueHistory.push({ name: month, value: rev });
          growthHistory.push({ name: month, stores: gro });
        });
      } else {
        const daysCount = period === '7 dias' ? 7 : period === 'Hoje' ? 1 : 30;
        for (let i = daysCount - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          const dateStr = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
          
          const rev = safePayments.filter(p => {
            const pd = new Date(p.paid_at);
            return pd.getDate() === d.getDate() && pd.getMonth() === d.getMonth();
          }).reduce((sum, p) => sum + Number(p.amount || 0), 0);

          const gro = safeOrgs.filter(o => {
            const od = new Date(o.created_at);
            return od.getDate() === d.getDate() && od.getMonth() === d.getMonth();
          }).length;

          revenueHistory.push({ name: dateStr, value: rev });
          growthHistory.push({ name: dateStr, stores: gro });
        }
      }

      return {
        totalCompanies: total,
        activeCompanies: active,
        suspendedCompanies: suspended,
        newSignups,
        mrr,
        arr,
        churnRate: 1.2,
        revenueHistory,
        growthHistory
      };
    } catch (err) {
      console.error("[ADMIN_SERVICE] Erro crítico em getMetrics:", err);
      return {
        totalCompanies: 0, activeCompanies: 0, suspendedCompanies: 0,
        newSignups: 0, mrr: 0, arr: 0, churnRate: 0,
        revenueHistory: [], growthHistory: []
      };
    }
  },

  // Get all companies with global metrics (Historical sales)
  async getCompanies() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch('/api/saas/companies-with-metrics', { headers });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("[ADMIN_SERVICE] Erro ao buscar empresas:", errData);
        return [];
      }
      return await response.json();
    } catch (err) {
      console.error("[ADMIN_SERVICE] Falha de rede ao buscar empresas:", err);
      return [];
    }
  },

  // Create new company with logging
  async createCompany(companyData: { name: string, slug: string, plan?: string, logoUrl?: string }) {
    const headers = await this.getAuthHeaders();
    const response = await fetch('/api/organizations', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...companyData,
        status: 'active',
        subscription_status: 'trialing',
        billing_status: 'good',
        branding: {
          logoUrl: companyData.logoUrl || null,
          primaryColor: "#4f46e5",
          secondaryColor: "#818cf8"
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Erro ao criar organização");
    }

    const { org } = await response.json();
    return org;
  },

  // Delete company completely with logging
  async deleteCompany(id: string) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`/api/organizations/${id}`, {
      method: 'DELETE',
      headers
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Erro ao excluir organização");
    }

    return await response.json();
  },

  // Helper to get auth headers for API calls
  async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
      headers['x-super-admin-id'] = session.user.id;
    }
    return headers;
  },

  // Update company status via API to trigger logs and security guards
  async updateCompanyStatus(id: string, status: string) {
    console.log("[ADMIN_SERVICE] Preparando chamada de status...", { id, status });
    const headers = await this.getAuthHeaders();
    console.log("[ADMIN_SERVICE] Headers de autenticação:", headers);
    
    const response = await fetch(`/api/organizations/${id}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status })
    });
    
    console.log("[ADMIN_SERVICE] Resposta da API status:", response.status);
    
    if (!response.ok) {
      const err = await response.json();
      console.error("[ADMIN_SERVICE] Erro na resposta:", err);
      throw new Error(err.error || "Erro ao atualizar status");
    }
    
    return await response.json();
  },

  // Update company complete info
  async updateCompany(id: string, updates: { name: string, slug: string, plan: string, logoUrl?: string }) {
    // Primeiro pegamos os dados atuais para não perder o branding (cores, etc)
    const { data: current } = await supabase
      .from('organizations')
      .select('branding')
      .eq('id', id)
      .single();

    const branding = {
      ...(current?.branding || {}),
      logoUrl: updates.logoUrl || current?.branding?.logoUrl || null
    };

    const headers = await this.getAuthHeaders();
    const response = await fetch(`/api/organizations/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ 
        name: updates.name, 
        slug: updates.slug, 
        plan: updates.plan, 
        branding 
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Erro ao atualizar organização");
    }

    const { org } = await response.json();
    return org;
  },

  // Get SaaS plans
  async getPlans() {
    const { data, error } = await supabase
      .from('saas_plans')
      .select('*')
      .order('price', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Update SaaS plan
  async updatePlan(id: string, updates: any) {
    const { data, error } = await supabase
      .from('saas_plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get recent payments
  async getPayments() {
    const { data, error } = await supabase
      .from('saas_payments')
      .select('*, organizations(name)')
      .order('paid_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Action: Suspend companies with overdue payments
  async suspendOverdueCompanies() {
    // Logic: Look for companies that are not active or have specific billing flags
    const { data: overdue, error: fetchError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('billing_status', 'overdue');

    if (fetchError) throw fetchError;

    if (overdue.length === 0) return { message: "Nenhuma empresa inadimplente encontrada.", count: 0 };

    const ids = overdue.map(o => o.id);
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ status: 'suspended' })
      .in('id', ids);

    if (updateError) throw updateError;
    return { message: `${overdue.length} empresas foram suspensas com sucesso.`, count: overdue.length };
  },

  // Action: Generate simple annual summary
  async generateAnnualReport() {
    const { data, error } = await supabase
      .from('saas_payments')
      .select('amount, paid_at')
      .gte('paid_at', new Date(new Date().getFullYear(), 0, 1).toISOString());

    if (error) throw error;

    const total = data.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return {
      year: new Date().getFullYear(),
      totalRevenue: total,
      totalPayments: data.length
    };
  },

  // Get audit logs via Super Backend
  async getLogs() {
    // Agora puxamos direto do núcleo do servidor blindado!
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/saas/logs', {
      headers: { 'Authorization': `Bearer ${session?.access_token}` }
    });
    if (!response.ok) throw new Error('Falha ao buscar logs pelo Super Admin');
    return await response.json();
  },

  // Clear all logs via Super Backend
  async clearLogs() {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/saas/logs', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${session?.access_token}` }
    });
    if (!response.ok) throw new Error('Falha ao limpar logs');
  },

  // Create manual payment record
  async createManualPayment(paymentData: { org_id: string, amount: number, month_ref: string, notes?: string }) {
    const { data, error } = await supabase
      .from('saas_payments')
      .insert([{
        ...paymentData,
        payment_method: 'manual',
        paid_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Toggle billing exemption via API
  async toggleExemption(id: string) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`/api/organizations/${id}/toggle-exemption`, {
      method: 'PATCH',
      headers
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Erro ao alternar isenção");
    }
    
    return await response.json();
  }
};
