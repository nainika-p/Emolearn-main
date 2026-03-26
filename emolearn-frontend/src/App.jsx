import React, { useMemo, useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import Dashboard from './components/Dashboard';
import { useChat } from './hooks/useChat';
import './App.css';

function getUserId() {
  let id = localStorage.getItem('emo_user_id');
  if (!id) {
    id = 'user_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('emo_user_id', id);
  }
  return id;
}

export default function App() {
  const userId = useMemo(() => getUserId(), []);
  const { messages, loading, stats, sendMessage, handleConfirm, handleCorrect } = useChat(userId);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    if (window.Chart) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  return (
    <div className="app-shell" style={{ position: 'relative' }}>
      <TopBar stats={stats} onDashboard={() => setShowDashboard(true)} />
      <MessageList
        messages={messages}
        loading={loading}
        onConfirm={handleConfirm}
        onCorrect={handleCorrect}
      />
      <ChatInput onSend={sendMessage} disabled={loading} />
      {showDashboard && (
        <Dashboard userId={userId} onClose={() => setShowDashboard(false)} />
      )}
    </div>
  );
}