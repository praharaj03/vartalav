'use client';

import { ReactNode, useEffect, useState } from 'react';
import { StreamVideoClient, StreamVideo } from '@stream-io/video-react-sdk';
import { useUser } from '@clerk/nextjs';

import { tokenProvider } from '@/actions/stream.actions';
import Loader from '@/components/Loader';

const API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY;

const StreamVideoProvider = ({ children }: { children: ReactNode }) => {
  const [sessionClient, setSessionClient] = useState<{
    client: StreamVideoClient;
    userId: string;
  }>();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) {
      setSessionClient(undefined);
      return;
    }
    if (!API_KEY) throw new Error('Stream API key is missing');

    const client = new StreamVideoClient({
      apiKey: API_KEY,
      user: {
        id: user?.id,
        name: user?.username || user?.id,
        image: user?.imageUrl,
      },
      tokenProvider,
    });

    setSessionClient({ client, userId: user.id });

    return () => {
      // Tear down the realtime connection when Clerk switches or ends sessions.
      void client.disconnectUser().catch((error) => {
        console.error('Could not disconnect the previous Stream user', error);
      });
    };
  }, [isLoaded, user?.id, user?.username, user?.imageUrl]);

  if (!user || !sessionClient || sessionClient.userId !== user.id) {
    return <Loader label="Connecting to your account" detail="Securing your meeting session." />;
  }

  return <StreamVideo client={sessionClient.client}>{children}</StreamVideo>;
};

export default StreamVideoProvider;
