const state = document.getElementById('candle-state');
const icon = document.getElementById('icon');

console.log(state);
console.log(icon);

let micStream = null;

function eventHandler(e) {
    console.log('Event detected: ', e);

    if (micStream) return;

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
            micStream = stream;

            console.log('Microphone access granted');
            state.textContent = 'Microphone is on! Now blow out the candles and make a wish.';
            icon.textContent = 'mic';
        })
        .catch((err) => {
            console.error('Microphone access denied:', err);
            state.textContent = 'Microphone access denied. Please enable your microphone to blow out the candles.';
        });
}
icon.addEventListener('click', eventHandler);