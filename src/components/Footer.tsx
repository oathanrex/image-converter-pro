import { Coffee, ExternalLink, LayoutGrid, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onOpenInfo: (section: 'formats' | 'privacy') => void;
  onScrollToFaq: () => void;
}

export function Footer({ onOpenInfo, onScrollToFaq }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/70 bg-well/40">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
          {/* Brand Attribution */}
          <div>
            <p className="text-sm font-semibold text-foreground">
              Image Converter Pro{' '}
              <span className="font-normal text-muted">
                by Oathan Rex
              </span>
            </p>
            <p className="mt-1 text-xs text-muted">
              Part of the{' '}
              <a
                href="https://oathanrex.github.io"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary"
              >
                Oathan Rex Tools
              </a>{' '}
              collection.
            </p>
          </div>

          {/* Ecosystem & Social Links */}
          <nav
            aria-label="Oathan Rex social and tool links"
            className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-medium text-muted"
          >
            <a
              href="https://oathanrex.github.io/projects.html"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="All Tools by Oathan Rex"
              title="All Tools"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
              <span>All Tools</span>
            </a>

            <a
              href="https://oathanrex.blogspot.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Oathan Rex Blog"
              title="Blog"
              className="inline-flex items-center gap-1 transition-colors hover:text-primary"
            >
              <span>Blog</span>
              <ExternalLink className="h-3 w-3 opacity-60" aria-hidden="true" />
            </a>

            <a
              href="https://codepen.io/oathanrex"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Oathan Rex on CodePen"
              title="CodePen"
              className="inline-flex items-center gap-1 transition-colors hover:text-primary"
            >
              <span>CodePen</span>
              <ExternalLink className="h-3 w-3 opacity-60" aria-hidden="true" />
            </a>

            <a
              href="https://youtube.com/@oathanrex"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Oathan Rex on YouTube"
              title="YouTube"
              className="inline-flex items-center gap-1 transition-colors hover:text-primary"
            >
              <span>YouTube</span>
              <ExternalLink className="h-3 w-3 opacity-60" aria-hidden="true" />
            </a>

            <a
              href="https://www.buymeacoffee.com/oathanrex"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Support this project on Buy Me a Coffee"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground shadow-surface transition-colors hover:border-primary/50 hover:bg-accent-soft hover:text-primary"
            >
              <Coffee className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Support this project</span>
            </a>
          </nav>
        </div>

        <div className="mt-8 flex flex-col justify-between gap-4 border-t border-border/60 pt-6 text-xs text-muted sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck
              className="h-4 w-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <p>
              All processing runs locally in your browser. Files never leave your device.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => onOpenInfo('formats')}
              className="hover:text-foreground md:hidden"
            >
              Formats
            </button>
            <button
              type="button"
              onClick={() => onOpenInfo('privacy')}
              className="hover:text-foreground md:hidden"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={onScrollToFaq}
              className="hover:text-foreground md:hidden"
            >
              FAQ
            </button>
            <p>© {currentYear} Oathan Rex. Free to use. No tracking. No ads.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
