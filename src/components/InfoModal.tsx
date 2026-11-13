import { X } from 'lucide-react';
import { useEffect } from 'react';

interface InfoModalProps {
  section: 'formats' | 'privacy' | null;
  onClose: () => void;
}

export function InfoModal({ section, onClose }: InfoModalProps) {
  useEffect(() => {
    if (!section) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [section, onClose]);

  if (!section) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <h2
            id="info-modal-title"
            className="text-base font-semibold text-foreground"
          >
            {section === 'formats'
              ? 'Supported Formats'
              : 'Local Processing & Privacy'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-well hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {section === 'formats' ? (
          <div className="mt-4 space-y-4 text-sm text-muted">
            <div className="border-t border-border/60 pt-4">
              <p className="text-xs font-medium text-muted">
                Input formats
              </p>
              <p className="mt-1 font-mono text-xs text-foreground">
                JPG · PNG · WEBP · GIF (first frame) · BMP · SVG (rasterized)
              </p>
            </div>
            <div className="border-t border-border/60 pt-4">
              <p className="text-xs font-medium text-muted">
                Output formats
              </p>
              <p className="mt-1 font-mono text-xs text-foreground">
                JPG · PNG · WEBP · GIF (static) · BMP · PDF (single or merged)
              </p>
            </div>
            <div className="border-t border-border/60 pt-4">
              <p className="text-xs font-medium text-muted">
                Limits
              </p>
              <p className="mt-1 text-xs leading-relaxed">
                Up to 50 MB per file, 50 megapixels total resolution, and 10,000 px per side.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3 border-t border-border/60 pt-4 text-sm leading-relaxed text-muted">
            <p>
              Every conversion, resize, color adjustment, ZIP archive, and PDF merge runs directly inside your browser using Canvas and Web APIs.
            </p>
            <p>
              Your images are never uploaded to external servers, stored in cloud buckets, or tracked. When you close or clear the workspace, temporary object URLs are immediately revoked from memory.
            </p>
            <p className="text-xs text-muted">
              Note: Fetching an image via URL makes a direct browser request to that remote URL.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
