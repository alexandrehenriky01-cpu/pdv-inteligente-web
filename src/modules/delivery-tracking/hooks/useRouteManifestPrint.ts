import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '../../../services/api';
import { routeManifestPrintService, type RomaneioRequest, type RomaneioMetadata, type ImpressaoResult } from '../services/routeManifestPrintService';

interface UseRouteManifestPrintReturn {
  imprimindo: boolean;
  agentOnline: boolean;
  ultimoResultado: ImpressaoResult | null;
  imprimirRomaneio: (romaneio: RomaneioRequest) => Promise<ImpressaoResult>;
  verificarAgente: () => void;
}

export function useRouteManifestPrint(): UseRouteManifestPrintReturn {
  const [imprimindo, setImprimindo] = useState(false);
  const [agentOnline, setAgentOnline] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState<ImpressaoResult | null>(null);

  const verificarAgente = useCallback(() => {
    setAgentOnline(routeManifestPrintService.isAgentConnected());
  }, []);

  useEffect(() => {
    routeManifestPrintService.connectAgent();
    const unsubscribe = routeManifestPrintService.onConnectionChange((connected) => {
      setAgentOnline(connected);
    });
    verificarAgente();
    return unsubscribe;
  }, [verificarAgente]);

  const imprimirRomaneio = useCallback(async (
    romaneio: RomaneioRequest
  ): Promise<ImpressaoResult> => {
    setImprimindo(true);
    setUltimoResultado(null);

    try {
      const { data: romaneioResponse } = await api.post<{
        sucesso: boolean;
        texto?: string;
        qrBase64?: string;
        metadata?: RomaneioMetadata;
        error?: string;
      }>('/api/entregas/imprimir/romaneio', romaneio);

      if (!romaneioResponse.sucesso || !romaneioResponse.texto) {
        const erro = romaneioResponse.error || 'Falha ao gerar romaneio.';
        toast.error(erro);
        setUltimoResultado({ sucesso: false, mensagem: erro });
        setImprimindo(false);
        return { sucesso: false, mensagem: erro };
      }

      const resultadoImpressao = await routeManifestPrintService.imprimirRomaneio(
        romaneioResponse.texto,
        undefined,
        'texto'
      );

      setUltimoResultado(resultadoImpressao);

      if (resultadoImpressao.sucesso) {
        toast.success(`Romaneio com ${romaneio.paradas.length} paradas impresso com sucesso!`);
      } else {
        toast.error(resultadoImpressao.mensagem || 'Falha ao imprimir romaneio.');
      }

      setImprimindo(false);
      return resultadoImpressao;
    } catch (error) {
      console.error('[RouteManifestPrint] Erro:', error);
      const erroMsg = error instanceof Error ? error.message : 'Erro ao imprimir romaneio.';
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
    imprimirRomaneio,
    verificarAgente,
  };
}
