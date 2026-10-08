"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="py-20 text-center">
      <h1 className="font-display text-4xl font-black md:text-6xl">Whiteout.</h1>
      <p className="mx-auto mt-3 max-w-md text-mute">Something broke on our side. Your entries are safe. Try loading the page again.</p>
      <button onClick={reset} className="btn mt-6">
        Try again
      </button>
    </div>
  );
}
