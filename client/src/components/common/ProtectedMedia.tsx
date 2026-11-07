import type { ImgHTMLAttributes, VideoHTMLAttributes, CSSProperties } from 'react';

type ProtectionProps = { containerClassName?: string };

const protectedContainerStyle = {
  WebkitUserDrag: 'none',
  userSelect: 'none',
} as CSSProperties & { WebkitUserDrag: 'none' };

/** Adds consistent browser-level friction around displayed media. This is a UI safeguard, not DRM. */
export const ProtectedImage = ({ containerClassName = '', className = '', onContextMenu, onDragStart, draggable, ...props }: ImgHTMLAttributes<HTMLImageElement> & ProtectionProps) => (
  <div
    className={`relative select-none ${containerClassName}`}
    style={protectedContainerStyle}
    onContextMenu={(event) => event.preventDefault()}
    onDragStart={(event) => event.preventDefault()}
  >
    <img {...props} draggable={false} onContextMenu={(event) => { event.preventDefault(); onContextMenu?.(event); }} onDragStart={(event) => { event.preventDefault(); onDragStart?.(event); }} className={`pointer-events-none select-none [-webkit-user-drag:none] ${className}`} />
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 select-none bg-transparent" />
  </div>
);

export const ProtectedVideo = ({ containerClassName = '', className = '', onContextMenu, onDragStart, draggable, controlsList, disablePictureInPicture, ...props }: VideoHTMLAttributes<HTMLVideoElement> & ProtectionProps) => (
  <div
    className={`relative select-none ${containerClassName}`}
    style={protectedContainerStyle}
    onContextMenu={(event) => event.preventDefault()}
    onDragStart={(event) => event.preventDefault()}
  >
    <video {...props} controlsList={controlsList ?? 'nodownload noplaybackrate'} disablePictureInPicture={disablePictureInPicture ?? true} draggable={false} onContextMenu={(event) => { event.preventDefault(); onContextMenu?.(event); }} onDragStart={(event) => { event.preventDefault(); onDragStart?.(event); }} className={`select-none [-webkit-user-drag:none] ${className}`} />
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 select-none bg-transparent" />
  </div>
);
