import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rowglass — Private CSV & JSON Diff Viewer',
  description: 'Compare CSV, TSV and JSON locally. Match records by key, review cell-level changes, and export reports. No data uploads or account required.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
