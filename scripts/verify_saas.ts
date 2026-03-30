import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function verify() {
  console.log("--- TESTE DE CONEXÃO SAAS ADMIN ---");
  console.log("URL:", supabaseUrl);
  console.log("Key (primeiros 10 chars):", supabaseServiceKey?.substring(0, 10));

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("ERRO: URL ou Service Key faltando no ambiente!");
    process.exit(1);
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  console.log("\n1. Testando leitura de Organizations (Bypass RLS)...");
  const { data: orgs, error: orgError } = await supabaseAdmin.from('organizations').select('id, name').limit(1);

  if (orgError) {
    console.error("ERRO ao ler tabelas:", orgError.message);
  } else {
    console.log("SUCESSO! Organizacoes encontradas:", orgs.length);
    if (orgs.length > 0) console.log("Primeira org:", orgs[0].name);
  }

  console.log("\n2. Testando Logs do SaaS...");
  const { data: logs, error: logError } = await supabaseAdmin.from('saas_logs').select('id').limit(1);
  if (logError) {
    console.error("ERRO ao ler logs:", logError.message);
  } else {
    console.log("SUCESSO! Conseguiu ler a tabela de logs.");
  }

  console.log("\n--- FIM DO TESTE ---");
}

verify();
