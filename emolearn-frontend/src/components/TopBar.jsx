import React from 'react';

export default function TopBar({ stats, onDashboard }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="bot-avatar">🌿</div>
        <div>
          <div className="bot-name">EmoLearn</div>
        </div>
      </div>
      {stats.total > 0 && (
        <div className="stats-pills">
          <span className="pill">
            <strong>{stats.total}</strong> msgs
          </span>
          <span className="pill">
            <strong>{stats.accuracy !== null ? `${stats.accuracy}%` : '—'}</strong> accurate
          </span>
          {stats.corrections > 0 && (
            <span className="pill pill-teal">
              <strong>{stats.corrections}</strong> corrections
            </span>
          )}
        </div>
      )}
      <button className="dash-btn" onClick={onDashboard}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="7" height="7" rx="1" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
          <rect x="14" y="3" width="7" height="7" rx="1" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
          <rect x="3" y="14" width="7" height="7" rx="1" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
          <rect x="14" y="14" width="7" height="7" rx="1" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
        </svg>
      </button>
    </header>
  );
}
