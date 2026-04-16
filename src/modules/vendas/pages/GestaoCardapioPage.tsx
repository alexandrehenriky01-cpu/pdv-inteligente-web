import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import { Sparkles, ImageIcon, X, Upload } from 'lucide-react';

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
  imagemUrl?: string;
  descricao?: string;
};

type ApiData<T> = { sucesso: boolean; dados?: T; erro?: string };

type AuryaSugestoes = {
  imagens: string[];
  descricao: string;
  categoria: string;
};

export function GestaoCardapioPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [itens, setItens] = useState<ItemCardapio[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [itemEdicaoId, setItemEdicaoId] = useState<string | null>(null);
  const [showImportRevenda, setShowImportRevenda] = useState(false);
  const [showAuryaModal, setShowAuryaModal] = useState(false);
  const [novo, setNovo] = useState({
    nome: '',
    categoria: '',
    precoVenda: 0,
    ingredienteProdutoId: '',
    ingredienteQuantidade: 1,
    imagemUrl: '',
    descricao: '',
  });
  const [edicao, setEdicao] = useState({
    nome: '',
    categoria: '',
    precoVenda: 0,
    ativo: true,
    ingredientes: [] as Ingrediente[],
    imagemUrl: '',
    descricao: '',
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
        imagemUrl: novo.imagemUrl,
        descricao: novo.descricao,
      });
      setNovo({
        nome: '',
        categoria: '',
        precoVenda: 0,
        ingredienteProdutoId: '',
        ingredienteQuantidade: 1,
        imagemUrl: '',
        descricao: '',
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
      imagemUrl: item.imagemUrl ?? '',
      descricao: item.descricao ?? '',
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
        imagemUrl: edicao.imagemUrl,
        descricao: edicao.descricao,
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

  const [gerandoAurya, setGerandoAurya] = useState(false);
  const [sugestoesAurya, setSugestoesAurya] = useState<AuryaSugestoes | null>(null);
  const [imagemSelecionada, setImagemSelecionada] = useState<string | null>(null);
  const [modoAurya, setModoAurya] = useState<'novo' | 'edicao'>('novo');

  function gerarSugestoesAurya() {
    setGerandoAurya(true);
    setTimeout(() => {
      const sourceNome = modoAurya === 'novo' ? novo.nome : edicao.nome;
      const nomeLower = sourceNome.toLowerCase();
      let categoriaSugerida = 'Pratos';
      if (nomeLower.includes('x-') || nomeLower.includes('burger') || nomeLower.includes('lanche') || nomeLower.includes('sanduiche')) {
        categoriaSugerida = 'Lanches';
      } else if (nomeLower.includes('refri') || nomeLower.includes('coca') || nomeLower.includes('suco') || nomeLower.includes('bebida') || nomeLower.includes('agua')) {
        categoriaSugerida = 'Bebidas';
      } else if (nomeLower.includes('pizza')) {
        categoriaSugerida = 'Pizzas';
      } else if (nomeLower.includes('sorvete') || nomeLower.includes('açaí') || nomeLower.includes('acai')) {
        categoriaSugerida = 'Sobremesas';
      }

      const sugestoes: AuryaSugestoes = {
        imagens: [
          `https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop&q=80`,
          `https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=300&fit=crop&q=80`,
          `https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=400&h=300&fit=crop&q=80`,
          `https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop&q=80`,
        ],
        descricao: `${sourceNome || 'Deliciosa opção'} preparada com ingredientes selecionados da mais alta qualidade. Perfeita para qualquer ocasião!`,
        categoria: categoriaSugerida,
      };
      setSugestoesAurya(sugestoes);
      setImagemSelecionada(null);
      setGerandoAurya(false);
    }, 2500);
  }

  function aplicarSugestoesAurya() {
    if (!sugestoesAurya || !imagemSelecionada) return;
    if (modoAurya === 'novo') {
      setNovo((old) => ({
        ...old,
        imagemUrl: imagemSelecionada,
        descricao: sugestoesAurya.descricao,
        categoria: old.categoria || sugestoesAurya.categoria,
      }));
    } else {
      setEdicao((old) => ({
        ...old,
        imagemUrl: imagemSelecionada,
        descricao: sugestoesAurya.descricao,
        categoria: old.categoria || sugestoesAurya.categoria,
      }));
    }
    setShowAuryaModal(false);
    setSugestoesAurya(null);
    setImagemSelecionada(null);
  }

  function handleUploadImagem(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setImagemSelecionada(base64);
    };
    reader.readAsDataURL(file);
  }

  function fecharModalAurya() {
    setShowAuryaModal(false);
    setSugestoesAurya(null);
    setImagemSelecionada(null);
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

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-700 p-4 md:grid-cols-6">
          <div className="flex gap-2 md:col-span-2">
            <input
              className="flex-1 rounded border border-slate-600 bg-slate-900 p-2"
              placeholder="Nome do item"
              value={novo.nome}
              onChange={(e) => setNovo((old) => ({ ...old, nome: e.target.value }))}
              required
            />
            <button
              type="button"
              onClick={() => { setModoAurya('novo'); setShowAuryaModal(true); }}
              className="flex items-center gap-1 rounded bg-violet-600 px-3 py-2 text-sm font-bold text-white"
              title="Completar com Aurya"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
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
          <input
            className="rounded border border-slate-600 bg-slate-900 p-2 md:col-span-3"
            placeholder="Descricao (auto)"
            value={novo.descricao}
            onChange={(e) => setNovo((old) => ({ ...old, descricao: e.target.value }))}
          />
          {novo.imagemUrl && (
            <div className="col-span-full flex items-center gap-4 mt-2 p-3 bg-slate-900/50 border border-slate-700 rounded-xl">
              <img src={novo.imagemUrl} alt="Preview" className="w-16 h-16 object-cover rounded-lg shadow-md border border-slate-600" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-emerald-400">Imagem carregada com sucesso</span>
                <button type="button" onClick={() => { setModoAurya('novo'); setShowAuryaModal(true); }} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 mt-1">
                  <Sparkles size={12} /> Trocar Imagem / Refazer Aurya
                </button>
              </div>
            </div>
          )}
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
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded border border-slate-600 bg-slate-900 p-2"
                  value={edicao.nome}
                  onChange={(e) => setEdicao((old) => ({ ...old, nome: e.target.value }))}
                  placeholder="Nome"
                />
                <button
                  type="button"
                  onClick={() => { setModoAurya('edicao'); setShowAuryaModal(true); }}
                  className="p-2 bg-violet-600 text-white rounded"
                  title="Completar com Aurya"
                >
                  <Sparkles size={20} />
                </button>
              </div>
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
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <input
                className="rounded border border-slate-600 bg-slate-900 p-2"
                value={edicao.descricao}
                onChange={(e) => setEdicao((old) => ({ ...old, descricao: e.target.value }))}
                placeholder="Descricao"
              />
            </div>
            {edicao.imagemUrl && (
              <div className="flex items-center gap-4 p-3 bg-slate-900/50 border border-slate-700 rounded-xl">
                <img src={edicao.imagemUrl} alt="Preview" className="w-16 h-16 object-cover rounded-lg shadow-md border border-slate-600" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-emerald-400">Imagem carregada com sucesso</span>
                  <button type="button" onClick={() => { setModoAurya('edicao'); setShowAuryaModal(true); }} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 mt-1">
                    <Sparkles size={12} /> Trocar Imagem / Refazer Aurya
                  </button>
                </div>
              </div>
            )}
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
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {item.imagemUrl ? (
                          <img src={item.imagemUrl} alt={item.nome} className="w-10 h-10 rounded-lg object-cover border border-slate-700 shadow-sm" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
                            <ImageIcon size={16} />
                          </div>
                        )}
                        <span className="font-semibold text-slate-200">{item.nome}</span>
                      </div>
                    </td>
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

        {showAuryaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-400" />
                  <h3 className="text-lg font-black">Completar com Aurya</h3>
                </div>
                <button type="button" onClick={fecharModalAurya} className="rounded border border-slate-700 p-1 hover:bg-slate-800">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-y-auto p-6">
                {!sugestoesAurya ? (
                  <div className="text-center">
                    <p className="mb-6 text-sm text-slate-400">
                      A IA Aurya vai analisar o nome do item e gerar automaticamente uma categoria, descrição e sugestões de imagens profissionais.
                    </p>
                    <button
                      type="button"
                      onClick={gerarSugestoesAurya}
                      disabled={gerandoAurya}
                      className="flex w-full items-center justify-center gap-2 rounded bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4 font-bold text-white transition-all hover:from-violet-500 hover:to-purple-500 disabled:opacity-50"
                    >
                      {gerandoAurya ? (
                        <>
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Aurya esta pensando...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5" />
                          <span>Gerar Sugestoes com IA</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          Categoria Sugerida
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-violet-500/20 px-3 py-1.5 text-sm font-bold text-violet-300">
                            {sugestoesAurya.categoria}
                          </span>
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          Descricao Sugerida
                        </label>
                        <p className="text-sm leading-relaxed text-slate-300">
                          {sugestoesAurya.descricao}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Selecione uma imagem
                      </label>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {sugestoesAurya.imagens.map((img, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setImagemSelecionada(img)}
                            className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                              imagemSelecionada === img
                                ? 'border-4 border-violet-500 ring-2 ring-violet-500/50 shadow-lg shadow-violet-500/20'
                                : 'border-slate-700 hover:border-slate-500'
                            }`}
                          >
                            <img
                              src={img}
                              alt={`Opcao ${index + 1}`}
                              className="aspect-[4/3] w-full object-cover"
                            />
                            {imagemSelecionada === img && (
                              <div className="absolute inset-0 flex items-center justify-center bg-violet-500/30">
                                <Sparkles className="h-6 w-6 text-white drop-shadow-lg" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-700 my-4" />

                    <div>
                      <p className="mb-3 text-xs text-slate-500">Ou envie sua propria foto:</p>
                      <div className="flex items-center gap-3">
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-600 bg-slate-900/50 px-4 py-3 text-sm text-slate-400 transition-colors hover:border-violet-500/50 hover:text-violet-400">
                          <Upload className="h-4 w-4" />
                          <span>Escolher arquivo</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleUploadImagem}
                          />
                        </label>
                        {imagemSelecionada && imagemSelecionada.startsWith('data:') && (
                          <div className="relative overflow-hidden rounded-lg border-2 border-violet-500 ring-2 ring-violet-500/50">
                            <img
                              src={imagemSelecionada}
                              alt="Upload preview"
                              className="h-12 w-16 object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-violet-500/20">
                              <Sparkles className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSugestoesAurya(null);
                          setImagemSelecionada(null);
                        }}
                        className="flex-1 rounded border border-slate-600 px-4 py-3 font-bold transition-colors hover:bg-slate-800"
                      >
                        Gerar Novamente
                      </button>
                      <button
                        type="button"
                        onClick={aplicarSugestoesAurya}
                        disabled={!imagemSelecionada}
                        className="flex-1 rounded bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 font-bold text-white transition-all hover:from-emerald-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Aplicar Sugestoes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
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
