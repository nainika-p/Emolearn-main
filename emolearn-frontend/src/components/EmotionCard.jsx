import React, { useState, useEffect } from 'react';
import { emojiFor } from '../hooks/useChat';

const EMOTION_TREE = {
  'Positive': {
    icon: '🌤',
    subcategories: {
      'Joy & Happiness': ['joy','delight','elation','euphoria','bliss','contentment','cheerfulness','glee','jubilation','radiance'],
      'Love & Connection': ['love','affection','warmth','tenderness','adoration','fondness','devotion','cherishing','intimacy','belonging'],
      'Pride & Achievement': ['pride','accomplishment','confidence','triumph','satisfaction','fulfillment','self-worth','dignity','honor','empowerment'],
      'Hope & Optimism': ['hope','optimism','anticipation','eagerness','enthusiasm','inspiration','faith','assurance','excitement','motivation'],
      'Gratitude & Peace': ['gratitude','appreciation','serenity','peace','calm','tranquility','acceptance','relief','comfort','ease'],
    }
  },
  'Negative': {
    icon: '🌧',
    subcategories: {
      'Sadness & Loss': ['sadness','grief','heartbreak','longing','emptiness','sorrow','despair','bereavement','melancholy','desolation'],
      'Fear & Anxiety': ['anxiety','fear','dread','panic','terror','apprehension','nervousness','unease','worry','foreboding'],
      'Anger & Frustration': ['anger','frustration','rage','irritation','resentment','bitterness','hostility','fury','annoyance','indignation'],
      'Shame & Guilt': ['shame','guilt','remorse','regret','embarrassment','humiliation','self-blame','unworthiness','disgrace','mortification'],
      'Loneliness & Isolation': ['loneliness','isolation','abandonment','rejection','exclusion','disconnection','alienation','neglect','invisibility','estrangement'],
    }
  },
  'Complex': {
    icon: '🌀',
    subcategories: {
      'Mixed Feelings': ['ambivalence','conflict','confusion','overwhelm','numbness','disorientation','torn','unsettled','restlessness','turbulence'],
      'Nostalgia & Longing': ['nostalgia','longing','yearning','wistfulness','homesickness','reminiscence','bittersweetness','sentimentality','missing','pining'],
      'Existential': ['meaninglessness','existential dread','purposelessness','insignificance','disillusionment','nihilism','emptiness','lost','searching','questioning'],
      'Transition & Change': ['uncertainty','anticipatory grief','limbo','in-between','impermanence','letting go','surrender','transition','flux','metamorphosis'],
    }
  },
  'Social': {
    icon: '🤝',
    subcategories: {
      'Jealousy & Envy': ['jealousy','envy','comparison','inadequacy','resentment','covetousness','insecurity','rivalry','possessiveness','bitterness'],
      'Empathy & Compassion': ['empathy','compassion','sympathy','concern','care','protectiveness','solidarity','tenderness','moved','touched'],
      'Trust & Betrayal': ['betrayal','distrust','suspicion','hurt','disillusionment','broken trust','vulnerability','openness','safety','loyalty'],
      'Embarrassment & Awkwardness': ['embarrassment','awkwardness','self-consciousness','shyness','social anxiety','exposure','scrutiny','flustered','cringe','discomfort'],
    }
  },
  'Physical': {
    icon: '🫀',
    subcategories: {
      'Energy & Vitality': ['energized','alive','vibrant','strong','powerful','vigorous','refreshed','recharged','invigorated','awake'],
      'Exhaustion & Burnout': ['exhaustion','burnout','depletion','fatigue','drained','worn out','defeated','collapse','heaviness','shutdown'],
      'Tension & Stress': ['stress','tension','pressure','tightness','overwhelm','urgency','strain','overload','on edge','wound up'],
      'Comfort & Discomfort': ['discomfort','pain','unease','agitation','restlessness','nausea','comfort','warmth','safety','grounded'],
    }
  },
  'Existential': {
    icon: '🌌',
    subcategories: {
      'Identity & Self': ['lost identity','self-doubt','imposter syndrome','worthlessness','self-discovery','authenticity','self-acceptance','growth','becoming','clarity'],
      'Purpose & Meaning': ['purposeless','directionless','meaningful','driven','called','passionate','inspired','hollow','stagnant','evolving'],
      'Mortality & Impermanence': ['mortality awareness','fragility','time pressure','legacy','finitude','acceptance','fear of death','urgency','presence','surrender'],
      'Freedom & Responsibility': ['trapped','free','responsible','burdened','liberated','constrained','agency','powerless','autonomous','accountable'],
    }
  },
};

export default function EmotionCard({ msg, onConfirm, onCorrect }) {
  const [phase, setPhase] = useState('validate');
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [confWidth, setConfWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setConfWidth(msg.confidence), 120);
    return () => clearTimeout(t);
  }, [msg.confidence]);

  if (msg.resolved) return null;

  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const resetPicker = () => {
    setSelectedFamily(null);
    setSelectedSub(null);
    setSelectedEmotion(null);
  };

  return (
    <div className="msg-row">
      <div className="msg-avatar bot-av">🌿</div>
      <div className="emotion-card">

        <div className="emo-header">
          <span className="emo-icon">{emojiFor(msg.emotion)}</span>
          <div className="emo-meta">
            <div className="emo-name">{capitalize(msg.emotion)}</div>
            <div className="conf-row">
              <div className="conf-bar">
                <div className="conf-fill" style={{ width: `${confWidth}%` }} />
              </div>
              <span className="conf-pct">{msg.confidence}%</span>
            </div>
            {msg.usedCorrection && (
              <div className="learned-note">
                <CheckIcon /> using your correction
              </div>
            )}
          </div>
        </div>

        {phase === 'validate' && (
          <>
            <p className="emo-question">
              I'm picking up <strong>{msg.emotion}</strong> here. Does that feel right?
            </p>
            <div className="choice-row">
              <button className="choice-btn" onClick={() => onConfirm(msg.messageId, msg.emotion)}>Yes, exactly</button>
              <button className="choice-btn" onClick={() => { resetPicker(); setPhase('family'); }}>Partially</button>
              <button className="choice-btn" onClick={() => { resetPicker(); setPhase('family'); }}>Not quite</button>
            </div>
          </>
        )}

        {phase === 'family' && (
          <>
            <p className="emo-question">Let's find the right word. What general area feels closest?</p>
            <div className="emotion-chips">
              {Object.entries(EMOTION_TREE).map(([family, data]) => (
                <button
                  key={family}
                  className={`chip ${selectedFamily === family ? 'chip-selected' : ''}`}
                  onClick={() => { setSelectedFamily(family); setSelectedSub(null); setSelectedEmotion(null); setPhase('sub'); }}
                >
                  {data.icon} {family}
                </button>
              ))}
            </div>
          </>
        )}

        {phase === 'sub' && selectedFamily && (
          <>
            <p className="emo-question">
              <button className="back-btn" onClick={() => setPhase('family')}>← back</button>
              Within <strong>{selectedFamily}</strong>, what resonates most?
            </p>
            <div className="emotion-chips">
              {Object.keys(EMOTION_TREE[selectedFamily].subcategories).map((sub) => (
                <button
                  key={sub}
                  className={`chip ${selectedSub === sub ? 'chip-selected' : ''}`}
                  onClick={() => { setSelectedSub(sub); setSelectedEmotion(null); setPhase('specific'); }}
                >
                  {sub}
                </button>
              ))}
            </div>
          </>
        )}

        {phase === 'specific' && selectedFamily && selectedSub && (
          <>
            <p className="emo-question">
              <button className="back-btn" onClick={() => setPhase('sub')}>← back</button>
              Which of these best captures it?
            </p>
            <div className="emotion-chips">
              {EMOTION_TREE[selectedFamily].subcategories[selectedSub].map((emotion) => (
                <button
                  key={emotion}
                  className={`chip ${selectedEmotion === emotion ? 'chip-selected' : ''}`}
                  onClick={() => setSelectedEmotion(emotion)}
                >
                  {emojiFor(emotion)} {emotion}
                </button>
              ))}
            </div>
            <button
              className="confirm-btn"
              disabled={!selectedEmotion}
              onClick={() => onCorrect(msg.messageId, msg.emotion, selectedEmotion)}
            >
              Confirm — it's {selectedEmotion || '...'}
            </button>
          </>
        )}

      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ display: 'inline', marginRight: 3 }}>
      <circle cx="5" cy="5" r="4.5" stroke="#1D9E75" />
      <path d="M3 5.5L4.2 6.7L7 4" stroke="#1D9E75" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
