import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Providers } from './providers'
import { ThemeProvider } from '@/components/layout/ThemeProvider'

export const metadata: Metadata = {
  title: 'Sistema Legislativo Municipal',
  description: 'Gestão legislativa e documental para câmaras municipais',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      </head>
      <body className="antialiased" style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
        <ThemeProvider>
          <Providers>
            <div className="flex h-screen overflow-hidden bg-surface-0">
              <Sidebar />
              <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <TopBar />
                <main className="flex-1 overflow-y-auto bg-surface-0">
                  {children}
                </main>
              </div>
            </div>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
