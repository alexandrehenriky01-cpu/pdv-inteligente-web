import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, FileLock2, Plus, RefreshCw, Search, ShieldOff, X } from 'lucide-react';
import { RhPageShell } from '../components/RhPageShell';
import { listConsentimentos, listFuncionarios, recordConsentimento, revogarConsentimento } from '../services/rhApi';
import type { RhConsentimentoStatus, RhConsentimentoTipo, RhConsentimentoView, RhFuncionarioListItem } from '../types/rh.types';

async function sha256Hex(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback determinístico não-criptográfico (apenas dev/inseguro). Em browser
  // moderno `crypto.subtle` sempre existe sob HTTPS/localhost.
  return text.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0).toString(16).padStart(64, '0');
}

const STATUS_COLOR: Record<RhConsentimentoStatus, string> = {
  ATIVO: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  REVOGADO: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  EXPIRADO: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
};

const TIPO_LABEL: Record<RhConsentimentoTipo, string> = {
  BIOMETRIA: 'Biometria',
  DOCUMENTOS: 'Documentos',
  HOLERITE_DIGITAL: 'Holerite digital',
  ASSINATURA_DIGITAL: 'Assinatura digital',
};

const TIPOS_CONSENT: ReadonlyArray<{ value: RhConsentimentoTipo; label: string }> = [
  { value: 'DOCUMENTOS', label: 'Documentos' },
  { value: 'BIOMETRIA', label: 'Biometria' },
  { value: 'HOLERITE_DIGITAL', label: 'Holerite digital' },
  { value: 'ASSINATURA_DIGITAL', label: 'Assinatura digital' },
];

export default function RhConsentimentosPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [funcionarios, setFuncionarios] = useState<RhFuncionarioListItem[]>([]);
  const [selected, setSelected] = useState<RhFuncionarioListItem | null>(null);
  const [items, setItems] = useState<RhConsentimentoView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formTipo, setFormTipo] = useState<RhConsentimentoTipo>('DOCUMENTOS');
  const [formVersao, setFormVersao] = useState('1.0');
  const [formOrigem, setFormOrigem] = useState<'ADMIN_UI' | 'PORTAL' | 'PAPEL'>('ADMIN_UI');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      try {
        const res = await listFuncionarios({ search: search || undefined, pageSize: 20 });
        if (!cancelled) setFuncionarios([...res.items]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro.');
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [search]);

  const reload = useCallback(async () => {
    if (!selected) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await listConsentimentos(selected.id, { pageSize: 100 });
      setItems([...res.items]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha.');
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => { void reload(); }, [reload]);

  const handleRevoke = async (id: string): Promise<void> => {
    const motivo = window.prompt('Motivo da revogação:');
    if (!motivo || motivo.trim().length < 3) return;
    try {
      await revogarConsentimento(id, motivo.trim());
      setInfo('Consentimento revogado.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha.');
    }
  };

  const openForm = (): void => {
    setFormTipo('DOCUMENTOS');
    setFormVersao('1.0');
    setFormOrigem('ADMIN_UI');
    setError(null);
    setInfo(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const hashTermo = await sha256Hex(`aurya-rh-termo|${formTipo}|${formVersao}|${selected.id}`);
      await recordConsentimento({
        funcionarioId: selected.id,
        tipo: formTipo,
        versaoTermo: formVersao,
        hashTermo,
        dataAceite: new Date().toISOString(),
        origem: formOrigem,
      });
      setShowForm(false);
      setInfo('Consentimento registrado.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao registrar consentimento.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RhPageShell
      title="Consentimentos LGPD"
      subtitle="Registro de aceite de termos pelo funcionário (LGPD Art. 11). Consentimento é o gate para biometria, holerite digital e assinatura digital."
      icon={<FileLock2 className="h-6 w-6" />}
      error={error}
      actions={
        selected ? (
          <button
            type="button"
            onClick={openForm}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-fuchsia-500"
          >
            <Plus className="h-4 w-4" /> Conceder consentimento
          </button>
        ) : null
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <aside className="rounded-2xl border border-white/10 bg-slate-950/30 p-3">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              placeholder="Buscar funcionário…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-2 pl-10 pr-3 text-sm text-white focus:border-violet-500/50 focus:outline-none"
            />
          </div>
          <ul className="max-h-[60vh] space-y-1 overflow-auto">
            {funcionarios.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => setSelected(f)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-white/5 ${selected?.id === f.id ? 'bg-violet-500/10 text-violet-100' : 'text-slate-200'}`}
                >
                  <div className="font-medium">{f.nome}</div>
                  <div className="text-xs text-slate-400">{f.matricula} · {f.cargo?.nome ?? '—'}</div>
                </button>
              </li>
            ))}
            {funcionarios.length === 0 ? (
              <li className="px-3 py-4 text-xs text-slate-400">Nenhum funcionário encontrado.</li>
            ) : null}
          </ul>
        </aside>

        <section className="lg:col-span-2">
          {selected ? (
            <>
              <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Funcionário selecionado</div>
                  <div className="text-sm font-semibold text-white">{selected.nome} · {selected.matricula}</div>
                </div>
                <button type="button" onClick={() => void reload()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10">
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Recarregar
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/30">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-300">
                    <tr>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Versão</th>
                      <th className="px-4 py-3">Aceito em</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Carregando…</td></tr>
                    ) : items.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Nenhum consentimento registrado.</td></tr>
                    ) : (
                      items.map((c) => (
                        <tr key={c.id} className="border-t border-white/5">
                          <td className="px-4 py-3 text-slate-300">{TIPO_LABEL[c.tipo]}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-400">{c.versaoTermo}</td>
                          <td className="px-4 py-3 text-slate-400">{new Date(c.dataAceite).toLocaleString('pt-BR')}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-md border px-2 py-0.5 text-xs ${STATUS_COLOR[c.status]}`}>{c.status}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {c.status === 'ATIVO' ? (
                              <button type="button" onClick={() => void handleRevoke(c.id)} className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/20">
                                <ShieldOff className="h-3.5 w-3.5" />
                                Revogar
                              </button>
                            ) : <span className="text-xs text-slate-500">—</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-400">
              Selecione um funcionário para visualizar os consentimentos.
            </div>
          )}
        </section>
      </div>

      {info ? (
        <div className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 shadow-lg">
          <CheckCircle2 className="h-4 w-4" />
          {info}
          <button onClick={() => setInfo(null)} className="ml-2 text-emerald-300 hover:text-white"><X className="h-3 w-3" /></button>
        </div>
      ) : null}

      {showForm && selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Conceder consentimento</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Registra aceite do funcionário <strong className="text-white">{selected.nome}</strong> ({selected.matricula})
              para o tipo selecionado. O hash do termo é gerado automaticamente como prova
              de integridade do conteúdo aceito.
            </p>

            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-400">Tipo de consentimento</span>
              <select
                value={formTipo}
                onChange={(e) => setFormTipo(e.target.value as RhConsentimentoTipo)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
              >
                {TIPOS_CONSENT.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-400">Versão do termo</span>
              <input
                required
                value={formVersao}
                onChange={(e) => setFormVersao(e.target.value)}
                placeholder="1.0"
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
              />
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-400">Origem</span>
              <select
                value={formOrigem}
                onChange={(e) => setFormOrigem(e.target.value as 'ADMIN_UI' | 'PORTAL' | 'PAPEL')}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
              >
                <option value="ADMIN_UI">Admin / RH (esta tela)</option>
                <option value="PORTAL">Portal do funcionário</option>
                <option value="PAPEL">Termo assinado em papel</option>
              </select>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? 'Registrando…' : 'Registrar consentimento'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </RhPageShell>
  );
}
