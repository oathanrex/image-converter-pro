import {
  AlertCircle,
  Check,
  Download,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import {
  ColorMode,
  FORMAT_CONFIG,
  ImageFileItem,
  NamingPattern,
  OutputFormat,
  ResizeOptions,
} from '../types/converter';
import {
  computeSizeDelta,
  formatFileSize,
  getFormatFromMime,
  getOutputFilename,
  summarizeQueueSizes,
} from '../utils/imageProcessing';

interface FileQueueProps {
  files: ImageFileItem[];
  selectedFormat: OutputFormat;
  quality: number;
  resize: ResizeOptions;
  colorMode: ColorMode;
  naming: NamingPattern;
  isConverting: boolean;
  isMergingPdf: boolean;
  isCreatingZip: boolean;
  onNamingChange: (naming: NamingPattern) => void;
  onAddMore: () => void;
  onClearAll: () => void;
  onConvertAll: () => void;
  onDownloadAll: () => void;
  onMergePdf: () => void;
  onPreview: (id: string) => void;
  onDownloadOne: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

export function FileQueue({
  files,
  selectedFormat,
  quality,
  resize,
  colorMode,
  naming,
  isConverting,
  isMergingPdf,
  isCreatingZip,
  onNamingChange,
  onAddMore,
  onClearAll,
  onConvertAll,
  onDownloadAll,
  onMergePdf,
  onPreview,
  onDownloadOne,
  onRetry,
  onRemove,
}: FileQueueProps) {
  const [showNaming, setShowNaming] = useState(false);

  const doneCount = files.filter((f) => f.status === 'done').length;
  const anyDone = doneCount > 0;
  const targetLabel = FORMAT_CONFIG[selectedFormat].label;
  const hasNamingPattern = Boolean(naming.prefix || naming.suffix);

  const summary = summarizeQueueSizes(files, {
    format: selectedFormat,
    quality,
    resize,
    colorMode,
  });
  const summaryDelta = computeSizeDelta(
    summary.totalInitialBytes,
    summary.totalEstimatedBytes
  );

  const sampleInputName = files[0]?.name || 'image.png';
  const sampleOutputName = getOutputFilename(
    sampleInputName,
    selectedFormat,
    naming
  );

  return (
    <section
      aria-label="Conversion queue"
      className="rounded-xl border border-border bg-surface shadow-surface"
    >
      {/* Queue header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/80 px-4 py-3.5 sm:px-5">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Queue
          </h2>
          <span
            data-testid="queue-count"
            className="font-mono text-xs tabular-nums text-muted"
          >
            {files.length} {files.length === 1 ? 'file' : 'files'}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setShowNaming((prev) => !prev)}
            aria-expanded={showNaming}
            aria-controls="naming-pattern-bar"
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
              showNaming || hasNamingPattern
                ? 'bg-accent-soft text-primary'
                : 'text-muted hover:bg-well hover:text-foreground'
            }`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Naming</span>
          </button>

          <button
            type="button"
            onClick={onAddMore}
            disabled={isConverting}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium whitespace-nowrap text-muted transition-colors hover:bg-well hover:text-foreground disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add files</span>
          </button>

          <button
            type="button"
            onClick={onClearAll}
            disabled={isConverting}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium whitespace-nowrap text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Expandable Naming Pattern Bar */}
      {showNaming && (
        <div
          id="naming-pattern-bar"
          className="border-b border-border/80 bg-well/50 px-4 py-3.5 sm:px-5"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="naming-prefix"
                className="block text-[11px] font-medium text-muted"
              >
                Filename prefix
              </label>
              <input
                id="naming-prefix"
                type="text"
                value={naming.prefix}
                disabled={isConverting}
                onChange={(e) =>
                  onNamingChange({ ...naming, prefix: e.target.value })
                }
                placeholder="e.g. web-"
                className="mt-1 h-8 w-full rounded-lg border border-border bg-surface px-2.5 font-mono text-xs text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="naming-suffix"
                className="block text-[11px] font-medium text-muted"
              >
                Filename suffix
              </label>
              <input
                id="naming-suffix"
                type="text"
                value={naming.suffix}
                disabled={isConverting}
                onChange={(e) =>
                  onNamingChange({ ...naming, suffix: e.target.value })
                }
                placeholder="e.g. -optimized"
                className="mt-1 h-8 w-full rounded-lg border border-border bg-surface px-2.5 font-mono text-xs text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-3 text-xs">
            <p className="truncate text-muted">
              Output preview:{' '}
              <span
                data-testid="naming-preview"
                className="font-mono text-foreground"
              >
                {sampleOutputName}
              </span>
            </p>
            {hasNamingPattern && (
              <button
                type="button"
                disabled={isConverting}
                onClick={() => onNamingChange({ prefix: '', suffix: '' })}
                className="shrink-0 text-xs font-medium text-muted hover:text-foreground disabled:opacity-50"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* File rows */}
      <ul
        data-testid="file-list"
        className="studio-scroll max-h-[540px] divide-y divide-border/60 overflow-y-auto"
      >
        {files.map((item) => {
          const inputFmt = getFormatFromMime(item.type);
          const delta =
            item.status === 'done' && item.convertedSize !== null
              ? computeSizeDelta(item.size, item.convertedSize)
              : null;
          const outputFilename = getOutputFilename(
            item.name,
            item.convertedFormat ?? selectedFormat,
            naming
          );

          return (
            <li
              key={item.id}
              data-testid={`file-row-${item.id}`}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-well/40 sm:gap-4 sm:px-5"
            >
              {/* Thumbnail */}
              <div className="drafting-grid h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border sm:h-12 sm:w-12">
                <img
                  src={item.dataUrl}
                  alt={item.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Metadata */}
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-medium text-foreground"
                  title={item.name}
                >
                  {item.name}
                </p>

                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted tabular-nums">
                  <span className="font-mono">{inputFmt}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {item.width} × {item.height}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{formatFileSize(item.size)}</span>
                  {item.status === 'pending' && (
                    <>
                      <span aria-hidden="true">→</span>
                      <span className="font-mono text-foreground">
                        {hasNamingPattern ? outputFilename : targetLabel}
                      </span>
                    </>
                  )}
                </div>

                {item.status === 'converting' && (
                  <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-primary">
                    <Loader2
                      className="h-3 w-3 animate-spin"
                      aria-hidden="true"
                    />
                    <span>Converting…</span>
                  </div>
                )}

                {item.status === 'done' && item.convertedSize !== null && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs tabular-nums">
                    <span className="inline-flex items-center gap-1 font-medium text-primary">
                      <Check className="h-3 w-3" aria-hidden="true" />
                      <span className="font-mono">
                        {hasNamingPattern
                          ? outputFilename
                          : item.convertedFormat
                            ? FORMAT_CONFIG[item.convertedFormat].label
                            : targetLabel}
                      </span>
                      <span>· {formatFileSize(item.convertedSize)}</span>
                    </span>
                    {item.convertedWidth &&
                      item.convertedHeight &&
                      (item.convertedWidth !== item.width ||
                        item.convertedHeight !== item.height) && (
                        <span className="text-muted">
                          · {item.convertedWidth} × {item.convertedHeight}
                        </span>
                      )}
                    {delta && delta.direction !== 'same' && (
                      <span
                        className={
                          delta.direction === 'smaller'
                            ? 'text-primary'
                            : 'text-[color:var(--pfx-warning)]'
                        }
                      >
                        ({delta.label})
                      </span>
                    )}
                  </div>
                )}

                {item.status === 'error' && (
                  <div className="mt-1 inline-flex items-center gap-1 text-xs text-danger">
                    <AlertCircle className="h-3 w-3" aria-hidden="true" />
                    <span>{item.errorMessage || 'Failed'}</span>
                  </div>
                )}
              </div>

              {/* Row actions */}
              <div className="flex shrink-0 items-center gap-1">
                {item.status === 'error' && (
                  <button
                    type="button"
                    onClick={() => onRetry(item.id)}
                    aria-label={`Retry converting ${item.name}`}
                    title="Retry"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-well hover:text-foreground"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onPreview(item.id)}
                  aria-label={`Preview ${item.name}`}
                  title="Preview"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-well hover:text-foreground"
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                </button>

                {item.status === 'done' && (
                  <button
                    type="button"
                    onClick={() => onDownloadOne(item.id)}
                    aria-label={`Download ${outputFilename}`}
                    title={`Download ${outputFilename}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary transition-colors hover:bg-accent-soft"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  disabled={isConverting}
                  aria-label={`Remove ${item.name}`}
                  title="Remove"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Primary Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/80 px-5 py-4">
        <button
          type="button"
          onClick={onConvertAll}
          disabled={isConverting || files.length === 0}
          className="inline-flex h-10 min-w-[160px] flex-1 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
        >
          {isConverting && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          <span>
            {isConverting
              ? 'Converting…'
              : files.length === 1
                ? `Convert to ${targetLabel}`
                : `Convert all to ${targetLabel}`}
          </span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDownloadAll}
            disabled={!anyDone || isConverting || isCreatingZip}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium whitespace-nowrap text-foreground transition-colors hover:bg-well disabled:opacity-45"
          >
            {isCreatingZip ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {isCreatingZip
                ? 'Archiving…'
                : doneCount > 1
                  ? 'Download ZIP'
                  : 'Download'}
            </span>
          </button>

          {files.length > 1 && (
            <button
              type="button"
              onClick={onMergePdf}
              disabled={isConverting || isMergingPdf}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium whitespace-nowrap text-foreground transition-colors hover:bg-well disabled:opacity-45"
            >
              {isMergingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <FileText className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{isMergingPdf ? 'Merging…' : 'Merge PDF'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Footer */}
      <div
        data-testid="queue-summary"
        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-b-xl border-t border-border/60 bg-well/50 px-5 py-3 text-xs text-muted tabular-nums"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">
            {summary.totalImages}{' '}
            {summary.totalImages === 1 ? 'image' : 'images'}
          </span>
          {summary.convertedCount > 0 &&
            summary.convertedCount < summary.totalImages && (
              <span>
                ({summary.convertedCount}/{summary.totalImages} converted)
              </span>
            )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            Initial:{' '}
            <strong className="font-mono font-medium text-foreground">
              {formatFileSize(summary.totalInitialBytes)}
            </strong>
          </span>
          <span>
            {summary.isEstimate ? 'Est. output: ' : 'Converted: '}
            <strong className="font-mono font-medium text-foreground">
              {summary.isEstimate ? '~' : ''}
              {formatFileSize(summary.totalEstimatedBytes)}
            </strong>
            {summaryDelta.direction !== 'same' && (
              <span
                className={`ml-1.5 font-mono ${
                  summaryDelta.direction === 'smaller'
                    ? 'text-primary'
                    : 'text-[color:var(--pfx-warning)]'
                }`}
              >
                ({summaryDelta.label})
              </span>
            )}
          </span>
        </div>
      </div>
    </section>
  );
}
