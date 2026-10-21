import 'server-only';

import { StreamClient } from '@stream-io/node-sdk';

let serverClient: StreamClient | undefined;
let admissionPermissionsReady: Promise<void> | undefined;

export const getStreamServerClient = () => {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  const apiSecret = process.env.STREAM_SECRET_KEY;
  if (!apiKey || !apiSecret) {
    throw new Error('Stream server credentials are not configured');
  }

  // The Node SDK defaults to 3 seconds, which is too short for occasional
  // latency spikes while the Stream API is loading call state or permissions.
  if (!serverClient) {
    serverClient = new StreamClient(apiKey, apiSecret, { timeout: 15_000 });
  }
  return serverClient;
};

/**
 * Restrict the default call type so participants only gain join-call after the
 * host admits them as a call_member. Existing call features remain enabled.
 */
export const ensureAdmissionPermissions = async () => {
  if (!admissionPermissionsReady) {
    admissionPermissionsReady = (async () => {
      const video = getStreamServerClient().video;
      const { grants } = await video.getCallType({ name: 'default' });
      const userGrants = grants.user ?? [];
      const memberGrants = grants.call_member ?? [];
      const hostGrants = grants.host ?? [];
      // call_member is the admitted-participant role. Keep normal meeting
      // controls, while reserving moderation and room-wide actions for hosts.
      const hostOnlyGrants = new Set([
        'end-call',
        'update-call',
        'update-call-settings',
        'update-call-member',
        'update-call-permissions',
        'start-record-call',
        'stop-record-call',
        'start-broadcast-call',
        'stop-broadcast-call',
        'mute-users',
        'block-users',
        'pin-for-everyone',
        'remove-call-member',
        'start-transcription-call',
        'stop-transcription-call',
      ]);
      const nextUserGrants = userGrants.filter(
        (permission) => permission !== 'join-call' && !hostOnlyGrants.has(permission),
      );
      const nextMemberGrants = [
        ...memberGrants.filter((permission) => !hostOnlyGrants.has(permission)),
      ];
      if (!nextMemberGrants.includes('join-call')) {
        nextMemberGrants.push('join-call');
      }
      const nextHostGrants = hostGrants.includes('join-call')
        ? hostGrants
        : [...hostGrants, 'join-call'];

      if (
        nextUserGrants.length !== userGrants.length ||
        nextMemberGrants.length !== memberGrants.length ||
        nextHostGrants.length !== hostGrants.length
      ) {
        await video.updateCallType('default', {
          grants: {
            ...grants,
            user: nextUserGrants,
            call_member: nextMemberGrants,
            host: nextHostGrants,
          },
        });
      }
    })().catch((error) => {
      admissionPermissionsReady = undefined;
      throw error;
    });
  }

  await admissionPermissionsReady;
};

