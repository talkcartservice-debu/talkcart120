/**
 * Video Quality Manager
 * Handles adaptive video quality based on network conditions, device performance, and user preferences
 */

export interface VideoQualityLevel {
  id: string;
  label: string;
  width: number;
  height: number;
  bitrate: number; // kbps
  fps: number;
  codec: string;
  url?: string;
}

export interface AdaptiveStreamingConfig {
  enabled: boolean;
  bufferThreshold: number; // seconds
  switchUpThreshold: number; // seconds of stable playback before switching up
  switchDownThreshold: number; // seconds of buffering before switching down
  maxSwitchesPerMinute: number;
  bitrateMultiplier: number; // multiplier for available bandwidth
  qualityPreference: 'auto' | 'quality' | 'performance' | 'data-saver';
}

export interface NetworkCondition {
  bandwidth: number; // Mbps
  latency: number; // ms
  packetLoss: number; // percentage
  connectionType: 'wifi' | '4g' | '3g' | '2g' | 'ethernet' | 'unknown';
  isMetered: boolean;
}

export interface DeviceCapabilities {
  maxResolution: { width: number; height: number };
  supportedCodecs: string[];
  hardwareAcceleration: boolean;
  memoryLimit: number; // MB
  cpuCores: number;
  batteryLevel?: number;
  isLowPowerMode?: boolean;
}

class VideoQualityManager {
  private config: AdaptiveStreamingConfig;
  private qualityLevels: VideoQualityLevel[] = [];
  private currentQuality: VideoQualityLevel | null = null;
  private networkCondition: NetworkCondition | null = null;
  private deviceCapabilities: DeviceCapabilities | null = null;
  private switchHistory: Array<{ timestamp: number; from: string; to: string; reason: string }> = [];
  private bandwidthHistory: Array<{ timestamp: number; bandwidth: number }> = [];
  private bufferHealthHistory: Array<{ timestamp: number; bufferLevel: number }> = [];

  constructor(config: Partial<AdaptiveStreamingConfig> = {}) {
    this.config = {
      enabled: true,
      bufferThreshold: 3,
      switchUpThreshold: 10,
      switchDownThreshold: 2,
      maxSwitchesPerMinute: 3,
      bitrateMultiplier: 0.8,
      qualityPreference: 'auto',
      ...config,
    };

    this.initializeQualityLevels();
    this.detectDeviceCapabilities();
    this.startNetworkMonitoring();
  }

  /**
   * Initialize default quality levels
   */
  private initializeQualityLevels() {
    this.qualityLevels = [
      {
        id: 'auto',
        label: 'Auto',
        width: 0,
        height: 0,
        bitrate: 0,
        fps: 0,
        codec: 'auto',
      },
      {
        id: '240p',
        label: '240p',
        width: 426,
        height: 240,
        bitrate: 400,
        fps: 30,
        codec: 'h264',
      },
      {
        id: '360p',
        label: '360p',
        width: 640,
        height: 360,
        bitrate: 800,
        fps: 30,
        codec: 'h264',
      },
      {
        id: '480p',
        label: '480p',
        width: 854,
        height: 480,
        bitrate: 1200,
        fps: 30,
        codec: 'h264',
      },
      {
        id: '720p',
        label: '720p HD',
        width: 1280,
        height: 720,
        bitrate: 2500,
        fps: 30,
        codec: 'h264',
      },
      {
        id: '1080p',
        label: '1080p Full HD',
        width: 1920,
        height: 1080,
        bitrate: 5000,
        fps: 30,
        codec: 'h264',
      },
      {
        id: '1440p',
        label: '1440p 2K',
        width: 2560,
        height: 1440,
        bitrate: 9000,
        fps: 30,
        codec: 'h264',
      },
      {
        id: '2160p',
        label: '2160p 4K',
        width: 3840,
        height: 2160,
        bitrate: 18000,
        fps: 30,
        codec: 'h264',
      },
    ];
  }

  /**
   * Detect device capabilities
   */
  private detectDeviceCapabilities() {
    const screen = window.screen;
    const navigator = window.navigator;

    this.deviceCapabilities = {
      maxResolution: {
        width: screen.width * (window.devicePixelRatio || 1),
        height: screen.height * (window.devicePixelRatio || 1),
      },
      supportedCodecs: this.detectSupportedCodecs(),
      hardwareAcceleration: this.detectHardwareAcceleration(),
      memoryLimit: this.getMemoryLimit(),
      cpuCores: navigator.hardwareConcurrency || 1,
      batteryLevel: this.getBatteryLevel(),
      isLowPowerMode: this.isLowPowerMode(),
    };
  }

  /**
   * Detect supported video codecs
   */
  private detectSupportedCodecs(): string[] {
    const video = document.createElement('video');
    const codecs = ['h264', 'h265', 'vp8', 'vp9', 'av1'];
    const supported: string[] = [];

    codecs.forEach(codec => {
      const mimeTypes = {
        h264: 'video/mp4; codecs="avc1.42E01E"',
        h265: 'video/mp4; codecs="hev1.1.6.L93.B0"',
        vp8: 'video/webm; codecs="vp8"',
        vp9: 'video/webm; codecs="vp9"',
        av1: 'video/mp4; codecs="av01.0.05M.08"',
      };

      if (video.canPlayType(mimeTypes[codec as keyof typeof mimeTypes]) === 'probably') {
        supported.push(codec);
      }
    });

    return supported;
  }

  /**
   * Detect hardware acceleration support
   */
  private detectHardwareAcceleration(): boolean {
    // This is a simplified check - in reality, this would be more complex
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  }

  /**
   * Get memory limit
   */
  private getMemoryLimit(): number {
    if ('deviceMemory' in navigator) {
      return (navigator as any).deviceMemory * 1024; // Convert GB to MB
    }
    return 2048; // Default 2GB
  }

  /**
   * Get battery level
   */
  private getBatteryLevel(): number | undefined {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        return battery.level * 100;
      });
    }
    return undefined;
  }

  /**
   * Check if device is in low power mode
   */
  private isLowPowerMode(): boolean {
    // This would need to be implemented based on platform-specific APIs
    return false;
  }

  /**
   * Start network monitoring
   */
  private startNetworkMonitoring() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      this.updateNetworkCondition();
      
      connection.addEventListener('change', () => {
        this.updateNetworkCondition();
      });
    }

    // Start bandwidth monitoring
    this.startBandwidthMonitoring();
  }

  /**
   * Update network condition
   */
  private updateNetworkCondition() {
    if (!('connection' in navigator)) return;

    const connection = (navigator as any).connection;
    
    this.networkCondition = {
      bandwidth: connection.downlink || 1,
      latency: connection.rtt || 100,
      packetLoss: 0, // Not available in API
      connectionType: this.mapConnectionType(connection.effectiveType),
      isMetered: connection.saveData || false,
    };
  }

  /**
   * Map connection effective type to our types
   */
  private mapConnectionType(effectiveType: string): NetworkCondition['connectionType'] {
    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        return '2g';
      case '3g':
        return '3g';
      case '4g':
        return '4g';
      default:
        return 'unknown';
    }
  }

  /**
   * Start bandwidth monitoring using fetch timing
   */
  private startBandwidthMonitoring() {
    setInterval(() => {
      this.measureBandwidth();
    }, 30000); // Every 30 seconds
  }

  /**
   * Measure bandwidth using a small test download
   */
  private async measureBandwidth() {
    try {
      const startTime = performance.now();
      const testUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1x1 pixel
      
      await fetch(testUrl, { cache: 'no-cache' });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const bandwidth = (1 * 8) / (duration / 1000) / 1000; // Very rough estimate
      
      this.bandwidthHistory.push({
        timestamp: Date.now(),
        bandwidth,
      });

      // Keep only last 10 measurements
      if (this.bandwidthHistory.length > 10) {
        this.bandwidthHistory.shift();
      }
    } catch (error) {
      console.warn('Bandwidth measurement failed:', error);
    }
  }

  /**
   * Get optimal quality level based on current conditions
   */
  getOptimalQuality(videoElement?: HTMLVideoElement): VideoQualityLevel {
    if (!this.config.enabled) {
      const quality720p = this.qualityLevels.find(q => q.id === '720p');
      if (quality720p) return quality720p;
      if (this.qualityLevels.length > 0) return this.qualityLevels[0]!;
      return this.qualityLevels[this.qualityLevels.length - 1]!;
    }

    const factors = this.analyzeConditions(videoElement);
    const recommendedQuality = this.calculateOptimalQuality(factors);
    
    return recommendedQuality;
  }

  /**
   * Analyze current conditions
   */
  private analyzeConditions(videoElement?: HTMLVideoElement) {
    const network = this.networkCondition;
    const device = this.deviceCapabilities;
    const bufferHealth = videoElement ? this.getBufferHealth(videoElement) : 1;
    
    return {
      availableBandwidth: network?.bandwidth || 1,
      isMetered: network?.isMetered || false,
      devicePerformance: this.getDevicePerformanceScore(),
      bufferHealth,
      batteryLevel: device?.batteryLevel || 100,
      isLowPowerMode: device?.isLowPowerMode || false,
      viewportSize: this.getViewportSize(),
    };
  }

  /**
   * Get buffer health (0-1 scale)
   */
  private getBufferHealth(videoElement: HTMLVideoElement): number {
    try {
      const buffered = videoElement.buffered;
      if (buffered.length === 0) return 0;
      
      const currentTime = videoElement.currentTime;
      const bufferedEnd = buffered.end(buffered.length - 1);
      const bufferAhead = bufferedEnd - currentTime;
      
      return Math.min(1, bufferAhead / this.config.bufferThreshold);
    } catch (error) {
      return 0.5; // Default to medium health
    }
  }

  /**
   * Get device performance score (0-1 scale)
   */
  private getDevicePerformanceScore(): number {
    const device = this.deviceCapabilities;
    if (!device) return 0.5;

    let score = 0;
    
    // CPU cores factor
    score += Math.min(1, device.cpuCores / 8) * 0.3;
    
    // Memory factor
    score += Math.min(1, device.memoryLimit / 8192) * 0.3;
    
    // Hardware acceleration factor
    score += device.hardwareAcceleration ? 0.2 : 0;
    
    // Battery factor
    if (device.batteryLevel !== undefined) {
      score += (device.batteryLevel / 100) * 0.1;
    } else {
      score += 0.1; // Assume good battery if unknown
    }
    
    // Low power mode penalty
    if (device.isLowPowerMode) {
      score *= 0.7;
    }
    
    return Math.min(1, score + 0.1); // Add base score
  }

  /**
   * Get viewport size
   */
  private getViewportSize() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  /**
   * Calculate optimal quality based on analyzed factors
   */
  private calculateOptimalQuality(factors: any): VideoQualityLevel {
    const availableQualities = this.getAvailableQualities();
    
    // Apply quality preference
    let targetQualities = availableQualities;
    
    switch (this.config.qualityPreference) {
      case 'data-saver':
        targetQualities = availableQualities.filter(q => q.bitrate <= 800);
        break;
      case 'performance':
        targetQualities = availableQualities.filter(q => q.bitrate <= 2500);
        break;
      case 'quality':
        // No filtering, allow all qualities
        break;
      case 'auto':
      default:
        // Apply automatic filtering based on conditions
        break;
    }

    // Filter by bandwidth
    const maxBitrate = factors.availableBandwidth * 1000 * this.config.bitrateMultiplier;
    targetQualities = targetQualities.filter(q => q.bitrate <= maxBitrate);

    // Filter by device capabilities
    if (this.deviceCapabilities) {
      targetQualities = targetQualities.filter(q => 
        q.width <= this.deviceCapabilities!.maxResolution.width &&
        q.height <= this.deviceCapabilities!.maxResolution.height
      );
    }

    // Filter by viewport size (don't stream higher than display)
    const viewport = factors.viewportSize;
    targetQualities = targetQualities.filter(q => 
      q.width <= viewport.width * 2 && // Allow some headroom for zoom
      q.height <= viewport.height * 2
    );

    // Apply buffer health factor
    if (factors.bufferHealth < 0.3) {
      // Poor buffer health, prefer lower quality
      targetQualities = targetQualities.filter(q => q.bitrate <= maxBitrate * 0.6);
    }

    // Apply battery/power saving
    if (factors.batteryLevel < 20 || factors.isLowPowerMode) {
      targetQualities = targetQualities.filter(q => q.bitrate <= 1200);
    }

    // Apply metered connection restrictions
    if (factors.isMetered) {
      targetQualities = targetQualities.filter(q => q.bitrate <= 800);
    }

    // Select the highest quality from remaining options
    if (targetQualities.length === 0) {
      // Fallback to lowest quality, or lowest available if no qualities match
      if (availableQualities.length > 0) return availableQualities[0]!;
      if (this.qualityLevels.length > 0) return this.qualityLevels[0]!;
      return this.qualityLevels[this.qualityLevels.length - 1]!; // Fallback to lowest quality
    }

    if (targetQualities.length > 0) return targetQualities[targetQualities.length - 1]!;
    return this.qualityLevels[0]!;
  }

  /**
   * Get available quality levels (excluding auto)
   */
  private getAvailableQualities(): VideoQualityLevel[] {
    return this.qualityLevels.filter(q => q.id !== 'auto');
  }

  /**
   * Switch to a specific quality level
   */
  switchQuality(qualityId: string, reason: string = 'manual'): boolean {
    const targetQuality = this.qualityLevels.find(q => q.id === qualityId);
    if (!targetQuality) return false;

    // Check switch rate limiting
    if (!this.canSwitchQuality()) {
      console.warn('Quality switch rate limited');
      return false;
    }

    const previousQuality = this.currentQuality;
    this.currentQuality = targetQuality;

    // Record switch
    this.switchHistory.push({
      timestamp: Date.now(),
      from: previousQuality?.id || 'none',
      to: targetQuality.id,
      reason,
    });

    // Keep only recent history
    const oneMinuteAgo = Date.now() - 60000;
    this.switchHistory = this.switchHistory.filter(s => s.timestamp > oneMinuteAgo);

    return true;
  }

  /**
   * Check if quality switching is allowed (rate limiting)
   */
  private canSwitchQuality(): boolean {
    const oneMinuteAgo = Date.now() - 60000;
    const recentSwitches = this.switchHistory.filter(s => s.timestamp > oneMinuteAgo);
    return recentSwitches.length < this.config.maxSwitchesPerMinute;
  }

  /**
   * Monitor video playback and suggest quality changes
   */
  monitorPlayback(videoElement: HTMLVideoElement): void {
    const checkInterval = setInterval(() => {
      if (videoElement.paused || videoElement.ended) {
        clearInterval(checkInterval);
        return;
      }

      const bufferHealth = this.getBufferHealth(videoElement);
      this.bufferHealthHistory.push({
        timestamp: Date.now(),
        bufferLevel: bufferHealth,
      });

      // Keep only recent history
      const fiveMinutesAgo = Date.now() - 300000;
      this.bufferHealthHistory = this.bufferHealthHistory.filter(b => b.timestamp > fiveMinutesAgo);

      // Check if quality adjustment is needed
      this.evaluateQualityAdjustment(videoElement, bufferHealth);
    }, 5000); // Check every 5 seconds
  }

  /**
   * Evaluate if quality adjustment is needed
   */
  private evaluateQualityAdjustment(videoElement: HTMLVideoElement, bufferHealth: number): void {
    if (!this.config.enabled || !this.currentQuality) return;

    const recentBufferHealth = this.bufferHealthHistory.slice(-6); // Last 30 seconds
    const avgBufferHealth = recentBufferHealth.reduce((sum, b) => sum + b.bufferLevel, 0) / recentBufferHealth.length;

    // Consider switching down if buffer health is consistently poor
    if (avgBufferHealth < 0.3 && this.canSwitchQuality()) {
      const lowerQuality = this.getLowerQuality(this.currentQuality);
      if (lowerQuality) {
        console.log('Switching to lower quality due to poor buffer health');
        this.switchQuality(lowerQuality.id, 'buffer-health');
      }
    }

    // Consider switching up if buffer health is consistently good
    if (avgBufferHealth > 0.8 && this.canSwitchQuality()) {
      const higherQuality = this.getHigherQuality(this.currentQuality);
      if (higherQuality) {
        const optimalQuality = this.getOptimalQuality(videoElement);
        if (higherQuality.bitrate <= optimalQuality.bitrate) {
          console.log('Switching to higher quality due to good buffer health');
          this.switchQuality(higherQuality.id, 'buffer-health');
        }
      }
    }
  }

  /**
   * Get next lower quality level
   */
  private getLowerQuality(currentQuality: VideoQualityLevel): VideoQualityLevel | null {
    const availableQualities = this.getAvailableQualities().sort((a, b) => a.bitrate - b.bitrate);
    const currentIndex = availableQualities.findIndex(q => q.id === currentQuality.id);
    if (currentIndex > 0 && availableQualities.length > currentIndex - 1) return availableQualities[currentIndex - 1]!;
    return null;
  }

  /**
   * Get next higher quality level
   */
  private getHigherQuality(currentQuality: VideoQualityLevel): VideoQualityLevel | null {
    const availableQualities = this.getAvailableQualities().sort((a, b) => a.bitrate - b.bitrate);
    const currentIndex = availableQualities.findIndex(q => q.id === currentQuality.id);
    if (currentIndex >= 0 && currentIndex < availableQualities.length - 1) return availableQualities[currentIndex + 1]!;
    return null;
  }

  /**
   * Get quality statistics
   */
  getQualityStats() {
    return {
      currentQuality: this.currentQuality,
      availableQualities: this.qualityLevels,
      networkCondition: this.networkCondition,
      deviceCapabilities: this.deviceCapabilities,
      recentSwitches: this.switchHistory.slice(-10),
      averageBufferHealth: this.bufferHealthHistory.length > 0 
        ? this.bufferHealthHistory.reduce((sum, b) => sum + b.bufferLevel, 0) / this.bufferHealthHistory.length
        : 0,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AdaptiveStreamingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.switchHistory = [];
    this.bandwidthHistory = [];
    this.bufferHealthHistory = [];
  }
}

// Singleton instance
let qualityManager: VideoQualityManager | null = null;

/**
 * Get or create the video quality manager instance
 */
export const getVideoQualityManager = (config?: Partial<AdaptiveStreamingConfig>): VideoQualityManager => {
  if (!qualityManager) {
    qualityManager = new VideoQualityManager(config);
  }
  return qualityManager;
};

export default VideoQualityManager;