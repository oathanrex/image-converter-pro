import {
  Download,
  FileText,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FORMAT_CONFIG, ImageFileItem } from '../types/converter';
import {
  computeSizeDelta,
  formatFileSize,
  getFormatFromMime,
} from '../utils/imageProcessing';

interface PreviewModalProps {
  item: ImageFileItem | null;
  onClose: () => void;
  onDownload: (id: string) => void;
}

type PreviewView = 'original' | 'converted' | 'compare';

export function PreviewModal({ item, onClose, onDownload }: PreviewModalProps) {
  const [view, setView] = useState<PreviewView>(() =>
    item && item.status === 'done' && item.convertedFormat !== 'pdf'
      ? 'compare'
      : 'original'
  );
  const [zoom, setZoom] = useState(100);
  const [splitPercent, setSplitPercent] = useState(50);
  const [beforeImgWidth, setBeforeImgWidth] = useState<number | null>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const beforeImgRef = useRef<HTMLImageElement>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!item) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [item, onClose]);

  useEffect(() => {
    const updateFromClientX = (clientX: number) => {
      const container = sliderContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;
      const pct = Math.max(
        0,
        Math.min(100, ((clientX - rect.left) / rect.width) * 100)
      );
      setSplitPercent(pct);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) updateFromClientX(e.clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches[0]) {
        updateFromClientX(e.touches[0].clientX);
      }
    };
    const stopDrag = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', stopDrag);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', stopDrag);
    };
  }, []);

  if (!item) return null;

  const isConverted = item.status === 'done' && Boolean(item.convertedUrl);
  const isPdf = item.convertedFormat === 'pdf';
  const canCompareImage = isConverted && !isPdf;
  const origFormat = getFormatFromMime(item.type);
  const convFormat = item.convertedFormat
    ? FORMAT_CONFIG[item.convertedFormat].label
    : '—';
  const delta =
    isConverted && item.convertedSize !== null
      ? computeSizeDelta(item.size, item.convertedSize)
      : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 border-b border-border/80 px-5 py-3.5">
          <h2
            id="preview-dialog-title"
            className="truncate text-sm font-semibold text-foreground"
          >
            {item.name}
          </h2>

          <div className="flex shrink-0 items-center gap-2">
            {view !== 'compare' && !(view === 'converted' && isPdf) && (
              <div className="flex items-center gap-1 rounded-lg border border-border bg-well p-0.5">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(25, z - 25))}
                  aria-label="Zoom out"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-foreground"
                >
                  <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <span className="w-11 text-center font-mono text-xs tabular-nums text-foreground">
                  {zoom}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(300, z + 25))}
                  aria-label="Zoom in"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-foreground"
                >
                  <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(100)}
                  aria-label="Reset zoom"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-foreground"
                >
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-well hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Segmented view switch */}
          <div className="mb-4 flex justify-center">
            <div
              role="tablist"
              aria-label="Preview mode"
              className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-well p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={view === 'original'}
                onClick={() => setView('original')}
                className={`shrink-0 rounded-md px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  view === 'original'
                    ? 'bg-surface text-foreground shadow-surface'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                Original
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'converted'}
                disabled={!isConverted}
                onClick={() => setView('converted')}
                className={`shrink-0 rounded-md px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors disabled:opacity-40 ${
                  view === 'converted'
                    ? 'bg-surface text-foreground shadow-surface'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                Converted
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'compare'}
                disabled={!canCompareImage}
                onClick={() => setView('compare')}
                className={`shrink-0 rounded-md px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors disabled:opacity-40 ${
                  view === 'compare'
                    ? 'bg-surface text-foreground shadow-surface'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                Compare
              </button>
            </div>
          </div>

          {/* Canvas stage */}
          {view === 'compare' && canCompareImage && item.convertedUrl ? (
            <div>
              <div className="drafting-grid flex min-h-[300px] items-center justify-center rounded-xl border border-border p-4">
                <div
                  ref={sliderContainerRef}
                  className="relative inline-block overflow-hidden rounded-lg select-none"
                >
                  <img
                    ref={beforeImgRef}
                    src={item.convertedUrl}
                    alt={`Converted ${item.name}`}
                    onLoad={() => {
                      if (beforeImgRef.current) {
                        setBeforeImgWidth(beforeImgRef.current.offsetWidth);
                      }
                    }}
                    className="block max-h-[380px] max-w-full object-contain"
                  />
                  <div
                    style={{ width: `${splitPercent}%` }}
                    className="absolute inset-y-0 left-0 overflow-hidden"
                  >
                    <img
                      src={item.dataUrl}
                      alt={`Original ${item.name}`}
                      style={
                        beforeImgWidth
                          ? { width: `${beforeImgWidth}px`, maxWidth: 'none' }
                          : { maxWidth: 'none' }
                      }
                      className="block max-h-[380px] object-contain"
                    />
                  </div>
                  <div
                    role="slider"
                    tabIndex={0}
                    aria-label="Comparison split slider"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(splitPercent)}
                    style={{ left: `${splitPercent}%` }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      isDraggingRef.current = true;
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      isDraggingRef.current = true;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        setSplitPercent((p) => Math.max(0, p - 5));
                      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSplitPercent((p) => Math.min(100, p + 5));
                      } else if (e.key === 'Home') {
                        e.preventDefault();
                        setSplitPercent(0);
                      } else if (e.key === 'End') {
                        e.preventDefault();
                        setSplitPercent(100);
                      }
                    }}
                    className="absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 cursor-ew-resize bg-white shadow-[0_0_8px_rgba(0,0,0,0.4)] focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <span className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-xs font-semibold text-foreground shadow-md">
                      ⇄
                    </span>
                  </div>
                </div>
              </div>
              <p className="mt-2.5 text-center text-xs text-muted">
                Left: Original · Right: Converted ({convFormat})
              </p>
            </div>
          ) : view === 'converted' && isPdf ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-border bg-well/40 p-8 text-center">
              <FileText
                className="h-10 w-10 text-primary"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm font-medium text-foreground">
                PDF document ready
              </p>
              <p className="mt-1 text-xs text-muted">
                Download the file to view the exported PDF page.
              </p>
            </div>
          ) : (
            <div className="drafting-grid studio-scroll flex max-h-[400px] min-h-[300px] items-center justify-center overflow-auto rounded-xl border border-border p-4">
              <img
                src={
                  view === 'converted' && item.convertedUrl
                    ? item.convertedUrl
                    : item.dataUrl
                }
                alt={`Preview of ${item.name}`}
                style={{ transform: `scale(${zoom / 100})` }}
                className="max-h-[360px] rounded object-contain transition-transform duration-150"
              />
            </div>
          )}

          {/* Comparison metrics */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background/60 px-4 py-3">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Original</span>
                <span className="font-mono font-medium text-foreground">
                  {origFormat}
                </span>
              </div>
              <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-foreground">
                {formatFileSize(item.size)}
              </p>
              <p className="mt-0.5 font-mono text-xs tabular-nums text-muted">
                {item.width} × {item.height} px ·{' '}
                {item.hasExif ? 'EXIF metadata present' : 'No EXIF metadata'}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-background/60 px-4 py-3">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Converted</span>
                <span className="font-mono font-medium text-primary">
                  {convFormat}
                </span>
              </div>
              <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-foreground">
                {isConverted && item.convertedSize !== null
                  ? formatFileSize(item.convertedSize)
                  : 'Not converted'}
              </p>
              <p className="mt-0.5 font-mono text-xs tabular-nums text-muted">
                {isConverted
                  ? `${item.convertedWidth ?? item.width} × ${item.convertedHeight ?? item.height} px${
                      delta ? ` · ${delta.label}` : ''
                    }${item.conversionTime ? ` · ${item.conversionTime} ms` : ''}${
                      item.convertedExifStatus === 'preserved'
                        ? ' · EXIF preserved'
                        : item.convertedExifStatus === 'stripped'
                          ? ' · EXIF stripped'
                          : item.convertedExifStatus === 'unsupported'
                            ? ' · EXIF unsupported'
                            : ''
                    }`
                  : 'Run conversion to inspect output'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border/80 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-4 text-xs font-medium text-foreground hover:bg-well"
          >
            Close
          </button>
          <button
            type="button"
            disabled={!isConverted}
            onClick={() => onDownload(item.id)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-45"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
}
