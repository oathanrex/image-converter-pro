import {
  ColorMode,
  FORMAT_CONFIG,
  OutputFormat,
  ResizeOptions,
} from '../types/converter';

interface SettingsPanelProps {
  selectedFormat: OutputFormat;
  quality: number;
  resize: ResizeOptions;
  colorMode: ColorMode;
  bgColor: string;
  preserveExif: boolean;
  disabled: boolean;
  onFormatChange: (format: OutputFormat) => void;
  onQualityChange: (quality: number) => void;
  onResizeChange: (resize: ResizeOptions) => void;
  onColorModeChange: (mode: ColorMode) => void;
  onBgColorChange: (color: string) => void;
  onPreserveExifChange: (preserve: boolean) => void;
}

const FORMAT_LIST: OutputFormat[] = ['jpeg', 'png', 'webp', 'gif', 'bmp', 'pdf'];

const BG_PRESETS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Black', value: '#000000' },
  { label: 'Light gray', value: '#f3f4f6' },
  { label: 'Transparent', value: 'transparent' },
];

export function SettingsPanel({
  selectedFormat,
  quality,
  resize,
  colorMode,
  bgColor,
  preserveExif,
  disabled,
  onFormatChange,
  onQualityChange,
  onResizeChange,
  onColorModeChange,
  onBgColorChange,
  onPreserveExifChange,
}: SettingsPanelProps) {
  const formatSpec = FORMAT_CONFIG[selectedFormat];
  const isPreset = BG_PRESETS.some((p) => p.value === bgColor);

  return (
    <aside
      aria-label="Export settings"
      className="rounded-xl border border-border bg-surface p-5 shadow-surface lg:sticky lg:top-24"
    >
      <h2 className="text-sm font-semibold text-foreground">
        Export settings
      </h2>

      {/* Output format */}
      <div className="mt-5">
        <span className="block text-xs font-medium text-muted">
          Output format
        </span>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {FORMAT_LIST.map((fmt) => {
            const active = selectedFormat === fmt;
            return (
              <button
                key={fmt}
                type="button"
                disabled={disabled}
                onClick={() => onFormatChange(fmt)}
                aria-pressed={active}
                className={`h-9 shrink-0 rounded-lg border font-mono text-xs font-medium whitespace-nowrap transition-colors disabled:opacity-50 ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-well'
                }`}
              >
                {FORMAT_CONFIG[fmt].label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">
          {formatSpec.hint}
        </p>
      </div>

      {/* Quality */}
      {formatSpec.supportsQuality && (
        <div className="mt-5 border-t border-border/60 pt-5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="quality-slider"
              className="text-xs font-medium text-muted"
            >
              Quality
            </label>
            <span className="font-mono text-xs font-medium tabular-nums text-foreground">
              {quality}%
            </span>
          </div>
          <input
            id="quality-slider"
            type="range"
            min={10}
            max={100}
            value={quality}
            disabled={disabled}
            onChange={(e) => onQualityChange(Number(e.target.value))}
            className="studio-slider mt-3 w-full bg-well disabled:opacity-50"
          />
          <div className="mt-1.5 flex justify-between text-[11px] text-muted">
            <span>Smaller file</span>
            <span>Higher clarity</span>
          </div>
        </div>
      )}

      {/* Resize */}
      <div className="mt-5 border-t border-border/60 pt-5">
        <label className="flex cursor-pointer items-center justify-between">
          <span className="text-xs font-medium text-muted">
            Resize dimensions
          </span>
          <input
            type="checkbox"
            checked={resize.enabled}
            disabled={disabled}
            onChange={(e) =>
              onResizeChange({ ...resize, enabled: e.target.checked })
            }
            className="h-4 w-4 rounded border-border accent-primary disabled:opacity-50"
          />
        </label>

        {resize.enabled && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="resize-width"
                  className="block text-[11px] text-muted"
                >
                  Width (px)
                </label>
                <input
                  id="resize-width"
                  type="number"
                  min={1}
                  max={10000}
                  placeholder="Auto"
                  disabled={disabled}
                  value={resize.width ?? ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    onResizeChange({
                      ...resize,
                      width: Number.isFinite(val) && val > 0 ? val : null,
                    });
                  }}
                  className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2.5 font-mono text-xs tabular-nums text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label
                  htmlFor="resize-height"
                  className="block text-[11px] text-muted"
                >
                  Height (px)
                </label>
                <input
                  id="resize-height"
                  type="number"
                  min={1}
                  max={10000}
                  placeholder="Auto"
                  disabled={disabled}
                  value={resize.height ?? ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    onResizeChange({
                      ...resize,
                      height: Number.isFinite(val) && val > 0 ? val : null,
                    });
                  }}
                  className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2.5 font-mono text-xs tabular-nums text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={resize.maintainRatio}
                disabled={disabled}
                onChange={(e) =>
                  onResizeChange({
                    ...resize,
                    maintainRatio: e.target.checked,
                  })
                }
                className="h-3.5 w-3.5 rounded border-border accent-primary disabled:opacity-50"
              />
              <span>Maintain aspect ratio</span>
            </label>
          </div>
        )}
      </div>

      {/* Filters */}
      <div
        role="group"
        aria-labelledby="filters-section-label"
        className="mt-5 border-t border-border/60 pt-5"
      >
        <span
          id="filters-section-label"
          className="block text-xs font-medium text-muted"
        >
          Filters
        </span>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {(
            [
              { value: 'original', label: 'Original' },
              { value: 'grayscale', label: 'Grayscale' },
              { value: 'sepia', label: 'Sepia' },
              { value: 'invert', label: 'Invert' },
              { value: 'brightness', label: 'Brighten' },
              { value: 'contrast', label: 'Contrast' },
            ] as const
          ).map((effect) => {
            const active = colorMode === effect.value;
            return (
              <button
                key={effect.value}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => onColorModeChange(effect.value)}
                className={`h-8 shrink-0 rounded-lg border px-2 text-xs font-medium whitespace-nowrap transition-colors disabled:opacity-50 ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-well'
                }`}
              >
                {effect.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Background fill */}
      <div className="mt-5 border-t border-border/60 pt-5">
        <label
          htmlFor="bg-preset-select"
          className="block text-xs font-medium text-muted"
        >
          Transparency fill
        </label>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="color"
            aria-label="Custom background fill color"
            value={bgColor === 'transparent' ? '#ffffff' : bgColor}
            onChange={(e) => onBgColorChange(e.target.value)}
            disabled={
              disabled ||
              (!formatSpec.supportsTransparency && bgColor === 'transparent')
            }
            className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-border bg-background p-0.5 disabled:opacity-50"
          />
          <select
            id="bg-preset-select"
            value={isPreset ? bgColor : 'custom'}
            disabled={disabled}
            onChange={(e) => {
              if (e.target.value !== 'custom') {
                onBgColorChange(e.target.value);
              }
            }}
            className="h-9 flex-1 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
          >
            <option value="#ffffff">White</option>
            <option value="#000000">Black</option>
            <option value="#f3f4f6">Light gray</option>
            {formatSpec.supportsTransparency && (
              <option value="transparent">Keep transparent</option>
            )}
            {!isPreset && <option value="custom">Custom ({bgColor})</option>}
          </select>
        </div>
      </div>

      {/* EXIF Metadata */}
      <div className="mt-5 border-t border-border/60 pt-5">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-xs font-medium text-muted">
            Preserve EXIF metadata
          </span>
          <input
            type="checkbox"
            checked={preserveExif}
            disabled={disabled}
            onChange={(e) => onPreserveExifChange(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary disabled:opacity-50"
          />
        </label>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          {!formatSpec.supportsExif
            ? `${formatSpec.label} does not embed EXIF metadata; tags will be stripped.`
            : preserveExif
              ? 'Retains camera, date, and normalized orientation tags.'
              : 'Strips camera, date, and location tags during export.'}
        </p>
      </div>
    </aside>
  );
}
