import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, HelpCircle, ArrowRight } from 'lucide-react';
import PublicNav from '../components/layout/PublicNav';
import AmbientGridBackground from '../components/AmbientGridBackground';

export const FAQPage: React.FC = () => {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does FinLens automate credit decisioning?',
      a: 'FinLens combines rule-based scorecards with explainable machine learning models. When a loan application is submitted, the engine pulls real-time bureau and banking data, validates policy constraints, checks fraud vectors, and generates a recommended decision (Approve, Refer, or Decline) in under 400 milliseconds.'
    },
    {
      q: 'What credit bureaus and financial data providers are supported?',
      a: 'FinLens natively interfaces with major credit bureaus (CIBIL, Experian, Equifax, CRIF High Mark) as well as Account Aggregator (AA) frameworks, GST return analytics, and alternative digital footprint APIs.'
    },
    {
      q: 'How does the BeeBot AI Policy Assistant work?',
      a: 'BeeBot is an intelligent policy copilot trained on your institution’s credit policy guidelines and RBI regulations. Underwriters can query BeeBot in plain language to check loan eligibility thresholds, collateral criteria, or obtain adverse action citations.'
    },
    {
      q: 'Can underwriter teams override AI decisions?',
      a: 'Yes. FinLens provides a human-in-the-loop workflow. Applications flagged as "Refer" or requiring senior credit committee review route to underwriter queues where staff can review full audit trails, Shapley score breakdowns, and record rationale for overrides.'
    },
    {
      q: 'How does FinLens detect fraud and synthetic identities?',
      a: 'Our graph neural risk signals analyze device fingerprints, email domain velocity, phone reuse across applications, and circular entity relationships to flag mule accounts and synthetic identity fraud before disbursement.'
    },
    {
      q: 'Is FinLens compliant with Fair Lending and data privacy regulations?',
      a: 'Absolutely. Every automated decision produces an immutable audit record with transparent adverse action codes and feature attributions, ensuring compliance with RBI Master Directions and global Fair Lending mandates.'
    }
  ];

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div style={{
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      background: '#f6f7f9',
      minHeight: '100vh',
      color: '#111827',
      overflowX: 'hidden',
      position: 'relative'
    }}>
      {/* Interactive Physics Grid Background Layer */}
      <AmbientGridBackground />

      {/* Floating Single Pill Navbar */}
      <PublicNav />

      {/* Main Content */}
      <main style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '840px',
        margin: '0 auto',
        padding: '60px 24px 100px',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '9999px',
            background: 'rgba(15, 23, 42, 0.05)',
            border: '1px solid rgba(15, 23, 42, 0.1)',
            fontSize: '12.5px',
            fontWeight: 600,
            color: '#0f172a',
            marginBottom: '18px',
          }}>
            <HelpCircle size={14} />
            <span>Frequently Asked Questions</span>
          </div>

          <h1 style={{
            fontSize: '44px',
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: 1.15,
            letterSpacing: '-0.04em',
            margin: '0 0 16px',
          }}>
            Common Questions About FinLens
          </h1>

          <p style={{
            fontSize: '16.5px',
            color: '#4b5563',
            lineHeight: 1.6,
            maxWidth: '580px',
            margin: '0 auto',
            letterSpacing: '-0.01em',
          }}>
            Everything you need to know about our underwriting engine, fraud detection, and regulatory compliance.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '60px' }}>
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.88)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: `1px solid ${isOpen ? '#0f172a' : 'rgba(226, 232, 240, 0.9)'}`,
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: isOpen
                    ? '0 6px 24px -2px rgba(15, 23, 42, 0.08)'
                    : '0 2px 10px -1px rgba(15, 23, 42, 0.03)',
                  transition: 'all 0.2s ease',
                }}
              >
                <button
                  onClick={() => toggle(idx)}
                  style={{
                    width: '100%',
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#0f172a',
                  }}
                >
                  <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.4 }}>
                    {faq.q}
                  </span>
                  <div style={{
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    flexShrink: 0,
                    color: isOpen ? '#0f172a' : '#64748b',
                  }}>
                    <ChevronDown size={20} />
                  </div>
                </button>

                {isOpen && (
                  <div style={{
                    padding: '0 24px 22px',
                    fontSize: '14.5px',
                    color: '#475467',
                    lineHeight: 1.65,
                    borderTop: '1px solid #f1f5f9',
                    marginTop: '-4px',
                    paddingTop: '16px',
                  }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          borderRadius: '18px',
          padding: '32px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
        }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Ready to automate your credit pipeline?
            </h3>
            <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
              Access our decision engine, risk models, and underwriter workspaces.
            </p>
          </div>

          <button
            onClick={() => navigate('/login')}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 24px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(15, 23, 42, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(15, 23, 42, 0.15)';
            }}
          >
            <span>Log in to Portal</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </main>
    </div>
  );
};

export default FAQPage;
