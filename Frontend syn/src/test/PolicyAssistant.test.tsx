import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PolicyAssistant } from '../components/assistant/PolicyAssistant';
import { AuthProvider } from '../context/AuthContext';
import { CaseProvider } from '../context/CaseContext';

vi.mock('../services/api', () => ({
  queryPolicyAssistant: vi.fn(() => Promise.reject(new Error('backend down'))),
  loadCases: vi.fn(() => Promise.resolve([])),
  fetchModelEvalMetrics: vi.fn(() => Promise.resolve([])),
}));

function renderAssistant() {
  return render(
    <AuthProvider>
      <CaseProvider>
        <PolicyAssistant />
      </CaseProvider>
    </AuthProvider>
  );
}

async function sendFirstMessage(user: ReturnType<typeof userEvent.setup>, text: string) {
  const input = screen.getByPlaceholderText(/initiate a query/i);
  await user.type(input, `${text}{Enter}`);
}

function sidebarTitles(): string[] {
  return Array.from(document.querySelectorAll('aside span.truncate')).map(n => n.textContent || '');
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('PolicyAssistant Recents list', () => {
  it('shows a new chat session in the Recents sidebar after the user sends a query', async () => {
    const user = userEvent.setup();
    renderAssistant();
    await sendFirstMessage(user, 'Explain DTI policy');
    await waitFor(() => {
      expect(sidebarTitles()).toContain('Explain DTI policy');
    });
  });

  it('persists the session across navigation away and back (remount)', async () => {
    const user = userEvent.setup();
    const first = renderAssistant();
    await sendFirstMessage(user, 'Persist me');
    await waitFor(() => {
      expect(sidebarTitles()).toContain('Persist me');
    });
    first.unmount();

    renderAssistant();
    await waitFor(() => {
      expect(sidebarTitles()).toContain('Persist me');
    });
  });

  it('creates a new session in Recents even when a stale active_session_id exists in localStorage', async () => {
    localStorage.setItem('policylens_active_session_id', 'ghost-session');
    localStorage.setItem('policylens_chat_sessions', '[]');
    const user = userEvent.setup();
    renderAssistant();
    await sendFirstMessage(user, 'Orphan scenario');
    await waitFor(() => {
      expect(sidebarTitles()).toContain('Orphan scenario');
    });
  });

  it('clears the stale active_session_id from localStorage when starting a new chat', async () => {
    localStorage.setItem('policylens_active_session_id', 'ghost-session');
    localStorage.setItem('policylens_chat_sessions', '[]');
    const user = userEvent.setup();
    renderAssistant();
    await user.click(screen.getByRole('button', { name: /new chat/i }));
    await waitFor(() => {
      expect(localStorage.getItem('policylens_active_session_id')).toBeNull();
    });
  });
});
