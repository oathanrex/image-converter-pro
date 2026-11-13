import { ChevronDown, Coffee } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Is Image Converter Pro free to use?',
    answer:
      'Yes. The tool is free with no account sign-up, no watermarks, and no daily conversion cap.',
  },
  {
    question: 'Are my images uploaded to a server?',
    answer:
      'No. Every conversion, resize, color adjustment, ZIP archive, and PDF merge runs locally inside your browser using the HTML5 Canvas and File APIs. Your files stay on your device.',
  },
  {
    question: 'Which image formats are supported?',
    answer:
      'You can open JPG, PNG, WEBP, GIF, BMP, and SVG files. Exports support JPG, PNG, WEBP, static GIF, BMP, and single or merged PDF documents. Animated GIFs export their first frame, and SVG vectors are rasterized.',
  },
  {
    question: 'Can I convert and rename multiple images at once?',
    answer:
      'Yes. Drop a batch of images, set an optional filename prefix or suffix in the queue header, convert everything together, and download individual files, a single ZIP archive, or a combined multi-page PDF.',
  },
  {
    question: 'Does conversion keep or remove EXIF metadata?',
    answer:
      'EXIF metadata is stripped by default to protect privacy by removing camera serial numbers, timestamps, and GPS coordinates. When exporting to JPG, PNG, or WEBP, you can turn on Preserve EXIF metadata in the settings panel to retain it.',
  },
  {
    question: 'What are the file size and dimension limits?',
    answer:
      'Each file can be up to 50 MB, up to 50 megapixels total, and up to 10,000 pixels on any side so your browser tab stays responsive during processing.',
  },
  {
    question: 'How do I convert JPG to PNG or WEBP?',
    answer:
      'Drop your JPG files onto the workspace, select PNG or WEBP under Output Format, adjust quality or dimensions if needed, and click Convert All. You can inspect the before-and-after comparison slider before downloading.',
  },
];

export function EditorialGuide() {
  return (
    <div className="border-t border-border/70 py-16 md:py-20">
      {/* Editorial overview: 3 crisp columns without card-in-card clutter */}
      <section aria-labelledby="guide-heading" className="mx-auto max-w-5xl">
        <div className="max-w-2xl">
          <h2
            id="guide-heading"
            className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          >
            Built for private, predictable image conversion
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-muted">
            Most online converters force you to upload raw photos to an unknown server and wait in a queue. This workspace runs the entire pipeline on your own hardware.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 border-t border-border/60 pt-8 md:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Browser-local speed
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Decoding, resizing, and re-encoding happen directly in browser memory through the Canvas API. No upload wait times, and temporary object URLs clear when you reset the queue.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Control quality and weight
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Export photos to WEBP or JPG to cut page weight, switch to PNG when transparency or sharp UI edges matter, or combine an entire batch into one multi-page PDF.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Metadata and batch naming
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Camera EXIF tags and GPS coordinates are removed automatically unless you enable metadata preservation for JPG, PNG, or WEBP. Add custom prefixes or suffixes before exporting a ZIP.
            </p>
          </div>
        </div>

        {/* Clean technical specification strip */}
        <dl className="mt-10 grid grid-cols-1 gap-6 border-y border-border/60 py-6 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-muted">
              Supported inputs
            </dt>
            <dd className="mt-1 font-mono text-xs text-foreground">
              JPG · PNG · WEBP · GIF · BMP · SVG
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">
              Export formats
            </dt>
            <dd className="mt-1 font-mono text-xs text-foreground">
              JPG · PNG · WEBP · GIF* · BMP · PDF
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">
              Processing limits
            </dt>
            <dd className="mt-1 font-mono text-xs text-foreground">
              50 MB / file · 50 MP · 10,000 px max
            </dd>
          </div>
        </dl>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        aria-labelledby="faq-heading"
        className="mx-auto mt-16 max-w-3xl scroll-mt-24"
      >
        <div className="mb-8">
          <h2
            id="faq-heading"
            className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          >
            Frequently asked questions
          </h2>
          <p className="mt-2 text-sm text-muted">
            How local conversion, format support, and EXIF metadata work in practice.
          </p>
        </div>

        <div className="divide-y divide-border/60 border-y border-border/70">
          {FAQ_ITEMS.map((item, idx) => (
            <details
              key={item.question}
              className="group"
              open={idx === 0}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-sm font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="pb-5 pr-8 text-sm leading-relaxed text-muted">
                <p>{item.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Support Strip */}
      <section
        aria-labelledby="support-heading"
        className="mx-auto mt-16 max-w-3xl"
      >
        <div className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-border bg-surface p-6 shadow-surface sm:flex-row sm:items-center sm:p-7">
          <div>
            <h2
              id="support-heading"
              className="text-base font-semibold text-foreground"
            >
              Free, ad-free, and maintained independently
            </h2>
            <p className="mt-1 text-sm text-muted">
              If Image Converter Pro saved you time today, you can support ongoing browser tool updates.
            </p>
          </div>
          <a
            href="https://www.buymeacoffee.com/oathanrex"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Coffee className="h-4 w-4" aria-hidden="true" />
            <span>Buy Me a Coffee</span>
          </a>
        </div>
      </section>
    </div>
  );
}
