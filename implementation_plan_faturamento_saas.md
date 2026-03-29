# Conexão de Faturamento: Lojas ↔ SaaS Master

Este plano visa tornar funcional o sistema de cobrança recorrente das lojas (tenants), integrando a escolha de planos do frontend com o banco de dados e o gateway de pagamento (Mercado Pago) do SaaS.

## User Review Required

> [!IMPORTANT]
> **ATIVAÇÃO AUTOMÁTICA (Webhook)**: O sistema será configurado com uma rota de Webhook para o Mercado Pago. Assim que o PIX for detectado, o status da loja mudará para `active` e a data de vencimento será renovada por +30 dias automaticamente.

> [!WARNING]
> **REGRAS DE MUDANÇA DE PLANO**:
> 1. **Upgrade (Mais Caro)**: O cliente paga o valor integral do novo plano. O tempo restante do plano anterior é descartado. O novo plano entra em vigor imediatamente após o pagamento.
> 2. **Downgrade/Mesmo Valor**: O cliente mantém o acesso e as regras do plano atual até o vencimento. O novo plano entra em vigor na próxima renovação (ou conforme sua solicitação de "não perder").

## Proposed Changes

---

### [Component] Backend (API SaaS)

#### [MODIFY] [server.ts](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/server.ts)
- Implementar a rota `GET /api/saas/plans` para servir os planos reais do banco para as lojas.
- Implementar a rota `PATCH /api/organizations/:id/plan` para permitir a mudança de plano pelo lojista.
- Implementar a rota `POST /api/organizations/:id/billing/pix` que:
  1. Identifica o plano atual/selecionado da organização.
  2. Cria uma preferência de pagamento de "Mensalidade SaaS" no Mercado Pago.
  3. Retorna os dados do QR Code PIX para o frontend.

---

### [Component] Frontend (Painel Administrativo da Loja)

#### [MODIFY] [AdminPage.tsx](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/src/pages/AdminPage.tsx)
- Garantir que `fetchData` carregue os planos via API.
- Corrigir a função `generateSaasPix` para exibir o QR Code e a chave "Copia e Cola".
- Atualizar a interface da aba "Faturamento" para refletir o status real vindo da `org`.

---

### [Component] Frontend (Painel Super Admin)

#### [MODIFY] [Plans.tsx](file:///c:/Users/AJEU_PATY/Desktop/churrasco-grego-da-paty/src/pages/saas-admin/views/Plans.tsx)
- Garantir que a criação e edição de planos reflita imediatamente na tabela `saas_plans`.

---

## Open Questions

- **Configuração do Webhook no MP**: Para o Webhook funcionar em ambiente local (localhost), precisaremos usar o `ngrok` ou similar. Você tem acesso para configurar a URL de Webhook no painel do Mercado Pago?

## Verification Plan

### Automated Tests
- Verificar `fetch('/api/saas/plans')` no console do navegador.
- Logar como Admin de uma loja e tentar gerar o PIX de mensalidade.

### Manual Verification
- Ajeu (Super Admin) acessa `/saas`, altera o preço de um plano, e verifica se o novo preço aparece na aba de faturamento de uma loja teste.
