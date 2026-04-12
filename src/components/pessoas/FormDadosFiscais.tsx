import React from 'react';
import {
  Building2,
  Landmark,
  Scale,
  Briefcase,
  FileSignature,
  Sparkles,
  Microscope
} from 'lucide-react';

import {
  IFormPessoaProps,
  RegimeTributario,
  IndicadorIE
} from '../../types/pessoa';

export const FormDadosFiscais: React.FC<IFormPessoaProps> = ({
  formData,
  setFormData,
  inputClass,
  labelClass
}) => {

  // 💡 CNAE MASK
  const handleCnaeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');

    if (value.length > 7) value = value.slice(0, 7);

    if (value.length > 5) {
      value = `${value.slice(0, 5)}-${value.slice(5)}`;
    }

    setFormData({ ...formData, cnae: value });
  };

  // 💡 IE uppercase
  const handleIeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      inscricaoEstadual: e.target.value.toUpperCase()
    });
  };

  // 💡 indicador inteligente
  const handleIndicadorIEChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as IndicadorIE;
    let ieValue = formData.inscricaoEstadual ?? '';

    if (val === 'ISENTO') {
      ieValue = 'ISENTO';
    } else if (val === 'NAO_CONTRIBUINTE') {
      ieValue = '';
    }

    setFormData({
      ...formData,
      indicadorIE: val,
      inscricaoEstadual: ieValue,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in-down">

      {/* 🔥 HEADER AURYA */}
      <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_60%,_#0a1224_100%)] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.35)]">

        <div className="flex items-center gap-4">

          <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3">
            <Building2 className="w-6 h-6 text-violet-300" />
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-violet-300 font-black flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              Fiscal Intelligence
            </p>

            <h2 className="text-white font-black text-lg">
              Dados Fiscais e Tributários
            </h2>

            <p className="text-slate-400 text-sm mt-1">
              Informações obrigatórias para emissão de NF-e / NFC-e
            </p>
          </div>
        </div>
      </div>

      {/* 🔥 FORM CARD */}
      <div className="bg-[#08101f]/90 border border-white/10 rounded-3xl backdrop-blur-xl shadow-[0_25px_60px_rgba(0,0,0,0.35)] p-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* INDICADOR IE */}
          <div>
            <label className={`${labelClass} flex items-center gap-2`}>
              <FileSignature className="w-4 h-4 text-violet-300" />
              Indicador da IE *
            </label>

            <select
              value={formData.indicadorIE ?? 'NAO_CONTRIBUINTE'}
              onChange={handleIndicadorIEChange}
              className="w-full bg-[#0b1324] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 transition-all"
            >
              <option value="CONTRIBUINTE">Contribuinte ICMS</option>
              <option value="NAO_CONTRIBUINTE">Não Contribuinte</option>
              <option value="ISENTO">Isento</option>
            </select>
          </div>

          {/* IE */}
          <div>
            <label className={`${labelClass} flex items-center gap-2`}>
              <Landmark className="w-4 h-4 text-sky-300" />
              Inscrição Estadual (IE)
            </label>

            <input
              type="text"
              value={formData.inscricaoEstadual ?? ''}
              onChange={handleIeChange}
              disabled={formData.indicadorIE === 'ISENTO'}
              className="w-full bg-[#0b1324] border border-white/10 rounded-xl px-4 py-3.5 text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 transition-all"
              placeholder="ISENTO ou Número"
            />
          </div>

          {/* IM */}
          <div>
            <label className={`${labelClass} flex items-center gap-2`}>
              <Building2 className="w-4 h-4 text-emerald-300" />
              Inscrição Municipal (IM)
            </label>

            <input
              type="text"
              value={formData.inscricaoMunicipal ?? ''}
              onChange={e =>
                setFormData({
                  ...formData,
                  inscricaoMunicipal: e.target.value.replace(/\D/g, '')
                })
              }
              className="w-full bg-[#0b1324] border border-white/10 rounded-xl px-4 py-3.5 text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 transition-all"
              placeholder="Apenas números"
            />
          </div>

          {/* REGIME */}
          <div>
            <label className={`${labelClass} flex items-center gap-2`}>
              <Scale className="w-4 h-4 text-amber-300" />
              Regime Tributário
            </label>

            <select
              value={formData.regimeTributario ?? ''}
              onChange={e =>
                setFormData({
                  ...formData,
                  regimeTributario: e.target.value as RegimeTributario
                })
              }
              className="w-full bg-[#0b1324] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 transition-all"
            >
              <option value="">Selecione o regime...</option>
              <option value="SIMPLES_NACIONAL">Simples Nacional</option>
              <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
              <option value="LUCRO_REAL">Lucro Real</option>
            </select>
          </div>

          {/* CNAE */}
          <div className="md:col-span-2">
            <label className={`${labelClass} flex items-center gap-2`}>
              <Briefcase className="w-4 h-4 text-violet-300" />
              CNAE Principal
            </label>

            <input
              type="text"
              value={formData.cnae ?? ''}
              onChange={handleCnaeChange}
              className="w-full max-w-sm bg-[#0b1324] border border-white/10 rounded-xl px-4 py-3.5 text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 transition-all"
              placeholder="00000-00"
            />
          </div>

        </div>
      </div>

      {(formData.tipo === 'FORNECEDOR' || formData.tipo === 'AMBOS') && (
        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-3xl backdrop-blur-xl shadow-[0_25px_60px_rgba(0,0,0,0.35)] p-6 mt-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-2.5">
              <Microscope className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm uppercase tracking-widest">
                Sanidade e inspeção
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Dados para rastreabilidade com fornecedores do setor alimentício
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`${labelClass} flex items-center gap-2`}>
                <Microscope className="w-4 h-4 text-emerald-400" />
                Registro sanitário (SIF / SISP / SIE / SIM)
              </label>
              <input
                type="text"
                value={formData.registroSanitario ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, registroSanitario: e.target.value })
                }
                className={inputClass}
                placeholder="Ex: SIF 1234, SIM 567"
              />
            </div>
            <div>
              <label className={`${labelClass} flex items-center gap-2`}>
                <Scale className="w-4 h-4 text-emerald-400" />
                Esfera da inspeção
              </label>
              <select
                value={formData.tipoInspecao ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, tipoInspecao: e.target.value })
                }
                className={inputClass}
              >
                <option value="">Selecione...</option>
                <option value="Federal">Federal</option>
                <option value="Estadual">Estadual</option>
                <option value="Municipal">Municipal</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};