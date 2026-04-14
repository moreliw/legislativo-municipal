import Link from 'next/link'
import { FileQuestion, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-[#1c202e] border border-[#1e2333] flex items-center justify-center mb-6">
        <FileQuestion size={28} className="text-[#5c6282]" />
      </div>
      <h1 className="text-[24px] font-semibold text-[#e8eaf0] mb-2">Página não encontrada</h1>
      <p className="text-[14px] text-[#5c6282] max-w-sm mb-8 leading-relaxed">
        O recurso que você está procurando não existe ou foi movido.
      </p>
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 bg-[#2d7dd2] hover:bg-[#1e6fbf] text-white text-[13px] font-medium px-5 py-2.5 rounded-md transition-colors"
        >
          <ArrowLeft size={14} />
          Voltar ao painel
        </Link>
        <Link
          href="/proposicoes"
          className="flex items-center gap-2 border border-[#1e2333] text-[#9198b0] hover:text-[#e8eaf0] text-[13px] px-5 py-2.5 rounded-md transition-colors"
        >
          Ver proposições
        </Link>
      </div>
    </div>
  )
}
