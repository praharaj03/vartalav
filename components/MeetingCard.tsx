"use client";

import Image from "next/image";

import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { ArrowUpRight, CalendarDays, Copy } from 'lucide-react';

interface MeetingCardProps {
  title: string;
  date: string;
  icon: string;
  isPreviousMeeting?: boolean;
  buttonIcon1?: string;
  buttonText?: string;
  handleClick: () => void;
  link: string;
}

const MeetingCard = ({
  icon,
  title,
  date,
  isPreviousMeeting,
  buttonIcon1,
  handleClick,
  link,
  buttonText,
}: MeetingCardProps) => {
  const { toast } = useToast();

  const copyMeetingLink = async () => {
    try {
      const absoluteLink = new URL(link, window.location.origin).toString();
      await navigator.clipboard.writeText(absoluteLink);
      toast({ title: 'Meeting link copied' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Could not copy the meeting link' });
    }
  };

  return (
    <section className="group flex min-h-[225px] w-full flex-col justify-between rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-5 shadow-[0_15px_40px_rgba(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-300/20 hover:bg-white/[0.07] sm:p-6">
      <article className="flex flex-col gap-5">
        <div className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-blue-500/10">
          <Image src={icon} alt="" width={22} height={22} />
        </div>
        <div className="flex justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="line-clamp-2 text-lg font-semibold tracking-tight sm:text-xl">{title}</h1>
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <CalendarDays size={15} /> {date}
            </p>
          </div>
          <ArrowUpRight size={18} className="shrink-0 text-slate-500 transition group-hover:text-blue-300" />
        </div>
      </article>
      <article className="relative mt-7 flex flex-wrap items-center justify-end gap-2">
        {!isPreviousMeeting && (
          <>
            <Button onClick={handleClick} className="h-10 rounded-lg bg-blue-500 px-4 text-white hover:bg-blue-400">
              {buttonIcon1 && (
                <Image src={buttonIcon1} alt="feature" width={20} height={20} />
              )}
              {buttonText}
            </Button>
            <Button
              onClick={copyMeetingLink}
              variant="outline"
              className="h-10 rounded-lg border-white/10 bg-white/[0.04] px-4 text-white hover:bg-white/10 hover:text-white"
            >
              <Copy size={16} /> <span className="ml-2">Copy Link</span>
            </Button>
          </>
        )}
      </article>
    </section>
  );
};

export default MeetingCard;
