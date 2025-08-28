import React, { useRef, useState } from 'react';

interface VoiceTranscribeButtonProps {
  onTranscript: (transcript: string) => void;
  lang?: string; // optional, defaults to 'en-US'
}

// Add this so TypeScript knows about the browser API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const VoiceTranscribeButton: React.FC<VoiceTranscribeButtonProps> = ({ onTranscript, lang = 'en-US' }) => {
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = lang;

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        onTranscript(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };

      recognition.onend = () => {
        setListening(false);
      };
    }

    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (err) {
      console.error('Failed to start recognition:', err);
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return (
    <button onClick={listening ? stopListening : startListening}>
      {listening ? '⏹ Stop' : '🎤 Transcribe'}
    </button>
  );
};

export default VoiceTranscribeButton;
