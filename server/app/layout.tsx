// server/app/layout.tsx
// Root layout — required by Next.js App Router (API-only backend)

export const metadata = {
  title: 'Translate-R API',
  description: 'Backend API for Translate-R real-time translation video calls',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
