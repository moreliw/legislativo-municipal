import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/theme-context'
import AuthGuard from '@/components/auth/AuthGuard'

export const metadata = {
  title: 'Sistema Legislativo Municipal',
  description: 'Plataforma integrada de gestão de proposições, sessões e tramitação legislativa',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthGuard>
          {children}
        </AuthGuard>
      </body>
    </html>
  )
}
