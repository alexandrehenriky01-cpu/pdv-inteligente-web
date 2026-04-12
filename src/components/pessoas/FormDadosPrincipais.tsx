import React, { useState } from 'react'; // 🚀 1. IMPORTAMOS O useState
import {
  Sparkles,
  Loader2,
  BrainCircuit,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

import {
  IFormPessoaProps,
  IIASugestoes,
  TipoPessoa
} from '../../types/pessoa';

interface IProps extends IFormPessoaProps {
  iaLoading: boolean;
  preencherComAurya: () => void;
  iaSugestoes: IIASugestoes | null;
}

export const FormDadosPrincipais: React.FC<IProps> = ({
  formData,
  setFormData,
  inputClass,
  labelClass,
  iaLoading,
  preencherComAurya,
  iaSugestoes
}) => {

  // 🚀 2. CRIAMOS UM ESTADO PARA CONTROLAR O MODO DA TELA (Padrão: Jurídica)
  const [tipoDocumento, setTipoDocumento] = useState<'JURIDICA' | 'FISICA'>('JURIDICA');

  // 🚀 3. AGORA A LÓGICA DEPENDE DO SELECT, NÃO DO TAMANHO DA STRING
  const isCpf = tipoDocumento === 'FISICA';
  const isCnpj = tipoDocumento === 'JURIDICA';

  return (
    <div className="space-y-6 animate-fade-in-down">

      {/* 🔥 MOTOR AURYA (REDESIGN COMPLETO) */}
      {isCnpj ? (
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.20),_transparent_30%),linear-gradient(135deg,_#0b1020_0%,_#08101f_55%,_#0a1224_100%)] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.45)]">

          <div className="flex flex-col lg:flex-row gap-5 justify-between items-start lg:items-center">

            {/* TEXTO */}
            <div className="flex items-center gap-4">

              <div className="relative shrink-0 hidden sm:block">
                <img
                  src="/Aurya.jpeg"
                  alt="Aurya"
                  className="w-14 h-14 rounded-full border-2 border-violet-500 shadow-[0_0_25px_rgba(139,92,246,0.5)]"
                />
                <Sparkles className="w-4 h-4 text-violet-300 absolute -bottom-1 -right-1 animate-pulse" />
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-violet-300 font-black flex items-center gap-2">
                  <BrainCircuit className="w-3 h-3" />
                  Motor Inteligente Aurya
                </p>

                <h4 className="text-white font-black text-base mt-1">
                  Preenchimento automático + análise estratégica
                </h4>

                <p className="text-slate-400 text-sm mt-1">
                  Digite o CNPJ e a IA preenche + analisa risco e crédito.
                </p>
              </div>
            </div>

            {/* INPUT + BOTÃO */}
            <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">

              <input
                type="text"
                value={formData.cpfCnpj ?? ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    cpfCnpj: e.target.value.replace(/\D/g, '')
                  })
                }
                className="w-full sm:w-48 text-center font-mono text-lg bg-[#0b1324] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20"
                placeholder="CNPJ..."
                maxLength={14}
              />

              <button
                type="button"
                onClick={preencherComAurya}
                disabled={
                  iaLoading ||
                  (formData.cpfCnpj ?? '').replace(/\D/g, '').length < 14
                }
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-3 rounded-xl font-black flex items-center gap-2 transition-all shadow-[0_0_25px_rgba(139,92,246,0.35)] hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(139,92,246,0.6)] disabled:opacity-50"
              >
                {iaLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}

                {iaLoading ? 'Buscando...' : 'Aurya'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 p-6 bg-[#08101f]/90 border border-white/10 rounded-2xl shadow-lg">
          <label className={labelClass}>CPF *</label>
          <input
            type="text"
            value={formData.cpfCnpj ?? ''}
            onChange={e =>
              setFormData({
                ...formData,
                cpfCnpj: e.target.value.replace(/\D/g, '')
              })
            }
            className={`${inputClass} max-w-sm font-mono text-lg`}
            placeholder="CPF..."
            maxLength={11}
          />
        </div>
      )}

      {/* 🔥 DOSSIÊ IA (UPGRADE) */}
      {iaSugestoes && isCnpj && (
        <div className="bg-[#08101f]/90 border border-white/10 rounded-[30px] p-6 shadow-inner relative overflow-hidden">

          <div className="absolute top-0 right-0 opacity-10">
            <BrainCircuit className="w-32 h-32 text-violet-500" />
          </div>

          <div className="relative z-10">

            <h4 className="text-xs font-black text-violet-300 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Dossiê Inteligente
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">

              <CardInfo label="Tipo" value={iaSugestoes.tipo} />

              <CardInfo label="Categoria" value={iaSugestoes.categoria} />

              <div className="bg-[#0b1324] border border-white/10 p-3 rounded-xl">
                <p className="text-xs text-slate-500 font-bold">RISCO</p>
                <p className={`font-black text-sm flex gap-1 items-center ${
                  iaSugestoes.risco === 'Baixo'
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}>
                  {iaSugestoes.risco === 'Baixo'
                    ? <ShieldCheck size={14}/>
                    : <AlertTriangle size={14}/>}
                  {iaSugestoes.risco}
                </p>
              </div>

              <CardInfo
                label="Prazo"
                value={iaSugestoes.prazo}
                highlight
              />
            </div>

            <div className="bg-[#0b1324] border border-white/10 rounded-xl p-4">
              <ul className="space-y-2">
                {iaSugestoes.insights.map((i, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-violet-300 mt-[2px]" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 FORM BASE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div>
          <label className={labelClass}>Tipo de Documento</label>
          <select
            value={tipoDocumento}
            onChange={(e) => {
              // 🚀 4. QUANDO O USUÁRIO MUDA O SELECT, TROCAMOS O MODO E LIMPAMOS O INPUT
              setTipoDocumento(e.target.value as 'JURIDICA' | 'FISICA');
              setFormData({ ...formData, cpfCnpj: '' });
            }}
            className={inputClass}
          >
            <option value="JURIDICA">Pessoa Jurídica</option>
            <option value="FISICA">Pessoa Física</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Papel Comercial</label>
          <select
            value={formData.tipo}
            onChange={e => {
              const novoTipo = e.target.value as TipoPessoa;
              const papelComCliente =
                novoTipo === 'CLIENTE' ||
                novoTipo === 'AMBOS' ||
                novoTipo === 'FUNCIONARIO';
              setFormData({
                ...formData,
                tipo: novoTipo,
                ...(!papelComCliente ? { consumidorFinal: false } : {}),
              });
            }}
            className={inputClass}
          >
            <option value="CLIENTE">Cliente</option>
            <option value="FORNECEDOR">Fornecedor</option>
            <option value="AMBOS">Ambos</option>
            <option value="FUNCIONARIO">Funcionário</option>
          </select>
        </div>

        {(formData.tipo === 'CLIENTE' ||
          formData.tipo === 'AMBOS' ||
          formData.tipo === 'FUNCIONARIO') && (
          <div className="md:col-span-2">
            <label
              className={`${labelClass} flex items-center gap-3 cursor-pointer select-none rounded-xl border border-white/10 bg-[#0b1324] px-4 py-3.5 hover:border-violet-500/30 transition-colors`}
            >
              <input
                type="checkbox"
                checked={formData.consumidorFinal === true}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setFormData({
                    ...formData,
                    consumidorFinal: checked,
                    ...(checked ? { contaClienteId: '' } : {}),
                  });
                }}
                className="h-4 w-4 rounded border-white/20 bg-[#0b1324] text-violet-600 focus:ring-violet-500/40"
              />
              <span className="text-sm font-bold text-slate-200 normal-case tracking-normal">
                É consumidor final?
                <span className="block text-xs font-medium text-slate-500 mt-1">
                  Vendas B2C: usa a conta analítica genérica CONSUMIDOR FINAL em vez de criar conta com o nome desta pessoa.
                </span>
              </span>
            </label>
          </div>
        )}

        <div className="md:col-span-2">
          <label className={labelClass}>Razão Social *</label>
          <input
            type="text"
            value={formData.razaoSocial ?? ''}
            onChange={e =>
              setFormData({
                ...formData,
                razaoSocial: e.target.value
              })
            }
            className={`${inputClass} text-lg font-bold`}
          />
        </div>

        {isCnpj && (
          <div className="md:col-span-2">
            <label className={labelClass}>Nome Fantasia</label>
            <input
              type="text"
              value={formData.nomeFantasia ?? ''}
              onChange={e =>
                setFormData({
                  ...formData,
                  nomeFantasia: e.target.value
                })
              }
              className={inputClass}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/* 🔥 COMPONENTE AUXILIAR */
const CardInfo = ({
  label,
  value,
  highlight
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <div className="bg-[#0b1324] border border-white/10 p-3 rounded-xl">
    <p className="text-xs text-slate-500 font-bold">{label}</p>
    <p className={`font-black text-sm truncate ${
      highlight ? 'text-violet-300' : 'text-white'
    }`}>
      {value}
    </p>
  </div>
);