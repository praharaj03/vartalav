'use server';

import { currentUser } from '@clerk/nextjs/server';
import { ensureAdmissionPermissions, getStreamServerClient } from '@/lib/stream-server';

const getAuthenticatedUser = async () => {
  const user = await currentUser();
  if (!user) throw new Error('Sign in to continue.');
  return user;
};

const getMeetingCall = (id: string) => {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    throw new Error('Invalid meeting code.');
  }
  return getStreamServerClient().video.call('default', id);
};

const loadMeetingMembers = async (id: string) => {
  const call = getMeetingCall(id);
  const [meeting, membershipResult] = await Promise.all([
    call.get(),
    call.queryMembers({ limit: 100 }),
  ]);
  return { call, meeting, members: membershipResult.members };
};

const ensureCreatorIsHost = async (
  id: string,
  creatorId: string,
  members: Array<{ user_id: string; role?: string }>,
) => {
  const creatorMembership = members.find((member) => member.user_id === creatorId);
  if (creatorMembership?.role !== 'host') {
    await getMeetingCall(id).updateCallMembers({
      update_members: [{ user_id: creatorId, role: 'host' }],
    });
  }
};

const admissionStatus = (member?: {
  custom?: object;
  role?: string;
}) =>
  (member?.custom as { admission_status?: string } | undefined)
    ?.admission_status;

export async function createMeeting(input: {
  startsAt?: string;
  description?: string;
}) {
  const user = await getAuthenticatedUser();
  await ensureAdmissionPermissions();

  const startsAt = input.startsAt ? new Date(input.startsAt) : new Date();
  if (Number.isNaN(startsAt.getTime())) throw new Error('Invalid meeting time.');
  if (input.startsAt && startsAt.getTime() <= Date.now()) {
    throw new Error('Choose a meeting time in the future.');
  }

  const description =
    input.description?.trim().slice(0, 160) ||
    (input.startsAt ? 'Scheduled Meeting' : 'Instant Meeting');
  const id = crypto.randomUUID();
  await getStreamServerClient().video.call('default', id).getOrCreate({
    data: {
      created_by: {
        id: user.id,
        name: user.username || user.fullName || user.id,
        image: user.imageUrl,
      },
      members: [{ user_id: user.id, role: 'host' }],
      starts_at: startsAt.toISOString(),
      custom: { description },
    },
  });

  return { id, description, startsAt: startsAt.toISOString() };
}

export async function createPersonalRoom() {
  const user = await getAuthenticatedUser();
  await ensureAdmissionPermissions();

  const id = user.id;
  const { call, meeting } = await loadMeetingMembers(id).catch(async () => {
    const createdCall = getMeetingCall(id);
    await createdCall.getOrCreate({
      data: {
        created_by: {
          id: user.id,
          name: user.username || user.fullName || user.id,
          image: user.imageUrl,
        },
        members: [{ user_id: user.id, role: 'host' }],
        starts_at: new Date().toISOString(),
        custom: { description: `${user.username || 'Personal'}'s Meeting Room` },
      },
    });
    const [loadedCall, loadedMeeting] = await Promise.all([
      Promise.resolve(createdCall),
      createdCall.get(),
    ]);
    return { call: loadedCall, meeting: loadedMeeting, members: [] };
  });

  if (meeting.call.created_by.id !== user.id) {
    throw new Error('This personal room belongs to another account.');
  }
  await call.updateCallMembers({
    update_members: [{ user_id: user.id, role: 'host' }],
  });

  return { id };
}

export async function getMeetingAdmission(id: string) {
  const user = await getAuthenticatedUser();
  await ensureAdmissionPermissions();
  const { call, meeting, members } = await loadMeetingMembers(id);

  await ensureCreatorIsHost(id, meeting.call.created_by.id, members);
  const currentMember = members.find((member) => member.user_id === user.id);
  const isHost =
    user.id === meeting.call.created_by.id ||
    currentMember?.role === 'host' ||
    currentMember?.role === 'admin';

  if (isHost) {
    const waitingParticipants = members
      .filter((member) => admissionStatus(member) === 'waiting')
      .map((member) => ({
        id: member.user_id,
        name: member.user?.name || member.user_id,
      }));
    return { isHost: true, status: 'host' as const, waitingParticipants };
  }

  const status = admissionStatus(currentMember);
  return {
    isHost: false,
    status:
      status === 'approved' || currentMember?.role === 'call_member'
        ? ('approved' as const)
        : status === 'denied'
          ? ('denied' as const)
          : status === 'waiting'
            ? ('waiting' as const)
            : ('none' as const),
    waitingParticipants: [],
  };
}

export async function requestMeetingAdmission(id: string) {
  const user = await getAuthenticatedUser();
  await ensureAdmissionPermissions();
  const { call, meeting, members } = await loadMeetingMembers(id);

  await ensureCreatorIsHost(id, meeting.call.created_by.id, members);
  if (user.id === meeting.call.created_by.id) return { status: 'host' as const };

  const member = members.find((item) => item.user_id === user.id);
  if (member?.role === 'host' || member?.role === 'admin') {
    return { status: 'host' as const };
  }
  if (member?.role === 'call_member') return { status: 'approved' as const };
  if (admissionStatus(member) === 'waiting') {
    return { status: 'waiting' as const };
  }

  await call.updateCallMembers({
    update_members: [
      {
        user_id: user.id,
        role: 'user',
        custom: {
          admission_status: 'waiting',
          display_name: user.username || user.fullName || user.id,
          image: user.imageUrl,
        },
      },
    ],
  });
  return { status: 'waiting' as const };
}

export async function decideMeetingAdmission(
  id: string,
  participantId: string,
  approve: boolean,
) {
  const user = await getAuthenticatedUser();
  await ensureAdmissionPermissions();
  const { call, meeting, members } = await loadMeetingMembers(id);

  await ensureCreatorIsHost(id, meeting.call.created_by.id, members);
  const currentMember = members.find((member) => member.user_id === user.id);
  if (
    user.id !== meeting.call.created_by.id &&
    currentMember?.role !== 'host' &&
    currentMember?.role !== 'admin'
  ) {
    throw new Error('Only the meeting host can manage entry requests.');
  }

  const participant = members.find((member) => member.user_id === participantId);
  if (!participant || admissionStatus(participant) !== 'waiting') {
    throw new Error('This entry request is no longer waiting.');
  }

  await call.updateCallMembers({
    update_members: [
      {
        user_id: participantId,
        role: approve ? 'call_member' : 'user',
        custom: {
          ...participant.custom,
          admission_status: approve ? 'approved' : 'denied',
        },
      },
    ],
  });
  return { status: approve ? 'approved' : 'denied' };
}

export async function setMeetingChatEnabled(id: string, enabled: boolean) {
  const user = await getAuthenticatedUser();
  const { call, meeting } = await loadMeetingMembers(id);
  if (meeting.call.created_by.id !== user.id) {
    throw new Error('Only the meeting host can change chat settings.');
  }

  await call.update({
    custom: { ...meeting.call.custom, chat_enabled: enabled },
  });
  return { enabled };
}

export async function sendMeetingChatMessage(id: string, input: string, messageId: string) {
  const user = await getAuthenticatedUser();
  const { call, meeting, members } = await loadMeetingMembers(id);
  if ((meeting.call.custom as Record<string, unknown> | undefined)?.chat_enabled !== true) {
    throw new Error('The host has disabled meeting chat.');
  }

  const member = members.find((item) => item.user_id === user.id);
  const isMeetingHost = meeting.call.created_by.id === user.id;
  if (!isMeetingHost && member?.role !== 'call_member') {
    throw new Error('Only admitted participants can use meeting chat.');
  }

  const text = input.trim();
  if (!text || text.length > 1000) {
    throw new Error('Messages must contain between 1 and 1000 characters.');
  }
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(messageId)) {
    throw new Error('Invalid chat message identifier.');
  }

  await call.sendCustomEvent({
    kind: 'vaartalav-chat-message',
    message_id: messageId,
    sender_id: user.id,
    sender_name: user.username || user.fullName || user.id,
    text,
  });
  return { messageId };
}
