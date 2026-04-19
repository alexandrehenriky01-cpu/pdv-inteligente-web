import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  locality: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  erro?: boolean;
}

export interface AddressData {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  complemento: string;
}

interface UseCepReturn {
  addressData: AddressData | null;
  isLoading: boolean;
  error: string | null;
  fetchAddress: (cep: string) => Promise<void>;
  clearAddress: () => void;
}

function formatCep(cep: string): string {
  return cep.replace(/\D/g, '').slice(0, 8);
}

export function useCep(): UseCepReturn {
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAddress = useCallback(async (cep: string) => {
    const cleanCep = formatCep(cep);

    if (cleanCep.length !== 8) {
      setError('CEP deve ter 8 dígitos');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get<ViaCepResponse>(
        `https://viacep.com.br/ws/${cleanCep}/json/`
      );

      if (response.data.erro) {
        setError('CEP não encontrado');
        setAddressData(null);
        toast.error('CEP não encontrado', { toastId: 'cep-error' });
        return;
      }

const v = response.data as unknown as { [key: string]: string | undefined };
      const data: AddressData = {
        cep: v.cep || '',
        logradouro: v.logradouro || '',
        bairro: v.bairro || '',
        cidade: v.localidade || '',
        uf: v.uf || '',
        complemento: v.complemento || '',
      };

      console.log('useCep - setting addressData:', data);
      setAddressData(data);
      toast.success('Endereço encontrado', { toastId: 'cep-success' });
    } catch (e) {
      const message = axios.isAxiosError(e)
        ? 'Erro ao buscar CEP'
        : 'Erro ao buscar endereço';
      setError(message);
      setAddressData(null);
      toast.error(message, { toastId: 'cep-error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAddress = useCallback(() => {
    setAddressData(null);
    setError(null);
  }, []);

  return { addressData, isLoading, error, fetchAddress, clearAddress };
}