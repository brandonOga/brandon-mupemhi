import Link from "next/link";

export default function BackButton() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 uppercase text-sm tracking-widest hover:opacity-60 transition-opacity"
    >
      ← Back
    </Link>
  );
}
