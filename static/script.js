// Ganesh Ji Divine Guide - Voice-Only Interface with Background Music
// Calming and serene experience focused on voice interaction

// DOM Elements
const toggleWake = document.getElementById('toggleWake');
const stopAll = document.getElementById('stopAll');
const langSelect = document.getElementById('lang');
const statusText = document.getElementById('statusText');
const statusCircle = document.getElementById('statusCircle');
const ganeshImg = document.getElementById('ganesh-img');
const ganeshOverlay = document.getElementById('ganesh-overlay');
const backgroundMusic = document.getElementById('background-music');
const musicToggle = document.getElementById('musicToggle');
const conversationLog = document.getElementById('conversationLog');
const textAskForm = document.getElementById('textAskForm');
const textAskInput = document.getElementById('textAskInput');
const ytContainer = document.getElementById('yt-embed');
let ytPlayer = null;

// YouTube Iframe API hook
window.onYouTubeIframeAPIReady = function() {
  const el = document.getElementById('yt-player');
  if (el) {
    ytPlayer = new YT.Player('yt-player', {
      height: '360',
      width: '640',
      videoId: '',
      playerVars: { 'autoplay': 1, 'controls': 1, 'rel': 0, 'playsinline': 1 },
    });
  }
};

// State Management
let wakeRec = null;
let activeRec = null;
let isWakeRunning = false;
let isActiveListening = false;
let currentLang = 'en';
let isMusicPlaying = false;
let isSpeaking = false;

// Language Configuration
const LANG_CONFIG = {
  'en': { 
    wakeWords: ['hey ganesh', 'hey ganesha'], 
    lang: 'en-US',
    ttsVoiceHint: 'en',
    messages: {
      startListening: 'Tap Ganesh to begin',
      listening: 'Listening...',
      activeListening: 'Listening to your question...',
      processing: 'Processing your question...',
      ready: 'Ready to listen'
    }
  },
  'hi': { 
    wakeWords: ['हे गणेश', 'हे गणेशा'], 
    lang: 'hi-IN',
    ttsVoiceHint: 'hi',
    messages: {
      startListening: 'शुरू करने के लिए गणेश जी पर टैप करें',
      listening: 'सुन रहे हैं...',
      activeListening: 'आपके प्रश्न को सुन रहे हैं...',
      processing: 'आपका प्रश्न प्रोसेस कर रहे हैं...',
      ready: 'सुनने के लिए तैयार'
    }
  },
  'kn': { 
    wakeWords: ['ಹೇ ಗಣೇಶ', 'ಹೇ ಗಣೇಶಾ'], 
    lang: 'kn-IN',
    ttsVoiceHint: 'kn',
    messages: {
      startListening: 'ಪ್ರಾರಂಭಿಸಲು ಗಣೇಶನನ್ನು ಟ್ಯಾಪ್ ಮಾಡಿ',
      listening: 'ಶ್ರವಣಿಸುತ್ತಿದೆ...',
      activeListening: 'ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳುತ್ತಿದೆ...',
      processing: 'ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸುತ್ತಿದೆ...',
      ready: 'ಕೇಳಲು ಸಿದ್ಧ'
    }
  }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  console.log('Ganesh Ji Divine Guide - Initializing...');
  initializeApp();
  setupEventListeners();
  startBackgroundMusic();
  // Try to resume speech synthesis if suspended
  try { window.speechSynthesis.resume(); } catch(_) {}
  console.log('Initialization complete');
});

function initializeApp() {
  console.log('Initializing app...');
  
  // Check browser support
  if (!supportsSpeechRecognition()) {
    console.log('Speech Recognition not supported');
    updateStatus('Speech Recognition not supported. Please use Chrome or Edge.', 'error');
    return;
  }
  
  console.log('Speech Recognition supported');
  // Warm up voices for TTS
  if ('speechSynthesis' in window) {
    const ensureVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (!v || v.length === 0) {
        setTimeout(ensureVoices, 200);
      }
    };
    ensureVoices();
  }
  
  // Set initial language
  currentLang = langSelect.value;
  updateLanguageSettings();
  
  // Initialize UI state
  updateStatus(LANG_CONFIG[currentLang].messages.startListening);
  
  // No auto-voice on load; greeting will play when Ganesh is tapped
  
  console.log('App initialized successfully');
}

function setupEventListeners() {
  // Button events
  toggleWake.addEventListener('click', toggleWakeWord);
  stopAll.addEventListener('click', stopAllListening);
  
  // Language change
  langSelect.addEventListener('change', function() {
    currentLang = this.value;
    updateLanguageSettings();
    updateStatus(LANG_CONFIG[currentLang].messages.startListening);
  });
  
  // Music control
  musicToggle.addEventListener('click', toggleBackgroundMusic);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if (e.code === 'Space' && e.ctrlKey) {
      e.preventDefault();
      toggleWakeWord();
    }
    if (e.code === 'Escape') {
      stopAllListening();
    }
    if (e.code === 'KeyM' && e.ctrlKey) {
      e.preventDefault();
      toggleBackgroundMusic();
    }
  });

  // Tap Ganesh to speak greeting, then start direct active listening (no wake-word)
  ganeshImg?.addEventListener('click', async function() {
    if (!isActiveListening && !isSpeaking) {
      try { await speakGreeting(); } catch(_) {}
      setTimeout(() => startActiveListen(), 700);
    }
  });

  // Text ask submit
  textAskForm?.addEventListener('submit', function(e){
    e.preventDefault();
    const q = (textAskInput?.value || '').trim();
    if (!q) return;
    appendToLog('You', q);
    textAskInput.value = '';
    // If this is a play request, open YouTube instead of asking backend
    if (isPlayRequest(q)) {
      const query = extractPlayQuery(q) || q;
      openYouTubeSearch(query);
      speakResponse('Opening on YouTube.');
      return;
    }
    // Directly process and speak reply
    processQuestion(q);
  });
}

// Background Music Functions
function startBackgroundMusic() {
  if (!backgroundMusic) {
    console.log('Background music element missing');
    return;
  }
  // Ensure sources are loaded before play
  const hasSource = backgroundMusic.querySelector('source') !== null;
  if (!hasSource) {
    console.log('No audio source found');
    return;
  }
  try {
    backgroundMusic.load();
  } catch(_) {}
  backgroundMusic.volume = 0.08;
  backgroundMusic.play().then(() => {
    isMusicPlaying = true;
    musicToggle?.classList.add('playing');
  }).catch(e => {
    console.log('Background music will start after user interaction');
  });
}

function toggleBackgroundMusic() {
  if (!backgroundMusic || !backgroundMusic.src) {
    console.log('Background music not available');
    return;
  }
  
  if (isMusicPlaying) {
    backgroundMusic.pause();
    musicToggle.classList.remove('playing');
    isMusicPlaying = false;
  } else {
    // Ensure loaded before playing
    try { backgroundMusic.load(); } catch(_) {}
    backgroundMusic.play().then(() => {
      musicToggle.classList.add('playing');
      isMusicPlaying = true;
    }).catch(e => {
      console.log('Could not start music:', e);
      // Hide music button if music is not available
      musicToggle.style.display = 'none';
    });
  }
}

// Speech Recognition Support Check
function supportsSpeechRecognition() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// Wake Word Detection
function startWake() {
  // Directly start active listening instead of wake-word detection
  startActiveListen();
}

function stopWake() {
  if (wakeRec) {
    wakeRec.onend = null;
    wakeRec.stop();
    wakeRec = null;
  }
  
  isWakeRunning = false;
  updateStatus(LANG_CONFIG[currentLang].messages.ready);
  updateStatusCircle(false);
  toggleWake.disabled = false;
  stopAll.disabled = true;
}

function checkWakeWord(text) {
  const wakeWords = LANG_CONFIG[currentLang].wakeWords;
  
  for (const wakeWord of wakeWords) {
    if (text.includes(wakeWord)) {
      startActiveListen();
      return;
    }
  }
}

// Active Listening
function startActiveListen() {
  if (isActiveListening) return;
  
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  activeRec = new SR();
  
  activeRec.continuous = false;
  activeRec.interimResults = true;
  activeRec.lang = LANG_CONFIG[currentLang].lang;
  
  activeRec.onstart = () => {
    isActiveListening = true;
    updateStatus(LANG_CONFIG[currentLang].messages.activeListening);
    updateStatusCircle(true);
    ganeshImg.classList.add('speaking');
    if (ganeshOverlay) { ganeshOverlay.style.display = 'block'; }
  };
  
  activeRec.onresult = (evt) => {
    let finalText = '';
    
    for (let i = 0; i < evt.results.length; i++) {
      const result = evt.results[i];
      if (result.isFinal) {
        finalText += result[0].transcript;
      }
    }
    
    if (finalText) {
      appendToLog('You', finalText);
      if (isPlayRequest(finalText)) {
        const query = extractPlayQuery(finalText) || finalText;
        openYouTubeSearch(query);
        speakResponse('Opening on YouTube.');
      } else {
        processQuestion(finalText);
      }
    }
  };
  
  activeRec.onerror = (e) => {
    console.error('Active listening error:', e);
    updateStatus('Listening error. Please try again.', 'error');
    stopActiveListen();
    if (ganeshOverlay) { ganeshOverlay.style.display = 'none'; }
  };
  
  activeRec.onend = () => {
    stopActiveListen();
    if (ganeshOverlay) { ganeshOverlay.style.display = 'none'; }
  };
  
  activeRec.start();
}

function stopActiveListen() {
  if (activeRec) {
    activeRec.stop();
    activeRec = null;
  }
  
  isActiveListening = false;
  updateStatusCircle(false);
  ganeshImg.classList.remove('speaking');
}

// Question Processing
async function processQuestion(question) {
  updateStatus(LANG_CONFIG[currentLang].messages.processing);
  
  try {
    const response = await fetch('/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: question,
        lang: currentLang
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Speak the response immediately (voice-only)
    speakResponse(data.answer);
    appendToLog('Ganesh Ji', data.answer);
    
  } catch (error) {
    console.error('Error processing question:', error);
    speakResponse('Sorry, I encountered an error. Please try again.');
  }
}

// Text-to-Speech
function speakResponse(text) {
  if (!('speechSynthesis' in window)) {
    updateStatus('Text-to-speech not supported in this browser.');
    return;
  }

  const trySpeak = (attempt = 0) => {
    try { window.speechSynthesis.resume(); } catch(_) {}
    window.speechSynthesis.cancel();

    const cfg = LANG_CONFIG[currentLang];
    const paced = (text || '').replaceAll('\n\n', '. . . ');
    const utterance = new SpeechSynthesisUtterance(paced);
    utterance.lang = cfg.lang;
    
    let voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) {
      // voices not ready yet; retry once shortly
      if (attempt < 2) {
        setTimeout(() => trySpeak(attempt + 1), 300);
        return;
      }
    } else {
      // Prefer male voices per language; fall back sensibly
      const lower = s => (s || '').toLowerCase();
      const byLang = voices.filter(v => lower(v.lang).startsWith(lower(cfg.ttsVoiceHint)) || lower(v.lang) === lower(cfg.lang));
      const preferredByName = (names) => byLang.find(v => names.some(n => lower(v.name).includes(lower(n))));

      let chosen = null;
      if (currentLang === 'hi') {
        chosen = preferredByName(['hemant','ravi','male','india','hindi','हिन्दी','हिंदी']);
      } else if (currentLang === 'kn') {
        chosen = preferredByName(['girish','male','kannada','ಕನ್ನಡ']);
      } else if (currentLang === 'en') {
        chosen = preferredByName(['male','ravi','george','microsoft','google']);
      }
      // Generic fallbacks
      chosen = chosen
        || byLang.find(v => lower(v.name).includes('male'))
        || byLang[0]
        || voices.find(v => lower(v.lang).startsWith('en-in'))
        || voices.find(v => lower(v.lang).startsWith('en'));

      if (chosen) {
        utterance.voice = chosen;
        utterance.lang = chosen.lang || utterance.lang;
      } else {
        // last resort so something is audible
        utterance.lang = 'en-US';
      }
    }

    utterance.rate = 0.85;
    utterance.pitch = 0.95;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      isSpeaking = true;
      ganeshImg.classList.add('speaking');
      document.body.classList.add('speaking');
      updateStatus('Ganesh Ji is speaking...');
      if (ganeshOverlay) { ganeshOverlay.style.display = 'block'; }
    };
    utterance.onend = () => {
      isSpeaking = false;
      ganeshImg.classList.remove('speaking');
      document.body.classList.remove('speaking');
      updateStatus(LANG_CONFIG[currentLang].messages.ready);
      if (ganeshOverlay) { ganeshOverlay.style.display = 'none'; }
    };
    utterance.onerror = (e) => {
      isSpeaking = false;
      console.error('Speech synthesis error:', e);
      ganeshImg.classList.remove('speaking');
      document.body.classList.remove('speaking');
      updateStatus('Speech error. Please try again.');
      if (ganeshOverlay) { ganeshOverlay.style.display = 'none'; }
    };

    // slight delay helps on some browsers after resume/cancel
    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error('speak() failed', e);
        if (attempt < 2) setTimeout(() => trySpeak(attempt + 1), 300);
      }
    }, 100);
  };

  trySpeak(0);
}

// UI Updates
function updateStatus(message) {
  statusText.textContent = message;
}

function updateStatusCircle(active) {
  statusCircle.classList.toggle('active', active);
}

function updateLanguageSettings() {
  console.log(`Language updated to: ${currentLang}`);
}

// Control Functions
function toggleWakeWord() {
  if (isWakeRunning) {
    stopWake();
  } else {
    startWake();
  }
}

function stopAllListening() {
  stopWake();
  stopActiveListen();
  updateStatus(LANG_CONFIG[currentLang].messages.ready);
}

// Welcome Message
function showWelcomeMessage() {
  // Requested startup line (spoken): "बोलो भक्त, मैं तुम्हारी कैसी सहायता करूँ?"
  const hindiWelcome = 'कैसे हो भक्त, बोलो क्या मदद चाहते हो?';
  speakResponse(hindiWelcome);
}

async function speakGreeting() {
  return new Promise((resolve) => {
    const line = 'कैसे हो भक्त, बोलो क्या मदद चाहते हो';
    const cfg = LANG_CONFIG[currentLang];
    const utter = new SpeechSynthesisUtterance(line);
    utter.lang = 'hi-IN';
    utter.rate = 0.9; utter.pitch = 1.0; utter.volume = 1.0;
    const done = () => resolve();
    let voices = window.speechSynthesis.getVoices();
    const pick = voices.find(v => (v.lang||'').toLowerCase().startsWith('hi'))
              || voices.find(v => (v.lang||'').toLowerCase() === 'hi-in')
              || voices.find(v => (v.lang||'').toLowerCase().startsWith('en-in'))
              || voices.find(v => (v.lang||'').toLowerCase().startsWith('en'));
    if (pick) utter.voice = pick;
    utter.onend = done;
    try { window.speechSynthesis.resume(); } catch(_) {}
    try { window.speechSynthesis.cancel(); } catch(_) {}
    setTimeout(() => window.speechSynthesis.speak(utter), 60);
  });
}

// Error Handling
window.addEventListener('error', function(e) {
  console.error('Global error:', e);
  updateStatus('An unexpected error occurred. Please refresh the page.');
});

// Auto-start music on first user interaction
document.addEventListener('click', function() {
  // On first user interaction, begin wake listening and background music
  if (!isWakeRunning) {
    startWake();
  }
  if (!isMusicPlaying) {
    startBackgroundMusic();
  }
}, { once: true });

// Check if audio file exists and hide music button if not
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    if (backgroundMusic && backgroundMusic.error) {
      console.log('Audio file not found, hiding music button');
      musicToggle.style.display = 'none';
    }
  }, 1000);
});

// Conversation log helper
function appendToLog(who, text) {
  if (!conversationLog) return;
  // Clear previous history when a new user question starts
  if (who === 'You') {
    conversationLog.innerHTML = '';
  }
  const entry = document.createElement('div');
  entry.className = 'entry';
  const whoSpan = document.createElement('span');
  whoSpan.className = 'who';
  whoSpan.textContent = who + ': ';
  const textSpan = document.createElement('span');
  textSpan.className = 'text';
  textSpan.innerHTML = renderRichText(text);
  entry.appendChild(whoSpan);
  entry.appendChild(textSpan);
  conversationLog.appendChild(entry);
  conversationLog.scrollTop = conversationLog.scrollHeight;
}

function escapeHtml(s){
  return (s||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function renderRichText(s){
  const safe = escapeHtml(s||'');
  // Preserve paragraph breaks and line breaks
  return safe.replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>');
}

// YouTube helpers
function isPlayRequest(text) {
  const t = (text || '').toLowerCase();
  return (
    t.startsWith('play ') ||
    t.includes('play a ') ||
    t.includes('play the ') ||
    t.includes('play song') ||
    t.includes('play music') ||
    t.includes('gaana chalao') ||
    t.includes('song chalao') ||
    t.includes('गीत चलाओ') ||
    t.includes('सॉन्ग चलाओ') ||
    t.includes('ಹಾಡು ಪ್ಲೇ') ||
    t.includes('ಹಾಡು ಹಾಕು') ||
    t.includes('music please') ||
    t.includes('play bhajan') ||
    t.includes('play mantra')
  );
}

function extractPlayQuery(text) {
  let q = text || '';
  q = q.replace(/^play\s+/i, '')
       .replace(/^(please\s+)?play(\s+the|\s+a)?\s+/i, '')
       .trim();
  return q;
}

function openYouTubeSearch(query) {
  // Ask backend for first videoId then embed that exact video
  fetch('/youtube/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query })
  }).then(async (res) => {
    if (!res.ok) throw new Error('search failed');
    const data = await res.json();
    const list = data.videoIds || (data.videoId ? [data.videoId] : []);
    if (!list.length) throw new Error('no video id');
    if (ytContainer) {
      ytContainer.hidden = false;
      // Try each id until one plays
      const tryIds = async (ids) => {
        for (const id of ids) {
          if (ytPlayer && ytPlayer.loadVideoById) {
            ytPlayer.loadVideoById({ videoId: id, startSeconds: 0, suggestedQuality: 'large' });
            await new Promise(r => setTimeout(r, 1200));
            // Heuristic: if player state remains unstarted, continue
            const state = ytPlayer.getPlayerState ? ytPlayer.getPlayerState() : 1;
            // 1 = playing, 3 = buffering; -1 unstarted
            if (state === 1 || state === 3) return true;
          }
        }
        return false;
      };
      tryIds(list);
      // Do not auto-scroll; keep Ganesh visible
    }
  }).catch(err => {
    console.error('YouTube search error', err);
    speakResponse('Sorry, I could not play that.');
  });
}

// Service Worker Registration (for PWA capabilities)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
      .then(function(registration) {
        console.log('ServiceWorker registration successful');
      })
      .catch(function(err) {
        console.log('ServiceWorker registration failed');
      });
  });
}