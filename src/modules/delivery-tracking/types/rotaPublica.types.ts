export interface RotaPublicaProximaEntrega {
  pedidoId: string;
  cliente: string | null;
  endereco: string;
}

export interface RotaPublicaSequenciaItem {
  pedidoId: string;
  ordemOriginal: number;
  ordemOtimizada: number;
}

export interface RotaPublicaResponse {
  sucesso: boolean;
  googleMapsUrl: string;
  wazeProximaEntregaUrl: string | null;
  totalParadas: number;
  proximaEntrega: RotaPublicaProximaEntrega | null;
  sequenciaOtimizada?: RotaPublicaSequenciaItem[];
  heuristicaRotaAtiva?: boolean;
  erro?: string;
}
