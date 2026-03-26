// mobile/services/CallService.ts
// Daily.co WebRTC abstraction
// Hides video provider details behind a clean interface
// Swap Daily for Agora/Twilio by implementing CallProvider

import Daily, {
  DailyCall,
  DailyEvent,
  DailyParticipant,
  DailyEventObjectParticipant,
} from '@daily-co/react-native-daily-js';

export interface CallProvider {
  join(roomUrl: string, token: string): Promise<void>;
  leave(): Promise<void>;
  toggleMicrophone(enabled: boolean): void;
  toggleCamera(enabled: boolean): void;
  onParticipantJoined(callback: (participant: RemoteParticipant) => void): void;
  onParticipantLeft(callback: (participantId: string) => void): void;
  onCallEnded(callback: () => void): void;
  destroy(): void;
}

export interface RemoteParticipant {
  id: string;
  userId: string;
  userName: string;
  videoTrack: any;
  audioTrack: any;
}

class DailyCallService implements CallProvider {
  private callObject: DailyCall | null = null;
  private joinedCallbacks: Array<(p: RemoteParticipant) => void> = [];
  private leftCallbacks: Array<(id: string) => void> = [];
  private endedCallbacks: Array<() => void> = [];

  constructor() {
    this.callObject = Daily.createCallObject({
      audioSource: true,
      videoSource: true,
    });
    this.setupListeners();
  }

  private setupListeners(): void {
    if (!this.callObject) return;

    this.callObject.on('participant-joined', (event?: DailyEventObjectParticipant) => {
      if (!event || event.participant.local) return;
      const p = event.participant;
      this.joinedCallbacks.forEach((cb) =>
        cb({
          id: p.session_id,
          userId: p.user_id || p.session_id,
          userName: p.user_name || 'User',
          videoTrack: p.tracks?.video?.track || null,
          audioTrack: p.tracks?.audio?.track || null,
        })
      );
    });

    this.callObject.on('participant-left', (event?: DailyEventObjectParticipant) => {
      if (!event) return;
      this.leftCallbacks.forEach((cb) => cb(event.participant.session_id));
    });

    this.callObject.on('left-meeting', () => {
      this.endedCallbacks.forEach((cb) => cb());
    });
  }

  async join(roomUrl: string, token: string): Promise<void> {
    if (!this.callObject) {
      throw new Error('Call object not initialised');
    }
    await this.callObject.join({ url: roomUrl, token });
  }

  async leave(): Promise<void> {
    if (this.callObject) {
      await this.callObject.leave();
    }
  }

  toggleMicrophone(enabled: boolean): void {
    this.callObject?.setLocalAudio(enabled);
  }

  toggleCamera(enabled: boolean): void {
    this.callObject?.setLocalVideo(enabled);
  }

  onParticipantJoined(callback: (participant: RemoteParticipant) => void): void {
    this.joinedCallbacks.push(callback);
  }

  onParticipantLeft(callback: (participantId: string) => void): void {
    this.leftCallbacks.push(callback);
  }

  onCallEnded(callback: () => void): void {
    this.endedCallbacks.push(callback);
  }

  /**
   * Get the underlying Daily call object for DailyProvider.
   * Only used by the React Native Daily components.
   */
  getCallObject(): DailyCall | null {
    return this.callObject;
  }

  destroy(): void {
    if (this.callObject) {
      this.callObject.destroy();
      this.callObject = null;
    }
    this.joinedCallbacks = [];
    this.leftCallbacks = [];
    this.endedCallbacks = [];
  }
}

// Singleton instance — one active call at a time
let instance: DailyCallService | null = null;

export function getCallService(): DailyCallService {
  if (!instance) {
    instance = new DailyCallService();
  }
  return instance;
}

export function destroyCallService(): void {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}
