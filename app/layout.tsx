import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'НМТ Математика — Підготовка 2026',
  description: 'Платформа підготовки до НМТ з математики',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  )
}