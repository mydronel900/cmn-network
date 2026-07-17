import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-zinc-950">
      <body className="h-full text-zinc-100 antialiased selection:bg-emerald-500/20">
        <main className="flex h-screen overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
