export const metadata = { title: "Offline | IT HUB Kohlu" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center text-white">
      <h1 className="font-display text-3xl font-bold">You&apos;re offline</h1>
      <p className="max-w-sm text-white/70">
        Internet connection nahi hai. Connection wapas aane par dobara try karein.
      </p>
      <a href="/" className="btn-primary px-5 py-2.5">Retry</a>
    </main>
  );
}
