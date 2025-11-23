interface CompressionOptions {
  quality: 'low' | 'medium' | 'high' | 'auto';
  maxWidth?: number;
  maxHeight?: number;
  maxFileSize?: number; // in MB
  format?: 'mp4' | 'webm';
  bitrate?: number; // in kbps
}

interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  duration: number;
  dimensions: { width: number; height: number };
}

export class VideoCompressor {
  private static getQualitySettings(quality: string) {
    const settings = {
      low: { bitrate: 500, maxWidth: 640, maxHeight: 480 },
      medium: { bitrate: 1000, maxWidth: 1280, maxHeight: 720 },
      high: { bitrate: 2000, maxWidth: 1920, maxHeight: 1080 },
      auto: { bitrate: 1500, maxWidth: 1280, maxHeight: 720 },
    };
    return settings[quality as keyof typeof settings] || settings.auto;
  }

  static async compressVideo(
    file: File,
    options: CompressionOptions = { quality: 'auto' }
  ): Promise<CompressionResult> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      video.onloadedmetadata = () => {
        const { width: originalWidth, height: originalHeight, duration } = video;
        const qualitySettings = this.getQualitySettings(options.quality);
        
        // Calculate new dimensions maintaining aspect ratio
        const aspectRatio = originalWidth / originalHeight;
        let newWidth = Math.min(originalWidth, options.maxWidth || qualitySettings.maxWidth);
        let newHeight = Math.min(originalHeight, options.maxHeight || qualitySettings.maxHeight);
        
        if (newWidth / newHeight > aspectRatio) {
          newWidth = newHeight * aspectRatio;
        } else {
          newHeight = newWidth / aspectRatio;
        }

        canvas.width = newWidth;
        canvas.height = newHeight;

        // Set up MediaRecorder for compression
        const stream = canvas.captureStream(30); // 30 FPS
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: options.format === 'webm' ? 'video/webm' : 'video/mp4',
          videoBitsPerSecond: (options.bitrate || qualitySettings.bitrate) * 1000,
        });

        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const compressedBlob = new Blob(chunks, { 
            type: options.format === 'webm' ? 'video/webm' : 'video/mp4' 
          });
          
          const compressedFile = new File(
            [compressedBlob], 
            file.name.replace(/\.[^/.]+$/, `.${options.format || 'mp4'}`),
            { type: compressedBlob.type }
          );

          const compressionRatio = ((file.size - compressedFile.size) / file.size) * 100;

          resolve({
            compressedFile,
            originalSize: file.size,
            compressedSize: compressedFile.size,
            compressionRatio,
            duration,
            dimensions: { width: newWidth, height: newHeight },
          });
        };

        mediaRecorder.onerror = (event) => {
          reject(new Error(`Compression failed: ${event}`));
        };

        // Start recording
        mediaRecorder.start();

        // Play video and draw frames to canvas
        let currentTime = 0;
        const frameRate = 1 / 30; // 30 FPS

        const drawFrame = () => {
          if (currentTime >= duration) {
            mediaRecorder.stop();
            return;
          }

          video.currentTime = currentTime;
          video.onseeked = () => {
            ctx.drawImage(video, 0, 0, newWidth, newHeight);
            currentTime += frameRate;
            setTimeout(drawFrame, 1000 / 30); // 30 FPS
          };
        };

        drawFrame();
      };

      video.onerror = () => {
        reject(new Error('Failed to load video for compression'));
      };

      video.src = URL.createObjectURL(file);
    });
  }

  static async generateThumbnail(
    file: File,
    timeOffset: number = 1,
    width: number = 320,
    height: number = 240
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      video.onloadedmetadata = () => {
        canvas.width = width;
        canvas.height = height;
        video.currentTime = Math.min(timeOffset, video.duration * 0.1);
      };

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, width, height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbnail);
      };

      video.onerror = () => {
        reject(new Error('Failed to load video for thumbnail generation'));
      };

      video.src = URL.createObjectURL(file);
    });
  }

  static async getVideoMetadata(file: File): Promise<{
    duration: number;
    width: number;
    height: number;
    size: number;
    format: string;
    bitrate?: number;
  }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');

      video.onloadedmetadata = () => {
        const metadata = {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          size: file.size,
          format: file.type.split('/')[1] || 'unknown',
        };

        resolve(metadata);
      };

      video.onerror = () => {
        reject(new Error('Failed to load video metadata'));
      };

      video.src = URL.createObjectURL(file);
    });
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static calculateBitrate(fileSize: number, duration: number): number {
    // Convert file size to bits and duration to seconds
    const fileSizeBits = fileSize * 8;
    return Math.round(fileSizeBits / duration / 1000); // kbps
  }

  static isCompressionNeeded(
    file: File,
    maxSize: number = 50 * 1024 * 1024, // 50MB default
    maxDuration: number = 300 // 5 minutes default
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (file.size > maxSize) {
        resolve(true);
        return;
      }

      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        resolve(video.duration > maxDuration);
      };
      video.onerror = () => resolve(false);
      video.src = URL.createObjectURL(file);
    });
  }
}

export default VideoCompressor;