import Link from 'next/link'
import { FileQuestion, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-line flex items-center justify-center mb-6">
        <FileQuestion size={28} className="text-fg-3" />
      </div>
      <h1 className="text-[24px] font-semibold text-fg-1 mb-2">Página não encontrada</h1>
      <p className="text-[14px] text-fg-3 max-w-sm mb-8 leading-relaxed">
        O recurso que você está procurando não existe ou foi movido.
      </p>
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-2 text-white text-[13px] font-medium px-5 py-2.5 rounded-md transition-colors"
        >
          <ArrowLeft size={14} />
          Voltar ao painel
        </Link>
        <Link
          href="/proposicoes"
          className="flex items-center gap-2 border border-line text-fg-3 hover:text-fg-1 text-[13px] px-5 py-2.5 rounded-md transition-colors"
        >
          Ver proposições
        </Link>
      </div>
    </div>
  )
}
