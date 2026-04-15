import { type ChangeEvent, type FC } from 'react';
import { Package, ThermometerSnowflake, Scale, Tag, ShieldCheck, FileText, Box } from 'lucide-react';

interface IAbaProducaoProps {
  dados: any; 
  setDados: (dados: any) => void;
}

export const AbaProducaoAcougue: FC<IAbaProducaoProps> = ({ dados, setDados }) => {
  
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Tratamento correto para checkboxes e números
    let parsedValue: any = value;
    if (type === 'checkbox') {
      parsedValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      parsedValue = value === '' ? '' : Number(value);
    }

    setDados((prev: any) => ({
      ...prev,
      dadosProducao: {
        ...prev.dadosProducao,
        [name]: parsedValue
      }
    }));
  };

  // Classes padrão do Aurya Design System
  const inputClass = "w-full bg-[#08101f] border border-white/10 rounded-xl p-3 text-white focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 transition-all";
  const labelClass = "block text-[11px] font-bold text-slate-400 uppercase tracking-[0.10em] mb-1.5 pl-1";

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      
      {/* BLOCO 1: Classificação e Ministério */}
      <div className="bg-[#0b1324]/70 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4 text-violet-400">
          <FileText size={20} />
          <h3 className="font-bold text-lg text-white">Classificação e Ministério da Agricultura</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className={labelClass}>Tipo de Produto na Produção</label>
            <select name="tipoProdutoProducao" value={dados.dadosProducao?.tipoProdutoProducao || 'PRODUTO_ACABADO'} onChange={handleChange} className={inputClass}>
              <option value="MATERIA_PRIMA">Matéria Prima (Carcassa/Quarto)</option>
              <option value="PRODUTO_ACABADO">Produto Acabado (Corte)</option>
              <option value="SUBPRODUTO">Subproduto (Osso/Sebo)</option>
              <option value="INSUMO_EMBALAGEM">Insumo/Embalagem</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Registro Ministério (PGA)</label>
            <input type="text" name="registroRotuloPGA" placeholder="Ex: 0012/3456" value={dados.dadosProducao?.registroRotuloPGA || ''} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Descrição Oficial (Ministério)</label>
            <input type="text" name="descricaoMinisterio" placeholder="Descrição técnica oficial..." value={dados.dadosProducao?.descricaoMinisterio || ''} onChange={handleChange} className={inputClass} />
          </div>
        </div>
      </div>

      {/* BLOCO 2: Rendimentos e Pesos */}
      <div className="bg-[#0b1324]/70 border border-white/10 rounded-2xl p-6 border-l-4 border-l-blue-500">
        <div className="flex items-center gap-2 mb-4 text-blue-400">
          <Scale size={20} />
          <h3 className="font-bold text-lg text-white">Rendimento e Pesos Unitários</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div>
            <label className={labelClass}>Família de Rendimento</label>
            <input type="text" name="familiaRendimento" placeholder="Ex: Traseiro" value={dados.dadosProducao?.familiaRendimento || ''} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Rendimento Padrão (%)</label>
            <input type="number" step="0.01" name="rendimentoPadrao" placeholder="Ex: 82.5" value={dados.dadosProducao?.rendimentoPadrao || ''} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Peso Médio Peça (KG)</label>
            <input type="number" step="0.001" name="pesoMedioPeca" placeholder="Ex: 15.500" value={dados.dadosProducao?.pesoMedioPeca || ''} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Peso Padrão (Bandeja KG)</label>
            <input type="number" step="0.001" name="pesoPadrao" placeholder="Ex: 0.500" value={dados.dadosProducao?.pesoPadrao || ''} onChange={handleChange} className={inputClass} />
          </div>
        </div>
      </div>

      {/* BLOCO 3: Caixa e Logística */}
      <div className="bg-[#0b1324]/70 border border-white/10 rounded-2xl p-6 border-l-4 border-l-indigo-500">
        <div className="flex items-center gap-2 mb-4 text-indigo-400">
          <Box size={20} />
          <h3 className="font-bold text-lg text-white">Logística e Caixa Fechada</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className={labelClass}>GTIN-14 (DUN-14 da Caixa)</label>
            <input type="text" name="gtin14" placeholder="Código de barras da caixa" value={dados.dadosProducao?.gtin14 || ''} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Qtd. Média de Peças por Caixa</label>
            <input type="number" name="qtdMediaPecasPorCaixa" placeholder="Ex: 6" value={dados.dadosProducao?.qtdMediaPecasPorCaixa || ''} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Peso Médio da Caixa (KG)</label>
            <input type="number" step="0.001" name="pesoMedioCaixa" placeholder="Ex: 25.000" value={dados.dadosProducao?.pesoMedioCaixa || ''} onChange={handleChange} className={inputClass} />
          </div>
        </div>
      </div>

      {/* BLOCO 4: Conservação e Validade */}
      <div className="bg-[#0b1324]/70 border border-white/10 rounded-2xl p-6 border-l-4 border-l-emerald-500">
        <div className="flex items-center gap-2 mb-4 text-emerald-400">
          <ThermometerSnowflake size={20} />
          <h3 className="font-bold text-lg text-white">Conservação e Validade</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div>
            <label className={labelClass}>Dias de Validade</label>
            <input type="number" name="diasValidade" placeholder="Ex: 7" value={dados.dadosProducao?.diasValidade || ''} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Condição de Conservação</label>
            <select name="tipoConservacao" value={dados.dadosProducao?.tipoConservacao || 'RESFRIADO'} onChange={handleChange} className={inputClass}>
              <option value="RESFRIADO">Resfriado</option>
              <option value="CONGELADO">Congelado</option>
              <option value="TEMPERATURA_AMBIENTE">Temperatura Ambiente</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Temp. Inicial Máx (°C)</label>
            <input type="number" step="0.1" name="temperaturaInicial" placeholder="Ex: 7.0" value={dados.dadosProducao?.temperaturaInicial || ''} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Temp. Final Máx (°C)</label>
            <input type="number" step="0.1" name="temperaturaFinal" placeholder="Ex: 4.0" value={dados.dadosProducao?.temperaturaFinal || ''} onChange={handleChange} className={inputClass} />
          </div>
        </div>
      </div>

      {/* BLOCO 5: Etiquetas e Embalagens */}
      <div className="bg-[#0b1324]/70 border border-white/10 rounded-2xl p-6 border-l-4 border-l-amber-500">
        <div className="flex items-center gap-2 mb-4 text-amber-400">
          <Tag size={20} />
          <h3 className="font-bold text-lg text-white">Etiquetas e Embalagens</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <div>
            <label className={labelClass}>Descrição na Etiqueta (Curta)</label>
            <input type="text" name="descricaoEtiqueta" placeholder="Ex: PICANHA GRILL" maxLength={25} value={dados.dadosProducao?.descricaoEtiqueta || ''} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Layout Etiqueta Interna</label>
            <input type="text" name="layoutEtiquetaInterna" placeholder="Ex: L01" value={dados.dadosProducao?.layoutEtiquetaInterna || ''} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Layout Etiqueta Secundária</label>
            <input type="text" name="layoutEtiquetaSecundaria" placeholder="Ex: L02" value={dados.dadosProducao?.layoutEtiquetaSecundaria || ''} onChange={handleChange} className={inputClass} />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Embalagem Primária</label>
            <input type="text" name="embalagemPrimaria" placeholder="Ex: Vácuo Saco Encolhível" value={dados.dadosProducao?.embalagemPrimaria || ''} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Embalagem Secundária</label>
            <input type="text" name="embalagemSecundaria" placeholder="Ex: Caixa de Papelão 25kg" value={dados.dadosProducao?.embalagemSecundaria || ''} onChange={handleChange} className={inputClass} />
          </div>
        </div>
      </div>

      {/* BLOCO 6: Regras de Negócio (Checkboxes) */}
      <div className="bg-[#0b1324]/70 border border-white/10 rounded-2xl p-6 border-l-4 border-l-fuchsia-500">
        <div className="flex items-center gap-2 mb-4 text-fuchsia-400">
          <ShieldCheck size={20} />
          <h3 className="font-bold text-lg text-white">Regras de Negócio e Travas</h3>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" name="controlaEstoque" checked={dados.dadosProducao?.controlaEstoque ?? true} onChange={handleChange} className="w-5 h-5 rounded border-white/20 bg-[#08101f] text-violet-600 focus:ring-violet-500/30" />
            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Controla Estoque</span>
          </label>
          
          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" name="controlaRendimento" checked={dados.dadosProducao?.controlaRendimento ?? true} onChange={handleChange} className="w-5 h-5 rounded border-white/20 bg-[#08101f] text-violet-600 focus:ring-violet-500/30" />
            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Controla Quebra/Rendimento</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" name="permiteVencido" checked={dados.dadosProducao?.permiteVencido ?? false} onChange={handleChange} className="w-5 h-5 rounded border-white/20 bg-[#08101f] text-red-500 focus:ring-red-500/30" />
            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Permite uso pós-validade (Ex: Sebo)</span>
          </label>
        </div>
      </div>

    </div>
  );
};