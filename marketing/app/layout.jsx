import './globals.css';
import SmoothScroll from '@/components/SmoothScroll';

export const metadata = {
  title: 'THE DAILY MAX — Six Minutes. Four Stations. Every Day.',
  description:
    'Crew-based bodyweight habit. Push-ups. Air squats. Hollow hold. Pull-ups. Your PR is the only bar.',
  openGraph: {
    title: 'THE DAILY MAX',
    description:
      'Six minutes. Four stations. Every day. Your PR is the only bar.',
    type: 'website',
  },
};

export const viewport = {
  themeColor: '#0A0707',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-void text-bone antialiased">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
