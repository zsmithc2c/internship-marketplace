export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only absolute left-4 top-4 z-50 rounded bg-[--accent-primary] px-4 py-2 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      Skip to main content
    </a>
  );
}
