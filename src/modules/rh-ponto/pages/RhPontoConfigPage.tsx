import { useEffect, useState } from 'react';
import { Settings, IdCard, QrCode, Fingerprint, ScanFace, Save, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { RhPageShell } from '../../rh/components/RhPageShell';
import { getPontoConfig, updatePontoConfig, type PontoConfigView } from '../services/pontoApi';

type Field = 'totemPinHabilitado' | 'totemQrHabilitado' | 'totemBiometriaHabilitado' | 'totemFacialHabilitado';

interface MetodoSpec {
  readonly field: Field;
  readonly icon: JSX.Element;
  readonly label: string;
  readonly descricao: string;
}

const METODOS: ReadonlyArray<MetodoSpec> = [
  { field: 'totemPinHabilitado', icon: <IdCard className="h-5 w-5" />, label: 'Matrícula + PIN',
    descricao: 'Funcionário digita matrícula + PIN de 4 dígitos.' },
  { field: 'totemQrHabilitado', icon: <QrCode className="h-5 w-5" />, label: 'QR Code',
    descricao: 'Funcionário apresenta o token QR pessoal.' },
  { field: 'totemBiometriaHabilitado', icon: <Fingerprint className="h-5 w-5" />, label: 'Biometria Digital',
    descricao: 'Leitor de impressão digital conectado via AuryaRhAgent.' },
  { field: 'totemFacialHabilitado', icon: <ScanFace className="h-5 w-5" />, label: 'Biometria Facial',
    descricao: 'Webcam + face-api.js. Reconhecimento 1:N no browser.' },
];

export default function RhPontoConfigPage(): JSX.Element {
  const [config, setConfig] = useState<PontoConfigView | null>(null);
  const [draft, setDraft] = useState<Record<Field, boolean> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const c = await getPontoConfig();
        setConfig(c);
        setDraft({
          totemPinHabilitado: c.totemPinHabilitado,
          totemQrHabilitado: c.totemQrHabilitado,
          totemBiometriaHabilitado: c.totemBiometriaHabilitado,
          totemFacialHabilitado: c.totemFacialHabilitado,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar configuração.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = (field: Field): void => {
    if (!draft) return;
    setDraft({ ...draft, [field]: !draft[field] });
    setInfo(null);
  };

  const dirty = !!(draft && config && (
    draft.totemPinHabilitado !== config.totemPinHabilitado ||
    draft.totemQrHabilitado !== config.totemQrHabilitado ||
    draft.totemBiometriaHabilitado !== config.totemBiometriaHabilitado ||
    draft.totemFacialHabilitado !== config.totemFacialHabilitado
  ));

  const alMenosUm = !!draft && (draft.totemPinHabilitado || draft.totemQrHabilitado || draft.totemBiometriaHabilitado || draft.totemFacialHabilitado);

  const save = async (): Promise<void> => {
    if (!draft || !dirty) return;
    if (!alMenosUm) {
      setError('Pelo menos um método precisa ficar habilitado.');
      return;
    }
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const updated = await updatePontoConfig(draft);
      setConfig(updated);
      setInfo('Configuração salva. As mudanças aparecem no totem após o próximo carregamento.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <RhPageShell
      title="Totem RH — Configuração"
      subtitle="Quais métodos de autenticação aparecem na tela do totem de ponto."
      icon={<Settings className="h-6 w-6" />}
      error={error}
    >
      {loading ? (
        <div className="inline-flex items-center gap-2 text-sm text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : !draft ? null : (
        <div className="space-y-4">
          {info ? (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
              <span>{info}</span>
            </div>
          ) : null}

          {!alMenosUm ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <span>Pelo menos um método precisa ficar habilitado — caso contrário, ninguém consegue marcar ponto pelo totem.</span>
            </div>
          ) : null}

          <ul className="space-y-2">
            {METODOS.map((m) => {
              const on = draft[m.field];
              return (
                <li key={m.field}>
                  <button
                    type="button"
                    onClick={() => toggle(m.field)}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition ${
                      on
                        ? 'border-violet-500/40 bg-violet-500/10 text-white'
                        : 'border-white/10 bg-slate-950/40 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${on ? 'bg-violet-500/20 text-violet-200' : 'bg-white/5 text-slate-500'}`}>
                        {m.icon}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{m.label}</div>
                        <div className="text-xs opacity-80">{m.descricao}</div>
                      </div>
                    </div>
                    <div
                      className={`relative h-6 w-11 rounded-full transition ${on ? 'bg-violet-500' : 'bg-slate-700'}`}
                      aria-label={on ? 'habilitado' : 'desabilitado'}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${on ? 'left-5' : 'left-0.5'}`} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving || !alMenosUm}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </RhPageShell>
  );
}
