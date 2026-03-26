import { useState, useCallback, useRef } from 'react';
import { api } from '../api/client';

export function useChat(userId) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'bot',
      type: 'text',
      text: "Hey, how are you feeling today?",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, corrections: 0, accuracy: null });
  const lastMessageRef = useRef('');
  const awaitingCheckinRef = useRef(false);
  const emotionCountRef = useRef(0);
  const recentEmotionsRef = useRef([]);

  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), ...msg }]);
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const data = await api.stats(userId);
      setStats(data);
    } catch (_) {}
  }, [userId]);

  const getHistory = useCallback((currentMessages) => {
    return currentMessages
      .filter((m) => m.type === 'text' && m.text && !m.text.startsWith('✓'))
      .slice(-6)
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));
  }, []);

  const sendMessage = useCallback(
    async (text) => {
      if (loading || !text.trim()) return;
      lastMessageRef.current = text;
      addMessage({ role: 'user', type: 'text', text });
      setLoading(true);

      if (awaitingCheckinRef.current) {
        awaitingCheckinRef.current = false;
        try {
          const unique = recentEmotionsRef.current;
          const summaryPrompt = `The user has been on an emotional journey through: ${unique.join(', ')}. They just shared: "${text}".

Write a warm flowing paragraph (no bullet points, no numbering):
- Gently name and validate the emotions they have been carrying — make them feel truly seen and understood.
- Give one specific actionable suggestion they can do today to take care of themselves.
- Close with a warm reassuring line reminding them that EmoLearn is always here for them, ready to listen whenever they need.

Tone: like a wise caring friend. Warm, human, hopeful. 3-4 sentences total. Never mention you are an AI.`;
          const data = await api.chat(userId, summaryPrompt, unique[0] || 'mixed', []);
          addMessage({ role: 'bot', type: 'text', text: data.reply });
        } catch (err) {
          addMessage({ role: 'bot', type: 'text', text: "Thank you for sharing that. Be gentle with yourself today — EmoLearn is always here for you. 🌿" });
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        const data = await api.analyze(userId, text);
        addMessage({
          role: 'bot',
          type: 'emotion',
          messageId: data.message_id,
          emotion: data.emotion,
          confidence: data.confidence,
          usedCorrection: data.used_correction,
          originalText: text,
        });
      } catch (err) {
        addMessage({ role: 'bot', type: 'text', text: `Something went wrong: ${err.message}` });
      } finally {
        setLoading(false);
      }
    },
    [loading, userId, addMessage, messages]
  );

  const afterEmotionResolved = useCallback(
    async (emotion) => {
      emotionCountRef.current += 1;
      recentEmotionsRef.current = [...recentEmotionsRef.current, emotion].slice(-4);
      await refreshStats();

      if (emotionCountRef.current % 4 === 0) {
        // Trigger check-in — no API chat, just the question
        const unique = [...new Set(recentEmotionsRef.current)];
        const text =
          unique.length === 1
            ? `I've noticed you've been feeling ${unique[0]} through our conversation. How are you feeling right now, stepping back from everything?`
            : `We've moved through ${unique.join(', ')} together. That's a lot to carry. How are you feeling right now, stepping back from it all?`;
        awaitingCheckinRef.current = true;
        addMessage({ role: 'bot', type: 'checkin', text });
      } else {
        const history = getHistory(messages);
        api.chat(userId, lastMessageRef.current, emotion, history)
          .then((chatData) => {
            addMessage({ role: 'bot', type: 'text', text: chatData.reply });
          })
          .catch((err) => console.error('Chat API error:', err));
      }
    },
    [userId, addMessage, refreshStats, getHistory, messages]
  );

  const handleConfirm = useCallback(
    async (messageId, emotion) => {
      setMessages((prev) =>
        prev.map((m) => (m.messageId === messageId ? { ...m, resolved: true } : m))
      );
      addMessage({ role: 'user', type: 'text', text: '✓ Yes, exactly' });
      setLoading(true);
      try {
        await api.confirm(userId, messageId);
        await afterEmotionResolved(emotion);
      } catch (err) {
        addMessage({ role: 'bot', type: 'text', text: `Error confirming: ${err.message}` });
      } finally {
        setLoading(false);
      }
    },
    [userId, addMessage, afterEmotionResolved]
  );

  const handleCorrect = useCallback(
    async (messageId, detectedEmotion, correctedEmotion) => {
      setMessages((prev) =>
        prev.map((m) => (m.messageId === messageId ? { ...m, resolved: true } : m))
      );
      addMessage({ role: 'user', type: 'text', text: `${emojiFor(correctedEmotion)} ${correctedEmotion}` });
      setLoading(true);
      try {
        await api.correct(userId, messageId, correctedEmotion);
        addMessage({
          role: 'bot',
          type: 'text',
          text: `Got it — noted as ${correctedEmotion}, not ${detectedEmotion}. I'll keep learning. 🌱`,
        });
        await afterEmotionResolved(correctedEmotion);
      } catch (err) {
        addMessage({ role: 'bot', type: 'text', text: `Error saving correction: ${err.message}` });
      } finally {
        setLoading(false);
      }
    },
    [userId, addMessage, afterEmotionResolved]
  );

  return { messages, loading, stats, sendMessage, handleConfirm, handleCorrect };
}

export function emojiFor(name) {
  const EMOTION_EMOJIS = {
    anxiety: '😰', excitement: '🤩', sadness: '😢', anger: '😤',
    joy: '😊', frustration: '😩', pride: '😌', confusion: '🤔',
    relief: '😮‍💨', hopeful: '🌱', overwhelmed: '🌀', calm: '🌊',
  };
  return EMOTION_EMOJIS[name] || '💭';
}