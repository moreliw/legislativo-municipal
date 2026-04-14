'use client'

import { useState } from 'react'
import TramitacaoTimeline from '@/components/tramitacao/TramitacaoTimeline'
import ProposicaoHeader from '@/components/tramitacao/ProposicaoHeader'
import ProposicaoSidebar from '@/components/tramitacao/ProposicaoSidebar'
import AcoesRapidas from '@/components/tramitacao/AcoesRapidas'
import { proposicaoMock } from '@/mocks/proposicao.mock'

export default function TramitacaoPage({ params }: { params: { id: string } }) {
  const [sidebarAberta, setSidebarAberta] = useState(true)
  const proposicao = proposicaoMock // Em produção: fetch via API

  return (
    <div className="min-h-screen bg-[#0F1117]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Header da proposição */}
      <ProposicaoHeader proposicao={proposicao} />

      <div className="flex">
        {/* Timeline principal */}
        <main className={`flex-1 transition-all duration-300 ${sidebarAberta ? 'mr-96' : ''}`}>
          <div className="max-w-4xl mx-auto px-6 py-8">
            <AcoesRapidas proposicao={proposicao} />
            <TramitacaoTimeline eventos={proposicao.tramitacoes} />
          </div>
        </main>

        {/* Sidebar direita */}
        {sidebarAberta && (
          <aside className="fixed right-0 top-16 bottom-0 w-96 border-l border-[#1E2333] bg-[#13161F] overflow-y-auto">
            <ProposicaoSidebar
              proposicao={proposicao}
              onFechar={() => setSidebarAberta(false)}
            />
          </aside>
        )}

        {/* Botão para abrir sidebar */}
        {!sidebarAberta && (
          <button
            onClick={() => setSidebarAberta(true)}
            className="fixed right-4 bottom-8 bg-[#2D7DD2] text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg hover:bg-[#1E6FBF] transition"
          >
            ← Detalhes
          </button>
        )}
      </div>
    </div>
  )
}
