'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Settings2, X } from 'lucide-react';
import { useCall, useCallStateHooks } from '@stream-io/video-react-sdk';
import { useUser } from '@clerk/nextjs';

import { sendMeetingChatMessage, setMeetingChatEnabled } from '@/actions/meeting.actions';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';

type MeetingChatMessage = {
  id: string;
  userId: string;
  name: string;
  text: string;
  sentAt: string;
};

type MeetingChatPanelProps = {
  isOpen: boolean;
  isHost: boolean;
  onClose: () => void;
};

const CHAT_EVENT_KIND = 'vaartalav-chat-message';
const MAX_MESSAGE_LENGTH = 1000;

const MeetingChatPanel = ({ isOpen, isHost, onClose }: MeetingChatPanelProps) => {
  const call = useCall();
  const { user } = useUser();
  const { toast } = useToast();
  const { useCallCustomData } = useCallStateHooks();
  const customData = useCallCustomData();
  const chatEnabled = customData.chat_enabled === true;
  const [messages, setMessages] = useState<MeetingChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!call) return;
    return call.on('custom', (event) => {
      const custom = event.custom as Record<string, unknown> | undefined;
      if (
        custom?.kind !== CHAT_EVENT_KIND ||
        typeof custom.text !== 'string' ||
        custom.text.length > MAX_MESSAGE_LENGTH
      ) return;

      const message: MeetingChatMessage = {
        id: typeof custom.message_id === 'string' ? custom.message_id : `${event.created_at}-${event.user.id}`,
        userId: typeof custom.sender_id === 'string' ? custom.sender_id : event.user.id,
        name: typeof custom.sender_name === 'string' ? custom.sender_name : event.user.name || event.user.id,
        text: custom.text,
        sentAt: event.created_at,
      };
      setMessages((current) =>
        current.some((item) => item.id === message.id)
          ? current
          : [...current.slice(-99), message],
      );
    });
  }, [call]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isOpen]);

  const toggleChat = async () => {
    if (!call || !isHost || isUpdating) return;
    setIsUpdating(true);
    try {
      await setMeetingChatEnabled(call.id, !chatEnabled);
      toast({ title: chatEnabled ? 'Meeting chat disabled' : 'Meeting chat enabled' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Could not update chat settings' });
    } finally {
      setIsUpdating(false);
    }
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!call || !user || !chatEnabled || !text || isSending) return;

    setIsSending(true);
    const messageId = crypto.randomUUID();
    try {
      await sendMeetingChatMessage(call.id, text, messageId);
      setMessages((current) => current.some((message) => message.id === messageId)
        ? current
        : [...current.slice(-99), {
          id: messageId,
          userId: user.id,
          name: user.username || user.fullName || user.id,
          text,
          sentAt: new Date().toISOString(),
        }]);
      setDraft('');
    } catch (error) {
      console.error(error);
      toast({ title: 'Message could not be sent. Try again.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <aside
      aria-label="Meeting chat"
      aria-hidden={!isOpen}
      className={`meeting-chat-panel ${isOpen ? 'meeting-chat-panel-open' : ''}`}
    >
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-blue-300" />
          <div>
            <h2 className="text-sm font-semibold text-white">In-call chat</h2>
            <p className="text-xs text-slate-400">
              {chatEnabled ? 'Messages are visible to everyone' : 'Chat is off'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isHost && (
            <Button
              type="button"
              size="sm"
              disabled={isUpdating}
              onClick={toggleChat}
              className="h-8 gap-1.5 bg-white/10 px-2.5 text-xs text-white hover:bg-white/15"
            >
              <Settings2 size={14} /> {chatEnabled ? 'Disable' : 'Enable'}
            </Button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <X size={17} />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
        {!chatEnabled ? (
          <div className="m-auto max-w-xs text-center">
            <MessageCircle className="mx-auto mb-3 text-slate-500" size={30} />
            <p className="text-sm font-medium text-slate-200">Chat is disabled</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {isHost ? 'Enable chat when you are ready for participants to message.' : 'The host can enable chat for everyone.'}
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="m-auto max-w-xs text-center text-sm text-slate-400">
            No messages yet. Start the conversation.
          </div>
        ) : messages.map((message) => (
          <article key={message.id} className="max-w-[92%] self-start">
            <div className="mb-1 flex items-baseline gap-2 px-1">
              <span className="truncate text-xs font-semibold text-slate-200">
                {message.userId === user?.id ? 'You' : message.name}
              </span>
              <time className="shrink-0 text-[10px] text-slate-500">
                {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </time>
            </div>
            <p className="whitespace-pre-wrap break-words rounded-2xl rounded-tl-md bg-white/10 px-3 py-2 text-sm leading-5 text-white">
              {message.text}
            </p>
          </article>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="border-t border-white/10 p-3">
        <label className="sr-only" htmlFor="meeting-chat-message">Message</label>
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/20 p-2 focus-within:border-blue-400/60">
          <textarea
            id="meeting-chat-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            disabled={!chatEnabled || isSending}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={1}
            placeholder={chatEnabled ? 'Write a message…' : 'Chat is disabled'}
            className="max-h-28 min-h-9 flex-1 resize-y bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-slate-500 disabled:cursor-not-allowed"
          />
          <Button
            type="submit"
            disabled={!chatEnabled || !draft.trim() || isSending}
            aria-label="Send message"
            className="size-9 shrink-0 rounded-xl bg-blue-500 p-0 text-white hover:bg-blue-400"
          >
            <Send size={16} />
          </Button>
        </div>
      </form>
    </aside>
  );
};

export default MeetingChatPanel;
