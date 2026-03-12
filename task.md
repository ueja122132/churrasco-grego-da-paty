# Security Audit Checklist

- [x] Search and read `api-security-best-practices` skill <!-- id: 0 -->
- [x] Analyze [server.ts](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/server.ts) for security vulnerabilities <!-- id: 1 -->
    - [x] Authentication check <!-- id: 2 -->
    - [x] Input validation check <!-- id: 3 -->
    - [x] Security headers check <!-- id: 4 -->
- [x] Review environment variables and sensitive data handling <!-- id: 5 -->
- [x] Propose fixes for identified vulnerabilities <!-- id: 6 -->
- [x] Implement and verify security improvements <!-- id: 7 -->
- [x] Perform second deep audit (CORS, Raw SQL, Error Saneament) <!-- id: 8 -->
- [x] Review and fix advanced vulnerabilities <!-- id: 9 -->
- [x] Database Security Audit (Supabase Advisors & RLS) <!-- id: 10 -->
- [x] Implement database security fixes <!-- id: 11 -->

# Super Admin Isolation Phase

- [x] Phase 4: Super Admin Isolation
    - [x] Plan isolation of Super Admin from TenantProvider
    - [x] Implement Platform Mode in AppInner
    - [x] Decouple branding and navbar for Super Admin
    - [x] Verify neutral branding and access control
- [x] Phase 4.1: Fix Super Admin Data & Security
    - [x] Investigate missing organization list cause
    - [x] Add Authorization headers in frontend
    - [x] Secure unprotected admin routes in backend
    - [x] Verify data population and security guards

# Domain Provisioning (White Label)

- [ ] Phase 5: Domain Provisioning
    - [x] Add `custom_domain_status` column to `organizations` table
    - [x] Create domain verification route `POST /api/organizations/:id/verify-domain` in [server.ts](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/server.ts)
    - [x] Build domain config UI for tenants in [App.tsx](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/src/App.tsx) (SaaSAdminPage)
    - [x] Add DNS instructions and status badges in UI
    - [x] Verify automatic tenant routing with custom domains

# Database Isolation & Automation (Phase 6)

- [ ] Phase 6: RLS Isolation & Cron
    - [x] Install `node-cron` package
    - [x] Add daily billing suspension cron job in [server.ts](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/server.ts)
    - [x] Create SQL migration for strict RLS on `products` and `extra_ingredients`
    - [x] Create SQL migration for strict RLS on `orders` and `organizations`
    - [x] Apply RLS migrations to Supabase
    - [x] Verify cross-tenant data isolation via direct API calls

# Super Admin Upgrades (Phase 7)

- [x] Phase 7: Organization Plan & Time Metadata + Deletion
    - [x] Add `plan` and `created_at` badges to Super Admin Organization Cards
    - [x] Create a helper to calculate "time active" (e.g., "Há 2 meses")
    - [x] Ensure backend `/api/admin/organizations` is returning these fields
    - [x] Add a secure "Deletar Loja" button and backend functionality for Super Admins

# Mini-Dashboard por Loja (Phase 8)

- [x] Phase 8: Store Metrics Dashboard
    - [x] Update `GET /api/organizations` endpoint to calculate and attach `metrics` for each store
    - [x] Add a visual mini-dashboard section to each store card in [App.tsx](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/src/App.tsx)
    - [x] Show total clients, total revenue, and monthly orders with proper formatting

# Dashboard do Entregador (Phase 9)

- [x] Phase 9: Courier Metrics & Dashboard
    - [x] Create and run SQL migration to add `shipped_at` and `delivered_at` columns to the `orders` table
    - [x] Update `PATCH /api/orders/:id/status` in [server.ts](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/server.ts) to set delivery timestamps
    - [x] Update `GET /api/courier/:id/stats` in [server.ts](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/server.ts) to return monthly delivery count and average delivery time
    - [x] Update Courier UI in [App.tsx](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/src/App.tsx) ([SaaSAdminPage](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/src/App.tsx#7756-7762)) to show the new metrics block

- [x] Phase 10: Client Metrics & Dashboard <!-- id: 12 -->
    - [x] Create `GET /api/saas/clients` endpoint in [server.ts](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/server.ts) to fetch and aggregate client data from orders table <!-- id: 13 -->
    - [x] Add the Client Dashboard UI in [App.tsx](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/src/App.tsx) ([SaaSAdminPage](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/src/App.tsx#7756-7762)) under a new 'Clientes' tab <!-- id: 14 -->
    - [x] Verify the UI rendering and data calculations <!-- id: 15 -->
    - [x] Fix: Include registered users without orders in the Clients Dashboard <!-- id: 16 -->
    - [x] Verify fix by creating a user and checking the dashboard <!-- id: 17 -->

- [x] Phase 11: User Data Remediation & Tenant Fixes <!-- id: 18 -->
    - [x] Add `/:slug/login` and `/:slug/register` routes in [App.tsx](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/src/App.tsx) <!-- id: 19 -->
    - [x] Update [TenantProvider](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/src/App.tsx#672-816) to support slug detection on login/register <!-- id: 20 -->
    - [x] Create data migration script to link 18 orphaned users to `paty-churrasco` <!-- id: 21 -->
    - [x] Verify fix by creating a user via `/paty-churrasco/register` and checking the dashboard <!-- id: 22 -->


# Store Landing & Login Modal

- [x] Phase 12: Store Landing Component & Routing
    - [x] Created StoreLanding component (Reverted and used SalesPage directly)
    - [x] Updated routes to use StoreLanding at /:slug (Enabled public access instead)
    - [x] Created LoginModal component (Added inline modal in SalesPage)
    - [x] Added modal state and login prompt on addToCart
    - [x] Verified correct rendering of menu and modal for unauthenticated users
    - [x] Fixed "new row violates row-level security policy for table 'orders'" bug by having user manually apply permissive insert policy.
    - [x] Re-added user name to welcome greeting and customized footer on SalesPage
    - [x] Added backend polling auto-close for PIX QR code on Sales and Delivery pages.

# SaaS Billing UI for Store Admins

- [x] Phase 13: SaaS Plan Billing Interface in Admin Dashboard
    - [x] Create a new "Plano e Faturamento" tab in the [AdminPage](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/src/App.tsx#2873-4321) (Store Admin Dashboard).
    - [x] Fetch and display the current SaaS plan (Trial, Basic, Premium) and next billing date.
    - [x] Display a PIX QR Code for payment when approaching the due date.
    - [x] Add visual prompt encouraging an upgrade if the user is not on the highest plan.

# SaaS Plan Selection

- [x] Phase 14: Dynamic SaaS Plan Selection
    - [x] Create plan options (Starter, Pro, Premium) and update UI to card layout.
    - [x] Implement selection logic and `PATCH /api/organizations/:id/plan` backend endpoint to save preference.
    - [x] Ensure billing logic respects the rule: newly selected plan only takes effect after paying current month's active plan.
# SaaS Signup Fix (Data Loss Resolution)

- [x] Phase 15: Fix SaaS Signup Data Integrity
    - [x] Investigate cause of missing data in `saas_subscriptions` and `saas_payments` <!-- id: 23 -->
    - [x] Create SQL migration to add RLS policies for SaaS tables <!-- id: 24 -->
    - [x] Update [server.ts](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/server.ts) to improve insert error handling and consistency <!-- id: 25 -->
    - [x] Verify fix by performing a test signup via the Sales Page <!-- id: 26 -->

# SaaS Flow Consolidation

- [x] Phase 16: Consolidate SaaS Signup flows
# Security Audit Checklist

- [x] Search and read `api-security-best-practices` skill <!-- id: 0 -->
- [x] Analyze [server.ts](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/server.ts) for security vulnerabilities <!-- id: 1 -->
    - [x] Authentication check <!-- id: 2 -->
    - [x] Input validation check <!-- id: 3 -->
    - [x] Security headers check <!-- id: 4 -->
- [x] Review environment variables and sensitive data handling <!-- id: 5 -->
- [x] Propose fixes for identified vulnerabilities <!-- id: 6 -->
- [x] Implement and verify security improvements <!-- id: 7 -->
- [x] Perform second deep audit (CORS, Raw SQL, Error Saneament) <!-- id: 8 -->
- [x] Review and fix advanced vulnerabilities <!-- id: 9 -->
- [x] Database Security Audit (Supabase Advisors & RLS) <!-- id: 10 -->
- [x] Implement database security fixes <!-- id: 11 -->

# Super Admin Isolation Phase

- [x] Phase 4: Super Admin Isolation
    - [x] Plan isolation of Super Admin from TenantProvider
    - [x] Implement Platform Mode in AppInner
    - [x] Decouple branding and navbar for Super Admin
    - [x] Verify neutral branding and access control
- [x] Phase 4.1: Fix Super Admin Data & Security
    - [x] Investigate missing organization list cause
    - [x] Add Authorization headers in frontend
    - [x] Secure unprotected admin routes in backend
    - [x] Verify data population and security guards

# Domain Provisioning (White Label)

- [ ] Phase 5: Domain Provisioning
    - [x] Add `custom_domain_status` column to `organizations` table
    - [x] Create domain verification route `POST /api/organizations/:id/verify-domain` in [server.ts](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/server.ts)
    - [x] Build domain config UI for tenants in [App.tsx](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/src/App.tsx) (SaaSAdminPage)
    - [x] Add DNS instructions and status badges in UI
    - [x] Verify automatic tenant routing with custom domains

# Database Isolation & Automation (Phase 6)

- [ ] Phase 6: RLS Isolation & Cron
    - [x] Install `node-cron` package
    - [x] Add daily billing suspension cron job in [server.ts](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/server.ts)
    - [x] Create SQL migration for strict RLS on `products` and `extra_ingredients`
    - [x] Create SQL migration for strict RLS on `orders` and `organizations`
    - [x] Apply RLS migrations to Supabase
    - [x] Verify cross-tenant data isolation via direct API calls

# Super Admin Upgrades (Phase 7)

- [x] Phase 7: Organization Plan & Time Metadata + Deletion
    - [x] Add `plan` and `created_at` badges to Super Admin Organization Cards
    - [x] Create a helper to calculate "time active" (e.g., "Há 2 meses")
    - [x] Ensure backend `/api/admin/organizations` is returning these fields
    - [x] Add a secure "Deletar Loja" button and backend functionality for Super Admins

# Mini-Dashboard por Loja (Phase 8)

- [x] Phase 8: Store Metrics Dashboard
    - [x] Update `GET /api/organizations` endpoint to calculate and attach `metrics` for each store
    - [x] Add a visual mini-dashboard section to each store card in [App.tsx](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/src/App.tsx)
    - [x] Show total clients, total revenue, and monthly orders with proper formatting

# Dashboard do Entregador (Phase 9)

- [x] Phase 9: Courier Metrics & Dashboard
    - [x] Create and run SQL migration to add `shipped_at` and `delivered_at` columns to the `orders` table
    - [x] Update `PATCH /api/orders/:id/status` in [server.ts](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/server.ts) to set delivery timestamps
    - [x] Update `GET /api/courier/:id/stats` in [server.ts](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/server.ts) to return monthly delivery count and average delivery time
    - [x] Update Courier UI in [App.tsx](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/src/App.tsx) ([SaaSAdminPage](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/src/App.tsx#7756-7762)) to show the new metrics block

- [x] Phase 10: Client Metrics & Dashboard <!-- id: 12 -->
    - [x] Create `GET /api/saas/clients` endpoint in [server.ts](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/server.ts) to fetch and aggregate client data from orders table <!-- id: 13 -->
    - [x] Add the Client Dashboard UI in [App.tsx](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/src/App.tsx) ([SaaSAdminPage](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/src/App.tsx#7756-7762)) under a new 'Clientes' tab <!-- id: 14 -->
    - [x] Verify the UI rendering and data calculations <!-- id: 15 -->
    - [x] Fix: Include registered users without orders in the Clients Dashboard <!-- id: 16 -->
    - [x] Verify fix by creating a user and checking the dashboard <!-- id: 17 -->

- [x] Phase 11: User Data Remediation & Tenant Fixes <!-- id: 18 -->
    - [x] Add `/:slug/login` and `/:slug/register` routes in [App.tsx](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/src/App.tsx) <!-- id: 19 -->
    - [x] Update [TenantProvider](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/src/App.tsx#672-816) to support slug detection on login/register <!-- id: 20 -->
    - [x] Create data migration script to link 18 orphaned users to `paty-churrasco` <!-- id: 21 -->
    - [x] Verify fix by creating a user via `/paty-churrasco/register` and checking the dashboard <!-- id: 22 -->


# Store Landing & Login Modal

- [x] Phase 12: Store Landing Component & Routing
    - [x] Created StoreLanding component (Reverted and used SalesPage directly)
    - [x] Updated routes to use StoreLanding at /:slug (Enabled public access instead)
    - [x] Created LoginModal component (Added inline modal in SalesPage)
    - [x] Added modal state and login prompt on addToCart
    - [x] Verified correct rendering of menu and modal for unauthenticated users
    - [x] Fixed "new row violates row-level security policy for table 'orders'" bug by having user manually apply permissive insert policy.
    - [x] Re-added user name to welcome greeting and customized footer on SalesPage
    - [x] Added backend polling auto-close for PIX QR code on Sales and Delivery pages.

# SaaS Billing UI for Store Admins

- [x] Phase 13: SaaS Plan Billing Interface in Admin Dashboard
    - [x] Create a new "Plano e Faturamento" tab in the [AdminPage](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/src/App.tsx#2873-4321) (Store Admin Dashboard).
    - [x] Fetch and display the current SaaS plan (Trial, Basic, Premium) and next billing date.
    - [x] Display a PIX QR Code for payment when approaching the due date.
    - [x] Add visual prompt encouraging an upgrade if the user is not on the highest plan.

# SaaS Plan Selection

- [x] Phase 14: Dynamic SaaS Plan Selection
    - [x] Create plan options (Starter, Pro, Premium) and update UI to card layout.
    - [x] Implement selection logic and `PATCH /api/organizations/:id/plan` backend endpoint to save preference.
    - [x] Ensure billing logic respects the rule: newly selected plan only takes effect after paying current month's active plan.
# SaaS Signup Fix (Data Loss Resolution)

- [x] Phase 15: Fix SaaS Signup Data Integrity
    - [x] Investigate cause of missing data in `saas_subscriptions` and `saas_payments` <!-- id: 23 -->
    - [x] Create SQL migration to add RLS policies for SaaS tables <!-- id: 24 -->
    - [x] Update [server.ts](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/server.ts) to improve insert error handling and consistency <!-- id: 25 -->
    - [x] Verify fix by performing a test signup via the Sales Page <!-- id: 26 -->

# SaaS Flow Consolidation

- [x] Phase 16: Consolidate SaaS Signup flows
    - [x] Redirect `/venda/cadastro` to `/assinar` <!-- id: 27 -->
    - [x] Update landing page buttons to point to `/assinar` <!-- id: 28 -->
    - [x] Align plan names and prices across the landing page and subscription page <!-- id: 29 -->
- [x] Align plan names and prices across the landing page and subscription page <!-- id: 29 -->
- [x] Update plan labels in Super Admin to new scheme (Básico, Profissional, Enterprise) <!-- id: 30 -->

# SaaS Analytics Dashboard

- [x] Phase 17: Super Admin SaaS Metrics
    - [x] Create generic API endpoint for SaaS metrics in [server.ts](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/server.ts)
    - [x] Calculate MRR based on active subscriptions
    - [x] Build visual component in [App.tsx](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/src/App.tsx) (SuperAdminPage)
    - [x] Display MRR, Active Lojas, and Churn estimation
