'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { sidebarLinks } from '@/constants';
import { cn } from '@/lib/utils';

const Sidebar = () => {
  const pathname = usePathname();

  return (
    <section className="sticky left-0 top-[68px] flex h-[calc(100vh-68px)] w-[76px] shrink-0 flex-col justify-between border-r border-white/[0.06] bg-[#121622]/65 p-3 pt-6 text-white max-sm:hidden lg:w-[248px] lg:p-5">
      <div className="flex flex-1 flex-col gap-2">
        {sidebarLinks.map((item) => {
          const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`);
          
          return (
            <Link
              href={item.route}
              key={item.label}
              className={cn(
                'group relative flex items-center justify-center gap-4 rounded-xl px-3 py-3.5 transition-all duration-200 hover:bg-white/[0.06] lg:justify-start',
                {
                  'bg-blue-500/15 text-white shadow-[inset_0_0_0_1px_rgba(96,165,250,0.2)]': isActive,
                }
              )}
            >
              <Image
                src={item.imgURL}
                alt={item.label}
                width={24}
                height={24}
              />
              <p className="hidden text-sm font-medium text-slate-300 transition-colors group-hover:text-white lg:block">
                {item.label}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default Sidebar;
