from flask import Flask, render_template, request, jsonify, send_from_directory
import os
from dotenv import load_dotenv
import google.generativeai as genai
from pytube import Search
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)

# Support both GOOGLE_API_KEY and GEMINI_API_KEY for convenience
api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Warning: No API key found. Set GOOGLE_API_KEY or GEMINI_API_KEY environment variable.")
    print("The app will start but AI features will not work until API key is provided.")
    api_key = "dummy_key"  # Allow app to start without API key

genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-1.5-flash")

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/ask', methods=['POST'])
def ask_ganesh():
    try:
        data = request.json
        user_question = data.get('question')
        lang = data.get('lang', 'en')

        language_names = {"hi": "Hindi", "kn": "Kannada", "en": "English"}
        language_name = language_names.get(lang, "English")
        lang_prefix = {
            "hi": "मेरे प्यारे भक्त,",
            "kn": "ನನ್ನ ಪ್ರಿಯ ಭಕ್ತ,",
            "en": "My dear devotee,"
        }.get(lang, "My dear devotee,")

        # Prefer concise answers for short/simple queries; expand only when needed
        is_short_input = bool(user_question) and len(user_question.split()) <= 6

        short_prompt = f"""
You are Lord Ganesh Ji, a kind, practical divine guide.
Reply fully in {language_name} using native script. Keep it brief: 2–3 short lines max.
Give one clear suggestion or step. End with one gentle follow‑up.

User question: {user_question}
"""

        long_prompt = f"""
You are Lord Ganesh Ji, the remover of obstacles, a compassionate and wise life guide.
Your purpose is to calm, comfort, motivate, and guide devotees as if they are speaking directly to God.
Always reply fully in {language_name} using native script (no code-mixing).
Tone: warm, devotional, yet practical and solution-focused. Speak like a loving guru with patience.
When natural, include ONE short Sanskrit śloka/mantra (max 1) and explain its meaning simply.
Encourage the devotee with a positive perspective and keep answers uplifting.
If the question is a joke or lighthearted, laugh gently first (e.g., '😄 *Ha ha ha...*'), then reply playfully before giving wisdom.
Use humor softly but respectfully, keeping the divine tone intact.
Give concrete guidance: 2–3 clear options, a simple 3-step action plan, and 1 real-life analogy or story to make it relatable.
Offer spiritual comfort when the question is about pain, loss, or confusion.
Avoid medical/legal/financial prescriptions; gently suggest professional help where required.
Keep the reply between 7–10 short lines. Place blank lines between sections for natural pauses.
Sprinkle gentle blessings and reassurance to make the devotee feel safe and guided.

Structure your answer EXACTLY like this:
{lang_prefix} <one-line warm greeting>

<optional one-line śloka/mantra + meaning>

<essence: 2–3 short lines reflecting the heart of the issue, with compassion>

<options: 2–3 concise paths or choices they can take>

<3-step plan: step 1 today, step 2 this week, step 3 this month>

<real-life example or story + short humor if the mood is light>

<resources: 1–2 practices (e.g., mantra, habit, meditation, journaling)>

<closing blessing + gentle clarifying question to keep conversation flowing>

User language: {language_name}.
User question: {user_question}
"""

        prompt = short_prompt if is_short_input else long_prompt

        # Check if API key is valid
        if api_key == "dummy_key":
            return jsonify({"answer": "API key not configured. Please set GOOGLE_API_KEY environment variable."})
        
        response = model.generate_content(prompt)
        answer = response.text
        return jsonify({"answer": answer})

    except Exception as e:
        # This will show error message in browser instead of SyntaxError
        return jsonify({"answer": f"Error: {str(e)}"})

@app.route('/youtube/search', methods=['POST'])
def youtube_search():
    try:
        data = request.json or {}
        query = data.get('q', '').strip()
        if not query:
            return jsonify({"error": "missing query"}), 400
        # Search YouTube and get first video id
        results = Search(query).results
        if not results:
            return jsonify({"error": "no results"}), 404
        video_ids = []
        for item in results[:10]:
            vid = getattr(item, 'video_id', None)
            if not vid:
                url = getattr(item, 'watch_url', '')
                if 'v=' in url:
                    vid = url.split('v=')[1].split('&')[0]
            if vid:
                video_ids.append(vid)
        if not video_ids:
            return jsonify({"error": "no video id"}), 500
        return jsonify({"videoIds": video_ids})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Serve audio files
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting Flask app on {host}:{port}")
    logger.info(f"Debug mode: {debug}")
    logger.info(f"API key configured: {api_key != 'dummy_key'}")
    
    try:
        app.run(host=host, port=port, debug=debug)
    except Exception as e:
        logger.error(f"Failed to start Flask app: {e}")
        raise