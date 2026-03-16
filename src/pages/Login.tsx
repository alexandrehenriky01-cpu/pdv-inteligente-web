import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      // 1. Bate na porta do nosso Backend
      const response = await axios.post('https://pdv-inteligente-api.onrender.com/login', {
        email,
        senha
      });

      // 2. Pega o "Crachá" (Token) e os dados do usuário
      const { token, usuario } = response.data;

      // 3. Salva o crachá no cofre do navegador (LocalStorage)
      localStorage.setItem('@PDVToken', token);
      localStorage.setItem('@PDVUsuario', JSON.stringify(usuario));

      // 4. Redireciona para o Dashboard
      navigate('/dashboard');
      
    } catch (err: any) {
      // Se o backend devolver erro (ex: senha errada), mostramos na tela
      if (err.response?.data?.erro) {
        setErro(err.response.data.erro);
      } else {
        setErro('Erro ao conectar com o servidor. O Backend está rodando?');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800">PDV Inteligente</h2>
          <p className="text-slate-500 mt-2">Faça login para acessar sua loja</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="joao@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          {erro && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm text-center">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:bg-blue-400"
          >
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}