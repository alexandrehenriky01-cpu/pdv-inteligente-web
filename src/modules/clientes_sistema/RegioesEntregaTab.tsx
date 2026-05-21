import { useEffect, useState, type FC } from 'react';
import { toast } from 'react-toastify';
import { Plus, Pencil, Trash2, Loader2, MapPin, X } from 'lucide-react';
import {
  listarRegioes,
  criarRegiao,
  atualizarRegiao,
  excluirRegiao,
  atualizarBloqueioForaDaArea,
  type RegiaoEntrega,
  type RegiaoEntregaInput,
} from '../../services/api/regioesEntregaApi';
import { api } from '../../services/api';

function brl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface RegiaoFormState {
  nome: string;
  bairrosTexto: string;
  cidadesTexto: string;
  taxaEntrega: string;
  pedidoMinimo: string;
  tempoEstimadoMinutos: string;
  ativo: boolean;
}

const FORM_INICIAL: RegiaoFormState = {
  nome: '',
  bairrosTexto: '',
  cidadesTexto: '',
  taxaEntrega: '',
  pedidoMinimo: '',
  tempoEstimadoMinutos: '',
  ativo: true,
};

function regiaoToForm(r: RegiaoEntrega): RegiaoFormState {
  return {
    nome: r.nome,
    bairrosTexto: r.bairros.join(', '),
    cidadesTexto: r.cidades.join(', '),
    taxaEntrega: String(r.taxaEntrega),
    pedidoMinimo: r.pedidoMinimo != null ? String(r.pedidoMinimo) : '',
    tempoEstimadoMinutos: r.tempoEstimadoMinutos != null ? String(r.tempoEstimadoMinutos) : '',
    ativo: r.ativo,
  };
}

function formToInput(f: RegiaoFormState): RegiaoEntregaInput {
  return {
    nome: f.nome.trim(),
    bairros: f.bairrosTexto
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    cidades: f.cidadesTexto
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    taxaEntrega: Number(f.taxaEntrega.replace(',', '.')) || 0,
    pedidoMinimo: f.pedidoMinimo.trim() === '' ? null : Number(f.pedidoMinimo.replace(',', '.')),
    tempoEstimadoMinutos:
      f.tempoEstimadoMinutos.trim() === '' ? null : Number(f.tempoEstimadoMinutos),
    ativo: f.ativo,
  };
}

export const RegioesEntregaTab: FC = () => {
  const [regioes, setRegioes] = useState<RegiaoEntrega[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [bloqueando, setBloqueando] = useState(false);
  const [bloquearForaDaArea, setBloquearForaDaArea] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [edicaoId, setEdicaoId] = useState<string | null>(null);
  const [form, setForm] = useState<RegiaoFormState>(FORM_INICIAL);

  const carregar = async () => {
    setCarregando(true);
    try {
      const [lst, lojaResp] = await Promise.all([
        listarRegioes(),
        api.get<{ bloquearForaDaArea?: boolean }>('/api/lojas/minha-loja'),
      ]);
      setRegioes(lst);
      setBloquearForaDaArea(Boolean(lojaResp.data?.bloquearForaDaArea));
    } catch (err) {
      toast.error('Não foi possível carregar regiões de entrega.');
      console.error('[regioes-entrega] carregar', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, []);

  const abrirNovo = () => {
    setForm(FORM_INICIAL);
    setEdicaoId(null);
    setModalAberto(true);
  };

  const abrirEdicao = (r: RegiaoEntrega) => {
    setForm(regiaoToForm(r));
    setEdicaoId(r.id);
    setModalAberto(true);
  };

  const fechar = () => {
    setModalAberto(false);
    setEdicaoId(null);
    setForm(FORM_INICIAL);
  };

  const salvar = async () => {
    const input = formToInput(form);
    if (!input.nome) {
      toast.error('Nome é obrigatório.');
      return;
    }
    if (input.bairros.length === 0) {
      toast.error('Informe pelo menos um bairro (separe por vírgula).');
      return;
    }
    if (!(input.taxaEntrega >= 0)) {
      toast.error('Taxa de entrega inválida.');
      return;
    }

    setSalvando(true);
    try {
      if (edicaoId) {
        const atualizada = await atualizarRegiao(edicaoId, input);
        setRegioes((prev) => prev.map((r) => (r.id === atualizada.id ? atualizada : r)));
        toast.success(`Região "${atualizada.nome}" atualizada.`);
      } else {
        const nova = await criarRegiao(input);
        setRegioes((prev) => [...prev, nova].sort((a, b) => a.nome.localeCompare(b.nome)));
        toast.success(`Região "${nova.nome}" criada.`);
      }
      fechar();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (err as Error)?.message ??
        'Erro ao salvar.';
      toast.error(msg);
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (r: RegiaoEntrega) => {
    if (!window.confirm(`Excluir a região "${r.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await excluirRegiao(r.id);
      setRegioes((prev) => prev.filter((x) => x.id !== r.id));
      toast.success(`Região "${r.nome}" excluída.`);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Não foi possível excluir.';
      toast.error(msg);
    }
  };

  const alternarBloqueio = async () => {
    const novo = !bloquearForaDaArea;
    setBloqueando(true);
    try {
      const valor = await atualizarBloqueioForaDaArea(novo);
      setBloquearForaDaArea(valor);
      toast.success(
        valor
          ? 'Pedidos fora das regiões serão rejeitados.'
          : 'Pedidos fora das regiões usarão a taxa padrão.'
      );
    } catch (err) {
      toast.error('Não foi possível atualizar a política.');
    } finally {
      setBloqueando(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Política de cobertura
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Quando ativado, pedidos cujo bairro não bate com nenhuma região cadastrada são rejeitados.
              Quando desativado, esses pedidos usam a taxa de entrega padrão da loja.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void alternarBloqueio()}
            disabled={bloqueando || regioes.length === 0}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50 ${
              bloquearForaDaArea ? 'border-violet-500 bg-violet-500/80' : 'border-white/10 bg-white/5'
            }`}
            aria-label="Bloquear pedidos fora da área"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                bloquearForaDaArea ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {regioes.length === 0 && bloquearForaDaArea === false && (
          <p className="mt-3 text-xs text-amber-300">
            Cadastre ao menos uma região abaixo antes de ativar o bloqueio.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Regiões de entrega
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Cada região define uma taxa por bairro, pedido mínimo e tempo estimado.
            </p>
          </div>
          <button
            type="button"
            onClick={abrirNovo}
            className="inline-flex items-center gap-2 rounded-pill bg-violet-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-violet-400 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Nova região
          </button>
        </div>

        {carregando ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : regioes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
            <MapPin className="mb-3 h-8 w-8 text-slate-600" />
            <p className="text-sm">Nenhuma região cadastrada.</p>
            <p className="mt-1 text-xs">A loja continua aceitando pedidos com a taxa padrão.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="pb-3">Nome</th>
                  <th className="pb-3">Bairros</th>
                  <th className="pb-3">Taxa</th>
                  <th className="pb-3">Pedido mín.</th>
                  <th className="pb-3">Tempo</th>
                  <th className="pb-3">Ativo</th>
                  <th className="pb-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {regioes.map((r) => (
                  <tr key={r.id} className="text-slate-200">
                    <td className="py-3 font-semibold">{r.nome}</td>
                    <td className="py-3 text-xs text-slate-400">
                      {r.bairros.slice(0, 3).join(', ')}
                      {r.bairros.length > 3 && <span> +{r.bairros.length - 3}</span>}
                    </td>
                    <td className="py-3 tabular-nums">{brl(r.taxaEntrega)}</td>
                    <td className="py-3 tabular-nums text-slate-400">
                      {r.pedidoMinimo != null ? brl(r.pedidoMinimo) : '—'}
                    </td>
                    <td className="py-3 text-slate-400">
                      {r.tempoEstimadoMinutos != null ? `${r.tempoEstimadoMinutos} min` : '—'}
                    </td>
                    <td className="py-3">
                      {r.ativo ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                          Ativa
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                          Inativa
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEdicao(r)}
                          className="rounded-md border border-white/10 p-2 text-slate-300 transition hover:border-violet-500 hover:text-violet-300"
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void excluir(r)}
                          className="rounded-md border border-white/10 p-2 text-slate-300 transition hover:border-red-500 hover:text-red-300"
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b1020] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-lg font-bold text-white">
                {edicaoId ? 'Editar região' : 'Nova região'}
              </h4>
              <button
                type="button"
                onClick={fechar}
                className="rounded-md p-1 text-slate-400 transition hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">Nome</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                  placeholder="ex.: Centro"
                  maxLength={80}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  Bairros (separe por vírgula)
                </label>
                <textarea
                  value={form.bairrosTexto}
                  onChange={(e) => setForm({ ...form, bairrosTexto: e.target.value })}
                  rows={2}
                  className="w-full resize-none rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                  placeholder="Centro, Jardim Paulista, Vila Madalena"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  Cidades (opcional, separe por vírgula)
                </label>
                <input
                  type="text"
                  value={form.cidadesTexto}
                  onChange={(e) => setForm({ ...form, cidadesTexto: e.target.value })}
                  className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                  placeholder="São Paulo (vazio = aceita qualquer cidade)"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">Taxa (R$)</label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={form.taxaEntrega}
                    onChange={(e) => setForm({ ...form, taxaEntrega: e.target.value })}
                    className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                    placeholder="8.00"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Mín. (R$)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={form.pedidoMinimo}
                    onChange={(e) => setForm({ ...form, pedidoMinimo: e.target.value })}
                    className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                    placeholder="20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Tempo (min)
                  </label>
                  <input
                    type="number"
                    step="5"
                    min="0"
                    value={form.tempoEstimadoMinutos}
                    onChange={(e) =>
                      setForm({ ...form, tempoEstimadoMinutos: e.target.value })
                    }
                    className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                    placeholder="30"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  className="rounded border-white/20 bg-black/30 text-violet-500 focus:ring-violet-500"
                />
                Ativa
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={fechar}
                className="rounded-md border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void salvar()}
                disabled={salvando}
                className="inline-flex items-center gap-2 rounded-md bg-violet-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-violet-400 disabled:opacity-50"
              >
                {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
                {edicaoId ? 'Salvar alterações' : 'Criar região'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
