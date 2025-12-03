import type { Metadata } from 'next'
import './globals.css'
import { OrderProvider } from './context/OrderContext'

export const metadata: Metadata = {
  title: 'Print Scheduling',
  description: 'Print scheduling system for students',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <OrderProvider>
          {children}
        </OrderProvider>
      </body>
    </html>
  )
}
