'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Simulate sending — in production connect to an email service
    await new Promise((r) => setTimeout(r, 1000));
    setSent(true);
    setLoading(false);
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #faf6f0 0%, #f5f0e8 100%)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 80,
    }}>

      {/* Nav */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 40px',
        borderBottom: '1px solid rgba(200,149,108,0.15)',
        background: 'rgba(250,246,240,0.9)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <Link href="/" style={{
          fontSize: 24,
          fontWeight: 900,
          color: '#c8956c',
          letterSpacing: '-1px',
          textDecoration: 'none',
        }}>
          mitype
        </Link>
        <Link href="/" style={{
          color: '#8a7560',
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 600,
        }}>
          Back to Home
        </Link>
      </nav>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{
          fontSize: 40,
          fontWeight: 900,
          color: '#1a1208',
          letterSpacing: '-1px',
          marginBottom: 8,
        }}>
          Contact & Support
        </h1>
        <p style={{ color: '#a89278', fontSize: 16, marginBottom: 48 }}>
          We're here to help! Send us a message and we'll get back to you within 24 hours.
        </p>

        {/* Contact info cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 40,
        }}>
          <div style={{
            background: 'white',
            border: '1px solid rgba(200,149,108,0.2)',
            borderRadius: 16,
            padding: '20px',
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📧</div>
            <p style={{ fontWeight: 700, color: '#1a1208', fontSize: 14, marginBottom: 4 }}>Email Support</p>
            
              href="mailto:support.mitypeapp@gmail.com"
              style={{ color: '#c8956c', fontSize: 13, textDecoration: 'none' }}
            >
              support.mitypeapp@gmail.com
            </a>
          </div>
          <div style={{
            background: 'white',
            border: '1px solid rgba(200,149,108,0.2)',
            borderRadius: 16,
            padding: '20px',
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⏰</div>
            <p style={{ fontWeight: 700, color: '#1a1208', fontSize: 14, marginBottom: 4 }}>Response Time</p>
            <p style={{ color: '#a89278', fontSize: 13 }}>Usually within 24 hours</p>
          </div>
        </div>

        {/* Contact form */}
        {sent ? (
          <div style={{
            background: 'white',
            border: '1px solid rgba(200,149,108,0.2)',
            borderRadius: 24,
            padding: '48px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h2 style={{
              fontSize: 24,
              fontWeight: 800,
              color: '#1a1208',
              marginBottom: 8,
            }}>
              Message received!
            </h2>
            <p style={{ color: '#a89278', fontSize: 15, marginBottom: 24 }}>
              Thank you for reaching out! We'll get back to you at <strong>{email}</strong> within 24 hours.
            </p>
            <Link href="/" style={{
              display: 'inline-block',
              padding: '12px 32px',
              background: '#c8956c',
              color: 'white',
              borderRadius: 100,
              textDecoration: 'none',
              fontSize: 15,
              fontWeight: 700,
            }}>
              Back to Mitype
            </Link>
          </div>
        ) : (
          <div style={{
            background: 'white',
            border: '1px solid rgba(200,149,108,0.2)',
            borderRadius: 24,
            padding: '40px',
            boxShadow: '0 20px 60px rgba(200,149,108,0.08)',
          }}>
            <form onSubmit={handleSubmit}>

              {/* Name & Email */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
                marginBottom: 20,
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#6b5744',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Your Name
                  </label>
                  <input
                    type="text"
                    placeholder="John Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '13px 16px',
                      borderRadius: 12,
                      border: '1px solid rgba(200,149,108,0.25)',
                      background: '#faf6f0',
                      fontSize: 15,
                      color: '#1a1208',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#6b5744',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Your Email
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '13px 16px',
                      borderRadius: 12,
                      border: '1px solid rgba(200,149,108,0.25)',
                      background: '#faf6f0',
                      fontSize: 15,
                      color: '#1a1208',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Subject */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#6b5744',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '13px 16px',
                    borderRadius: 12,
                    border: '1px solid rgba(200,149,108,0.25)',
                    background: '#faf6f0',
                    fontSize: 15,
                    color: '#1a1208',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">Select a topic...</option>
                  <option value="account">Account issues</option>
                  <option value="billing">Billing & subscription</option>
                  <option value="safety">Safety concern or report</option>
                  <option value="technical">Technical problem</option>
                  <option value="feedback">Feedback or suggestion</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Message */}
              <div style={{ marginBottom: 32 }}>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#6b5744',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Message
                </label>
                <textarea
                  placeholder="Describe your issue or question in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '13px 16px',
                    borderRadius: 12,
                    border: '1px solid rgba(200,149,108,0.25)',
                    background: '#faf6f0',
                    fontSize: 15,
                    color: '#1a1208',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: "'Helvetica Neue', Arial, sans-serif",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: loading ? '#d4a882' : '#c8956c',
                  color: 'white',
                  border: 'none',
                  borderRadius: 100,
                  fontSize: 17,
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 24px rgba(200,149,108,0.3)',
                }}
              >
                {loading ? 'Sending...' : 'Send Message'}
              </button>

            </form>
          </div>
        )}

        {/* Footer links */}
        <div style={{
          marginTop: 40,
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
        }}>
          <Link href="/legal/privacy" style={{ color: '#c8956c', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Privacy Policy
          </Link>
          <Link href="/legal/terms" style={{ color: '#c8956c', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Terms of Service
          </Link>
          <Link href="/" style={{ color: '#c8956c', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Back to Mitype
          </Link>
        </div>
      </div>
    </main>
  );
}