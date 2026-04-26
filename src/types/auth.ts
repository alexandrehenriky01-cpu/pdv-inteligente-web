// src/types/auth.ts

export interface IUsuario {
  id: string;
  codigo?: string | null;
  nome: string;
  email: string;
  username?: string | null;
  ativo?: boolean;
  role?: 'SUPER_ADMIN' | 'SUPORTE_MASTER' | 'DIRETOR' | 'GERENTE' | 'VENDEDOR' | 'CAIXA' | string;
  permissoes?: string[];
  featuresAtivas?: string[];
  loja?: {
    modulosAtivos?: string[];
    featuresAtivas?: string[];
    nome?: string;
  };
  lojaId: string;
}

export interface ILoginResponse {
  token: string;
  usuario: IUsuario;
}

export interface IAuthError {
  erro?: string;
  error?: string;
  mensagem?: string;
}