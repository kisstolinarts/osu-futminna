import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GalleryAlbum, GalleryImage } from '../lib/ContentContext';

interface GalleryProps {
  albums: GalleryAlbum[];
  /** Limit total images shown (homepage previews). */
  limit?: number;
  /** Show album filter chips. */
  filterable?: boolean;
}

export default function Gallery({ albums, limit, filterable = true }: GalleryProps) {
  const all = useMemo(
    () => albums.flatMap((album) => album.images.map((img) => ({ ...img, album: album.name }))),
    [albums],
  );
  const [activeAlbum, setActiveAlbum] = useState<number | 'all'>('all');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const images: (GalleryImage & { album: string })[] =
    activeAlbum === 'all'
      ? all
      : (albums.find((a) => a.id === activeAlbum)?.images.map((i) => ({ ...i, album: aName(albums, activeAlbum) })) ?? []);

  const visible = limit && limit < images.length ? images.slice(0, limit) : images;

  const close = useCallback(() => setViewerIndex(null), []);
  const step = useCallback(
    (dir: 1 | -1) => {
      setViewerIndex((i) => (i === null ? null : (i + dir + visible.length) % visible.length));
    },
    [visible.length],
  );

  // Keyboard support for the lightbox.
  useEffect(() => {
    if (viewerIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewerIndex, close, step]);

  const current = viewerIndex !== null ? visible[viewerIndex] : null;

  return (
    <div>
      {filterable && (
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveAlbum('all')}
            className={`chip border transition ${
              activeAlbum === 'all'
                ? 'border-fuchsia-700 bg-fuchsia-700 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-fuchsia-300'
            }`}
          >
            All albums
          </button>
          {albums.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setActiveAlbum(a.id)}
              className={`chip border transition ${
                activeAlbum === a.id
                  ? 'border-fuchsia-700 bg-fuchsia-700 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-fuchsia-300'
              }`}
            >
              {a.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {visible.map((img, idx) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setViewerIndex(idx)}
            className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-600"
            aria-label={`View image: ${img.caption}`}
          >
            <img
              src={img.src}
              alt={img.caption}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <span className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-black/0 to-black/0 p-3 opacity-0 transition group-hover:opacity-100">
              <span className="text-left text-xs font-semibold text-white">{img.caption}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {current && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          onClick={close}
        >
          <figure className="max-h-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={current.src}
              alt={current.caption}
              className="max-h-[78vh] w-auto rounded-xl object-contain shadow-2xl"
            />
            <figcaption className="mt-3 text-center text-sm text-white/85">{current.caption}</figcaption>
          </figure>

          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25"
            aria-label="Close viewer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </svg>
          </button>

          {visible.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className="absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25 sm:left-5"
                aria-label="Previous image"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25 sm:right-5"
                aria-label="Next image"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function aName(albums: GalleryAlbum[], id: number): string {
  return albums.find((a) => a.id === id)?.name ?? '';
}
