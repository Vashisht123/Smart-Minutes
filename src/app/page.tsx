import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-5xl font-bold mb-4">SmartMinutes</h1>
      <p className="mb-8 text-gray-400">AI-Powered Meeting Transcription & Summarization</p>
      <Link href="/dashboard" className="bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-gray-200">
        Launch Dashboard
      </Link>
    </div>
  );
}