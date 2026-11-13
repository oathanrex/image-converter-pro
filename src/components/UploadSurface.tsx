import { Clipboard, ImagePlus, Link2, Loader2, Upload } from 'lucide-react';
import { DragEvent, useRef, useState } from 'react';
import { InputTab } from '../types/converter';

interface UploadSurfaceProps {
  onFilesSelected: (files: FileList | File[]) => void;
  onFetchUrl: (url: string) => Promise<void>;
  onLoadSample: () => Promise<void>;
}

export function UploadSurface({
  onFilesSelected,
  onFetchUrl,
  onLoadSample,
}: UploadSurfaceProps) {
  const [activeTab, setActiveTab] = useState<InputTab>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlValue.trim() || isFetching) return;
    setIsFetching(true);
    try {
      await onFetchUrl(urlValue.trim());
      setUrlValue('');
    } finally {
      setIsFetching(false);
    }
  };

  const handleSampleClick = async () => {
    if (isLoadingSample) return;
    setIsLoadingSample(true);
    try {
      await onLoadSample();
    } finally {
      setIsLoadingSample(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Subtle segmented input mode selector */}
      <div className="mb-4 flex items-center justify-center">
        <div
          role="tablist"
          aria-label="Image input method"
          className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-well p-1"
        >
          <button
            type="button"
            role="tab"
            id="tab-upload"
            aria-selected={activeTab === 'upload'}
            aria-controls="panel-upload"
            onClick={() => setActiveTab('upload')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'upload'
                ? 'bg-surface text-foreground shadow-surface'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Upload</span>
          </button>

          <button
            type="button"
            role="tab"
            id="tab-url"
            aria-selected={activeTab === 'url'}
            aria-controls="panel-url"
            onClick={() => setActiveTab('url')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'url'
                ? 'bg-surface text-foreground shadow-surface'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>From URL</span>
          </button>

          <button
            type="button"
            role="tab"
            id="tab-paste"
            aria-selected={activeTab === 'paste'}
            aria-controls="panel-paste"
            onClick={() => setActiveTab('paste')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'paste'
                ? 'bg-surface text-foreground shadow-surface'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Paste</span>
          </button>
        </div>
      </div>

      {/* Single clean surface */}
      <div className="rounded-2xl border border-border/80 bg-well/60 p-3 shadow-surface">
        {activeTab === 'upload' && (
          <div
            id="panel-upload"
            role="tabpanel"
            aria-labelledby="tab-upload"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-accent-soft/60'
                : 'border-border bg-surface'
            }`}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-primary">
              <ImagePlus className="h-5 w-5" aria-hidden="true" />
            </div>

            <h2 className="text-lg font-semibold text-foreground">
              Drop images here
            </h2>
            <p className="mt-1 text-sm text-muted">
              JPG, PNG, WEBP, GIF, BMP, or SVG · Up to 50 MB per file
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Select images
              </button>

              <button
                type="button"
                onClick={handleSampleClick}
                disabled={isLoadingSample}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-well disabled:opacity-50 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {isLoadingSample ? 'Loading sample…' : 'Try sample image'}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              aria-label="Choose image files to convert"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  onFilesSelected(e.target.files);
                  e.target.value = '';
                }
              }}
            />
          </div>
        )}

        {activeTab === 'url' && (
          <div
            id="panel-url"
            role="tabpanel"
            aria-labelledby="tab-url"
            className="rounded-xl border border-border bg-surface px-6 py-12"
          >
            <form onSubmit={handleUrlSubmit} className="mx-auto max-w-md">
              <label
                htmlFor="image-url-input"
                className="block text-sm font-medium text-foreground"
              >
                Image URL
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="image-url-input"
                  type="url"
                  required
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  placeholder="https://example.com/photo.png"
                  className="h-10 flex-1 rounded-lg border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isFetching || !urlValue.trim()}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {isFetching && (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  <span>{isFetching ? 'Fetching' : 'Fetch'}</span>
                </button>
              </div>
              <p className="mt-3 text-xs text-muted">
                Fetches directly from your browser. Hosts must allow cross-origin requests (CORS).
              </p>
            </form>
          </div>
        )}

        {activeTab === 'paste' && (
          <div
            id="panel-paste"
            role="tabpanel"
            aria-labelledby="tab-paste"
            tabIndex={0}
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center focus:border-primary focus:outline-none"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-primary">
              <Clipboard className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Paste from clipboard
            </h2>
            <p className="mt-2 text-sm text-muted">
              Copy an image or screenshot and press{' '}
              <kbd className="rounded border border-border bg-well px-1.5 py-0.5 font-mono text-xs text-foreground">
                Ctrl+V
              </kbd>{' '}
              or{' '}
              <kbd className="rounded border border-border bg-well px-1.5 py-0.5 font-mono text-xs text-foreground">
                Cmd+V
              </kbd>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
