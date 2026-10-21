'use server';

import { currentUser } from '@clerk/nextjs/server';
import { getStreamServerClient } from '@/lib/stream-server';

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_SECRET_KEY;

export const tokenProvider = async () => {
  const user = await currentUser();

  if (!user) throw new Error('User is not authenticated');
  if (!STREAM_API_KEY) throw new Error('Stream API key secret is missing');
  if (!STREAM_API_SECRET) throw new Error('Stream API secret is missing');

  const streamClient = getStreamServerClient();

  // Stream credentials are bearer tokens in the browser. Keep their exposure
  // window short; the SDK calls this provider again as the token expires.
  const now = Math.floor(Date.now() / 1000);
  const expirationTime = now + 5 * 60;
  const issuedAt = now - 30;

  const token = streamClient.createToken(user.id, expirationTime, issuedAt);

  return token;
};
