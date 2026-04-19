import { create } from 'zustand';
import { api } from '../../../services/api';

export type StatusEntrega = 'PENDENTE' | 'SAIU_ENTREGA' | 'ENTREGUE';

export interface EntregaRota {
  pedidoId: string;
  numeroPedido: number | null;
  cliente: string | null;
  endereco: string;
  lat?: number;
  lng?: number;
  ordem: number;
}

export interface RotaCalculada {
  pedidos: EntregaRota[];
  distanciaTotalKm: number;
  tempoTotalMin: number;
  polyline: string;
  origem: { lat: number; lng: number };
}

interface DeliveryTrackingState {
  entregas: EntregaRota[];
  rotaAtual: RotaCalculada | null;
  loading: boolean;
  error: string | null;

  carregarEntregas: () => Promise<void>;
  sairParaEntrega: (pedidoId: string) => Promise<{ success: boolean; error?: string }>;
  confirmarEntrega: (pedidoId: string) => Promise<{ success: boolean; error?: string }>;
  calcularRota: (origemLat?: number, origemLng?: number, pedidoIds?: string[]) => Promise<void>;
  gerarUrlMapa: (destino: string, waypoints?: string[]) => Promise<string>;
  limparRota: () => void;
  limparErro: () => void;
}

export const useDeliveryTrackingStore = create<DeliveryTrackingState>((set, get) => ({
  entregas: [],
  rotaAtual: null,
  loading: false,
  error: null,

  carregarEntregas: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get<EntregaRota[]>('/api/entregas/rota');
      set({ entregas: Array.isArray(data) ? data : [], loading: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar entregas.';
      set({ error: msg, loading: false });
    }
  },

  sairParaEntrega: async (pedidoId: string) => {
    set({ loading: true, error: null });
    try {
      await api.post(`/api/entregas/${pedidoId}/sair-entrega`);
      set({ loading: false });
      return { success: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao atualizar status de entrega.';
      set({ error: msg, loading: false });
      return { success: false, error: msg };
    }
  },

  confirmarEntrega: async (pedidoId: string) => {
    set({ loading: true, error: null });
    try {
      await api.post(`/api/entregas/${pedidoId}/confirmar-entrega`);
      set({ loading: false });
      return { success: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao confirmar entrega.';
      set({ error: msg, loading: false });
      return { success: false, error: msg };
    }
  },

  calcularRota: async (origemLat?: number, origemLng?: number, pedidoIds?: string[]) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post<RotaCalculada>('/api/entregas/rota/calcular', {
        origemLat,
        origemLng,
        pedidoIds,
      });
      set({ rotaAtual: data, loading: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao calcular rota.';
      set({ error: msg, loading: false });
    }
  },

  gerarUrlMapa: async (destino: string, waypoints?: string[]) => {
    try {
      const { data } = await api.post<{ url: string }>('/api/entregas/mapa/url', {
        destino,
        waypoints,
      });
      return data.url;
    } catch {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`;
      return url;
    }
  },

  limparRota: () => {
    set({ rotaAtual: null });
  },

  limparErro: () => {
    set({ error: null });
  },
}));
