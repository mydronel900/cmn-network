import React from 'react';
import './globals.css';

export const metadata = {
  title: 'CMN Network - Consumer Portal',
  description: 'Parallel Cybernetic Macroeconomic Engine',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-zinc-900">
      <body className="h-full text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
