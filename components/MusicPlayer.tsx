
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronDown, Minus, GripHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';

const DEFAULT_PLAYLIST = [
  { id: 'nC_ukkiLuXY', start: 2 },
  { id: 'JUSeIfAtzPM', start: 11 },
  { id: 'K2FAoUg_Q3E', start: 55 },
  { id: 'LUqf2auMuWY', start: 0 },
  { id: '5QWZOhl4L98', start: 0 },
  { id: 'sVBWg9fCG_c', start: 60 },
  { id: 'wjf6Ao10wZE', start: 3 },
  { id: 'B7LzAJ5x4Ro', start: 28 },
  { id: 'UaTrC6ck2Lk', start: 40 },
  { id: 'jjyLMGrbGVY', start: 21 },
];

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

const MusicPlayer: React.FC = () => {
  const [playlist, setPlaylist] = useState<{id: string, start: number}[]>(DEFAULT_PLAYLIST);
  const [isActive, setIsActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const playerRef = useRef<any>(null);

  // Drag states for floating Picture-in-Picture player box
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;

    const dragContainer = target.closest('.draggable-player') as HTMLElement;
    if (!dragContainer) return;

    setIsDragging(true);
    const rect = dragContainer.getBoundingClientRect();
    const currentX = rect.left;
    const currentY = rect.top;

    setPosition({ x: currentX, y: currentY });
    setHasDragged(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = { x: currentX, y: currentY };
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;

    const dragContainer = target.closest('.draggable-player') as HTMLElement;
    if (!dragContainer) return;

    setIsDragging(true);
    const rect = dragContainer.getBoundingClientRect();
    const currentX = rect.left;
    const currentY = rect.top;

    setPosition({ x: currentX, y: currentY });
    setHasDragged(true);
    const touch = e.touches[0];
    dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    initialPosRef.current = { x: currentX, y: currentY };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      let newX = initialPosRef.current.x + dx;
      let newY = initialPosRef.current.y + dy;

      const elementWidth = Math.min(420, window.innerWidth - 16);
      const elementHeight = (elementWidth * 9) / 16;

      const minX = 8;
      const maxX = window.innerWidth - elementWidth - 8;
      const minY = 8;
      const maxY = window.innerHeight - elementHeight - 8;

      newX = Math.max(minX, Math.min(newX, maxX));
      newY = Math.max(minY, Math.min(newY, maxY));

      setPosition({ x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;

      let newX = initialPosRef.current.x + dx;
      let newY = initialPosRef.current.y + dy;

      const elementWidth = Math.min(340, window.innerWidth - 16);
      const elementHeight = (elementWidth * 9) / 16;

      const minX = 8;
      const maxX = window.innerWidth - elementWidth - 8;
      const minY = 8;
      const maxY = window.innerHeight - elementHeight - 8;

      newX = Math.max(minX, Math.min(newX, maxX));
      newY = Math.max(minY, Math.min(newY, maxY));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    const fetchPlaylist = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('tutorials')
        .select('*')
        .eq('tool_key', 'music_playlist')
        .order('id', { ascending: true });
      
      if (!error && data && data.length > 0) {
        setPlaylist(data.map((item: any) => ({ id: item.video_id, start: item.time_start || 0 })));
      }
    };
    fetchPlaylist();

    // Load YouTube API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  const onPlayerReady = () => {
    setIsReady(true);
  };

  const onPlayerStateChange = (event: any) => {
    if (event.data === window.YT.PlayerState.ENDED) {
      nextTrack();
    }
  };

  const initPlayer = () => {
    if (window.YT && window.YT.Player && !playerRef.current) {
      playerRef.current = new window.YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: playlist[currentIndex].id,
        playerVars: {
          autoplay: 0,
          start: playlist[currentIndex].start,
          controls: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
        },
      });
    }
  };

  useEffect(() => {
    if (isActive && !playerRef.current) {
      if (window.YT && window.YT.Player) {
        initPlayer();
      } else {
        window.onYouTubeIframeAPIReady = initPlayer;
      }
    }
  }, [isActive]);

  useEffect(() => {
    if (playerRef.current && isReady && isActive) {
      if (playerRef.current.loadVideoById) {
        playerRef.current.loadVideoById({
          videoId: playlist[currentIndex].id,
          startSeconds: playlist[currentIndex].start,
        });
      }
      if (!isPlaying && playerRef.current.pauseVideo) {
        playerRef.current.pauseVideo();
      }
    }
  }, [currentIndex, isReady]);

  useEffect(() => {
    if (playerRef.current && isReady) {
      if (isPlaying) {
        if (playerRef.current.playVideo) playerRef.current.playVideo();
      } else {
        if (playerRef.current.pauseVideo) playerRef.current.pauseVideo();
      }
    }
  }, [isPlaying, isReady]);

  const togglePlayer = () => {
    if (!isActive) {
      setIsActive(true);
      setIsPlaying(false); // Disable autoplay for the first video
      setShowToast(true);
      setShowVideo(true); // Open video immediately
      setShowControls(true);
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } else {
      setIsActive(false);
      setIsPlaying(false);
      setShowControls(false);
      setShowVideo(false);
      setIsReady(false);
      setCurrentIndex(0);
      setHasDragged(false);
      setPosition({ x: 0, y: 0 });
      if (playerRef.current) {
        if (playerRef.current.destroy) playerRef.current.destroy();
        playerRef.current = null;
      }
    }
  };

  const nextTrack = () => {
    setCurrentIndex((prev) => (prev + 1) % playlist.length);
    setIsPlaying(true);
  };

  const prevTrack = () => {
    setCurrentIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
    setIsPlaying(true);
  };

  return (
    <div className="relative flex flex-col items-start gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={togglePlayer}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md ${
            isActive ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white hover:scale-110'
          }`}
        >
          {isActive ? <Minus size={16} /> : <Play size={16} fill="currentColor" />}
        </button>

        {showControls && (
          <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-full px-2 py-1 shadow-sm animate-in slide-in-from-left-2 duration-300">
            <button onClick={prevTrack} className="p-1 hover:bg-gray-100 rounded-full text-gray-600">
              <SkipBack size={14} fill="currentColor" />
            </button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="p-1 hover:bg-gray-100 rounded-full text-indigo-600">
              {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            </button>
            <button onClick={nextTrack} className="p-1 hover:bg-gray-100 rounded-full text-gray-600">
              <SkipForward size={14} fill="currentColor" />
            </button>
          </div>
        )}
      </div>

      {showToast && (
        <div className="fixed top-20 left-4 z-[200] bg-indigo-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-lg animate-in fade-in zoom-in duration-300 uppercase tracking-widest whitespace-nowrap">
          အသံထုတ်နေရင်းပျင်းရင်နားထောင်ဖို့
        </div>
      )}

      {/* Draggable PIP Video Container */}
      <div 
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={hasDragged ? { 
          left: `${position.x}px`, 
          top: `${position.y}px`
        } : undefined}
        className={`fixed z-[100] w-[90vw] max-w-[340px] md:max-w-[420px] aspect-video bg-black rounded-2xl shadow-2xl border-4 border-slate-200 dark:border-gray-800 overflow-hidden flex flex-col group select-none draggable-player cursor-grab active:cursor-grabbing ${
          !hasDragged ? 'top-24 left-1/2 -translate-x-1/2' : ''
        } ${
          isDragging ? 'shadow-indigo-500/30 scale-[1.02]' : ''
        } ${
          showVideo 
            ? 'opacity-100 scale-100 pointer-events-auto' 
            : 'opacity-0 scale-0 w-0 h-0 pointer-events-none'
        } transition-transform duration-100`}
      >
        {/* Header Drag Handle */}
        <div 
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/90 to-transparent flex items-center justify-between px-3 z-10 cursor-grab active:cursor-grabbing text-white"
          title="Drag and move playlist player box"
        >
          <div className="flex items-center gap-1.5 opacity-90 hover:opacity-100">
            <GripHorizontal size={14} className="text-gray-300" />
            <span className="text-[10px] font-extrabold tracking-wider uppercase font-mono bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
              📺 Music Video ({currentIndex + 1}/{playlist.length})
            </span>
          </div>
          
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePlayer();
            }}
            className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer text-white"
            title="Deactivate Player"
          >
            <Minus size={16} />
          </button>
        </div>

        <div id="youtube-player" className="w-full h-full"></div>
      </div>
    </div>
  );
};

export default MusicPlayer;
