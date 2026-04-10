import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { Layout } from '../../components/Layout';
import {
  FileText,
  Upload,
  RefreshCcw,
  Download,
  Database,
  Loader2,
  FileX,
  PackageCheck,
  AlertCircle,
  Sparkles,
  Landmark,
} from 'lucide-react';
import { AxiosError } from 'axios';

// 🛡️ INTERFACES DE TIPAGEM ESTRITA
export interface IFornecedorNota {
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpjCpf?: string;
}

export interface INotaEntrada {
  id: string;
  dataEmissao: string;
  numero: string;
  serie: string;
  valorTotalDocumento: number;
  chaveAcesso: string;
  fornecedor?: IFornecedorNota;
  statusEstoque?: boolean;
  statusContabil?: boolean;
}

export function EntradaNotas() {
  const [notas, setNotas] = useState<INotaEntrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    carregarNotas();
  }, []);

  const carregarNotas = async () => {
    try {
      setLoading(true);
      const response = await api.get<INotaEntrada[]>('/api/nfe/entradas');
      setNotas(response.data);
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('Erro ao carregar notas de entrada', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const sincronizarSefaz = async () => {
    try {
      setSincronizando(true);
      const response = await api.post<{ mensagem?: string }>('/api/nfe/entradas/sincronizar', {});
      alert(`✅ ${response.data.mensagem || 'Sincronização concluída!'}`);
      await carregarNotas();
    } catch (err) {
      const error = err as AxiosError<{ erro?: string }>;
      alert(error.response?.data?.erro || 'Erro ao sincronizar com a SEFAZ.');
    } finally {
      setSincronizando(false);
    }
  };

  const handleUploadXml = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);

      const response = await api.post('/api/nfe/processar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Preview do XML:', response.data);
      alert(
        '✅ XML lido com sucesso! \n\nEm breve: Aqui abriremos a tela para você escolher o CFOP, revisar os produtos e confirmar a Integração Contábil.'
      );
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      alert(error.response?.data?.error || 'Erro ao processar o arquivo XML.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const baixarDocumento = async (chave: string, tipo: 'pdf' | 'xml') => {
    if (!chave) return;

    try {
      const response = await api.get(`/api/nfe/entradas/${chave}/download/${tipo}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `NFe_${chave}.${tipo}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      const error = err as AxiosError<{ erro?: string }>;
      console.error('Erro no download:', error);

      if (error.response && error.response.data instanceof Blob) {
        const erroTexto = await error.response.data.text();
        try {
          const erroJson = JSON.parse(erroTexto) as { erro?: string };
          alert(`❌ ${erroJson.erro || 'Erro interno no arquivo.'}`);
          return;
        } catch {
          console.error('Não foi possível ler o erro do backend.');
        }
      }

      alert(
        `⚠️ A SEFAZ ainda está processando o ${tipo.toUpperCase()} desta nota. Aguarde alguns minutos e tente novamente.`
      );
    }
  };

  const formatarMoeda = (valor: number | string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(valor));
  };

  const formatarCnpj = (cnpj?: string) => {
    if (!cnpj) return '-';
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  return (
    <Layout>
      <div className="mx-auto flex h-full max-w-7xl flex-col space-y-6 pb-12">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute top-0 right-0 h-72 w-72 rounded-full bg-violet-500/10 blur-[120px]" />

          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 shadow-[0_0_20px_rgba(139,92,246,0.12)]">
                <Database className="h-8 w-8 text-violet-300" />
              </div>

              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Fiscal Intelligence
                </div>

                <h1 className="text-3xl font-black text-white">Entrada de Notas</h1>
                <p className="mt-1 font-medium text-slate-400">
                  Monitore compras, importe XMLs e integre com Estoque e Contabilidade.
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
              <input
                type="file"
                accept=".xml"
                ref={fileInputRef}
                onChange={handleUploadXml}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.24)] transition-all hover:scale-[1.02] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
                {uploading ? 'Lendo XML...' : 'Importar XML'}
              </button>

              <button
                onClick={sincronizarSefaz}
                disabled={sincronizando || loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 font-bold text-slate-200 transition-all hover:border-violet-400/20 hover:bg-violet-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sincronizando ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <RefreshCcw className="h-5 w-5" />
                )}
                {sincronizando ? 'Consultando...' : 'Buscar na SEFAZ'}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-black/10 px-5 py-5">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-white">
              <FileText className="h-4 w-4 text-violet-300" />
              Notas de entrada
            </h2>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-violet-300">
              {notas.length} Registros
            </span>
          </div>

          <div className="max-h-[72vh] overflow-y-auto">
            {loading ? (
              <div className="p-16 text-center">
                <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-violet-300" />
                <p className="font-bold text-slate-300">
                  Carregando notas de entrada...
                </p>
              </div>
            ) : notas.length === 0 ? (
              <div className="bg-black/10 p-16 text-center">
                <FileX className="mx-auto mb-4 h-12 w-12 text-slate-500" />
                <p className="text-lg font-black text-white">
                  Nenhuma nota encontrada no sistema.
                </p>
                <p className="mt-1 font-medium text-slate-500">
                  Importe um XML manualmente ou busque na SEFAZ.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notas.map((nota) => (
                  <div
                    key={nota.id}
                    className="group p-5 transition-colors hover:bg-white/5"
                  >
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[140px_minmax(0,1.6fr)_140px_190px_170px] xl:items-center">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-300">
                          {new Date(nota.dataEmissao).toLocaleDateString('pt-BR')}
                        </p>
                        <span className="mt-2 inline-flex rounded-md border border-white/10 bg-[#0b1324] px-2.5 py-1 text-[10px] font-black tracking-widest text-slate-400">
                          Nº {nota.numero} / {nota.serie}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {nota.fornecedor?.razaoSocial ||
                            nota.fornecedor?.nomeFantasia ||
                            'Desconhecido'}
                        </p>
                        <p className="mt-1 truncate text-xs font-mono text-slate-400">
                          {formatarCnpj(nota.fornecedor?.cnpjCpf)}
                        </p>
                        <code className="mt-2 block max-w-[320px] truncate rounded-md border border-white/10 bg-[#0b1324] px-2 py-1 text-[10px] font-mono text-slate-400">
                          {nota.chaveAcesso}
                        </code>
                      </div>

                      <div className="text-left xl:text-right">
                        <p className="font-mono text-lg font-black text-violet-300">
                          {formatarMoeda(nota.valorTotalDocumento)}
                        </p>
                      </div>

                      <div className="xl:justify-self-center">
                        <div className="flex flex-col items-start gap-2 xl:items-center">
                          <span
                            className={`inline-flex w-[150px] items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                              nota.statusEstoque
                                ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                                : 'border-amber-400/20 bg-amber-500/10 text-amber-300'
                            }`}
                          >
                            {nota.statusEstoque ? (
                              <PackageCheck className="h-3.5 w-3.5" />
                            ) : (
                              <AlertCircle className="h-3.5 w-3.5" />
                            )}
                            {nota.statusEstoque ? 'Estoque OK' : 'Estoque Pendente'}
                          </span>

                          <span
                            className={`inline-flex w-[150px] items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                              nota.statusContabil
                                ? 'border-violet-400/20 bg-violet-500/10 text-violet-300'
                                : 'border-white/10 bg-white/5 text-slate-500'
                            }`}
                          >
                            {nota.statusContabil ? (
                              <Database className="h-3.5 w-3.5" />
                            ) : (
                              <AlertCircle className="h-3.5 w-3.5" />
                            )}
                            {nota.statusContabil ? 'Contabilizado' : 'Não Contab.'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        <button
                          onClick={() => baixarDocumento(nota.chaveAcesso, 'pdf')}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 transition-all hover:border-violet-400/20 hover:bg-violet-500/10 hover:text-violet-300"
                          title="Baixar DANFE (PDF)"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          DANFE
                        </button>

                        <button
                          onClick={() => baixarDocumento(nota.chaveAcesso, 'xml')}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 transition-all hover:border-emerald-400/20 hover:bg-emerald-500/10 hover:text-emerald-300"
                          title="Baixar XML Original"
                        >
                          <Download className="h-3.5 w-3.5" />
                          XML
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-black/10 px-6 py-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Landmark className="h-4 w-4 text-violet-300" />
              O painel de entrada de notas centraliza importação fiscal, integração de estoque e reflexo contábil.
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}