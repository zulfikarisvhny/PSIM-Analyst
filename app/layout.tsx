import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { Poppins } from 'next/font/google';
import { fetchLeagueTable } from '@/lib/scouting/queries';
import { AppShell } from '@/components/layout/AppShell';
import './globals.css';

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'], variable: '--font-poppins' });

export const metadata: Metadata = {
  title: 'PSIM Intelligence Dashboard',
  description: 'PSIM Yogyakarta match data hub — squad, form, and opponent scouting reports.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Best-effort: the sidebar's crest is cosmetic, so a logged-out visitor on
  // /login (whose session can't read this table) just gets the "PSIM" fallback.
  const logoUrl = await fetchLeagueTable()
    .then((rows) => rows.find((r) => r.Team === 'PSIM Yogyakarta')?.logo_url ?? null)
    .catch(() => null);

  return (
    <html lang="en" suppressHydrationWarning className={poppins.variable}>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AppShell logoUrl={logoUrl}>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
