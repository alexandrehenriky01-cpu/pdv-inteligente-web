import { useCallback, useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import {
  Activity,
  CheckCircle2,
  CreditCard,
  FileLock2,
  Globe,
  KeyRound,
  Loader2,
  Lock,
  MapPin,
  RefreshCcw,
  Save,
  ShieldCheck,
  Trash2,
  Truck,
  Upload,
  Wallet,
  XCircle,
} from 'lucide-react';
import { Layout } from '../../../components/Layout';
import {
  consultarWebhookPix,
  getCertificadoStatus,
  getPixConfig,
  listLocaisCobrancaPix,
  registrarWebhookPix,
  removerCertificadoPix,
  testarConexaoPix,
  updatePixConfig,
  uploadCertificadoPix,
  type PixCertificadoStatus,
  type PixConfigPayload,
  type PixConfigResponse,
  type PixLocalCobrancaItem,
  type PixOrigemContexto,
  type PixPspType,
  type PixTestarConexaoResp,
  type PixWebhookInfo,
} from '../services/pixConfigApi';

const PSPS: ReadonlyArray<{ value: PixPspType; label: string; disponivel: boolean }> = [
  { value: 'EFI', label: 'Efí Bank', disponivel: true },
  { value: 'ASAAS', label: 'Asaas (em breve)', disponivel: false },
  { value: 'MERCADO_PAGO', label: 'Mercado Pago (em breve)', disponivel: false },
];

const MASCARA_INTOCADA = '****';

function extrairErro(err: unknown): string {
  const ax = err as AxiosError<{ erro?: string; error?: string; message?: string }>;
  return (
    ax.response?.data?.error ||
    ax.response?.data?.erro ||
    ax.response?.data?.message ||
    (err instanceof Error ? err.message : 'Erro na operação.')
  );
}

interface FormState {
  pspPix: PixPspType;
  pixClientId: string;
  pixClientSecret: string;
  pixChave: string;
  pixSandbox: boolean;
  pixAtivo: boolean;
  pixOrigemDelivery: PixOrigemContexto | null;
  pixOrigemPdv: PixOrigemContexto | null;
  pixLocalCobrancaDeliveryId: string | null;
  pixLocalCobrancaPdvId: string | null;
}

const INITIAL_FORM: FormState = {
  pspPix: 'EFI',
  pixClientId: '',
  pixClientSecret: '',
  pixChave: '',
  pixSandbox: true,
  pixAtivo: false,
  pixOrigemDelivery: null,
  pixOrigemPdv: null,
  pixLocalCobrancaDeliveryId: null,
  pixLocalCobrancaPdvId: null,
};

function preencherDoServidor(cfg: PixConfigResponse): FormState {
  return {
    pspPix: cfg.pspPix ?? 'EFI',
    // Quando há valor mascarado, deixamos o campo "tocável" mas com placeholder visível.
    // O usuário só envia novo valor se digitar algo diferente da máscara.
    pixClientId: cfg.pixClientIdMascarado ? MASCARA_INTOCADA : '',
    pixClientSecret: cfg.pixClientSecretMascarado ? MASCARA_INTOCADA : '',
    pixChave: cfg.pixChave ?? '',
    pixSandbox: cfg.pixSandbox,
    pixAtivo: cfg.pixAtivo,
    pixOrigemDelivery: cfg.pixOrigemDelivery,
    pixOrigemPdv: cfg.pixOrigemPdv,
    pixLocalCobrancaDeliveryId: cfg.pixLocalCobrancaDeliveryId,
    pixLocalCobrancaPdvId: cfg.pixLocalCobrancaPdvId,
  };
}

export function PixConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [config, setConfig] = useState<PixConfigResponse | null>(null);
  const [locais, setLocais] = useState<PixLocalCobrancaItem[]>([]);

  // Teste de conexão
  const [testandoConexao, setTestandoConexao] = useState(false);
  const [testeResultado, setTesteResultado] = useState<PixTestarConexaoResp | null>(null);

  // Webhook
  const [webhookInfo, setWebhookInfo] = useState<PixWebhookInfo | null>(null);
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [registrandoWebhook, setRegistrandoWebhook] = useState(false);
  const [consultandoWebhook, setConsultandoWebhook] = useState(false);

  // Certificado PIX
  const [certStatus, setCertStatus] = useState<PixCertificadoStatus | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [enviandoCert, setEnviandoCert] = useState(false);
  const [removendoCert, setRemovendoCert] = useState(false);
  const [certMensagem, setCertMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(
    null
  );

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const [cfg, lst, cert] = await Promise.all([
        getPixConfig(),
        listLocaisCobrancaPix(),
        getCertificadoStatus().catch(() => ({ configurado: false, mensagem: '' })),
      ]);
      setConfig(cfg);
      setForm(preencherDoServidor(cfg));
      setLocais(lst);
      setCertStatus(cert);
    } catch (e: unknown) {
      setErro(extrairErro(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const enviarCertificado = async (): Promise<void> => {
    if (!certFile) {
      setCertMensagem({ tipo: 'erro', texto: 'Selecione um arquivo .p12 ou .pfx.' });
      return;
    }
    const nome = certFile.name.toLowerCase();
    if (!/\.(p12|pfx)$/.test(nome)) {
      setCertMensagem({ tipo: 'erro', texto: 'Formato não suportado. Use .p12 ou .pfx.' });
      return;
    }
    if (certFile.size > 5 * 1024 * 1024) {
      setCertMensagem({ tipo: 'erro', texto: 'Arquivo excede 5MB.' });
      return;
    }
    setEnviandoCert(true);
    setCertMensagem(null);
    try {
      const r = await uploadCertificadoPix(certFile);
      setCertStatus({ configurado: r.configurado, mensagem: r.mensagem });
      setCertFile(null);
      setCertMensagem({ tipo: 'ok', texto: r.mensagem });
    } catch (e: unknown) {
      setCertMensagem({ tipo: 'erro', texto: extrairErro(e) });
    } finally {
      setEnviandoCert(false);
    }
  };

  const removerCertificado = async (): Promise<void> => {
    if (!window.confirm('Remover o certificado atual? PIX em produção deixará de funcionar até um novo upload.')) {
      return;
    }
    setRemovendoCert(true);
    setCertMensagem(null);
    try {
      const r = await removerCertificadoPix();
      setCertStatus({ configurado: false, mensagem: r.mensagem });
      setCertMensagem({ tipo: 'ok', texto: r.mensagem });
    } catch (e: unknown) {
      setCertMensagem({ tipo: 'erro', texto: extrairErro(e) });
    } finally {
      setRemovendoCert(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const locaisAtivosComChave = useMemo(
    () => locais.filter((l) => l.ativo && l.chavePixMascarada !== null),
    [locais]
  );

  const ativarPix = (v: boolean): void => {
    setForm((f) => ({ ...f, pixAtivo: v }));
  };

  const salvar = async (): Promise<void> => {
    setSaving(true);
    setErro(null);
    setSucesso(null);
    try {
      const payload: PixConfigPayload = {
        pspPix: form.pspPix,
        // Se o campo continua com a máscara, enviamos a máscara — backend preserva o valor atual
        pixClientId: form.pixClientId === '' ? '' : form.pixClientId,
        pixClientSecret: form.pixClientSecret === '' ? '' : form.pixClientSecret,
        pixChave: form.pixChave.trim(),
        pixSandbox: form.pixSandbox,
        pixAtivo: form.pixAtivo,
        pixOrigemDelivery: form.pixOrigemDelivery,
        pixOrigemPdv: form.pixOrigemPdv,
        pixLocalCobrancaDeliveryId:
          form.pixOrigemDelivery === 'LOCAL_COBRANCA' ? form.pixLocalCobrancaDeliveryId : null,
        pixLocalCobrancaPdvId:
          form.pixOrigemPdv === 'LOCAL_COBRANCA' ? form.pixLocalCobrancaPdvId : null,
      };

      const novaConfig = await updatePixConfig(payload);
      setConfig(novaConfig);
      setForm(preencherDoServidor(novaConfig));
      setSucesso('Configuração PIX salva com sucesso.');
      setTimeout(() => setSucesso(null), 4000);
    } catch (e: unknown) {
      setErro(extrairErro(e));
    } finally {
      setSaving(false);
    }
  };

  const testarConexao = async (): Promise<void> => {
    setTestandoConexao(true);
    setTesteResultado(null);
    setErro(null);
    try {
      const r = await testarConexaoPix();
      setTesteResultado(r);
    } catch (e: unknown) {
      setTesteResultado({
        ok: false,
        psp: form.pspPix,
        ambiente: form.pixSandbox ? 'SANDBOX' : 'PRODUCAO',
        mensagem: extrairErro(e),
      });
    } finally {
      setTestandoConexao(false);
    }
  };

  const consultarWebhook = useCallback(async (): Promise<void> => {
    setConsultandoWebhook(true);
    try {
      const r = await consultarWebhookPix();
      setWebhookInfo(r);
      if (r.webhookUrl && webhookUrlInput.trim() === '') {
        setWebhookUrlInput(r.webhookUrl);
      }
    } catch (e: unknown) {
      setErro(extrairErro(e));
    } finally {
      setConsultandoWebhook(false);
    }
  }, [webhookUrlInput]);

  const registrarWebhook = async (): Promise<void> => {
    const url = webhookUrlInput.trim();
    if (!url) {
      setErro('Informe a URL do webhook.');
      return;
    }
    setRegistrandoWebhook(true);
    setErro(null);
    setSucesso(null);
    try {
      const r = await registrarWebhookPix(url);
      if (r.ok) {
        setSucesso(r.mensagem || 'Webhook registrado com sucesso.');
        await consultarWebhook();
      } else {
        setErro(r.mensagem);
      }
    } catch (e: unknown) {
      setErro(extrairErro(e));
    } finally {
      setRegistrandoWebhook(false);
    }
  };

  // Carrega o webhook atual ao abrir a página
  useEffect(() => {
    if (config?.pixWebhookUrl && webhookUrlInput.trim() === '') {
      setWebhookUrlInput(config.pixWebhookUrl);
    }
  }, [config?.pixWebhookUrl, webhookUrlInput]);

  return (
    <Layout>
      <div className="min-h-screen bg-[#08101f] p-6 font-sans text-white">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Cabeçalho */}
          <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.15),_transparent_30%),linear-gradient(135deg,_#0b1020_0%,_#08101f_100%)] p-8 shadow-2xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
              <Wallet size={14} /> Pagamentos · PIX
            </div>
            <h1 className="text-3xl font-black tracking-tight">Configuração PIX</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Cadastre as credenciais do PSP da loja e escolha qual chave PIX será usada em cada
              contexto (Delivery, PDV). Locais de cobrança continuam disponíveis como origem
              alternativa.
            </p>
          </div>

          {erro && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {erro}
            </div>
          )}
          {sucesso && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {sucesso}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
            </div>
          ) : (
            <>
              {/* Bloco 1 — Status */}
              <section className="rounded-2xl border border-white/10 bg-[#0b1324]/90 p-6 shadow-xl">
                <div className="mb-5 flex items-center gap-2 text-lg font-bold text-white">
                  <ShieldCheck className="h-5 w-5 text-violet-400" />
                  Status do PIX
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                      PIX ativo
                    </label>
                    <button
                      type="button"
                      onClick={() => ativarPix(!form.pixAtivo)}
                      className={`flex h-11 w-full items-center justify-between rounded-xl border px-4 transition ${
                        form.pixAtivo
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                          : 'border-white/10 bg-[#08101f] text-slate-300'
                      }`}
                    >
                      <span className="text-sm font-medium">
                        {form.pixAtivo ? 'Ativado' : 'Desativado'}
                      </span>
                      <span
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition ${
                          form.pixAtivo ? 'bg-emerald-500' : 'bg-slate-600'
                        }`}
                      >
                        <span
                          className={`absolute h-4 w-4 rounded-full bg-white transition ${
                            form.pixAtivo ? 'right-0.5' : 'left-0.5'
                          }`}
                        />
                      </span>
                    </button>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Quando desativado, novos pedidos não geram cobrança PIX automática.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                      Ambiente
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, pixSandbox: true }))}
                        className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                          form.pixSandbox
                            ? 'border-violet-500/50 bg-violet-500/15 text-violet-100'
                            : 'border-white/10 bg-[#08101f] text-slate-400'
                        }`}
                      >
                        Sandbox
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, pixSandbox: false }))}
                        className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                          !form.pixSandbox
                            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-100'
                            : 'border-white/10 bg-[#08101f] text-slate-400'
                        }`}
                      >
                        Produção
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Bloco 2 — PSP da Loja */}
              <section className="rounded-2xl border border-white/10 bg-[#0b1324]/90 p-6 shadow-xl">
                <div className="mb-5 flex items-center gap-2 text-lg font-bold text-white">
                  <KeyRound className="h-5 w-5 text-violet-400" />
                  PSP da loja
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                      Provedor (PSP)
                    </label>
                    <select
                      value={form.pspPix}
                      onChange={(ev) =>
                        setForm((f) => ({ ...f, pspPix: ev.target.value as PixPspType }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm outline-none ring-violet-500/30 focus:ring-2"
                    >
                      {PSPS.map((p) => (
                        <option key={p.value} value={p.value} disabled={!p.disponivel}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                      Client ID
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={form.pixClientId}
                      onChange={(ev) =>
                        setForm((f) => ({ ...f, pixClientId: ev.target.value }))
                      }
                      placeholder={config?.pixClientIdMascarado ?? 'Informe o Client ID do PSP'}
                      className="w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm outline-none ring-violet-500/30 focus:ring-2"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                      Client Secret
                      <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                        <Lock className="h-3 w-3" /> criptografado
                      </span>
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={form.pixClientSecret}
                      onChange={(ev) =>
                        setForm((f) => ({ ...f, pixClientSecret: ev.target.value }))
                      }
                      placeholder={config?.pixClientSecretMascarado ?? 'Informe o Client Secret'}
                      className="w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm outline-none ring-violet-500/30 focus:ring-2"
                    />
                    {config?.pixClientSecretMascarado && (
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        Deixe em branco ou mantenha <code>****</code> para preservar o valor atual.
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                      Chave PIX da loja
                    </label>
                    <input
                      type="text"
                      value={form.pixChave}
                      onChange={(ev) =>
                        setForm((f) => ({ ...f, pixChave: ev.target.value }))
                      }
                      placeholder="CPF, CNPJ, email, telefone ou chave aleatória"
                      className="w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm outline-none ring-violet-500/30 focus:ring-2"
                    />
                  </div>

                  {config?.pixWebhookUrl && (
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                        Webhook URL (somente leitura)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={config.pixWebhookUrl}
                        className="w-full rounded-xl border border-white/10 bg-[#06101e] px-4 py-2.5 text-sm text-slate-400"
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* Bloco — Certificado PIX */}
              <section className="rounded-2xl border border-white/10 bg-[#0b1324]/90 p-6 shadow-xl">
                <div className="mb-5 flex items-center gap-2 text-lg font-bold text-white">
                  <FileLock2 className="h-5 w-5 text-violet-400" />
                  Certificado PIX (Efí)
                </div>
                <p className="mb-4 text-xs text-slate-400">
                  Em produção, a Efí exige um certificado <code className="text-violet-300">.p12</code>{' '}
                  (PKCS#12) para autenticação mTLS. Faça o upload aqui — o arquivo é validado,
                  armazenado em diretório protegido e nunca exposto via HTTP.
                </p>

                <div className="space-y-3">
                  <div
                    className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
                      certStatus?.configurado
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                    }`}
                  >
                    {certStatus?.configurado ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <FileLock2 className="h-4 w-4" />
                    )}
                    <span className="font-bold">
                      {certStatus?.configurado
                        ? 'Certificado configurado'
                        : 'Nenhum certificado enviado'}
                    </span>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                      Selecionar arquivo .p12 / .pfx
                    </label>
                    <input
                      type="file"
                      accept=".p12,.pfx,application/x-pkcs12"
                      onChange={(ev) => {
                        const f = ev.target.files?.[0] ?? null;
                        setCertFile(f);
                        setCertMensagem(null);
                      }}
                      className="block w-full cursor-pointer rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm text-slate-300 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-violet-500/20 file:px-4 file:py-2 file:text-sm file:font-bold file:text-violet-200 hover:file:bg-violet-500/30"
                    />
                    {certFile && (
                      <p className="mt-1.5 text-[11px] text-slate-400">
                        Selecionado: <span className="font-mono">{certFile.name}</span>{' '}
                        ({(certFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  {certMensagem && (
                    <div
                      className={`rounded-xl border px-4 py-2.5 text-xs ${
                        certMensagem.tipo === 'ok'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                          : 'border-red-500/30 bg-red-500/10 text-red-200'
                      }`}
                    >
                      {certMensagem.texto}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void enviarCertificado()}
                      disabled={enviandoCert || !certFile}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                    >
                      {enviandoCert ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Enviar certificado
                    </button>
                    {certStatus?.configurado && (
                      <button
                        type="button"
                        onClick={() => void removerCertificado()}
                        disabled={removendoCert}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                      >
                        {removendoCert ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Remover certificado
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Tamanho máximo: 5MB. Formatos aceitos:{' '}
                    <span className="text-violet-300">.p12</span>,{' '}
                    <span className="text-violet-300">.pfx</span>. O conteúdo do certificado nunca
                    é exposto pela API nem aparece em logs.
                  </p>
                </div>
              </section>

              {/* Bloco 3 — Uso por contexto */}
              <section className="rounded-2xl border border-white/10 bg-[#0b1324]/90 p-6 shadow-xl">
                <div className="mb-5 flex items-center gap-2 text-lg font-bold text-white">
                  <MapPin className="h-5 w-5 text-violet-400" />
                  Uso por contexto
                </div>
                <p className="mb-5 text-xs text-slate-400">
                  Escolha qual chave PIX será usada em cada canal. Se não definir, o sistema usa
                  o comportamento padrão atual (fallback).
                </p>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Delivery */}
                  <ContextoCard
                    titulo="Delivery"
                    icone={<Truck className="h-4 w-4 text-violet-300" />}
                    origem={form.pixOrigemDelivery}
                    onChangeOrigem={(v) =>
                      setForm((f) => ({ ...f, pixOrigemDelivery: v }))
                    }
                    localId={form.pixLocalCobrancaDeliveryId}
                    onChangeLocal={(id) =>
                      setForm((f) => ({ ...f, pixLocalCobrancaDeliveryId: id }))
                    }
                    locais={locaisAtivosComChave}
                  />

                  {/* PDV */}
                  <ContextoCard
                    titulo="PDV"
                    icone={<CreditCard className="h-4 w-4 text-violet-300" />}
                    origem={form.pixOrigemPdv}
                    onChangeOrigem={(v) =>
                      setForm((f) => ({ ...f, pixOrigemPdv: v }))
                    }
                    localId={form.pixLocalCobrancaPdvId}
                    onChangeLocal={(id) =>
                      setForm((f) => ({ ...f, pixLocalCobrancaPdvId: id }))
                    }
                    locais={locaisAtivosComChave}
                  />
                </div>
              </section>

              {/* Bloco — Webhook */}
              <section className="rounded-2xl border border-white/10 bg-[#0b1324]/90 p-6 shadow-xl">
                <div className="mb-5 flex items-center gap-2 text-lg font-bold text-white">
                  <Globe className="h-5 w-5 text-violet-400" />
                  Webhook PIX
                </div>
                <p className="mb-4 text-xs text-slate-400">
                  Registre a URL onde o PSP enviará as notificações de pagamento. Em produção, é
                  obrigatório usar HTTPS.
                </p>

                <div className="grid gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                      URL do webhook
                    </label>
                    <input
                      type="text"
                      value={webhookUrlInput}
                      onChange={(ev) => setWebhookUrlInput(ev.target.value)}
                      placeholder="https://seu-dominio.com/api/webhooks/pix/efi"
                      className="w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm outline-none ring-violet-500/30 focus:ring-2"
                    />
                    {!form.pixSandbox && (
                      <p className="mt-1.5 text-[11px] text-amber-300">
                        Produção exige HTTPS válido.
                      </p>
                    )}
                  </div>

                  {webhookInfo && (
                    <div
                      className={`rounded-xl border px-4 py-3 text-xs ${
                        webhookInfo.registrado
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                      }`}
                    >
                      {webhookInfo.registrado ? (
                        <>
                          <p className="font-bold">Webhook registrado</p>
                          <p className="mt-1 text-emerald-100/80">{webhookInfo.webhookUrl}</p>
                          {webhookInfo.criadoEm && (
                            <p className="mt-1 text-[10px] text-emerald-100/60">
                              Criado em: {webhookInfo.criadoEm}
                            </p>
                          )}
                        </>
                      ) : (
                        <p>{webhookInfo.mensagem ?? 'Nenhum webhook registrado para esta chave PIX.'}</p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void registrarWebhook()}
                      disabled={registrandoWebhook}
                      className="inline-flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/15 px-4 py-2.5 text-sm font-bold text-violet-100 transition hover:bg-violet-500/25 disabled:opacity-50"
                    >
                      {registrandoWebhook ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Registrar webhook
                    </button>
                    <button
                      type="button"
                      onClick={() => void consultarWebhook()}
                      disabled={consultandoWebhook}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 disabled:opacity-50"
                    >
                      {consultandoWebhook ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCcw className="h-4 w-4" />
                      )}
                      Consultar webhook atual
                    </button>
                  </div>
                </div>
              </section>

              {/* Bloco 4 — Ações */}
              <section className="space-y-3 rounded-2xl border border-white/10 bg-[#0b1324]/90 p-5 shadow-xl">
                {testeResultado && (
                  <div
                    className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
                      testeResultado.ok
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                        : 'border-red-500/30 bg-red-500/10 text-red-100'
                    }`}
                  >
                    {testeResultado.ok ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4" />
                    )}
                    <div className="flex-1">
                      <p className="font-bold">
                        {testeResultado.ok ? 'Conexão validada' : 'Falha na conexão'}{' '}
                        <span className="ml-2 text-[10px] font-normal text-white/60">
                          {testeResultado.ambiente}
                        </span>
                      </p>
                      <p className="mt-1 text-xs opacity-90">{testeResultado.mensagem}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => void testarConexao()}
                    disabled={testandoConexao}
                    className="inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm font-bold text-violet-200 transition hover:bg-violet-500/20 disabled:opacity-50"
                  >
                    {testandoConexao ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Activity className="h-4 w-4" />
                    )}
                    Testar conexão
                  </button>
                  <button
                    type="button"
                    onClick={() => void salvar()}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-bold text-white shadow-[0_10px_32px_rgba(124,58,237,0.4)] transition hover:brightness-110 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Salvar configuração
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

interface ContextoCardProps {
  titulo: string;
  icone: React.ReactNode;
  origem: PixOrigemContexto | null;
  onChangeOrigem: (v: PixOrigemContexto | null) => void;
  localId: string | null;
  onChangeLocal: (id: string | null) => void;
  locais: PixLocalCobrancaItem[];
}

function ContextoCard(props: ContextoCardProps): JSX.Element {
  const { titulo, icone, origem, onChangeOrigem, localId, onChangeLocal, locais } = props;

  return (
    <div className="rounded-xl border border-white/10 bg-[#08101f] p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white/85">
        {icone}
        {titulo}
      </div>
      <div className="space-y-3">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-[#0b1324] p-3 transition hover:border-violet-500/30">
          <input
            type="radio"
            name={`origem-${titulo}`}
            checked={origem === 'LOJA'}
            onChange={() => onChangeOrigem('LOJA')}
            className="mt-1 accent-violet-500"
          />
          <div>
            <p className="text-sm font-semibold text-white">Configuração da loja</p>
            <p className="text-xs text-slate-400">Usa o PSP profissional configurado acima.</p>
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-[#0b1324] p-3 transition hover:border-violet-500/30">
          <input
            type="radio"
            name={`origem-${titulo}`}
            checked={origem === 'LOCAL_COBRANCA'}
            onChange={() => onChangeOrigem('LOCAL_COBRANCA')}
            className="mt-1 accent-violet-500"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Local de Cobrança</p>
            <p className="text-xs text-slate-400">
              Usa a chave PIX cadastrada em um adquirente / local de cobrança.
            </p>
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/5 bg-transparent p-3 transition hover:border-white/10">
          <input
            type="radio"
            name={`origem-${titulo}`}
            checked={origem === null}
            onChange={() => onChangeOrigem(null)}
            className="mt-1 accent-slate-500"
          />
          <div>
            <p className="text-sm font-semibold text-slate-300">Padrão do sistema</p>
            <p className="text-xs text-slate-500">Mantém o comportamento atual (fallback).</p>
          </div>
        </label>

        {origem === 'LOCAL_COBRANCA' && (
          <div className="mt-2">
            <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
              Selecione o local
            </label>
            <select
              value={localId ?? ''}
              onChange={(ev) => onChangeLocal(ev.target.value || null)}
              className="w-full rounded-xl border border-white/10 bg-[#0b1324] px-4 py-2.5 text-sm outline-none ring-violet-500/30 focus:ring-2"
            >
              <option value="">Selecione…</option>
              {locais.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome} — {l.chavePixMascarada ?? 'sem chave'}
                </option>
              ))}
            </select>
            {locais.length === 0 && (
              <p className="mt-1.5 text-[11px] text-amber-300">
                Nenhum local de cobrança ativo com chave PIX. Cadastre um adquirente com chave PIX
                primeiro.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
