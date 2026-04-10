// src/types/auth.ts

export interface IUsuario {
  id: string;
  codigo?: string; // 🚀 NOVO: Código do operador/usuário adicionado aqui!
  nome: string;
  email: string;
  role?: 'SUPER_ADMIN' | 'DIRETOR' | 'GERENTE' | 'VENDEDOR' |'CAIXA' | string; 
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