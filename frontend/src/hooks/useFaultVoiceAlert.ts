import { useEffect, useRef } from 'react';
import { useMqttStore } from '../store/useMqttStore';
import { useToastStore } from '../store/useToastStore';
import { detectFaults } from '../utils/faultDetector';
import { playAlarmSound, speakFaultAlert } from '../services/VoiceAlertService';

export const useFaultVoiceAlert = () => {
  const { parsedData, isVoiceMuted, isAudioInitialized } = useMqttStore();
  const { addToast } = useToastStore();
  
  // Track keys of faults that are currently active/acknowledged
  const activeFaultKeysRef = useRef<string[]>([]);
  // Use a ref to prevent overlapping trigger checks
  const isProcessingRef = useRef<boolean>(false);

  useEffect(() => {
    if (Object.keys(parsedData).length === 0) {
      return;
    }

    const { activeFaults } = detectFaults(parsedData);
    const currentKeys = activeFaults.map((f) => f.key);
    
    // Find faults that are newly active (not present in our previous checklist)
    const newFaults = activeFaults.filter(
      (fault) => !activeFaultKeysRef.current.includes(fault.key)
    );

    // Update the ref to match current active faults (clearing out resolved ones so they can re-trigger if they recur)
    activeFaultKeysRef.current = currentKeys;

    // If there are no new faults, we do not trigger any notifications or speech
    if (newFaults.length === 0) {
      return;
    }

    // Trigger Toast notifications immediately (always visible regardless of voice mute state)
    newFaults.forEach((fault) => {
      addToast({
        type: fault.severity === 'error' ? 'error' : 'warning',
        title: fault.label,
        message: fault.message,
        duration: 7000,
      });
    });

    // Handle audio warnings and Speech Synthesis
    if (!isVoiceMuted && isAudioInitialized && !isProcessingRef.current) {
      isProcessingRef.current = true;
      
      // Combine all new fault announcements
      const mergedSpeechText = newFaults.map((f) => f.message).join(' ');

      // Play the SCADA beep sound first, then speak the fault description
      playAlarmSound()
        .then(() => speakFaultAlert(mergedSpeechText))
        .finally(() => {
          isProcessingRef.current = false;
        });
    }
  }, [parsedData, isVoiceMuted, isAudioInitialized, addToast]);
};
