import os
from groq import Groq
from flask import Flask, request, jsonify
from flask_cors import CORS
from database import init_db, get_db
from emotion_engine import detect_emotion, learn_from_correction

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:5174"])

# Initialize DB on startup
init_db()


# ── POST /analyze ──────────────────────────────────────────────
# Receive a message, run emotion detection, store and return result
@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json()
    user_id = data.get('user_id', '').strip()
    message = data.get('message', '').strip()

    if not user_id or not message:
        return jsonify({'error': 'user_id and message are required'}), 400

    emotion, confidence, used_correction = detect_emotion(user_id, message)

    conn = get_db()
    cursor = conn.execute(
        '''INSERT INTO messages (user_id, message, detected, confidence)
           VALUES (?, ?, ?, ?)''',
        (user_id, message, emotion, confidence)
    )
    message_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({
        'message_id':      message_id,
        'emotion':         emotion,
        'confidence':      confidence,
        'used_correction': used_correction,
    })


# ── POST /confirm ──────────────────────────────────────────────
# User confirmed the detected emotion was correct
@app.route('/confirm', methods=['POST'])
def confirm():
    data = request.get_json()
    user_id   = data.get('user_id', '').strip()
    message_id = data.get('message_id')

    if not user_id or not message_id:
        return jsonify({'error': 'user_id and message_id are required'}), 400

    conn = get_db()
    row = conn.execute(
        'SELECT message, detected FROM messages WHERE id = ? AND user_id = ?',
        (message_id, user_id)
    ).fetchone()

    if not row:
        conn.close()
        return jsonify({'error': 'Message not found'}), 404

    conn.execute(
        'UPDATE messages SET confirmed = 1, final = detected WHERE id = ?',
        (message_id,)
    )

    # Add confirmed data to training set too — reinforces correct predictions
    conn.execute(
        'INSERT INTO training_data (user_id, message, emotion, source) VALUES (?, ?, ?, ?)',
        (user_id, row['message'], row['detected'], 'confirmation')
    )

    conn.commit()
    conn.close()

    return jsonify({'ok': True})


# ── POST /correct ──────────────────────────────────────────────
# User corrected the detected emotion — trigger learning
@app.route('/correct', methods=['POST'])
def correct():
    data = request.get_json()
    user_id          = data.get('user_id', '').strip()
    message_id       = data.get('message_id')
    corrected_emotion = data.get('corrected_emotion', '').strip()

    if not all([user_id, message_id, corrected_emotion]):
        return jsonify({'error': 'user_id, message_id and corrected_emotion are required'}), 400

    conn = get_db()
    row = conn.execute(
        'SELECT message, detected FROM messages WHERE id = ? AND user_id = ?',
        (message_id, user_id)
    ).fetchone()

    if not row:
        conn.close()
        return jsonify({'error': 'Message not found'}), 404

    conn.execute(
        'UPDATE messages SET corrected = 1, final = ? WHERE id = ?',
        (corrected_emotion, message_id)
    )
    conn.commit()
    conn.close()

    # Trigger learning in emotion engine
    learn_from_correction(user_id, row['message'], corrected_emotion)

    return jsonify({'ok': True})


# ── GET /history/<user_id> ─────────────────────────────────────
# Return last 20 messages for a user
@app.route('/history/<user_id>', methods=['GET'])
def history(user_id):
    conn = get_db()
    rows = conn.execute(
        '''SELECT id, message, detected, final, confidence, corrected, confirmed, timestamp
           FROM messages WHERE user_id = ?
           ORDER BY timestamp DESC LIMIT 20''',
        (user_id,)
    ).fetchall()
    conn.close()

    return jsonify([dict(r) for r in rows])


# ── GET /stats/<user_id> ───────────────────────────────────────
# Return accuracy stats for the top bar
@app.route('/stats/<user_id>', methods=['GET'])
def stats(user_id):
    conn = get_db()

    total = conn.execute(
        'SELECT COUNT(*) as c FROM messages WHERE user_id = ? AND (confirmed = 1 OR corrected = 1)',
        (user_id,)
    ).fetchone()['c']

    corrections = conn.execute(
        'SELECT COUNT(*) as c FROM messages WHERE user_id = ? AND corrected = 1',
        (user_id,)
    ).fetchone()['c']

    conn.close()

    accuracy = round(((total - corrections) / total) * 100) if total > 0 else None

    return jsonify({
        'total':       total,
        'corrections': corrections,
        'accuracy':    accuracy,
    })

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    message = data.get('message', '')
    emotion  = data.get('emotion', '')
    history  = data.get('history', [])

    client = Groq(api_key=os.getenv('GROQ_API_KEY'))

    system = f"""You are EmoLearn, a warm and emotionally intelligent companion.
The user's current detected emotion is: {emotion}.
Respond naturally and conversationally — give real advice, ask meaningful follow-up questions, and never repeat yourself.
Keep responses concise (2-3 sentences max). Never mention that you are an AI."""

    messages = [{"role": "system", "content": system}]
    for m in history:
        messages.append({"role": m['role'], "content": m['content']})
    messages.append({"role": "user", "content": message})

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=messages,
        max_tokens=300,
    )

    return jsonify({'reply': response.choices[0].message.content})

@app.route('/dashboard/<user_id>', methods=['GET'])
def dashboard(user_id):
    conn = get_db()

    # All messages with final emotion and timestamp
    rows = conn.execute(
        '''SELECT final, detected, corrected, confirmed, timestamp
           FROM messages
           WHERE user_id = ? AND (confirmed = 1 OR corrected = 1)
           ORDER BY timestamp ASC''',
        (user_id,)
    ).fetchall()

    # Emotion frequency count
    freq = {}
    timeline = []
    correct_streak = 0
    accuracy_over_time = []
    total = 0
    correct = 0

    for r in rows:
        emotion = r['final'] or r['detected']
        if not emotion:
            continue
        freq[emotion] = freq.get(emotion, 0) + 1
        timeline.append({
            'emotion': emotion,
            'corrected': bool(r['corrected']),
            'timestamp': r['timestamp'],
        })
        total += 1
        if not r['corrected']:
            correct += 1
        accuracy_over_time.append({
            'timestamp': r['timestamp'],
            'accuracy': round((correct / total) * 100),
        })

    conn.close()
    return jsonify({
        'frequency': freq,
        'timeline':  timeline,
        'accuracy_over_time': accuracy_over_time,
        'total': total,
        'corrections': total - correct,
        'accuracy': round((correct / total) * 100) if total > 0 else None,
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
