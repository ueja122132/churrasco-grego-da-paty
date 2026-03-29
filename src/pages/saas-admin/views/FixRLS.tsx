import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import { ShieldAlert, CheckCircle2, RotateCw } from 'lucide-react';

export const FixRLSView: React.FC<{ user?: any }> = ({ user }) => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleFix = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fix-rls', { 
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + (localStorage.getItem('supabase.auth.token') || ''),
          'x-super-admin-id': user?.id || ''
        }
      });
      const data = await res.json();
      setStatus(data);
    } catch (err: any) {
      setStatus({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10 space-y-6">
      <div className="bg-amber-50 border-2 border-amber-200 p-8 rounded-[2rem] shadow-xl">
        <h2 className="text-2xl font-black uppercase italic italic flex items-center gap-3 text-amber-900 italic tracking-tighter italic">
          <ShieldAlert size={32} />
          Ferramenta de Restauração de Logs
        </h2>
        <p className="text-amber-700 font-bold text-sm mt-4 font-mono leading-relaxed italic italic">
          Esta ferramenta forçará a liberação da tabela <code className="bg-amber-200 px-1.5 rounded">saas_logs</code> diretamente pela conexão do servidor local. ⚡🚀
        </p>

        <button 
          onClick={handleFix}
          disabled={loading}
          className="mt-8 bg-amber-900 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-black transition-all flex items-center gap-3 disabled:opacity-50"
        >
          {loading ? <RotateCw className="animate-spin" /> : <CheckCircle2 size={24} />}
          Executar Reparo de RLS (Final)
        </button>

        {status && (
          <div className={status.error ? "mt-6 bg-red-100 p-4 rounded-xl border border-red-200" : "mt-6 bg-emerald-100 p-4 rounded-xl border border-emerald-200"}>
            <pre className="text-[10px] font-mono whitespace-pre-wrap">{JSON.stringify(status, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
