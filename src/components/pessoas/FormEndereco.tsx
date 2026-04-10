import React, { useState } from 'react';
import {
  Loader2,
  MapPin,
  Map,
  Hash,
  PlusSquare,
  Signpost,
  Building,
  MapPinned,
  Sparkles
} from 'lucide-react';

import {
  IFormPessoaProps,
  IViaCepResponse
} from '../../types/pessoa';

export const FormEndereco: React.FC<IFormPessoaProps> = ({
  formData,
  setFormData,
  inputClass,
  labelClass
}) => {
  const [cepLoading, setCepLoading] = useState<boolean>(false);

  // 💡 CEP MASK
  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');

    if (value.length > 8) value = value.slice(0, 8);

    if (value.length > 5) {
      value = `${value.slice(0, 5)}-${value.slice(5)}`;
    }

    setFormData({ ...formData, cep: value });
  };

  // 💡 UF SANITIZE
  const handleEstadoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (value.length > 2) value = value.slice(0, 2);

    setFormData({ ...formData, estado: value });
  };

  const buscarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');

    if (cepLimpo.length !== 8) return;

    setCepLoading(true);

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cepLimpo}/json/`
      );

      const data = (await response.json()) as IViaCepResponse;

      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setCepLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-down">

      {/* 🔥 HEADER ENDEREÇO */}
      <div className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_60%,_#0a1224_100%)] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.35)]">

        <div className="flex items-center gap-4">

          <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3">
            <MapPin className="w-6 h-6 text-violet-300" />
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-violet-300 font-black flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              Address Intelligence
            </p>

            <h2 className="text-white font-black text-lg">
              Endereço Inteligente
            </h2>

            <p className="text-slate-400 text-sm mt-1">
              Preenchimento automático via CEP
            </p>
          </div>
        </div>
      </div>

      {/* 🔥 FORM CARD */}
      <div className="bg-[#08101f]/90 border border-white/10 rounded-3xl backdrop-blur-xl shadow-[0_25px_60px_rgba(0,0,0,0.35)] p-6">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* CEP */}
          <div>
            <label className={`${labelClass} flex items-center gap-2`}>
              <MapPin className="w-4 h-4 text-violet-300" />
              CEP
              {cepLoading && (
                <Loader2 className="w-3 h-3 animate-spin text-violet-300" />
              )}
            </label>

            <input
              type="text"
              value={formData.cep}
              onChange={handleCepChange}
              onBlur={e => buscarCep(e.target.value)}
              className="w-full bg-[#0b1324] border border-white/10 rounded-xl px-4 py-3.5 text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20"
              placeholder="00000-000"
            />
          </div>

          {/* LOGRADOURO */}
          <div className="md:col-span-2">
            <label className={`${labelClass} flex items-center gap-2`}>
              <Map className="w-4 h-4 text-sky-300" />
              Logradouro
            </label>

            <input
              type="text"
              value={formData.logradouro}
              onChange={e =>
                setFormData({
                  ...formData,
                  logradouro: e.target.value
                })
              }
              className={inputClass}
              placeholder="Rua, Avenida..."
            />
          </div>

          {/* NÚMERO */}
          <div>
            <label className={`${labelClass} flex items-center gap-2`}>
              <Hash className="w-4 h-4 text-emerald-300" />
              Número
            </label>

            <input
              type="text"
              value={formData.numero}
              onChange={e =>
                setFormData({
                  ...formData,
                  numero: e.target.value
                })
              }
              className={inputClass}
              placeholder="S/N"
            />
          </div>

          {/* COMPLEMENTO */}
          <div className="md:col-span-2">
            <label className={`${labelClass} flex items-center gap-2`}>
              <PlusSquare className="w-4 h-4 text-amber-300" />
              Complemento
            </label>

            <input
              type="text"
              value={formData.complemento}
              onChange={e =>
                setFormData({
                  ...formData,
                  complemento: e.target.value
                })
              }
              className={inputClass}
              placeholder="Sala, Andar..."
            />
          </div>

          {/* BAIRRO */}
          <div>
            <label className={`${labelClass} flex items-center gap-2`}>
              <Signpost className="w-4 h-4 text-violet-300" />
              Bairro
            </label>

            <input
              type="text"
              value={formData.bairro}
              onChange={e =>
                setFormData({
                  ...formData,
                  bairro: e.target.value
                })
              }
              className={inputClass}
            />
          </div>

          {/* CIDADE */}
          <div>
            <label className={`${labelClass} flex items-center gap-2`}>
              <Building className="w-4 h-4 text-emerald-300" />
              Cidade
            </label>

            <input
              type="text"
              value={formData.cidade}
              onChange={e =>
                setFormData({
                  ...formData,
                  cidade: e.target.value
                })
              }
              className={inputClass}
            />
          </div>

          {/* UF */}
          <div>
            <label className={`${labelClass} flex items-center gap-2`}>
              <MapPinned className="w-4 h-4 text-amber-300" />
              UF
            </label>

            <input
              type="text"
              value={formData.estado}
              onChange={handleEstadoChange}
              className="w-full bg-[#0b1324] border border-white/10 rounded-xl px-4 py-3.5 text-white uppercase font-bold text-center focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20"
              placeholder="SP"
            />
          </div>

        </div>
      </div>
    </div>
  );
};