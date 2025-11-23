# 🎙️ SmartMinutes

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Gemini AI](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-orange?style=for-the-badge&logo=google-gemini)
![Postgres](https://img.shields.io/badge/Postgres-Prisma-336791?style=for-the-badge&logo=postgresql)

> **A real-time audio transcription and summarization platform for long-duration meetings, powered by Google Gemini.**

## 🎥 Video Walkthrough

**[Click here to watch the full architecture demo on Loom](https://www.loom.com/share/YOUR_VIDEO_ID_HERE)**

---

## 🚀 Key Features

* **⚡ Real-time Streaming:** Audio is captured via Mic or System Tab, sliced into 6-10s chunks, and streamed via WebSockets for sub-2s latency.
* **🧠 Context-Aware Transcription:** Implemented a **"Sliding Context Window"** where previous transcript segments are passed to the AI to prevent words from being dropped at chunk boundaries.
* **👻 Hallucination Filters:** Custom "Ghost Filter" logic to strictly block common LLM hallucinations on silence (e.g., *"I'm getting into it"*).
* **⏯️ Smart Playback:** Includes **Pause/Resume** functionality without breaking the recording stream.
* **📊 Audio Visualizer:** Real-time frequency analysis to verify microphone input before recording.
* **📂 Session History:** Persists full transcripts and summaries to PostgreSQL. Includes features to rename sessions for better organization.

---

## 🛠 Tech Stack

* **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide React
* **Backend:** Node.js Custom Server (for WebSockets), Socket.io
* **AI Integration:** Google Gemini 2.5 Flash (Optimized for high-throughput)
* **Database:** PostgreSQL + Prisma ORM
* **State Management:** React Hooks (Custom `useRecorder`)

---

## 🏗 Architecture & Scalability Analysis

### 1. Architecture Comparison (Assignment Requirement)
For this specific use case—server-side transcription of long audio—we evaluated three approaches. We chose **WebSocket Streaming** for its balance of scalability and implementation complexity.

| Feature | **WebSocket Streaming (Chosen)** | **REST API Upload** | **WebRTC** |
| :--- | :--- | :--- | :--- |
| **Latency** | **Low (~2s):** Incremental updates appear live. | **High:** Must wait for recording to finish. | **Ultra-Low (<500ms):** True real-time. |
| **Reliability** | **High:** Auto-reconnect logic handles network drops. | **Medium:** Large uploads fail on poor networks. | **Low:** UDP packet loss degrades audio. |
| **Server Load** | **Moderate:** Persistent connections required. | **Spiky:** Massive memory spikes during processing. | **High:** Requires media decoding/mixing. |
| **Complexity** | **Medium:** Custom socket server needed. | **Low:** Standard HTTP POST. | **Very High:** Requires signaling/STUN/TURN. |

### 2. Handling Long-Duration Sessions (Scalability)
To handle recordings of 1 hour or more without crashing the server RAM:
* **Chunking Strategy:** Instead of buffering a 100MB+ audio file, the client slices audio into small binary chunks. These are processed statelessly and discarded immediately after transcription.
* **Database Persistence:** Transcripts are aggregated incrementally in memory (text is lightweight, ~10KB/hour) and committed to the database upon completion.
* **Production Scaling:** In a V2 production environment (10k+ users), we would decouple the WebSocket server from the frontend. Audio chunks would be pushed to a message queue (Redis/Kafka) and processed by independent AI workers.

### 3. Engineering Challenges Solved
* **The "Context Window" Problem:** Sentences cut between chunks resulted in dropped words. **Solution:** We pass the last 100 chars of the *previous* transcript to the AI as context for the *current* chunk.
* **The "Silence" Problem:** Generative models hallucinate text during silence. **Solution:** We combined `temperature: 0.2` prompt engineering with a server-side Regex filter to strip hallucinations.

---

## 📦 Setup Instructions (For Reviewers)

Follow these steps to run the project locally.

### 1. Clone & Install
```bash
git clone [https://github.com/YOUR_USERNAME/smart-minutes.git](https://github.com/YOUR_USERNAME/smart-minutes.git)
cd smart-minutes
npm install