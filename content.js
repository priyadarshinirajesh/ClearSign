// Content script for YouTube Sign Language 2D Avatar extension
// Uses Web Speech API to transcribe audio and displays 2D ASL gestures

let recognition;
let signDictionary = {};
let currentWords = [];
let lastProcessedTime = 0;
let useSubtitles = false;
let currentImage = null;
let animationStartTime = 0;
let currentAnimation = null;
let images = {};

if (location.href.includes('youtube.com/watch')) {
  // Top-level page: Initialize canvas and speech recognition
  if (!document.getElementById('sign-language-canvas')) {
    const canvas = document.createElement('canvas');
    canvas.id = 'sign-language-canvas';
    canvas.width = 300;
    canvas.height = 400;
    document.body.appendChild(canvas);
  }

  // Load sign dictionary and images
  fetch(chrome.runtime.getURL('assets/signs.json'))
    .then(response => response.json())
    .then(data => {
      signDictionary = data;
      // Preload images
      Object.values(signDictionary).forEach(sign => {
        const img = new Image();
        img.src = chrome.runtime.getURL(`assets/${sign.image}`);
        images[sign.image] = img;
      });
      initializeSpeechRecognition();
      initializeCanvas();
    })
    .catch(error => console.error('Failed to load sign dictionary:', error));

  function initializeSpeechRecognition() {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      console.error('Web Speech API not supported. Falling back to subtitles.');
      useSubtitles = true;
      initializeSubtitleFallback();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join(' ')
        .toLowerCase();
      currentWords = transcript.split(' ').filter(word => word);
      console.log('Transcribed words:', currentWords);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech' || event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        console.log('Falling back to subtitles.');
        useSubtitles = true;
        recognition.stop();
        initializeSubtitleFallback();
      }
    };

    recognition.onend = () => {
      if (!useSubtitles) {
        console.log('Speech recognition stopped. Restarting...');
        try {
          recognition.start();
        } catch (error) {
          console.error('Failed to restart speech recognition:', error);
          useSubtitles = true;
          initializeSubtitleFallback();
        }
      }
    };

    try {
      recognition.start();
      console.log('Requesting microphone access to capture YouTube video audio...');
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      useSubtitles = true;
      initializeSubtitleFallback();
    }
  }

  function initializeSubtitleFallback() {
    if (window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.captions) {
      const captionTracks = window.ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
      const enCaption = captionTracks.find(track => track.languageCode === 'en');
      if (enCaption) {
        fetch(enCaption.baseUrl)
          .then(response => response.text())
          .then(xmlText => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            const pElements = xmlDoc.querySelectorAll('p');
            currentWords = Array.from(pElements).map(p => p.textContent.toLowerCase().split(' ')).flat();
            console.log('Subtitle words:', currentWords);
          })
          .catch(error => console.error('Failed to fetch subtitles:', error));
      } else {
        console.error('No English captions available.');
      }
    } else {
      console.error('No captions available. Retrying...');
      setTimeout(initializeSubtitleFallback, 1000);
    }
  }

  function initializeCanvas() {
    const canvas = document.getElementById('sign-language-canvas');
    const ctx = canvas.getContext('2d');

    // Video time synchronization
    window.addEventListener('message', (event) => {
      if (event.data.action === 'timeupdate') {
        animateCanvas(event.data.time);
      }
    });

    function animateCanvas(currentTime) {
      if (currentTime - lastProcessedTime < 0.5) return; // Throttle updates
      lastProcessedTime = currentTime;

      if (currentWords.length > 0 && !currentAnimation) {
        const word = currentWords.shift();
        const sign = signDictionary[word] || signDictionary['default'];
        console.log(`Displaying gesture for "${word}": ${sign.image}`);
        currentAnimation = sign;
        currentImage = images[sign.image];
        animationStartTime = performance.now() / 1000;
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw current gesture
      if (currentAnimation && currentImage) {
        const elapsed = (performance.now() / 1000) - animationStartTime;
        if (elapsed >= currentAnimation.duration) {
          currentAnimation = null;
          currentImage = null;
          return;
        }

        // Draw image
        ctx.drawImage(currentImage, 50, 100, 200, 200);

        // Fade effect
        const alpha = 1 - Math.abs(elapsed - currentAnimation.duration / 2) / (currentAnimation.duration / 2);
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      } else {
        // Fallback: Draw a simple hand shape
        ctx.fillStyle = 'green';
        ctx.fillRect(100, 150, 100, 100); // Simple hand rectangle
        ctx.globalAlpha = 1;
      }

      // Request next frame
      requestAnimationFrame(() => animateCanvas(currentTime));
    }

    // Start animation loop
    animateCanvas(0);
  }
} else if (document.querySelector('video')) {
  // Video iframe: Send time updates
  const video = document.querySelector('video');
  video.addEventListener('timeupdate', () => {
    window.parent.postMessage({ action: 'timeupdate', time: video.currentTime }, '*');
  });
  window.parent.postMessage({ action: 'timeupdate', time: video.currentTime }, '*');
}