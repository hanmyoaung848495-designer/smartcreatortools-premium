import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Trash2 } from 'lucide-react';

interface KCAudioPlayerProps {
  audioUrl: string;
  srtUrl: string;
  fileName: string;
  onDelete: () => void;
}

export const KCAudioPlayer: React.FC<KCAudioPlayerProps> = ({ audioUrl, srtUrl, fileName, onDelete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [fileSize, setFileSize] = useState<string | null>(null);
  const [srtFileSize, setSrtFileSize] = useState<string | null>(null);

  const handleDownload = async (url: string, extension: string) => {
    try {
      setIsDownloading(extension);
      const name = fileName || 'KC_Voice';
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${name}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(`Download failed for ${extension}:`, error);
    } finally {
      setIsDownloading(null);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // Helper to format bytes
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = 2;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    // Fetch size
    fetch(audioUrl, { method: 'HEAD' }).then(res => {
        const size = res.headers.get('content-length');
        if (size) setFileSize(formatBytes(parseInt(size)));
    }).catch(e => console.error("Could not fetch file size", e));

    // Fetch SRT size
    fetch(srtUrl, { method: 'HEAD' }).then(res => {
        const size = res.headers.get('content-length');
        if (size) setSrtFileSize(formatBytes(parseInt(size)));
    }).catch(e => console.error("Could not fetch srt size", e));

    const updateProgress = () => {
      setProgress(audio.currentTime);
    };

    const updateDuration = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setProgress(seekTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
      <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
      
      {/* Player */}
      <div className="flex items-center gap-3">
        <button 
          onClick={togglePlay}
          className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition"
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <span className="text-[10px] font-mono text-gray-500 w-9 text-center">{formatTime(progress)}</span>
        <input 
          type="range" 
          min="0" 
          max={isNaN(duration) ? 0 : duration} 
          value={progress} 
          onChange={handleSeek}
          className="flex-grow h-1 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <span className="text-[10px] font-mono text-gray-500 w-9 text-center">{formatTime(isNaN(duration) ? 0 : duration)}</span>
        <button onClick={onDelete} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition flex-shrink-0">
          <Trash2 size={18} />
        </button>
      </div>

      {/* Downloads */}
      <div className="flex justify-between items-center px-1 pt-1 border-t border-gray-100">
        <button 
          onClick={() => handleDownload(audioUrl, 'wav')}
          disabled={isDownloading !== null}
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-indigo-600 disabled:opacity-50"
        >
          <div className="flex items-center gap-1">
            <Download size={12} className={isDownloading === 'wav' ? 'animate-bounce' : ''} />
            {isDownloading === 'wav' ? 'Down...' : 'WAV'}
          </div>
          {fileSize && <span className="text-[9px] text-gray-400 font-normal">{fileSize}</span>}
        </button>

        <button 
          onClick={() => handleDownload(audioUrl, 'mp3')}
          disabled={isDownloading !== null}
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-indigo-600 disabled:opacity-50"
        >
          <div className="flex items-center gap-1">
            <Download size={12} className={isDownloading === 'mp3' ? 'animate-bounce' : ''} />
            {isDownloading === 'mp3' ? 'Down...' : 'MP3'}
          </div>
          {fileSize && <span className="text-[9px] text-gray-400 font-normal">{fileSize}</span>}
        </button>

        <button 
          onClick={() => handleDownload(srtUrl, 'srt')}
          disabled={isDownloading !== null}
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
        >
          <div className="flex items-center gap-1">
            <Download size={12} className={isDownloading === 'srt' ? 'animate-bounce' : ''} />
            {isDownloading === 'srt' ? 'Down...' : 'SRT File'}
          </div>
          {srtFileSize && <span className="text-[9px] text-gray-400 font-normal">{srtFileSize}</span>}
        </button>
      </div>
    </div>
  );
};
