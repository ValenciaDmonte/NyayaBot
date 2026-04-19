/**
 * components/layout/Sidebar.jsx
 *
 * Shows: new chat button, past sessions list, law category chips.
 * Collapsible on mobile.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, Scale, X, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import useChatStore from '../../store/chatStore';
import FindLawyerModal from '../ui/FindLawyerModal';

const LAW_CATEGORIES = [
  { code: 'BNS',          label: 'BNS 2023',          query: 'Explain the Bharatiya Nyaya Sanhita 2023' },
  { code: 'BNSS',         label: 'BNSS 2023',         query: 'Explain the Bharatiya Nagarik Suraksha Sanhita 2023' },
  { code: 'CONSTITUTION', label: 'Constitution',       query: 'What are fundamental rights under the Constitution of India?' },
  { code: 'RTI',          label: 'RTI Act',            query: 'How to file an RTI application?' },
  { code: 'CPA',          label: 'Consumer Protection',query: 'What are my rights under Consumer Protection Act 2019?' },
];

const LAW_CODE_TO_SPECIALIZATION = {
  BNS:          'criminal',
  BNSS:         'criminal',
  IPC:          'criminal',
  CONSTITUTION: 'constitutional',
  RTI:          'rti',
  CPA:          'consumer',
};

const SPEC_BUTTON_LABELS = {
  criminal:       'Find Criminal Lawyer',
  constitutional: 'Find Constitutional Lawyer',
  rti:            'Find RTI Lawyer',
  consumer:       'Find Consumer Lawyer',
};

function detectSpecialization(messages) {
  const counts = {};
  const recent = messages
    .filter((m) => m.role === 'assistant' && m.ragMetadata?.citations?.length > 0)
    .slice(-5);

  for (const msg of recent) {
    for (const cit of msg.ragMetadata.citations) {
      const spec = LAW_CODE_TO_SPECIALIZATION[cit.lawCode];
      if (spec) counts[spec] = (counts[spec] || 0) + 1;
    }
  }

  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top?.[0] || null;
}

export default function Sidebar({ onQuickQuery }) {
  const navigate = useNavigate();
  const { sessions, activeSessionId, isSidebarOpen, closeSidebar, messages } = useChatStore();
  const [showLawyerModal, setShowLawyerModal] = useState(false);

  const handleNewChat = () => {
    useChatStore.getState().setActiveSession(null);
    useChatStore.getState().clearMessages();
    navigate('/chat');
    closeSidebar();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed lg:relative top-0 left-0 h-full z-30
          w-72 bg-zinc-100 dark:bg-zinc-900
          border-r border-zinc-200 dark:border-zinc-800
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo + close button */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <Link to="/" className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-gold-600 dark:text-gold-500" />
            <span className="font-bold text-zinc-900 dark:text-white">NyayaBot</span>
          </Link>
          <button
            onClick={closeSidebar}
            className="lg:hidden text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat button */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 btn-secondary text-sm py-3"
          >
            <Plus className="w-4 h-4" />
            New Consultation
          </button>
        </div>

        {/* Law category quick-links */}
        <div className="px-3 pb-3">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wide mb-2 px-1">
            Quick Topics
          </p>
          <div className="space-y-1">
            {LAW_CATEGORIES.map(({ code, label, query }) => (
              <button
                key={code}
                onClick={() => { onQuickQuery?.(query); closeSidebar(); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                           text-zinc-700 dark:text-zinc-300
                           hover:bg-zinc-200 dark:hover:bg-zinc-800
                           hover:text-gold-600 dark:hover:text-gold-400
                           transition-colors text-left"
              >
                <span className="text-xs bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded font-mono">
                  {code}
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Find Lawyer button */}
        <div className="px-3 pb-3">
          <button
            onClick={() => { setShowLawyerModal(true); closeSidebar(); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium
                       bg-gold-500/12 dark:bg-gold-500/12 bg-gold-50
                       border border-gold-500/30 dark:border-gold-500/30 border-gold-200
                       text-gold-700 dark:text-gold-400
                       hover:bg-gold-500/20 dark:hover:bg-gold-500/20 hover:bg-gold-100
                       transition-colors"
          >
            <MapPin className="w-4 h-4 flex-shrink-0" />
            {SPEC_BUTTON_LABELS[detectSpecialization(messages)] ?? 'Find Lawyer Near Me'}
          </button>
        </div>

        <div className="border-t border-zinc-200 dark:border-zinc-800 mx-3" />

        {/* Chat history */}
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wide mb-2 px-1">
            Recent
          </p>
          {sessions.length === 0 ? (
            <p className="text-zinc-400 dark:text-zinc-500 text-sm text-center py-6">
              No consultations yet
            </p>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <Link
                  key={session._id}
                  to={`/chat/${session._id}`}
                  onClick={closeSidebar}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeSessionId === session._id
                      ? 'bg-gold-500/15 dark:bg-gold-500/15 bg-gold-50 text-gold-700 dark:text-gold-300 border border-gold-500/30 dark:border-gold-500/30 border-gold-200'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0 text-zinc-400 dark:text-zinc-500" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{session.title || 'Consultation'}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">
                      {session.lastMessageAt
                        ? formatDistanceToNow(new Date(session.lastMessageAt), { addSuffix: true })
                        : 'Just now'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </aside>

      {showLawyerModal && (
        <FindLawyerModal
          onClose={() => setShowLawyerModal(false)}
          specialization={detectSpecialization(messages)}
        />
      )}
    </>
  );
}
