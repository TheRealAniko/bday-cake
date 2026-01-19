const state = document.getElementById('candle-state');
const icon = document.getElementById('icon');

const BLOW_THRESHOLD = 50; // Adjust this value based on testing

console.log(state);
console.log(icon);

let micStream = null;

let audioContext = null;
let analyser = null;
let microphone = null;
let isBlowDetectionActive = false;


const eventHandler = async (e) => {
    console.log('Event detected: ', e);

    if (micStream) return;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStream = stream;

        console.log('Microphone access granted');
        state.textContent = 'Microphone is on! Now blow out the candles and make a wish.';
        icon.textContent = 'mic';

        initBlowDetection(stream);
    } catch (err) {
        console.error('Microphone access denied:', err);
        state.textContent = 'Microphone access denied. Please enable your microphone to blow out the candles.';
    }
}

icon.addEventListener('click', eventHandler);

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

    if (volume > BLOW_THRESHOLD) {
        console.log('Blow detected with volume:', volume);
    }

    requestAnimationFrame(detectBlow);
};