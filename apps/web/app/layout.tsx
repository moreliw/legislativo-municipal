import type { Metadata } from 'next'
import './globals.css'
import AuthGuard from '@/components/auth/AuthGuard'

export const metadata: Metadata = {
  title: 'Sistema Legislativo Municipal',
  description: 'Gestão legislativa e documental para câmaras municipais',
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
