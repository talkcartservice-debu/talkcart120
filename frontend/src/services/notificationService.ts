import { Call } from './callService';

export interface NotificationOptions {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
    actions?: Array<{ action: string; title: string; icon?: string }>;
    data?: any;
}

export interface RingtoneOptions {
    volume?: number;
    loop?: boolean;
    duration?: number; // in milliseconds
}

export class NotificationService {
    private static instance: NotificationService;
    private ringtoneAudio: HTMLAudioElement | null = null;
    private vibrationPattern: number[] = [500, 200, 500, 200, 500]; // More mobile-friendly pattern
    private isRingtoneLoaded = false;
    private notificationPermission: NotificationPermission = 'default';
    private vibrationInterval: NodeJS.Timeout | null = null;

    private constructor() {
        // Guard: only run browser-specific setup on the client
        if (typeof window !== 'undefined') {
            this.initializeRingtone();
            this.requestNotificationPermission();
        }
    }

    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    private async initializeRingtone() {
        if (typeof window === 'undefined' || typeof (window as any).Audio === 'undefined') {
            this.isRingtoneLoaded = false;
            return;
        }
        try {
            // Create ringtone audio element
            this.ringtoneAudio = new Audio();

            // Try to use a real ringtone file first, fallback to generated one
            const ringtoneUrls = [
                '/sounds/ringtone.wav',
                '/sounds/ringtone.mp3'
            ];

            this.ringtoneAudio.loop = true;
            this.ringtoneAudio.volume = 0.8; // Slightly reduced volume for better mobile experience
            this.ringtoneAudio.preload = 'auto';

            let loadedSuccessfully = false;
            
            // Try each URL until one works
            for (const url of ringtoneUrls) {
                try {
                    this.ringtoneAudio.src = url;

                    // Test if the audio can be loaded
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('Timeout loading audio'));
                        }, 2000);

                        const onLoad = () => {
                            clearTimeout(timeout);
                            this.ringtoneAudio!.removeEventListener('canplaythrough', onLoad);
                            this.ringtoneAudio!.removeEventListener('error', onError);
                            resolve(true);
                        };

                        const onError = (e: any) => {
                            clearTimeout(timeout);
                            this.ringtoneAudio!.removeEventListener('canplaythrough', onLoad);
                            this.ringtoneAudio!.removeEventListener('error', onError);
                            reject(e);
                        };

                        this.ringtoneAudio!.addEventListener('canplaythrough', onLoad);
                        this.ringtoneAudio!.addEventListener('error', onError);
                        this.ringtoneAudio!.load();
                    });

                    this.isRingtoneLoaded = true;
                    console.log(`Ringtone loaded successfully from: ${url}`);
                    loadedSuccessfully = true;
                    break;
                } catch (error) {
                    console.warn(`Failed to load ringtone from ${url}:`, error);
                    continue;
                }
            }

            // If no external files loaded, use the programmatic fallback
            if (!loadedSuccessfully) {
                console.log('Using programmatic ringtone fallback');
                try {
                    const dataUrl = this.createRingtoneDataURL();
                    this.ringtoneAudio.src = dataUrl;
                    this.ringtoneAudio.load();
                    this.isRingtoneLoaded = true;
                    console.log('Programmatic ringtone loaded successfully');
                } catch (error) {
                    console.error('Failed to create programmatic ringtone:', error);
                    this.isRingtoneLoaded = false;
                }
            }

            if (!this.isRingtoneLoaded) {
                console.error('Failed to load any ringtone - no fallbacks worked');
            }

        } catch (error) {
            console.error('Failed to initialize ringtone:', error);
            // Try programmatic fallback as last resort
            try {
                if (this.ringtoneAudio) {
                    const dataUrl = this.createRingtoneDataURL();
                    this.ringtoneAudio.src = dataUrl;
                    this.ringtoneAudio.load();
                    this.isRingtoneLoaded = true;
                    console.log('Emergency programmatic ringtone loaded');
                }
            } catch (fallbackError) {
                console.error('Emergency fallback also failed:', fallbackError);
                this.isRingtoneLoaded = false;
            }
        }
    }

    private createRingtoneDataURL(): string {
        try {
            // Create a simple ringtone using Web Audio API
            if (typeof window === 'undefined') throw new Error('No window in SSR');
            const AudioContextCtor = (window as any).AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContextCtor();
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

            // Convert buffer to WAV data URL
            return this.bufferToWavDataURL(buffer);
        } catch (error) {
            console.error('Failed to create ringtone:', error);
            // Fallback to a simple beep
            return 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTuR2O/Eeyw';
        }
    }

    private bufferToWavDataURL(buffer: AudioBuffer): string {
        const length = buffer.length;
        const arrayBuffer = new ArrayBuffer(44 + length * 2);
        const view = new DataView(arrayBuffer);
        const data = buffer.getChannelData(0);

        // WAV header
        const writeString = (offset: number, string: string) => {
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
            const sample = Math.max(-1, Math.min(1, data[i] || 0));
            view.setInt16(offset, sample * 0x7FFF, true);
            offset += 2;
        }

        // Convert to base64
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i] || 0);
        }
        const base64 = btoa(binary);

        return `data:audio/wav;base64,${base64}`;
    }

    private async requestNotificationPermission(): Promise<void> {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            this.notificationPermission = await Notification.requestPermission();
        }
    }

    public async showIncomingCallNotification(call: Call): Promise<Notification | null> {
        if (typeof window === 'undefined' || !('Notification' in window) || this.notificationPermission !== 'granted') {
            console.warn('Notifications not supported or not permitted');
            return null;
        }

        const caller = call.initiator;
        const callType = call.type === 'video' ? 'Video' : 'Audio';

        const options: NotificationOptions = {
            title: `🔔 INCOMING ${callType.toUpperCase()} CALL`,
            body: `📞 ${caller.displayName} is calling you - Click to answer!`,
            icon: caller.avatar || '/default-avatar.png',
            tag: `call-${call.callId}`,
            requireInteraction: true,
            actions: [
                {
                    action: 'accept',
                    title: '✅ Accept',
                    icon: '/icons/phone-accept.png'
                },
                {
                    action: 'decline',
                    title: '❌ Decline',
                    icon: '/icons/phone-decline.png'
                }
            ],
            data: {
                callId: call.callId,
                callType: call.type,
                caller: caller
            }
        };

        try {
            const notification = new Notification(options.title, options);

            // Handle notification clicks
            notification.onclick = () => {
                if (typeof window !== 'undefined') {
                    window.focus();
                    notification.close();
                    // Emit event to handle call acceptance
                    window.dispatchEvent(new CustomEvent('notification-call-accept', {
                        detail: { callId: call.callId }
                    }));
                } else {
                    notification.close();
                }
            };

            return notification;
        } catch (error) {
            console.error('Failed to show notification:', error);
            return null;
        }
    }

    public async startRingtone(options: RingtoneOptions = {}): Promise<void> {
        if (!this.ringtoneAudio || !this.isRingtoneLoaded) {
            console.warn('Ringtone not available');
            return;
        }

        try {
            // Set volume
            if (options.volume !== undefined) {
                this.ringtoneAudio.volume = Math.max(0, Math.min(1, options.volume));
            }

            // Set loop
            this.ringtoneAudio.loop = options.loop !== false; // Default to true

            // Reset and play
            this.ringtoneAudio.currentTime = 0;
            await this.ringtoneAudio.play();

            // Set duration if specified
            if (options.duration) {
                setTimeout(() => {
                    this.stopRingtone();
                }, options.duration);
            }

        } catch (error) {
            console.error('Failed to start ringtone:', error);
        }
    }

    public stopRingtone(): void {
        if (this.ringtoneAudio) {
            this.ringtoneAudio.pause();
            this.ringtoneAudio.currentTime = 0;
        }
    }

    public startVibration(pattern?: number[], continuous: boolean = false): void {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            const vibrationPattern = pattern || this.vibrationPattern;
            navigator.vibrate(vibrationPattern);

            // If continuous vibration is requested, set up interval
            if (continuous) {
                this.stopVibration(); // Clear any existing interval
                const totalPatternTime = vibrationPattern.reduce((sum, time) => sum + time, 0);

                this.vibrationInterval = setInterval(() => {
                    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                        navigator.vibrate(vibrationPattern);
                    }
                }, totalPatternTime + 300); // Reduced gap for more responsive vibration
            }
        } else {
            console.warn('Vibration not supported on this device');
        }
    }

    public stopVibration(): void {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(0);
        }

        // Clear continuous vibration interval
        if (this.vibrationInterval) {
            clearInterval(this.vibrationInterval);
            this.vibrationInterval = null;
        }
    }

    public async startIncomingCallAlert(call: Call): Promise<void> {
        console.log('🔔 Starting incoming call alert for:', call.initiator.displayName);

        // Start all alert mechanisms
        await Promise.all([
            this.showIncomingCallNotification(call),
            this.startRingtone({ loop: true, volume: 0.8 }), // Slightly reduced volume for mobile
            Promise.resolve(this.startVibration(undefined, true)) // Continuous vibration
        ]);

        console.log('✅ All call alerts started successfully');
    }

    public stopIncomingCallAlert(): void {
        console.log('🔇 Stopping all call alerts');
        this.stopRingtone();
        this.stopVibration();
        this.clearCallNotifications();
        console.log('✅ All call alerts stopped');
    }

    public clearCallNotifications(): void {
        // Clear all call-related notifications
        if ('serviceWorker' in navigator && 'getNotifications' in ServiceWorkerRegistration.prototype) {
            navigator.serviceWorker.ready.then(registration => {
                registration.getNotifications({ tag: 'call-' }).then(notifications => {
                    notifications.forEach(notification => notification.close());
                });
            });
        }
    }

    public async requestPermissions(): Promise<{
        notification: NotificationPermission;
        audio: boolean;
    }> {
        const results = {
            notification: this.notificationPermission,
            audio: false
        };

        // Request notification permission
        if (typeof window !== 'undefined' && 'Notification' in window) {
            results.notification = await Notification.requestPermission();
            this.notificationPermission = results.notification;
        }

        // Test audio permission by trying to play a silent audio
        try {
            if (typeof window !== 'undefined' && typeof (window as any).Audio !== 'undefined') {
                const testAudio = new Audio();
                testAudio.volume = 0;
                testAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTuR2O/Eeyw';
                await testAudio.play();
                results.audio = true;
            }
        } catch (error) {
            console.warn('Audio permission not granted or not available');
            results.audio = false;
        }

        return results;
    }

    public isSupported(): {
        notifications: boolean;
        vibration: boolean;
        audio: boolean;
    } {
        return {
            notifications: typeof window !== 'undefined' && 'Notification' in window,
            vibration: typeof navigator !== 'undefined' && 'vibrate' in navigator,
            audio: typeof window !== 'undefined' && 'Audio' in window
        };
    }

    public getPermissionStatus(): {
        notification: NotificationPermission;
        audio: boolean;
    } {
        return {
            notification: this.notificationPermission,
            audio: this.isRingtoneLoaded
        };
    }
}

export const notificationService = NotificationService.getInstance();