'use client';
import { useState, useEffect, useRef } from 'react';
import { FeatureInfoButton } from '../components/FeatureInfoButton';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { safeUpload } from '../lib/safeUpload';
import { liquidGlass } from '../lib/liquidGlass';
import Link from 'next/link';
import { Avatar } from '../components/Avatar';
import { Coachmark } from '../components/Coachmark';
import { MessagesSkeleton } from '../components/Skeleton';
import { BackButton } from '../components/BackButton';
import { SiteNav } from '../components/SiteNav';
import { FeatureTutorial } from '../components/FeatureTutorial';
import { CreateGroupModal } from '../components/CreateGroupModal';
import { CreateRoomModal } from '../components/CreateRoomModal';
import { ManageRoomModal } from '../components/ManageRoomModal';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { VoiceNotePlayer } from '../components/VoiceNotePlayer';
import { PhotoLightbox } from '../components/PhotoLightbox';
import { GameLobby, type MiniGameKey } from '../components/GameLobby';
import { GameContainer, type GameSession } from '../components/GameContainer';
import type { GameKey } from '../lib/gameCatalog';
import { MatchCard } from '../components/MatchCard';
import { GameCard, isGameMessage } from '../components/GameCard';
import { GamePicker } from '../components/GamePicker';
import { UnreadBadge } from '../components/UnreadBadge';
import { useUnreadCounts } from '../lib/useUnreadCounts';
import { toast } from '../lib/toast';
import { sanitizeText } from '../lib/sanitize';

const ICEBREAKERS = [
  // Creative & craft
  "What creative project are you most proud of? ✨",
  "What's a passion project you're working on? 🚀",
  "What kind of creative work do you wish more people appreciated? 🎨",
  "What's the most underrated craft in your opinion? 🛠️",
  "What's a tool or instrument you couldn't live without? 🎚️",
  "Who's a creator you'd love to collaborate with? 🤝",
  "What's the first creative thing you remember making? 🎀",
  "What's a creative risk you're considering? 🎲",
  "When you're stuck, what helps you get unstuck? 🧗",
  "What does your workspace look like? 🖼️",
  "What's a piece of feedback that changed how you work? 💬",
  "What's a project that scared you to make? 😬",
  "What craft do you secretly want to try? 🤫",
  "What's a small detail in your work that nobody notices but you? 🔍",
  "What part of your process are you most insecure about? 😅",
  "What's a creative trend you're tired of? 🙄",
  "What's a creative trend you secretly love? 💗",
  "What's the best money you've ever spent on your craft? 💸",
  "What's something you wish you'd learned earlier? ⏳",
  "What story behind your work do people not know? 📖",

  // Music & soundtrack
  "What song describes your life right now? 🎵",
  "If your life had a soundtrack, what genre would it be? 🎶",
  "What's a lyric that lives rent-free in your head? 🎤",
  "What's your most-played song from this year? 🎧",
  "What's a song that always gets you moving? 💃",
  "What's a song you used to love that you're embarrassed about now? 🙈",
  "What's the soundtrack to your current chapter? 📀",
  "What concert do you wish you'd seen? 🎸",
  "What song would you put on a first-date playlist? ❤️",
  "What's the song you play when you need a confidence boost? 💪",

  // Curiosity & taste
  "What are you currently obsessed with? 👀",
  "What's the most interesting thing you've learned recently? 🧠",
  "What podcast is teaching you something right now? 🎙️",
  "What book are you in the middle of? 📚",
  "What's a niche topic you'd give a TED talk on? 🎤",
  "What's a documentary that rewired your brain? 🎥",
  "What's a YouTube rabbit hole you fell down? 🕳️",
  "What hobby would you pick up if money were no object? 🎯",
  "What's a controversial opinion you stand by? 🥊",
  "What's the best random fact you know? 🤓",

  // Stories & memory
  "What's the best thing that happened to you this week? 🌟",
  "What's a small thing that made you happy today? 🌼",
  "What's the most spontaneous thing you've ever done? 💥",
  "What's a place that changed your perspective? 🗺️",
  "What's a moment from this year you'd live again? 🔁",
  "What's a story you tell at every dinner party? 🍷",
  "What's the kindest thing a stranger has done for you? 🙏",
  "Tell me about a time you surprised yourself. 🪄",
  "What's a smell that takes you straight back to childhood? 👃",
  "What's the most beautiful place you've ever been? 🏞️",

  // Lifestyle & habits
  "What's your cure for boredom? 😄",
  "What's your go-to comfort activity? 🛋️",
  "What's your favorite way to spend a Sunday? ☀️",
  "What's your favorite way to recharge after a long day? 🌙",
  "What does your perfect Saturday morning look like? ☕",
  "Coffee or tea. And what does your order say about you? ☕",
  "What's your strangest routine? 🌀",
  "What's a guilty pleasure you don't feel guilty about? 🍰",
  "What's the most underrated meal of the day? 🥞",
  "What's your comfort food and what story is attached to it? 🍜",

  // Travel & adventure
  "What's something on your bucket list? 🌍",
  "What's a place you've been that lived up to the hype? 🛫",
  "Where would you go if you had a free flight tomorrow? ✈️",
  "What's the best meal you've had on a trip? 🥘",
  "What's a city you'd move to if you could? 🏙️",
  "What's a road trip you keep meaning to take? 🛣️",
  "What's the most useful travel tip you've learned? 🧳",
  "If you could relive one trip, which one? 🌅",

  // Identity & self
  "What's a hidden talent you have? 🎯",
  "What's something most people don't know about you? 🤫",
  "If you could master any skill overnight, what would it be? 🔥",
  "What would your perfect day look like? 💭",
  "What's the last thing that genuinely excited you? ⚡",
  "What's a compliment that hit hardest? 💌",
  "What's a quality you admire in others but struggle to embody? ✨",
  "What's a way you've grown this year? 🌱",
  "What's a part of yourself you've made peace with? 🕊️",
  "What's a small win you had recently? 🏆",
  "What's something you used to believe and don't anymore? 🔄",
  "What's your love language? 💞",
  "What's a personal rule you live by? 📏",

  // Future / dreaming
  "What's a version of yourself you're growing into? 🌿",
  "What does success look like to you right now? 🎖️",
  "If you weren't doing what you do, what would you be doing? 🪄",
  "What's a dream you've never said out loud? 💫",
  "What would you do with an entirely free month? 📅",
  "What's a long-term goal you're chasing? 🎯",
  "What's a hobby you want to turn into something more? 🛠️",

  // Connection-leaning
  "What makes you instantly click with someone? ⚡",
  "What's a question you wish people asked you more? 🙋",
  "What's a small thing you do that means the world to your friends? 💛",
  "What's your favorite way to spend time with someone you love? 🫶",
  "Who's someone in your life who made you who you are? 🌟",
  "What's a quality you look for in a creative partner? 🤝",

  // Just-for-fun
  "If you were a household appliance, which one and why? 🍞",
  "What fictional character do you relate to too much? 📺",
  "What's the weirdest meal you'd order again? 🍕",
  "What's an irrational fear you have? 👻",
  "What's a small luxury you can't live without? 🛁",
  "What's a useless skill you're proud of? 🪩",
  "What's something you're terrible at but love anyway? 🎳",
];

// AttachmentBubble — renders a chat bubble for a photo or voice-note
// message. When the attachment has expired (cron cleared the URL,
// OR the expires_at has passed) we show an "expired" placeholder.
function AttachmentBubble({
  msg,
  isMine,
  showReadReceipt,
  timeAgo,
}: {
  msg: any;
  isMine: boolean;
  showReadReceipt: boolean;
  timeAgo: string;
}) {
  const expired =
    !msg.attachment_url ||
    (msg.attachment_expires_at && new Date(msg.attachment_expires_at).getTime() <= Date.now());

  return (
    <div style={{
      maxWidth: '70%',
      padding: msg.attachment_type === 'image' ? 6 : '10px 14px',
      borderRadius: isMine
        ? '18px 18px 4px 18px'
        : '18px 18px 18px 4px',
      background: isMine ? 'var(--brand-personal)' : 'white',
      color: isMine ? 'white' : 'var(--brand-text-primary)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      {expired ? (
        <p style={{
          margin: 0,
          padding: '6px 4px',
          fontSize: 13,
          fontStyle: 'italic',
          opacity: 0.75,
        }}>
          {msg.attachment_type === 'image' ? '📷 Photo expired' : '🎤 Voice note expired'}
        </p>
      ) : msg.attachment_type === 'image' ? (
        <PhotoLightbox
          url={msg.attachment_url}
          expiresAt={msg.attachment_expires_at}
        />
      ) : (
        <VoiceNotePlayer
          url={msg.attachment_url}
          durationSeconds={msg.attachment_duration_seconds ?? 0}
          variant={isMine ? 'mine' : 'theirs'}
        />
      )}
      <p style={{
        fontSize: 11,
        margin: '6px 4px 0',
        opacity: 0.6,
        textAlign: 'right',
      }}>
        {timeAgo}
        {showReadReceipt && (
          <span style={{ marginLeft: 6, fontWeight: 700 }}>
            ✓ Read
          </span>
        )}
      </p>
    </div>
  );
}

// LocalStorage key tracking the icebreakers we've recently shown so we
// don't repeat the same suggestions every time. We avoid the last N
// shown — N is roughly 60% of the pool so the user gets meaningful
// variety before any recurrence.
const ICEBREAKER_RECENT_KEY = 'mitype-icebreaker-recent';
const ICEBREAKER_RECENT_MAX = Math.floor(ICEBREAKERS.length * 0.6);

function readRecentIcebreakers(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ICEBREAKER_RECENT_KEY);
    return raw ? JSON.parse(raw) as string[] : [];
  } catch {
    return [];
  }
}

function writeRecentIcebreakers(arr: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ICEBREAKER_RECENT_KEY, JSON.stringify(arr));
  } catch {
    /* ignore quota errors */
  }
}

// Small ⋯ menu button rendered next to each non-game message bubble.
// Tapping opens the delete options inline next to the bubble.
function MessageMenuButton({
  isMine,
  isOpen,
  onToggle,
  canUnsend,
  onUnsend,
  onDeleteForMe,
}: {
  isMine: boolean;
  isOpen: boolean;
  onToggle: () => void;
  canUnsend: boolean;
  onUnsend: () => void;
  onDeleteForMe: () => void;
}) {
  return (
    <div style={{ position: 'relative', alignSelf: 'flex-end' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-label="Message options"
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.06)',
          border: 'none',
          color: 'var(--brand-personal-text-mid)',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
          fontFamily: 'inherit',
          padding: 0,
        }}
      >
        ⋯
      </button>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 4px)',
            [isMine ? 'right' : 'left']: 0,
            background: 'white',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 14,
            padding: 6,
            boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
            zIndex: 30,
            minWidth: 160,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {canUnsend && (
            <button
              type="button"
              onClick={onUnsend}
              style={menuActionBtn('#b91c1c')}
            >
              🚫 Unsend for everyone
            </button>
          )}
          <button
            type="button"
            onClick={onDeleteForMe}
            style={menuActionBtn('var(--brand-personal-text-mid)')}
          >
            🗑️ Delete for me
          </button>
        </div>
      )}
    </div>
  );
}

function menuActionBtn(color: string): React.CSSProperties {
  return {
    background: 'transparent',
    border: 'none',
    color,
    fontSize: 13,
    fontWeight: 700,
    padding: '8px 12px',
    textAlign: 'left',
    borderRadius: 10,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };
}

function getRandomIcebreakers(count = 3): string[] {
  const recent = new Set(readRecentIcebreakers());
  // Pick from prompts NOT in the recent window. If we've exhausted
  // the pool, fall back to the full list so we never return < count.
  let pool = ICEBREAKERS.filter((q) => !recent.has(q));
  if (pool.length < count) pool = [...ICEBREAKERS];
  const shuffled = pool.slice().sort(() => Math.random() - 0.5);
  const picks = shuffled.slice(0, count);
  // Update the recent window — keep it bounded so we don't grow forever.
  const updated = [...picks, ...readRecentIcebreakers()].slice(0, ICEBREAKER_RECENT_MAX);
  writeRecentIcebreakers(updated);
  return picks;
}

export default function MessagesPage() {
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  // Small Business Saves — populated alongside conversations so the
  // purple "Small Business Saves" tab can render counts and rows
  // without an extra round-trip.
  const [businessSaves, setBusinessSaves] = useState<any[]>([]);
  const [showBusinessSaves, setShowBusinessSaves] = useState(false);
  // "New group" modal — opens from the "+" button in the sidebar header.
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  // "New room" modal — opens from the same area, separate trigger.
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  // "Manage room/group" modal — opens by tapping the title in a group
  // or room chat header.
  const [showManageRoom, setShowManageRoom] = useState(false);
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
  // Which message currently has its ⋯ delete-options menu open.
  const [openMsgMenuId, setOpenMsgMenuId] = useState<string | null>(null);
  // Game lobby + active game session state.
  const [showGameLobby, setShowGameLobby] = useState(false);
  const [activeGame, setActiveGame] = useState<GameSession | null>(null);
  // When set, the GamePicker opens straight into this mini-game composer
  // (used by the lobby's "Quick mini-games" section).
  const [gamePickerInitialStep, setGamePickerInitialStep] = useState<'ttl' | 'wyr' | 'emoji' | undefined>(undefined);
  // Conversations silent for >30 days collapse behind a toggle so the inbox
  // doesn't feel like a graveyard. Unread chats are never hidden — even if
  // their updated_at is old, an unread message from the partner pulls them
  // back into the active list.
  const [showStale, setShowStale] = useState(false);
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
  // person's conversation, `?convo=<id>` auto-selects a specific
  // conversation by id (used by Discover's Join Room flow), and
  // `?prefill=…` pre-loads the compose box (used by the "Reply to a
  // prompt" feature). We strip the params after applying so a refresh
  // doesn't trigger again.
  useEffect(() => {
    if (!user || conversations.length === 0) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const targetUser = params.get('user');
    const targetConvo = params.get('convo');
    const prefill = params.get('prefill');
    if (!targetUser && !targetConvo && !prefill) return;

    if (targetConvo) {
      const target = conversations.find((c: any) => c.id === targetConvo);
      if (target) {
        void selectConvo(target);
      }
    } else if (targetUser) {
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

    // Filter out conversations the current user has hidden from their
    // inbox (via the Delete conversation button). The DB-side trigger
    // clears hidden_for_user_ids the moment a new message arrives, so
    // hidden convos automatically reappear when the other person
    // messages the user again. No polling required.
    const visible = (convos ?? []).filter((c: any) =>
      !((c.hidden_for_user_ids ?? []) as string[]).includes(u.id)
    );
    setConversations(visible);

    // Load Small Business Saves for this user. Joins business_profiles
    // for the basic details, then resolves owner_user_id → username so
    // each row can deep-link straight into /business/[username].
    try {
      const { data: saves } = await supabase
        .from('business_saves')
        .select('id, created_at, business_id, business_profiles(id, business_name, category, logo_url, user_id)')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false });
      if (saves) {
        const ownerIds = Array.from(new Set(
          saves
            .map((s: any) => s.business_profiles?.user_id)
            .filter(Boolean)
        ));
        const { data: ownerProfiles } = ownerIds.length > 0
          ? await supabase
              .from('profiles')
              .select('user_id, username')
              .in('user_id', ownerIds)
          : { data: [] as any[] };
        const ownerMap = new Map<string, string>(
          (ownerProfiles ?? []).map((p: any) => [p.user_id, p.username])
        );
        const enriched = saves
          .filter((s: any) => s.business_profiles)
          .map((s: any) => ({
            id: s.id,
            created_at: s.created_at,
            business: s.business_profiles,
            ownerUsername: ownerMap.get(s.business_profiles.user_id) ?? '',
          }));
        setBusinessSaves(enriched);
      }
    } catch (e) {
      console.warn('[messages] business saves load failed:', e);
    }

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
    // Auto-resume any active or pending game in this conversation so
    // it pops back up if the user reloads or switches conversations.
    //
    // Two cleanup paths for sessions that are NOT going to come back:
    //   1. Stale 'pending'  — older than 10 min with empty state. Likely
    //      a crash mid-launch (we shipped two of these as Rules-of-Hooks
    //      bugs in Hangman and Chess). Auto-deleted on entry.
    //   2. Stale 'active'   — updated_at is older than 24 h. A real
    //      game both players walked away from. Auto-flipped to 'ended'
    //      with reason 'abandoned' so it doesn't keep auto-popping when
    //      either player re-enters the chat days later.
    if (user) {
      const { data: liveGame } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('conversation_id', convo.id)
        .or(`inviter_id.eq.${user.id},invitee_id.eq.${user.id}`)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (liveGame) {
        const now = Date.now();
        const createdAgeMs = now - new Date(liveGame.created_at).getTime();
        const updatedAgeMs = liveGame.updated_at
          ? now - new Date(liveGame.updated_at).getTime()
          : createdAgeMs;
        const hasState = liveGame.state &&
          typeof liveGame.state === 'object' &&
          Object.keys(liveGame.state).length > 0;

        const stalePending = liveGame.status === 'pending'
          && !hasState
          && createdAgeMs > 10 * 60 * 1000;
        const staleActive = liveGame.status === 'active'
          && updatedAgeMs > 24 * 60 * 60 * 1000;

        if (stalePending) {
          // The inviter's RLS policy allows DELETE only for ended
          // sessions, so flip first, then delete in one round-trip.
          await supabase
            .from('game_sessions')
            .update({
              status: 'ended',
              ended_reason: 'abandoned',
              ended_at: new Date().toISOString(),
            })
            .eq('id', liveGame.id);
          await supabase.from('game_sessions').delete().eq('id', liveGame.id);
        } else if (staleActive) {
          // Don't delete a real game's state — flip to 'ended' so it
          // shows up as "abandoned" if anyone goes looking, but don't
          // auto-resume it.
          await supabase
            .from('game_sessions')
            .update({
              status: 'ended',
              ended_reason: 'abandoned',
              ended_at: new Date().toISOString(),
            })
            .eq('id', liveGame.id);
        } else {
          setActiveGame(liveGame as GameSession);
        }
      }
    }
  }

  // Realtime subscription: listen for game sessions in the currently
  // selected conversation so an invite from the partner opens the
  // game on this user's screen automatically.
  useEffect(() => {
    if (!user || !selectedConvo) return;
    const channel = supabase
      .channel(`messages-games-${selectedConvo.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_sessions',
          filter: `conversation_id=eq.${selectedConvo.id}`,
        },
        (payload) => {
          const row = payload.new as GameSession;
          if (!row) return;
          // Only show invites where this user is the invitee — the
          // inviter already gets a local state update.
          if (row.invitee_id === user.id) {
            setActiveGame(row);
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, selectedConvo]);

  async function startNewGame(gameKey: GameKey) {
    if (!user || !selectedConvo) return;
    const partnerId = (selectedConvo.participant_ids ?? []).find(
      (id: string) => id !== user.id
    );
    if (!partnerId) {
      toast.error('Could not find the other player.');
      return;
    }
    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        conversation_id: selectedConvo.id,
        game_type: gameKey,
        status: 'pending',
        inviter_id: user.id,
        invitee_id: partnerId,
        state: {},
      })
      .select('*')
      .single();
    if (error) {
      console.error('[messages] start game error:', error);
      toast.error('Could not start the game.');
      return;
    }
    if (data) {
      setActiveGame(data as GameSession);
      setShowGameLobby(false);
    }
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

  // Attachments — photos and voice notes. Every attachment is uploaded
  // to the message-media bucket under <conversation_id>/<unique-name>
  // and expires 24 hours after sending. The hourly cron at
  // /api/cron/message-media-cleanup deletes the storage file and clears
  // the URL once expired.
  const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
  const ATTACHMENT_TTL_MS = 24 * 60 * 60 * 1000;

  async function uploadAndSendAttachment(
    blob: Blob,
    kind: 'image' | 'voice',
    ext: string,
    durationSeconds?: number
  ) {
    if (!selectedConvo || !user) return;
    if (blob.size > MAX_ATTACHMENT_BYTES) {
      toast.error('Attachment must be under 25 MB.');
      return;
    }
    if (selectedConvo.status === 'pending') {
      const myMessages = messages.filter((m) => m.sender_id === user.id);
      if (myMessages.length >= 1) {
        toast.info('Wait for the recipient to approve your request before sending more messages.');
        return;
      }
    }

    setSending(true);
    try {
      // <conversation_id>/<random-name>.<ext>
      const rand = Math.random().toString(36).slice(2, 9);
      const path = `${selectedConvo.id}/${Date.now()}-${rand}.${ext}`;
      // Route through safeUpload so image/audio MIME types get
      // normalized (codec suffixes stripped, extension fallbacks) —
      // no more surprise 400s from bucket-level MIME checks.
      try {
        await safeUpload(blob, {
          bucket: 'message-media',
          path,
          kind: kind === 'image' ? 'image' : 'audio',
          filename: `attachment.${ext}`,
        });
      } catch (upErr: any) {
        console.error('[messages] attachment upload error:', upErr);
        toast.error(upErr?.message ?? "Couldn't upload that. Try again.");
        return;
      }
      // Private bucket → signed URL valid for the full 24h lifetime.
      const { data: signed } = await supabase.storage
        .from('message-media')
        .createSignedUrl(path, 24 * 60 * 60);
      const url = signed?.signedUrl ?? null;
      const expiresAt = new Date(Date.now() + ATTACHMENT_TTL_MS).toISOString();

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConvo.id,
          sender_id: user.id,
          content: kind === 'image' ? '📷 Photo' : '🎤 Voice note',
          attachment_type: kind,
          attachment_url: url,
          attachment_storage_path: path,
          attachment_duration_seconds: durationSeconds ?? null,
          attachment_expires_at: expiresAt,
        })
        .select()
        .single();

      if (!error && data) {
        setMessages((prev) => [...prev, data]);
      } else if (error) {
        console.error('[messages] insert error:', error);
        toast.error("Couldn't send. Try again.");
      }
    } finally {
      setSending(false);
    }
  }

  // Re-encodes an arbitrary image (HEIC from iPhones, PNG, WebP, etc.)
  // as a normalized JPEG via canvas. This guarantees the recipient can
  // view it on any browser. Falls back to the original blob if the
  // image can't be decoded (e.g. raw HEIC on a non-Safari browser).
  async function normalizeImage(file: File): Promise<{ blob: Blob; ext: string }> {
    if (file.type === 'image/gif') {
      // Don't re-encode animated GIFs — would lose the animation.
      return { blob: file, ext: 'gif' };
    }
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error('read'));
        r.readAsDataURL(file);
      });
      const img: HTMLImageElement = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('decode'));
        i.src = dataUrl;
      });
      // Cap longest dimension at 2400px for sane file size.
      const cap = 2400;
      const scale = Math.min(1, cap / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');
      ctx.drawImage(img, 0, 0, w, h);
      const out: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob')), 'image/jpeg', 0.9);
      });
      return { blob: out, ext: 'jpg' };
    } catch {
      // Re-encoding failed — best effort, send the original.
      const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
      return { blob: file, ext };
    }
  }

  async function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/') && !/\.heic$/i.test(f.name)) {
      toast.error('Pick an image file.');
      return;
    }
    const { blob, ext } = await normalizeImage(f);
    await uploadAndSendAttachment(blob, 'image', ext);
  }

  async function handleVoiceSend(blob: Blob, durationSeconds: number) {
    const ext = (blob.type.includes('mp4') || blob.type.includes('aac')) ? 'm4a'
              : (blob.type.includes('ogg')) ? 'ogg'
              : 'webm';
    await uploadAndSendAttachment(blob, 'voice', ext, durationSeconds);
  }

  // Deletion helpers. We use a per-user "hidden_for_user_ids" array on
  // each message for soft delete-for-me, and `deleted_for_everyone` for
  // sender-initiated unsends within a 1-hour window.
  const UNSEND_WINDOW_MS = 60 * 60 * 1000;

  function isHiddenForMe(m: any): boolean {
    if (!user) return false;
    const arr = (m.hidden_for_user_ids ?? []) as string[];
    return arr.includes(user.id);
  }

  function canUnsend(m: any): boolean {
    if (!user || m.sender_id !== user.id) return false;
    if (m.deleted_for_everyone) return false;
    const age = Date.now() - new Date(m.created_at).getTime();
    return age <= UNSEND_WINDOW_MS;
  }

  async function handleDeleteForMe(m: any) {
    if (!user) return;
    const arr = (m.hidden_for_user_ids ?? []) as string[];
    if (arr.includes(user.id)) return;
    const next = [...arr, user.id];
    // Optimistic UI: hide immediately.
    setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, hidden_for_user_ids: next } : x));
    // Update + read back the row so we can verify the column exists
    // and the write actually persisted (RLS could silently 0-row this
    // otherwise, and a missing column raises a clean error).
    const { data, error } = await supabase
      .from('messages')
      .update({ hidden_for_user_ids: next })
      .eq('id', m.id)
      .select('id, hidden_for_user_ids')
      .single();
    if (error) {
      console.error('[messages] delete-for-me error:', error);
      // If the column is missing, the error message will mention
      // hidden_for_user_ids — surface that clearly so it's obvious
      // the message-delete SQL migration hasn't been run yet.
      const msg = /hidden_for_user_ids/i.test(error.message ?? '')
        ? 'Run the message-delete SQL migration in Supabase first.'
        : 'Could not delete message.';
      toast.error(msg);
      setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, hidden_for_user_ids: arr } : x));
      return;
    }
    // Server confirmed but the array doesn't include us → RLS blocked.
    if (data && !(data.hidden_for_user_ids ?? []).includes(user.id)) {
      console.error('[messages] delete-for-me blocked by RLS:', data);
      toast.error('Could not delete (permission denied).');
      setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, hidden_for_user_ids: arr } : x));
    }
  }

  async function handleUnsend(m: any) {
    if (!canUnsend(m)) return;
    if (!confirm('Unsend this message? It will be removed for everyone in this chat.')) return;
    // Optimistic UI: mark deleted, clear content + attachment locally.
    setMessages((prev) => prev.map((x) =>
      x.id === m.id
        ? { ...x, deleted_for_everyone: true, content: '', attachment_url: null, attachment_storage_path: null }
        : x
    ));
    const { error } = await supabase
      .from('messages')
      .update({
        deleted_for_everyone: true,
        content: '',
        attachment_url: null,
        attachment_storage_path: null,
      })
      .eq('id', m.id)
      .eq('sender_id', user.id); // belt-and-suspenders, RLS also enforces this
    // Best-effort: also clean up the storage object for attachments.
    if (!error && m.attachment_storage_path) {
      void supabase.storage.from('message-media').remove([m.attachment_storage_path]);
    }
    if (error) {
      console.error('[messages] unsend error:', error);
      toast.error('Could not unsend.');
    }
  }

  async function handleDeleteConversation(convoId: string) {
    if (!user) return;
    if (!confirm('Delete this conversation from your inbox? It will come back only if the other person sends a new message.')) return;

    // 1. Hide every existing message in this convo for me — belt so
    //    if the convo somehow reappears the old messages don't come
    //    back with it.
    const { data: ids } = await supabase
      .from('messages')
      .select('id, hidden_for_user_ids')
      .eq('conversation_id', convoId);
    if (ids && ids.length > 0) {
      await Promise.all(ids.map((row: any) => {
        const arr = (row.hidden_for_user_ids ?? []) as string[];
        if (arr.includes(user.id)) return Promise.resolve();
        return supabase
          .from('messages')
          .update({ hidden_for_user_ids: [...arr, user.id] })
          .eq('id', row.id);
      }));
    }

    // 2. Hide the CONVERSATION itself for me — this is what removes
    //    the sidebar row (the other person's avatar + name). Without
    //    this step the convo row lingered even after we hid every
    //    message inside it. The DB trigger clears this flag if the
    //    other person sends anything new, so the convo reappears.
    const { data: convoRow } = await supabase
      .from('conversations')
      .select('hidden_for_user_ids')
      .eq('id', convoId)
      .maybeSingle();
    const currentHidden = (convoRow?.hidden_for_user_ids ?? []) as string[];
    if (!currentHidden.includes(user.id)) {
      await supabase
        .from('conversations')
        .update({ hidden_for_user_ids: [...currentHidden, user.id] })
        .eq('id', convoId);
    }

    // 3. Update local state — remove the row from the sidebar list
    //    immediately, clear the open chat if this is the one selected.
    setConversations((prev) => prev.filter((c: any) => c.id !== convoId));
    setMessages([]);
    if (selectedConvo?.id === convoId) setSelectedConvo(null);
    toast.success('Conversation removed from your inbox.');
  }

  // Cancel a pending message request I sent. Deletes the conversation
  // entirely (messages cascade via FK) so the request disappears from
  // both my "Sent" list and the recipient's "Requests" list — as if I
  // never sent it. Guarded by the RLS policy that only allows DELETE
  // on conversations where initiated_by = me AND status = 'pending'.
  async function handleCancelPendingRequest(convoId: string) {
    if (!user) return;
    if (!confirm('Cancel this pending request? It will be removed from your Sent list and the other person will no longer see it.')) return;
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', convoId)
      .eq('initiated_by', user.id)
      .eq('status', 'pending');
    if (error) {
      console.error('[messages] cancel pending error:', error);
      toast.error("Couldn't cancel that request. Try again.");
      return;
    }
    setConversations((prev) => prev.filter((c: any) => c.id !== convoId));
    if (selectedConvo?.id === convoId) {
      setSelectedConvo(null);
      setMessages([]);
    }
    toast.success('Request canceled.');
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

  // For groups + rooms — return all participant profiles other than the
  // current user, in stable order. Missing profiles are dropped (they'll
  // appear once `loadConversations` resolves them).
  function getGroupMembers(convo: any) {
    return (convo.participant_ids as string[])
      .filter((id) => id !== user?.id)
      .map((id) => profiles[id])
      .filter(Boolean);
  }

  // The display name + subtitle shown in the sidebar row and chat header.
  // Groups/rooms use the stored title; DMs fall back to the partner's
  // @handle so we don't change behavior for existing conversations.
  function getConvoDisplay(convo: any): {
    title: string;
    subtitle: string | null;
    isGroup: boolean;
    other?: any;
  } {
    if (convo.kind === 'group') {
      return {
        title: convo.title || 'Group chat',
        subtitle: `${convo.participant_ids.length} member${convo.participant_ids.length === 1 ? '' : 's'}`,
        isGroup: true,
      };
    }
    if (convo.kind === 'room') {
      return {
        title: convo.title || 'Room',
        subtitle: `${convo.participant_ids.length} member${convo.participant_ids.length === 1 ? '' : 's'}`,
        isGroup: true,
      };
    }
    const other = getOtherUser(convo);
    return {
      title: other?.username ? `@${other.username}` : 'Conversation',
      subtitle: null,
      isGroup: false,
      other,
    };
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

  // Split approved into "active" (recent activity OR has unread) and "stale"
  // (silent for 30+ days AND nothing unread). Stale chats collapse behind a
  // toggle so the inbox doesn't feel like a graveyard. We deliberately keep
  // unread chats visible regardless of age — silencing those would be bad UX.
  const STALE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const isStale = (c: any) => {
    if (!c.updated_at) return false;
    if ((unread.perConvo[c.id] ?? 0) > 0) return false;
    return now - new Date(c.updated_at).getTime() >= STALE_THRESHOLD_MS;
  };
  const approvedStale = approved.filter(isStale);
  const approvedActive = approved.filter((c) => !isStale(c));

  return (
    <main style={{
      height: '100vh',
      background: 'var(--brand-personal-bg-cream)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>

      <Coachmark storageKey="mitype-coachmark-messages-v1" title="Your inbox">
        New connection requests show up here. Tap a request to approve or
        decline. Once approved, you can chat freely and even start
        <strong> mini-games</strong> together.
      </Coachmark>

      <SiteNav userId={user?.id} showBack backFallbackHref="/dashboard" />

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
          <div style={{
            padding: '20px 20px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}>
            <h1 style={{
              fontSize: 22,
              fontWeight: 800,
              color: 'var(--brand-text-primary)',
              letterSpacing: '-0.5px',
              margin: 0,
            }}>
              Messages
            </h1>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => setShowCreateGroup(true)}
                aria-label="New group chat"
                title="New group chat"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 11px',
                  background: 'linear-gradient(135deg, var(--brand-personal), var(--brand-personal-light))',
                  border: 'none',
                  borderRadius: 100,
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 12px rgba(200,149,108,0.35)',
                  letterSpacing: '0.3px',
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>+</span>
                Group
              </button>
              <button
                type="button"
                onClick={() => setShowCreateRoom(true)}
                aria-label="New room"
                title="New room"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 11px',
                  background: 'linear-gradient(135deg, var(--brand-business), var(--brand-business-light))',
                  border: 'none',
                  borderRadius: 100,
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 12px rgba(139,92,246,0.4)',
                  letterSpacing: '0.3px',
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>+</span>
                Room
              </button>
            </div>
          </div>

          {/* Small Business Saves — purple to differentiate from
              regular messages. Expandable list of every business this
              user has saved from the Discover or business profile view. */}
          <div style={{ padding: '0 16px 12px' }}>
            <button
              type="button"
              onClick={() => setShowBusinessSaves((v) => !v)}
              style={{
                width: '100%',
                background: showBusinessSaves
                  ? 'linear-gradient(135deg, var(--brand-business) 0%, var(--brand-business-light) 100%)'
                  : 'rgba(139,92,246,0.08)',
                border: showBusinessSaves
                  ? 'none'
                  : '1px solid rgba(139,92,246,0.3)',
                borderRadius: 14,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                color: showBusinessSaves ? 'white' : 'var(--brand-business-deep)',
                fontFamily: 'inherit',
                boxShadow: showBusinessSaves
                  ? '0 8px 22px rgba(139,92,246,0.32)'
                  : 'none',
              }}
            >
              <span style={{ fontSize: 18 }}>🏪</span>
              <span style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 800, letterSpacing: '-0.2px' }}>
                Small Business Saves
                {businessSaves.length > 0 && (
                  <span style={{
                    marginLeft: 6,
                    background: showBusinessSaves ? 'rgba(255,255,255,0.25)' : 'rgba(139,92,246,0.2)',
                    color: showBusinessSaves ? 'white' : 'var(--brand-business-deep)',
                    padding: '1px 7px',
                    borderRadius: 100,
                    fontSize: 11,
                  }}>
                    {businessSaves.length}
                  </span>
                )}
              </span>
              <span aria-hidden="true" style={{ fontSize: 14, fontWeight: 800 }}>
                {showBusinessSaves ? '▲' : '▼'}
              </span>
            </button>

            {showBusinessSaves && (
              <div style={{
                marginTop: 8,
                background: '#fbfaff',
                border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: 14,
                padding: 8,
                maxHeight: 320,
                overflowY: 'auto',
              }}>
                {businessSaves.length === 0 ? (
                  <div style={{ padding: '20px 8px', fontSize: 12, color: 'var(--brand-business-text-mid)', textAlign: 'center', lineHeight: 1.5 }}>
                    No saved businesses yet. Tap the ☆ Save button on any
                    business profile to add it here.
                  </div>
                ) : (
                  businessSaves.map((save) => (
                    <Link
                      key={save.id}
                      href={`/business/${save.ownerUsername}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 8px',
                        borderRadius: 10,
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: save.business.logo_url
                          ? `url(${save.business.logo_url})`
                          : 'linear-gradient(135deg, var(--brand-business), var(--brand-business-light))',
                        backgroundSize: 'cover', backgroundPosition: 'center',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, color: 'white', flexShrink: 0,
                      }}>
                        {!save.business.logo_url && '🏪'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--brand-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {save.business.business_name}
                        </div>
                        {save.business.category && (
                          <div style={{ fontSize: 11, color: 'var(--brand-business-text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {save.business.category}
                          </div>
                        )}
                      </div>
                      <span aria-hidden="true" style={{ color: 'var(--brand-business)', fontWeight: 800, fontSize: 14 }}>→</span>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Pending Requests */}
          {pending.length > 0 && (
            <div>
              <p style={{
                padding: '8px 20px 6px',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--brand-personal)',
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
                      background: selectedConvo?.id === convo.id ? 'var(--brand-personal-bg-peach)' : 'transparent',
                      border: 'none',
                      borderLeft: selectedConvo?.id === convo.id ? '3px solid var(--brand-personal)' : '3px solid transparent',
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
                      background: 'var(--brand-personal-bg-pale)',
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
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand-text-primary)', marginBottom: 2 }}>
                          @{other?.username ?? 'Unknown'}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--brand-personal)', fontWeight: 600 }}>New request</p>
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
                color: 'var(--brand-personal-text-light)',
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
                      background: selectedConvo?.id === convo.id ? 'var(--brand-personal-bg-peach)' : 'transparent',
                      border: 'none',
                      borderLeft: selectedConvo?.id === convo.id ? '3px solid var(--brand-personal)' : '3px solid transparent',
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
                      background: 'var(--brand-personal-bg-pale)',
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
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand-text-primary)', marginBottom: 2 }}>
                          @{other?.username ?? 'Unknown'}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--brand-personal-text-light)' }}>Pending approval</p>
                      </div>
                      <UnreadBadge count={unread.perConvo[convo.id] ?? 0} />
                      {/* Cancel my own pending request. stopPropagation
                          so tapping the × doesn't also open the chat. */}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); void handleCancelPendingRequest(convo.id); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleCancelPendingRequest(convo.id);
                          }
                        }}
                        aria-label={`Cancel pending request to @${other?.username ?? 'user'}`}
                        title="Cancel request"
                        style={{
                          width: 28,
                          height: 28,
                          background: 'rgba(0,0,0,0.04)',
                          borderRadius: '50%',
                          color: 'var(--brand-personal-text-light)',
                          fontSize: 14,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1,
                          flexShrink: 0,
                          userSelect: 'none',
                        }}
                      >
                        ×
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Approved Conversations */}
          {approvedActive.length > 0 && (
            <div>
              <p style={{
                padding: '8px 20px 6px',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--brand-personal-text-light)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Conversations ({approvedActive.length})
              </p>
              {approvedActive.map((convo) => {
                const display = getConvoDisplay(convo);
                const other = display.other;
                return (
                  <div
                    key={convo.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectConvo(convo)}
                    onKeyDown={(e) => { if (e.key === 'Enter') selectConvo(convo); }}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      background: selectedConvo?.id === convo.id ? 'var(--brand-personal-bg-peach)' : 'transparent',
                      borderLeft: selectedConvo?.id === convo.id ? '3px solid var(--brand-personal)' : '3px solid transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      textAlign: 'left',
                      boxSizing: 'border-box',
                    }}
                  >
                    {display.isGroup ? (
                      /* Group/room — show a small avatar stack instead of a single avatar. */
                      (() => {
                        const members = getGroupMembers(convo).slice(0, 3);
                        const stackWidth = 40 + Math.max(0, members.length - 1) * 14;
                        return (
                          <div style={{
                            position: 'relative',
                            width: stackWidth,
                            height: 40,
                            flexShrink: 0,
                          }}>
                            {members.map((m, idx) => (
                              <div
                                key={m.user_id}
                                style={{
                                  position: 'absolute',
                                  left: idx * 14,
                                  width: 28,
                                  height: 28,
                                  borderRadius: '50%',
                                  background: 'var(--brand-personal-bg-pale)',
                                  border: '2px solid white',
                                  overflow: 'hidden',
                                  top: 6,
                                  zIndex: members.length - idx,
                                }}
                              >
                                <Avatar
                                  src={m.avatar_url}
                                  alt={`@${m.username}`}
                                  width={28}
                                  height={28}
                                  fallbackFontSize={12}
                                  sizes="28px"
                                />
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    ) : (
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'var(--brand-personal-bg-pale)',
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
                    )}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          fontSize: 14, fontWeight: 700, color: 'var(--brand-text-primary)', marginBottom: 2,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {display.title}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--brand-personal-text-light)' }}>
                          {display.isGroup
                            ? `${display.subtitle} · ${timeAgo(convo.updated_at)}`
                            : timeAgo(convo.updated_at)}
                        </p>
                      </div>
                      <UnreadBadge count={unread.perConvo[convo.id] ?? 0} />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void handleDeleteConversation(convo.id); }}
                        aria-label={`Delete conversation with @${other?.username ?? 'user'}`}
                        title="Delete conversation"
                        style={{
                          width: 28,
                          height: 28,
                          background: 'rgba(0,0,0,0.04)',
                          border: 'none',
                          borderRadius: '50%',
                          color: 'var(--brand-personal-text-light)',
                          fontSize: 14,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1,
                          fontFamily: 'inherit',
                          flexShrink: 0,
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Stale conversations — silent for 30+ days, no unreads. Hidden
              behind a toggle so the inbox stays clean but the threads aren't
              actually deleted. */}
          {approvedStale.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowStale((s) => !s)}
                style={{
                  width: '100%',
                  padding: '10px 20px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--brand-personal-text-light)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: 'inherit',
                }}
                aria-expanded={showStale}
              >
                <span>Older ({approvedStale.length})</span>
                <span aria-hidden="true" style={{ fontSize: 10 }}>
                  {showStale ? '▾' : '▸'}
                </span>
              </button>
              {showStale &&
                approvedStale.map((convo) => {
                  const other = getOtherUser(convo);
                  return (
                    <button
                      key={convo.id}
                      onClick={() => selectConvo(convo)}
                      style={{
                        width: '100%',
                        padding: '12px 20px',
                        background:
                          selectedConvo?.id === convo.id ? 'var(--brand-personal-bg-peach)' : 'transparent',
                        border: 'none',
                        borderLeft:
                          selectedConvo?.id === convo.id
                            ? '3px solid var(--brand-personal)'
                            : '3px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        textAlign: 'left',
                        opacity: 0.65,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: 'var(--brand-personal-bg-pale)',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        <Avatar
                          src={other?.avatar_url}
                          alt={other?.username ? `@${other.username}` : 'User'}
                          width={40}
                          height={40}
                          fallbackFontSize={18}
                          sizes="40px"
                        />
                      </div>
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: 'var(--brand-text-primary)',
                              marginBottom: 2,
                            }}
                          >
                            @{other?.username ?? 'Unknown'}
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--brand-personal-text-light)' }}>
                            {timeAgo(convo.updated_at)}
                          </p>
                        </div>
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
              <p style={{ color: 'var(--brand-personal-text-light)', fontSize: 14, lineHeight: 1.6 }}>
                No messages yet. Start by connecting with creators in Discover!
              </p>
              <Link href="/discover" style={{
                display: 'inline-block',
                marginTop: 16,
                padding: '10px 20px',
                background: 'var(--brand-personal)',
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
                      color: 'var(--brand-personal)',
                      cursor: 'pointer',
                      marginRight: 4,
                    }}
                  >
                    <span aria-hidden="true">←</span>
                  </button>
                  {/* Tapping the avatar/username opens their profile, which is
                      where Block + Report live. Lets users escape an active
                      conversation safely without digging through settings. */}
                  {selectedConvo.kind === 'group' || selectedConvo.kind === 'room' ? (
                    /* Group/room header — avatar stack + title + member count.
                       Tap anywhere to open the Manage modal. */
                    <button
                      type="button"
                      onClick={() => setShowManageRoom(true)}
                      aria-label="Manage room or group"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        textAlign: 'left',
                      }}>
                      {(() => {
                        const members = getGroupMembers(selectedConvo).slice(0, 3);
                        const overflow = selectedConvo.participant_ids.length - members.length - 1;
                        return (
                          <div style={{
                            display: 'flex',
                            position: 'relative',
                            flexShrink: 0,
                            width: 40 + (members.length - 1) * 18,
                            height: 40,
                          }}>
                            {members.map((m, idx) => (
                              <div
                                key={m.user_id}
                                style={{
                                  position: 'absolute',
                                  left: idx * 18,
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background: 'var(--brand-personal-bg-pale)',
                                  border: '2px solid white',
                                  overflow: 'hidden',
                                  zIndex: members.length - idx,
                                }}
                              >
                                <Avatar
                                  src={m.avatar_url}
                                  alt={`@${m.username}`}
                                  width={32}
                                  height={32}
                                  fallbackFontSize={14}
                                  sizes="32px"
                                />
                              </div>
                            ))}
                            {overflow > 0 && (
                              <div style={{
                                position: 'absolute',
                                left: members.length * 18,
                                width: 32, height: 32,
                                borderRadius: '50%',
                                background: 'var(--brand-personal)',
                                color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 900,
                                border: '2px solid white',
                              }}>
                                +{overflow}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <div>
                        <p style={{ fontWeight: 800, color: 'var(--brand-text-primary)', fontSize: 15, letterSpacing: '-0.2px' }}>
                          {selectedConvo.title || 'Group chat'}
                          <span aria-hidden="true" style={{ marginLeft: 6, color: 'var(--brand-personal)', fontSize: 12 }}>⚙</span>
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--brand-personal-text-light)' }}>
                          {selectedConvo.participant_ids.length} member{selectedConvo.participant_ids.length === 1 ? '' : 's'}
                          {selectedConvo.kind === 'room' && ' · Room · tap to manage'}
                          {selectedConvo.kind === 'group' && ' · tap to manage'}
                        </p>
                      </div>
                    </button>
                  ) : (
                  /* DM header — single partner profile link (existing). */
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
                      background: 'var(--brand-personal-bg-pale)',
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
                      <p style={{ fontWeight: 700, color: 'var(--brand-text-primary)', fontSize: 15 }}>
                        @{getOtherUser(selectedConvo)?.username ?? 'Unknown'}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--brand-personal-text-light)' }}>
                        {selectedConvo.status === 'pending' ? '⏳ Pending approval' : 'Tap to view profile'}
                      </p>
                    </div>
                  </Link>
                  )}
                </div>

                {/* Match card button — only after the match is approved. */}
                {selectedConvo.status === 'approved' && (
                  <button
                    type="button"
                    onClick={() => setShowMatchCard(true)}
                    aria-label="Show connection card"
                    title="View connection card"
                    style={{
                      padding: '8px 14px',
                      background: 'rgba(200,149,108,0.1)',
                      border: '1px solid rgba(200,149,108,0.25)',
                      borderRadius: 100,
                      color: 'var(--brand-personal)',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span aria-hidden="true">✨</span> Connected
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
                        background: 'var(--brand-danger-bg)',
                        border: '1px solid rgba(220,100,100,0.2)',
                        borderRadius: 100,
                        color: 'var(--brand-danger-text)',
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
                        ...liquidGlass({ tone: 'warm' }),
                        padding: '8px 18px',
                        color: 'var(--brand-text-primary)',
                        fontSize: 13,
                        fontWeight: 800,
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
                background: 'var(--brand-personal-bg-cream)',
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
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand-text-primary)', marginBottom: 2 }}>
                          ❄️ Need an icebreaker?
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--brand-personal-text-light)' }}>
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
                          color: 'var(--brand-personal)',
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
                            background: 'var(--brand-personal-bg-cream)',
                            border: '1px solid rgba(200,149,108,0.2)',
                            borderRadius: 12,
                            color: 'var(--brand-personal-text-head)',
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
                        color: 'var(--brand-personal-text-light)',
                        fontSize: 12,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      No thanks, I'll write my own
                    </button>
                  </div>
                )}

                {/* Daily prompt banner — rooms only. Visible to every
                    member; only mods can edit it via the Manage modal. */}
                {selectedConvo.kind === 'room' && selectedConvo.daily_prompt && (
                  <div style={{
                    margin: '0 0 14px',
                    padding: '12px 14px',
                    background: 'linear-gradient(135deg, rgba(255,213,168,0.25), rgba(200,149,108,0.12))',
                    border: '1px solid rgba(200,149,108,0.3)',
                    borderRadius: 14,
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                  }}>
                    <span aria-hidden="true" style={{ fontSize: 18 }}>💡</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 10, fontWeight: 800,
                        color: 'var(--brand-personal-deep)', textTransform: 'uppercase',
                        letterSpacing: '1px', marginBottom: 2,
                      }}>
                        Today's prompt
                      </div>
                      <p style={{
                        margin: 0,
                        fontSize: 14,
                        color: 'var(--brand-personal-text-deep)',
                        lineHeight: 1.4,
                      }}>
                        {selectedConvo.daily_prompt}
                      </p>
                    </div>
                  </div>
                )}

                {messages.length === 0 && !showIcebreakers && (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--brand-personal-text-light)' }}>
                    <p style={{ fontSize: 14 }}>
                      {selectedConvo.status === 'pending' && selectedConvo.initiated_by === user?.id
                        ? 'Send your first message to start the conversation!'
                        : selectedConvo.status === 'pending'
                        ? 'This person wants to connect with you. Approve or decline above.'
                        : selectedConvo.kind === 'room'
                        ? 'No messages yet. Start the conversation in this room.'
                        : selectedConvo.kind === 'group'
                        ? "Group chat created. Drop the first message!"
                        : 'Say hello! 👋'}
                    </p>
                  </div>
                )}

                {/* "Read" indicator is shown only on my most recent
                    message that the partner has read. */}
                {messages.map((msg, idx, arr) => {
                  // Soft-deleted "for me" → never render.
                  if (isHiddenForMe(msg)) return null;
                  const isMine = msg.sender_id === user?.id;
                  const isGame = !msg.deleted_for_everyone && isGameMessage(msg.content);
                  // In group/room chats, show the sender's @handle above
                  // each INCOMING bubble so people know who's talking. We
                  // also collapse adjacent messages from the same sender
                  // (the label only shows on the FIRST message of a run).
                  const isGroupChat = selectedConvo?.kind === 'group' || selectedConvo?.kind === 'room';
                  const prev = idx > 0 ? arr[idx - 1] : null;
                  const showSenderLabel =
                    isGroupChat &&
                    !isMine &&
                    !msg.deleted_for_everyone &&
                    (!prev || prev.sender_id !== msg.sender_id);
                  const senderProfile = showSenderLabel ? profiles[msg.sender_id] : null;
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
                        flexDirection: 'column',
                        alignItems: isMine ? 'flex-end' : 'flex-start',
                      }}
                    >
                      {showSenderLabel && (
                        <p style={{
                          margin: '0 6px 3px',
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--brand-personal-text-mid)',
                          letterSpacing: '0.2px',
                        }}>
                          @{senderProfile?.username ?? 'unknown'}
                        </p>
                      )}
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
                            color: 'var(--brand-personal-text-mid)',
                            textAlign: isMine ? 'right' : 'left',
                          }}>
                            {timeAgo(msg.created_at)}
                            {showReadReceipt && (
                              <span style={{ marginLeft: 6, color: 'var(--brand-market-success)', fontWeight: 600 }}>
                                ✓ Read
                              </span>
                            )}
                          </p>
                        </div>
                      ) : msg.deleted_for_everyone ? (
                        <div style={{
                          maxWidth: '70%',
                          padding: '10px 16px',
                          borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          background: 'rgba(0,0,0,0.04)',
                          color: 'var(--brand-personal-text-mid)',
                          fontSize: 13,
                          fontStyle: 'italic',
                          border: '1px dashed rgba(200,149,108,0.3)',
                        }}>
                          🚫 This message was unsent
                        </div>
                      ) : msg.attachment_type ? (
                        <div style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 6,
                          flexDirection: isMine ? 'row-reverse' : 'row',
                        }}>
                          <AttachmentBubble
                            msg={msg}
                            isMine={isMine}
                            showReadReceipt={showReadReceipt}
                            timeAgo={timeAgo(msg.created_at)}
                          />
                          <MessageMenuButton
                            isMine={isMine}
                            isOpen={openMsgMenuId === msg.id}
                            onToggle={() => setOpenMsgMenuId(openMsgMenuId === msg.id ? null : msg.id)}
                            canUnsend={canUnsend(msg)}
                            onUnsend={() => { setOpenMsgMenuId(null); void handleUnsend(msg); }}
                            onDeleteForMe={() => { setOpenMsgMenuId(null); void handleDeleteForMe(msg); }}
                          />
                        </div>
                      ) : (
                        <div style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 6,
                          flexDirection: isMine ? 'row-reverse' : 'row',
                        }}>
                          <div style={{
                            maxWidth: '70%',
                            padding: '12px 16px',
                            borderRadius: isMine
                              ? '18px 18px 4px 18px'
                              : '18px 18px 18px 4px',
                            background: isMine ? 'var(--brand-personal)' : 'white',
                            color: isMine ? 'white' : 'var(--brand-text-primary)',
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
                          <MessageMenuButton
                            isMine={isMine}
                            isOpen={openMsgMenuId === msg.id}
                            onToggle={() => setOpenMsgMenuId(openMsgMenuId === msg.id ? null : msg.id)}
                            canUnsend={canUnsend(msg)}
                            onUnsend={() => { setOpenMsgMenuId(null); void handleUnsend(msg); }}
                            onDeleteForMe={() => { setOpenMsgMenuId(null); void handleDeleteForMe(msg); }}
                          />
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
                      color: 'var(--brand-personal-text-light)',
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
                  padding: '14px 16px max(14px, env(safe-area-inset-bottom))',
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
                        color: 'var(--brand-personal)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <span aria-hidden="true">❄️</span> Show icebreaker ideas
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {/* Single game launcher — opens the game lobby which
                        now contains BOTH live multiplayer games and the
                        old one-shot mini-games. */}
                    {selectedConvo.status === 'approved' && (
                      <button
                        type="button"
                        onClick={() => setShowGameLobby(true)}
                        aria-label="Pick a live game"
                        title="Pick a live game"
                        style={{
                          width: 38,
                          height: 38,
                          flexShrink: 0,
                          background: 'linear-gradient(135deg, var(--brand-personal), var(--brand-personal-light))',
                          border: 'none',
                          borderRadius: '50%',
                          color: 'white',
                          fontSize: 18,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(200,149,108,0.32)',
                        }}
                      >
                        <span aria-hidden="true">🎮</span>
                      </button>
                    )}

                    {/* Photo attachment — accept any image format. */}
                    <label
                      aria-label="Send a photo"
                      title="Send a photo"
                      style={{
                        width: 38,
                        height: 38,
                        flexShrink: 0,
                        background: 'white',
                        border: '1px solid rgba(200,149,108,0.35)',
                        borderRadius: '50%',
                        color: 'var(--brand-personal)',
                        fontSize: 18,
                        cursor: sending ? 'wait' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: sending ? 0.6 : 1,
                      }}
                    >
                      📷
                      <input
                        type="file"
                        accept="image/*,.heic,.heif"
                        onChange={handlePhotoPick}
                        disabled={sending}
                        style={{ display: 'none' }}
                      />
                    </label>

                    {/* Voice note recorder */}
                    <VoiceRecorder onSend={handleVoiceSend} />

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
                        background: 'var(--brand-personal-bg-cream)',
                        fontSize: 16,
                        color: 'var(--brand-text-primary)',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || !newMessage.trim()}
                      aria-label="Send message"
                      style={{
                        ...liquidGlass({ tone: 'warm' }),
                        padding: '10px 22px',
                        color: 'var(--brand-text-primary)',
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: sending || !newMessage.trim() ? 'not-allowed' : 'pointer',
                        opacity: sending || !newMessage.trim() ? 0.5 : 1,
                        flexShrink: 0,
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
                  color: 'var(--brand-personal-text-light)',
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
                  color: 'var(--brand-danger-text)',
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
              color: 'var(--brand-personal-text-light)',
              gap: 12,
            }}>
              <div style={{ fontSize: 56 }}>💌</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand-text-primary)' }}>
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

      {/* Mini-game composer (one-shot in-chat games). The new lobby
          launches this with initialStep set so we skip its own
          internal picker and jump to the right composer screen. */}
      <GamePicker
        open={showGamePicker}
        onClose={() => {
          setShowGamePicker(false);
          setGamePickerInitialStep(undefined);
        }}
        onSend={(encoded) => sendRawMessage(encoded)}
        initialStep={gamePickerInitialStep}
      />

      {/* Single game lobby — both LIVE multiplayer and QUICK mini-games
          come from this one entry point. Live → starts a real-time game
          session; Mini → opens the existing GamePicker pre-selected
          into that mini-game's composer. */}
      <GameLobby
        open={showGameLobby}
        onClose={() => setShowGameLobby(false)}
        partnerUsername={(() => {
          if (!selectedConvo || !user) return null;
          const other = getOtherUser(selectedConvo);
          return other?.username ?? null;
        })()}
        onPickLive={(key) => startNewGame(key)}
        onPickMini={(key: MiniGameKey) => {
          // Map the lobby's mini-game key to the GamePicker step key.
          const step = key === 'wyr_mini' ? 'wyr' : key;
          setGamePickerInitialStep(step as 'ttl' | 'wyr' | 'emoji');
          setShowGameLobby(false);
          setShowGamePicker(true);
        }}
      />

      {/* The active game itself — full-screen overlay over messages. */}
      {activeGame && user && (
        <GameContainer
          session={activeGame}
          currentUserId={user.id}
          partnerUsername={(() => {
            if (!selectedConvo) return null;
            const other = getOtherUser(selectedConvo);
            return other?.username ?? null;
          })()}
          onStartNewGame={(key) => {
            setActiveGame(null);
            void startNewGame(key);
          }}
          onExit={() => setActiveGame(null)}
        />
      )}

      {/* Group chat + Room creation modals. Both open from the pills in
          the sidebar header. On success they reload conversations and
          jump straight into the new thread. */}
      {user && (
        <>
          <CreateGroupModal
            open={showCreateGroup}
            onClose={() => setShowCreateGroup(false)}
            currentUserId={user.id}
            onCreated={async (newConvoId) => {
              await loadConversations(user);
              const fresh = await supabase
                .from('conversations')
                .select('*')
                .eq('id', newConvoId)
                .maybeSingle();
              if (fresh.data) {
                await selectConvo(fresh.data);
              }
            }}
          />
          <CreateRoomModal
            open={showCreateRoom}
            onClose={() => setShowCreateRoom(false)}
            currentUserId={user.id}
            onCreated={async (newConvoId) => {
              await loadConversations(user);
              const fresh = await supabase
                .from('conversations')
                .select('*')
                .eq('id', newConvoId)
                .maybeSingle();
              if (fresh.data) {
                await selectConvo(fresh.data);
              }
            }}
          />
          {selectedConvo && (selectedConvo.kind === 'group' || selectedConvo.kind === 'room') && (
            <ManageRoomModal
              open={showManageRoom}
              onClose={() => setShowManageRoom(false)}
              convo={selectedConvo}
              currentUserId={user.id}
              onLeft={() => {
                // Drop the current selection and reload conversations.
                setSelectedConvo(null);
                void loadConversations(user);
              }}
              onChanged={async () => {
                // Refetch the convo row so prompt/title/member changes appear.
                const fresh = await supabase
                  .from('conversations')
                  .select('*')
                  .eq('id', selectedConvo.id)
                  .maybeSingle();
                if (fresh.data) {
                  setSelectedConvo(fresh.data);
                }
                void loadConversations(user);
              }}
            />
          )}
        </>
      )}

      {/* One-time tour of the new Messages additions.
          v5 bump announces groups + rooms + 3 more games (Pictionary,
          Word Association, Name That Quote). */}
      <FeatureTutorial
        storageKey="mitype-messages-features-v6"
        eyebrow="New in Messages"
        slides={[
          {
            icon: '🏡',
            title: 'Mi Home Goods is here',
            body: 'Buy and sell directly with your Mitype community. Furniture, electronics, vintage finds, free stuff. Open the menu, tap Mi Home Goods, and list anything in under a minute with up to 4 photos.',
          },
          {
            icon: '👥',
            title: 'Group chats are here',
            body: 'Tap the bronze + Group pill at the top of your inbox to spin up a chat with up to 10 people. Pick any of your approved connections, name the group, and you\'re in.',
          },
          {
            icon: '🏛️',
            title: 'Rooms. Themed creator hangouts',
            body: 'Tap the purple + Room pill to create a public or invite-only room around a shared interest (LA filmmakers, home bakers, Etsy starters…). 21 categories to pick from. Up to 250 members per room.',
          },
          {
            icon: '🔍',
            title: 'Find rooms in Discover',
            body: 'The new "Looking for a room to join?" tab on Discover lets you browse every public room by category. One tap to join. No creator approval needed.',
          },
          {
            icon: '💡',
            title: 'Daily prompts (rooms only)',
            body: 'Room moderators can set a "today\'s prompt" that appears as a banner above the chat. A clean way to spark discussion without it getting buried.',
          },
          {
            icon: '⚙',
            title: 'Manage groups and rooms',
            body: 'Tap a group or room title at the top of the chat to open the Manage panel: see members, set the daily prompt, kick someone (moderators), or leave the conversation.',
          },
          {
            icon: '🎮',
            title: 'Three more games. 14 total',
            body: 'Pictionary (live canvas drawing), Word Association (8-second turn chain), and Name That Quote (race-to-type lyrics, movie lines, TV quotes). Tap the gold 🎮 button to play any of them.',
          },
          {
            icon: '🤔',
            title: 'And all the games from before',
            body: 'Would You Rather, This or That, Tic-Tac-Toe, Connect Four, Trivia Battle, Story Builder, Hangman, Checkers, Battleship, Chess, Word Duel. All still here. The lobby is now categorized so you can find them faster.',
          },
          {
            icon: '🔤',
            title: 'Word Duel. Head-to-head Scrabble',
            body: '15×15 board with full premium squares (DL/TL/DW/TW), 100-tile bag, dictionary validation, and the 50-point bingo bonus when you place all 7 rack tiles in one turn. Blanks get a letter picker.',
          },
          {
            icon: '✍️',
            title: 'Story Builder exports',
            body: 'After you finish a story together, you get three ways to keep it: 📥 Download as a beautiful image with the Mitype watermark in the corner, 📋 Copy as text, or 🌊 Send straight to the Wave editor as a caption.',
          },
          {
            icon: '🚪',
            title: 'End game any time',
            body: 'Every game has an ✕ in the top right. Tap it and your partner is told you ended the game. Both of you get a "Play another game?" prompt. Games are NOT saved, so close out cleanly.',
          },
          {
            icon: '📷',
            title: 'Send photos',
            body: 'Tap the 📷 button next to the message input to send a photo. Any image format. JPEG, PNG, HEIC from iPhone, even GIFs. Photos auto-convert so everyone can view them on every device.',
          },
          {
            icon: '🔊',
            title: 'Send voice notes',
            body: 'Tap the sound-bar icon to record a voice note. A panel opens with a live waveform. Tap Start, talk, tap Stop. Listen back, then Send or Re-record. Up to 10 minutes per voice note.',
          },
          {
            icon: '⏱️',
            title: 'Photos & voice auto-expire in 24h',
            body: 'Photos and voice notes vanish from the chat 24 hours after sending. The file is deleted from our servers and the bubble shows "Photo expired" or "Voice note expired."',
          },
          {
            icon: '🗑️',
            title: 'Delete what you don\'t want',
            body: 'Tap the ⋯ next to any message bubble to Unsend (your own, within 1 hour) or Delete-for-me. The 🗑️ icon on conversations in the sidebar clears the whole thread from your inbox.',
          },
          {
            icon: '🏪',
            title: 'Small Business Saves',
            body: 'The purple "Small Business Saves" tab at the top of your sidebar collects every business you\'ve hit ☆ Save on. Tap any row to open that business profile directly.',
          },
        ]}
      />
          <FeatureInfoButton featureKey="messages" />
    </main>
  );
}