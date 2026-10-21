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

  if (!serverClient) serverClient = new StreamClient(apiKey, apiSecret);
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
      const nextUserGrants = userGrants.filter(
        (permission) =>
          permission !== 'join-call' &&
          permission !== 'update-call-member' &&
          permission !== 'update-call-permissions',
      );
      const nextMemberGrants = memberGrants.includes('join-call')
        ? memberGrants
        : [...memberGrants, 'join-call'];

      if (
        nextUserGrants.length !== userGrants.length ||
        nextMemberGrants.length !== memberGrants.length
      ) {
        await video.updateCallType('default', {
          grants: {
            ...grants,
            user: nextUserGrants,
            call_member: nextMemberGrants,
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

