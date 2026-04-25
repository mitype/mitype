'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import { Avatar } from '../components/Avatar';
import { Coachmark } from '../components/Coachmark';
import { MessagesSkeleton } from '../components/Skeleton';
import { MatchCard } from '../components/MatchCard';
import { GameCard, isGameMessage } from '../components/GameCard';
import { GamePicker } from '../components/GamePicker';
import { UnreadBadge } from '../components/UnreadBadge';
import { useUnreadCounts } from '../lib/useUnreadCounts';
import { toast } from '../lib/toast';
import { sanitizeText } from '../lib/sanitize';

const ICEBREAKERS = [
  // General
  "What song describes your life right now? 🎵",
  "What's your cure for boredom? 😄",
  "What creative project are you most proud of? ✨",
  "If you could master any skill overnight, what would it be? 🔥",
  "What's the best thing that happened to you this week? 🌟",
  "What are you currently obsessed with? 👀",
  "What's your go-to comfort activity? 🛋️",
  "If your life had a soundtrack, what genre would it be? 🎶",
  "What's a hidden talent you have? 🎯",
  "What's the most interesting thing you've learned recently? 🧠",
  "What's your favorite way to spend a Sunday? ☀️",
  "What's something on your bucket list? 🌍",
  "What would your perfect day look like? 💭",
  "What's a passion project you're working on? 🚀",
  "What's the last thing that genuinely excited you? ⚡",
  "Coffee or tea person — and what does your order say about you? ☕",
  "What's a place you've been that changed your perspective? 🗺️",
  "What's something most people don't know about you? 🤫",
  "What kind of creative work do you wish more people appreciated? 🎨",
  "What's your favorite way to recharge after a long day? 🌙",
];

function getRandomIcebreakers(count = 3): string[] {
  const shuffled = [...ICEBREAKERS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function MessagesPage() {
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [profiles, setProfiles] = useState<any>({});
  const [myProfile, setMyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [showIcebreakers, setShowIcebreakers] = useState(false);
  const [showMatchCard, setShowMatchCard] = useState(false);
  const [showGamePicker, setShowGamePicker] = useState(false);
  // Realtime: ids of other participants currently typing.
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const bottomRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  // Per-typing-user timers so a stale "is typing" indicator
  // disappears 3s after the last broadcast.
  const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Throttle outbound typing broadcasts to one per 1.5s while typing.
  const lastTypingSentRef = useRef<number>(0);
  const router = useRouter();
  const { unread, refresh: refreshUnread } = useUnreadCounts(user?.id);

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Check subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .single();

      const isSubscribed = sub?.status === 'active' || sub?.status === 'trialing';
      if (!isSubscribed) {
        router.push('/subscription');
        return;
      }

      // Load my own profile in parallel so the MatchCard has my avatar/username.
      const { data: myRow } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();
      if (myRow) setMyProfile(myRow);

      await loadConversations(user);
      setLoading(false);
    };
    getData();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUserIds]);

  // Show icebreakers when opening a new pending conversation
  useEffect(() => {
    if (
      selectedConvo &&
      selectedConvo.status === 'pending' &&
      selectedConvo.initiated_by === user?.id &&
      messages.length === 0
    ) {
      setIcebreakers(getRandomIcebreakers(3));
      setShowIcebreakers(true);
    } else {
      setShowIcebreakers(false);
    }
  }, [selectedConvo, messages, user]);

  // Deep-link from /profile/[username] — `?user=<id>` auto-selects that
  // person's conversation, and `?prefill=…` pre-loads the compose box (used
  // by the "Reply to a prompt" feature). We strip the params after applying
  // so a refresh doesn't trigger again.
  useEffect(() => {
    if (!user || conversations.length === 0) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const targetUser = params.get('user');
    const prefill = params.get('prefill');
    if (!targetUser && !prefill) return;

    if (targetUser) {
      const target = conversations.find((c: any) =>
        Array.isArray(c.participant_ids) && c.participant_ids.includes(targetUser)
      );
      if (target) {
        void selectConvo(target);
      }
    }
    if (prefill) {
      setNewMessage(prefill);
    }
    // Drop the params so a refresh / back-nav doesn't re-trigger.
    router.replace('/messages', { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, conversations]);

  async function loadConversations(u: any) {
    const { data: convos } = await supabase
      .from('conversations')
      .select('*')
      .contains('participant_ids', [u.id])
      .order('updated_at', { ascending: false });

    setConversations(convos ?? []);

    const allIds = [...new Set(
      (convos ?? []).flatMap((c: any) => c.participant_ids)
    )].filter((id) => id !== u.id);

    if (allIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', allIds);

      const profileMap: any = {};
      profileData?.forEach((p: any) => {
        profileMap[p.user_id] = p;
      });
      setProfiles(profileMap);
    }
  }

  async function loadMessages(convoId: string) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convoId)
      .order('created_at', { ascending: true });
    setMessages(data ?? []);
    // Mark any of the partner's messages we haven't read yet as read.
    // RLS only lets a non-sender flip these, so this is safe to fire-and-forget.
    if (data && data.length > 0) {
      const me = (await supabase.auth.getUser()).data.user;
      if (me) {
        const unreadIds = data
          .filter((m: any) => m.sender_id !== me.id && !m.read_at)
          .map((m: any) => m.id);
        if (unreadIds.length > 0) {
          await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString(), read: true })
            .in('id', unreadIds);
          // Refresh nav/list badges now that we've cleared this convo's unreads.
          void refreshUnread();
        }
      }
    }
  }

  // Realtime: typing indicators (broadcast) + live message INSERT/UPDATE
  // (postgres_changes). Subscribes per-conversation.
  useEffect(() => {
    if (!selectedConvo || !user) return;
    const convoId = selectedConvo.id;
    const myId = user.id;

    const channel = supabase.channel(`chat:${convoId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        const fromId: string | undefined = payload?.payload?.userId;
        if (!fromId || fromId === myId) return;
        setTypingUserIds((prev) => {
          if (prev.has(fromId)) return prev;
          const next = new Set(prev);
          next.add(fromId);
          return next;
        });
        if (typingTimersRef.current[fromId]) {
          clearTimeout(typingTimersRef.current[fromId]);
        }
        typingTimersRef.current[fromId] = setTimeout(() => {
          setTypingUserIds((prev) => {
            if (!prev.has(fromId)) return prev;
            const next = new Set(prev);
            next.delete(fromId);
            return next;
          });
          delete typingTimersRef.current[fromId];
        }, 3000);
      })
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convoId}`,
        },
        (payload: any) => {
          const newMsg = payload.new;
          if (!newMsg) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Partner's typing should clear once their message arrives.
          if (newMsg.sender_id !== myId) {
            setTypingUserIds((prev) => {
              if (!prev.has(newMsg.sender_id)) return prev;
              const next = new Set(prev);
              next.delete(newMsg.sender_id);
              return next;
            });
            if (typingTimersRef.current[newMsg.sender_id]) {
              clearTimeout(typingTimersRef.current[newMsg.sender_id]);
              delete typingTimersRef.current[newMsg.sender_id];
            }
            // Mark as read since the conversation is open. We then refresh
            // unread counts so the badge in the nav stays in sync.
            if (!newMsg.read_at) {
              void supabase
                .from('messages')
                .update({ read_at: new Date().toISOString(), read: true })
                .eq('id', newMsg.id)
                .then(() => { void refreshUnread(); });
            } else {
              void refreshUnread();
            }
          }
        },
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convoId}`,
        },
        (payload: any) => {
          const updated = payload.new;
          if (!updated) return;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      Object.values(typingTimersRef.current).forEach(clearTimeout);
      typingTimersRef.current = {};
      setTypingUserIds(new Set());
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [selectedConvo?.id, user?.id]);

  function handleNewMessageChange(value: string) {
    setNewMessage(value);
    // Broadcast a typing event no more than once per 1.5s while typing.
    if (!channelRef.current || !user) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    void channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id },
    });
  }

  async function selectConvo(convo: any) {
    setSelectedConvo(convo);
    await loadMessages(convo.id);
  }

  function useIcebreaker(text: string) {
    setNewMessage(text);
    setShowIcebreakers(false);
  }

  function refreshIcebreakers() {
    setIcebreakers(getRandomIcebreakers(3));
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedConvo || !user) return;

    if (selectedConvo.status === 'pending') {
      const myMessages = messages.filter((m) => m.sender_id === user.id);
      if (myMessages.length >= 1) {
        toast.info('Wait for the recipient to approve your request before sending more messages.');
        return;
      }
    }

    setSending(true);
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: selectedConvo.id,
        sender_id: user.id,
        content: newMessage.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      setMessages((prev) => [...prev, data]);
      setNewMessage('');
      setShowIcebreakers(false);
    }
    setSending(false);
  }

  /**
   * Send an already-formatted message (bypasses the input box).
   * Used by mini-game flow, where the payload is a JSON blob, not free text.
   */
  async function sendRawMessage(content: string) {
    if (!content || !selectedConvo || !user) return;

    if (selectedConvo.status === 'pending') {
      const myMessages = messages.filter((m) => m.sender_id === user.id);
      if (myMessages.length >= 1) {
        toast.info('Wait for the recipient to approve your request before sending more messages.');
        return;
      }
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: selectedConvo.id,
        sender_id: user.id,
        content,
      })
      .select()
      .single();

    if (!error && data) {
      setMessages((prev) => [...prev, data]);
    } else if (error) {
      toast.error("Couldn't send. Try again.");
    }
  }

  async function respondToRequest(status: 'approved' | 'denied') {
    if (!selectedConvo) return;
    const { error } = await supabase
      .from('conversations')
      .update({ status })
      .eq('id', selectedConvo.id);

    if (!error) {
      setSelectedConvo({ ...selectedConvo, status });
      setConversations((prev) =>
        prev.map((c) => c.id === selectedConvo.id ? { ...c, status } : c)
      );
    }
  }

  function getOtherUser(convo: any) {
    const otherId = convo.participant_ids.find((id: string) => id !== user?.id);
    return profiles[otherId];
  }

  function timeAgo(dateString: string) {
    const date = new Date(dateString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  if (loading) return <MessagesSkeleton />;

  const pending = conversations.filter(
    (c) => c.status === 'pending' && c.initiated_by !== user?.id
  );
  const approved = conversations.filter((c) => c.status === 'approved');
  const sent = conversations.filter(
    (c) => c.status === 'pending' && c.initiated_by === user?.id
  );

  return (
    <main style={{
      height: '100vh',
      background: '#faf6f0',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>

      <Coachmark storageKey="mitype-coachmark-messages-v1" title="Your inbox">
        New connection requests show up here. Tap a request to approve or
        decline — once approved, you can chat freely and even start
        <strong> mini-games</strong> together.
      </Coachmark>

      {/* Nav */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 32px',
        borderBottom: '1px solid rgba(200,149,108,0.15)',
        background: 'rgba(250,246,240,0.95)',
        backdropFilter: 'blur(10px)',
        flexShrink: 0,
      }}>
        <Link href="/dashboard" style={{
          fontSize: 22,
          fontWeight: 900,
          color: '#c8956c',
          letterSpacing: '-1px',
          textDecoration: 'none',
        }}>
          mitype
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/dashboard" style={{ color: '#8a7560', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Dashboard</Link>
          <Link href="/discover" style={{ color: '#8a7560', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Discover</Link>
          <Link href="/spotlight" style={{ color: '#8a7560', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Spotlight</Link>
          <Link href="/weekly" style={{ color: '#8a7560', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Weekly</Link>
        </div>
      </nav>

      {/* Chat Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <div
          className={`mitype-messages-sidebar${selectedConvo ? ' mitype-messages-sidebar--hidden-mobile' : ''}`}
          style={{
            width: 300,
            borderRight: '1px solid rgba(200,149,108,0.15)',
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: '20px 20px 12px' }}>
            <h1 style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#1a1208',
              letterSpacing: '-0.5px',
            }}>
              Messages
            </h1>
          </div>

          {/* Pending Requests */}
          {pending.length > 0 && (
            <div>
              <p style={{
                padding: '8px 20px 6px',
                fontSize: 11,
                fontWeight: 700,
                color: '#c8956c',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Requests ({pending.length})
              </p>
              {pending.map((convo) => {
                const other = getOtherUser(convo);
                return (
                  <button
                    key={convo.id}
                    onClick={() => selectConvo(convo)}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      background: selectedConvo?.id === convo.id ? '#fff3ec' : 'transparent',
                      border: 'none',
                      borderLeft: selectedConvo?.id === convo.id ? '3px solid #c8956c' : '3px solid transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: '#f0e8df',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}>
                      <Avatar
                        src={other?.avatar_url}
                        alt={other?.username ? `@${other.username}` : 'User'}
                        width={40}
                        height={40}
                        fallbackFontSize={18}
                        sizes="40px"
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1208', marginBottom: 2 }}>
                          @{other?.username ?? 'Unknown'}
                        </p>
                        <p style={{ fontSize: 12, color: '#c8956c', fontWeight: 600 }}>New request</p>
                      </div>
                      <UnreadBadge count={unread.perConvo[convo.id] ?? 0} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Sent Requests */}
          {sent.length > 0 && (
            <div>
              <p style={{
                padding: '8px 20px 6px',
                fontSize: 11,
                fontWeight: 700,
                color: '#a89278',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Sent ({sent.length})
              </p>
              {sent.map((convo) => {
                const other = getOtherUser(convo);
                return (
                  <button
                    key={convo.id}
                    onClick={() => selectConvo(convo)}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      background: selectedConvo?.id === convo.id ? '#fff3ec' : 'transparent',
                      border: 'none',
                      borderLeft: selectedConvo?.id === convo.id ? '3px solid #c8956c' : '3px solid transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: '#f0e8df',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}>
                      <Avatar
                        src={other?.avatar_url}
                        alt={other?.username ? `@${other.username}` : 'User'}
                        width={40}
                        height={40}
                        fallbackFontSize={18}
                        sizes="40px"
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1208', marginBottom: 2 }}>
                          @{other?.username ?? 'Unknown'}
                        </p>
                        <p style={{ fontSize: 12, color: '#a89278' }}>Pending approval</p>
                      </div>
                      <UnreadBadge count={unread.perConvo[convo.id] ?? 0} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Approved Conversations */}
          {approved.length > 0 && (
            <div>
              <p style={{
                padding: '8px 20px 6px',
                fontSize: 11,
                fontWeight: 700,
                color: '#a89278',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Conversations ({approved.length})
              </p>
              {approved.map((convo) => {
                const other = getOtherUser(convo);
                return (
                  <button
                    key={convo.id}
                    onClick={() => selectConvo(convo)}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      background: selectedConvo?.id === convo.id ? '#fff3ec' : 'transparent',
                      border: 'none',
                      borderLeft: selectedConvo?.id === convo.id ? '3px solid #c8956c' : '3px solid transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: '#f0e8df',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}>
                      <Avatar
                        src={other?.avatar_url}
                        alt={other?.username ? `@${other.username}` : 'User'}
                        width={40}
                        height={40}
                        fallbackFontSize={18}
                        sizes="40px"
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1208', marginBottom: 2 }}>
                          @{other?.username ?? 'Unknown'}
                        </p>
                        <p style={{ fontSize: 12, color: '#a89278' }}>
                          {timeAgo(convo.updated_at)}
                        </p>
                      </div>
                      <UnreadBadge count={unread.perConvo[convo.id] ?? 0} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {conversations.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
              <p style={{ color: '#a89278', fontSize: 14, lineHeight: 1.6 }}>
                No messages yet. Start by swiping on profiles in Discover!
              </p>
              <Link href="/discover" style={{
                display: 'inline-block',
                marginTop: 16,
                padding: '10px 20px',
                background: '#c8956c',
                color: 'white',
                borderRadius: 100,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 700,
              }}>
                Go to Discover
              </Link>
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div
          className={`mitype-messages-chat${!selectedConvo ? ' mitype-messages-chat--hidden-mobile' : ''}`}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          {selectedConvo ? (
            <>
              {/* Chat Header */}
              <div style={{
                padding: '16px 24px',
                borderBottom: '1px solid rgba(200,149,108,0.15)',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedConvo(null)}
                    aria-label="Back to conversations"
                    className="mitype-messages-back-button"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '4px 8px',
                      fontSize: 22,
                      color: '#c8956c',
                      cursor: 'pointer',
                      marginRight: 4,
                    }}
                  >
                    <span aria-hidden="true">←</span>
                  </button>
                  {/* Tapping the avatar/username opens their profile, which is
                      where Block + Report live. Lets users escape an active
                      conversation safely without digging through settings. */}
                  <Link
                    href={
                      getOtherUser(selectedConvo)?.username
                        ? `/profile/${getOtherUser(selectedConvo).username}`
                        : '/messages'
                    }
                    aria-label={`View profile of @${getOtherUser(selectedConvo)?.username ?? 'user'}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: '#f0e8df',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}>
                      <Avatar
                        src={getOtherUser(selectedConvo)?.avatar_url}
                        alt={
                          getOtherUser(selectedConvo)?.username
                            ? `@${getOtherUser(selectedConvo).username}`
                            : 'User'
                        }
                        width={40}
                        height={40}
                        fallbackFontSize={18}
                        sizes="40px"
                      />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, color: '#1a1208', fontSize: 15 }}>
                        @{getOtherUser(selectedConvo)?.username ?? 'Unknown'}
                      </p>
                      <p style={{ fontSize: 12, color: '#a89278' }}>
                        {selectedConvo.status === 'pending' ? '⏳ Pending approval' : 'Tap to view profile'}
                      </p>
                    </div>
                  </Link>
                </div>

                {/* Match card button — only after the match is approved. */}
                {selectedConvo.status === 'approved' && (
                  <button
                    type="button"
                    onClick={() => setShowMatchCard(true)}
                    aria-label="Show match card"
                    title="View match card"
                    style={{
                      padding: '8px 14px',
                      background: 'rgba(200,149,108,0.1)',
                      border: '1px solid rgba(200,149,108,0.25)',
                      borderRadius: 100,
                      color: '#c8956c',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span aria-hidden="true">✨</span> Match
                  </button>
                )}

                {selectedConvo.status === 'pending' &&
                  selectedConvo.initiated_by !== user?.id && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => respondToRequest('denied')}
                      aria-label="Decline message request"
                      style={{
                        padding: '8px 18px',
                        background: '#fff0f0',
                        border: '1px solid rgba(220,100,100,0.2)',
                        borderRadius: 100,
                        color: '#c07070',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => respondToRequest('approved')}
                      aria-label="Approve message request"
                      style={{
                        padding: '8px 18px',
                        background: '#c8956c',
                        border: 'none',
                        borderRadius: 100,
                        color: 'white',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Approve <span aria-hidden="true">✓</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                background: '#faf6f0',
              }}>

                {/* Icebreaker Suggestions */}
                {showIcebreakers && messages.length === 0 && (
                  <div style={{
                    background: 'white',
                    border: '1px solid rgba(200,149,108,0.2)',
                    borderRadius: 20,
                    padding: '20px',
                    marginBottom: 8,
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 14,
                    }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1208', marginBottom: 2 }}>
                          ❄️ Need an icebreaker?
                        </p>
                        <p style={{ fontSize: 12, color: '#a89278' }}>
                          Pick a prompt or write your own message below
                        </p>
                      </div>
                      <button
                        onClick={refreshIcebreakers}
                        aria-label="Refresh icebreaker suggestions"
                        style={{
                          padding: '6px 14px',
                          background: 'transparent',
                          border: '1px solid rgba(200,149,108,0.3)',
                          borderRadius: 100,
                          color: '#c8956c',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        <span aria-hidden="true">🔄</span> New ideas
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {icebreakers.map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => useIcebreaker(prompt)}
                          style={{
                            padding: '12px 16px',
                            background: '#faf6f0',
                            border: '1px solid rgba(200,149,108,0.2)',
                            borderRadius: 12,
                            color: '#6b5744',
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: 'pointer',
                            textAlign: 'left',
                            lineHeight: 1.5,
                            transition: 'all 0.15s',
                          }}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setShowIcebreakers(false)}
                      aria-label="Dismiss icebreaker suggestions"
                      style={{
                        marginTop: 12,
                        padding: '6px 0',
                        background: 'transparent',
                        border: 'none',
                        color: '#a89278',
                        fontSize: 12,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      No thanks, I'll write my own
                    </button>
                  </div>
                )}

                {messages.length === 0 && !showIcebreakers && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#a89278' }}>
                    <p style={{ fontSize: 14 }}>
                      {selectedConvo.status === 'pending' && selectedConvo.initiated_by === user?.id
                        ? 'Send your first message to start the conversation!'
                        : selectedConvo.status === 'pending'
                        ? 'This person wants to connect with you. Approve or decline above.'
                        : 'Say hello! 👋'}
                    </p>
                  </div>
                )}

                {/* "Read" indicator is shown only on my most recent
                    message that the partner has read. */}
                {messages.map((msg, idx, arr) => {
                  const isMine = msg.sender_id === user?.id;
                  const isGame = isGameMessage(msg.content);
                  // Walk back from the end, but only on the iteration where
                  // it could matter (the current msg is mine).
                  let isMyLast = false;
                  if (isMine) {
                    isMyLast = true;
                    for (let i = idx + 1; i < arr.length; i++) {
                      if (arr[i].sender_id === user?.id) { isMyLast = false; break; }
                    }
                  }
                  const showReadReceipt = isMyLast && !!msg.read_at;
                  // A game is "answered" when the very next message is a
                  // game-reply — we don't need to match by id because the
                  // reply is always the immediately-following message in
                  // this simple flow.
                  const next = messages[idx + 1];
                  const answered = isGame && !!next && isGameMessage(next.content) &&
                    (next.content.includes('"t":"reply"'));

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: isMine ? 'flex-end' : 'flex-start',
                      }}
                    >
                      {isGame ? (
                        <div style={{ maxWidth: '85%' }}>
                          <GameCard
                            content={msg.content}
                            isOwnMessage={isMine}
                            answered={answered}
                            onReply={(encoded) => sendRawMessage(encoded)}
                          />
                          <p style={{
                            fontSize: 11,
                            margin: '4px 6px 0',
                            opacity: 0.55,
                            color: '#8a7560',
                            textAlign: isMine ? 'right' : 'left',
                          }}>
                            {timeAgo(msg.created_at)}
                            {showReadReceipt && (
                              <span style={{ marginLeft: 6, color: '#16a34a', fontWeight: 600 }}>
                                ✓ Read
                              </span>
                            )}
                          </p>
                        </div>
                      ) : (
                        <div style={{
                          maxWidth: '70%',
                          padding: '12px 16px',
                          borderRadius: isMine
                            ? '18px 18px 4px 18px'
                            : '18px 18px 18px 4px',
                          background: isMine ? '#c8956c' : 'white',
                          color: isMine ? 'white' : '#1a1208',
                          fontSize: 14,
                          lineHeight: 1.5,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        }}>
                          <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {sanitizeText(msg.content)}
                          </p>
                          <p style={{
                            fontSize: 11,
                            margin: '4px 0 0',
                            opacity: 0.6,
                            textAlign: 'right',
                          }}>
                            {timeAgo(msg.created_at)}
                            {showReadReceipt && (
                              <span style={{ marginLeft: 6, fontWeight: 700 }}>
                                ✓ Read
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Typing indicator — visible while a partner has sent a
                    typing broadcast within the last 3s. */}
                {typingUserIds.size > 0 && (
                  <div
                    aria-live="polite"
                    style={{ display: 'flex', justifyContent: 'flex-start' }}
                  >
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '18px 18px 18px 4px',
                      background: 'white',
                      color: '#a89278',
                      fontSize: 13,
                      fontStyle: 'italic',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                      <span aria-hidden="true">💬</span>
                      <span>typing…</span>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Message Input */}
              {(selectedConvo.status === 'approved' ||
                (selectedConvo.status === 'pending' &&
                  selectedConvo.initiated_by === user?.id &&
                  messages.filter((m) => m.sender_id === user?.id).length === 0)) && (
                <div style={{
                  padding: '16px 24px',
                  borderTop: '1px solid rgba(200,149,108,0.15)',
                  background: 'white',
                  flexShrink: 0,
                }}>
                  {/* Show icebreaker toggle if hidden */}
                  {!showIcebreakers && messages.length === 0 &&
                    selectedConvo.status === 'pending' &&
                    selectedConvo.initiated_by === user?.id && (
                    <button
                      onClick={() => {
                        setIcebreakers(getRandomIcebreakers(3));
                        setShowIcebreakers(true);
                      }}
                      aria-label="Show icebreaker suggestions"
                      style={{
                        marginBottom: 10,
                        padding: '6px 16px',
                        background: 'rgba(200,149,108,0.1)',
                        border: '1px solid rgba(200,149,108,0.2)',
                        borderRadius: 100,
                        color: '#c8956c',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <span aria-hidden="true">❄️</span> Show icebreaker ideas
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    {/* Mini-game launcher — only when the chat is fully
                        approved, since pending senders are rate-limited
                        to one message until approved. */}
                    {selectedConvo.status === 'approved' && (
                      <button
                        type="button"
                        onClick={() => setShowGamePicker(true)}
                        aria-label="Send a mini-game"
                        title="Send a mini-game"
                        style={{
                          width: 44,
                          height: 44,
                          flexShrink: 0,
                          background: 'rgba(200,149,108,0.1)',
                          border: '1px solid rgba(200,149,108,0.25)',
                          borderRadius: '50%',
                          color: '#c8956c',
                          fontSize: 20,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span aria-hidden="true">🎮</span>
                      </button>
                    )}
                    <input
                      type="text"
                      placeholder={
                        selectedConvo.status === 'pending'
                          ? 'Send your first message...'
                          : 'Type a message...'
                      }
                      value={newMessage}
                      onChange={(e) => handleNewMessageChange(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: 100,
                        border: '1px solid rgba(200,149,108,0.25)',
                        background: '#faf6f0',
                        fontSize: 14,
                        color: '#1a1208',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || !newMessage.trim()}
                      aria-label="Send message"
                      style={{
                        padding: '12px 24px',
                        background: sending || !newMessage.trim() ? '#d4a882' : '#c8956c',
                        color: 'white',
                        border: 'none',
                        borderRadius: 100,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: sending || !newMessage.trim() ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}

              {selectedConvo.status === 'pending' &&
                selectedConvo.initiated_by === user?.id &&
                messages.filter((m) => m.sender_id === user?.id).length >= 1 && (
                <div style={{
                  padding: '16px 24px',
                  borderTop: '1px solid rgba(200,149,108,0.15)',
                  background: 'white',
                  textAlign: 'center',
                  color: '#a89278',
                  fontSize: 14,
                  flexShrink: 0,
                }}>
                  ⏳ Waiting for them to approve your request...
                </div>
              )}

              {selectedConvo.status === 'denied' && (
                <div style={{
                  padding: '16px 24px',
                  borderTop: '1px solid rgba(200,149,108,0.15)',
                  background: 'white',
                  textAlign: 'center',
                  color: '#c07070',
                  fontSize: 14,
                  flexShrink: 0,
                }}>
                  This request was declined.
                </div>
              )}
            </>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              color: '#a89278',
              gap: 12,
            }}>
              <div style={{ fontSize: 56 }}>💌</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1208' }}>
                Select a conversation
              </h2>
              <p style={{ fontSize: 14 }}>
                Choose someone from the sidebar to start chatting
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Shareable match card modal */}
      {showMatchCard && selectedConvo && myProfile && getOtherUser(selectedConvo) && (
        <MatchCard
          me={{
            username: myProfile.username,
            avatar_url: myProfile.avatar_url,
          }}
          them={{
            username: getOtherUser(selectedConvo).username,
            avatar_url: getOtherUser(selectedConvo).avatar_url,
          }}
          matchedOn={new Date(selectedConvo.created_at)}
          onClose={() => setShowMatchCard(false)}
        />
      )}

      {/* Mini-game composer */}
      <GamePicker
        open={showGamePicker}
        onClose={() => setShowGamePicker(false)}
        onSend={(encoded) => sendRawMessage(encoded)}
      />
    </main>
  );
}