'use client'

import { useState } from 'react'
import { Save, Building2, Users, Calendar, Bell, Shield, Database } from 'lucide-react'

const sections = [
  { id: 'casa', icon: Building2, label: 'Casa Legislativa' },
  { id: 'vereadores', icon: Users, label: 'Vereadores' },
  { id: 'calendario', icon: Calendar, label: 'Calendário' },
  { id: 'notificacoes', icon: Bell, label: 'Notificações' },
  { id: 'seguranca', icon: Shield, label: 'Segurança' },
  { id: 'dados', icon: Database, label: 'Dados e LGPD' },
]

const fieldClass = "w-full bg-[#0f1117] border border-[#1e2333] rounded-md px-3 py-2 text-[13px] text-[#e8eaf0] placeholder:text-[#5c6282] focus:outline-none focus:border-[#2d7dd2] transition-colors"
const labelClass = "text-[11px] font-medium text-[#9198b0] block mb-1.5"

export default function ConfiguracoesPage() {
  const [secao, setSecao] = useState('casa')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#e8eaf0]">Configurações</h1>
          <p className="text-[13px] text-[#5c6282] mt-0.5">Parâmetros da casa legislativa</p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 text-[13px] font-medium px-4 py-2 rounded-md transition-all ${
            saved
              ? 'bg-[#1fa870] text-white'
              : 'bg-[#2d7dd2] hover:bg-[#1e6fbf] text-white'
          }`}
        >
          <Save size={14} />
          {saved ? '✓ Salvo' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="flex gap-5">
        {/* Menu lateral */}
        <nav className="w-44 flex-shrink-0 space-y-1">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setSecao(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] font-medium transition-colors text-left ${
                secao === s.id
                  ? 'bg-[#162d4a] text-[#2d7dd2]'
                  : 'text-[#9198b0] hover:bg-[#13161f] hover:text-[#e8eaf0]'
              }`}
            >
              <s.icon size={14} className={secao === s.id ? 'text-[#2d7dd2]' : 'text-[#5c6282]'} />
              {s.label}
            </button>
          ))}
        </nav>

        {/* Conteúdo */}
        <div className="flex-1 bg-[#13161f] border border-[#1e2333] rounded-lg p-6">

          {secao === 'casa' && (
            <div className="space-y-5">
              <h2 className="text-[14px] font-semibold text-[#e8eaf0] pb-3 border-b border-[#1e2333]">
                Dados da Casa Legislativa
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Nome completo</label>
                  <input type="text" defaultValue="Câmara Municipal de São Francisco" className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Sigla</label>
                  <input type="text" defaultValue="CMSF" className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>CNPJ</label>
                  <input type="text" defaultValue="12.345.678/0001-90" className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Município</label>
                  <input type="text" defaultValue="São Francisco" className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>UF</label>
                  <input type="text" defaultValue="MG" className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Site oficial</label>
                  <input type="url" defaultValue="https://camarasaofrancisco.mg.gov.br" className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>E-mail institucional</label>
                  <input type="email" defaultValue="contato@camarasaofrancisco.mg.gov.br" className={fieldClass} />
                </div>
              </div>
            </div>
          )}

          {secao === 'vereadores' && (
            <div className="space-y-5">
              <h2 className="text-[14px] font-semibold text-[#e8eaf0] pb-3 border-b border-[#1e2333]">
                Configurações de Vereadores e Quórum
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Total de vereadores</label>
                  <input type="number" defaultValue={11} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Quórum mínimo (maioria simples)</label>
                  <input type="number" defaultValue={6} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Quórum maioria absoluta</label>
                  <input type="number" defaultValue={9} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Legislatura atual</label>
                  <input type="text" defaultValue="2021-2024" className={fieldClass} />
                </div>
              </div>
            </div>
          )}

          {secao === 'calendario' && (
            <div className="space-y-5">
              <h2 className="text-[14px] font-semibold text-[#e8eaf0] pb-3 border-b border-[#1e2333]">
                Calendário e Prazos
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Dia da sessão ordinária</label>
                  <select className={fieldClass} defaultValue="QUINTA">
                    {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'].map(d => (
                      <option key={d} value={d.toUpperCase()}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Hora padrão das sessões</label>
                  <input type="time" defaultValue="19:00" className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Prazo padrão de tramitação (dias)</label>
                  <input type="number" defaultValue={40} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Alertar prazos (dias antes)</label>
                  <input type="number" defaultValue={3} className={fieldClass} />
                </div>
              </div>
              <div className="bg-[#0d1e35] border border-[#1e2333] rounded-md p-3 text-[12px] text-[#9198b0]">
                <strong className="text-[#2d7dd2]">Nota:</strong> Os prazos respeitam o calendário de feriados. Configure os feriados municipais na seção de calendário.
              </div>
            </div>
          )}

          {secao === 'notificacoes' && (
            <div className="space-y-5">
              <h2 className="text-[14px] font-semibold text-[#e8eaf0] pb-3 border-b border-[#1e2333]">
                Configurações de Notificação
              </h2>
              {[
                { label: 'Notificações por e-mail', desc: 'Enviar e-mails para eventos de tramitação' },
                { label: 'Alertas de prazo', desc: 'Notificar 3 dias antes do vencimento' },
                { label: 'Pendências de assinatura', desc: 'Alertar documentos aguardando assinatura' },
                { label: 'Mudanças de status', desc: 'Notificar a cada mudança de status' },
                { label: 'Novas sessões agendadas', desc: 'Avisar quando uma sessão for agendada' },
              ].map((n, i) => (
                <div key={i} className="flex items-start justify-between gap-4 py-3 border-b border-[#1e2333] last:border-0">
                  <div>
                    <div className="text-[13px] font-medium text-[#e8eaf0]">{n.label}</div>
                    <div className="text-[11px] text-[#5c6282] mt-0.5">{n.desc}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 bg-[#1c202e] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-[#5c6282] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2d7dd2] peer-checked:after:bg-white" />
                  </label>
                </div>
              ))}
            </div>
          )}

          {secao === 'seguranca' && (
            <div className="space-y-5">
              <h2 className="text-[14px] font-semibold text-[#e8eaf0] pb-3 border-b border-[#1e2333]">
                Segurança e Acesso
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Sessão expira em (minutos)</label>
                  <input type="number" defaultValue={480} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Tentativas de login antes do bloqueio</label>
                  <input type="number" defaultValue={5} className={fieldClass} />
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Exigir 2FA para perfis administrativos', desc: 'Autenticação em dois fatores para admins' },
                  { label: 'Log de acesso a documentos', desc: 'Registrar cada visualização de documento' },
                  { label: 'Sessão única por usuário', desc: 'Impedir login simultâneo' },
                ].map((s, i) => (
                  <div key={i} className="flex items-start justify-between gap-4 py-3 border-b border-[#1e2333] last:border-0">
                    <div>
                      <div className="text-[13px] font-medium text-[#e8eaf0]">{s.label}</div>
                      <div className="text-[11px] text-[#5c6282] mt-0.5">{s.desc}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-9 h-5 bg-[#1c202e] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-[#5c6282] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2d7dd2] peer-checked:after:bg-white" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {secao === 'dados' && (
            <div className="space-y-5">
              <h2 className="text-[14px] font-semibold text-[#e8eaf0] pb-3 border-b border-[#1e2333]">
                Dados e LGPD
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Retenção de logs de auditoria (dias)</label>
                  <input type="number" defaultValue={1825} className={fieldClass} />
                  <div className="text-[10px] text-[#5c6282] mt-1">Recomendado: 5 anos (1825 dias)</div>
                </div>
                <div>
                  <label className={labelClass}>Retenção de documentos arquivados (anos)</label>
                  <input type="number" defaultValue={10} className={fieldClass} />
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-[#2e0e0e] border border-[#d94040]/20 rounded-md p-4">
                  <div className="text-[12px] font-semibold text-[#d94040] mb-1">⚠ Zona de Perigo</div>
                  <div className="text-[12px] text-[#e07070] mb-3">Estas ações são irreversíveis.</div>
                  <div className="flex gap-2">
                    <button className="text-[12px] border border-[#d94040]/40 text-[#d94040] hover:bg-[#d94040]/10 px-3 py-1.5 rounded-md transition-colors">
                      Exportar Auditoria Completa
                    </button>
                    <button className="text-[12px] border border-[#d94040]/40 text-[#d94040] hover:bg-[#d94040]/10 px-3 py-1.5 rounded-md transition-colors">
                      Anonimizar Dados Sensíveis
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
