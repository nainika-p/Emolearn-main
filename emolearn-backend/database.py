import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'emolearn.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Stores every message sent by a user
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     TEXT    NOT NULL,
            message     TEXT    NOT NULL,
            detected    TEXT    NOT NULL,
            final       TEXT,
            confidence  INTEGER NOT NULL,
            corrected   INTEGER DEFAULT 0,
            confirmed   INTEGER DEFAULT 0,
            timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Stores per-user correction patterns for personalized learning
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS corrections (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         TEXT NOT NULL,
            message_pattern TEXT NOT NULL,
            correct_emotion TEXT NOT NULL,
            count           INTEGER DEFAULT 1,
            last_updated    DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, message_pattern)
        )
    ''')

    # Stores per-user model training data for scikit-learn
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS training_data (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id   TEXT NOT NULL,
            message   TEXT NOT NULL,
            emotion   TEXT NOT NULL,
            source    TEXT DEFAULT 'correction',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    conn.close()
    print("Database initialized.")
