import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="font-display text-4xl font-black md:text-6xl">Nothing here.</h1>
      <p className="mx-auto mt-3 max-w-md text-mute">That page, person or entry doesn&apos;t exist, or it was deleted.</p>
      <Link href="/" className="btn mt-6">
        Back to the calendar
      </Link>
    </div>
  );
}
