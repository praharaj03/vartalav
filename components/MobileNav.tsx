'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { sidebarLinks } from '@/constants';
import { cn } from '@/lib/utils';

const MobileNav = () => {
  const pathname = usePathname();

  return (
    <section className="w-full max-w-[264px]">
      <Sheet>
        <SheetTrigger asChild>
          <button type="button" className="flex size-10 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/10 sm:hidden" aria-label="Open navigation">
            <Image
              src="/icons/hamburger.svg"
              width={20}
              height={20}
              alt=""
            />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="border-white/10 bg-[#151a27]">
          <Link href="/" className="flex items-center gap-1">
            <Image
              src="/icons/logo.svg"
              width={32}
              height={32}
              alt="Vaartalav logo"
            />
            <p className="text-[26px] font-extrabold text-white">Vaartalav</p>
          </Link>
          <div className="flex h-[calc(100vh-72px)] flex-col justify-between overflow-y-auto">
            <SheetClose asChild>
              <section className=" flex h-full flex-col gap-6 pt-16 text-white">
                {sidebarLinks.map((item) => {
                  const isActive = pathname === item.route;

                  return (
                    <SheetClose asChild key={item.route}>
                      <Link
                        href={item.route}
                        key={item.label}
                        className={cn(
                          'flex w-full max-w-60 items-center gap-4 rounded-xl p-4 text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white',
                          {
                            'bg-blue-500/15 text-white': isActive,
                          }
                        )}
                      >
                        <Image
                          src={item.imgURL}
                          alt={item.label}
                          width={20}
                          height={20}
                        />
                        <p className="font-semibold">{item.label}</p>
                      </Link>
                    </SheetClose>
                  );
                })}
              </section>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
};

export default MobileNav;
