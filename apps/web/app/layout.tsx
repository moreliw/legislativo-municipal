import type { Metadata } from 'next'
import './globals.css'
import AuthGuard from '@/components/auth/AuthGuard'
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
      <body className="antialiased">
        <ThemeProvider>
          <Providers>
            <AuthGuard>
              {children}
            </AuthGuard>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
