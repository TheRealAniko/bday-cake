const state = document.getElementById('candle-state');
const icon = document.getElementById('icon');
const flame = document.querySelector('.candle-container');
const fireButton = document.getElementById('fire');
const steps = document.getElementById('steps');
const flameEls = document.querySelectorAll('.flame');

const BLOW_THRESHOLD = 70;

let micStream = null;

let audioContext = null;
let analyser = null;
let microphone = null;
let isBlowDetectionActive = false;
let dynamicThreshold = null;

// Flame wiggle parameters
let currentTilt = 0;
const MAX_TILT = 25; // Maximum tilt angle in degrees
const TILT_SMOOTHING = 0.1; // Smoothing factor for tilt changes
const WIGGLE_START = 15;

// Helper to average volume and standard deviation
const mean = (values) => {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

const std = (values, m) => {
    const variance = values.reduce((sum, val) => sum + (val - m) ** 2, 0) / values.length;
    return Math.sqrt(variance);
}

// Calibtrate threshold based on ambient noise
const calibrateThreshold = async (analyser, durationMs = 1000) => {
    const samples = [];
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const start = performance.now();

    while (performance.now() - start < durationMs) {
        analyser.getByteFrequencyData(dataArray);

        const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        samples.push(volume);

        await new Promise((r) => setTimeout(r, 30));
    }

    const m = mean(samples);
    const s = std(samples, m);

    const threshold = m + 3 * s + 2;

    return { threshold, baselineMean: m, baselineStd: s };
};

const candleState = {
    LIT: 'lit',
    BLOWN_OUT: 'blown_out'
};

let currentCandleState = candleState.LIT;

const eventHandler = async (e) => {

    if (micStream) return;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStream = stream;

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
        steps.style.visibility = 'visible';
        steps.style.display = 'inline-flex';
        flame.classList.remove('blown-out');
        fireButton.style.display = 'none';
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
const initBlowDetection = async (stream) => {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    microphone = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 512;
    microphone.connect(analyser);

    state.textContent = 'Calibrating... Please be silent.';
    const { threshold, baselineMean, baselineStd } = await calibrateThreshold(analyser, 1000);

    console.log("Calibration:", { threshold, baselineMean, baselineStd });

    state.textContent = 'Ready! Blow out the candles and make a wish!';

    isBlowDetectionActive = true;
    detectBlow();
};

// ASCII Confetti
const CONFETTI_SYMBOLS = [
    "⭒",
    "˚",
    "⋆",
    "⊹",
    "₊",
    "݁",
    "˖",
    "✦",
    "✧",
    "·",
    "°",
    "✶",
];

const CONFETTI_COLORS = [
    "#FFC700",
    "#FF0000",
    "#2E3192",
    "#41BBC7",
    "#732DD1",
    "#FF6F61",
    "#6B8E23",
    "#FF69B4",
];


const createConfetti = () => {
    const container = document.getElementById('confetti-container');

    container.innerHTML = ''; // Clear previous confetti if any

    const confettiCount = 80;

    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const confetti = document.createElement("span");
            confetti.className = "confetti";
            confetti.textContent =
                CONFETTI_SYMBOLS[Math.floor(Math.random() * CONFETTI_SYMBOLS.length)];

            confetti.style.left = Math.random() * 100 + "vw";

            confetti.style.fontSize = 0.8 + Math.random() * 1.2 + "rem";

            confetti.style.color =
                CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];

            const duration = 2 + Math.random() * 2;
            confetti.style.animationDuration = duration + "s";

            confetti.style.animationDelay = Math.random() * 0.5 + "s";

            const swayAmount = (Math.random() - 0.5) * 100;
            confetti.style.setProperty("--sway", swayAmount + "px");

            container.appendChild(confetti);

            setTimeout(() => {
                confetti.remove();
            }, (duration + 1) * 1000);
        }, i * 50);
    }
}


const detectBlow = () => {
    if (!isBlowDetectionActive) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

    // Using adaptive threshold if available
    const thresholdToUse = dynamicThreshold ?? BLOW_THRESHOLD;

    // 1) Flame tilt based on volume (scaled relative to the current threshold)
    if (currentCandleState === candleState.LIT) {
        // Normalize from WIGGLE_START to BLOW_THRESHOLD
        const normalized = Math.max(0, Math.min(1, (volume - WIGGLE_START) / (thresholdToUse - WIGGLE_START)));

        const targetTilt = normalized * MAX_TILT;

        currentTilt += (targetTilt - currentTilt) * TILT_SMOOTHING;

        flameEls.forEach(el => {
            el.style.transform = `rotateZ(${currentTilt}deg)`;
            el.style.transformOrigin = 'center bottom';
        });
    }

    // 2) Detect blow (using adaptive threshold if available)
    if (volume > thresholdToUse && currentCandleState === candleState.LIT) {
        currentCandleState = candleState.BLOWN_OUT;

        currentTilt = 0; // Reset tilt for blow out animation
        flameEls.forEach((el) => (el.style.transform = ''));

        state.textContent = 'May your wish come true ✨!';
        icon.style.display = 'none';
        flame.classList.add('blown-out');
        steps.style.visibility = 'hidden';
        fireButton.style.display = 'inline-block';
        fireButton.style.visibility = 'visible';

        createConfetti();

        isBlowDetectionActive = false; // Stop further detection
        audioContext.close();
        micStream.getTracks().forEach(track => track.stop());

    }

    requestAnimationFrame(detectBlow);
};



