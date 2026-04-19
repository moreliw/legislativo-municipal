import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/theme-context'
import AuthGuard from '@/components/auth/AuthGuard'
import { Providers } from './providers'
import { ThemeProvider } from '@/components/layout/ThemeProvider'

export const metadata = {
  title: 'Sistema Legislativo Municipal',
  description: 'Plataforma integrada de gestão de proposições, sessões e tramitação legislativa',
  icons: {
    icon: '/favicon.svg',
  },
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
