import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Truck, Plus, Search, Clock, CheckCircle, XCircle, AlertCircle, Loader2, Eye
} from 'lucide-react';
import { api } from '../../../services/api';
import { PedidoRecebimentoFormModal } from '../recebimento/PedidoRecebimentoFormModal';

export const PedidoRecebimentoPage = () => {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    carregarPedidos();
  }, [statusFiltro]);

  const carregarPedidos = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/recebimento/pedidos', {
        params: { status: statusFiltro || undefined }
      });
      setPedidos(response.data);
    } catch (error) {
      console.error('Erro ao buscar pedidos', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PROGRAMADO': return { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Programado' };
      case 'RECEBENDO': return { icon: Truck, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Em Doca / Recebendo' };
      case 'CONCLUIDO': return { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Concluído' };
      case 'CANCELADO': return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Cancelado' };
      default: return { icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', label: status };
    }
  };

  return (
    <div className="min-h-screen bg-[#08101f] p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/20 via-[#0b1324] to-[#08101f] p-8 shadow-2xl md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-purple-400">
              <Truck size={14} /> Inbound / Doca
            </div>
            <h1 className="text-3xl font-black text-white">Agendamento de Recebimento</h1>
            <p className="mt-1 text-sm text-gray-400">Programe a chegada de mercadorias e prepare a doca.</p>
          </div>

          <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 font-bold text-white shadow-lg shadow-purple-600/20 transition-all hover:scale-105 hover:bg-purple-500">
            <Plus size={20} /> Novo Agendamento
          </button>
        </div>

        {/* FILTROS */}
        <div className="flex items-center gap-4 rounded-2xl border border-gray-800 bg-[#0b1324] p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input type="text" placeholder="Buscar por fornecedor ou NF..." className="w-full rounded-xl border border-gray-700 bg-[#131b2f] py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-purple-500" />
          </div>
          <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} className="rounded-xl border border-gray-700 bg-[#131b2f] px-4 py-2.5 text-sm text-white outline-none focus:border-purple-500">
            <option value="">Todos os Status</option>
            <option value="PROGRAMADO">Programados</option>
            <option value="RECEBENDO">Em Doca</option>
            <option value="CONCLUIDO">Concluídos</option>
          </select>
        </div>

        {/* LISTAGEM */}
        <div className="rounded-2xl border border-gray-800 bg-[#0b1324] shadow-xl overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Loader2 size={32} className="mb-4 animate-spin text-purple-500" />
              Carregando agenda da doca...
            </div>
          ) : pedidos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Truck size={48} className="mb-4 text-gray-700" />
              Nenhum caminhão agendado para recebimento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#131b2f] text-xs uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="p-4 font-medium">Fornecedor</th>
                    <th className="p-4 font-medium">Previsão de Chegada</th>
                    <th className="p-4 font-medium">Nota Fiscal</th>
                    <th className="p-4 font-medium text-center">Itens</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {pedidos.map((pedido) => {
                    const Status = getStatusInfo(pedido.status);
                    const StatusIcon = Status.icon;

                    return (
                      <tr key={pedido.id} className="transition-colors hover:bg-[#131b2f]">
                        <td className="p-4">
                          <div className="font-bold text-gray-200">{pedido.fornecedor?.nomeRazao || 'Desconhecido'}</div>
                          <div className="text-xs text-gray-500">CNPJ: {pedido.fornecedor?.cpfCnpj}</div>
                        </td>
                        <td className="p-4 text-gray-300">
                          {format(new Date(pedido.dataPrevista), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </td>
                        <td className="p-4 text-gray-400 font-mono">
                          {pedido.numeroNotaFiscal || '-'}
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center justify-center rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-bold text-gray-300">
                            {pedido._count?.itens || 0}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${Status.bg} ${Status.color} ${Status.border}`}>
                            <StatusIcon size={14} /> {Status.label}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-purple-500/20 hover:text-purple-400" title="Ver Detalhes">
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {isModalOpen && (
        <PedidoRecebimentoFormModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={carregarPedidos} 
        />
      )}
    </div>
  );
};