import { useCallback, useEffect, useState } from 'react';
import {
  User2, Clock, Wallet, FileText, ShieldCheck, FileSignature, Fingerprint, RefreshCw, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { RhPageShell } from '../../rh/components/RhPageShell';
import {
  meuPerfil, minhasMarcacoes, meuBancoHoras, meusFechamentos, minhasJustificativas,
  meusConsentimentos, minhaBiometria, meusComprovantes, assinarMeuFechamento,
  type PortalFuncionario, type PortalMarcacao, type PortalBancoHorasLanc, type PortalFechamento,
  type PortalJustificativa, type PortalConsentimento, type PortalBiometria, type PortalComprovanteResumo,
} from '../services/rhPortalApi';

type TabKey = 'perfil' | 'marcacoes' | 'banco' | 'fechamentos' | 'justificativas' | 'consentimentos' | 'biometria' | 'comprovantes';

const TABS: ReadonlyArray<{ key: TabKey; label: string; icon: JSX.Element }> = [
  { key: 'perfil',         label: 'Meu perfil',        icon: <User2 className="h-4 w-4" /> },
  { key: 'marcacoes',      label: 'Marcações',         icon: <Clock className="h-4 w-4" /> },
  { key: 'banco',          label: 'Banco horas',       icon: <Wallet className="h-4 w-4" /> },
  { key: 'fechamentos',    label: 'Fechamentos',       icon: <FileSignature className="h-4 w-4" /> },
  { key: 'justificativas', label: 'Justificativas',    icon: <FileText className="h-4 w-4" /> },
  { key: 'consentimentos', label: 'Consentimentos',    icon: <ShieldCheck className="h-4 w-4" /> },
  { key: 'biometria',      label: 'Biometria',         icon: <Fingerprint className="h-4 w-4" /> },
  { key: 'comprovantes',   label: 'Comprovantes',      icon: <FileText className="h-4 w-4" /> },
];

function fmtMin(min: number): string {
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${min < 0 ? '-' : ''}${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}m`;
}

export default function RhPortalPage(): JSX.Element {
  const [tab, setTab] = useState<TabKey>('perfil');
  const [funcionario, setFuncionario] = useState<PortalFuncionario | null>(null);
  const [marcacoes, setMarcacoes] = useState<PortalMarcacao[]>([]);
  const [banco, setBanco] = useState<{ saldoMinutos: number; lancamentos: PortalBancoHorasLanc[] } | null>(null);
  const [fechamentos, setFechamentos] = useState<PortalFechamento[]>([]);
  const [justificativas, setJustificativas] = useState<PortalJustificativa[]>([]);
  const [consentimentos, setConsentimentos] = useState<PortalConsentimento[]>([]);
  const [biometria, setBiometria] = useState<PortalBiometria[]>([]);
  const [comprovantes, setComprovantes] = useState<PortalComprovanteResumo[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(async (alvo: TabKey) => {
    setBusy(true);
    setErro(null);
    try {
      if (alvo === 'perfil') {
        const r = await meuPerfil();
        setFuncionario(r.funcionario);
      } else if (alvo === 'marcacoes') {
        const r = await minhasMarcacoes({ pageSize: 100 });
        setMarcacoes(r.items);
        setFuncionario(r.funcionario);
      } else if (alvo === 'banco') {
        const r = await meuBancoHoras();
        setBanco({ saldoMinutos: r.saldoMinutos, lancamentos: r.lancamentos });
        setFuncionario(r.funcionario);
      } else if (alvo === 'fechamentos') {
        const r = await meusFechamentos();
        setFechamentos(r.items);
        setFuncionario(r.funcionario);
      } else if (alvo === 'justificativas') {
        const r = await minhasJustificativas();
        setJustificativas(r.items);
        setFuncionario(r.funcionario);
      } else if (alvo === 'consentimentos') {
        const r = await meusConsentimentos();
        setConsentimentos(r.items);
        setFuncionario(r.funcionario);
      } else if (alvo === 'biometria') {
        const r = await minhaBiometria();
        setBiometria(r.items);
        setFuncionario(r.funcionario);
      } else if (alvo === 'comprovantes') {
        const r = await meusComprovantes();
        setComprovantes(r.items);
        setFuncionario(r.funcionario);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao carregar.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void carregar(tab); }, [tab, carregar]);

  const assinar = async (fechamentoId: string): Promise<void> => {
    setBusy(true);
    setErro(null);
    try {
      await assinarMeuFechamento(fechamentoId);
      const r = await meusFechamentos();
      setFechamentos(r.items);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao assinar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <RhPageShell
      title="Portal do Funcionário"
      subtitle={funcionario ? `${funcionario.matricula} · ${funcionario.nome}` : 'Acesse seus dados de ponto, banco de horas e fechamentos.'}
      icon={<User2 className="h-6 w-6" />}
      onRefresh={() => void carregar(tab)}
      loading={busy}
      error={erro}
    >
      <div className="space-y-4">
        <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                tab === t.key
                  ? 'border-violet-500/50 bg-violet-500/15 text-violet-100'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'perfil' && funcionario ? (
          <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Matrícula" value={funcionario.matricula} />
              <Field label="Nome" value={funcionario.nome} />
              <Field label="CPF" value={funcionario.cpf} />
              <Field label="Admissão" value={new Date(funcionario.dataAdmissao).toLocaleDateString('pt-BR')} />
            </div>
          </section>
        ) : null}

        {tab === 'marcacoes' ? (
          <section className="overflow-hidden rounded-2xl border border-white/10">
            <table className="min-w-full text-sm text-slate-200">
              <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Data/Hora</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Método</th>
                  <th className="px-3 py-2 text-left">Origem</th>
                  <th className="px-3 py-2 text-left">Comprovante</th>
                </tr>
              </thead>
              <tbody>
                {marcacoes.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-4 text-center text-xs text-slate-500">Sem marcações.</td></tr>
                ) : (
                  marcacoes.map((m) => (
                    <tr key={m.id} className="border-t border-white/5">
                      <td className="px-3 py-2 font-mono text-xs">{new Date(m.timestampServidor).toLocaleString('pt-BR')}</td>
                      <td className="px-3 py-2 text-xs">{m.tipoMarcacao}</td>
                      <td className="px-3 py-2 text-xs">{m.metodoAutenticacao}</td>
                      <td className="px-3 py-2 text-xs">{m.origem}</td>
                      <td className="px-3 py-2 font-mono text-xs text-violet-300">{m.codigoComprovante}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        ) : null}

        {tab === 'banco' && banco ? (
          <section className="space-y-3">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
              <div className="text-xs uppercase tracking-wide">Saldo atual</div>
              <div className="text-3xl font-bold">{fmtMin(banco.saldoMinutos)}</div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <table className="min-w-full text-sm text-slate-200">
                <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-right">Minutos</th>
                    <th className="px-3 py-2 text-left">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {banco.lancamentos.map((l) => (
                    <tr key={l.id} className="border-t border-white/5">
                      <td className="px-3 py-2 text-xs">{new Date(l.dataReferencia).toLocaleDateString('pt-BR')}</td>
                      <td className="px-3 py-2 text-xs">{l.tipo}</td>
                      <td className={`px-3 py-2 text-right font-mono text-xs ${l.minutos >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{fmtMin(l.minutos)}</td>
                      <td className="px-3 py-2 text-xs">{l.observacao ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {tab === 'fechamentos' ? (
          <section className="space-y-3">
            {fechamentos.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 text-sm text-slate-400">Sem fechamentos disponíveis.</div>
            ) : (
              fechamentos.map((f) => {
                const minhaAss = f.assinaturas.find((a) => a.tipoAssinatura === 'FUNCIONARIO' && a.versaoFechamento === f.versao);
                const podeAssinar = (f.status === 'FECHADO' || f.status === 'ASSINADO') && !minhaAss;
                return (
                  <div key={f.id} className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{String(f.mes).padStart(2, '0')}/{f.ano} <span className="ml-2 rounded bg-violet-500/20 px-2 py-0.5 text-xs text-violet-200">v{f.versao}</span></div>
                        <div className="text-xs text-slate-400">{f.status} · {fmtMin(f.totalHorasMinutos)} trabalhadas · {fmtMin(f.totalExtrasMinutos)} extras · saldo {fmtMin(f.saldoBancoMinutos)}</div>
                        {f.hashDocumento ? <div className="mt-1 font-mono text-[10px] text-slate-500">hash {f.hashDocumento.slice(0, 24)}…</div> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        {minhaAss ? (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200"><CheckCircle2 className="h-3 w-3" /> Você assinou</span>
                        ) : null}
                        {podeAssinar ? (
                          <button
                            onClick={() => void assinar(f.id)}
                            disabled={busy}
                            className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-xs font-semibold text-white hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50"
                          >
                            Assinar
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {f.assinaturas.length > 0 ? (
                      <div className="mt-3 border-t border-white/5 pt-3 text-xs text-slate-400">
                        {f.assinaturas.map((a) => (
                          <div key={a.id} className="flex items-center justify-between">
                            <span><strong className="text-slate-200">{a.tipoAssinatura}</strong> · v{a.versaoFechamento} · {new Date(a.signedAt).toLocaleString('pt-BR')}</span>
                            <span className="font-mono text-[10px] text-slate-500">{a.hashAssinatura.slice(0, 16)}…</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </section>
        ) : null}

        {tab === 'justificativas' ? (
          <section className="overflow-hidden rounded-2xl border border-white/10">
            <table className="min-w-full text-sm text-slate-200">
              <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Motivo</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {justificativas.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-4 text-center text-xs text-slate-500">Sem justificativas.</td></tr>
                ) : (
                  justificativas.map((j) => (
                    <tr key={j.id} className="border-t border-white/5">
                      <td className="px-3 py-2 text-xs">{new Date(j.dataReferencia).toLocaleDateString('pt-BR')}</td>
                      <td className="px-3 py-2 text-xs">{j.tipoJustificativa}</td>
                      <td className="px-3 py-2 text-xs">{j.motivo}</td>
                      <td className="px-3 py-2 text-xs">{j.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        ) : null}

        {tab === 'consentimentos' ? (
          <section className="space-y-2">
            {consentimentos.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 text-sm text-slate-400">Sem consentimentos registrados.</div>
            ) : (
              consentimentos.map((c) => (
                <div key={c.id} className="rounded-xl border border-white/10 bg-slate-900/40 p-3 text-sm text-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{c.tipo} <span className="ml-2 text-xs text-slate-400">v{c.versaoTermo}</span></div>
                    <span className={`rounded-lg px-2 py-0.5 text-xs ${c.status === 'ATIVO' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'}`}>{c.status}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Aceite: {new Date(c.dataAceite).toLocaleString('pt-BR')}
                    {c.revokedAt ? ` · Revogado: ${new Date(c.revokedAt).toLocaleString('pt-BR')}` : ''}
                  </div>
                </div>
              ))
            )}
          </section>
        ) : null}

        {tab === 'biometria' ? (
          <section className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm text-violet-100">
            <div className="mb-3 flex items-start gap-2"><Fingerprint className="mt-0.5 h-4 w-4" /> <span>Templates ficam apenas no PC da loja, cifrados. Aqui só metadados.</span></div>
            {biometria.length === 0 ? (
              <div className="text-slate-400">Nenhum dedo cadastrado.</div>
            ) : (
              <ul className="space-y-1">
                {biometria.map((b) => (
                  <li key={b.id} className="rounded border border-white/10 bg-black/20 p-2 text-xs">
                    <strong>{b.dedoLabel}</strong> · {b.providerHint} · qualidade {b.qualityScore}
                    {' '}· cadastrado em {new Date(b.enrolledAt).toLocaleString('pt-BR')}
                    {b.revokedAt ? <span className="ml-2 text-rose-300">REVOGADO {new Date(b.revokedAt).toLocaleString('pt-BR')}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {tab === 'comprovantes' ? (
          <section className="overflow-hidden rounded-2xl border border-white/10">
            <table className="min-w-full text-sm text-slate-200">
              <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Código</th>
                  <th className="px-3 py-2 text-left">Emitido em</th>
                  <th className="px-3 py-2 text-left">Hash</th>
                </tr>
              </thead>
              <tbody>
                {comprovantes.length === 0 ? (
                  <tr><td colSpan={3} className="px-3 py-4 text-center text-xs text-slate-500">Sem comprovantes.</td></tr>
                ) : (
                  comprovantes.map((c) => (
                    <tr key={c.codigo} className="border-t border-white/5">
                      <td className="px-3 py-2 font-mono text-xs text-violet-300">{c.codigo}</td>
                      <td className="px-3 py-2 text-xs">{new Date(c.emitidoEm).toLocaleString('pt-BR')}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-slate-400">{c.hashIntegridade.slice(0, 24)}…</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        ) : null}
      </div>
    </RhPageShell>
  );
}

function Field(props: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{props.label}</div>
      <div className="mt-1 text-sm text-white">{props.value}</div>
    </div>
  );
}
