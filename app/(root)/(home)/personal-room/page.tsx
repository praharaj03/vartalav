"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useStreamVideoClient } from "@stream-io/video-react-sdk";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { createPersonalRoom as createPersonalRoomAction } from "@/actions/meeting.actions";
import { getAppBaseUrl } from "@/lib/app-url";

const Table = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => {
  return (
    <div className="flex flex-col items-start gap-2 xl:flex-row">
      <h1 className="text-base font-medium text-sky-1 lg:text-xl xl:min-w-32">
        {title}:
      </h1>
      <h1 className="truncate text-sm font-bold max-sm:max-w-[320px] lg:text-xl">
        {description}
      </h1>
    </div>
  );
};

const PersonalRoom = () => {
  const router = useRouter();
  const { user } = useUser();
  const client = useStreamVideoClient();
  const { toast } = useToast();
  const [origin, setOrigin] = useState('');

  const meetingId = user?.id;

  useEffect(() => {
    setOrigin(getAppBaseUrl(window.location.origin));
  }, []);

  const startRoom = async () => {
    if (!client || !user) return;

    try {
      const room = await createPersonalRoomAction();
      router.push(`/meeting/${room.id}?personal=true`);
    } catch (error) {
      console.error(error);
      toast({ title: 'Could not start your personal room. Please try again.' });
    }
  };

  const meetingLink = meetingId
    ? `${origin}/meeting/${meetingId}?personal=true`
    : '';

  const copyInvitation = async () => {
    try {
      await navigator.clipboard.writeText(meetingLink);
      toast({ title: 'Invitation link copied' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Could not copy the invitation link' });
    }
  };

  return (
    <section className="flex size-full flex-col gap-10 text-white">
      <h1 className="text-xl font-bold lg:text-3xl">Personal Meeting Room</h1>
      <div className="flex w-full flex-col gap-8 xl:max-w-[900px]">
        <Table title="Topic" description={`${user?.username}'s Meeting Room`} />
        <Table title="Meeting ID" description={meetingId!} />
        <Table title="Invite Link" description={meetingLink} />
      </div>
      <div className="flex gap-5">
        <Button className="bg-blue-1" onClick={startRoom} disabled={!client || !user}>
          Start Meeting
        </Button>
        <Button
          className="bg-dark-3"
          onClick={copyInvitation}
          disabled={!meetingLink}
        >
          Copy Invitation
        </Button>
      </div>
    </section>
  );
};

export default PersonalRoom;
