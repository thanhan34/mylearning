'use client';

import { useState, useRef, useEffect } from 'react';
import { VoiceFeedback } from '@/app/firebase/services/voice-feedback';
import { format } from 'date-fns';

interface VoiceFeedbackPlayerProps {
  voiceFeedbacks: VoiceFeedback[];
  className?: string;
}

export default function VoiceFeedbackPlayer({ voiceFeedbacks, className = '' }: VoiceFeedbackPlayerProps) {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Record<string, number>>({});
  const [duration, setDuration] = useState<Record<string, number>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    // Cleanup audio refs when component unmounts
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  const handlePlay = (voiceFeedbackId: string, audioUrl: string) => {
    // Pause any currently playing audio
    if (currentlyPlaying && currentlyPlaying !== voiceFeedbackId) {
      const currentAudio = audioRefs.current[currentlyPlaying];
      if (currentAudio) {
        currentAudio.pause();
      }
    }

    // Get or create audio element
    let audio = audioRefs.current[voiceFeedbackId];
    if (!audio) {
      audio = new Audio(audioUrl);
      audioRefs.current[voiceFeedbackId] = audio;

      // Set up event listeners
      audio.addEventListener('loadedmetadata', () => {
        setDuration(prev => ({
          ...prev,
          [voiceFeedbackId]: audio.duration
        }));
      });

      audio.addEventListener('timeupdate', () => {
        setCurrentTime(prev => ({
          ...prev,
          [voiceFeedbackId]: audio.currentTime
        }));
      });

      audio.addEventListener('ended', () => {
        setCurrentlyPlaying(null);
        setCurrentTime(prev => ({
          ...prev,
          [voiceFeedbackId]: 0
        }));
      });

      audio.addEventListener('pause', () => {
        if (currentlyPlaying === voiceFeedbackId) {
          setCurrentlyPlaying(null);
        }
      });
    }

    if (currentlyPlaying === voiceFeedbackId) {
      // Pause if currently playing
      audio.pause();
      setCurrentlyPlaying(null);
    } else {
      // Play audio
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
      });
      setCurrentlyPlaying(voiceFeedbackId);
    }
  };

  const handleSeek = (voiceFeedbackId: string, seekTime: number) => {
    const audio = audioRefs.current[voiceFeedbackId];
    if (audio) {
      audio.currentTime = seekTime;
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'HH:mm dd/MM/yyyy');
  };

  if (voiceFeedbacks.length === 0) {
    return (
      <div className={`text-center py-4 text-gray-500 ${className}`}>
        Chưa có feedback bằng giọng nói
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h4 className="text-sm font-medium text-gray-700 mb-3">
        Feedback bằng giọng nói ({voiceFeedbacks.length})
      </h4>
      
      {voiceFeedbacks.map((voiceFeedback) => {
        const isPlaying = currentlyPlaying === voiceFeedback.id;
        const currentTimeValue = currentTime[voiceFeedback.id!] || 0;
        const durationValue = duration[voiceFeedback.id!] || voiceFeedback.duration || 0;
        const progress = durationValue > 0 ? (currentTimeValue / durationValue) * 100 : 0;

        return (
          <div
            key={voiceFeedback.id}
            className="bg-[#fedac2]/10 border border-[#fc5d01]/20 rounded-lg p-4"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-sm font-medium text-[#fc5d01]">
                  {voiceFeedback.teacherName}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDate(voiceFeedback.createdAt)}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {formatTime(durationValue)}
              </div>
            </div>

            {/* Audio Controls */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handlePlay(voiceFeedback.id!, voiceFeedback.audioUrl)}
                className="flex items-center justify-center w-10 h-10 bg-[#fc5d01] text-white rounded-full hover:bg-[#fd7f33] transition-colors"
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                )}
              </button>

              <div className="flex-1">
                {/* Progress Bar */}
                <div className="relative">
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#fc5d01] transition-all duration-100"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={durationValue}
                    value={currentTimeValue}
                    onChange={(e) => handleSeek(voiceFeedback.id!, parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                  />
                </div>

                {/* Time Display */}
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{formatTime(currentTimeValue)}</span>
                  <span>{formatTime(durationValue)}</span>
                </div>
              </div>
            </div>

            {/* Download Link */}
            <div className="mt-3 pt-3 border-t border-[#fc5d01]/10">
              <a
                href={voiceFeedback.audioUrl}
                download={`feedback_${voiceFeedback.studentName}_${formatDate(voiceFeedback.createdAt)}.webm`}
                className="text-xs text-[#fc5d01] hover:text-[#fd7f33] flex items-center space-x-1"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span>Tải xuống</span>
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
