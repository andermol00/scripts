import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TamperMonkey Admin',
  description: 'Secure TamperMonkey Script Administration System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-dark-900 min-h-screen`}>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a2e',
              color: '#e2e8f0',
              border: '1px solid #7c3aed',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#1a1a2e' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#1a1a2e' } },
          }}
        />
        {children}
      </body>
    </html>
  )
}