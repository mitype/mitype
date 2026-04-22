'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

export default function MessagesPage() {
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [profiles, setProfiles] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      // Check subscription — redirect if not subscribed
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
      await loadConversations(user);
      setLoading(false);
    };
    getData();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadConversations(u: any) {
    const { data: convos } = await supabase
      .from('conversations')
      .select('*')
      .contains('participant_ids', [u.id])
      .order('updated_at', { ascending: false });

    setConversations(convos ?? []);

    // Load profiles for all participants
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
  }

  async function selectConvo(convo: any) {
    setSelectedConvo(convo);
    await loadMessages(convo.id);
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedConvo || !user) return;

    // Check message limits for pending convos
    if (selectedConvo.status === 'pending') {
      const myMessages = messages.filter((m) => m.sender_id === user.id);
      if (myMessages.length >= 1) {
        alert('Wait for the recipient to approve your request before sending more messages.');
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
    }
    setSending(false);
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

  if (loading) return (
    <main style={{
      minHeight: '100vh',
      background: '#faf6f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
    }}>
      <p style={{ color: '#c8956c', fontSize: 18 }}>Loading messages...</p>
    </main>
  );

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
        </div>
      </nav>

      {/* Chat Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{
          width: 300,
          borderRight: '1px solid rgba(200,149,108,0.15)',
          background: 'white',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflowY: 'auto',
        }}>
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
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}>
                      {other?.avatar_url ? (
                        <img src={other.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 18 }}>👤</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1208', marginBottom: 2 }}>
                        @{other?.username ?? 'Unknown'}
                      </p>
                      <p style={{ fontSize: 12, color: '#c8956c', fontWeight: 600 }}>New request</p>
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
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}>
                      {other?.avatar_url ? (
                        <img src={other.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 18 }}>👤</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1208', marginBottom: 2 }}>
                        @{other?.username ?? 'Unknown'}
                      </p>
                      <p style={{ fontSize: 12, color: '#a89278' }}>Pending approval</p>
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
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}>
                      {other?.avatar_url ? (
                        <img src={other.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 18 }}>👤</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1208', marginBottom: 2 }}>
                        @{other?.username ?? 'Unknown'}
                      </p>
                      <p style={{ fontSize: 12, color: '#a89278' }}>
                        {timeAgo(convo.updated_at)}
                      </p>
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#f0e8df',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {getOtherUser(selectedConvo)?.avatar_url ? (
                      <img
                        src={getOtherUser(selectedConvo).avatar_url}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span>👤</span>
                    )}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: '#1a1208', fontSize: 15 }}>
                      @{getOtherUser(selectedConvo)?.username ?? 'Unknown'}
                    </p>
                    <p style={{ fontSize: 12, color: '#a89278' }}>
                      {selectedConvo.status === 'pending' ? '⏳ Pending approval' : '✅ Active conversation'}
                    </p>
                  </div>
                </div>

                {/* Approve/Deny buttons for recipients */}
                {selectedConvo.status === 'pending' &&
                  selectedConvo.initiated_by !== user?.id && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => respondToRequest('denied')}
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
                      Approve ✓
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
                {messages.length === 0 && (
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

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: msg.sender_id === user?.id ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div style={{
                      maxWidth: '70%',
                      padding: '12px 16px',
                      borderRadius: msg.sender_id === user?.id
                        ? '18px 18px 4px 18px'
                        : '18px 18px 18px 4px',
                      background: msg.sender_id === user?.id ? '#c8956c' : 'white',
                      color: msg.sender_id === user?.id ? 'white' : '#1a1208',
                      fontSize: 14,
                      lineHeight: 1.5,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    }}>
                      <p style={{ margin: 0 }}>{msg.content}</p>
                      <p style={{
                        fontSize: 11,
                        margin: '4px 0 0',
                        opacity: 0.6,
                        textAlign: 'right',
                      }}>
                        {timeAgo(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
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
                  display: 'flex',
                  gap: 12,
                  flexShrink: 0,
                }}>
                  <input
                    type="text"
                    placeholder={
                      selectedConvo.status === 'pending'
                        ? 'Send your first message...'
                        : 'Type a message...'
                    }
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
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
    </main>
  );
}