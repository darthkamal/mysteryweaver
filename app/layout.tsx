import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MysteryWeaver',
  description: 'Live mystery game companion',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
