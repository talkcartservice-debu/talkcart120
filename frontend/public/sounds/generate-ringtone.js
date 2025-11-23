// Simple script to generate a ringtone using Web Audio API
// This can be run in the browser console to generate and download a ringtone

function generateRingtone() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 3; // 3 seconds
    const length = sampleRate * duration;
    const buffer = audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate a pleasant ringtone pattern
    for (let i = 0; i < length; i++) {
        const time = i / sampleRate;

        // Create a pattern that repeats every 0.6 seconds
        const patternTime = time % 0.6;
        let amplitude = 0;

        if (patternTime < 0.2) {
            // First tone
            const frequency = 800;
            const envelope = Math.sin(patternTime * Math.PI * 5) * 0.3;
            amplitude = Math.sin(2 * Math.PI * frequency * time) * envelope;
        } else if (patternTime < 0.4) {
            // Second tone
            const frequency = 1000;
            const envelope = Math.sin((patternTime - 0.2) * Math.PI * 5) * 0.3;
            amplitude = Math.sin(2 * Math.PI * frequency * time) * envelope;
        }
        // Silence for the rest of the pattern

        data[i] = amplitude;
    }

    return buffer;
}

function bufferToWav(buffer) {
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    const data = buffer.getChannelData(0);

    // WAV header
    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
        const sample = Math.max(-1, Math.min(1, data[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
    }

    return arrayBuffer;
}

// Usage:
// const buffer = generateRingtone();
// const wavData = bufferToWav(buffer);
// const blob = new Blob([wavData], { type: 'audio/wav' });
// const url = URL.createObjectURL(blob);
// const a = document.createElement('a');
// a.href = url;
// a.download = 'ringtone.wav';
// a.click();

console.log('Ringtone generator loaded. Run the commented code to generate and download a ringtone.');