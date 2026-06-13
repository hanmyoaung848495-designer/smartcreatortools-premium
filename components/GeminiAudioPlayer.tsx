import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Trash2 } from 'lucide-react';

interface GeminiAudioPlayerProps {
  audioUrl: string;
  fileName: string;
  onDelete: () => void;
}

export const GeminiAudioPlayer: React.FC<GeminiAudioPlayerProps> = ({ audioUrl, fileName, onDelete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  const handleDownload = (format: 'wav' | 'mp3') => {
    // For now, since Gemini only provides WAV-like blob, 
    // downloads will be wav in both cases, or we can suggest format.
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `${fileName || 'Gemini_Voice'}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const updateProgress = () => setProgress(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [audioUrl]);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      if (playPromiseRef.current) {
        try {
          await playPromiseRef.current;
        } catch (e) {}
      }
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      try {
        playPromiseRef.current = audioRef.current.play();
        await playPromiseRef.current;
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Playback failed:', error);
          setIsPlaying(false);
        }
      } finally {
        playPromiseRef.current = null;
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
        audioRef.current.currentTime = Number(e.target.value);
        setProgress(Number(e.target.value));
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700/50 space-y-3">
      <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
      
      <div className="flex items-center gap-3">
        <button onClick={togglePlay} className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition">
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 w-9 text-center">{formatTime(progress)}</span>
        <input 
          type="range" 
          min="0" 
          max={isNaN(duration) ? 0 : duration} 
          value={progress} 
          onChange={handleSeek}
          className="flex-grow h-1 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 w-9 text-center">{formatTime(isNaN(duration) ? 0 : duration)}</span>
        <button onClick={onDelete} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full transition flex-shrink-0">
          <Trash2 size={18} />
        </button>
      </div>

      <div className="flex justify-around items-center px-1 pt-1 border-t border-gray-100 dark:border-gray-700/50">
        <button onClick={() => handleDownload('wav')} className="flex flex-col items-center gap-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
          <Download size={12} /> WAV
        </button>
        <button onClick={() => handleDownload('mp3')} className="flex flex-col items-center gap-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
          <Download size={12} /> MP3
        </button>
      </div>
    </div>
  );
};
