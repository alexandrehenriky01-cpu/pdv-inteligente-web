import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import {
  Users,
  Plus,
  Trash2,
  ShieldCheck,
  Mail,
  User,
  Key,
  Loader2,
  X,
  ShieldAlert,
  Monitor,
  Sparkles,
  BrainCircuit,
  Activity,
  BadgeCheck,
  Hash,
  CheckCircle2
} from 'lucide-react';
import { AxiosError } from 'axios';

// 🚀 1. Adicionado o campo 'codigo' na interface
export interface IUsuarioLoja {
  id: string;
  codigo: string; 
  nome: string;
  email: string;
  role: string;
  createdAt: string;
}

export function GestaoUsuariosPage() {
  const [usuarios, setUsuarios] = useState<IUsuarioLoja[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // 🚀 2. Adicionado o 'codigo' no estado inicial do formulário
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    email: '',
    senha: '',
    role: 'CAIXA'
  });

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const response = await api.get<IUsuarioLoja[]>('/api/usuarios');
      setUsuarios(response.data);
    } finally {
      setLoading(false);
    }
  };

  const totalUsuarios = usuarios.length;

  const qtdGerentes = useMemo(
    () => usuarios.filter(u => u.role === 'GERENTE' || u.role === 'DIRETOR').length,
    [usuarios]
  );

  const riscoIA = useMemo(() => {
    if (qtdGerentes > 3) {
      return {
        tipo: 'alto',
        texto: 'Muitos usuários com acesso elevado'
      };
    }
    return {
      tipo: 'ok',
      texto: 'Estrutura de acesso equilibrada'
    };
  }, [qtdGerentes]);

  const handleInputChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    
    // 🚀 3. TRAVA DE SEGURANÇA: Código é obrigatório no banco!
    if (!formData.codigo.trim()) {
      alert('⚠️ O Código de Acesso do usuário é obrigatório! (Ex: 001, JOAO123)');
      return;
    }

    if (!formData.nome.trim() || !formData.email.trim() || !formData.senha.trim()) {
      alert('⚠️ Preencha todos os campos (Nome, Email e Senha).');
      return;
    }

    setSaving(true);

    try {
      await api.post('/api/usuarios', {
        ...formData,
        codigo: formData.codigo.trim().toUpperCase() // Envia sempre em maiúsculo
      });
      setIsModalOpen(false);
      setFormData({ codigo: '', nome: '', email: '', senha: '', role: 'CAIXA' });
      carregarUsuarios();
    } catch (err) {
      const error = err as AxiosError<{ error?: string, erro?: string }>;
      alert(error.response?.data?.error || error.response?.data?.erro || 'Erro ao criar usuário. O código ou email já pode estar em uso.');
    } finally {
      setSaving(false);
    }
  };

  const excluirUsuario = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário?')) return;
    try {
      await api.delete(`/api/usuarios/${id}`);
      carregarUsuarios();
    } catch (err) {
      alert('Erro ao excluir usuário.');
    }
  };

  const inputClass = "w-full bg-[#0b1324] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all";

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* HEADER */}
        <div className="rounded-[30px] border border-white/10 p-6 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] shadow-xl flex justify-between items-center">

          <div className="flex gap-4 items-center">
            <div className="p-3 bg-violet-500/10 border border-violet-400/20 rounded-2xl">
              <Users className="text-violet-300 w-6 h-6" />
            </div>

            <div>
              <p className="text-[11px] text-violet-300 font-black uppercase tracking-widest flex gap-2 items-center mb-1">
                <Sparkles className="w-3.5 h-3.5" /> Team Intelligence
              </p>
              <h1 className="text-white text-2xl font-black tracking-tight">
                Gestão de Equipe
              </h1>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 rounded-xl text-white font-black flex gap-2 items-center shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all hover:scale-[1.02]"
          >
            <Plus className="w-5 h-5" /> Novo Usuário
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="bg-[#08101f]/90 border border-white/10 p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl"><Activity className="w-6 h-6" /></div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Ativos</p>
              <p className="text-2xl font-black text-white">{totalUsuarios} usuários</p>
            </div>
          </div>

          <div className="bg-[#08101f]/90 border border-white/10 p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl"><ShieldCheck className="w-6 h-6" /></div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Acesso Elevado</p>
              <p className="text-2xl font-black text-white">{qtdGerentes} gerentes</p>
            </div>
          </div>

          <div className="bg-[#08101f]/90 border border-white/10 p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl"><BrainCircuit className="w-6 h-6" /></div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Análise IA</p>
              <p className="text-sm font-bold text-emerald-300 mt-1">{riscoIA.texto}</p>
            </div>
          </div>

        </div>

        {/* LISTA DE USUÁRIOS */}
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-violet-400 animate-spin" /></div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {usuarios.map(user => (
              <div key={user.id} className="bg-[#08101f] p-6 rounded-[24px] border border-white/10 shadow-lg hover:border-violet-500/30 transition-all group">
                
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300 font-black text-lg">
                      {user.nome.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-white font-black text-lg">{user.nome}</h3>
                      {/* 🚀 4. Exibindo o código de acesso no card */}
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10 mt-1">
                        <Hash className="w-3 h-3" /> COD: {user.codigo || 'S/CÓD'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-5">
                  <p className="text-slate-400 text-sm flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-500" /> {user.email}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                    user.role === 'GERENTE' || user.role === 'DIRETOR' ? 'bg-rose-500/10 text-rose-300 border-rose-500/20' : 'bg-violet-500/10 text-violet-300 border-violet-500/20'
                  }`}>
                    {user.role}
                  </span>

                  <button onClick={() => excluirUsuario(user.id)} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* MODAL DE NOVO USUÁRIO */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#08101f] border border-white/10 rounded-[30px] w-full max-w-md overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.8)] animate-[modalEnter_0.3s_ease-out]">
              
              <div className="h-1.5 w-full bg-gradient-to-r from-violet-600 to-fuchsia-600"></div>
              
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <User className="w-6 h-6 text-violet-400" /> Novo Usuário
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-2 bg-white/5 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">

                {/* 🚀 5. O CAMPO DE CÓDIGO FINALMENTE AQUI! */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Código de Acesso (Login PDV) *</label>
                  <input 
                    required
                    name="codigo" 
                    value={formData.codigo} 
                    onChange={handleInputChange} 
                    placeholder="Ex: 001, JOAO123" 
                    className={`${inputClass} font-mono uppercase`} 
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5 pl-1">Este código será usado para login rápido no PDV.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Nome Completo *</label>
                  <input required name="nome" value={formData.nome} onChange={handleInputChange} placeholder="Nome do funcionário" className={inputClass} />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">E-mail de Acesso *</label>
                  <input required type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="email@empresa.com" className={inputClass} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Senha Inicial *</label>
                    <input required type="password" name="senha" value={formData.senha} onChange={handleInputChange} placeholder="Min. 6 chars" minLength={6} className={inputClass} />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Nível de Acesso *</label>
                    <select name="role" value={formData.role} onChange={handleInputChange} className={`${inputClass} font-bold`}>
                      <option value="CAIXA">Operador de Caixa</option>
                      <option value="VENDEDOR">Vendedor</option>
                      <option value="GERENTE">Gerente</option>
                      <option value="DIRETOR">Diretor</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-white/10 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 rounded-xl border border-white/10 text-slate-300 font-bold hover:bg-white/5 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving} className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:scale-[1.02] transition-all flex justify-center items-center gap-2 disabled:opacity-50">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    {saving ? 'Salvando...' : 'Criar Acesso'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}