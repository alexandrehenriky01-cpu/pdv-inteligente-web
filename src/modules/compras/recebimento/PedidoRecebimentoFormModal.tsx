import { useEffect, useState, type FC, type FormEvent } from 'react';
import { X, Plus, Trash2, Loader2, Search } from 'lucide-react';
import { api } from '../../../services/api';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const PedidoRecebimentoFormModal: FC<Props> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Listas para os Selects
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);

  // Estado do Formulário
  const [fornecedorId, setFornecedorId] = useState('');
  const [dataPrevista, setDataPrevista] = useState('');
  const [numeroNotaFiscal, setNumeroNotaFiscal] = useState('');
  
  // Estado dos Itens
  const [itens, setItens] = useState<{ produtoId: string; qtdPecasEsperada: number; pesoEsperado: number }[]>([]);

  useEffect(() => {
    carregarDadosBase();
  }, []);

  const carregarDadosBase = async () => {
    try {
      // Busca pessoas e produtos para preencher os selects
      const [resPessoas, resProdutos] = await Promise.all([
        api.get('/api/cadastros/pessoas'), // Assumindo que sua rota retorna fornecedores
        api.get('/api/cadastros/produtos')
      ]);
      setFornecedores(resPessoas.data);
      setProdutos(resProdutos.data);
    } catch (error) {
      console.error('Erro ao carregar dados base', error);
    }
  };

  const handleAddItem = () => {
    setItens([...itens, { produtoId: '', qtdPecasEsperada: 1, pesoEsperado: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleChangeItem = (index: number, campo: string, valor: any) => {
    const novosItens = [...itens];
    novosItens[index] = { ...novosItens[index], [campo]: valor };
    setItens(novosItens);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!fornecedorId) return setErro('Selecione um fornecedor.');
    if (!dataPrevista) return setErro('Informe a data e hora prevista.');
    if (itens.length === 0) return setErro('Adicione pelo menos um item ao pedido.');
    
    const itensInvalidos = itens.some(i => !i.produtoId || i.qtdPecasEsperada <= 0);
    if (itensInvalidos) return setErro('Verifique os itens. Produto e quantidade são obrigatórios.');

    setLoading(true);
    try {
      // Converte a data local para ISO 8601 (Exigência do Zod no seu backend)
      const dataIso = new Date(dataPrevista).toISOString();

      await api.post('/api/compras/pedidos-recebimento', {
        fornecedorId: String(fornecedorId),
        dataPrevista: dataIso,
        numeroNotaFiscal: numeroNotaFiscal || undefined,
        itens: itens.map((i) => ({
          produtoId: i.produtoId,
          qtdPecasEsperada: Number(i.qtdPecasEsperada),
          pesoEsperado: Number(i.pesoEsperado) || undefined,
        })),
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      setErro(error.response?.data?.erro || 'Erro ao criar pedido de recebimento.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-[#131b2f] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500 transition-colors";
  const labelClass = "block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-gray-800 bg-[#0b1324] shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-gray-800 p-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-2 h-6 rounded-full bg-purple-500"></span>
            Novo Pedido de Recebimento (Inbound)
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {erro && (
            <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {erro}
            </div>
          )}

          <form id="form-pedido" onSubmit={handleSubmit} className="space-y-6">
            
            {/* DADOS GERAIS */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className={labelClass}>Fornecedor *</label>
                <select value={fornecedorId} onChange={e => setFornecedorId(e.target.value)} className={inputClass} required>
                  <option value="">Selecione um fornecedor...</option>
                  {fornecedores.map(f => (
                    <option key={f.id} value={f.id}>{f.nomeRazao} - {f.cpfCnpj}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className={labelClass}>Data e Hora Prevista *</label>
                <input type="datetime-local" value={dataPrevista} onChange={e => setDataPrevista(e.target.value)} className={inputClass} required />
              </div>

              <div className="md:col-span-3">
                <label className={labelClass}>Número da Nota Fiscal (Opcional)</label>
                <input type="text" value={numeroNotaFiscal} onChange={e => setNumeroNotaFiscal(e.target.value)} className={inputClass} placeholder="Ex: 123456789" />
              </div>
            </div>

            {/* ITENS DO PEDIDO */}
            <div className="mt-8 rounded-xl border border-gray-800 bg-[#131b2f]/50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Itens Esperados</h3>
                <button type="button" onClick={handleAddItem} className="flex items-center gap-1.5 rounded-lg bg-purple-600/20 px-3 py-1.5 text-xs font-bold text-purple-400 transition-colors hover:bg-purple-600/30">
                  <Plus size={14} /> Adicionar Item
                </button>
              </div>

              {itens.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-700 py-8 text-center text-sm text-gray-500">
                  Nenhum item adicionado ao pedido.
                </div>
              ) : (
                <div className="space-y-3">
                  {itens.map((item, index) => (
                    <div key={index} className="flex items-end gap-3 rounded-lg border border-gray-800 bg-[#0b1324] p-3">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs text-gray-500">Produto</label>
                        <select value={item.produtoId} onChange={e => handleChangeItem(index, 'produtoId', e.target.value)} className={inputClass} required>
                          <option value="">Selecione...</option>
                          {produtos.map(p => (
                            <option key={p.id} value={p.id}>{p.codigoBarras} - {p.nome}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-32">
                        <label className="mb-1 block text-xs text-gray-500">Qtd. Peças</label>
                        <input type="number" min="1" value={item.qtdPecasEsperada} onChange={e => handleChangeItem(index, 'qtdPecasEsperada', e.target.value)} className={inputClass} required />
                      </div>
                      <div className="w-32">
                        <label className="mb-1 block text-xs text-gray-500">Peso (KG)</label>
                        <input type="number" step="0.001" min="0" value={item.pesoEsperado} onChange={e => handleChangeItem(index, 'pesoEsperado', e.target.value)} className={inputClass} />
                      </div>
                      <button type="button" onClick={() => handleRemoveItem(index)} className="mb-1 rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </form>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-800 bg-[#08101f] p-5 rounded-b-2xl">
          <button type="button" onClick={onClose} disabled={loading} className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800">
            Cancelar
          </button>
          <button type="submit" form="form-pedido" disabled={loading} className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-purple-500 disabled:opacity-50">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            Programar Recebimento
          </button>
        </div>

      </div>
    </div>
  );
};