from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def chat_with_ai(message, emotion, history):
    messages = [
        {
            "role": "system",
            "content": f"You are a warm, empathetic emotional support assistant. The user is feeling {emotion}. Be supportive, human, and gentle."
        }
    ]

    # Add history
    for h in history:
        messages.append({
            "role": h["role"],
            "content": h["content"]
        })

    # Add latest message
    messages.append({
        "role": "user",
        "content": message
    })

    completion = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=messages,
        temperature=0.7,
    )

    return completion.choices[0].message.content