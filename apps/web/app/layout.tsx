import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Sistema Legislativo Municipal',
  description: 'Gestão legislativa e documental para câmaras municipais',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Fontes: system-ui como fallback para funcionar offline */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com"
        />
      </head>
      <body
        className="bg-[#0F1117] text-[#e8eaf0] antialiased"
        style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}
      >
        <Providers>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
              <TopBar />
              <main className="flex-1 overflow-y-auto">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}
