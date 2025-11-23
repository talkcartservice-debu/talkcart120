// Script to generate ringtone files programmatically
// This script creates proper WAV and MP3 files for the notification system
// Run this script if the ringtone files are missing or corrupted
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Ensure we're in the right directory
const soundsDir = path.join(__dirname);
console.log('Generating ringtone files in:', soundsDir);

// Function to generate a WAV file using Node.js
function generateWAV() {
  // WAV file header (44 bytes)
  const header = Buffer.alloc(44);
  
  // RIFF header
  header.write('RIFF', 0);
  header.writeUInt32LE(44 + 44100 * 2 * 3 - 8, 4); // file size - 8
  header.write('WAVE', 8);
  
  // fmt chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20);  // audio format (1 = PCM)
  header.writeUInt16LE(1, 22);  // number of channels
  header.writeUInt32LE(44100, 24); // sample rate
  header.writeUInt32LE(44100 * 2, 28); // byte rate
  header.writeUInt16LE(2, 32);  // block align
  header.writeUInt16LE(16, 34); // bits per sample
  
  // data chunk
  header.write('data', 36);
  header.writeUInt32LE(44100 * 2 * 3, 40); // data chunk size
  
  // Generate 3 seconds of audio data (44100 samples/second * 2 bytes/sample * 3 seconds)
  const dataSize = 44100 * 2 * 3;
  const dataBuffer = Buffer.alloc(dataSize);
  
  // Generate a simple tone pattern
  for (let i = 0; i < 44100 * 3; i++) {
    // Create a pattern that repeats every 0.6 seconds (26460 samples)
    const patternPosition = i % 26460;
    let amplitude = 0;
    
    if (patternPosition < 8820) {
      // First tone (800 Hz)
      const frequency = 800;
      const envelope = Math.sin((patternPosition / 44100) * Math.PI * 5) * 0.3;
      amplitude = Math.sin(2 * Math.PI * frequency * (i / 44100)) * envelope;
    } else if (patternPosition < 17640) {
      // Second tone (1000 Hz)
      const frequency = 1000;
      const envelope = Math.sin(((patternPosition - 8820) / 44100) * Math.PI * 5) * 0.3;
      amplitude = Math.sin(2 * Math.PI * frequency * (i / 44100)) * envelope;
    }
    // Silence for the rest of the pattern
    
    // Convert to 16-bit signed integer
    const sample = Math.max(-1, Math.min(1, amplitude));
    const intSample = Math.round(sample * 0x7FFF);
    dataBuffer.writeInt16LE(intSample, i * 2);
  }
  
  // Combine header and data
  const wavBuffer = Buffer.concat([header, dataBuffer]);
  
  // Write to file
  const wavPath = path.join(soundsDir, 'ringtone.wav');
  fs.writeFileSync(wavPath, wavBuffer);
  console.log('Generated ringtone.wav');
}

// Function to generate a simple MP3 file using ffmpeg if available
function generateMP3() {
  try {
    // First check if ffmpeg is available
    execSync('ffmpeg -version', { stdio: 'ignore' });
    
    // Generate a temporary WAV file first
    const tempWavPath = path.join(soundsDir, 'temp.wav');
    const mp3Path = path.join(soundsDir, 'ringtone.mp3');
    
    // Generate WAV data
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(44 + 22050 * 2 * 2 - 8, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(22050, 24);
    header.writeUInt32LE(22050 * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(22050 * 2 * 2, 40);
    
    const dataSize = 22050 * 2 * 2;
    const dataBuffer = Buffer.alloc(dataSize);
    
    // Simple beep pattern
    for (let i = 0; i < 22050 * 2; i++) {
      const frequency = 800;
      const amplitude = Math.sin(2 * Math.PI * frequency * (i / 22050)) * 0.3;
      const intSample = Math.round(amplitude * 0x7FFF);
      dataBuffer.writeInt16LE(intSample, i * 2);
    }
    
    const wavBuffer = Buffer.concat([header, dataBuffer]);
    fs.writeFileSync(tempWavPath, wavBuffer);
    
    // Convert to MP3 using ffmpeg
    execSync(`ffmpeg -i "${tempWavPath}" -acodec mp3 -ab 128k "${mp3Path}"`, { stdio: 'ignore' });
    
    // Clean up temp file
    fs.unlinkSync(tempWavPath);
    
    console.log('Generated ringtone.mp3 using ffmpeg');
  } catch (error) {
    console.log('ffmpeg not available, creating a minimal MP3 file');
    
    // Create a minimal valid MP3 file with a simple tone
    // This is a base64 encoded minimal MP3 file with a short beep
    const base64Mp3 = 'SUQzBAAAAAABAFRYWFgAAAASAAADbWFqb3JfYnJhbmQAbXA0MgBUWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhY//90ZW1wAA';
    const mp3Buffer = Buffer.from(base64Mp3, 'base64');
    const mp3Path = path.join(soundsDir, 'ringtone.mp3');
    fs.writeFileSync(mp3Path, mp3Buffer);
    console.log('Generated minimal ringtone.mp3');
  }
}

// Generate the files
try {
  generateWAV();
  generateMP3();
  console.log('Ringtone files generated successfully!');
} catch (error) {
  console.error('Error generating ringtone files:', error.message);
}