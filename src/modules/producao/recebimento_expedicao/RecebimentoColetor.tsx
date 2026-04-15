import { useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import { useBalanca } from './useBalanca';

// Tipagem para o retorno da nossa API (contrato padronizado)
interface RecebimentoResponse {
  sucesso: boolean;
  dados?: {
    lote: string;
    pesoLiquido: number;
    impresso: boolean;
  };
  erro?: string;
}

export default function RecebimentoColetor() {
  // 1. Identificação da Estação (Pega do cache do tablet/coletor no momento do login)
  const workstationId = localStorage.getItem('@PDV_WorkstationId') || '';
  const lojaId = localStorage.getItem('@PDV_LojaId') || '';
  const usuarioId = localStorage.getItem('@PDV_UsuarioId') || '';

  // 2. Conexão Mágica com o Hardware (WebSocket)
  const { pesoReal, estabilizado, conectado, erro: erroBalanca, tararBalanca } = useBalanca({
    workstationId
  });

  // 3. Estados do Formulário
  const [itemPedidoId, setItemPedidoId] = useState<number | ''>('');
  const [pesoBruto, setPesoBruto] = useState<number>(0);
  const [tara, setTara] = useState<number>(0);
  const [quantidadePecas, setQuantidadePecas] = useState<number>(1);

  // Opcionais do Frigorífico
  const [dataAbate, setDataAbate] = useState<string>('');
  const [validade, setValidade] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // 4. Efeito Hands-Free: Preenche o peso sozinho quando a balança estabiliza
  useEffect(() => {
    if (estabilizado && pesoReal > 0) {
      setPesoBruto(pesoReal);
    }
  }, [pesoReal, estabilizado]);

  // 5. Submissão para a nossa API blindada
  const handleRegistrarRecebimento = async (e: FormEvent) => {
    e.preventDefault();
    setMensagem(null);

    if (!itemPedidoId || pesoBruto <= 0 || quantidadePecas <= 0) {
      setMensagem({ tipo: 'erro', texto: 'Preencha todos os campos obrigatórios.' });
      return;
    }

    try {
      setLoading(true);

      const payload = {
        lojaId,
        usuarioId,
        workstationId,
        itemPedidoId: Number(itemPedidoId),
        pesoBruto,
        tara,
        quantidadePecas,
        ...(dataAbate && { dataAbate }),
        ...(validade && { validade })
      };

      const response = await axios.post<RecebimentoResponse>('/api/wms/recebimento', payload);

      const body = response.data;
      if (!body.sucesso || !body.dados) {
        setMensagem({ tipo: 'erro', texto: body.erro || 'Resposta inválida do servidor.' });
        return;
      }

      const { lote, pesoLiquido, impresso } = body.dados;
      setMensagem({
        tipo: 'sucesso',
        texto: `Sucesso! Lote ${lote} gerado. Peso Líquido: ${pesoLiquido}kg. ${impresso ? 'Etiqueta enviada para impressão.' : ''}`
      });

      setPesoBruto(0);
      setQuantidadePecas(1);
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { erro?: string } } };
      const erroMsg = axiosErr.response?.data?.erro || 'Erro ao registrar recebimento. Verifique a conexão.';
      setMensagem({ tipo: 'erro', texto: erroMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Recebimento de Doca</h1>

      <div
        className={`p-4 rounded-lg mb-6 flex items-center justify-between ${
          !conectado ? 'bg-red-100 text-red-800' : estabilizado ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}
      >
        <div>
          <h2 className="font-bold text-lg">
            {!conectado ? 'Balança Offline' : estabilizado ? 'Peso Estabilizado' : 'Lendo Peso...'}
          </h2>
          {erroBalanca && <p className="text-sm">{erroBalanca}</p>}
        </div>
        <div className="text-4xl font-mono font-bold">
          {pesoReal.toFixed(3)} <span className="text-xl">KG</span>
        </div>
      </div>

      {mensagem && (
        <div
          className={`p-4 rounded mb-6 ${
            mensagem.tipo === 'sucesso' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      <form onSubmit={handleRegistrarRecebimento} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Cód. Item do Pedido (Biper)</label>
            <input
              type="number"
              value={itemPedidoId}
              onChange={(e) => setItemPedidoId(Number(e.target.value))}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-md text-lg focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Qtd. Peças/Caixas no Palete</label>
            <input
              type="number"
              value={quantidadePecas}
              onChange={(e) => setQuantidadePecas(Number(e.target.value))}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-md text-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Peso Bruto (KG)</label>
            <input
              type="number"
              step="0.001"
              value={pesoBruto}
              readOnly={conectado}
              onChange={(e) => setPesoBruto(Number(e.target.value))}
              className={`mt-1 block w-full p-3 border rounded-md text-lg font-bold ${
                conectado ? 'bg-gray-100 text-gray-600' : 'bg-white border-gray-300'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 flex justify-between">
              <span>Tara do Palete (KG)</span>
              <button type="button" onClick={tararBalanca} className="text-blue-600 text-xs hover:underline">
                Tarar Balança
              </button>
            </label>
            <input
              type="number"
              step="0.001"
              value={tara}
              onChange={(e) => setTara(Number(e.target.value))}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-md text-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Data de Abate (Opcional)</label>
            <input
              type="date"
              value={dataAbate}
              onChange={(e) => setDataAbate(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Validade (Opcional)</label>
            <input
              type="date"
              value={validade}
              onChange={(e) => setValidade(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || pesoBruto <= 0 || !itemPedidoId}
          className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processando e Imprimindo...' : 'Confirmar Recebimento e Imprimir ZPL'}
        </button>
      </form>
    </div>
  );
}
