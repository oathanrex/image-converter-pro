import JSZip from 'jszip';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorialGuide } from './components/EditorialGuide';
import { FileQueue } from './components/FileQueue';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { InfoModal } from './components/InfoModal';
import { PreviewModal } from './components/PreviewModal';
import { SettingsPanel } from './components/SettingsPanel';
import { ToastList } from './components/ToastList';
import { UploadSurface } from './components/UploadSurface';
import {
  ColorMode,
  FORMAT_CONFIG,
  ImageFileItem,
  NamingPattern,
  OutputFormat,
  ResizeOptions,
  ToastItem,
} from './types/converter';
import { extractExifTiff } from './utils/exif';
import {
  convertImageItem,
  createMergedPdfBlob,
  createSampleImageFile,
  getOutputFilename,
  isAnimatedGif,
  isSvgFile,
  loadImageElement,
  readFileAsDataUrl,
  validateFileMeta,
  validateImageDimensions,
} from './utils/imageProcessing';

function getInitialTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {
    // ignore storage errors
  }
  return 'light';
}

function getInitialFormat(): OutputFormat {
  try {
    const saved = localStorage.getItem('imageConverter_format') as OutputFormat | null;
    if (saved && saved in FORMAT_CONFIG) return saved;
  } catch {
    // ignore
  }
  return 'jpeg';
}

function getInitialQuality(): number {
  try {
    const saved = parseInt(localStorage.getItem('imageConverter_quality') || '', 10);
    if (Number.isFinite(saved) && saved >= 10 && saved <= 100) return saved;
  } catch {
    // ignore
  }
  return 85;
}

function getInitialPreserveExif(): boolean {
  try {
    return localStorage.getItem('imageConverter_preserveExif') === 'true';
  } catch {
    return false;
  }
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
  const [files, setFiles] = useState<ImageFileItem[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<OutputFormat>(getInitialFormat);
  const [quality, setQuality] = useState<number>(getInitialQuality);
  const [resize, setResize] = useState<ResizeOptions>({
    enabled: false,
    width: null,
    height: null,
    maintainRatio: true,
  });
  const [colorMode, setColorMode] = useState<ColorMode>('original');
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [preserveExif, setPreserveExif] = useState<boolean>(getInitialPreserveExif);
  const [naming, setNaming] = useState<NamingPattern>({ prefix: '', suffix: '' });
  const [isConverting, setIsConverting] = useState(false);
  const [isMergingPdf, setIsMergingPdf] = useState(false);
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [infoSection, setInfoSection] = useState<'formats' | 'privacy' | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());

  const createTrackedUrl = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    objectUrlsRef.current.add(url);
    return url;
  }, []);

  const revokeTrackedUrl = useCallback((url: string | null) => {
    if (url && objectUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#121b1e' : '#f2f7f4');
    }
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    };
  }, []);

  const pushToast = useCallback(
    (message: string, variant: ToastItem['variant'] = 'info') => {
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, variant }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3200);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ingestFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const list = Array.from(incoming);
      const nextItems: ImageFileItem[] = [];

      for (const file of list) {
        const metaCheck = validateFileMeta(file);
        if (!metaCheck.valid) {
          pushToast(metaCheck.error, 'error');
          continue;
        }

        try {
          if (isSvgFile(file)) {
            pushToast(`${file.name} will be rasterized during conversion.`, 'info');
          } else if (await isAnimatedGif(file)) {
            pushToast(
              `${file.name} is an animated GIF; only the first frame is exported.`,
              'info'
            );
          }

          const rawBytes = new Uint8Array(await file.arrayBuffer());
          const exifTiff = extractExifTiff(rawBytes);

          const dataUrl = await readFileAsDataUrl(file);
          const img = await loadImageElement(dataUrl);
          const dimCheck = validateImageDimensions(img.width, img.height);
          if (!dimCheck.valid) {
            pushToast(`${file.name}: ${dimCheck.error}`, 'error');
            continue;
          }

          const id =
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `file_${Date.now()}_${Math.random().toString(36).slice(2)}`;

          nextItems.push({
            id,
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            width: img.width,
            height: img.height,
            dataUrl,
            exifTiff,
            hasExif: Boolean(exifTiff),
            convertedUrl: null,
            convertedBlob: null,
            convertedSize: null,
            convertedFormat: null,
            convertedWidth: null,
            convertedHeight: null,
            convertedExifStatus: null,
            conversionTime: null,
            status: 'pending',
            isSvg: isSvgFile(file),
          });
        } catch {
          pushToast(`Could not load ${file.name}.`, 'error');
        }
      }

      if (nextItems.length > 0) {
        setFiles((prev) => [...prev, ...nextItems]);
      }
    },
    [pushToast]
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const pastedFiles: File[] = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) pastedFiles.push(f);
        }
      }
      if (pastedFiles.length > 0) {
        ingestFiles(pastedFiles);
        pushToast('Image pasted from clipboard.', 'success');
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [ingestFiles, pushToast]);

  const handleFetchUrl = useCallback(
    async (rawUrl: string) => {
      try {
        new URL(rawUrl);
      } catch {
        pushToast('Please enter a valid URL.', 'error');
        return;
      }

      try {
        const response = await fetch(rawUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
          throw new Error('The URL did not return an image.');
        }
        const blob = await response.blob();
        const urlPathname = new URL(rawUrl).pathname;
        const filename =
          urlPathname.split('/').filter(Boolean).pop() || 'remote-image.png';
        const file = new File([blob], filename, { type: blob.type });
        await ingestFiles([file]);
        pushToast('Image loaded from URL.', 'success');
      } catch (err) {
        const message =
          err instanceof Error && err.message.includes('Failed to fetch')
            ? 'Could not fetch image due to remote CORS policy.'
            : err instanceof Error
              ? err.message
              : 'Failed to load image from URL.';
        pushToast(message, 'error');
      }
    },
    [ingestFiles, pushToast]
  );

  const handleLoadSample = useCallback(async () => {
    try {
      const sample = await createSampleImageFile('studio');
      await ingestFiles([sample]);
    } catch {
      pushToast('Could not generate sample image.', 'error');
    }
  }, [ingestFiles, pushToast]);

  const invalidateConvertedFiles = useCallback(() => {
    setFiles((prev) =>
      prev.map((item) => {
        if (item.status === 'pending' && !item.convertedUrl) return item;
        if (item.convertedUrl) revokeTrackedUrl(item.convertedUrl);
        return {
          ...item,
          status: 'pending',
          convertedUrl: null,
          convertedBlob: null,
          convertedSize: null,
          convertedFormat: null,
          convertedWidth: null,
          convertedHeight: null,
          convertedExifStatus: null,
          conversionTime: null,
          errorMessage: undefined,
        };
      })
    );
  }, [revokeTrackedUrl]);

  const handleFormatChange = useCallback(
    (fmt: OutputFormat) => {
      if (isConverting) return;
      setSelectedFormat(fmt);
      try {
        localStorage.setItem('imageConverter_format', fmt);
      } catch {
        // ignore
      }
      if (!FORMAT_CONFIG[fmt].supportsTransparency && bgColor === 'transparent') {
        setBgColor('#ffffff');
      }
      invalidateConvertedFiles();
    },
    [bgColor, invalidateConvertedFiles, isConverting]
  );

  const handleQualityChange = useCallback(
    (val: number) => {
      if (isConverting) return;
      setQuality(val);
      try {
        localStorage.setItem('imageConverter_quality', String(val));
      } catch {
        // ignore
      }
      invalidateConvertedFiles();
    },
    [invalidateConvertedFiles, isConverting]
  );

  const handleResizeChange = useCallback(
    (nextResize: ResizeOptions) => {
      if (isConverting) return;
      setResize(nextResize);
      invalidateConvertedFiles();
    },
    [invalidateConvertedFiles, isConverting]
  );

  const handleColorModeChange = useCallback(
    (nextMode: ColorMode) => {
      if (isConverting) return;
      setColorMode(nextMode);
      invalidateConvertedFiles();
    },
    [invalidateConvertedFiles, isConverting]
  );

  const handleBgColorChange = useCallback(
    (nextBg: string) => {
      if (isConverting) return;
      setBgColor(nextBg);
      invalidateConvertedFiles();
    },
    [invalidateConvertedFiles, isConverting]
  );

  const handlePreserveExifChange = useCallback(
    (preserve: boolean) => {
      if (isConverting) return;
      setPreserveExif(preserve);
      try {
        localStorage.setItem('imageConverter_preserveExif', String(preserve));
      } catch {
        // ignore
      }
      invalidateConvertedFiles();
    },
    [invalidateConvertedFiles, isConverting]
  );

  const convertSingle = useCallback(
    async (targetId: string) => {
      const target = files.find((f) => f.id === targetId);
      if (!target) return;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === targetId
            ? { ...f, status: 'converting', errorMessage: undefined }
            : f
        )
      );

      const t0 = performance.now();
      try {
        const result = await convertImageItem(target, {
          format: selectedFormat,
          quality,
          resize,
          colorMode,
          bgColor,
          preserveExif,
        });
        const elapsed = Math.round(performance.now() - t0);
        const url = createTrackedUrl(result.blob);

        setFiles((prev) =>
          prev.map((f) => {
            if (f.id !== targetId) return f;
            if (f.convertedUrl) revokeTrackedUrl(f.convertedUrl);
            return {
              ...f,
              status: 'done',
              convertedUrl: url,
              convertedBlob: result.blob,
              convertedSize: result.size,
              convertedFormat: selectedFormat,
              convertedWidth: result.width,
              convertedHeight: result.height,
              convertedExifStatus: result.exifStatus,
              conversionTime: elapsed,
              errorMessage: undefined,
            };
          })
        );
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Conversion failed.';
        setFiles((prev) =>
          prev.map((f) =>
            f.id === targetId
              ? { ...f, status: 'error', errorMessage: msg }
              : f
          )
        );
        pushToast(`Failed to convert ${target.name}: ${msg}`, 'error');
      }
    },
    [
      bgColor,
      colorMode,
      createTrackedUrl,
      files,
      preserveExif,
      pushToast,
      quality,
      resize,
      revokeTrackedUrl,
      selectedFormat,
    ]
  );

  const handleConvertAll = useCallback(async () => {
    if (isConverting || files.length === 0) return;
    setIsConverting(true);

    // Clear prior outputs
    setFiles((prev) =>
      prev.map((item) => {
        if (item.convertedUrl) revokeTrackedUrl(item.convertedUrl);
        return {
          ...item,
          status: 'pending',
          convertedUrl: null,
          convertedBlob: null,
          convertedSize: null,
          convertedFormat: null,
          convertedWidth: null,
          convertedHeight: null,
          convertedExifStatus: null,
          conversionTime: null,
          errorMessage: undefined,
        };
      })
    );

    const snapshot = [...files];
    const concurrency =
      typeof navigator !== 'undefined' &&
      'deviceMemory' in navigator &&
      Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory) <= 4
        ? 2
        : 3;

    let successCount = 0;
    let errorCount = 0;
    const queue = [...snapshot];

    const runWorker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;

        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: 'converting' } : f
          )
        );

        const t0 = performance.now();
        try {
          const result = await convertImageItem(item, {
            format: selectedFormat,
            quality,
            resize,
            colorMode,
            bgColor,
            preserveExif,
          });
          const elapsed = Math.round(performance.now() - t0);
          const url = createTrackedUrl(result.blob);
          successCount++;

          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? {
                    ...f,
                    status: 'done',
                    convertedUrl: url,
                    convertedBlob: result.blob,
                    convertedSize: result.size,
                    convertedFormat: selectedFormat,
                    convertedWidth: result.width,
                    convertedHeight: result.height,
                    convertedExifStatus: result.exifStatus,
                    conversionTime: elapsed,
                  }
                : f
            )
          );
        } catch (err) {
          errorCount++;
          const msg =
            err instanceof Error ? err.message : 'Conversion failed.';
          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? { ...f, status: 'error', errorMessage: msg }
                : f
            )
          );
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(concurrency, snapshot.length) }, () =>
        runWorker()
      )
    );

    setIsConverting(false);
    if (successCount > 0) {
      pushToast(
        `Converted ${successCount} ${successCount === 1 ? 'image' : 'images'}.`,
        'success'
      );
    }
    if (errorCount > 0) {
      pushToast(
        `${errorCount} ${errorCount === 1 ? 'image' : 'images'} failed to convert.`,
        'error'
      );
    }
  }, [
    bgColor,
    colorMode,
    createTrackedUrl,
    files,
    isConverting,
    preserveExif,
    pushToast,
    quality,
    resize,
    revokeTrackedUrl,
    selectedFormat,
  ]);

  const handleDownloadOne = useCallback(
    (id: string) => {
      const item = files.find((f) => f.id === id);
      if (!item || !item.convertedUrl || !item.convertedFormat) {
        pushToast('Convert the image before downloading.', 'error');
        return;
      }
      const link = document.createElement('a');
      link.href = item.convertedUrl;
      link.download = getOutputFilename(item.name, item.convertedFormat, naming);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [files, naming, pushToast]
  );

  const handleDownloadAll = useCallback(async () => {
    const doneFiles = files.filter(
      (f) => f.status === 'done' && f.convertedBlob && f.convertedFormat
    );
    if (doneFiles.length === 0) return;

    if (doneFiles.length === 1) {
      handleDownloadOne(doneFiles[0].id);
      return;
    }

    setIsCreatingZip(true);
    try {
      const zip = new JSZip();
      const usedNames = new Map<string, number>();
      for (const item of doneFiles) {
        if (!item.convertedBlob || !item.convertedFormat) continue;
        let candidate = getOutputFilename(item.name, item.convertedFormat, naming);
        const count = usedNames.get(candidate) ?? 0;
        usedNames.set(candidate, count + 1);
        if (count > 0) {
          const dotIdx = candidate.lastIndexOf('.');
          candidate =
            dotIdx > 0
              ? `${candidate.slice(0, dotIdx)}-${count + 1}${candidate.slice(dotIdx)}`
              : `${candidate}-${count + 1}`;
        }
        zip.file(candidate, item.convertedBlob);
      }
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `converted-images-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      pushToast(`Downloaded ${doneFiles.length} files as ZIP.`, 'success');
    } catch {
      pushToast('Could not create ZIP archive.', 'error');
    } finally {
      setIsCreatingZip(false);
    }
  }, [files, handleDownloadOne, naming, pushToast]);

  const handleMergePdf = useCallback(async () => {
    if (files.length === 0 || isMergingPdf) return;
    setIsMergingPdf(true);
    try {
      const { blob, pageCount } = await createMergedPdfBlob(files, {
        quality,
        resize,
        colorMode,
        bgColor,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `merged-images-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      pushToast(
        `Exported ${pageCount}-page PDF document.`,
        'success'
      );
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : 'Failed to create PDF.',
        'error'
      );
    } finally {
      setIsMergingPdf(false);
    }
  }, [bgColor, colorMode, files, isMergingPdf, pushToast, quality, resize]);

  const handleRemoveFile = useCallback(
    (id: string) => {
      setFiles((prev) => {
        const target = prev.find((f) => f.id === id);
        if (target?.convertedUrl) revokeTrackedUrl(target.convertedUrl);
        return prev.filter((f) => f.id !== id);
      });
      if (previewId === id) setPreviewId(null);
    },
    [previewId, revokeTrackedUrl]
  );

  const handleClearAll = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((f) => {
        if (f.convertedUrl) revokeTrackedUrl(f.convertedUrl);
      });
      return [];
    });
    setPreviewId(null);
  }, [revokeTrackedUrl]);

  const scrollToFaq = useCallback(() => {
    document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const previewItem = files.find((f) => f.id === previewId) ?? null;

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground transition-colors">
      <Header
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onResetWorkspace={handleClearAll}
        onOpenInfo={(sec) => setInfoSection(sec)}
        onScrollToFaq={scrollToFaq}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6">
        {files.length === 0 ? (
          <div className="flex flex-col items-center py-14 md:py-24">
            <div className="mb-10 max-w-xl text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl [text-wrap:balance]">
                Convert images locally.
              </h1>
              <p className="mt-3 text-base leading-relaxed text-muted">
                Fast format conversion, resizing, and compression directly in your browser. Zero uploads.
              </p>
            </div>

            <UploadSurface
              onFilesSelected={ingestFiles}
              onFetchUrl={handleFetchUrl}
              onLoadSample={handleLoadSample}
            />
          </div>
        ) : (
          <div className="py-8 md:py-10">
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <FileQueue
                  files={files}
                  selectedFormat={selectedFormat}
                  quality={quality}
                  resize={resize}
                  colorMode={colorMode}
                  naming={naming}
                  isConverting={isConverting}
                  isMergingPdf={isMergingPdf}
                  isCreatingZip={isCreatingZip}
                  onNamingChange={setNaming}
                  onAddMore={() => addMoreInputRef.current?.click()}
                  onClearAll={handleClearAll}
                  onConvertAll={handleConvertAll}
                  onDownloadAll={handleDownloadAll}
                  onMergePdf={handleMergePdf}
                  onPreview={(id) => setPreviewId(id)}
                  onDownloadOne={handleDownloadOne}
                  onRetry={convertSingle}
                  onRemove={handleRemoveFile}
                />
              </div>

              <div className="lg:col-span-4">
                <SettingsPanel
                  selectedFormat={selectedFormat}
                  quality={quality}
                  resize={resize}
                  colorMode={colorMode}
                  bgColor={bgColor}
                  preserveExif={preserveExif}
                  disabled={isConverting}
                  onFormatChange={handleFormatChange}
                  onQualityChange={handleQualityChange}
                  onResizeChange={handleResizeChange}
                  onColorModeChange={handleColorModeChange}
                  onBgColorChange={handleBgColorChange}
                  onPreserveExifChange={handlePreserveExifChange}
                />
              </div>
            </div>
          </div>
        )}

        <input
          ref={addMoreInputRef}
          type="file"
          multiple
          accept="image/*"
          aria-label="Add more images"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              ingestFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
        <EditorialGuide />
      </main>

      <Footer
        onOpenInfo={(sec) => setInfoSection(sec)}
        onScrollToFaq={scrollToFaq}
      />

      {previewItem && (
        <PreviewModal
          key={previewItem.id}
          item={previewItem}
          onClose={() => setPreviewId(null)}
          onDownload={handleDownloadOne}
        />
      )}

      <InfoModal section={infoSection} onClose={() => setInfoSection(null)} />

      <ToastList toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
