<div align="center">
<img width="1200" height="400" alt="Banner do Sistema" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 🍖 Churrasco Grego da Paty (SaaS)
### O Ecossistema Delivery mais Robusto e Premium do Sertão

[![Status](https://img.shields.io/badge/Status-Produção-emerald.svg?style=for-the-badge)]()
[![Tech](https://img.shields.io/badge/Stack-React_%7C_Node_%7C_Supabase-blue.svg?style=for-the-badge)]()

</div>

---

## 🌟 Diferenciais Premium

Este projeto foi desenvolvido com foco em **experiência do usuário (UX)** e **solidez administrativa**:

- **📍 GPS de Precisão**: Sistema de captura de localização com pré-visualização de mapa estático no perfil do cliente. O entregador recebe o ponto exato no Google Maps.
- **🛡️ Multi-Tenant Real**: Isolamento total de dados via RLS (PostgreSQL), permitindo múltiplas lojas em um único servidor com total segurança.
- **💳 Checkout Fluido**: Transições suaves entre seleção de ingredientes, login e pagamento via PIX Dinâmico.
- **📊 Inteligência de Negócio**: Dashboard completo para lojistas e painel Super Admin para controle global da plataforma.

## 🚀 Como Rodar Localmente

### Pré-requisitos
- **Node.js** (v18+)
- Conta no **Supabase**

### Instalação
1. Clone o repositório.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure as variáveis de ambiente em um arquivo `.env`:
   - `GEMINI_API_KEY`: Sua chave Gemini.
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`: Credenciais do projeto.
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## 🛠️ Manutenção

A documentação detalhada das rotas e processos administrativos pode ser encontrada em:
- [Guia Administrativo SaaS](SAAS_ADMIN_GUIDE.md)
- [Documentação Técnica Completa](DOCUMENTACAO_SaaS.md)

---
**Desenvolvido para Ajeu Valverde - 2026**
