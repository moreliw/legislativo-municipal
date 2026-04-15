'use client'

import { useState } from 'react'
import { Search, FileText, Calendar, Eye } from 'lucide-react'

const publicacoesMock = [
  {
    id: 'pub1',
    numero: 'PL-019/2024',
    tipo: 'PL',
    ementa: 'Programa de combate ao desperdício de alimentos nos estabelecimentos municipais',
    data: '20/04/2024',
    tipoPublicacao: 'DIARIO_OFICIAL',
    url: '#',
  },
  {
    id: 'pub2',
    numero: 'MOC-006/2024',
    tipo: 'MOC',
    ementa: 'Moção de reconhecimento ao trabalho dos profissionais de saúde do município',
    data: '15/04/2024',
    tipoPublicacao: 'DIARIO_OFICIAL',
    url: '#',
  },
  {
    id: 'pub3',
    numero: 'PL-012/2024',
    tipo: 'PL',
    ementa: 'Programa Municipal de Coleta Seletiva e Educação Ambiental',
    data: '05/04/2024',
    tipoPublicacao: 'DIARIO_OFICIAL',
    url: '#',
  },
  {
    id: 'pub4',
    numero: 'PDL-001/2024',
    tipo: 'PDL',
    ementa: 'Decreto Legislativo que regulamenta a realização de audiências públicas na Câmara Municipal',
    data: '01/04/2024',
    tipoPublicacao: 'DIARIO_OFICIAL',
    url: '#',
  },
]

export default function PortalPublicoPage() {
  const [busca, setBusca] = useState('')

  const filtradas = publicacoesMock.filter(p =>
    !busca || p.ementa.toLowerCase().includes(busca.toLowerCase()) || p.numero.includes(busca),
  )

  return (
    <div className="min-h-screen bg-surface-0" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Header público */}
      <header className="bg-brand-blue-soft border-b border-line">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-brand-blue flex items-center justify-center">
                <span className="text-white font-bold text-xs">CM</span>
              </div>
              <span className="text-[15px] font-semibold text-fg-1">Câmara Municipal</span>
            </div>
            <div className="text-[11px] text-fg-3 mt-0.5 font-mono">São Francisco · MG — Portal de Transparência</div>
          </div>
          <a
            href="/login"
            className="text-[12px] border border-line text-fg-2 hover:text-fg-1 hover:border-line-2 px-3 py-1.5 rounded-md transition-colors"
          >
            Acesso Institucional →
          </a>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-brand-blue-soft border-b border-line py-10">
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-[22px] font-semibold text-fg-1 mb-2">
            Publicações Legislativas
          </h1>
          <p className="text-[14px] text-fg-2 mb-6">
            Consulte as proposições aprovadas, decretos legislativos e publicações oficiais da câmara.
          </p>
          <div className="relative max-w-lg">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
            <input
              type="text"
              placeholder="Buscar por número, ementa ou assunto..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full bg-surface-1 border border-line rounded-md pl-9 pr-4 py-2.5 text-[13px] text-fg-1 placeholder:text-fg-3 focus:outline-none focus:border-brand-blue transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Publicações em 2024', value: '31', icon: FileText },
            { label: 'Última publicação', value: '20/04/2024', icon: Calendar },
            { label: 'Total de visualizações', value: '1.204', icon: Eye },
          ].map(stat => (
            <div key={stat.label} className="bg-surface-1 border border-line rounded-lg p-4 flex items-center gap-3">
              <stat.icon size={18} className="text-brand-blue flex-shrink-0" />
              <div>
                <div className="text-[16px] font-semibold font-mono text-fg-1">{stat.value}</div>
                <div className="text-[11px] text-fg-3">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Lista de publicações */}
        <div className="space-y-3">
          <h2 className="text-[13px] font-semibold text-fg-2 uppercase tracking-wider mb-4">
            Publicações Recentes
          </h2>

          {filtradas.map(pub => (
            <a
              key={pub.id}
              href={pub.url}
              className="block bg-surface-1 border border-line rounded-lg p-5 hover:bg-surface-2 hover:border-line-2 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[12px] font-semibold text-brand-blue">
                      {pub.numero}
                    </span>
                    <span className="text-[10px] font-mono bg-surface-0 border border-line text-fg-3 px-2 py-0.5 rounded">
                      {pub.tipo}
                    </span>
                    <span className="text-[10px] bg-brand-green-soft text-brand-green px-2 py-0.5 rounded-full font-medium">
                      Publicado
                    </span>
                  </div>
                  <p className="text-[14px] text-fg-1 leading-snug group-hover:text-white transition-colors">
                    {pub.ementa}
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-[11px] text-fg-3">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      Publicado em {pub.data}
                    </span>
                    <span>·</span>
                    <span>Diário Oficial Municipal</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[12px] text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <FileText size={13} />
                  Ver PDF
                </div>
              </div>
            </a>
          ))}

          {filtradas.length === 0 && (
            <div className="text-center py-12 text-fg-3">
              <Search size={24} className="mx-auto mb-3 opacity-40" />
              <div className="text-[13px]">Nenhuma publicação encontrada para "{busca}"</div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-line mt-12 py-6">
        <div className="max-w-5xl mx-auto px-6 text-[11px] text-fg-3 flex items-center justify-between">
          <span>Câmara Municipal de São Francisco · MG — Sistema Legislativo Municipal</span>
          <span>Dados abertos conforme Lei 12.527/2011 (LAI)</span>
        </div>
      </footer>
    </div>
  )
}
