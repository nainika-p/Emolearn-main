import React, { useState, useRef } from 'react';

export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  const handleSend = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    setValue(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    }
  };

  return (
    <div className="input-area">
      <textarea
        ref={textareaRef}
        className="chat-input"
        rows={1}
        placeholder="Tell me how you're feeling…"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKey}
        disabled={disabled}
      />
      <button className="send-btn" onClick={handleSend} disabled={disabled || !value.trim()}>
        <SendIcon />
      </button>
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M14 8L2 2L5.5 8L2 14L14 8Z" fill="#E1F5EE" />
    </svg>
  );
}
