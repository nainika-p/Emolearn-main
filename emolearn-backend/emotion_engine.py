import re
import pickle
import os
import spacy
from database import get_db

from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier

import nltk
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer

nltk.download('punkt', quiet=True)
nltk.download('punkt_tab', quiet=True)
nltk.download('stopwords', quiet=True)
nltk.download('wordnet', quiet=True)

# Load spaCy model
try:
    nlp = spacy.load('en_core_web_sm')
except OSError:
    print("spaCy model not found. Run: python -m spacy download en_core_web_sm")
    nlp = None

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

lemmatizer = WordNetLemmatizer()

EMOTION_KEYWORDS = {
    'anxiety':     ['nervous','worried','anxious','fear','scared','dread','panic',
                    'stress','stressed','dreading','apprehensive','present','tomorrow',
                    'deadline','exam','interview','meeting','what if','cant sleep'],
    'excitement':  ['excited','thrilled','pumped','amazing','cant wait','fantastic',
                    'awesome','stoked','hyped','opportunity','looking forward','can not wait'],
    'sadness':     ['sad','unhappy','depressed','miss','lonely','lost','grief','crying',
                    'heartbroken','miserable','down','blue','alone','empty','hollow'],
    'anger':       ['angry','furious','mad','hate','rage','annoyed','frustrated',
                    'unfair','ridiculous','livid','outraged','sick of','fed up'],
    'joy':         ['happy','joyful','wonderful','love','great','delighted','ecstatic',
                    'cheerful','glad','pleased','yay','grateful','blessed','content'],
    'frustration': ['stuck','ugh','nothing works','broken','again','why does',
                    'cant figure','keeps failing','give up','pointless','useless'],
    'pride':       ['proud','accomplished','achieved','nailed','succeeded','did it',
                    'finally','mastered','promoted','finished','completed'],
    'confusion':   ['confused','dont understand','lost','unclear','not sure',
                    'what does','how do','makes no sense','no idea','baffled'],
    'relief':      ['relieved','thank god','finally over','phew','glad its done',
                    'at last','so glad','weight lifted','over now'],
    'hopeful':     ['hope','maybe','could be','better days','trying','new start',
                    'perhaps','looking up','optimistic','things will'],
    'overwhelmed': ['too much','overwhelmed','cant handle','so much','drowning',
                    'overloaded','everything at once','piling up','cant cope'],
    'calm':        ['calm','peaceful','relaxed','fine','okay','alright','at ease',
                    'serene','content','settled','balanced'],
    'loneliness':  ['lonely','alone','no one','isolated','nobody','left out',
                    'by myself','no friends','disconnected','invisible'],
    'shame':       ['ashamed','embarrassed','humiliated','worthless','failure',
                    'stupid','idiot','hate myself','my fault','i failed'],
    'grief':       ['grieving','lost someone','passed away','died','death','mourning',
                    'miss them','gone forever','bereaved','funeral'],
    'jealousy':    ['jealous','envious','why them','not fair','they have','wish i had',
                    'comparing','left behind','others have'],
}

EMOTIONS = list(EMOTION_KEYWORDS.keys())

# Negation words that flip sentiment
NEGATIONS = {'not','no','never','neither','nor','hardly','barely','scarcely',"n't","dont","cant","wont"}

# Intensifiers that boost confidence
INTENSIFIERS = {'very','really','extremely','so','absolutely','completely','totally',
                'deeply','incredibly','overwhelmingly','terribly','awfully'}


def spacy_analyze(text):
    """Use spaCy for linguistic analysis — negation, intensity, entity detection."""
    if nlp is None:
        return {}, 1.0

    doc = nlp(text.lower())
    emotion_signals = {}
    intensity_multiplier = 1.0
    negated_tokens = set()

    # Find negated tokens using dependency parsing
    for token in doc:
        if token.dep_ == 'neg':
            # Mark the head and its children as negated
            negated_tokens.add(token.head.i)
            for child in token.head.children:
                negated_tokens.add(child.i)

    # Find intensifiers
    for token in doc:
        if token.text in INTENSIFIERS:
            intensity_multiplier = min(2.0, intensity_multiplier + 0.3)

    # Score emotions based on tokens, respecting negation
    for token in doc:
        if token.i in negated_tokens:
            continue
        lemma = token.lemma_
        for emotion, keywords in EMOTION_KEYWORDS.items():
            if lemma in keywords or token.text in keywords:
                emotion_signals[emotion] = emotion_signals.get(emotion, 0) + 2

    # Check noun chunks for multi-word expressions
    for chunk in doc.noun_chunks:
        chunk_text = chunk.text.lower()
        for emotion, keywords in EMOTION_KEYWORDS.items():
            for kw in keywords:
                if kw in chunk_text and len(kw.split()) > 1:
                    emotion_signals[emotion] = emotion_signals.get(emotion, 0) + 3

    return emotion_signals, intensity_multiplier


def rule_based_detect(text):
    lower = text.lower()
    scores = {e: 0 for e in EMOTIONS}
    for emotion, keywords in EMOTION_KEYWORDS.items():
        for kw in keywords:
            if kw in lower:
                scores[emotion] += 2
    best = max(scores, key=scores.get)
    best_score = scores[best]
    if best_score == 0:
        return 'calm', 45
    confidence = min(92, max(48, int((best_score / 20) * 100) + 35))
    return best, confidence


def preprocess(text):
    text = text.lower()
    text = re.sub(r"[^a-z\s']", '', text)
    tokens = word_tokenize(text)
    tokens = [lemmatizer.lemmatize(t) for t in tokens]
    return ' '.join(tokens)


def get_model_path(user_id):
    return os.path.join(MODELS_DIR, f'model_{user_id}.pkl')


def load_user_model(user_id):
    path = get_model_path(user_id)
    if os.path.exists(path):
        with open(path, 'rb') as f:
            return pickle.load(f)
    return None


def save_user_model(user_id, model):
    path = get_model_path(user_id)
    with open(path, 'wb') as f:
        pickle.dump(model, f)


def build_model():
    return Pipeline([
        ('tfidf', TfidfVectorizer(ngram_range=(1, 2), max_features=5000)),
        ('clf',   SGDClassifier(loss='modified_huber', random_state=42)),
    ])


def get_training_data(user_id):
    conn = get_db()
    rows = conn.execute(
        'SELECT message, emotion FROM training_data WHERE user_id = ?',
        (user_id,)
    ).fetchall()
    conn.close()
    return [r['message'] for r in rows], [r['emotion'] for r in rows]


def ml_detect(user_id, text):
    model = load_user_model(user_id)
    if model is None:
        return None, None
    X, y = get_training_data(user_id)
    if len(set(y)) < 2 or len(X) < 5:
        return None, None
    try:
        processed = preprocess(text)
        proba = model.predict_proba([processed])[0]
        classes = model.classes_
        best_idx = proba.argmax()
        emotion = classes[best_idx]
        confidence = int(proba[best_idx] * 100)
        return emotion, min(95, max(50, confidence))
    except Exception:
        return None, None


def detect_emotion(user_id, text):
    # 1. Check personal correction patterns first
    conn = get_db()
    pattern_key = text.lower().strip()[:80]
    correction = conn.execute(
        'SELECT correct_emotion FROM corrections WHERE user_id = ? AND message_pattern = ?',
        (user_id, pattern_key)
    ).fetchone()
    conn.close()

    if correction:
        return correction['correct_emotion'], 94, True

    # 2. Try personalized ML model
    ml_emotion, ml_conf = ml_detect(user_id, text)
    if ml_emotion and ml_conf and ml_conf > 60:
        return ml_emotion, ml_conf, False

    # 3. spaCy linguistic analysis
    spacy_signals, intensity = spacy_analyze(text)
    if spacy_signals:
        best = max(spacy_signals, key=spacy_signals.get)
        best_score = spacy_signals[best]
        confidence = min(92, max(52, int((best_score / 10) * 100 * intensity)))
        return best, confidence, False

    # 4. Rule-based fallback
    emotion, confidence = rule_based_detect(text)
    return emotion, confidence, False


def learn_from_correction(user_id, message, correct_emotion):
    conn = get_db()
    pattern_key = message.lower().strip()[:80]

    conn.execute('''
        INSERT INTO corrections (user_id, message_pattern, correct_emotion, count)
        VALUES (?, ?, ?, 1)
        ON CONFLICT(user_id, message_pattern)
        DO UPDATE SET correct_emotion = excluded.correct_emotion,
                      count = count + 1,
                      last_updated = CURRENT_TIMESTAMP
    ''', (user_id, pattern_key, correct_emotion))

    conn.execute(
        'INSERT INTO training_data (user_id, message, emotion, source) VALUES (?, ?, ?, ?)',
        (user_id, message, correct_emotion, 'correction')
    )
    conn.commit()

    X, y = get_training_data(user_id)
    if len(X) >= 5 and len(set(y)) >= 2:
        model = build_model()
        model.fit(X, y)
        save_user_model(user_id, model)
        print(f"Model retrained for {user_id} with {len(X)} samples.")

    conn.close()
