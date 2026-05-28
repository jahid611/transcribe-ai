import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'transcribe-ai · Transcription + Résumé IA',
  description:
    'Transformez vos réunions et enregistrements en résumés structurés grâce à l\'IA. Pay-as-you-go, sans quota dur.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="fr" suppressHydrationWarning>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
