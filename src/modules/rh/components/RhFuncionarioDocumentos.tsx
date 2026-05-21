import { useCallback, useEffect, useState } from 'react';
import { Download, FileText, Paperclip, Plus, Trash2, X } from 'lucide-react';
import {
  createDocumento,
  deleteDocumento,
  downloadDocumento,
  DOCUMENTO_MAX_BYTES,
  DOCUMENTO_MIMES_ACEITOS,
  fileToBase64,
  listDocumentos,
  type DocumentoMime,
} from '../services/rhApi';
import type { RhDocumentoView, RhTipoDocumento } from '../types/rh.types';

const TIPO_LABEL: Record<RhTipoDocumento, string> = {
  RG: 'RG',
  CPF: 'CPF',
  CTPS: 'CTPS',
  PIS: 'PIS',
  CONTRATO: 'Contrato',
  ASO: 'ASO',
  OUTRO: 'Outro',
};
const TIPOS: ReadonlyArray<RhTipoDocumento> = ['RG', 'CPF', 'CTPS', 'PIS', 'CONTRATO', 'ASO', 'OUTRO'];

interface DocForm {
  tipoDocumento: RhTipoDocumento;
  numero: string;
  emissor: string;
  dataEmissao: string;
  dataValidade: string;
  observacoes: string;
  arquivo: File | null;
}

const emptyForm: DocForm = {
  tipoDocumento: 'RG',
  numero: '',
  emissor: '',
  dataEmissao: '',
  dataValidade: '',
  observacoes: '',
  arquivo: null,
};

async function sha256Hex(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return text.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0).toString(16).padStart(64, '0');
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export interface RhFuncionarioDocumentosProps {
  readonly funcionarioId: string;
  readonly readOnly?: boolean;
  readonly onChange?: () => void;
}

export function RhFuncionarioDocumentos({ funcionarioId, readOnly = false, onChange }: RhFuncionarioDocumentosProps): JSX.Element {
  const [items, setItems] = useState<RhDocumentoView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<DocForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listDocumentos(funcionarioId, { pageSize: 200 });
      setItems([...r.items]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar documentos.');
    } finally {
      setLoading(false);
    }
  }, [funcionarioId]);

  useEffect(() => { void reload(); }, [reload]);

  const openForm = (): void => {
    setForm(emptyForm);
    setError(null);
    setInfo(null);
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      let arquivoBase64: string | null = null;
      let arquivoMime: DocumentoMime | null = null;
      let nomeArquivo: string | null = null;
      if (form.arquivo) {
        if (form.arquivo.size > DOCUMENTO_MAX_BYTES) {
          throw new Error(`Arquivo excede 2MB (${fmtSize(form.arquivo.size)}).`);
        }
        const mime = form.arquivo.type;
        if (!DOCUMENTO_MIMES_ACEITOS.includes(mime as DocumentoMime)) {
          throw new Error(`Tipo "${mime}" não permitido. Use PDF, JPG, PNG, WebP, HEIC ou GIF.`);
        }
        const r = await fileToBase64(form.arquivo);
        arquivoBase64 = r.base64;
        arquivoMime = mime as DocumentoMime;
        nomeArquivo = form.arquivo.name;
      }
      const hashConteudo = arquivoBase64
        ? null /// backend recalcula via SHA do binário
        : await sha256Hex(`aurya-rh-doc|${funcionarioId}|${form.tipoDocumento}|${form.numero}|${form.emissor}|${form.dataEmissao}`);

      await createDocumento({
        funcionarioId,
        tipoDocumento: form.tipoDocumento,
        numero: form.numero.trim() || null,
        emissor: form.emissor.trim() || null,
        dataEmissao: form.dataEmissao ? new Date(`${form.dataEmissao}T00:00:00Z`).toISOString() : null,
        dataValidade: form.dataValidade ? new Date(`${form.dataValidade}T00:00:00Z`).toISOString() : null,
        nomeArquivo,
        hashConteudo,
        storageRef: null,
        observacoes: form.observacoes.trim() || null,
        arquivoBase64,
        arquivoMime,
      });
      setShowForm(false);
      setInfo(arquivoBase64 ? 'Documento cadastrado com arquivo.' : 'Documento cadastrado.');
      await reload();
      onChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao cadastrar documento.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string): Promise<void> => {
    if (!window.confirm('Remover este documento?')) return;
    try {
      await deleteDocumento(id);
      setInfo('Documento removido.');
      await reload();
      onChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao remover.');
    }
  };

  const download = async (doc: RhDocumentoView): Promise<void> => {
    try {
      const { blob, filename } = await downloadDocumento(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao baixar.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
          <FileText className="h-4 w-4" />
          <span>Documentos do funcionário ({items.length})</span>
        </div>
        {!readOnly ? (
          <button
            type="button"
            onClick={openForm}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white hover:from-violet-500 hover:to-fuchsia-500"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</div>
      ) : null}
      {info ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">{info}</div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/30">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/5 uppercase tracking-wide text-slate-300">
            <tr>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Número</th>
              <th className="px-3 py-2">Emissor</th>
              <th className="px-3 py-2">Validade</th>
              <th className="px-3 py-2">Arquivo</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">Carregando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">Nenhum documento cadastrado.</td></tr>
            ) : (
              items.map((d) => (
                <tr key={d.id} className="border-t border-white/5">
                  <td className="px-3 py-2 text-slate-200">{TIPO_LABEL[d.tipoDocumento]}</td>
                  <td className="px-3 py-2 text-slate-300">{d.numero ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-300">{d.emissor ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-300">
                    {d.dataValidade ? new Date(d.dataValidade).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-400">
                    {d.arquivoMime ? (
                      <span className="inline-flex items-center gap-1 rounded bg-violet-500/10 px-2 py-0.5 text-violet-200">
                        <Paperclip className="h-3 w-3" />
                        {d.nomeArquivo ?? d.arquivoMime}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-1">
                      {d.arquivoMime ? (
                        <button
                          type="button"
                          onClick={() => void download(d)}
                          title="Baixar arquivo"
                          className="rounded-md border border-violet-500/30 bg-violet-500/10 p-1 text-violet-200 hover:bg-violet-500/20"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                      {!readOnly ? (
                        <button
                          type="button"
                          onClick={() => void remove(d.id)}
                          title="Remover"
                          className="rounded-md border border-rose-500/30 bg-rose-500/10 p-1 text-rose-200 hover:bg-rose-500/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={(e) => void submit(e)}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Adicionar documento</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Faça upload do PDF/imagem (máx. 2MB) ou apenas cadastre os metadados.
              O hash de integridade é calculado automaticamente.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs uppercase tracking-wide text-slate-400">Tipo *</span>
                <select
                  required
                  value={form.tipoDocumento}
                  onChange={(e) => setForm({ ...form, tipoDocumento: e.target.value as RhTipoDocumento })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                >
                  {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wide text-slate-400">Número</span>
                <input
                  value={form.numero}
                  onChange={(e) => setForm({ ...form, numero: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wide text-slate-400">Emissor</span>
                <input
                  value={form.emissor}
                  onChange={(e) => setForm({ ...form, emissor: e.target.value })}
                  placeholder="SSP/SP, MTE, etc."
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wide text-slate-400">Validade</span>
                <input
                  type="date"
                  value={form.dataValidade}
                  onChange={(e) => setForm({ ...form, dataValidade: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wide text-slate-400">Data de emissão</span>
                <input
                  type="date"
                  value={form.dataEmissao}
                  onChange={(e) => setForm({ ...form, dataEmissao: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-400">Arquivo (PDF/imagem, máx. 2MB)</span>
              <input
                type="file"
                accept={DOCUMENTO_MIMES_ACEITOS.join(',')}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setForm({ ...form, arquivo: file });
                }}
                className="mt-1 block w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white file:mr-2 file:rounded-md file:border-0 file:bg-violet-500/20 file:px-3 file:py-1 file:text-violet-200"
              />
              {form.arquivo ? (
                <span className="mt-1 block text-xs text-slate-400">
                  {form.arquivo.name} · {fmtSize(form.arquivo.size)}
                </span>
              ) : (
                <span className="mt-1 block text-xs text-slate-500">Opcional — cadastro só com metadados também é válido.</span>
              )}
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-400">Observações</span>
              <textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? 'Salvando…' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
