'use client';

import Link from 'next/link';

import { useGetCalls } from '@/hooks/useGetCalls';
import { Button } from './ui/button';

const UpcomingMeetingBanner = () => {
  const { upcomingCalls, isLoading } = useGetCalls();
  const nextMeeting = upcomingCalls?.[0];
  const startsAt = nextMeeting?.state.startsAt;

  return (
    <div className="glassmorphism flex max-w-fit items-center gap-3 rounded px-4 py-2 text-sm font-medium">
      <span>
        {nextMeeting && startsAt
          ? `Next meeting: ${startsAt.toLocaleString()}`
          : isLoading
            ? 'Loading your upcoming meetings...'
            : 'No upcoming meetings'}
      </span>
      {nextMeeting && (
        <Button asChild size="sm" className="bg-blue-1">
          <Link href={`/meeting/${nextMeeting.id}`}>Join</Link>
        </Button>
      )}
    </div>
  );
};

export default UpcomingMeetingBanner;
