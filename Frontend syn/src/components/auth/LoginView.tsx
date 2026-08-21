/**
 * LoginView.tsx
 * Two-panel auth card — monochromatic black & white theme matching the app palette.
 * Left panel toggles between Sign In and Sign Up in-place.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, RateLimitError } from '../../api/underwritingApi';
import { useAuth } from '../../context/AuthContext';
import {
  CreditCard,
  Wallet,
  Landmark,
  Percent,
  Coins,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

/* ── Theme tokens (mirrors index.css) ── */
const T = {
  bgBase:      '#f6f7f9',
  bgSurface:   '#ffffff',
  borderSubtle:'#e2e8f0',
  borderHover: '#cbd5e1',
  textPrimary: '#0f172a',
  textSecondary:'#64748b',
  textMuted:   '#94a3b8',
  accentDark:  '#0f172a',
  accentHover: '#1e293b',
  neutralLight:'#f1f5f9',
  neutralBorder:'#e2e8f0',
  roseLight:   '#fef2f2',
  roseBorder:  '#fecdd3',
  roseText:    '#b91c1c',
};

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 14px', border: `1.5px solid ${T.borderSubtle}`, borderRadius: 8,
  fontSize: 13, color: T.textPrimary, background: T.bgSurface, outline: 'none',
  transition: 'border-color 0.18s, box-shadow 0.18s', fontFamily: 'inherit',
};
const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = T.accentDark;
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15, 23, 42, 0.06)';
};
const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = T.borderSubtle;
  e.currentTarget.style.boxShadow = 'none';
};

/* ── Remember-me row ── */
const RememberRow: React.FC = () => {
  const [on, setOn] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: T.textSecondary, cursor: 'pointer', userSelect: 'none' }}>
        <div onClick={() => setOn(v => !v)} style={{
          width: 16, height: 16, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
          background: on ? T.accentDark : T.bgSurface,
          border: `1.5px solid ${on ? T.accentDark : T.borderHover}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
        }}>
          {on && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        Remember me
      </label>
      <button type="button" style={{ background: 'none', border: 'none', fontSize: 12, color: T.textSecondary, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
        Forgot Password?
      </button>
    </div>
  );
};

/* ── Main component ── */
export const LoginView: React.FC = () => {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Sign-in
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Sign-up
  const [suName, setSuName]       = useState('');
  const [suEmail, setSuEmail]     = useState('');
  const [suPass, setSuPass]       = useState('');
  const [suConfirm, setSuConfirm] = useState('');
  const [suLoading, setSuLoading] = useState(false);
  const [suDone, setSuDone]       = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(username.trim(), password);
      setAuth(res.access_token, res.role, username.trim());
      navigate('/applications');
    } catch (err) {
      setError(err instanceof RateLimitError
        ? 'Rate limited — too many attempts. Wait 1 minute.'
        : err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setSuLoading(true);
    setTimeout(() => { setSuLoading(false); setSuDone(true); }, 1000);
  };

  const switchMode = (next: 'signin' | 'signup') => {
    setError(null); setSuDone(false); setMode(next);
  };

  const isSignIn = mode === 'signin';
  const pwMismatch = !!(suConfirm && suConfirm !== suPass);

  /* Shared dark CTA button styles */
  const ctaBtn = (disabled: boolean): React.CSSProperties => ({
    padding: '11px 24px', border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', fontFamily: 'inherit',
    background: disabled ? T.borderHover : T.accentDark,
    color: '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : '0 2px 8px rgba(15,23,42,0.15)',
    transition: 'all 0.18s ease',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    width: '100%',
  });

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f6f7f9', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      padding: '24px',
    }}>
      <div style={{
        display: 'flex', width: '100%', maxWidth: 940, minHeight: 540,
        borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 12px 40px rgba(15,23,42,0.08)', background: '#ffffff',
        border: '1px solid #e2e8f0',
      }}>

        {/* ── LEFT PANEL ── */}
        <div style={{
          flex: '0 0 46%', padding: '44px 48px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          background: '#ffffff',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: '#0f172a', color: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
                <path d="M7 14 L11 9 L14 14 L17 9 L21 14" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 19 L11 14 L14 19 L17 14 L21 19" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
              </svg>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>finlens</span>
          </div>

          {/* ════ SIGN IN ════ */}
          {isSignIn && (
            <>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2, letterSpacing: '-0.03em' }}>
                  Welcome back
                </h1>
                <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 6, marginBottom: 0, lineHeight: 1.4 }}>
                  Enter your credentials to access the credit intelligence suite.
                </p>
              </div>

              <form onSubmit={handleSignIn}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475467', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Username</label>
                  <input type="text" placeholder="e.g. analyst or admin" autoComplete="username"
                    value={username} onChange={e => setUsername(e.target.value)} required
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475467', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Password</label>
                  <input type="password" placeholder="••••••••" autoComplete="current-password"
                    value={password} onChange={e => setPassword(e.target.value)} required
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>

                <RememberRow />

                {error && (
                  <div style={{ background: T.roseLight, border: `1px solid ${T.roseBorder}`, borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: T.roseText, fontWeight: 500 }}>
                    {error}
                  </div>
                )}

                {/* Demo quick-fill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18 }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>Demo fill:</span>
                  {[
                    { label: 'Analyst', user: 'analyst', pass: 'analyst123' },
                    { label: 'Admin',   user: 'admin',   pass: 'admin123'   },
                  ].map(({ label, user, pass }) => (
                    <button key={label} type="button"
                      onClick={() => { setUsername(user); setPassword(pass); }}
                      style={{
                        padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc', color: '#475467',
                        fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        const b = e.currentTarget as HTMLButtonElement;
                        b.style.borderColor = '#0f172a';
                        b.style.color = '#0f172a';
                        b.style.background = '#f1f5f9';
                      }}
                      onMouseLeave={e => {
                        const b = e.currentTarget as HTMLButtonElement;
                        b.style.borderColor = '#e2e8f0';
                        b.style.color = '#475467';
                        b.style.background = '#f8fafc';
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <button type="submit" disabled={loading} style={ctaBtn(loading)}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#1e293b'; }}
                  onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#0f172a'; }}
                >
                  {loading ? 'Authenticating…' : 'Sign In to Workspace'}
                  {!loading && <ArrowRight size={14} />}
                </button>
              </form>

              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 24, marginBottom: 0 }}>
                Need a new account?{' '}
                <span onClick={() => switchMode('signup')}
                  style={{ color: '#0f172a', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>
                  Request Access
                </span>
              </p>
            </>
          )}

          {/* ════ SIGN UP ════ */}
          {!isSignIn && (
            <>
              {suDone ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', background: '#0f172a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
                  }}>
                    <CheckCircle size={20} color="#fff" />
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Request Submitted</h2>
                  <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
                    Your access request is pending approval.<br />An administrator will activate it shortly.
                  </p>
                  <button onClick={() => switchMode('signin')} style={ctaBtn(false)}>
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2, letterSpacing: '-0.03em' }}>
                      Request Access
                    </h1>
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 6, marginBottom: 0 }}>
                      Join FinLens Credit Intelligence Platform
                    </p>
                  </div>

                  <form onSubmit={handleSignUp}>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#475467', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Full Name</label>
                      <input type="text" placeholder="e.g. Rahul Sharma" value={suName} onChange={e => setSuName(e.target.value)} required
                        style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#475467', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Work Email</label>
                      <input type="email" placeholder="name@institution.com" value={suEmail} onChange={e => setSuEmail(e.target.value)} required
                        style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#475467', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Password</label>
                        <input type="password" placeholder="••••••••" value={suPass} onChange={e => setSuPass(e.target.value)} required
                          style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#475467', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Confirm</label>
                        <input type="password" placeholder="••••••••" value={suConfirm} onChange={e => setSuConfirm(e.target.value)} required
                          style={{ ...inputStyle, borderColor: pwMismatch ? T.roseText : T.borderSubtle }}
                          onFocus={e => (e.currentTarget.style.borderColor = pwMismatch ? T.roseText : T.accentDark)}
                          onBlur={e => (e.currentTarget.style.borderColor = pwMismatch ? T.roseText : T.borderSubtle)} />
                      </div>
                    </div>

                    <button type="submit" disabled={suLoading || pwMismatch} style={ctaBtn(suLoading || pwMismatch)}>
                      {suLoading ? 'Submitting…' : 'Submit Request'}
                    </button>
                  </form>

                  <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 18, marginBottom: 0 }}>
                    Already registered?{' '}
                    <span onClick={() => switchMode('signin')}
                      style={{ color: '#0f172a', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>
                      Sign In
                    </span>
                  </p>
                </>
              )}
            </>
          )}
        </div>

        {/* ── RIGHT PANEL — Floating Credit Cards & Money Symbols ── */}
        <div style={{
          flex: '1 1 54%',
          background: 'radial-gradient(ellipse at center, #1e293b 0%, #0f172a 60%, #020617 100%)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}>
          {/* Subtle Ambient Radial Glows */}
          <div style={{
            position: 'absolute',
            width: 320, height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%)',
            top: '15%', left: '10%',
            pointerEvents: 'none', filter: 'blur(30px)',
          }} />
          <div style={{
            position: 'absolute',
            width: 300, height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
            bottom: '10%', right: '5%',
            pointerEvents: 'none', filter: 'blur(35px)',
          }} />

          {/* ── Floating Visual Stage ── */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 360, height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

            {/* Secondary Back Card (Tilted right) */}
            <div style={{
              position: 'absolute',
              width: 250, height: 155,
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
              transform: 'rotate(12deg) translate(35px, -20px)',
              zIndex: 1,
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              opacity: 0.75,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>FINLENS</span>
                <CreditCard size={18} color="rgba(255,255,255,0.4)" />
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', fontFamily: 'monospace' }}>
                •••• •••• •••• 4190
              </div>
            </div>

            {/* Main Foreground Hero Platinum Card */}
            <div style={{
              position: 'relative',
              width: 275, height: 170,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 60%, #020617 100%)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
              transform: 'rotate(-6deg)',
              zIndex: 3,
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              color: '#ffffff',
            }}>
              {/* Glossy top shimmer line */}
              <div style={{
                position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
              }} />

              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="12" height="12" viewBox="0 0 28 28" fill="none">
                      <path d="M7 14 L11 9 L14 14 L17 9 L21 14" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', color: '#f8fafc' }}>finlens</span>
                </div>

                {/* Contactless waves */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round">
                  <path d="M8.5 16.5a5 5 0 0 1 0-9" />
                  <path d="M12 19a8.5 8.5 0 0 0 0-14" />
                </svg>
              </div>

              {/* EMV Chip */}
              <div style={{
                width: 32, height: 24,
                borderRadius: 5,
                background: 'linear-gradient(135deg, #fef08a 0%, #ca8a04 100%)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: '80%', height: '70%', border: '0.5px solid rgba(0,0,0,0.3)', borderRadius: 2 }} />
              </div>

              {/* Card Number */}
              <div style={{
                fontSize: 14,
                fontFamily: 'monospace',
                letterSpacing: '0.18em',
                color: '#f1f5f9',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}>
                •••• 8824
              </div>

              {/* Card Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: 7, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cardholder</div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: '#ffffff' }}>FINLENS ELITE</div>
                </div>

                {/* Interlocking card circles logo */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.85)', marginRight: -7 }} />
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.85)' }} />
                </div>
              </div>
            </div>

            {/* ── Floating Badges: Money & Financial Icons ── */}

            {/* 1. Indian Rupee Badge (Top Right) */}
            <div style={{
              position: 'absolute', top: 10, right: 10,
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#34d399', fontSize: 18, fontWeight: 800,
              zIndex: 4,
              transform: 'translateY(0px)',
            }}>
              ₹
            </div>

            {/* 2. Dollar Badge (Bottom Left) */}
            <div style={{
              position: 'absolute', bottom: 15, left: 10,
              width: 42, height: 42, borderRadius: 12,
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#38bdf8', fontSize: 18, fontWeight: 800,
              zIndex: 4,
            }}>
              $
            </div>

            {/* 3. Wallet Badge (Top Left) */}
            <div style={{
              position: 'absolute', top: 25, left: 15,
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#facc15',
              zIndex: 2,
            }}>
              <Wallet size={18} />
            </div>

            {/* 4. Bank / Landmark Badge (Bottom Right) */}
            <div style={{
              position: 'absolute', bottom: 30, right: 15,
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#a78bfa',
              zIndex: 2,
            }}>
              <Landmark size={18} />
            </div>

            {/* 5. Percentage / Rates Badge (Far Right Center) */}
            <div style={{
              position: 'absolute', top: '48%', right: -5,
              width: 34, height: 34, borderRadius: 8,
              background: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#f43f5e',
              zIndex: 4,
            }}>
              <Percent size={15} />
            </div>

            {/* 6. Coins Badge (Far Left Center) */}
            <div style={{
              position: 'absolute', top: '50%', left: -5,
              width: 34, height: 34, borderRadius: 8,
              background: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fbbf24',
              zIndex: 4,
            }}>
              <Coins size={16} />
            </div>

            {/* 7. Euro Badge (Center Top) */}
            <div style={{
              position: 'absolute', top: -5, left: '46%',
              width: 30, height: 30, borderRadius: 8,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#93c5fd', fontSize: 13, fontWeight: 700,
              zIndex: 2,
            }}>
              €
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
