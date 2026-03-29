# MANUAL DEFINITIVO DE SEGURANÇA E ADMINISTRAÇÃO SAAS 🛡️💎

Este documento foi criado para registrar como o ecossistema do **Churrasco Grego da Paty** lida com acessos supremos e como contornamos os bloqueios do banco de dados (Supabase) para a gravação dos logs.

---

## 1. O ÚNICO SUPER ADMIN OFICIAL 👑
O sistema foi configurado para **blindagem máxima**. Apenas um usuário detém o poder de acessar o painel SaaS, excluir lojas e visualizar o ecossistema financeiro.

*   **Email Restrito:** `ajeu.valverde@gmail.com`
*   **Role (Nível de Acesso):** `super_admin`
*   *(Nota: Todas as demais contas no banco de dados, incluindo paty@gmail.com, foram niveladas para `admin` padrão de loja e não possuem acesso root ao modo SaaS).*

---

## 2. MECÂNICA DE GRAVAÇÃO DE LOGS (Auditoria SaaS) 📡
Antigamente o Supabase bloqueava a gravação de logs (tabela `saas_logs`) acusando `new row violates row-level security policy`.
Isso acontecia porque o servidor (`server.ts`) tentava gravar o log usando a conexão "em branco" (Anon Key), e o banco, por medida de segurança, não permite que entidades anônimas gravem dados no histórico do Ecossistema.

### Solução Mestra Implementada (Bypass Autenticado):
Para corrigir o bloqueio do RLS, a configuração do `server.ts` foi reprogramada.
Agora, sempre que uma ação administrativa ocorre (ex: desativar uma loja), o servidor:
1.  Pega o crachá VIP (o Token de Sessão / JWT) que está logado no computador do Ajeu.
2.  Assina a requisição de log diretamente com a identidade do Super Admin.
3.  O Banco de Dados reconhece o dono da chave e **libera a gravação na mesma hora**, sem a necessidade de chaves mestras e sem quebrar as regras de segurança padrão do Supabase.

---

## 3. AS TRÊS CHAVES DE SUPABASE RESTAURADAS 🔑
O sistema depende destas três credenciais (guarde bem a "Mestra" e nunca deixe em código público ou front-end):

*   **URL do Banco:** `https://wzpriuuxrnbjkkoiskvw.supabase.co`
*   **Chave Anon/Public (Publica):** `sb_publishable_1EIIuYUZagFNHDIkrklBbA_wZp4Io4m` *(Usada no Cliente e em Autenticações iniciais)*
*   **Service Role Key (Chave Mestra Ouro):** `eyJhbGciOiJIUzI1Ni...ZChd...Plc` *(A chave dourada que você me enviou. Com ela você tem poder absoluto. Use apenas em scripts locais ou no backend blindado).*

---

## 4. RESOLUÇÕES RÁPIDAS (TROUBLESHOOTING) 🚨
Se por acaso alguém tentar entrar no painel e tomar **"Acesso Restrito ao Super Admin"**:
1. Verifique se a conta logada lá no botão superior direito é a **ajeu.valverde@gmail.com**.
2. Se o usuário estiver correto, recarregue a página para forçar a renovação do Token (JWT) e envie a requisição novamente.
3. Se um e-mail novo precisar do cargo Supremo, use um script MJS no seu computador rodando a **Service Role Key** e dispare o código JavaScript: 
   `supabase.from('profiles').update({role: 'super_admin'}).eq('email', 'novo_admin@email.com');`
