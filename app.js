let audioContext;
let sourceNode;
let recognition;
let transcript = '';

function setupAudioCapture() {
  const video = document.querySelector('video');
  if (!video) {
    document.getElementById('status').textContent = 'Status: No video found';
    console.error('No video element found');
    return;
  }

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  sourceNode = audioContext.createMediaElementSource(video);
  const analyser = audioContext.createAnalyser();
  sourceNode.connect(analyser);
  analyser.connect(audioContext.destination);

  setupSpeechRecognition();
}

function setupSpeechRecognition() {
  if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
    document.getElementById('status').textContent = 'Status: Speech API not supported';
    console.error('Web Speech API not supported');
    return;
  }

  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      transcript += result[0].transcript;
      document.getElementById('transcriptText').textContent = transcript;
      if (result.isFinal) {
        convertToSignLanguage(transcript);
      }
    }
    document.getElementById('status').textContent = 'Status: Listening';
  };

  recognition.onerror = (event) => {
    document.getElementById('status').textContent = `Status: Error (${event.error})`;
    console.error('Speech recognition error:', event.error);
    if (event.error === 'no-speech' || event.error === 'aborted') {
      recognition.start();
    }
  };

  recognition.onend = () => {
    document.getElementById('status').textContent = 'Status: Restarting...';
    recognition.start();
  };

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(() => {
      recognition.start();
      document.getElementById('status').textContent = 'Status: Listening';
    })
    .catch((err) => {
      document.getElementById('status').textContent = `Status: Microphone access denied (${err.message})`;
      console.error('Microphone access denied:', err);
    });
}

async function convertToSignLanguage(transcript) {
  try {
    const response = await fetch(chrome.runtime.getURL('signs.json'));
    const signs = await response.json();
    const words = transcript.toLowerCase().split(' ');
    const gestures = words.map(word => signs[word] || { gesture: 'unknown', animation: null });
    renderSignLanguage(gestures); // Defined in avatar.js
  } catch (error) {
    console.error('Error converting to sign language:', error);
    document.getElementById('status').textContent = 'Status: Error in sign conversion';
  }
}

function toggleSignLanguage() {
  if (!audioContext) {
    setupAudioCapture();
  } else {
    if (audioContext) audioContext.close();
    if (recognition) recognition.stop();
    audioContext = null;
    recognition = null;
    document.getElementById('status').textContent = 'Status: Stopped';
    document.getElementById('transcriptText').textContent = '';
  }
}

// Ensure toggleSignLanguage is globally accessible
window.toggleSignLanguage = toggleSignLanguage;