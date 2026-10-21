import Image from 'next/image';
import Link from 'next/link';
import { SignedIn, UserButton } from '@clerk/nextjs';

import MobileNav from './MobileNav';

const Navbar = () => {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-white/[0.07] bg-[#121622]/80 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-10">
      <Link href="/" className="flex items-center gap-1">
        <Image
          src="/icons/logo.svg"
          width={32}
          height={32}
          alt="Vaartalav logo"
          className="max-sm:size-10"
        />
        <p className="text-[22px] font-extrabold tracking-tight text-white max-sm:hidden">
          Vaartalav
        </p>
      </Link>
      <div className="flex items-center gap-4">
        <SignedIn>
          <UserButton afterSignOutUrl="/sign-in" />
        </SignedIn>

        <MobileNav />
      </div>
    </nav>
  );
};

export default Navbar;
