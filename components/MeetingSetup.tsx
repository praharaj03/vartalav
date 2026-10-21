'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DeviceSettings,
  VideoPreview,
  useCall,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';
import { AlertCircle, CheckCircle2, Loader2, LockKeyhole, Video } from 'lucide-react';

import Alert from './Alert';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';
import {
  getMeetingAdmission,
  requestMeetingAdmission,
} from '@/actions/meeting.actions';

type AdmissionStatus = 'loading' | 'error' | 'none' | 'waiting' | 'approved' | 'denied' | 'host';

const MeetingSetup = ({
  setIsSetupComplete,
}: {
  setIsSetupComplete: (value: boolean) => void;
}) => {
  const { useCallEndedAt, useCallStartsAt } = useCallStateHooks();
  const callStartsAt = useCallStartsAt();
  const callEndedAt = useCallEndedAt();
  const callTimeNotArrived =
    callStartsAt && new Date(callStartsAt) > new Date();
  const callHasEnded = !!callEndedAt;
  const call = useCall();
  const [status, setStatus] = useState<AdmissionStatus>('loading');
  const [isMicCamToggled, setIsMicCamToggled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  if (!call) {
    throw new Error('useCall must be used within a StreamCall component.');
  }

  const refreshAdmission = useCallback(async () => {
    try {
      const result = await getMeetingAdmission(call.id);
      setStatus(result.status);
      return result.status;
    } catch (error) {
      console.error(error);
      setStatus('error');
      return 'error' as const;
    }
  }, [call.id, toast]);

  useEffect(() => {
    refreshAdmission();
  }, [refreshAdmission]);

  useEffect(() => {
    if (status !== 'waiting') return;
    const interval = window.setInterval(() => refreshAdmission(), 4000);
    return () => window.clearInterval(interval);
  }, [refreshAdmission, status]);

  useEffect(() => {
    if (isMicCamToggled) {
      call.camera.disable().catch((error) => console.error(error));
      call.microphone.disable().catch((error) => console.error(error));
    } else {
      call.camera.enable().catch((error) => console.error(error));
      call.microphone.enable().catch((error) => console.error(error));
    }
  }, [call, isMicCamToggled]);

  const requestOrJoin = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      let currentStatus = status === 'error' ? await refreshAdmission() : status;
      if (currentStatus === 'error' || currentStatus === 'loading') return;
      if (currentStatus === 'none' || currentStatus === 'denied') {
        const response = await requestMeetingAdmission(call.id);
        currentStatus = response.status;
        setStatus(response.status);
      }

      if (currentStatus === 'waiting') return;
      if (currentStatus !== 'host' && currentStatus !== 'approved') {
        toast({ title: 'Waiting for the host to approve your request.' });
        return;
      }

      await call.join();
      setIsSetupComplete(true);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Could not join the meeting',
        description:
          error instanceof Error
            ? error.message
            : 'The meeting service rejected the join request. Check the browser console for details.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (callHasEnded) {
    return <Alert title="The call has been ended by the host" iconUrl="/icons/call-ended.svg" />;
  }

  const canEnter = status === 'host' || status === 'approved';
  const requestIsPending = status === 'waiting';

  return (
    <main className="meeting-lobby min-h-screen px-4 py-8 text-white sm:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="lobby-panel animate-in fade-in slide-in-from-bottom-3 duration-500">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-1/70">
                Vaartalav meeting
              </p>
              <h1 className="text-2xl font-bold sm:text-3xl">Ready when you are</h1>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-sky-1">
              <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
              Secure room
            </span>
          </div>

          {callTimeNotArrived && (
            <p className="mb-4 rounded-xl border border-blue-300/15 bg-blue-400/10 px-4 py-3 text-sm text-sky-1">
              Scheduled for {callStartsAt.toLocaleString()}. You can join early.
            </p>
          )}

          <div className="preview-frame relative overflow-hidden rounded-2xl bg-black">
            <VideoPreview className="min-h-[260px] w-full sm:min-h-[380px]" />
            <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-2 text-sm backdrop-blur">
              <Video size={16} />
              Camera and microphone preview
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <label className="flex cursor-pointer items-center gap-3 text-sm text-sky-1">
              <input
                type="checkbox"
                checked={isMicCamToggled}
                onChange={(event) => setIsMicCamToggled(event.target.checked)}
                className="size-4 accent-blue-500"
              />
              Join with mic and camera off
            </label>
            <DeviceSettings />
          </div>
        </section>

        <aside className="lobby-panel flex flex-col justify-between gap-8 animate-in fade-in slide-in-from-bottom-3 duration-700">
          <div>
            <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
              <LockKeyhole size={23} />
            </div>
            <h2 className="text-xl font-semibold">You’re in the right place</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {status === 'host'
                ? 'You are hosting this meeting. Join when you are ready; guests will wait for your approval.'
                : 'Check your camera and microphone, then ask the host to let you in.'}
              {' '}Your preview stays on this device until you enter the call.
            </p>
          </div>

          <div
            className={`admission-status ${requestIsPending ? 'admission-status-pending' : ''}`}
            aria-live="polite"
          >
            {status === 'loading' && (
              <>
                <Loader2 className="animate-spin text-blue-300" size={19} />
                <span>Checking your access…</span>
              </>
            )}
            {status === 'error' && (
              <>
                <AlertCircle className="text-rose-300" size={19} />
                <span>Could not reach the meeting service. Retry to check again.</span>
              </>
            )}
            {requestIsPending && (
              <>
                <Loader2 className="animate-spin text-amber-300" size={19} />
                <span>Waiting for the host to let you in</span>
              </>
            )}
            {status === 'approved' && (
              <>
                <CheckCircle2 className="text-emerald-300" size={19} />
                <span>The host approved your request</span>
              </>
            )}
            {status === 'denied' && (
              <>
                <AlertCircle className="text-rose-300" size={19} />
                <span>The host declined this request. You can ask again.</span>
              </>
            )}
            {status === 'host' && (
              <>
                <CheckCircle2 className="text-emerald-300" size={19} />
                <span>You’re the host</span>
              </>
            )}
            {status === 'none' && (
              <>
                <LockKeyhole className="text-sky-1" size={19} />
                <span>The host must approve your entry</span>
              </>
            )}
          </div>

          <Button
            type="button"
            disabled={isSubmitting || status === 'loading' || requestIsPending}
            onClick={requestOrJoin}
            className="h-12 w-full rounded-xl bg-blue-500 text-base font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                Joining…
              </span>
            ) : status === 'error' ? (
              'Retry'
            ) : requestIsPending ? (
              'Waiting for host'
            ) : canEnter ? (
              'Join meeting'
            ) : (
              'Ask to join'
            )}
          </Button>
          <p className="text-center text-xs text-slate-400">
            Signed-in participants only · Host approval required
          </p>
        </aside>
      </div>
    </main>
  );
};

export default MeetingSetup;
