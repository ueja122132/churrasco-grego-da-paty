# 🚀 AP Delivery - SaaS "Churrasco Grego da Paty"

Bem-vindo à documentação oficial do **AP Delivery**, um ecossistema SaaS completo projetado para revolucionar a gestão de deliveries, com foco em escalabilidade, design premium e inteligência financeira.

---

## 📌 1. Visão Geral do Ecossistema

O **AP Delivery** não é apenas um sistema de pedidos, é uma plataforma **Multi-tenant** (várias lojas em um só sistema) que oferece controle total tanto para o dono da plataforma (Super Admin) quanto para os lojistas parceiros.

### Módulos Integrados:
- **🏠 Menu Digital (Público)**: Interface ultra-veloz para clientes realizarem pedidos via WhatsApp ou Web.
- **💼 Dashboard do Lojista**: Central de comando para gerenciar produtos, estoque, finanças e cozinha.
- **🛸 Módulo de Logística**: Gestão de entregadores em tempo real, com cálculo de taxas e vales.
- **👑 Painel Super Admin**: O "cérebro" do SaaS. Onde se gerencia as lojas, planos de assinatura, isenções VIP e auditoria global.
- **📊 Dashboard de BI (Raio-X)**: Visibilidade total de métricas por loja.
- **🛰️ Geolocalização de Entrega (GPS)**:
    - Captura automática de coordenadas (Latitude/Longitude) no perfil.
    - **Pré-visualização de Mapa Estático**: Exibição em tempo real do ponto de entrega no perfil para confirmação visual rápida.
    - **Limpeza Inteligente de Endereço**: Algoritmo que remove dados técnicos redundantes, exibindo apenas o essencial (Rua, Bairro, Cidade e UF).
    - Mapa interativo gratuito (Leaflet) para ajuste de endereço.
    - Validação obrigatória no checkout para garantir rotas precisas.

---

## 🛠️ 2. Stack Tecnológica

Optamos pelas tecnologias mais modernas do mercado para garantir estabilidade e performance:

- **Frontend**: React 18 + Vite (Velocidade de carregamento instantânea).
- **Styling**: Tailwind CSS + Framer Motion (Design premium com micro-animações).
- **Backend/API**: Node.js com TypeScript (Express).
- **Banco de Dados**: Supabase (PostgreSQL) com RLS (Segurança de isolamento de dados por loja).
- **Pagamentos**: Integração nativa com Mercado Pago (PIX Dinâmico).
- **Real-time**: Socket.io para atualizações de pedidos sem precisar dar refresh na página.

---

## 🏗️ 3. Arquitetura Multi-Tenant

O sistema utiliza arquitetura de isolamento por `org_id`. Cada loja possui seu próprio subdomínio ou slug (ex: `loja.apdelivery.com.br`), e os dados são protegidos por **Row Level Security (RLS)** no banco de dados, garantindo que uma loja nunca veja os dados de outra.

---

## 👑 4. Painel Super Admin (SaaS Control)

O Super Admin (Ajeu) possui ferramentas exclusivas para escalar o negócio:

### 💳 Gestão de Faturamento
- **Planos Dinâmicos**: Criação e edição de planos (Basic, Pro, Premium).
- **Ativação Automática**: O sistema processa o PIX do lojista e ativa a loja imediatamente após o pagamento.
- **Upgrade/Downgrade**: Lógica inteligente de transição de planos configurada no servidor.

### 🎁 Sistema de Isenção (Passe Livre)
- Capacidade de marcar lojas parceiras como **VIP/ISENTO**, removendo todas as travas de cobrança e limites do sistema.

### 📊 Raio-X Estratégico (BI)
- Visão consolidada de todas as lojas:
    - **Faturamento Histórico**.
    - **Total de Clientes** (Base de dados).
    - **Desempenho Diário**: Pedidos e Despesas de hoje vs mês.

---

## 🍱 5. Funcionalidades para o Lojista

Cada lojista recebe um kit completo de ferramentas:
- **Financeiro**: Fluxo de caixa, gráficos de vendas e gestão de despesas.
- **Cozinha**: Painel KDS (Kitchen Display System) para produção de pedidos.
- **Promoções**: Sistema de preço promocional e categorias customizadas.
- **Fidelização**: Base de clientes com histórico de compras e comportamento.

---

## 🔒 6. Segurança e Auditoria

- **SaaS Logs**: Todo evento crítico (novo pagamento, mudança de plano, erro no webhook) é registrado no banco de dados para auditoria.
- **supabaseAdmin**: Operações sensíveis de faturamento são executadas via Service Role para garantir integridade.

---

## 🚀 7. Guia de Deploy e Manutenção

- **Servidor**: O arquivo principal é o `server.ts`, que gerencia as rotas da API e as comunicações em tempo real.
- **Build**: Comando `npm run build` gera a versão otimizada para produção.
- **Variáveis de Ambiente**: O arquivo `.env` centraliza as chaves do Supabase e tokens do Mercado Pago.

---

> [!TIP]
> **Dica**: A documentação deve ser atualizada sempre que uma nova rota de API ou módulo visual for adicionado.

**Desenvolvido com foco na excelência por Antigravity para Ajeu PATY.** 🍖🚀💎🕵️‍♂️
