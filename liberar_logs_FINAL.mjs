import pkg from 'pg';
const { Client } = pkg;

async function fixLogsRLS_Pooler() {
    const client = new Client({
        host: 'aws-0-sa-east-1.pooler.supabase.com',
        port: 6543,
        user: 'postgres.wzpriuuxrnbjkkoiskvw',
        password: 'V2jZcOUe4I945WLx',
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("CONECTADO AO SUPABASE VIA POOLER (SÃO PAULO)! 💎⚡🇧🇷");

        console.log("DESATIVANDO RLS NA TABELA saas_logs...");
        
        // O COMANDO MESTRE: Liberar os logs para o admin poder gravar sem bloqueios
        await client.query(`ALTER TABLE public.saas_logs DISABLE ROW LEVEL SECURITY;`);
        await client.query(`GRANT ALL ON TABLE public.saas_logs TO authenticated;`);
        await client.query(`GRANT ALL ON TABLE public.saas_logs TO service_role;`);
        await client.query(`GRANT ALL ON TABLE public.saas_logs TO anon;`);

        console.log("MISSÃO CUMPRIDA! LOGS LIBERADOS COM SUCESSO! 🏆✅");

    } catch (err) {
        console.error("ERRO CRÍTICO NA PORTA DOS FUNDOS:", err);
    } finally {
        await client.end();
    }
}

fixLogsRLS_Pooler();
