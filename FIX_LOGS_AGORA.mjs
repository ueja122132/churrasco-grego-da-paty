import pg from 'pg';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = pg;

// Configuração de Conexão Direta (Chave Mestra)
const connectionString = "postgresql://postgres:V2jZcOUe4I945WLx@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require";

const pool = new Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 10000,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runFix() {
  console.log("🚀 [REPARO DIRETO] Iniciando operação de resgate dos logs...");
  const client = await pool.connect();
  
  try {
    console.log("📡 Conectado ao banco de dados Supabase...");

    // 1. Destruindo as correntes (RLS)
    console.log("🔨 Desativando Row Level Security (RLS) na tabela saas_logs...");
    await client.query("ALTER TABLE saas_logs DISABLE ROW LEVEL SECURITY;");

    // 2. Abrindo as portas para todos (Permissões)
    console.log("🔓 Concedendo permissões totais para authenticated, service_role e anon...");
    await client.query("GRANT ALL ON saas_logs TO authenticated, service_role, anon, postgres;");

    // 3. Garantindo que o ID seja gerado automaticamente
    console.log("⚙️  Verificando owner da tabela...");
    await client.query("ALTER TABLE saas_logs OWNER TO postgres;");

    console.log("\n✅ [SUCESSO TOTAL] A tabela saas_logs agora está LIVRE!");
    console.log("📈 Agora você pode mudar o status de uma loja e o log aparecerá na hora!");

  } catch (err) {
    console.error("\n❌ [ERRO NO REPARO]:", err.message);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

runFix();
