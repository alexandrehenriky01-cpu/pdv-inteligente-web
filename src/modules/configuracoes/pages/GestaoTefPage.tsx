import { useCallback, useEffect, useState } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import {
  CreditCard,
  Loader2,
  Save,
  Settings2,
  X,
  Monitor,
} from 'lucide-react';
import { AxiosError } from 'axios';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '../../../components/ui/dialog';

const PROVEDORES_TEF = ['PAYGO', 'SITEF', 'STONE', 'CAPPTA', 'OUTRO'] as const;

interface LojaTefConfig {
  tefProvedor: string | null;
  tefMerchantId: string | null;
  tefChaveIntegracao: string | null;
}

interface EstacaoRow {
  id: string;
  nome: string;
  identificadorMaquina: string;
  nomeMaquina?: string | null;
  tefAtivo: boolean;
  tefTerminalId?: string | null;
  tefIpPinpad?: string | null;
  tefPortaPinpad?: string | null;
  adquirenteTefCreditoId?: string | null;
  adquirenteTefDebitoId?: string | null;
  adquirenteTefCredito?: { id: string; nome: string } | null;
  adquirenteTefDebito?: { id: string; nome: string } | null;
  ativo: boolean;
}

interface AdquirenteOpt {
  id: string;
  nome: string;
}

function extrairErro(err: unknown): string {
  const ax = err as AxiosError<{ erro?: string; error?: string; message?: string }>;
  return (
    ax.response?.data?.erro ||
    ax.response?.data?.error ||
    ax.response?.data?.message ||
    (err instanceof Error ? err.message : 'Erro na operação.')
  );
}

export function GestaoTefPage() {
  const [loading, setLoading] = useState(true);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [globalForm, setGlobalForm] = useState<LojaTefConfig>({
    tefProvedor: null,
    tefMerchantId: null,
    tefChaveIntegracao: null,
  });

  const [estacoes, setEstacoes] = useState<EstacaoRow[]>([]);
  const [adquirentes, setAdquirentes] = useState<AdquirenteOpt[]>([]);
  const [modalEstacao, setModalEstacao] = useState<EstacaoRow | null>(null);
  const [pinForm, setPinForm] = useState({
    tefTerminalId: '',
    tefIpPinpad: '',
    tefPortaPinpad: '',
    tefAtivo: false,
    adquirenteTefCreditoId: '',
    adquirenteTefDebitoId: '',
  });
  const [savingPin, setSavingPin] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, estRes, adqRes] = await Promise.all([
        api.get<{ sucesso?: boolean; dados?: LojaTefConfig }>('/api/tef/config/loja'),
        api.get<{ success?: boolean; data?: EstacaoRow[] }>('/api/estacoes-trabalho'),
        api.get<{ sucesso?: boolean; dados?: AdquirenteOpt[] }>('/api/adquirentes'),
      ]);

      const d = cfgRes.data.dados ?? cfgRes.data;
      if (d && typeof d === 'object' && 'tefProvedor' in d) {
        setGlobalForm({
          tefProvedor: d.tefProvedor ?? null,
          tefMerchantId: d.tefMerchantId ?? null,
          tefChaveIntegracao: d.tefChaveIntegracao ?? null,
        });
      }

      const lista = estRes.data.data ?? (estRes.data as unknown as EstacaoRow[]);
      setEstacoes(Array.isArray(lista) ? lista : []);

      const adq = adqRes.data.dados ?? (adqRes.data as unknown as { dados?: AdquirenteOpt[] })?.dados;
      setAdquirentes(Array.isArray(adq) ? adq : []);
    } catch (e) {
      alert(extrairErro(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const salvarGlobal = async () => {
    setSavingGlobal(true);
    try {
      await api.put('/api/tef/config/loja', {
        tefProvedor: globalForm.tefProvedor?.trim() || null,
        tefMerchantId: globalForm.tefMerchantId?.trim() || null,
        tefChaveIntegracao: globalForm.tefChaveIntegracao?.trim() || null,
      });
      alert('Configurações globais TEF salvas.');
      await carregar();
    } catch (e) {
      alert(extrairErro(e));
    } finally {
      setSavingGlobal(false);
    }
  };

  const abrirModalPin = (e: EstacaoRow) => {
    setModalEstacao(e);
    setPinForm({
      tefTerminalId: e.tefTerminalId ?? '',
      tefIpPinpad: e.tefIpPinpad ?? '',
      tefPortaPinpad: e.tefPortaPinpad ?? '',
      tefAtivo: e.tefAtivo,
      adquirenteTefCreditoId: e.adquirenteTefCreditoId ?? e.adquirenteTefCredito?.id ?? '',
      adquirenteTefDebitoId: e.adquirenteTefDebitoId ?? e.adquirenteTefDebito?.id ?? '',
    });
  };

  const salvarPin = async () => {
    if (!modalEstacao) return;
    setSavingPin(true);
    try {
      await api.patch(`/api/estacoes-trabalho/${modalEstacao.id}/tef`, {
        tefTerminalId: pinForm.tefTerminalId.trim() || null,
        tefIpPinpad: pinForm.tefIpPinpad.trim() || null,
        tefPortaPinpad: pinForm.tefPortaPinpad.trim() || null,
        tefAtivo: pinForm.tefAtivo,
        adquirenteTefCreditoId: pinForm.adquirenteTefCreditoId.trim() || null,
        adquirenteTefDebitoId: pinForm.adquirenteTefDebitoId.trim() || null,
      });
      setModalEstacao(null);
      await carregar();
    } catch (e) {
      alert(extrairErro(e));
    } finally {
      setSavingPin(false);
    }
  };

  const provedorSelect =
    globalForm.tefProvedor &&
    PROVEDORES_TEF.includes(globalForm.tefProvedor as (typeof PROVEDORES_TEF)[number])
      ? globalForm.tefProvedor
      : globalForm.tefProvedor
        ? 'OUTRO'
        : '';

  return (
    <Layout>
      <div className="min-h-screen bg-[#08101f] p-6 font-sans text-white">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.15),_transparent_30%),linear-gradient(135deg,_#0b1020_0%,_#08101f_100%)] p-8 shadow-2xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
              <CreditCard size={14} /> TEF / PinPad
            </div>
            <h1 className="text-3xl font-black tracking-tight">Gestão TEF</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Credenciais globais da loja e parâmetros por estação. Com <code className="text-violet-300">estacaoTrabalhoId</code>{' '}
              nas rotas <code className="text-violet-300">/api/tef/iniciar</code> e{' '}
              <code className="text-violet-300">/api/tef/registrar-hardware</code>, o motor valida{' '}
              <strong>tefAtivo</strong> e envia IP/TID ao adaptador.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
            </div>
          ) : (
            <>
              <section className="rounded-2xl border border-white/10 bg-[#0b1324]/90 p-6 shadow-xl">
                <div className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                  <Settings2 className="h-5 w-5 text-violet-400" />
                  Configuração global (Loja)
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                      Provedor TEF
                    </label>
                    <select
                      value={provedorSelect}
                      onChange={(ev) => {
                        const v = ev.target.value;
                        setGlobalForm((f) => ({
                          ...f,
                          tefProvedor: v === '' ? null : v === 'OUTRO' ? f.tefProvedor : v,
                        }));
                      }}
                      className="w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm outline-none ring-violet-500/30 focus:ring-2"
                    >
                      <option value="">Selecione…</option>
                      {PROVEDORES_TEF.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    {provedorSelect === 'OUTRO' && (
                      <input
                        type="text"
                        value={globalForm.tefProvedor ?? ''}
                        onChange={(ev) =>
                          setGlobalForm((f) => ({ ...f, tefProvedor: ev.target.value || null }))
                        }
                        placeholder="Nome do provedor"
                        className="mt-2 w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm outline-none ring-violet-500/30 focus:ring-2"
                      />
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                      Merchant ID (MID)
                    </label>
                    <input
                      type="text"
                      value={globalForm.tefMerchantId ?? ''}
                      onChange={(ev) =>
                        setGlobalForm((f) => ({ ...f, tefMerchantId: ev.target.value || null }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm outline-none ring-violet-500/30 focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                      Chave / Token de integração
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={globalForm.tefChaveIntegracao ?? ''}
                      onChange={(ev) =>
                        setGlobalForm((f) => ({ ...f, tefChaveIntegracao: ev.target.value || null }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm outline-none ring-violet-500/30 focus:ring-2"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={salvarGlobal}
                    disabled={savingGlobal}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {savingGlobal ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Salvar global
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#0b1324]/90 p-6 shadow-xl">
                <div className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                  <Monitor className="h-5 w-5 text-violet-400" />
                  Por terminal (Estação de trabalho)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-3 py-3">Estação</th>
                        <th className="px-3 py-3">Identificador</th>
                        <th className="px-3 py-3">TEF</th>
                        <th className="px-3 py-3">IP Pinpad</th>
                        <th className="px-3 py-3">TID</th>
                        <th className="px-3 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {estacoes.map((row) => (
                        <tr key={row.id} className="hover:bg-white/[0.03]">
                          <td className="px-3 py-3 font-medium text-white">{row.nome}</td>
                          <td className="px-3 py-3 text-slate-400">{row.identificadorMaquina}</td>
                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                row.tefAtivo
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : 'bg-slate-600/30 text-slate-400'
                              }`}
                            >
                              {row.tefAtivo ? 'Ativo' : 'Off'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-300">{row.tefIpPinpad || '—'}</td>
                          <td className="px-3 py-3 text-slate-300">{row.tefTerminalId || '—'}</td>
                          <td className="px-3 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => abrirModalPin(row)}
                              className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-200 hover:bg-violet-500/20"
                            >
                              Configurar Pinpad
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>

        <Dialog
          open={modalEstacao !== null}
          onOpenChange={(open) => {
            if (!open) setModalEstacao(null);
          }}
        >
          <DialogContent
            hideDescription
            className="max-w-md rounded-2xl border border-white/10 bg-[#0b1324] p-6 shadow-2xl"
          >
            {modalEstacao ? (
              <>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <DialogTitle className="text-lg font-bold text-white">
                      Pinpad — {modalEstacao.nome}
                    </DialogTitle>
                    <p className="text-xs text-slate-500">{modalEstacao.identificadorMaquina}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalEstacao(null)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-white/10"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                      Terminal ID (TID)
                    </label>
                    <input
                      type="text"
                      value={pinForm.tefTerminalId}
                      onChange={(ev) => setPinForm((f) => ({ ...f, tefTerminalId: ev.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-[#08101f] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                      IP do Pinpad
                    </label>
                    <input
                      type="text"
                      placeholder="192.168.0.50"
                      value={pinForm.tefIpPinpad}
                      onChange={(ev) => setPinForm((f) => ({ ...f, tefIpPinpad: ev.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-[#08101f] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                      Porta (rede ou serial, ex. COM3)
                    </label>
                    <input
                      type="text"
                      value={pinForm.tefPortaPinpad}
                      onChange={(ev) => setPinForm((f) => ({ ...f, tefPortaPinpad: ev.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-[#08101f] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <span className="text-sm text-slate-300">Habilitar TEF</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={pinForm.tefAtivo}
                      onClick={() => setPinForm((f) => ({ ...f, tefAtivo: !f.tefAtivo }))}
                      className={`relative h-7 w-12 rounded-full transition ${
                        pinForm.tefAtivo ? 'bg-emerald-600' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${
                          pinForm.tefAtivo ? 'left-6' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                      Adquirente TEF — débito
                    </label>
                    <select
                      value={pinForm.adquirenteTefDebitoId}
                      onChange={(ev) =>
                        setPinForm((f) => ({ ...f, adquirenteTefDebitoId: ev.target.value }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#08101f] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
                    >
                      <option value="">— Nenhum —</option>
                      {adquirentes.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                      Adquirente TEF — crédito
                    </label>
                    <select
                      value={pinForm.adquirenteTefCreditoId}
                      onChange={(ev) =>
                        setPinForm((f) => ({ ...f, adquirenteTefCreditoId: ev.target.value }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#08101f] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
                    >
                      <option value="">— Nenhum —</option>
                      {adquirentes.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalEstacao(null)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={salvarPin}
                    disabled={savingPin}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {savingPin && <Loader2 className="h-4 w-4 animate-spin" />}
                    Salvar
                  </button>
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

export default GestaoTefPage;
