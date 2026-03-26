# EmoLearn — Flask Backend

## Structure

```
emolearn-backend/
├── app.py              # Flask routes (/analyze, /confirm, /correct, /history, /stats)
├── emotion_engine.py   # Emotion detection — rule-based + scikit-learn correction loop
├── database.py         # SQLite schema + connection manager
├── requirements.txt    # Python dependencies
├── emolearn.db         # Auto-created on first run
└── models/             # Auto-created — stores per-user sklearn models
```

## Setup

### 1. Make sure Python is installed
```
python --version
```
Should return 3.8 or higher.

### 2. Create a virtual environment (recommended)
```
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
```

### 3. Install dependencies
```
pip install -r requirements.txt
```

### 4. Run the server
```
python app.py
```
Server starts at http://localhost:5000
Database and models/ folder are created automatically on first run.

## How the learning loop works

1. User sends a message → rule-based keyword detection runs first
2. If the user has a personal ML model with enough data → ML prediction runs instead
3. If user confirms → message added to training data (reinforces correct predictions)
4. If user corrects → correction stored in DB, ML model retrained immediately via SGDClassifier
5. Next time a similar message arrives → correction pattern matched first, then ML model

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/analyze` | Detect emotion in a message |
| POST | `/confirm` | User confirmed detection was correct |
| POST | `/correct` | User corrected detection — triggers retraining |
| GET  | `/history/:userId` | Last 20 messages for a user |
| GET  | `/stats/:userId` | Accuracy stats for the top bar |

## Running both frontend and backend

Open two terminals:

```
# Terminal 1
cd emolearn-backend
venv\Scripts\activate
python app.py

# Terminal 2
cd emolearnappli
npm run dev
```

Frontend runs on http://localhost:5173
Backend runs on http://localhost:5000
