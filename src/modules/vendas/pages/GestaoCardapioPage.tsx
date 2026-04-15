import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';

type Produto = { id: string; nome: string; codigo?: string | null; precoVenda?: number };
type Ingrediente = { produtoId: string; quantidade: number };
type Adicional = { nome: string; produtoId: string; quantidade: number; precoExtra: number };
type ItemCardapio = {
  id: string;
  nome: string;
  categoria: string;
  precoVenda: number;
  ativo: boolean;
  ingredientes: Ingrediente[];
  adicionais: Adicional[];
};

type ApiData<T> = { sucesso: boolean; dados?: T; erro?: string };

export function GestaoCardapioPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [itens, setItens] = useState<ItemCardapio[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [itemEdicaoId, setItemEdicaoId] = useState<string | null>(null);
  const [showImportRevenda, setShowImportRevenda] = useState(false);
  const [novo, setNovo] = useState({
    nome: '',
    categoria: '',
    precoVenda: 0,
    ingredienteProdutoId: '',
    ingredienteQuantidade: 1,
  });
  const [edicao, setEdicao] = useState({
    nome: '',
    categoria: '',
    precoVenda: 0,
    ativo: true,
    ingredientes: [] as Ingrediente[],
  });

  const categorias = useMemo(() => {
    const setCategorias = new Set<string>();
    for (const item of itens) setCategorias.add(item.categoria);
    return Array.from(setCategorias).sort((a, b) => a.localeCompare(b));
  }, [itens]);

  const itemEmEdicao = useMemo(
    () => itens.find((item) => item.id === itemEdicaoId) ?? null,
    [itens, itemEdicaoId]
  );

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const [resItens, resProdutos] = await Promise.all([
        api.get<ApiData<{ itens: ItemCardapio[] }>>('/api/cardapio/gestao'),
        api.get<Produto[]>('/api/cadastros/produtos'),
      ]);
      setItens(resItens.data.dados?.itens ?? []);
      setProdutos(resProdutos.data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao carregar dados do cardápio.';
      setErro(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!novo.ingredienteProdutoId) {
      setErro('Selecione ao menos um produto-base para o item.');
      return;
    }

    try {
      await api.post<ApiData<ItemCardapio>>('/api/cardapio', {
        nome: novo.nome,
        categoria: novo.categoria,
        precoVenda: Number(novo.precoVenda),
        ingredientes: [
          {
            produtoId: novo.ingredienteProdutoId,
            quantidade: Number(novo.ingredienteQuantidade),
          },
        ],
        adicionais: [],
      });
      setNovo({
        nome: '',
        categoria: '',
        precoVenda: 0,
        ingredienteProdutoId: '',
        ingredienteQuantidade: 1,
      });
      await carregar();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao criar item de cardápio.';
      setErro(msg);
    }
  }

  function iniciarEdicao(item: ItemCardapio) {
    setItemEdicaoId(item.id);
    setEdicao({
      nome: item.nome,
      categoria: item.categoria,
      precoVenda: item.precoVenda,
      ativo: item.ativo,
      ingredientes: item.ingredientes?.map((i) => ({ produtoId: i.produtoId, quantidade: Number(i.quantidade) })) ?? [],
    });
  }

  function adicionarIngredienteEdicao() {
    if (!produtos[0]) return;
    setEdicao((old) => ({
      ...old,
      ingredientes: [...old.ingredientes, { produtoId: produtos[0].id, quantidade: 1 }],
    }));
  }

  function atualizarIngredienteEdicao(index: number, patch: Partial<Ingrediente>) {
    setEdicao((old) => ({
      ...old,
      ingredientes: old.ingredientes.map((ingrediente, i) => (i === index ? { ...ingrediente, ...patch } : ingrediente)),
    }));
  }

  function removerIngredienteEdicao(index: number) {
    setEdicao((old) => ({
      ...old,
      ingredientes: old.ingredientes.filter((_, i) => i !== index),
    }));
  }

  async function salvarEdicao() {
    if (!itemEdicaoId) return;
    if (edicao.ingredientes.length === 0) {
      setErro('A ficha técnica precisa ter pelo menos 1 ingrediente.');
      return;
    }
    try {
      await api.put(`/api/cardapio/${itemEdicaoId}`, {
        nome: edicao.nome,
        categoria: edicao.categoria,
        precoVenda: edicao.precoVenda,
        ativo: edicao.ativo,
        ingredientes: edicao.ingredientes,
      });
      setItemEdicaoId(null);
      await carregar();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao salvar item.';
      setErro(msg);
    }
  }

  async function importarProdutoRevenda(produto: Produto) {
    try {
      const categoriaInferida = produto.nome.toLowerCase().includes('refri')
        ? 'Bebidas'
        : produto.nome.toLowerCase().includes('agua')
          ? 'Bebidas'
          : 'Revenda';
      await api.post<ApiData<ItemCardapio>>('/api/cardapio', {
        nome: produto.nome,
        categoria: categoriaInferida,
        precoVenda: Number(produto.precoVenda ?? 0),
        ingredientes: [{ produtoId: produto.id, quantidade: 1 }],
        adicionais: [],
      });
      setShowImportRevenda(false);
      await carregar();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao importar produto de revenda.';
      setErro(msg);
    }
  }

  async function toggleAtivo(item: ItemCardapio) {
    try {
      await api.put(`/api/cardapio/${item.id}`, { ativo: !item.ativo });
      await carregar();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao atualizar status do item.';
      setErro(msg);
    }
  }

  async function remover(itemId: string) {
    try {
      await api.delete(`/api/cardapio/${itemId}`);
      await carregar();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao remover item do cardápio.';
      setErro(msg);
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black">Gestao de Cardapio</h1>
          <p className="text-sm text-slate-400">Gerencie categorias e itens Food Service por loja.</p>
          <button
            type="button"
            onClick={() => setShowImportRevenda(true)}
            className="mt-3 rounded bg-emerald-600 px-3 py-2 text-sm font-bold text-white"
          >
            Importar Produto de Revenda
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-700 p-4 md:grid-cols-5">
          <input
            className="rounded border border-slate-600 bg-slate-900 p-2"
            placeholder="Nome do item"
            value={novo.nome}
            onChange={(e) => setNovo((old) => ({ ...old, nome: e.target.value }))}
            required
          />
          <input
            className="rounded border border-slate-600 bg-slate-900 p-2"
            list="categorias-existentes"
            placeholder="Categoria"
            value={novo.categoria}
            onChange={(e) => setNovo((old) => ({ ...old, categoria: e.target.value }))}
            required
          />
          <input
            className="rounded border border-slate-600 bg-slate-900 p-2"
            type="number"
            min={0}
            step="0.01"
            placeholder="Preco"
            value={novo.precoVenda}
            onChange={(e) => setNovo((old) => ({ ...old, precoVenda: Number(e.target.value) }))}
            required
          />
          <select
            className="rounded border border-slate-600 bg-slate-900 p-2"
            value={novo.ingredienteProdutoId}
            onChange={(e) => setNovo((old) => ({ ...old, ingredienteProdutoId: e.target.value }))}
            required
          >
            <option value="">Produto base</option>
            {produtos.map((produto) => (
              <option key={produto.id} value={produto.id}>
                {produto.codigo ? `[${produto.codigo}] ` : ''}
                {produto.nome}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded bg-violet-600 px-4 py-2 font-bold text-white">
            Adicionar
          </button>
          <datalist id="categorias-existentes">
            {categorias.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
        </form>

        {erro && <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{erro}</div>}

        {itemEmEdicao && (
          <div className="space-y-3 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
            <h2 className="text-lg font-black">Ficha Tecnica / Ingredientes</h2>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <input
                className="rounded border border-slate-600 bg-slate-900 p-2"
                value={edicao.nome}
                onChange={(e) => setEdicao((old) => ({ ...old, nome: e.target.value }))}
                placeholder="Nome"
              />
              <input
                className="rounded border border-slate-600 bg-slate-900 p-2"
                value={edicao.categoria}
                onChange={(e) => setEdicao((old) => ({ ...old, categoria: e.target.value }))}
                placeholder="Categoria"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                className="rounded border border-slate-600 bg-slate-900 p-2"
                value={edicao.precoVenda}
                onChange={(e) => setEdicao((old) => ({ ...old, precoVenda: Number(e.target.value) }))}
                placeholder="Preco"
              />
              <label className="flex items-center gap-2 rounded border border-slate-600 bg-slate-900 p-2 text-sm">
                <input
                  type="checkbox"
                  checked={edicao.ativo}
                  onChange={(e) => setEdicao((old) => ({ ...old, ativo: e.target.checked }))}
                />
                Item ativo
              </label>
            </div>
            <div className="space-y-2">
              {edicao.ingredientes.map((ingrediente, index) => (
                <div key={`ing-${index}`} className="grid grid-cols-1 gap-2 md:grid-cols-5">
                  <select
                    className="rounded border border-slate-600 bg-slate-900 p-2 md:col-span-3"
                    value={ingrediente.produtoId}
                    onChange={(e) => atualizarIngredienteEdicao(index, { produtoId: e.target.value })}
                  >
                    {produtos.map((produto) => (
                      <option key={produto.id} value={produto.id}>
                        {produto.codigo ? `[${produto.codigo}] ` : ''}
                        {produto.nome}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0.001}
                    step="0.001"
                    className="rounded border border-slate-600 bg-slate-900 p-2"
                    value={ingrediente.quantidade}
                    onChange={(e) => atualizarIngredienteEdicao(index, { quantidade: Number(e.target.value) })}
                  />
                  <button
                    type="button"
                    className="rounded border border-red-500/40 px-2 py-1 text-red-300"
                    onClick={() => removerIngredienteEdicao(index)}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={adicionarIngredienteEdicao} className="rounded border border-slate-600 px-3 py-1">
                + Ingrediente
              </button>
              <button type="button" onClick={() => void salvarEdicao()} className="rounded bg-violet-600 px-3 py-1 font-bold">
                Salvar Ficha
              </button>
              <button type="button" onClick={() => setItemEdicaoId(null)} className="rounded border border-slate-600 px-3 py-1">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-sm text-slate-400">Carregando cardapio...</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900">
                <tr>
                  <th className="p-3 text-left">Categoria</th>
                  <th className="p-3 text-left">Item</th>
                  <th className="p-3 text-left">Preco</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.id} className="border-t border-slate-800">
                    <td className="p-3">{item.categoria}</td>
                    <td className="p-3">{item.nome}</td>
                    <td className="p-3">R$ {Number(item.precoVenda).toFixed(2)}</td>
                    <td className="p-3">{item.ativo ? 'Ativo' : 'Inativo'}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void toggleAtivo(item)}
                          className="rounded border border-slate-600 px-2 py-1"
                        >
                          {item.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => iniciarEdicao(item)}
                          className="rounded border border-violet-500/40 px-2 py-1 text-violet-200"
                        >
                          Editar ficha
                        </button>
                        <button
                          type="button"
                          onClick={() => void remover(item.id)}
                          className="rounded border border-red-500/40 px-2 py-1 text-red-300"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showImportRevenda && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
              <div className="flex items-center justify-between border-b border-slate-800 p-4">
                <h3 className="text-lg font-black">Importar Produto de Revenda</h3>
                <button type="button" onClick={() => setShowImportRevenda(false)} className="rounded border border-slate-700 px-2 py-1">
                  Fechar
                </button>
              </div>
              <div className="max-h-[65vh] overflow-y-auto p-4">
                <div className="grid grid-cols-1 gap-2">
                  {produtos.map((produto) => (
                    <button
                      key={produto.id}
                      type="button"
                      onClick={() => void importarProdutoRevenda(produto)}
                      className="flex items-center justify-between rounded border border-slate-700 bg-slate-900 px-3 py-2 text-left hover:border-emerald-500/40"
                    >
                      <span>
                        {produto.codigo ? `[${produto.codigo}] ` : ''}
                        {produto.nome}
                      </span>
                      <span className="text-xs text-emerald-300">Criar 1:1</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
