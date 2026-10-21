'use client';

import Image from 'next/image';

import { cn } from '@/lib/utils';

interface HomeCardProps {
  className?: string;
  img: string;
  title: string;
  description: string;
  handleClick?: () => void;
}

const HomeCard = ({ className, img, title, description, handleClick }: HomeCardProps) => {
  return (
    <button
      type="button"
      disabled={!handleClick}
      className={cn(
        'group relative flex min-h-[210px] w-full cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.085] to-white/[0.025] p-5 text-left text-white shadow-[0_18px_45px_rgba(0,0,0,0.15)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-300/30 hover:from-blue-500/[0.16] hover:to-white/[0.025] hover:shadow-[0_22px_60px_rgba(10,56,130,0.18)] focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-default disabled:hover:translate-y-0 sm:min-h-[230px] xl:max-w-none',
        className
      )}
      onClick={handleClick}
    >
      <div className="flex-center size-12 rounded-xl border border-white/10 bg-white/[0.07] transition-transform duration-300 group-hover:scale-110 group-hover:bg-blue-400/15">
        <Image src={img} alt="meeting" width={27} height={27} />
      </div>
      
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        <p className="text-sm leading-6 text-slate-400 sm:text-base">{description}</p>
      </div>
    </button>
  );
};

export default HomeCard;
