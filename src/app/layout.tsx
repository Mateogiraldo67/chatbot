import './globals.css'
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export const metadata = {
  title: 'Chat Inteligente',
  description: 'Chatbot inteligente con integración N8N',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const messages = await getMessages();

  return (
    <html lang=\"es\">\n      <body>\n        <NextIntlClientProvider messages={messages}>\n          {children}\n        </NextIntlClientProvider>\n      </body>\n    </html>\n  );\n}