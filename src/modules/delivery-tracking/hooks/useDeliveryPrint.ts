import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '../../../services/api';
import { deliveryPrintService, type ImpressaoResult } from '../services/deliveryPrintService';

export interface CupomMetadata {
  numeroPedido: number | null;
  clienteNome: string | null;
  clienteEndereco: string | null;
  valorTotal: number;
  linkMaps?: string;
}

interface UseDeliveryPrintReturn {
  imprimindo: boolean;
  agentOnline: boolean;
  ultimoResultado: ImpressaoResult | null;
  imprimirCupom: (vendaId: string, incluirQR?: boolean) => Promise<ImpressaoResult>;
  verificarAgente: () => void;
}

export function useDeliveryPrint(): UseDeliveryPrintReturn {
  const [imprimindo, setImprimindo] = useState(false);
  const [agentOnline, setAgentOnline] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState<ImpressaoResult | null>(null);

  const verificarAgente = useCallback(() => {
    setAgentOnline(deliveryPrintService.isAgentConnected());
  }, []);

  useEffect(() => {
    deliveryPrintService.connectAgent();
    const unsubscribe = deliveryPrintService.onConnectionChange((connected) => {
      setAgentOnline(connected);
    });
    verificarAgente();
    return unsubscribe;
  }, [verificarAgente]);

  const imprimirCupom = useCallback(async (
    vendaId: string,
    incluirQR = true
  ): Promise<ImpressaoResult> => {
    setImprimindo(true);
    setUltimoResultado(null);

    try {
      const { data: cupomResponse } = await api.post<{
        sucesso: boolean;
        texto?: string;
        qrBase64?: string;
        error?: string;
      }>('/api/entregas/imprimir/cupom-qr', {
        vendaId,
        incluirQR,
      });

      if (!cupomResponse.sucesso || !cupomResponse.texto) {
        const erro = cupomResponse.error || 'Falha ao gerar cupom.';
        toast.error(erro);
        setUltimoResultado({ sucesso: false, mensagem: erro });
        setImprimindo(false);
        return { sucesso: false, mensagem: erro };
      }

      const resultadoImpressao = await deliveryPrintService.imprimirCupomDelivery(
        cupomResponse.texto,
        undefined,
        'texto'
      );

      setUltimoResultado(resultadoImpressao);

      if (resultadoImpressao.sucesso) {
        toast.success('Cupom impresso com sucesso!');
      } else {
        toast.error(resultadoImpressao.mensagem || 'Falha ao imprimir cupom.');
      }

      setImprimindo(false);
      return resultadoImpressao;
    } catch (error) {
      console.error('[DeliveryPrint] Erro:', error);
      const erroMsg = error instanceof Error ? error.message : 'Erro ao imprimir cupom.';
      toast.error(erroMsg);
      setUltimoResultado({ sucesso: false, mensagem: erroMsg });
      setImprimindo(false);
      return { sucesso: false, mensagem: erroMsg };
    }
  }, []);

  return {
    imprimindo,
    agentOnline,
    ultimoResultado,
    imprimirCupom,
    verificarAgente,
  };
}
