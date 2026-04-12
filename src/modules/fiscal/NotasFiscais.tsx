import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Layout } from '../../components/Layout';
import {
  FileText,
  RefreshCcw,
  Download,
  Loader2,
  FileX,
  PackageCheck,
  Database,
  CheckCircle2,
  AlertTriangle,
  Clock,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { AxiosError } from 'axios';
import {
  isFiscalRejeicaoOuErroEmissao,
  rotuloStatusFiscalBadge,
} from './fiscalStatusUtils';

// 🛡️ INTERFACES DE TIPAGEM ESTRITA
export interface IClienteResumo {
  razaoSocial?: string;
  cnpjCpf?: string;
}

export interface IVendaFiscal {
  id: string;
  dataVenda?: string | Date;
  createdAt?: string | Date;
  criadoEm?: string | Date;
  valorTotal: number | string;
  statusFiscal: string;
  modeloNota?: string;
  nomeCliente?: string;
  cpfCnpjCliente?: string;
  cliente?: IClienteResumo;

  // 🚀 NOVO: Status reais de integração vindos do backend
  statusEstoque?: boolean;
  statusContabil?: boolean;
  mensagemErroFiscal?: string | null;
}

// Interface para cobrir os dois formatos possíveis de retorno da API
export interface IApiResponseVendas {
  vendas?: IVendaFiscal[];
}

export function NotasFiscais() {
  const [vendasFiscais, setVendasFiscais] = useState<IVendaFiscal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarNotas();
  }, []);

  const carregarNotas = async () => {
    setLoading(true);
    try {
      const response = await api.get<IVendaFiscal[] | IApiResponseVendas>('/api/vendas');

      let data: IVendaFiscal[] = [];
      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (response.data && response.data.vendas) {
        data = response.data.vendas;
      }

      const apenasFiscais = data.filter((v: IVendaFiscal) => {
        const status = String(v.statusFiscal || '').toUpperCase();
        return (
          status.includes('AUTORIZAD') ||
          status.includes('EMITIDA') ||
          status.includes('REJEITAD') ||
          status.includes('ERRO_EMISSAO') ||
          status === 'ERRO' ||
          status.includes('PROCESSANDO') ||
          status.includes('PENDENTE')
        );
      });

      const ordenadas = apenasFiscais.sort((a: IVendaFiscal, b: IVendaFiscal) => {
        const dataA = new Date(a.createdAt || a.criadoEm || a.dataVenda || 0).getTime();
        const dataB = new Date(b.createdAt || b.criadoEm || b.dataVenda || 0).getTime();
        return dataB - dataA;
      });

      setVendasFiscais(ordenadas);
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('Erro ao carregar notas fiscais', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = String(status || '').toUpperCase();

    if (s.includes('AUTORIZAD') || s.includes('EMITIDA')) {
      return (
        <span className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 shadow-sm">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Autorizada
        </span>
      );
    }

    if (isFiscalRejeicaoOuErroEmissao(s)) {
      return (
        <span className="inline-flex w-full max-w-[200px] flex-col items-center justify-center gap-0.5 rounded-full border border-rose-400/35 bg-rose-500/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.2)] ring-1 ring-rose-500/30">
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {rotuloStatusFiscalBadge(s)}
          </span>
        </span>
      );
    }

    if (s.includes('PENDENTE') || s.includes('PROCESSANDO')) {
      return (
        <span className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-sky-300 shadow-sm">
          <Clock className="h-3.5 w-3.5" />
          Processando
        </span>
      );
    }

    return (
      <span className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {status || 'Desconhecido'}
      </span>
    );
  };

  const baixarDocumento = async (venda: IVendaFiscal, tipo: 'pdf' | 'xml') => {
    const id = venda.id;
    const modelo = venda.modeloNota || (venda.cpfCnpjCliente && venda.nomeCliente ? '55' : '65');

    try {
      const response = await api.get<Blob>(`/api/vendas/${id}/${tipo}?modelo=${modelo}`, {
        responseType: 'blob'
      });

      const file = new Blob([response.data], {
        type: tipo === 'pdf' ? 'application/pdf' : 'application/xml'
      });

      const fileURL = URL.createObjectURL(file);

      if (tipo === 'pdf') {
        window.open(fileURL, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = fileURL;
        link.setAttribute('download', `Nota_${id}.${tipo}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      const error = err as AxiosError;
      console.error(`Erro ao baixar ${tipo}:`, error);
      alert(`⚠️ O ${tipo.toUpperCase()} não está disponível ou houve um erro no servidor.`);
    }
  };

  const formatarMoeda = (valor: number | string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(valor));
  };

  const retransmitirNota = async (venda: IVendaFiscal) => {
    try {
      await api.post(`/api/vendas/${venda.id}/retransmitir`, {});
      alert('✅ Nota enviada para reprocessamento na SEFAZ.');
      await carregarNotas();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      alert(`❌ ${error.response?.data?.error || error.message || 'Falha ao retransmitir.'}`);
    }
  };

  const formatarCnpjCpf = (doc?: string) => {
    if (!doc) return '-';
    const clean = doc.replace(/\D/g, '');

    if (clean.length === 11) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    if (clean.length === 14) {
      return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }

    return doc;
  };

  return (
    <Layout>
      <div className="mx-auto flex h-full max-w-7xl flex-col space-y-6 pb-12">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_20%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-violet-600/15 blur-[100px]" />
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-emerald-600/10 blur-[110px]" />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                Fiscal Output
              </div>

              <h1 className="flex items-center gap-4 text-3xl font-black tracking-tight text-white">
                <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 shadow-[0_0_20px_rgba(139,92,246,0.12)]">
                  <FileText className="h-8 w-8 text-violet-300" />
                </div>
                Notas Emitidas (Saída)
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                Gerencie as NF-e e NFC-e geradas pelo PDV, acompanhe o status na
                SEFAZ e valide a integração operacional e contábil do documento.
              </p>
            </div>

            <button
              onClick={carregarNotas}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 font-black text-slate-300 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-8 w-2 rounded-full bg-gradient-to-b from-violet-400 to-emerald-400" />
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">
              Histórico fiscal
            </h2>
            <p className="text-sm text-slate-400">
              Visualize o fluxo das notas emitidas e o status de integração do ERP.
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-6">
          {loading && vendasFiscais.length === 0 ? (
            <div className="rounded-[30px] border border-white/10 bg-[#08101f]/90 p-12 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-300" />
                </div>
                <p className="text-base font-bold text-slate-300">
                  Carregando notas fiscais...
                </p>
              </div>
            </div>
          ) : vendasFiscais.length === 0 ? (
            <div className="relative overflow-hidden rounded-[30px] border border-white/10 border-dashed bg-[#08101f]/90 py-20 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.08),_transparent_28%)]" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <FileX className="h-12 w-12 text-slate-500" />
                </div>
                <h3 className="mb-2 text-2xl font-black text-white">
                  Nenhuma nota fiscal encontrada
                </h3>
                <p className="max-w-md text-base leading-7 text-slate-400">
                  As notas emitidas pelo PDV aparecerão aqui assim que forem geradas.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 bg-black/10 px-5 py-5">
                <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-white">
                  <FileText className="h-4 w-4 text-violet-300" />
                  Documentos fiscais emitidos
                </h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-violet-300">
                  {vendasFiscais.length} Registros
                </span>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="min-w-[1100px] w-full text-left">
                  <thead className="sticky top-0 z-10 border-b border-white/10 bg-[#0b1324]">
                    <tr>
                      <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Data Emissão
                      </th>
                      <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Cliente / Destinatário
                      </th>
                      <th className="p-5 text-right text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Valor Total
                      </th>
                      <th className="p-5 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Integração ERP
                      </th>
                      <th className="p-5 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Status SEFAZ
                      </th>
                      <th className="p-5 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/5">
                    {vendasFiscais.map((venda) => {
                      const isAutorizada =
                        String(venda.statusFiscal || '').toUpperCase().includes('AUTORIZAD') ||
                        String(venda.statusFiscal || '').toUpperCase().includes('EMITIDA');
                      const isFalhaFiscal = isFiscalRejeicaoOuErroEmissao(venda.statusFiscal);
                      const mostrarMsgErro =
                        isFalhaFiscal && Boolean(venda.mensagemErroFiscal?.trim());

                      return (
                        <React.Fragment key={venda.id}>
                        <tr
                          className="transition-colors hover:bg-white/5"
                        >
                          <td className="p-5 font-bold text-slate-300">
                            {new Date(
                              venda.createdAt || venda.criadoEm || venda.dataVenda || Date.now()
                            ).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                          </td>

                          <td className="p-5">
                            <div
                              className="max-w-[250px] truncate font-black text-white"
                              title={venda.cliente?.razaoSocial || venda.nomeCliente}
                            >
                              {venda.cliente?.razaoSocial ||
                                venda.nomeCliente ||
                                'Consumidor Final'}
                            </div>
                            <div className="mt-1 text-xs font-mono text-slate-400">
                              {formatarCnpjCpf(venda.cliente?.cnpjCpf || venda.cpfCnpjCliente)}
                            </div>
                          </td>

                          <td className="p-5 text-right font-mono text-lg font-black text-emerald-300">
                            {formatarMoeda(venda.valorTotal)}
                          </td>

                          <td className="p-5 text-center">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <span
                                className={`inline-flex w-[140px] items-center justify-center gap-1 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] shadow-sm ${
                                  venda.statusEstoque !== false
                                    ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                                    : 'border-white/10 bg-white/5 text-slate-500'
                                }`}
                              >
                                {venda.statusEstoque !== false ? (
                                  <PackageCheck className="h-3.5 w-3.5" />
                                ) : (
                                  <AlertCircle className="h-3.5 w-3.5" />
                                )}
                                {venda.statusEstoque !== false
                                  ? 'Estoque OK'
                                  : 'Estoque Pendente'}
                              </span>

                              <span
                                className={`inline-flex w-[140px] items-center justify-center gap-1 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] shadow-sm ${
                                  venda.statusContabil !== false
                                    ? 'border-sky-400/20 bg-sky-500/10 text-sky-300'
                                    : 'border-white/10 bg-white/5 text-slate-500'
                                }`}
                              >
                                {venda.statusContabil !== false ? (
                                  <Database className="h-3.5 w-3.5" />
                                ) : (
                                  <AlertCircle className="h-3.5 w-3.5" />
                                )}
                                {venda.statusContabil !== false
                                  ? 'Contabilizado'
                                  : 'Não Contab.'}
                              </span>
                            </div>
                          </td>

                          <td className="w-[170px] p-5 text-center">
                            {getStatusBadge(venda.statusFiscal)}
                          </td>

                          <td className="p-5 text-center">
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              {isFalhaFiscal && (
                                <button
                                  type="button"
                                  onClick={() => retransmitirNota(venda)}
                                  className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-amber-400/60 bg-amber-500/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100 shadow-[0_0_14px_rgba(245,158,11,0.2)] transition-all hover:bg-amber-500/30 ring-1 ring-amber-400/40"
                                  title="Retransmitir nota para a SEFAZ"
                                >
                                  <RefreshCcw className="h-3.5 w-3.5" />
                                  Retransmitir
                                </button>
                              )}
                              <button
                                disabled={!isAutorizada}
                                onClick={() => baixarDocumento(venda, 'pdf')}
                                className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300 transition-all hover:border-violet-400/20 hover:bg-violet-500/10 hover:text-violet-300 disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:bg-white/5 disabled:hover:text-slate-300"
                                title="Baixar DANFE (PDF)"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                PDF
                              </button>

                              <button
                                disabled={!isAutorizada}
                                onClick={() => baixarDocumento(venda, 'xml')}
                                className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300 transition-all hover:border-emerald-400/20 hover:bg-emerald-500/10 hover:text-emerald-300 disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:bg-white/5 disabled:hover:text-slate-300"
                                title="Baixar XML Original"
                              >
                                <Download className="h-3.5 w-3.5" />
                                XML
                              </button>
                            </div>
                          </td>
                        </tr>
                        {mostrarMsgErro && (
                          <tr className="bg-red-950/25">
                            <td colSpan={6} className="px-5 pb-4 pt-0">
                              <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-400 mb-1.5 flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 shrink-0" />
                                  Motivo SEFAZ / erro de emissão
                                </p>
                                <p className="text-sm font-medium text-red-100/95 whitespace-pre-wrap break-words">
                                  {venda.mensagemErroFiscal}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}