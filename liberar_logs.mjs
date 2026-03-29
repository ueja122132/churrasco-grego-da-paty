import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
    host: 'db.wzpriuuxrnbjkkoiskvw.supabase.co',
    port: 5432,
    user: 'postgres',
    password: 'V2jZcOUe4I945WLx',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

client.connect().then(() => {
    console.log('CONECTADO AO SUPABASE! ⚡');
    client.query(`
        ALTER TABLE public.saas_logs DISABLE ROW LEVEL SECURITY;
        GRANT ALL ON TABLE public.saas_logs TO authenticated;
        GRANT ALL ON TABLE public.saas_logs TO service_role;
        GRANT ALL ON TABLE public.saas_logs TO anon;
    `).then(() => {
        console.log('LOGS LIBERADOS COM SUCESSO! 🏆✅');
        process.exit(0);
    }).catch(e => {
        console.error(e);
        process.exit(1);
    });
}).catch(e => {
    console.error(e);
    process.exit(1);
});
