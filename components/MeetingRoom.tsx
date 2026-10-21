'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CallControls,
  CallParticipantsList,
  CallStatsButton,
  CallingState,
  DefaultParticipantViewUI,
  OwnCapability,
  PaginatedGridLayout,
  ParticipantView,
  SpeakerLayout,
  useRequestPermission,
  useCallStateHooks,
  useCall,
} from '@stream-io/video-react-sdk';
import { SfuModels } from '@stream-io/video-client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, LayoutList, Share2, Copy, DoorOpen, Check, X, MessageCircle, Maximize2, Minimize2, MonitorUp } from 'lucide-react';

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
import { getAppBaseUrl } from '@/lib/app-url';
import MeetingChatPanel from './MeetingChatPanel';

type WaitingParticipant = { id: string; name: string };

type CallLayoutType = 'grid' | 'speaker-left' | 'speaker-right';

const ScreenSharePermissionControl = () => {
  const { requestPermission, hasPermission, canRequestPermission, isAwaitingPermission } =
    useRequestPermission(OwnCapability.SCREENSHARE);

  // CallControls already shows Stream's native share button to participants
  // who have permission. This control only fills the permission request gap.
  if (hasPermission) return null;

  return (
    <Button
      type="button"
      disabled={!canRequestPermission || isAwaitingPermission}
      onClick={() => void requestPermission()}
      title={canRequestPermission ? 'Ask the host to share your screen' : 'Screen sharing is unavailable'}
      className="meeting-tool-button gap-2 bg-dark-1 text-white"
    >
      <MonitorUp size={17} />
      <span className="hidden sm:inline">
        {isAwaitingPermission ? 'Waiting for approval' : 'Request screen share'}
      </span>
    </Button>
  );
};

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
  const [showShareRequests, setShowShareRequests] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [shareRequests, setShareRequests] = useState<Array<{ id: string; name: string }>>([]);
  const [fullScreenShare, setFullScreenShare] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [waitingParticipants, setWaitingParticipants] = useState<WaitingParticipant[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string>();
  const stageRef = useRef<HTMLDivElement>(null);
  const { useCallCallingState, useParticipants, useLocalParticipant } = useCallStateHooks();
  const participants = useParticipants();
  const localParticipant = useLocalParticipant();

  // for more detail about types of CallingState see: https://getstream.io/video/docs/react/ui-cookbook/ringing-call/#incoming-call-panel
  const callingState = useCallCallingState();
  const screenSharer = participants.find((participant) =>
    participant.publishedTracks.includes(SfuModels.TrackType.SCREEN_SHARE),
  );
  const meetingLink =
    typeof window !== 'undefined' && call
      ? `${getAppBaseUrl()}/meeting/${encodeURIComponent(call.id)}${isPersonalRoom ? '?personal=true' : ''}`
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

  useEffect(() => {
    if (!call || !isHost) return;
    return call.on('call.permission_request', (event) => {
      if (!event.permissions.includes(OwnCapability.SCREENSHARE)) return;
      setShareRequests((current) => current.some((item) => item.id === event.user.id)
        ? current
        : [...current, { id: event.user.id, name: event.user.name || event.user.id }]);
      toast({ title: `${event.user.name || 'A participant'} asked to share their screen` });
    });
  }, [call, isHost, toast]);

  useEffect(() => {
    if (!call || !localParticipant) return;
    return call.on('custom', (event) => {
      const custom = event.custom as Record<string, unknown> | undefined;
      if (
        custom?.kind === 'vaartalav-screen-share-decision' &&
        custom.target_user_id === localParticipant.userId &&
        custom.approved === false
      ) {
        toast({ title: 'The host declined your screen sharing request' });
      }
    });
  }, [call, localParticipant, toast]);

  useEffect(() => {
    const syncFullscreenState = () => {
      setFullScreenShare(document.fullscreenElement === stageRef.current);
    };
    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

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

  const handleShareRequest = async (participantId: string, approve: boolean) => {
    if (!call || !isHost || processingRequest) return;
    setProcessingRequest(participantId);
    try {
      if (approve) {
        await call.grantPermissions(participantId, [OwnCapability.SCREENSHARE]);
      } else {
        await call.sendCustomEvent({
          kind: 'vaartalav-screen-share-decision',
          target_user_id: participantId,
          approved: false,
        });
      }
      setShareRequests((current) => current.filter((request) => request.id !== participantId));
      toast({ title: approve ? 'Screen sharing approved' : 'Screen sharing declined' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Could not update the screen sharing request' });
    } finally {
      setProcessingRequest(undefined);
    }
  };

  const toggleScreenFullscreen = async () => {
    if (!stageRef.current) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setFullScreenShare(false);
      } else {
        await stageRef.current.requestFullscreen();
        setFullScreenShare(true);
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Could not change fullscreen mode' });
    }
  };

  if (callingState !== CallingState.JOINED) {
    return (
      <Loader
        label="Joining your meeting"
        detail="Setting up your audio and video connection."
      />
    );
  }

  const callLayout = (() => {
    switch (layout) {
      case 'grid':
        return <PaginatedGridLayout ParticipantViewUI={<DefaultParticipantViewUI indicatorsVisible />} />;
      case 'speaker-right':
        return <SpeakerLayout participantsBarPosition="left" participantsBarLimit="dynamic" ParticipantViewUISpotlight={<DefaultParticipantViewUI indicatorsVisible />} ParticipantViewUIBar={<DefaultParticipantViewUI indicatorsVisible />} />;
      default:
        return <SpeakerLayout participantsBarPosition="right" participantsBarLimit="dynamic" ParticipantViewUISpotlight={<DefaultParticipantViewUI indicatorsVisible />} ParticipantViewUIBar={<DefaultParticipantViewUI indicatorsVisible />} />;
    }
  })();

  return (
    <section className="meeting-room relative flex h-[100dvh] w-full flex-col overflow-hidden px-2 pb-2 pt-2 text-white sm:px-4 sm:pb-3 sm:pt-3">
      <header className="meeting-header relative z-20 flex min-h-12 shrink-0 items-center justify-between gap-2 px-1 pb-2 sm:px-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Vaartalav meeting</p>
          <p className="text-xs text-slate-400">{participants.length} participant{participants.length === 1 ? '' : 's'} · {isHost ? 'Host' : 'Participant'}</p>
        </div>
      <div className="flex shrink-0 items-center gap-2">
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
        {isHost && (
          <Button type="button" onClick={() => setShowShareRequests(true)} className="relative gap-2 bg-dark-1 text-white ring-1 ring-white/15 hover:bg-dark-3">
            <MonitorUp size={16} />
            <span className="hidden sm:inline">Share requests</span>
            {shareRequests.length > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-blue-400 text-xs font-bold text-slate-950">{shareRequests.length}</span>}
          </Button>
        )}
        <Button type="button" onClick={() => setShowChat((open) => !open)} className="meeting-tool-button gap-2 bg-dark-1 text-white ring-1 ring-white/15 hover:bg-dark-3" aria-label="Open meeting chat">
          <MessageCircle size={16} /><span className="hidden sm:inline">Chat</span>
        </Button>
        <Button
          type="button"
          onClick={() => setShowInvite(true)}
          className="gap-2 bg-blue-1 text-white hover:bg-blue-1/80"
        >
          <Share2 size={16} />
          Invite
        </Button>
      </div>
      </header>
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
      <div className="meeting-stage relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-1 sm:p-2">
        {screenSharer ? (
          <div className="flex size-full min-h-0 flex-col gap-2 lg:flex-row">
            <div ref={stageRef} className="meeting-screen-stage group relative min-h-0 flex-1 overflow-hidden rounded-xl bg-black">
              <ParticipantView participant={screenSharer} trackType="screenShareTrack" ParticipantViewUI={null} className="size-full" />
              <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
                {screenSharer.name || 'Participant'} is sharing their screen
              </div>
              <Button type="button" onClick={toggleScreenFullscreen} className="absolute right-3 top-3 gap-2 bg-black/60 text-white opacity-100 backdrop-blur transition lg:opacity-0 lg:group-hover:opacity-100" aria-label={fullScreenShare ? 'Exit fullscreen' : 'View shared screen fullscreen'}>
                {fullScreenShare ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                <span className="hidden sm:inline">{fullScreenShare ? 'Exit fullscreen' : 'Fullscreen'}</span>
              </Button>
            </div>
            <div className="meeting-screen-participants shrink-0 lg:w-64">
              <PaginatedGridLayout groupSize={4} ParticipantViewUI={<DefaultParticipantViewUI indicatorsVisible />} />
            </div>
          </div>
        ) : (
          <div className="flex size-full min-h-0 items-center justify-center">{callLayout}</div>
        )}
      </div>
      <div className="meeting-toolbar relative z-20 mt-2 flex shrink-0 flex-wrap items-center justify-center gap-2 px-1 py-2 sm:gap-3">
        <CallControls onLeave={() => router.push(`/`)} />
        <ScreenSharePermissionControl />

        <DropdownMenu>
          <div className="flex items-center">
            <DropdownMenuTrigger className="meeting-tool-button cursor-pointer rounded-2xl bg-[#19232d] px-4 py-2 hover:bg-[#4c535b]">
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
        <button type="button" onClick={() => setShowParticipants((prev) => !prev)} aria-label="Toggle participant list" className="meeting-tool-button cursor-pointer rounded-2xl bg-[#19232d] px-4 py-2 hover:bg-[#4c535b]">
          <Users size={20} className="text-white" />
        </button>
        {isHost && !isPersonalRoom && <EndCallButton />}
      </div>
      <MeetingChatPanel isOpen={showChat} isHost={isHost} onClose={() => setShowChat(false)} />

      <Dialog open={showShareRequests} onOpenChange={setShowShareRequests}>
        <DialogContent className="border-white/10 bg-dark-1 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Screen sharing requests</DialogTitle>
            <DialogDescription className="text-sky-2">Approve a participant before they can share their screen.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] space-y-3 overflow-y-auto">
            {shareRequests.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-300">No screen sharing requests right now.</div>
            ) : shareRequests.map((request) => (
              <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <span className="truncate text-sm font-medium">{request.name}</span>
                <div className="flex gap-2">
                  <Button type="button" disabled={processingRequest === request.id} onClick={() => handleShareRequest(request.id, false)} className="gap-1 bg-white/10 text-white hover:bg-white/15"><X size={16} /> Decline</Button>
                  <Button type="button" disabled={processingRequest === request.id} onClick={() => handleShareRequest(request.id, true)} className="gap-1 bg-emerald-500 text-white hover:bg-emerald-400"><Check size={16} /> Allow</Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <div className={cn('meeting-participants-list hidden', { 'show-block': showParticipants })}>
        <CallParticipantsList onClose={() => setShowParticipants(false)} />
      </div>
    </section>
  );
};

export default MeetingRoom;
