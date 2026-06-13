import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Trash2 } from 'lucide-react';

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
};

const interleave = (inputL: Float32Array, inputR: Float32Array): Float32Array => {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);
  
  let index = 0;
  let inputIndex = 0;
  
  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
};

const bufferToWav = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // 1 = Raw PCM (16-bit integers)
  const bitDepth = 16;
  
  let result;
  if (numOfChan === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }
  
  const bufferLength = result.length * 2;
  const arrayBuffer = new ArrayBuffer(44 + bufferLength);
  const view = new DataView(arrayBuffer);
  
  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + bufferLength, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numOfChan, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numOfChan * (bitDepth / 8), true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, bufferLength, true);
  
  // Write the PCM audio samples
  floatTo16BitPCM(view, 44, result);
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

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
  const playPromiseRef = useRef<Promise<void> | null>(null);

  const [fileSize, setFileSize] = useState<string | null>(null);
  const [srtFileSize, setSrtFileSize] = useState<string | null>(null);

  const handleDownload = async (url: string, extension: string) => {
    try {
      setIsDownloading(extension);
      let name = fileName || 'KC_Voice';
      if (name.toLowerCase().endsWith('.wav')) {
        name = name.slice(0, -4);
      } else if (name.toLowerCase().endsWith('.mp3')) {
        name = name.slice(0, -4);
      }

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
    
    // Helper to format bytes safely
    const formatBytes = (bytes: number) => {
        if (!bytes || isNaN(bytes) || bytes <= 0) return '0 Bytes';
        try {
          const k = 1024;
          const dm = 2;
          const sizes = ['Bytes', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          if (isNaN(i) || i < 0 || i >= sizes.length) return '0 Bytes';
          return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        } catch (e) {
          return '0 Bytes';
        }
    };

    let isSubscribed = true;

    // Fetch size safely
    if (audioUrl && typeof audioUrl === 'string' && !audioUrl.includes('undefined') && audioUrl.trim().length > 0) {
      fetch(audioUrl, { method: 'HEAD' }).then(res => {
          if (!isSubscribed) return;
          if (res.ok) {
            const size = res.headers.get('content-length');
            if (size) {
              const parsed = parseInt(size);
              if (!isNaN(parsed) && parsed > 0) {
                setFileSize(formatBytes(parsed));
              }
            }
          }
      }).catch(e => console.warn("Could not fetch file size info", e));
    }

    // Fetch SRT size safely
    if (srtUrl && typeof srtUrl === 'string' && !srtUrl.includes('undefined') && srtUrl.trim().length > 0) {
      fetch(srtUrl, { method: 'HEAD' }).then(res => {
          if (!isSubscribed) return;
          if (res.ok) {
            const size = res.headers.get('content-length');
            if (size) {
              const parsed = parseInt(size);
              if (!isNaN(parsed) && parsed > 0) {
                setSrtFileSize(formatBytes(parsed));
              }
            }
          }
      }).catch(e => console.warn("Could not fetch srt size info", e));
    }

    const updateProgress = () => {
      if (isSubscribed) {
        setProgress(audio.currentTime);
      }
    };

    const updateDuration = () => {
      if (isSubscribed) {
        setDuration(audio.duration);
      }
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);

    return () => {
      isSubscribed = false;
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [audioUrl, srtUrl]);

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
    <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700/50 space-y-3">
      <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
      
      {/* Player */}
      <div className="flex items-center gap-3">
        <button 
          onClick={togglePlay}
          className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition"
        >
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

      {/* Downloads */}
      <div className="flex justify-around items-center px-1 pt-1 border-t border-gray-100 dark:border-gray-700/50">
        <button 
          onClick={() => handleDownload(audioUrl, 'mp3')}
          disabled={isDownloading !== null}
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50"
        >
          <div className="flex items-center gap-1">
            <Download size={12} className={isDownloading === 'mp3' ? 'animate-bounce' : ''} />
            {isDownloading === 'mp3' ? 'Down...' : 'MP3'}
          </div>
          {fileSize && <span className="text-[9px] text-gray-400 dark:text-gray-500 font-normal">{fileSize}</span>}
        </button>

        <button 
          onClick={() => handleDownload(srtUrl, 'srt')}
          disabled={isDownloading !== null}
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 disabled:opacity-50"
        >
          <div className="flex items-center gap-1">
            <Download size={12} className={isDownloading === 'srt' ? 'animate-bounce' : ''} />
            {isDownloading === 'srt' ? 'Down...' : 'SRT File'}
          </div>
          {srtFileSize && <span className="text-[9px] text-gray-400 dark:text-gray-500 font-normal">{srtFileSize}</span>}
        </button>
      </div>
    </div>
  );
};
