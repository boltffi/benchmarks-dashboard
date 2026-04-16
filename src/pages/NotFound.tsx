import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid-faint opacity-40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-brand opacity-10 blur-3xl"
      />
      <div className="surface-raised relative z-10 flex flex-col items-center gap-4 rounded-2xl border border-border/70 px-10 py-12 text-center shadow-premium-lg animate-fade-in-up">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Error 404
        </div>
        <h1 className="nums-tabular text-6xl font-bold tracking-tight text-gradient-brand">404</h1>
        <p className="text-base text-muted-foreground">Oops! Page not found</p>
        <a
          href="/"
          className="group mt-2 inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-card/60 px-4 py-2 font-mono text-xs text-primary transition-all hover:border-primary/40 hover:bg-surface-hover hover:text-foreground"
        >
          <span aria-hidden className="transition-transform group-hover:-translate-x-0.5">←</span>
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
