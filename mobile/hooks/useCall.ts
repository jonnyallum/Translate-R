// mobile/hooks/useCall.ts
// Manages the Daily.co call lifecycle — join, leave, track remote participants

import { useEffect, useRef, useCallback } from 'react';
import { useCallStore } from '../stores/callStore';
import { getCallService, destroyCallService } from '../services/CallService';
import { endCall as apiEndCall } from '../services/api';

export function useCall() {
  const {
    activeCall,
    dailyToken,
    isMuted,
    isCameraOn,
    isConnected,
    setConnected,
    clearCall,
    toggleMute: storeMute,
    toggleCamera: storeCamera,
    setCallStartTime,
  } = useCallStore();

  const serviceRef = useRef(getCallService());

  // Join the call when we have a call + token
  useEffect(() => {
    if (!activeCall?.daily_room_url || !dailyToken) return;

    const service = serviceRef.current;

    const joinRoom = async () => {
      try {
        await service.join(activeCall.daily_room_url!, dailyToken);
        setConnected(true);
        setCallStartTime(Date.now());
        console.log('[useCall] Joined room:', activeCall.daily_room_url);
      } catch (error) {
        console.error('[useCall] Failed to join:', error);
      }
    };

    service.onParticipantJoined((participant) => {
      console.log('[useCall] Remote participant joined:', participant.userName);
    });

    service.onParticipantLeft((id) => {
      console.log('[useCall] Remote participant left:', id);
    });

    service.onCallEnded(() => {
      console.log('[useCall] Call ended');
      setConnected(false);
    });

    joinRoom();

    return () => {
      // Cleanup on unmount
      service.leave().catch(console.error);
    };
  }, [activeCall?.daily_room_url, dailyToken]);

  // Sync mute/camera state
  useEffect(() => {
    const service = serviceRef.current;
    service.toggleMicrophone(!isMuted);
  }, [isMuted]);

  useEffect(() => {
    const service = serviceRef.current;
    service.toggleCamera(isCameraOn);
  }, [isCameraOn]);

  const hangUp = useCallback(async () => {
    try {
      const service = serviceRef.current;
      await service.leave();

      if (activeCall?.id) {
        await apiEndCall(activeCall.id);
      }
    } catch (error) {
      console.error('[useCall] Hangup error:', error);
    } finally {
      destroyCallService();
      clearCall();
    }
  }, [activeCall?.id]);

  return {
    isConnected,
    isMuted,
    isCameraOn,
    toggleMute: storeMute,
    toggleCamera: storeCamera,
    hangUp,
    callObject: serviceRef.current.getCallObject(),
  };
}
