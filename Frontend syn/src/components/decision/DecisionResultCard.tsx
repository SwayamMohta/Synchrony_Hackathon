/**
 * DecisionResultCard.tsx
 * Renders the full decision output after POST /v1/decision succeeds.
 * Shows: banner, scores, reason codes, SHAP chart, metadata.
 */
import React from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import type { DecisionResponse } from '../../api/underwritingApi';
import { ShapBarChart } from './ShapBarChart';

interface DecisionResultCardProps {
  result: DecisionResponse;
}

const DECISION_CONFIG = {
  approve: {
    label: 'APPROVE',
    bg: '#ecfdf5',
    border: '#6ee7b7',
    text: '#064e3b',
    accent: '#10b981',
  },
  decline: {
    label: 'DECLINE',
    bg: '#fef2f2',
    border: '#fca5a5',
    text: '#7f1d1d',
    accent: '#ef4444',
  },
  refer: {
    label: 'REFER',
    bg: '#fffbeb',
    border: '#fcd34d',
    text: '#78350f',
    accent: '#f59e0b',
  },
};

export const DecisionResultCard: React.FC<DecisionResultCardProps> = ({ result }) => {
  const cfg = DECISION_CONFIG[result.decision] ?? DECISION_CONFIG.refer;

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: 14,
      boxShadow: '0 2px 8px rgba(16,24,40,0.05)',
      overflow: 'hidden',
      fontFamily: "'IBM Plex Sans', 'Inter', system-ui, sans-serif",
    }}>

      {/* ── Decision Banner ── */}
      <div style={{
        background: cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        borderRadius: '13px 13px 0 0',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontSize: 28,
            fontWeight: 800,
            color: cfg.text,
            letterSpacing: '0.06em',
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            {cfg.label}
          </div>
          <div style={{ fontSize: 12, color: cfg.text, opacity: 0.75, marginTop: 2 }}>
            Applicant: <strong>{result.applicant_id}</strong>
            &nbsp;&nbsp;|&nbsp;&nbsp;
            Latency: <strong>{result.latency_ms.toFixed(1)} ms</strong>
          </div>
        </div>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          border: `3px solid ${cfg.accent}`,
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {result.decision === 'approve' ? (
            <Check style={{ width: 24, height: 24, color: cfg.accent, strokeWidth: 3 }} />
          ) : result.decision === 'decline' ? (
            <X style={{ width: 24, height: 24, color: cfg.accent, strokeWidth: 3 }} />
          ) : (
            <AlertCircle style={{ width: 24, height: 24, color: cfg.accent, strokeWidth: 3 }} />
          )}
        </div>
      </div>

      {/* ── Score + Codes + SHAP ── */}
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Score row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, color: '#667085', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Predicted credit-risk score
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', fontFamily: "'IBM Plex Mono', monospace" }}>
              {result.credit_risk_score.toFixed(3)}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
              higher = higher default probability
            </div>
          </div>

          <div style={{
            background: '#f8fafc',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, color: '#667085', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Rule-based fraud risk score
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', fontFamily: "'IBM Plex Mono', monospace" }}>
              {result.fraud_risk_score.toFixed(3)}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
              0 = no fraud signals detected
            </div>
          </div>
        </div>

        {/* Reason codes */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Why this decision
          </div>
          {result.reason_codes.length === 0 ? (
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>No adverse reason codes.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {result.reason_codes.map((code, i) => (
                <li key={i} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  fontSize: 12,
                  color: '#374151',
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#f59e0b', marginTop: 5, flexShrink: 0,
                  }} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{code}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* SHAP chart */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            What influenced the model's score (SHAP)
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, background: '#ef4444', borderRadius: 2, marginRight: 4 }} />
            Risk-increasing &nbsp;&nbsp;
            <span style={{ display: 'inline-block', width: 10, height: 10, background: '#10b981', borderRadius: 2, marginRight: 4 }} />
            Risk-reducing
          </div>
          <ShapBarChart shapFeatures={result.shap_top_features} />
        </div>

        {/* Metadata footer */}
        <div style={{
          borderTop: '1px solid #f3f4f6',
          paddingTop: 14,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          {[
            ['Model', result.model_version],
            ['Feature schema', result.feature_schema_version],
            ['Policy', result.policy_version],
            ['Request ID', result.request_id],
          ].map(([label, value]) => (
            <span key={label} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              padding: '3px 9px',
              fontSize: 11,
              color: '#374151',
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              <span style={{ color: '#9ca3af' }}>{label}:</span>
              {value}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
