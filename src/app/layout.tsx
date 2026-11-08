import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { StoreProvider } from '@/lib/store'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-space' })

export const metadata: Metadata = {
  title: 'Portal Arcanimal',
  description: 'Informações, pessoas e documentos do Instituto Arcanimal reunidos em um só lugar.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body><StoreProvider>{children}</StoreProvider></body>
    </html>
  )
}
