import Link from 'next/link';

export default function Home() {
  return (
    <div>
      {/* hero */}
      <section
        id="home"
        // fix image later (rive animation)
        className="flex min-h-screen flex-col items-center justify-center bg-[url('/image_600e22.jpg')] bg-cover bg-center bg-gray-900 bg-blend-multiply p-16 font-sans"
      >
        <div className="flex flex-col items-center gap-8 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-white">
            HemaLink
          </h1>
          <p className="text-lg tracking-tight text-gray-200">
            Make blood test results easy to understand.
          </p>
          <Link
            href="/dashboard"
            className="rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-transform duration-200 hover:scale-105 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Start Analysis
          </Link>
        </div>
      </section>

      {/* about */}
      <section
        id="about"
        className="flex min-h-screen flex-col items-center justify-center bg-gray-800 p-16 font-sans"
      >
        <div className="flex max-w-2xl flex-col items-center gap-6 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            About Us
          </h2>
          <p className="tracking-tight text-gray-300">
            Welcome to HemaLink.
          </p>
        </div>
      </section>

      {/* how it works */}
      <section
        id="how-it-works"
        className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] p-16 font-sans"
      >
        <div className="flex max-w-2xl flex-col items-center gap-6 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            How It Works
          </h2>
          <p className="tracking-tight text-[var(--foreground)]">
            add bubbles for this
          </p>
        </div>
      </section>
      {/* remove pricing?? */}
    </div>
  );
}