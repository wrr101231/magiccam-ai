import '@/styles/globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | MagicCamAI',
    default: 'MagicCamAI - High-Performance Local AI Desktop Application',
  },
  description: 'MagicCamAI is a professional suite for face swapping and AI backgrounds, running entirely locally on your machine with no cloud dependencies.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
