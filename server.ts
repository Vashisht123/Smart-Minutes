import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { transcribeChunk, summarizeMeeting } from "./src/lib/gemini";
import { prisma } from "./src/lib/db";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

interface SessionBuffer {
  transcript: string[];
  audioChunks: Buffer[];
  userId: string;
  startTime: number;
}

// In-memory storage for active sessions
const activeSessions = new Map<string, SessionBuffer>();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: { origin: "*" },
    maxHttpBufferSize: 1e8 // 100MB allowed for safety
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // 1. Start Recording
    socket.on("start-session", ({ userId }) => {
      console.log(`Starting session for user ${userId}`);
      activeSessions.set(socket.id, {
        transcript: [],
        audioChunks: [],
        userId,
        startTime: Date.now(),
      });
      socket.emit("status", "recording");
    });

    // 2. Receive Audio Chunk (Streaming)
    socket.on("audio-data", async (data: ArrayBuffer) => {
      const session = activeSessions.get(socket.id);
      if (!session) return;

      const buffer = Buffer.from(data);
      session.audioChunks.push(buffer);
      console.log(`Received audio chunk: ${buffer.length} bytes`);

      // GET CONTEXT: Join the last few segments to give Gemini a "memory"
      const previousText = session.transcript.slice(-2).join(" ");

      try {
        // PASS CONTEXT to the transcription function
        // Note: Make sure your src/lib/gemini.ts transcribeChunk function accepts 2 arguments!
        const text = await transcribeChunk(buffer, previousText);
        
        if (text) {
          console.log(`📝 Transcribed: "${text}"`); // Log successful words
          session.transcript.push(text);
          
          // Send full update to client
          const currentTranscript = session.transcript.join(" ");
          socket.emit("transcript-update", { 
            text, 
            fullTranscript: currentTranscript 
          });
        } else {
          console.log("Empty/Silence detected.");
        }
      } catch (e) {
        console.error("Processing error", e);
      }
    });

    // 3. Stop & Process
    socket.on("stop-session", async () => {
      const session = activeSessions.get(socket.id);
      if (!session) return;

      socket.emit("status", "processing");

      // WAIT 2 SECONDS: Allow the last audio chunk to finish transcribing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const fullTranscript = session.transcript.join(" ");
      console.log("📝 Final Transcript Length:", fullTranscript.length);
      console.log("📝 Transcript Content:", fullTranscript); 

      if (fullTranscript.length < 5) {
        console.log("⚠️ Warning: Transcript is empty or too short.");
        socket.emit("transcript-update", { fullTranscript: "Error: No speech detected." });
      }

      const duration = Math.floor((Date.now() - session.startTime) / 1000);

      // Generate Summary
      let summary = "";
      try {
        // Handle case where transcript is empty to avoid API error
        const textToSummarize = fullTranscript.length > 10 ? fullTranscript : "The meeting was short and no clear speech was recorded.";
        summary = await summarizeMeeting(textToSummarize);
      } catch (e) {
        console.error("Summary error:", e);
        summary = "Summary generation failed.";
      }

      // Save to DB
      try {
        const savedSession = await prisma.session.create({
          data: {
            userId: session.userId,
            transcript: fullTranscript,
            summary: summary,
            duration: duration,
            title: `Meeting on ${new Date().toLocaleString()}`
          }
        });
        
        socket.emit("session-completed", savedSession);
        activeSessions.delete(socket.id);
      } catch (e) {
        console.error("DB Save Error", e);
        socket.emit("error", "Failed to save session");
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      activeSessions.delete(socket.id);
    });
  });

  server.listen(3000, () => {
    console.log("> Ready on http://localhost:3000");
  });
});