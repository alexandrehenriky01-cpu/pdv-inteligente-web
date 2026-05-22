import { useEffect, useState } from 'react';
import { Fingerprint, IdCard, QrCode, ArrowRight, CheckCircle2, AlertTriangle, ScanFace } from 'lucide-react';
import { getPontoConfig, totemAutenticar, totemMarcar, type PontoConfigView } from '../services/pontoApi';
import type { RhMetodoAutenticacao, RhTipoMarcacao } from '../types/ponto.types';
import {
  matchAtAgent,
  resolverMatricula,
  totemMarcarBiometria,
} from '../../rh-biometry/services/rhBiometryApi';
import { getAgentBridge } from '../../rh-biometry-lab/services/biometryLabApi';
import { TotemFacialFlow } from './TotemFacialFlow';

/// UI-only union; o backend continua só conhecendo RhMetodoAutenticacao.
type MetodoUI = RhMetodoAutenticacao | 'FACIAL';

type Step = 'idle' | 'auth' | 'tipo' | 'enviando' | 'sucesso' | 'erro';

interface FuncSelecionado {
  readonly id: string;
  readonly nome: string;
  readonly matricula: string;
  readonly metodo: RhMetodoAutenticacao;
}

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';

export default function TotemRhPage(): JSX.Element {
  const [step, setStep] = useState<Step>('idle');
  const [metodo, setMetodo] = useState<MetodoUI>('PIN');
  const [config, setConfig] = useState<PontoConfigView | null>(null);
  const [matricula, setMatricula] = useState('');
  const [pin, setPin] = useState('');
  const [qrToken, setQrToken] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [funcionario, setFuncionario] = useState<FuncSelecionado | null>(null);
  const [comprovante, setComprovante] = useState<{ codigo: string; tipo: string; hora: string; nome: string } | null>(null);
  const [agora, setAgora] = useState(new Date());
  const [labToken, setLabToken] = useState<string>(() => sessionStorage.getItem('rh-biometry-lab-token') ?? '');
  const [bioState, setBioState] = useState<'aguardando_dedo' | 'verificando' | 'ok' | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setAgora(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Sprint 7.6: carrega config no mount e auto-seleciona o primeiro método habilitado.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const c = await getPontoConfig();
        if (cancelled) return;
        setConfig(c);
        const ordem: ReadonlyArray<{ on: boolean; m: MetodoUI }> = [
          { on: c.totemFacialHabilitado, m: 'FACIAL' },
          { on: c.totemPinHabilitado, m: 'PIN' },
          { on: c.totemQrHabilitado, m: 'QR' },
          { on: c.totemBiometriaHabilitado, m: 'BIOMETRIA' },
        ];
        const primeiro = ordem.find((x) => x.on);
        if (primeiro) setMetodo(primeiro.m);
      } catch {
        // Sem config (offline ou backend down): default — todos habilitados.
        if (!cancelled) setConfig({
          id: '-', lojaId: '-',
          totemPinHabilitado: true, totemQrHabilitado: true,
          totemBiometriaHabilitado: true, totemFacialHabilitado: true,
          updatedAt: new Date().toISOString(),
        });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const reset = (): void => {
    setStep('idle');
    setMatricula('');
    setPin('');
    setQrToken('');
    setErro(null);
    setFuncionario(null);
    setComprovante(null);
    setBioState(null);
  };

  useEffect(() => {
    sessionStorage.setItem('rh-biometry-lab-token', labToken);
  }, [labToken]);

  const autenticar = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErro(null);
    setStep('auth');
    try {
      // Path FACIAL não passa por este handler — TotemFacialFlow é renderizado direto.
      if (metodo === 'FACIAL') return;
      if (metodo === 'BIOMETRIA') {
        const r = await resolverMatricula(matricula);
        setFuncionario({ ...r.funcionario, metodo });
        setStep('tipo');
        return;
      }
      const identificador = metodo === 'QR' ? qrToken : matricula;
      const result = await totemAutenticar({
        identificador,
        metodo,
        pin: metodo === 'QR' ? undefined : pin,
        timezone: TZ,
        timestampDispositivo: new Date().toISOString(),
      });
      setFuncionario({ ...result.funcionario, metodo });
      setStep('tipo');
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Falha de autenticação.';
      setErro(m);
      setStep('erro');
    }
  };

  const marcar = async (tipo: RhTipoMarcacao): Promise<void> => {
    if (!funcionario) return;
    setStep('enviando');
    setErro(null);
    try {
      if (funcionario.metodo === 'BIOMETRIA') {
        if (!labToken) {
          throw new Error('Token do agent não configurado. Fale com o administrador.');
        }
        setBioState('aguardando_dedo');
        const bridge = await getAgentBridge();
        const match = await matchAtAgent(bridge.agentBaseUrl, labToken, {
          funcionarioOpaqueId: funcionario.id,
          timeoutSeconds: 15,
        });
        if (!match.matched || !match.attestation) {
          throw new Error(`Biometria não confere (${match.reason ?? 'sem motivo'}). Tente PIN/QR.`);
        }
        setBioState('verificando');
        const r = await totemMarcarBiometria({
          attestation: match.attestation,
          funcionarioId: funcionario.id,
          tipoMarcacao: tipo,
          timezone: TZ,
        });
        setBioState('ok');
        setComprovante({
          codigo: r.marcacao.codigoComprovante,
          tipo: r.marcacao.tipoMarcacao,
          hora: r.marcacao.timestampServidor,
          nome: r.funcionario.nome,
        });
        setStep('sucesso');
        window.setTimeout(reset, 8000);
        return;
      }

      const r = await totemMarcar({
        funcionarioId: funcionario.id,
        tipoMarcacao: tipo,
        metodoAutenticacao: funcionario.metodo,
        origem: 'TOTEM',
        timezone: TZ,
      });
      setComprovante({
        codigo: r.comprovante.codigo,
        tipo: r.comprovante.payload.marcacao.tipoMarcacao,
        hora: r.comprovante.payload.marcacao.timestampServidor,
        nome: r.comprovante.payload.funcionario.nome,
      });
      setStep('sucesso');
      window.setTimeout(reset, 8000);
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Falha ao registrar.';
      setErro(m);
      setStep('erro');
      setBioState(null);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-[#060816] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.16),transparent_55%)]" />

      <header className="relative z-10 flex items-center justify-between p-6">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-violet-300">Aurya · RH</div>
          <div className="mt-1 text-3xl font-bold">Totem de Ponto</div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold tabular-nums text-violet-200">
            {agora.toLocaleTimeString('pt-BR')}
          </div>
          <div className="text-xs uppercase tracking-wide text-slate-400">
            {agora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {step === 'idle' || step === 'auth' || step === 'erro' ? (
            <section className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/40 p-8 backdrop-blur-xl">
              <h2 className="text-center text-2xl font-bold">Identifique-se</h2>

              <div className="flex flex-wrap justify-center gap-2">
                {config?.totemFacialHabilitado ? (
                  <MetodoBtn icon={<ScanFace className="h-5 w-5" />} label="Facial" active={metodo === 'FACIAL'} onClick={() => setMetodo('FACIAL')} />
                ) : null}
                {config?.totemPinHabilitado ? (
                  <MetodoBtn icon={<IdCard className="h-5 w-5" />} label="Matrícula + PIN" active={metodo === 'PIN'} onClick={() => setMetodo('PIN')} />
                ) : null}
                {config?.totemQrHabilitado ? (
                  <MetodoBtn icon={<QrCode className="h-5 w-5" />} label="QR Code" active={metodo === 'QR'} onClick={() => setMetodo('QR')} />
                ) : null}
                {config?.totemBiometriaHabilitado ? (
                  <MetodoBtn icon={<Fingerprint className="h-5 w-5" />} label="Biometria" active={metodo === 'BIOMETRIA'} onClick={() => setMetodo('BIOMETRIA')} />
                ) : null}
              </div>

              {metodo === 'FACIAL' ? (
                <TotemFacialFlow onDone={reset} />
              ) : (
              <form onSubmit={(e) => void autenticar(e)} className="space-y-4" autoComplete="off">
                {metodo === 'QR' ? (
                  <label className="block">
                    <span className="text-xs uppercase tracking-wide text-slate-400">Token QR</span>
                    <input
                      required
                      autoFocus
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      name="aurya-rh-totem-qr"
                      value={qrToken}
                      onChange={(e) => setQrToken(e.target.value)}
                      placeholder="rhqrv1...."
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-lg text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:outline-none"
                    />
                  </label>
                ) : metodo === 'BIOMETRIA' ? (
                  <>
                    <label className="block">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Matrícula</span>
                      <input
                        required
                        autoFocus
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        name="aurya-rh-totem-matricula"
                        value={matricula}
                        onChange={(e) => setMatricula(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-lg text-white focus:border-violet-500/50 focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs uppercase tracking-wide text-slate-400">X-Lab-Token (Agent)</span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        autoCorrect="off"
                        spellCheck={false}
                        name="aurya-rh-totem-labtoken"
                        value={labToken}
                        onChange={(e) => setLabToken(e.target.value)}
                        placeholder="Token compartilhado do AuryaRhAgent"
                        className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 font-mono text-xs text-white focus:border-violet-500/50 focus:outline-none"
                      />
                    </label>
                    <p className="text-xs text-slate-400">Após digitar a matrícula, coloque o dedo no leitor. A senha PIN será dispensada.</p>
                  </>
                ) : (
                  <>
                    <label className="block">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Matrícula</span>
                      <input
                        required
                        autoFocus
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        name="aurya-rh-totem-matricula"
                        value={matricula}
                        onChange={(e) => setMatricula(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-lg text-white focus:border-violet-500/50 focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs uppercase tracking-wide text-slate-400">PIN (4-6 dígitos)</span>
                      <input
                        required
                        type="password"
                        inputMode="numeric"
                        pattern="\d{4,6}"
                        maxLength={6}
                        autoComplete="new-password"
                        autoCorrect="off"
                        spellCheck={false}
                        name="aurya-rh-totem-pin"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-center text-2xl tracking-[0.6em] text-white focus:border-violet-500/50 focus:outline-none"
                      />
                    </label>
                  </>
                )}

                {erro ? (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
                    <AlertTriangle className="h-4 w-4" />
                    {erro}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={step === 'auth'}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 text-lg font-semibold shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50"
                >
                  {step === 'auth' ? 'Validando…' : (
                    <>
                      Continuar <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>
              )}
            </section>
          ) : null}

          {step === 'tipo' && funcionario ? (
            <section className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/40 p-8 backdrop-blur-xl">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">Olá,</div>
                <div className="mt-1 text-3xl font-bold">{funcionario.nome}</div>
                <div className="text-sm text-slate-400">{funcionario.matricula} · autenticado por {funcionario.metodo}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TipoBtn label="Entrada" tipo="ENTRADA" onClick={() => void marcar('ENTRADA')} />
                <TipoBtn label="Saída" tipo="SAIDA" onClick={() => void marcar('SAIDA')} />
                <TipoBtn label="Início Intervalo" tipo="INICIO_INTERVALO" onClick={() => void marcar('INICIO_INTERVALO')} />
                <TipoBtn label="Fim Intervalo" tipo="FIM_INTERVALO" onClick={() => void marcar('FIM_INTERVALO')} />
              </div>
              <button onClick={reset} className="w-full rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">
                Cancelar
              </button>
            </section>
          ) : null}

          {step === 'enviando' ? (
            <section className="rounded-3xl border border-white/10 bg-slate-900/40 p-12 text-center backdrop-blur-xl">
              <Fingerprint className="mx-auto h-16 w-16 animate-pulse text-violet-300" />
              <p className="mt-4 text-lg text-slate-300">
                {bioState === 'aguardando_dedo'
                  ? 'Coloque o dedo no leitor…'
                  : bioState === 'verificando'
                  ? 'Registrando marcação biométrica…'
                  : 'Registrando…'}
              </p>
            </section>
          ) : null}

          {step === 'sucesso' && comprovante ? (
            <section className="space-y-4 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center backdrop-blur-xl">
              <CheckCircle2 className="mx-auto h-20 w-20 text-emerald-300" />
              <div>
                <div className="text-2xl font-bold text-white">Ponto registrado!</div>
                <div className="mt-1 text-emerald-200">{comprovante.nome}</div>
                <div className="mt-2 text-sm text-emerald-100">{comprovante.tipo} · {new Date(comprovante.hora).toLocaleString('pt-BR')}</div>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-black/30 p-3 font-mono text-xs text-emerald-200">
                Comprovante: {comprovante.codigo}
              </div>
              <div className="text-xs text-slate-400">Voltando ao início em alguns segundos…</div>
            </section>
          ) : null}
        </div>
      </main>

      <footer className="relative z-10 p-4 text-center text-xs text-slate-500">
        Aurya RH · Totem de Ponto · PIN, QR e Biometria.
      </footer>
    </div>
  );
}

function MetodoBtn(props: { icon: JSX.Element; label: string; active: boolean; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm transition ${
        props.active
          ? 'border-violet-500/40 bg-violet-500/15 text-violet-100'
          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
      }`}
    >
      {props.icon}
      {props.label}
    </button>
  );
}

function TipoBtn(props: { label: string; tipo: RhTipoMarcacao; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-600/40 to-fuchsia-600/30 px-4 py-6 text-lg font-semibold text-white hover:from-violet-500/50 hover:to-fuchsia-500/40"
    >
      {props.label}
    </button>
  );
}
