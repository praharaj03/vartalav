import { Metadata } from 'next';
import { ReactNode } from 'react';

import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Video Meetings',
  description:
    'Manage upcoming and previous video meetings, recordings, and your personal room in Vaartalav.',
};

const RootLayout = ({ children }: Readonly<{children: ReactNode}>) => {
  return (
    <main className="relative">
      <Navbar />

      <div className="flex">
        <Sidebar />
        
        <section className="min-w-0 flex-1 px-4 pb-8 pt-24 sm:px-6 sm:pt-28 lg:px-10">
          <div className="mx-auto w-full max-w-[1500px]">{children}</div>
        </section>
      </div>
    </main>
  );
};

export default RootLayout;
