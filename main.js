const state = document.getElementById('candle-state');
const icon = document.getElementById('icon');
const flame = document.querySelector('.candle-container');
const fireButton = document.getElementById('fire');
const steps = document.getElementById('steps');
const flameEls = document.querySelectorAll('.flame');

const BLOW_THRESHOLD = 70; // Adjust this value based on testing

console.log(state);
console.log(icon);
console.log(flameEls.length)

let micStream = null;

let audioContext = null;
let analyser = null;
let microphone = null;
let isBlowDetectionActive = false;

// Flame wiggle parameters
let currentTilt = 0;
const MAX_TILT = 25; // Maximum tilt angle in degrees
const TILT_SMOOTHING = 0.1; // Smoothing factor for tilt changes
const WIGGLE_START = 15;

const candleState = {
    LIT: 'lit',
    BLOWN_OUT: 'blown_out'
};

let currentCandleState = candleState.LIT;

const eventHandler = async (e) => {
    console.log('Event detected: ', e);

    if (micStream) return;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStream = stream;

        console.log('Microphone access granted');
        state.textContent = 'Now blow out the candles and make a wish.';
        steps.textContent = '2.';
        icon.textContent = 'mic';

        initBlowDetection(stream);
    } catch (err) {
        console.error('Microphone access denied:', err);
        state.textContent = 'Microphone access denied. Please enable your microphone to blow out the candles.';
    }
}

icon.addEventListener('click', eventHandler);

const handleLightCandles = () => {
    if (currentCandleState === candleState.LIT) return;

    try {
        state.textContent = 'Tap the mic, then blow out the candles.';
        icon.style.display = 'inline-block';
        icon.textContent = 'mic_off';
        steps.textContent = '1.';
        steps.style.display = 'inline-flex';
        flame.classList.remove('blown-out');
        fireButton.style.visibility = 'hidden';
    } catch (err) {
        console.error('Error re-initializing blow detection:', err);
        state.textContent = 'Error re-initializing microphone. Please refresh the page.';
    }
    currentCandleState = candleState.LIT;
    isBlowDetectionActive = false;
    micStream = null;
    audioContext = null;
    analyser = null;
    microphone = null;
}

fireButton.addEventListener('click', handleLightCandles);

// Function to analyze audio input and detect blowing
const initBlowDetection = (stream) => {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    microphone = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 512;
    microphone.connect(analyser);

    isBlowDetectionActive = true;
    detectBlow();
};

const detectBlow = () => {
    if (!isBlowDetectionActive) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    console.log('Volume:', volume);

    // 1) Flame tilt based on volume

    if (currentCandleState === candleState.LIT) {
        // Normalize from WIGGLE_START to BLOW_THRESHOLD
        const normalized = Math.max(0, Math.min(1, (volume - WIGGLE_START) / (BLOW_THRESHOLD - WIGGLE_START)));

        const targetTilt = normalized * MAX_TILT;

        currentTilt += (targetTilt - currentTilt) * TILT_SMOOTHING;

        flameEls.forEach(el => {
            el.style.transform = `rotateZ(${currentTilt}deg)`;
            el.style.transformOrigin = 'center bottom';
        });
    }

    // 2) Detect blow
    if (volume > BLOW_THRESHOLD && currentCandleState === candleState.LIT) {
        currentCandleState = candleState.BLOWN_OUT;

        currentTilt = 0; // Reset tilt for blow out animation
        flameEls.forEach((el) => (el.style.transform = ''));

        state.textContent = 'May your wish come true ✨!';
        icon.style.display = 'none';
        flame.classList.add('blown-out');
        steps.style.display = 'none';
        fireButton.style.display = 'inline-block';

        isBlowDetectionActive = false; // Stop further detection
        audioContext.close();
        micStream.getTracks().forEach(track => track.stop());

    }

    requestAnimationFrame(detectBlow);
};



