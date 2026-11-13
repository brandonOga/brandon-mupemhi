// Up-right arrow, sized to the surrounding text and coloured by currentColor.
export default function ArrowUpRight({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path d="M0 0h16v16H0z" fill="none" />
      <path fill="currentColor" d="M13 2a1 1 0 0 1 1 1v10a1 1 0 1 1-2 0V5.414l-8.293 8.293a1 1 0 1 1-1.414-1.414L10.586 4H3a1 1 0 0 1 0-2z" />
    </svg>
  );
}
