'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  CallControls,
  CallParticipantsList,
  CallStatsButton,
  CallingState,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
  useCall,
} from '@stream-io/video-react-sdk';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, LayoutList, Share2, Copy, DoorOpen, Check, X } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import Loader from './Loader';
import EndCallButton from './EndCallButton';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useToast } from './ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { getMeetingAdmission, decideMeetingAdmission } from '@/actions/meeting.actions';

type WaitingParticipant = { id: string; name: string };

type CallLayoutType = 'grid' | 'speaker-left' | 'speaker-right';

const MeetingRoom = () => {
  const searchParams = useSearchParams();
  const isPersonalRoom = !!searchParams.get('personal');
  const router = useRouter();
  const call = useCall();
  const { toast } = useToast();
  const [layout, setLayout] = useState<CallLayoutType>('speaker-left');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [waitingParticipants, setWaitingParticipants] = useState<WaitingParticipant[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string>();
  const { useCallCallingState } = useCallStateHooks();

  // for more detail about types of CallingState see: https://getstream.io/video/docs/react/ui-cookbook/ringing-call/#incoming-call-panel
  const callingState = useCallCallingState();
  const meetingLink =
    typeof window !== 'undefined' && call
      ? `${window.location.origin}/meeting/${encodeURIComponent(call.id)}${isPersonalRoom ? '?personal=true' : ''}`
      : '';

  const copyInvite = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copied` });
    } catch (error) {
      console.error(error);
      toast({ title: `Could not copy the ${label.toLowerCase()}` });
    }
  };

  const refreshAdmission = useCallback(async () => {
    if (!call) return;
    try {
      const result = await getMeetingAdmission(call.id);
      setIsHost(result.isHost);
      setWaitingParticipants((current) => {
        const next = result.waitingParticipants;
        const isUnchanged =
          current.length === next.length &&
          current.every(
            (participant, index) =>
              participant.id === next[index]?.id &&
              participant.name === next[index]?.name,
          );
        return isUnchanged ? current : next;
      });
    } catch (error) {
      console.error(error);
    }
  }, [call]);

  useEffect(() => {
    if (callingState !== CallingState.JOINED) return;
    refreshAdmission();
    const interval = window.setInterval(() => refreshAdmission(), 4000);
    return () => window.clearInterval(interval);
  }, [callingState, refreshAdmission]);

  const handleAdmission = async (participantId: string, approve: boolean) => {
    if (!call) return;
    setProcessingRequest(participantId);
    try {
      await decideMeetingAdmission(call.id, participantId, approve);
      await refreshAdmission();
      toast({ title: approve ? 'Participant admitted' : 'Entry request declined' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Could not update the entry request. Please try again.' });
    } finally {
      setProcessingRequest(undefined);
    }
  };

  if (callingState !== CallingState.JOINED) return <Loader />;

  const callLayout = (() => {
    switch (layout) {
      case 'grid':
        return <PaginatedGridLayout />;
      case 'speaker-right':
        return <SpeakerLayout participantsBarPosition="left" />;
      default:
        return <SpeakerLayout participantsBarPosition="right" />;
    }
  })();

  return (
    <section className="relative h-[100dvh] w-full overflow-hidden px-2 pb-24 pt-4 text-white sm:px-4 sm:pb-20">
      <div className="absolute right-3 top-4 z-20 flex gap-2 sm:right-5">
        {isHost && (
          <Button
            type="button"
            onClick={() => setShowRequests(true)}
            className="relative gap-2 bg-dark-1 text-white ring-1 ring-white/15 hover:bg-dark-3"
          >
            <DoorOpen size={16} />
            <span className="hidden sm:inline">Entry requests</span>
            {waitingParticipants.length > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-950">
                {waitingParticipants.length}
              </span>
            )}
          </Button>
        )}
        <Button
          type="button"
          onClick={() => setShowInvite(true)}
          className="gap-2 bg-blue-1 text-white hover:bg-blue-1/80"
        >
          <Share2 size={16} />
          Invite
        </Button>
      </div>
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="border-dark-1 bg-dark-1 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Invite people to this meeting
            </DialogTitle>
            <DialogDescription className="text-sky-2">
              Share the link or give participants the meeting code to enter from Join Meeting.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-sky-2" htmlFor="meeting-invite-link">
              Meeting link
            </label>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <Input
                id="meeting-invite-link"
                readOnly
                value={meetingLink}
                className="min-w-0 border-none bg-dark-3 text-white"
              />
              <Button
                type="button"
                onClick={() => copyInvite(meetingLink, 'Meeting link')}
                className="w-full shrink-0 gap-2 bg-blue-1 text-white sm:w-auto"
              >
                <Copy size={16} /> Copy
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-sky-2" htmlFor="meeting-invite-code">
              Meeting code
            </label>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <Input
                id="meeting-invite-code"
                readOnly
                value={call?.id ?? ''}
                className="min-w-0 border-none bg-dark-3 text-white"
              />
              <Button
                type="button"
                onClick={() => call && copyInvite(call.id, 'Meeting code')}
                className="w-full shrink-0 gap-2 bg-blue-1 text-white sm:w-auto"
              >
                <Copy size={16} /> Copy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showRequests} onOpenChange={setShowRequests}>
        <DialogContent className="border-white/10 bg-dark-1 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">People waiting to join</DialogTitle>
            <DialogDescription className="text-sky-2">
              Admit people you recognize. Only admitted participants can enter the call.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] space-y-3 overflow-y-auto">
            {waitingParticipants.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-300">
                No one is waiting right now.
              </div>
            ) : waitingParticipants.map((participant) => (
              <div key={participant.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/20 font-semibold text-blue-200">
                    {participant.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="truncate text-sm font-medium">{participant.name}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={processingRequest === participant.id}
                    onClick={() => handleAdmission(participant.id, false)}
                    className="gap-1 bg-white/10 text-white hover:bg-white/15"
                    aria-label={`Decline ${participant.name}`}
                  >
                    <X size={16} /> Decline
                  </Button>
                  <Button
                    type="button"
                    disabled={processingRequest === participant.id}
                    onClick={() => handleAdmission(participant.id, true)}
                    className="gap-1 bg-emerald-500 text-white hover:bg-emerald-400"
                    aria-label={`Admit ${participant.name}`}
                  >
                    <Check size={16} /> Admit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <div className="relative flex size-full items-center justify-center">
        <div className=" flex size-full max-w-[1000px] items-center">
          {callLayout}
        </div>
        <div
          className={cn('h-[calc(100vh-86px)] hidden ml-2', {
            'show-block': showParticipants,
          })}
        >
          <CallParticipantsList onClose={() => setShowParticipants(false)} />
        </div>
      </div>
      {/* video layout and call controls */}
      <div className="meeting-toolbar fixed inset-x-0 bottom-0 z-20 flex flex-wrap items-center justify-center gap-2 px-2 py-3 sm:gap-4">
        <CallControls onLeave={() => router.push(`/`)} />

        <DropdownMenu>
          <div className="flex items-center">
            <DropdownMenuTrigger className="cursor-pointer rounded-2xl bg-[#19232d] px-4 py-2 hover:bg-[#4c535b]  ">
              <LayoutList size={20} className="text-white" />
            </DropdownMenuTrigger>
          </div>
          <DropdownMenuContent className="border-dark-1 bg-dark-1 text-white">
            {['Grid', 'Speaker-Left', 'Speaker-Right'].map((item, index) => (
              <div key={index}>
                <DropdownMenuItem
                  onClick={() =>
                    setLayout(item.toLowerCase() as CallLayoutType)
                  }
                >
                  {item}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="border-dark-1" />
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <CallStatsButton />
        <button onClick={() => setShowParticipants((prev) => !prev)}>
          <div className=" cursor-pointer rounded-2xl bg-[#19232d] px-4 py-2 hover:bg-[#4c535b]  ">
            <Users size={20} className="text-white" />
          </div>
        </button>
        {!isPersonalRoom && <EndCallButton />}
      </div>
    </section>
  );
};

export default MeetingRoom;
