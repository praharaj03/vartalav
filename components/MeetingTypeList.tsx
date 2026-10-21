/* eslint-disable camelcase */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import HomeCard from './HomeCard';
import MeetingModal from './MeetingModal';
import { useStreamVideoClient } from '@stream-io/video-react-sdk';
import { useUser } from '@clerk/nextjs';
import Loader from './Loader';
import { createMeeting as createMeetingAction } from '@/actions/meeting.actions';
import { Textarea } from './ui/textarea';
import ReactDatePicker from 'react-datepicker';
import { useToast } from './ui/use-toast';
import { Input } from './ui/input';
import { getAppBaseUrl } from '@/lib/app-url';

const createInitialValues = () => ({
  dateTime: new Date(Date.now() + 15 * 60 * 1000),
  description: '',
});

const MeetingTypeList = () => {
  const router = useRouter();
  const [meetingState, setMeetingState] = useState<
    | 'isScheduleMeeting'
    | 'isJoiningMeeting'
    | 'isInstantMeeting'
    | 'meetingCreated'
    | undefined
  >(undefined);
  const [values, setValues] = useState(createInitialValues);
  const [callDetail, setCallDetail] = useState<{
    id: string;
    description: string;
    startsAt: string;
  }>();
  const [meetingLink, setMeetingLink] = useState('');
  const [joinLink, setJoinLink] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const client = useStreamVideoClient();
  const { user } = useUser();
  const { toast } = useToast();

  const createMeeting = async (isInstantMeeting: boolean) => {
    if (!client || !user || isCreating) return;
    if (!isInstantMeeting && values.dateTime.getTime() <= Date.now()) {
      toast({ title: 'Choose a meeting time in the future' });
      return;
    }

    setIsCreating(true);
    try {
      const meeting = await createMeetingAction({
        startsAt: isInstantMeeting ? undefined : values.dateTime.toISOString(),
        description: values.description,
      });
      setCallDetail(meeting);
      if (isInstantMeeting) {
        router.push(`/meeting/${meeting.id}`);
      } else {
        setMeetingLink(
          `${getAppBaseUrl()}/meeting/${encodeURIComponent(meeting.id)}`,
        );
        setMeetingState('meetingCreated');
      }
      toast({ title: isInstantMeeting ? 'Meeting started' : 'Meeting scheduled' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Could not create the meeting. Please try again.' });
    } finally {
      setIsCreating(false);
    }
  };

  if (!client || !user) {
    return (
      <Loader
        label="Connecting to your workspace"
        detail="Your meetings and controls are loading securely."
      />
    );
  }

  const joinMeeting = () => {
    const value = joinLink.trim();
    if (!value) {
      toast({ title: 'Enter a meeting ID or link' });
      return;
    }

    const isMeetingId = /^[a-zA-Z0-9_-]+$/.test(value);
    let meetingId = isMeetingId ? value : '';
    let isPersonalRoom = false;

    if (!meetingId) {
      try {
        const url = new URL(value, window.location.origin);
        const match = url.pathname.match(/^\/meeting\/([^/]+)\/?$/);
        if (url.origin === window.location.origin && match) {
          meetingId = decodeURIComponent(match[1]);
          isPersonalRoom = url.searchParams.get('personal') === 'true';
        }
      } catch {
        meetingId = '';
      }
    }

    if (!meetingId) {
      toast({ title: 'Enter a valid Vaartalav meeting ID or link' });
      return;
    }

    setMeetingState(undefined);
    router.push(
      `/meeting/${encodeURIComponent(meetingId)}${isPersonalRoom ? '?personal=true' : ''}`,
    );
  };

  const copyMeetingLink = async () => {
    try {
      await navigator.clipboard.writeText(meetingLink);
      toast({ title: 'Meeting link copied' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Could not copy the meeting link' });
    }
  };

  return (
    <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
      <HomeCard
        img="/icons/add-meeting.svg"
        title="New Meeting"
        description="Start an instant meeting"
        handleClick={() => {
          setValues(createInitialValues());
          setMeetingState('isInstantMeeting');
        }}
      />
      <HomeCard
        img="/icons/join-meeting.svg"
        title="Join Meeting"
        description="via invitation link"
        className="bg-blue-1"
        handleClick={() => setMeetingState('isJoiningMeeting')}
      />
      <HomeCard
        img="/icons/schedule.svg"
        title="Schedule Meeting"
        description="Plan your meeting"
        className="bg-purple-1"
        handleClick={() => {
          setCallDetail(undefined);
          setValues(createInitialValues());
          setMeetingState('isScheduleMeeting');
        }}
      />
      <HomeCard
        img="/icons/recordings.svg"
        title="View Recordings"
        description="Meeting Recordings"
        className="bg-yellow-1"
        handleClick={() => router.push('/recordings')}
      />

      {meetingState === 'isScheduleMeeting' && (
        <MeetingModal
          isOpen
          onClose={() => setMeetingState(undefined)}
          title="Schedule a Meeting"
          handleClick={() => createMeeting(false)}
          buttonText={isCreating ? 'Scheduling...' : 'Schedule Meeting'}
          buttonDisabled={isCreating}
        >
          <div className="flex flex-col gap-2.5">
            <label className="text-base font-normal leading-[22.4px] text-sky-2">
              Add a description
            </label>
            <Textarea
              className="border-none bg-dark-3 focus-visible:ring-0 focus-visible:ring-offset-0"
              onChange={(e) =>
                setValues({ ...values, description: e.target.value })
              }
              placeholder="What is this meeting about?"
            />
          </div>
          <div className="flex w-full flex-col gap-2.5">
            <label className="text-base font-normal leading-[22.4px] text-sky-2">
              Select Date and Time
            </label>
            <ReactDatePicker
              selected={values.dateTime}
              onChange={(date: Date | null) => {
                if (date) setValues({ ...values, dateTime: date });
              }}
              minDate={new Date()}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              timeCaption="time"
              dateFormat="MMMM d, yyyy h:mm aa"
              className="w-full rounded bg-dark-3 p-2 focus:outline-none"
            />
          </div>
        </MeetingModal>
      )}

      {meetingState === 'meetingCreated' && callDetail && (
        <MeetingModal
          isOpen
          onClose={() => setMeetingState(undefined)}
          title="Your meeting is scheduled"
          handleClick={copyMeetingLink}
          image={'/icons/checked.svg'}
          buttonIcon="/icons/copy.svg"
          className="text-center"
          buttonText="Copy Meeting Link"
        >
          <p className="text-sky-2">
            {callDetail.description} ·{' '}
            {new Date(callDetail.startsAt).toLocaleString()}
          </p>
          <Input
            aria-label="Meeting link"
            readOnly
            value={meetingLink}
            onFocus={(event) => event.currentTarget.select()}
            className="border-none bg-dark-3 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </MeetingModal>
      )}

      <MeetingModal
        isOpen={meetingState === 'isJoiningMeeting'}
        onClose={() => setMeetingState(undefined)}
        title="Join a Meeting"
        className="text-center"
        buttonText="Join Meeting"
        handleClick={joinMeeting}
        buttonDisabled={!joinLink.trim()}
      >
        <Input
          autoFocus
          placeholder="Paste a meeting link or enter its ID"
          value={joinLink}
          onChange={(e) => setJoinLink(e.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') joinMeeting();
          }}
          className="border-none bg-dark-3 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </MeetingModal>

      <MeetingModal
        isOpen={meetingState === 'isInstantMeeting'}
        onClose={() => setMeetingState(undefined)}
        title="Start an Instant Meeting"
        className="text-center"
        buttonText={isCreating ? 'Starting...' : 'Start Meeting'}
        handleClick={() => createMeeting(true)}
        buttonDisabled={isCreating}
      />
    </section>
  );
};

export default MeetingTypeList;
