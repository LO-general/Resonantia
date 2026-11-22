import React, { useState } from 'react';
import { Heart, MessageCircle, Bookmark, Share2, Music, Volume2, VolumeX, Play, Pause } from 'lucide-react';

interface TikTokPreviewEmulatorProps {
  videoUrl?: string;
  thumbnailUrl?: string;
  creatorHandle?: string;
  caption: string;
  hashtags: string[];
  soundTitle?: string;
  className?: string;
}

export const TikTokPreviewEmulator: React.FC<TikTokPreviewEmulatorProps> = ({
  videoUrl,
  thumbnailUrl,
  creatorHandle = '@mon_compte_tiktok',
  caption,
  hashtags,
  soundTitle = 'Son original - TikTok Creator',
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className={`relative mx-auto w-full max-w-[340px] aspect-[9/16] bg-black rounded-[36px] overflow-hidden shadow-2xl border-[6px] border-zinc-900 select-none ${className}`}>
      {/* Phone Notch / Dynamic Island */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-zinc-900 rounded-full z-30 pointer-events-none" />

      {/* Video or Thumbnail */}
      <div className="absolute inset-0 z-0 bg-zinc-950 flex items-center justify-center cursor-pointer" onClick={togglePlay}>
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            poster={thumbnailUrl}
            className="w-full h-full object-cover"
            playsInline
            loop
            autoPlay
            muted={isMuted}
          />
        ) : thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt="Preview frame"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-zinc-500 text-sm text-center px-4">
            Aperçu de la vidéo
          </div>
        )}

        {/* Play/Pause overlay indicator */}
        {!isPlaying && videoUrl && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <Play className="w-7 h-7 fill-white translate-x-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Subtle top gradient */}
      <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10" />

      {/* Top TikTok Navigation */}
      <div className="absolute top-8 inset-x-0 px-4 flex items-center justify-between text-white/90 z-20 text-xs font-semibold">
        <div className="text-[11px] opacity-80">LIVE</div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-white/60 font-medium">Abonnements</span>
          <span className="text-white font-bold relative pb-1">
            Pour toi
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-white rounded-full"></span>
          </span>
        </div>
        <button
          onClick={toggleMute}
          className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Right Action Bar */}
      <div className="absolute right-2 bottom-16 z-20 flex flex-col items-center gap-4 text-white">
        {/* Profile Avatar */}
        <div className="relative mb-1">
          <div className="w-11 h-11 rounded-full border-2 border-white bg-gradient-to-tr from-rose-500 to-amber-400 p-0.5 flex items-center justify-center text-white font-bold text-xs">
            {creatorHandle.replace('@', '').slice(0, 2).toUpperCase()}
          </div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">
            +
          </div>
        </div>

        {/* Like */}
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center active:scale-90 transition">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <span className="text-[11px] font-medium mt-0.5">14.2K</span>
        </div>

        {/* Comment */}
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center active:scale-90 transition">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-[11px] font-medium mt-0.5">384</span>
        </div>

        {/* Save */}
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center active:scale-90 transition">
            <Bookmark className="w-6 h-6 text-white" />
          </div>
          <span className="text-[11px] font-medium mt-0.5">1.9K</span>
        </div>

        {/* Share */}
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center active:scale-90 transition">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-[11px] font-medium mt-0.5">620</span>
        </div>

        {/* Vinyl Music Disc */}
        <div className="w-9 h-9 rounded-full bg-zinc-900 border-[3px] border-zinc-800 p-1 flex items-center justify-center animate-spin" style={{ animationDuration: '4s' }}>
          <div className="w-full h-full rounded-full bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center">
            <Music className="w-3 h-3 text-white" />
          </div>
        </div>
      </div>

      {/* Bottom Gradient for text readability */}
      <div className="absolute bottom-0 inset-x-0 h-44 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10" />

      {/* Bottom Information (Author, Caption, Tags, Sound) */}
      <div className="absolute bottom-4 left-3 right-16 z-20 text-white text-left">
        <div className="font-bold text-sm mb-1 tracking-tight drop-shadow">
          {creatorHandle}
        </div>

        <div className="text-xs leading-relaxed text-white/95 drop-shadow">
          <p className={isExpanded ? '' : 'line-clamp-2'}>
            {caption || 'Votre légende TikTok apparaîtra ici avec une mise en page optimisée.'}
          </p>
          {caption && caption.length > 80 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[11px] text-white/70 hover:text-white font-semibold mt-0.5 inline-block"
            >
              {isExpanded ? 'Moins' : 'plus'}
            </button>
          )}
        </div>

        {/* Hashtags */}
        {hashtags && hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 text-[11px] font-bold text-zinc-100">
            {hashtags.slice(0, 4).map((tag, i) => (
              <span key={i} className="hover:underline cursor-pointer">
                {tag.startsWith('#') ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        )}

        {/* Sound ticker */}
        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-white/80 overflow-hidden">
          <Music className="w-3 h-3 shrink-0" />
          <span className="truncate">{soundTitle}</span>
        </div>
      </div>
    </div>
  );
};
