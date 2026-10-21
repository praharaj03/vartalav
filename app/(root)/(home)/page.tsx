'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';

import MeetingTypeList from '@/components/MeetingTypeList';
import UpcomingMeetingBanner from '@/components/UpcomingMeetingBanner';

const Home = () => {
  const [now, setNow] = useState<Date>();

  useEffect(() => {
    const updateClock = () => setNow(new Date());
    updateClock();
    const timer = window.setInterval(updateClock, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const time = now?.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const date = now
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(now)
    : 'Loading your local time…';

  return (
    <section className="flex size-full flex-col gap-8 text-white">
      <header className="flex animate-in fade-in slide-in-from-bottom-2 items-end justify-between gap-4 duration-500">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-300">
            <Sparkles size={14} /> Your workspace
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Meet without the friction</h1>
        </div>
        <div className="hidden items-center gap-1 text-sm text-slate-400 sm:flex">
          Everything you need to bring people together <ArrowUpRight size={15} />
        </div>
      </header>

      <div className="dashboard-hero min-h-[250px] rounded-3xl p-5 sm:min-h-[285px] sm:p-8 lg:p-10">
        <div className="flex h-full flex-col justify-between gap-10">
          <UpcomingMeetingBanner />
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
            <p className="mb-1 text-sm font-medium text-sky-1/75">Your local time</p>
            <h2 className="text-5xl font-bold tracking-[-0.06em] sm:text-6xl lg:text-7xl">
              {time || <span className="inline-block h-[1em] w-40 animate-pulse rounded-lg bg-white/10" />}
            </h2>
            <p className="mt-2 text-sm text-sky-1 sm:text-base">{date}</p>
          </div>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Get started</h2>
            <p className="mt-1 text-sm text-slate-400">Start now, schedule ahead, or join with a meeting code.</p>
          </div>
        </div>
        <MeetingTypeList />
      </div>
    </section>
  );
};

export default Home;
