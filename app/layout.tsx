import type { Metadata } from 'next'
import './globals.css'
import { GlobalProvider } from './providers'
import { ClientLayout } from './ClientLayout'

export const metadata: Metadata = {
  title: 'Paathner Triage Matrix',
  description: 'Sprint Planner & Triage Matrix',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 font-sans antialiased">
        <GlobalProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </GlobalProvider>
      </body>
    </html>
  )
}
