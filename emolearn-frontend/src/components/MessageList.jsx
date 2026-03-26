import React, { useEffect, useRef } from 'react';
import EmotionCard from './EmotionCard';

export default function MessageList({ messages, loading, onConfirm, onCorrect }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="chat-area">
      {messages.map((msg) => {
        if (msg.type === 'emotion') {
          return (
            <EmotionCard
              key={msg.id}
              msg={msg}
              onConfirm={onConfirm}
              onCorrect={onCorrect}
            />
          );
        }

          if (msg.type === 'checkin') {
          return (
            <div key={msg.id} className="msg-row fade-in">
              <div className="msg-avatar bot-av">🌿</div>
              <div className="bubble bubble-bot checkin-bubble">
                {msg.text}
              </div>
            </div>
          );
        }

        return (
          <div key={msg.id} className={`msg-row ${msg.role === 'user' ? 'msg-user' : ''} fade-in`}>
            {msg.role === 'bot' && <div className="msg-avatar bot-av">🌿</div>}
            <div className={`bubble ${msg.role === 'bot' ? 'bubble-bot' : 'bubble-user'}`}>
              {msg.text}
            </div>
            {msg.role === 'user' && (
              <div className="msg-avatar user-av">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 12C2 12 4 6 10 6C13 6 14.5 7 16 7C18 7 20 5 22 3C22 3 22 8 19 10C21 10 22 11 22 11C20 11 18.5 11.5 17 13C15 15.5 14 18 10 19C5.5 19 2 15.5 2 12Z" stroke="#ffffff" strokeWidth="1.3" strokeLinejoin="round"/>
                  <path d="M2 12C5 12 8 11 10 9" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>
            )}
          </div>
        );
      })}

      {loading && (
        <div className="msg-row fade-in">
          <div className="msg-avatar bot-av">🌿</div>
          <div className="thinking">
            <span /><span /><span />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
