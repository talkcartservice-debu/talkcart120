// Script to generate proper ringtone files
// Run this in a browser console to create and download ringtone files

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
console.log('To generate ringtone files, run the following commands in your browser console:');
console.log('');
console.log('1. Generate WAV file:');
console.log('   const buffer = generateRingtone();');
console.log('   const wavData = bufferToWav(buffer);');
console.log('   const blob = new Blob([wavData], { type: "audio/wav" });');
console.log('   const url = URL.createObjectURL(blob);');
console.log('   const a = document.createElement("a");');
console.log('   a.href = url;');
console.log('   a.download = "ringtone.wav";');
console.log('   a.click();');
console.log('');
console.log('2. For MP3, you can convert the WAV file using an online converter or audio editing software.');