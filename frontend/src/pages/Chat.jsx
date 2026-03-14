/**
 * pages/Chat.jsx — Main chat interface
 *
 * Orchestrates: Sidebar + Header + DisclaimerBanner + ChatWindow
 * Wires up: useChat, useLanguage, useSpeech hooks
 * Handles: URL param session loading (navigating to /chat/:sessionId)
 */

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import DisclaimerBanner from '../components/ui/DisclaimerBanner';
import ChatWindow from '../components/chat/ChatWindow';
import { useChat } from '../hooks/useChat';
import { useLanguage } from '../hooks/useLanguage';
import { useSpeech } from '../hooks/useSpeech';
import useChatStore from '../store/chatStore';

export default function Chat() {
  const { sessionId } = useParams();
  const { currentLanguage, bcp47 } = useLanguage();
  const { messages, isLoading, sendMessage, sendNotice, startNewChat } = useChat(currentLanguage);
  const { setActiveSession } = useChatStore();

  // Speech hooks — pass bcp47 so recognition uses correct accent
  const speechHooks = useSpeech(bcp47);

  // When user navigates to /chat/:sessionId, load that session
  useEffect(() => {
    if (sessionId) {
      setActiveSession(sessionId);
    }
  }, [sessionId, setActiveSession]);

  // Quick query from sidebar category chips
  const handleQuickQuery = (query) => {
    sendMessage(query);
  };

  return (
    <div className="flex h-screen bg-navy-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar onQuickQuery={handleQuickQuery} />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        <DisclaimerBanner />
        <Header />

        <main className="flex-1 overflow-hidden">
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            onSend={sendMessage}
            onNoticeUpload={sendNotice}
            speechHooks={speechHooks}
          />
        </main>
      </div>
    </div>
  );
}
