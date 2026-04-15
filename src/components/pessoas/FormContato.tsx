import { type ChangeEvent, type FC } from 'react';
import { Phone, Mail, User, FileText } from 'lucide-react';
import { IFormPessoaProps } from '../../types/pessoa';

export const FormContato: FC<IFormPessoaProps> = ({
  formData,
  setFormData,
  inputClass,
  labelClass,
}) => {
  // 💡 MÁSCARA INTELIGENTE
  const handleTelefoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');

    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    if (value.length > 9) {
      value = `${value.slice(0, 10)}-${value.slice(10)}`;
    }

    setFormData({ ...formData, telefone: value });
  };

  return (
    <div className="space-y-6 animate-fade-in-down">

      {/* CARD PADRÃO AURYA */}
      <div className="bg-[#08101f]/90 border border-white/10 rounded-3xl backdrop-blur-xl shadow-[0_25px_60px_rgba(0,0,0,0.35)] p-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* TELEFONE */}
          <div>
            <label className={`${labelClass} flex items-center gap-2`}>
              <Phone className="w-4 h-4 text-violet-300" />
              Telefone / WhatsApp
            </label>

            <input
              type="text"
              value={formData.telefone ?? ''}
              onChange={handleTelefoneChange}
              className="w-full bg-[#0b1324] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 transition-all shadow-inner"
              placeholder="(00) 00000-0000"
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className={`${labelClass} flex items-center gap-2`}>
              <Mail className="w-4 h-4 text-sky-300" />
              E-mail Comercial
            </label>

            <input
              type="email"
              value={formData.email ?? ''}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full bg-[#0b1324] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 transition-all shadow-inner"
              placeholder="contato@empresa.com"
            />
          </div>

          {/* CONTATO */}
          <div className="md:col-span-2">
            <label className={`${labelClass} flex items-center gap-2`}>
              <User className="w-4 h-4 text-emerald-300" />
              Nome do Contato Principal
            </label>

            <input
              type="text"
              value={formData.contatoPrincipal ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contatoPrincipal: e.target.value,
                })
              }
              className="w-full bg-[#0b1324] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 transition-all shadow-inner"
              placeholder="Ex: João (Gerente de Compras)"
            />
          </div>

          {/* OBSERVAÇÕES */}
          <div className="md:col-span-2">
            <label className={`${labelClass} flex items-center gap-2`}>
              <FileText className="w-4 h-4 text-amber-300" />
              Observações Internas
            </label>

            <textarea
              value={formData.observacoes ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  observacoes: e.target.value,
                })
              }
              className="w-full bg-[#0b1324] border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 transition-all shadow-inner min-h-[120px] resize-y"
              placeholder="Anotações sobre o cliente/fornecedor, horários de entrega, preferências..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};