import { useState } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import { Scale, Download, Loader2, FileText } from 'lucide-react';
import { AxiosError } from 'axios';

export default function IntegracaoBalancasPage() {
  const [gerando, setGerando] = useState(false);

  const baixarToledoMgv6 = async () => {
    setGerando(true);
    try {
      const res = await api.get<Blob>('/api/balancas/exportar/toledo', {
        responseType: 'blob',
      });
      const blob = res.data;
      if (blob.type.includes('application/json')) {
        const texto = await blob.text();
        try {
          const j = JSON.parse(texto) as { error?: string };
          alert(j.error || 'Não foi possível gerar o arquivo.');
        } catch {
          alert('Não foi possível gerar o arquivo.');
        }
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ITENSMGV.TXT';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const ax = err as AxiosError<{ error?: string }>;
      if (ax.response?.data instanceof Blob) {
        try {
          const t = await ax.response.data.text();
          const j = JSON.parse(t) as { error?: string };
          alert(j.error || 'Erro ao exportar.');
        } catch {
          alert('Erro ao exportar.');
        }
      } else {
        alert(ax.response?.data?.error || 'Erro ao exportar.');
      }
    } finally {
      setGerando(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <Scale className="w-8 h-8 text-cyan-400" />
            Integração — Balanças
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Gere arquivos de carga para balanças de retaguarda com preços da{' '}
            <strong className="text-slate-300">tabela de preços padrão</strong> da loja.
          </p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#08101f]/90 backdrop-blur-xl shadow-[0_25px_60px_rgba(0,0,0,0.35)] p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/25">
              <FileText className="w-8 h-8 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Toledo MGV6</h2>
              <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                Arquivo posicional <span className="font-mono text-cyan-200/90">ITENSMGV.TXT</span> com
                produtos marcados como <strong className="text-slate-300">pesáveis</strong>, código na balança e
                item cadastrado na lista padrão.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={gerando}
            onClick={() => void baixarToledoMgv6()}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-base py-5 px-6 shadow-[0_0_30px_rgba(6,182,212,0.25)] transition-all"
          >
            {gerando ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Download className="w-6 h-6" />
            )}
            Gerar arquivo de carga (ITENSMGV.TXT)
          </button>

          <p className="text-[11px] text-slate-500 mt-5 text-center">
            Configure produtos em <strong className="text-slate-400">Cadastros → Produtos</strong> (pesável, código e
            validade) e mantenha preços na tabela padrão em <strong className="text-slate-400">Listas de preços</strong>.
          </p>
        </div>
      </div>
    </Layout>
  );
}
