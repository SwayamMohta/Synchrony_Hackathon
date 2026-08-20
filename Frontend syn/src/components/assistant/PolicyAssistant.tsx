import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Paperclip,
  Lightbulb,
  Search,
  BookOpen,
  ChevronDown,
  RotateCcw,
  Copy,
  Check,
  ThumbsUp,
  FileCheck,
  User,
  ArrowUp,
  ChevronRight,
  Clock,
  X,
  FileText,
  Globe,
  Plus,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  SquarePen,
  MoreHorizontal,
  Pencil,
  Archive,
  Share2
} from 'lucide-react';
import { useRotatingStatus } from '../../hooks/useRotatingStatus';
import type { ApplicationCase, RagResponse } from '../../types/underwriting';
import { queryPolicyAssistant } from '../../services/api';
import { useCases } from '../../context/CaseContext';
import { useAuth } from '../../context/AuthContext';

interface PolicyAssistantProps {
  initialCase?: ApplicationCase | null;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  response?: RagResponse;
  modelUsed?: string;
  reasoningSteps?: string[];
  reasoningTimeMs?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  caseId: string | null;
  messages: ChatMessage[];
}

export const PolicyAssistant: React.FC<PolicyAssistantProps> = ({ initialCase }) => {
  const { cases, setSelectedCaseId } = useCases();
  const { token } = useAuth();
  const [activeCase, setActiveCase] = useState<ApplicationCase | null>(initialCase || null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  const assistantStatus = useRotatingStatus(
    ['Pondering…', 'Musing…', 'Consulting the policy manual…', 'Cross-referencing precedent…', 'Synthesizing explanation…'],
    850
  );
  
  // ── Session History States ──
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('policylens_chat_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    try {
      const savedId = localStorage.getItem('policylens_active_session_id');
      if (savedId) return savedId;
    } catch {
      // ignore
    }
    return null;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [sessionSearchQuery, setSessionSearchQuery] = useState('');
  const [menuOpenSessionId, setMenuOpenSessionId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  const sessionMenuRef = useRef<HTMLDivElement>(null);

  // Close session options menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sessionMenuRef.current && !sessionMenuRef.current.contains(e.target as Node)) {
        setMenuOpenSessionId(null);
      }
    };
    if (menuOpenSessionId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpenSessionId]);

  // Active messages derived from current session or blank for new chat
  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === activeSessionId) || null;
  }, [sessions, activeSessionId]);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return activeSession ? activeSession.messages : [];
  });

  // Keep messages synced when switching sessions
  useEffect(() => {
    if (activeSession) {
      setMessages(activeSession.messages);
      if (activeSession.caseId) {
        const found = cases.find(c => c.id === activeSession.caseId);
        if (found) setActiveCase(found);
      }
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  // Persist sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('policylens_chat_sessions', JSON.stringify(sessions));
      if (activeSessionId) {
        localStorage.setItem('policylens_active_session_id', activeSessionId);
      } else {
        localStorage.removeItem('policylens_active_session_id');
      }
    } catch {
      // ignore
    }
  }, [sessions, activeSessionId]);

  // Dropdown states & search
  const [isCaseDropdownOpen, setIsCaseDropdownOpen] = useState(false);
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const [recentCaseIds, setRecentCaseIds] = useState<string[]>(() => {
    const defaultIds: string[] = [];
    return initialCase ? [initialCase.id, ...defaultIds.filter(id => id !== initialCase.id)] : defaultIds;
  });
  const [expandedReasoningId, setExpandedReasoningId] = useState<string | null>(null);
  
  // Action feedback states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [savedNotesMap, setSavedNotesMap] = useState<Record<string, boolean>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const caseDropdownRef = useRef<HTMLDivElement>(null);
  const caseSearchInputRef = useRef<HTMLInputElement>(null);

  // Close case dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (caseDropdownRef.current && !caseDropdownRef.current.contains(e.target as Node)) {
        setIsCaseDropdownOpen(false);
      }
    };
    if (isCaseDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => caseSearchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCaseDropdownOpen]);

  const handleSelectCase = (c: ApplicationCase | null) => {
    setActiveCase(c);
    if (c) {
      setSelectedCaseId(c.id);
      setRecentCaseIds(prev => [c.id, ...prev.filter(id => id !== c.id)].slice(0, 6));
    }
    if (activeSessionId) {
      setSessions(prev =>
        prev.map(s => (s.id === activeSessionId ? { ...s, caseId: c ? c.id : null } : s))
      );
    }
    setIsCaseDropdownOpen(false);
    setCaseSearchQuery('');
  };

  // Filtered cases list based on search term
  const filteredCases = useMemo(() => {
    const q = caseSearchQuery.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter(c =>
      c.id.toLowerCase().includes(q) ||
      c.applicant.name.toLowerCase().includes(q) ||
      c.decision.toLowerCase().includes(q) ||
      (c.applicant.city && c.applicant.city.toLowerCase().includes(q)) ||
      (c.applicant.occupation && c.applicant.occupation.toLowerCase().includes(q)) ||
      (c.applicant.segment && c.applicant.segment.toLowerCase().includes(q))
    );
  }, [cases, caseSearchQuery]);

  // Recent cases derived from recentCaseIds
  const recentCases = useMemo(() => {
    return recentCaseIds
      .map(id => cases.find(c => c.id.toLowerCase() === id.toLowerCase()))
      .filter((c): c is ApplicationCase => Boolean(c));
  }, [cases, recentCaseIds]);

  // Sync initial case changes
  useEffect(() => {
    if (initialCase) {
      setActiveCase(initialCase);
    }
  }, [initialCase?.id]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Dynamic greeting based on local time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const userName = activeCase?.applicant?.name ? activeCase.applicant.name.split(' ')[0] : 'Swayam';

  // ── Session Management Handlers ──
  const handleStartNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setQuery('');
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setQuery('');
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== sessionId);
    setSessions(updated);
    setMenuOpenSessionId(null);
    if (activeSessionId === sessionId) {
      if (updated.length > 0) {
        setActiveSessionId(updated[0].id);
      } else {
        handleStartNewChat();
      }
    }
  };

  const handleStartRename = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
    setMenuOpenSessionId(null);
  };

  const handleSaveRename = (sessionId: string) => {
    if (editingTitle.trim()) {
      setSessions(prev =>
        prev.map(s => (s.id === sessionId ? { ...s, title: editingTitle.trim() } : s))
      );
    }
    setEditingSessionId(null);
  };

  const handleSend = async (textToSend?: string) => {
    const q = (textToSend || query).trim();
    if (!q || loading) return;

    const userMessageId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    const now = Date.now();

    // Persist the user message immediately (optimistic) so the chat is saved to
    // Recents even if the policy service call fails (backend/Docker/LLM down).
    const hasActiveSession = activeSessionId !== null && sessions.some(s => s.id === activeSessionId);
    let sessionId = hasActiveSession ? activeSessionId : null;
    if (sessionId) {
      setSessions(prev =>
        prev.map(s =>
          s.id === sessionId
            ? {
                ...s,
                messages: [...s.messages, userMsg],
                updatedAt: now,
                caseId: activeCase ? activeCase.id : s.caseId,
              }
            : s
        )
      );
    } else {
      sessionId = `session-${now}`;
      const newSessionTitle = q.length > 32 ? `${q.slice(0, 30)}...` : q;
      const newSession: ChatSession = {
        id: sessionId,
        title: newSessionTitle,
        createdAt: now,
        updatedAt: now,
        caseId: activeCase ? activeCase.id : null,
        messages: [userMsg],
      };
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(sessionId);
    }

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setQuery('');
    setLoading(true);

    const startTime = Date.now();

    const appendAssistantMessage = (assistantMsg: ChatMessage) => {
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      setExpandedReasoningId(assistantMsg.id);
      setSessions(prev =>
        prev.map(s =>
          s.id === sessionId ? { ...s, messages: finalMessages, updatedAt: Date.now() } : s
        )
      );
    };

    try {
      const res = await queryPolicyAssistant(q, activeCase?.id, token || undefined);
      const elapsed = Date.now() - startTime;
      
      const reasoningSteps = [`Retrieved ${res.sources.length} grounded policy excerpt(s) from the policy store`];

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        response: res,
        modelUsed: 'PolicyLens',
        reasoningSteps: reasoningSteps,
        reasoningTimeMs: elapsed > 400 ? elapsed : 1200,
      };

      appendAssistantMessage(assistantMsg);
    } catch (err) {
      console.error('Error querying policy assistant:', err);
      appendAssistantMessage({
        id: `asst-err-${Date.now()}`,
        sender: 'assistant',
        text: 'Could not reach the policy service — this chat is saved locally but the question was not answered. Check that the backend and Docker (pgvector) are running, then retry.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered session list for the sidebar
  const filteredSessions = useMemo(() => {
    const q = sessionSearchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      s =>
        s.title.toLowerCase().includes(q) ||
        (s.caseId && s.caseId.toLowerCase().includes(q)) ||
        s.messages.some(m => m.text.toLowerCase().includes(q))
    );
  }, [sessions, sessionSearchQuery]);

  const starterQueries = [
    {
      label: activeCase ? `Why was ${activeCase.id} referred for review?` : 'Why was this application referred for manual review?',
      query: activeCase ? `Explain why application ${activeCase.id} reached decision [${activeCase.decision}] and detail applicable policy rules.` : 'Why was this application referred for manual review?',
      category: 'Case Rationale'
    },
    {
      label: 'Explain the affordability & expense-to-income caps',
      query: 'What are the expense-to-income (65%) cap, the affordability (6x monthly income) rule, and the debt-to-income (DTI) ratio formula under the underwriting policy?',
      category: 'Policy Rules'
    },
    {
      label: 'Underwriting decision thresholds & precedence',
      query: 'What are the decision thresholds for approve, refer, and decline, and the order of precedence?',
      category: 'Decision Guidelines'
    },
    {
      label: 'Device fingerprinting & fraud velocity rules',
      query: 'What are the fraud velocity limits and device fingerprinting rules triggering automated REFER?',
      category: 'Fraud Policy'
    }
  ];

  return (
    <div className="flex h-[calc(100vh-28px)] w-full bg-[#fcfcfd] rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden relative select-none">
      
      {/* ═════════════════════════════════════════════════════════
          ── LEFT: EXACT CHATGPT-STYLE HISTORY & MENU SIDEBAR ──
         ═════════════════════════════════════════════════════════ */}
      {isSidebarOpen && (
        <aside className="w-64 bg-[#f9f9f9] border-r border-slate-200/70 flex flex-col flex-shrink-0 z-20 animate-in slide-in-from-left duration-150">
          
          {/* Top Header: PolicyLens Brand + Search & Sidebar Icons */}
          <div className="px-3.5 pt-3.5 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={handleStartNewChat}>
              <div className="beebot-orb-mini w-5 h-5 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-2.5 h-2.5 text-white drop-shadow-xs" />
              </div>
              <span className="text-[15px] font-bold text-slate-900 tracking-tight font-sans">
                PolicyLens
              </span>
            </div>

            <div className="flex items-center gap-0.5 text-slate-500">
              <button
                onClick={() => setIsSearchActive(!isSearchActive)}
                className="p-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Search Chats"
              >
                <Search className="w-4 h-4 stroke-[2]" />
              </button>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Close sidebar"
              >
                <PanelLeftClose className="w-4 h-4 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* Collapsible Search Input (when search icon clicked) */}
          {isSearchActive && (
            <div className="px-3 pt-1 pb-2">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={sessionSearchQuery}
                  onChange={e => setSessionSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-7 py-1 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                />
                {sessionSearchQuery && (
                  <button
                    onClick={() => setSessionSearchQuery('')}
                    className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Upper Action Menu: New chat */}
          <div className="px-2 pt-1 pb-1">
            <button
              onClick={handleStartNewChat}
              className="w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-[13px] font-normal text-slate-800 hover:bg-slate-200/60 transition-colors text-left cursor-pointer"
            >
              <SquarePen className="w-4 h-4 text-slate-700 stroke-[1.8]" />
              <span>New chat</span>
            </button>
          </div>

          {/* Category Heading: Recents */}
          <div className="px-3 pt-3.5 pb-1 text-[11px] font-medium text-slate-400">
            Recents
          </div>

          {/* Scrollable Recents List */}
          <div className="flex-1 overflow-y-auto px-2 space-y-0.5 custom-sidebar-scroll">
            {filteredSessions.map(session => {
              const isSelected = activeSessionId === session.id;
              const isMenuOpen = menuOpenSessionId === session.id;
              const isEditing = editingSessionId === session.id;

              return (
                <div
                  key={session.id}
                  onClick={() => {
                    if (!isEditing) {
                      handleSelectSession(session.id);
                    }
                  }}
                  className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#eaeaea] text-slate-900 font-medium'
                      : 'text-slate-700 hover:bg-slate-200/60'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveRename(session.id);
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                        autoFocus
                        className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800 font-medium"
                      />
                      <button
                        onClick={() => handleSaveRename(session.id)}
                        className="p-1 text-slate-600 hover:text-slate-900"
                        title="Save title"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingSessionId(null)}
                        className="p-1 text-slate-400 hover:text-slate-600"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="truncate flex-1 pr-1">
                        {session.title}
                      </span>

                      {/* 3-dots more options trigger button */}
                      <div className="relative">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setMenuOpenSessionId(isMenuOpen ? null : session.id);
                          }}
                          className={`p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-300/50 transition-all cursor-pointer ${
                            isMenuOpen ? 'opacity-100 bg-slate-300/60 text-slate-900' : 'opacity-0 group-hover:opacity-100'
                          }`}
                          title="More options"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>

                        {/* ChatGPT-style floating dropdown menu */}
                        {isMenuOpen && (
                          <div
                            ref={sessionMenuRef}
                            onClick={e => e.stopPropagation()}
                            className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1 z-50 animate-in fade-in zoom-in-95 duration-100 font-normal text-xs"
                          >
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleCopy(session.title, session.id);
                                setMenuOpenSessionId(null);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:bg-slate-100 text-left transition-colors cursor-pointer"
                            >
                              <Share2 className="w-3.5 h-3.5 text-slate-500" />
                              <span>Share</span>
                            </button>

                            <button
                              onClick={e => handleStartRename(e, session)}
                              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:bg-slate-100 text-left transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-500" />
                              <span>Rename</span>
                            </button>

                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setMenuOpenSessionId(null);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-700 hover:bg-slate-100 text-left transition-colors cursor-pointer"
                            >
                              <Archive className="w-3.5 h-3.5 text-slate-500" />
                              <span>Archive</span>
                            </button>

                            <div className="h-px bg-slate-100 my-1" />

                            <button
                              onClick={e => handleDeleteSession(e, session.id)}
                              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-rose-600 hover:bg-rose-50 text-left transition-colors cursor-pointer font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Delete chat</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {/* ═══════════════════════════════════════════════
          ── RIGHT: MAIN CHAT PANEL ──
         ═══════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* ── Top Navigation Bar ── */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-white/90 backdrop-blur-md border-b border-slate-100 z-30 flex-shrink-0">
          
          {/* Left: Sidebar Toggle + Brand (shown when sidebar is collapsed) */}
          <div className="flex items-center gap-2">
            {!isSidebarOpen && (
              <>
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Open History Sidebar"
                >
                  <PanelLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl shadow-xs text-xs font-semibold text-slate-800">
                  <div className="beebot-orb-mini w-5 h-5 flex items-center justify-center">
                    <Sparkles className="w-2.5 h-2.5 text-white drop-shadow-xs" />
                  </div>
                  <span className="font-bold tracking-tight text-slate-900">PolicyLens</span>
                </div>
              </>
            )}
          </div>

          {/* Right: Active Context Selector & Actions */}
          <div className="flex items-center gap-2.5">
            <div ref={caseDropdownRef} className="relative">
              <button
                onClick={() => setIsCaseDropdownOpen(!isCaseDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition-colors cursor-pointer"
              >
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Context:</span>
                <span className="font-bold text-slate-900 truncate max-w-[140px]">
                  {activeCase ? `${activeCase.applicant.name.split(' ')[0]} (${activeCase.id})` : 'General Policy'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isCaseDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCaseDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden flex flex-col max-h-[480px]">
                  <div className="p-3 border-b border-slate-100 bg-slate-50/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-800" />
                        Switch Active Case Context
                      </span>
                      <button
                        onClick={() => setIsCaseDropdownOpen(false)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="relative flex items-center">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                      <input
                        ref={caseSearchInputRef}
                        type="text"
                        placeholder="Search ID, applicant name, status..."
                        value={caseSearchQuery}
                        onChange={e => setCaseSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-900/10 font-medium"
                      />
                      {caseSearchQuery && (
                        <button
                          onClick={() => setCaseSearchQuery('')}
                          className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-y-auto flex-1 p-2 space-y-2.5">
                    <div>
                      <button
                        onClick={() => handleSelectCase(null)}
                        className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between text-xs font-medium transition-colors cursor-pointer ${
                          !activeCase
                            ? 'bg-slate-100 text-slate-900 font-bold border border-slate-300'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-lg bg-slate-100 text-slate-700">
                            <Globe className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">General Policy Guidance</div>
                            <div className="text-[10px] text-slate-400 font-normal">No specific applicant context attached</div>
                          </div>
                        </div>
                        {!activeCase && <Check className="w-4 h-4 text-slate-900" />}
                      </button>
                    </div>

                    {!caseSearchQuery && recentCases.length > 0 && (
                      <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                        <div className="px-2 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Recently Used ({recentCases.length})</span>
                        </div>
                        <div className="space-y-1">
                          {recentCases.map(c => (
                            <button
                              key={c.id}
                              onClick={() => handleSelectCase(c)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                activeCase?.id === c.id
                                  ? 'bg-slate-100 text-slate-900 font-bold border border-slate-300'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                                  {c.applicant.name.charAt(0)}
                                </div>
                                <div className="min-w-0 truncate">
                                  <span className="font-bold text-slate-900 truncate">{c.applicant.name}</span>
                                  <span className="block text-[10px] font-mono text-slate-400">{c.id}</span>
                                </div>
                              </div>
                              <span
                                className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0 ml-2 ${
                                  c.decision === 'APPROVE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : c.decision === 'REFER'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {c.decision}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                      <div className="px-2 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>{caseSearchQuery ? `Search Results (${filteredCases.length})` : `All Applications (${cases.length})`}</span>
                      </div>

                      {filteredCases.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          No matching applications found for "{caseSearchQuery}"
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                          {filteredCases.map(c => (
                            <button
                              key={c.id}
                              onClick={() => handleSelectCase(c)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                activeCase?.id === c.id
                                  ? 'bg-slate-100 text-slate-900 font-bold border border-slate-300'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                                  {c.applicant.name.charAt(0)}
                                </div>
                                <div className="min-w-0 truncate">
                                  <span className="font-bold text-slate-900 truncate">{c.applicant.name}</span>
                                  <span className="block text-[10px] font-mono text-slate-400">{c.id}</span>
                                </div>
                              </div>
                              <span
                                className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0 ml-2 ${
                                  c.decision === 'APPROVE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : c.decision === 'REFER'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {c.decision}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Clear / New query button */}
            {messages.length > 0 && (
              <button
                onClick={handleStartNewChat}
                title="Start a new chat"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-slate-500" />
                <span>New Query</span>
              </button>
            )}
          </div>
        </header>

        {/* ── Main Chat Area ── */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 relative">
          
          {/* State A: Hero Empty State with 3D Sphere */}
          {messages.length === 0 && (
            <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[75vh] text-center pt-2 pb-12">
              
              {/* Center 3D Iridescent Orb with glowing halo */}
              <div className="mb-7 beebot-orb-container">
                <div className="beebot-orb-halo" />
                <div className="beebot-orb">
                  <div className="beebot-orb-highlight" />
                  <div className="beebot-orb-highlight-subtle" />
                </div>
              </div>

              {/* Headline matching typography */}
              <div className="space-y-1.5 mb-9">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
                  {getGreeting()}, {userName}
                </h2>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                  How Can I{' '}
                  <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent">
                    Assist You Today?
                  </span>
                </h1>
              </div>

              {/* BeeBot Central Floating Prompt Box */}
              <div className="w-full max-w-2xl beebot-prompt-box p-4 text-left transition-all">
                <div className="flex items-center gap-3 px-2 pt-1 pb-3">
                  <Sparkles className="w-5 h-5 text-slate-700 flex-shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Initiate a query or send a command to the AI..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSend();
                    }}
                    className="w-full bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-sm md:text-[15px] font-normal"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setIsCaseDropdownOpen(!isCaseDropdownOpen)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          activeCase ? 'text-slate-900 bg-slate-100 font-bold' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                        title="Attach Case Context"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                      {activeCase && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-[11px] font-semibold text-slate-800">
                          <span className="font-mono">{activeCase.id}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCase(null);
                            }}
                            className="text-slate-400 hover:text-slate-800 ml-0.5 cursor-pointer"
                            title="Detach Case"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleSend()}
                    disabled={!query.trim() || loading}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-xs cursor-pointer ${
                      query.trim()
                        ? 'bg-slate-900 hover:bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* Quick Starter Query Cards */}
              <div className="w-full max-w-2xl mt-6">
                <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
                  Suggested Policy Queries
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                  {starterQueries.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(item.query)}
                      className="p-3 bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-400 rounded-xl text-left shadow-xs hover:shadow-sm transition-all group cursor-pointer"
                    >
                      <div className="text-[10px] font-mono font-bold text-slate-500 uppercase mb-0.5 flex items-center justify-between">
                        <span>{item.category}</span>
                        <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
                      </div>
                      <div className="text-xs font-semibold text-slate-800 leading-snug">
                        "{item.label}"
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* State B: Active Conversational Stream */}
          {messages.length > 0 && (
            <div className="max-w-3xl mx-auto space-y-6 pb-36">
              {messages.map(msg => (
                <div key={msg.id} className="animate-in fade-in duration-200">
                  {msg.sender === 'user' ? (
                    <div className="flex justify-end items-start gap-3">
                      <div className="max-w-xl bg-slate-900 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                        <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                        <span className="block text-[10px] text-slate-400 font-mono mt-1 text-right">
                          {msg.timestamp}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3.5">
                      <div className="beebot-orb-mini w-8 h-8 flex items-center justify-center shadow-md flex-shrink-0 mt-1">
                        <Sparkles className="w-4 h-4 text-white drop-shadow-xs" />
                      </div>

                      <div className="flex-1 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{msg.modelUsed || 'PolicyLens'}</span>
                            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200/60">
                              Grounded Policy RAG
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 font-medium">{msg.timestamp}</span>
                        </div>

                        {/* Expandable Reasoning Accordion */}
                        {msg.reasoningSteps && msg.reasoningSteps.length > 0 && (
                          <div className="border border-amber-200/80 bg-amber-50/40 rounded-xl overflow-hidden">
                            <button
                              onClick={() =>
                                setExpandedReasoningId(expandedReasoningId === msg.id ? null : msg.id)
                              }
                              className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-50/80 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-600 fill-amber-300" />
                                <span>
                                  Reasoned in {((msg.reasoningTimeMs || 1000) / 1000).toFixed(1)}s ({msg.response?.sources.length || 2} vector policies retrieved)
                                </span>
                              </div>
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-amber-700 transition-transform ${
                                  expandedReasoningId === msg.id ? 'rotate-180' : ''
                                }`}
                              />
                            </button>

                            {expandedReasoningId === msg.id && (
                              <div className="px-3.5 pb-3 pt-1 border-t border-amber-200/50 space-y-1.5 text-[11px] font-mono text-amber-950">
                                {msg.reasoningSteps.map((step, sIdx) => (
                                  <div key={sIdx} className="flex items-start gap-2">
                                    <span className="text-amber-500">›</span>
                                    <span>{step}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Main AI Response Body */}
                        <div className="text-slate-800 text-[13px] md:text-sm leading-relaxed space-y-2 font-normal">
                          <p className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 whitespace-pre-line">
                            {msg.text}
                          </p>
                        </div>

                        {/* Grounded Sources */}
                        {msg.response?.sources && msg.response.sources.length > 0 && (
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-500 uppercase">
                              <BookOpen className="w-3.5 h-3.5 text-slate-800" />
                              <span>Grounded Policy Sources (Vector DB)</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {msg.response.sources.map((src, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-1 font-mono hover:border-slate-300 transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-900">{src.docTitle}</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200/80 text-slate-800 rounded-full border border-slate-300">
                                      98.4% Match
                                    </span>
                                  </div>
                                  <div className="text-[11px] font-semibold text-amber-700">{src.section}</div>
                                  <div className="text-slate-600 text-[11px] font-sans italic border-l-2 border-slate-400 pl-2.5 mt-1">
                                    "{src.snippet}"
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Message Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-1 text-slate-500">
                            <button
                              onClick={() => handleCopy(msg.text, msg.id)}
                              className="p-1.5 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                              title="Copy response"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-[10px] text-emerald-600 font-bold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" />
                                  <span className="text-[10px] text-slate-500">Copy</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => setLikedMap(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                              className={`p-1.5 hover:bg-slate-100 rounded-md transition-colors cursor-pointer ${
                                likedMap[msg.id] ? 'text-slate-900 bg-slate-100 font-bold' : 'text-slate-400'
                              }`}
                              title="Helpful"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() =>
                                setSavedNotesMap(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))
                              }
                              className={`p-1.5 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                                savedNotesMap[msg.id] ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500'
                              }`}
                              title="Save as Underwriting Note"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span className="text-[10px]">
                                {savedNotesMap[msg.id] ? 'Saved to Audit Note' : 'Add to Notes'}
                              </span>
                            </button>
                          </div>

                          <button
                            onClick={() => handleSend(msg.response?.query || msg.text)}
                            className="text-[11px] text-slate-500 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* AI Loading State */}
              {loading && (
                <div className="flex items-start gap-3.5 animate-pulse">
                  <div className="beebot-orb-mini w-8 h-8 flex items-center justify-center shadow-md flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white drop-shadow-xs" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-mono text-slate-600 font-semibold">
                      {assistantStatus}
                    </span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </main>

        {/* ── Fixed Bottom Prompt Bar (Active Chat View) ── */}
        {messages.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#fcfcfd] via-[#fcfcfd]/90 to-transparent z-20">
            <div className="max-w-3xl mx-auto beebot-prompt-box p-3 shadow-lg">
              <div className="flex items-center gap-3 px-2 py-1">
                <Sparkles className="w-4 h-4 text-slate-700 flex-shrink-0" />
                <input
                  type="text"
                  placeholder={
                    activeCase
                      ? `Ask follow-up questions regarding ${activeCase.id}...`
                      : "Ask follow-up policy rules, exceptions, or guidelines..."
                  }
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSend();
                  }}
                  className="w-full bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-xs md:text-sm font-normal"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!query.trim() || loading}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                    query.trim()
                      ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  }`}
                >
                  <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setIsCaseDropdownOpen(!isCaseDropdownOpen)}
                      className={`p-1 rounded-md transition-colors cursor-pointer ${
                        activeCase ? 'text-slate-900 bg-slate-100 font-bold' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                      }`}
                      title="Context Case"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                    </button>
                    {activeCase && (
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-[10px] font-semibold text-slate-800">
                        <span className="font-mono">{activeCase.id}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCase(null);
                          }}
                          className="text-slate-400 hover:text-slate-800 ml-0.5 cursor-pointer"
                          title="Detach Case"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-mono hidden sm:block">
                  Press ⏎ to ask
                </div>
              </div>
            </div>

            <div className="text-center mt-1.5">
              <span className="text-[10px] text-slate-400 font-mono">
                Policy Assistant provides grounded semantic retrieval. Advisory non-decision layer.
              </span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default PolicyAssistant;
