
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronDown, Minus } from 'lucide-react';
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

  useEffect(() => {
    const fetchPlaylist = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('tutorials')
        .select('*')
        .eq('tool_key', 'music_playlist')
        .order('id', { ascending: true });
      
      if (!error && data && data.length > 0) {
        setPlaylist(data.map(item => ({ id: item.video_id, start: item.time_start || 0 })));
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
            <button 
              onClick={() => setShowVideo(!showVideo)} 
              className={`p-1 rounded-full transition-colors ${showVideo ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:bg-gray-100'}`}
            >
              <ChevronDown size={14} className={showVideo ? 'rotate-180' : ''} />
            </button>
          </div>
        )}
      </div>

      {showToast && (
        <div className="fixed top-20 left-4 z-[200] bg-indigo-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-lg animate-in fade-in zoom-in duration-300 uppercase tracking-widest whitespace-nowrap">
          အသံထုတ်နေရင်းပျင်းရင်နားထောင်ဖို့
        </div>
      )}

      {/* Video Container */}
      <div 
        className={`fixed z-[100] transition-all duration-700 ease-in-out ${
          showVideo 
            ? 'top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl aspect-video opacity-100 scale-100' 
            : 'top-24 left-1/2 -translate-x-1/2 w-0 h-0 opacity-0 scale-0 pointer-events-none'
        }`}
      >
        <div className="relative w-full h-full bg-black rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-4 border-white">
          <button 
            onClick={() => setShowVideo(false)}
            className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
          >
            <Minus size={20} />
          </button>
          <div id="youtube-player" className="w-full h-full"></div>
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;
