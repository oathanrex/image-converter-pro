import { Moon, Sun } from 'lucide-react';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onResetWorkspace: () => void;
  onOpenInfo: (section: 'formats' | 'privacy') => void;
  onScrollToFaq: () => void;
}

export function Header({
  theme,
  onToggleTheme,
  onResetWorkspace,
  onOpenInfo,
  onScrollToFaq,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-6">
        {/* Zone 1: Single-line brand mark */}
        <button
          type="button"
          onClick={onResetWorkspace}
          className="flex shrink-0 items-center gap-2.5 rounded-md text-left whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 32 32"
            className="h-7 w-7 shrink-0"
            aria-hidden="true"
          >
            <rect width="32" height="32" rx="8" fill="var(--pfx-primary)" />
            <rect
              x="7"
              y="8"
              width="18"
              height="16"
              rx="2.5"
              fill="none"
              stroke="var(--pfx-primary-fg)"
              strokeWidth="2"
            />
            <circle cx="12.5" cy="13.5" r="1.75" fill="var(--pfx-primary-fg)" />
            <path
              d="M9 21l4.5-4.5 3.5 3.5 2.5-2.5L23 21"
              fill="none"
              stroke="var(--pfx-primary-fg)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-base font-semibold tracking-tight text-foreground">
            Image Converter Pro
          </span>
        </button>

        {/* Zone 2: Concise single-line navigation */}
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-7 text-sm font-medium text-muted md:flex"
        >
          <button
            type="button"
            onClick={onResetWorkspace}
            className="shrink-0 rounded whitespace-nowrap transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Workspace
          </button>
          <button
            type="button"
            onClick={() => onOpenInfo('formats')}
            className="shrink-0 rounded whitespace-nowrap transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Formats
          </button>
          <button
            type="button"
            onClick={() => onOpenInfo('privacy')}
            className="shrink-0 rounded whitespace-nowrap transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Privacy
          </button>
          <button
            type="button"
            onClick={onScrollToFaq}
            className="shrink-0 rounded whitespace-nowrap transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            FAQ
          </button>
        </nav>

        {/* Zone 3: Single utility action */}
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={
              theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
            }
            title={
              theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
            }
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs font-medium whitespace-nowrap text-foreground shadow-surface transition-colors hover:bg-well focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
