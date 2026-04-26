import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import {
  Users,
  Plus,
  Trash2,
  ShieldCheck,
  Mail,
  User,
  Loader2,
  X,
  Sparkles,
  BrainCircuit,
  Activity,
  Hash,
  CheckCircle2,
  Pencil,
} from 'lucide-react';
import { AxiosError } from 'axios';
import { MODULES_CONFIG, permissionsForModules } from '../../../config/permissions';
import { fetchAccessCatalog, type CatalogModule } from '../../../services/accessCatalog';

export interface IUsuarioLoja {
  id: string;
  codigo: string | null;
  nome: string;
  email: string;
  username: string | null;
  role: string;
  permissoes?: string[];
  ativo: boolean;
  createdAt: string;
}

type ModalMode = 'create' | 'edit' | null;

const inputClass =
  'w-full bg-[#0b1324] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all';

export function GestaoUsuariosPage() {
  const [usuarios, setUsuarios] = useState<IUsuarioLoja[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'dados' | 'permissoes'>('dados');

  const [formData, setFormData] = useState({
    codigo: '',
    username: '',
    nome: '',
    email: '',
    senha: '',
    role: 'CAIXA',
    permissoes: [] as string[],
    ativo: true,
  });
  const [modulosLoja, setModulosLoja] = useState<string[]>([]);
  /** Catálogo da API — define permissões disponíveis filtradas pelos módulos ativos da loja. */
  const [catalogModules, setCatalogModules] = useState<CatalogModule[]>([]);

  useEffect(() => {
    void carregarUsuarios();

    let activeModules: string[] = [];
    try {
      const raw = localStorage.getItem('@PDVUsuario');
      if (raw) {
        const u = JSON.parse(raw) as { loja?: { modulosAtivos?: string[] } };
        activeModules = (u.loja?.modulosAtivos ?? []).map((m) => String(m).toUpperCase());
        setModulosLoja(activeModules);
      }
    } catch {
      setModulosLoja([]);
    }

    // Carrega catálogo e filtra pelos módulos ativos da loja
    fetchAccessCatalog()
      .then((catalog) => {
        const filtered = activeModules.length > 0
          ? catalog.modules.filter((m) => activeModules.includes(m.module))
          : catalog.modules;
        setCatalogModules(filtered);
      })
      .catch(() => {
        // Fallback: usa MODULES_CONFIG local
        setCatalogModules([]);
      });
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

  const totalAtivos = useMemo(() => usuarios.filter((u) => u.ativo).length, [usuarios]);

  const qtdGerentes = useMemo(
    () => usuarios.filter((u) => u.role === 'GERENTE' || u.role === 'DIRETOR').length,
    [usuarios]
  );

  const riscoIA = useMemo(() => {
    if (qtdGerentes > 3) {
      return {
        tipo: 'alto',
        texto: 'Muitos usuários com acesso elevado',
      };
    }
    return {
      tipo: 'ok',
      texto: 'Estrutura de acesso equilibrada',
    };
  }, [qtdGerentes]);

  const resetForm = () => {
    setFormData({
      codigo: '',
      username: '',
      nome: '',
      email: '',
      senha: '',
      role: 'CAIXA',
      permissoes: [],
      ativo: true,
    });
    setEditingId(null);
  };

  const abrirCriar = () => {
    resetForm();
    setModalMode('create');
  };

  const abrirEditar = (user: IUsuarioLoja) => {
    setEditingId(user.id);
    setFormData({
      codigo: user.codigo ?? '',
      username: user.username ?? '',
      nome: user.nome,
      email: user.email,
      senha: '',
      role: user.role,
      permissoes: user.permissoes ?? [],
      ativo: user.ativo,
    });
    setModalMode('edit');
  };

  const fecharModal = () => {
    setModalMode(null);
    resetForm();
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Permissões disponíveis para atribuição.
   * Fonte primária: catálogo da API (canônico, filtrado pelos módulos ativos da loja).
   * Fallback: MODULES_CONFIG local (legado).
   * Regra: usuário só pode receber permissões dos módulos ativos da loja.
   */
  const permissoesDisponiveis = useMemo<Array<{ module: string; moduleLabel: string; code: string; label: string }>>(() => {
    if (catalogModules.length > 0) {
      return catalogModules.flatMap((m) =>
        m.permissions.map((p) => ({
          module: m.module,
          moduleLabel: m.label,
          code: p.code,
          label: p.label,
        }))
      );
    }
    // Fallback legado
    return permissionsForModules(modulosLoja).map((code) => ({
      module: '',
      moduleLabel: '',
      code,
      label: code,
    }));
  }, [catalogModules, modulosLoja]);

  const togglePermissao = (code: string) => {
    setFormData((prev) => {
      const exists = prev.permissoes.includes(code);
      return {
        ...prev,
        permissoes: exists ? prev.permissoes.filter((p) => p !== code) : [...prev.permissoes, code],
      };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.codigo.trim()) {
      alert('O Código de Acesso do usuário é obrigatório! (Ex: 001, JOAO123)');
      return;
    }

    if (!formData.username.trim() || formData.username.trim().length < 3) {
      alert('Informe um nome de usuário com pelo menos 3 caracteres (letras, números, . _ -).');
      return;
    }

    if (!formData.nome.trim() || !formData.email.trim()) {
      alert('Preencha Nome e E-mail.');
      return;
    }

    if (modalMode === 'create' && formData.senha.trim().length < 6) {
      alert('Defina uma senha inicial com no mínimo 6 caracteres.');
      return;
    }

    setSaving(true);

    try {
      if (modalMode === 'create') {
        const payload = {
          codigo: formData.codigo.trim().toUpperCase(),
          username: formData.username.trim(),
          nome: formData.nome.trim(),
          email: formData.email.trim(),
          senha: formData.senha.trim(),
          role: formData.role,
          permissoes: formData.permissoes,
          ativo: formData.ativo,
        };
        console.log('[GestaoUsuarios] POST payload:', JSON.stringify(payload));
        await api.post('/api/usuarios', payload);
      } else if (modalMode === 'edit' && editingId) {
        const payload: Record<string, unknown> = {
          codigo: formData.codigo.trim().toUpperCase(),
          username: formData.username.trim(),
          nome: formData.nome.trim(),
          email: formData.email.trim(),
          role: formData.role,
          permissoes: formData.permissoes,
          ativo: formData.ativo,
        };
        const senhaTrim = formData.senha.trim();
        if (senhaTrim.length >= 6) {
          payload.senha = senhaTrim;
        }
        await api.put(`/api/usuarios/${editingId}`, payload);
      }

      fecharModal();
      await carregarUsuarios();
    } catch (err) {
      const error = err as AxiosError<{ error?: string; erro?: string; message?: string }>;
      const serverMsg = error.response?.data?.error || error.response?.data?.erro || error.response?.data?.message;
      console.error('[GestaoUsuarios] Erro ao salvar:', serverMsg, error.response?.data);
      alert(serverMsg || 'Erro ao salvar usuário. Verifique dados únicos (e-mail / username).');
    } finally {
      setSaving(false);
    }
  };

  const excluirUsuario = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário?')) return;
    try {
      await api.delete(`/api/usuarios/${id}`);
      await carregarUsuarios();
    } catch {
      alert('Erro ao excluir usuário.');
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="rounded-[30px] border border-white/10 p-6 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] shadow-xl flex justify-between items-center flex-wrap gap-4">
          <div className="flex gap-4 items-center">
            <div className="p-3 bg-violet-500/10 border border-violet-400/20 rounded-2xl">
              <Users className="text-violet-300 w-6 h-6" />
            </div>

            <div>
              <p className="text-[11px] text-violet-300 font-black uppercase tracking-widest flex gap-2 items-center mb-1">
                <Sparkles className="w-3.5 h-3.5" /> Team Intelligence
              </p>
              <h1 className="text-white text-2xl font-black tracking-tight">Gestão de Equipe</h1>
              <p className="text-xs text-slate-500 mt-1">Listagem, edição e bloqueio de acessos da loja.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={abrirCriar}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 rounded-xl text-white font-black flex gap-2 items-center shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all hover:scale-[1.02]"
          >
            <Plus className="w-5 h-5" /> Novo Usuário
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#08101f]/90 border border-white/10 p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Usuários ativos</p>
              <p className="text-2xl font-black text-white">
                {totalAtivos} / {usuarios.length}
              </p>
            </div>
          </div>

          <div className="bg-[#08101f]/90 border border-white/10 p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Acesso elevado</p>
              <p className="text-2xl font-black text-white">{qtdGerentes} gerentes</p>
            </div>
          </div>

          <div className="bg-[#08101f]/90 border border-white/10 p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Análise IA</p>
              <p className="text-sm font-bold text-emerald-300 mt-1">{riscoIA.texto}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#08101f]/90 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-black/20 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3 hidden sm:table-cell">E-mail</th>
                    <th className="px-4 py-3">Papel</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-white">{user.nome}</div>
                        <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                          <Hash className="w-3 h-3" />
                          {user.codigo || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300">
                        {user.username || <span className="text-amber-400/80 text-xs">definir no editar</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                          {user.email}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                            user.role === 'GERENTE' || user.role === 'DIRETOR'
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                              : 'bg-violet-500/10 text-violet-300 border-violet-500/20'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.ativo ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide">
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/25 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide">
                            Bloqueado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => abrirEditar(user)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-violet-300 hover:bg-violet-500/10 border border-transparent hover:border-violet-500/20 transition-colors mr-1"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => excluirUsuario(user.id)}
                          className="inline-flex p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {usuarios.length === 0 && (
              <p className="text-center text-slate-500 py-12 text-sm">Nenhum usuário nesta loja.</p>
            )}
          </div>
        )}

        {modalMode && (
          <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#08101f] border border-white/10 rounded-[30px] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-[0_25px_80px_rgba(0,0,0,0.8)]">
              <div className="h-1.5 w-full bg-gradient-to-r from-violet-600 to-fuchsia-600" />

              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20 shrink-0">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <User className="w-6 h-6 text-violet-400" />
                  {modalMode === 'create' ? 'Novo Usuário' : 'Editar usuário'}
                </h2>
                <button
                  type="button"
                  onClick={fecharModal}
                  className="text-slate-400 hover:text-white p-2 bg-white/5 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex border-b border-white/10 bg-black/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('dados')}
                  className={`flex-1 py-3.5 text-sm font-bold uppercase tracking-wider transition-colors ${
                    activeTab === 'dados'
                      ? 'text-violet-300 border-b-2 border-violet-500 bg-violet-500/10'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Dados Gerais
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('permissoes')}
                  className={`flex-1 py-3.5 text-sm font-bold uppercase tracking-wider transition-colors ${
                    activeTab === 'permissoes'
                      ? 'text-violet-300 border-b-2 border-violet-500 bg-violet-500/10'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Permissões
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {activeTab === 'dados' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                          Nome de usuário (login) *
                        </label>
                        <input
                          required
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          placeholder="joao.caixa"
                          autoComplete="off"
                          className={`${inputClass} font-mono`}
                        />
                        <p className="text-[10px] text-slate-500 mt-1.5 pl-1">
                          Usado no login junto com o e-mail. Apenas letras, números, ponto, _ e hífen.
                        </p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                          Código de Acesso (PDV) *
                        </label>
                        <input
                          required
                          name="codigo"
                          value={formData.codigo}
                          onChange={handleInputChange}
                          placeholder="Ex: 001, JOAO123"
                          className={`${inputClass} font-mono uppercase`}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                          Nome completo *
                        </label>
                        <input
                          required
                          name="nome"
                          value={formData.nome}
                          onChange={handleInputChange}
                          placeholder="Nome do funcionário"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                          E-mail *
                        </label>
                        <input
                          required
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="email@empresa.com"
                          className={inputClass}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="min-w-0 sm:col-span-2">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                            {modalMode === 'create' ? 'Senha inicial *' : 'Nova senha'}
                          </label>
                          <input
                            type="password"
                            name="senha"
                            value={formData.senha}
                            onChange={handleInputChange}
                            placeholder={modalMode === 'edit' ? 'Deixe em branco para manter' : 'Mín. 6 caracteres'}
                            minLength={modalMode === 'create' ? 6 : undefined}
                            required={modalMode === 'create'}
                            autoComplete="new-password"
                            className={inputClass}
                          />
                          <p className="text-[10px] text-slate-500 mt-1.5 pl-1 leading-relaxed">
                            Na edição, deixe em branco para manter a senha atual. Para alterar, use no mínimo 6 caracteres.
                          </p>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">
                            Nível de acesso *
                          </label>
                          <select
                            name="role"
                            value={formData.role}
                            onChange={handleInputChange}
                            className={`${inputClass} font-bold`}
                          >
                            <option value="CAIXA">Operador de Caixa</option>
                            <option value="VENDEDOR">Vendedor</option>
                            <option value="GERENTE">Gerente</option>
                            <option value="DIRETOR">Diretor</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0b1324] px-4 py-3">
                        <div>
                          <p className="text-sm font-bold text-white">Usuário ativo</p>
                          <p className="text-[11px] text-slate-500">Desligue para bloquear o login deste usuário.</p>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            name="ativo"
                            checked={formData.ativo}
                            onChange={handleInputChange}
                            className="peer sr-only"
                          />
                          <div className="h-7 w-12 rounded-full bg-slate-700 peer-checked:bg-emerald-600 transition-colors peer-focus:ring-2 peer-focus:ring-violet-500/40 after:absolute after:top-0.5 after:left-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
                        </label>
                      </div>
                    </>
                  )}

                  {activeTab === 'permissoes' && (
                    <div className="rounded-xl border border-white/10 bg-[#0b1324] p-4">
                      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Permissões por módulo ativo da loja
                      </p>
                      {/* Fonte primária: catálogo da API (canônico, filtrado pelos módulos da loja) */}
                      {catalogModules.length > 0
                        ? catalogModules.map((mod) => (
                          <div key={mod.module} className="mb-3">
                            <p className="mb-1 text-xs font-bold text-violet-300">{mod.label}</p>
                            <div className="flex flex-wrap gap-2">
                              {mod.permissions.map((perm) => {
                                const checked = formData.permissoes.includes(perm.code);
                                return (
                                  <button
                                    key={perm.code}
                                    type="button"
                                    onClick={() => togglePermissao(perm.code)}
                                    className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                                      checked
                                        ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200'
                                        : 'border-white/10 bg-white/5 text-slate-300'
                                    }`}
                                  >
                                    {perm.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))
                        /* Fallback: MODULES_CONFIG local enquanto catálogo carrega */
                        : MODULES_CONFIG.filter((m) => modulosLoja.length === 0 || modulosLoja.includes(m.id)).map((moduleDef) => (
                          <div key={moduleDef.id} className="mb-3">
                            <p className="mb-1 text-xs font-bold text-violet-300">{moduleDef.label}</p>
                            <div className="flex flex-wrap gap-2">
                              {moduleDef.permissions.map((perm) => {
                                const checked = formData.permissoes.includes(perm.code);
                                return (
                                  <button
                                    key={perm.code}
                                    type="button"
                                    onClick={() => togglePermissao(perm.code)}
                                    className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                                      checked
                                        ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200'
                                        : 'border-white/10 bg-white/5 text-slate-300'
                                    }`}
                                  >
                                    {perm.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      }
                      {permissoesDisponiveis.length === 0 && catalogModules.length === 0 && (
                        <p className="text-xs text-slate-500">Nenhum módulo ativo na loja para delegar permissões.</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-6 pt-4 mt-auto border-t border-white/10 bg-[#08101f]/50 flex gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={fecharModal}
                    className="flex-1 py-3.5 rounded-xl border border-white/10 text-slate-300 font-bold hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:scale-[1.02] transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                    {saving ? 'Salvando...' : modalMode === 'create' ? 'Criar Acesso' : 'Salvar'}
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
