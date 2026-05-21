import { useEffect, useState } from 'react';
import { FileText, Search } from 'lucide-react';
import { RhPageShell } from '../components/RhPageShell';
import { RhFuncionarioDocumentos } from '../components/RhFuncionarioDocumentos';
import { listFuncionarios } from '../services/rhApi';
import type { RhFuncionarioListItem } from '../types/rh.types';

export default function RhDocumentosPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [funcionarios, setFuncionarios] = useState<RhFuncionarioListItem[]>([]);
  const [selected, setSelected] = useState<RhFuncionarioListItem | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <RhPageShell
      title="Documentos do funcionário"
      subtitle="Selecione um funcionário para consultar/anexar documentos. O fluxo principal está dentro do cadastro do funcionário; esta página é uma visão consolidada."
      icon={<FileText className="h-6 w-6" />}
      error={error}
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
                  <div className="text-xs text-slate-400">{f.matricula}</div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="lg:col-span-2">
          {selected ? (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">Funcionário</div>
                <div className="text-sm font-semibold text-white">{selected.nome} · {selected.matricula}</div>
              </div>
              <RhFuncionarioDocumentos funcionarioId={selected.id} />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-400">
              Selecione um funcionário para visualizar/anexar documentos.
            </div>
          )}
        </section>
      </div>
    </RhPageShell>
  );
}
