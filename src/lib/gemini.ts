import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const MODEL_NAME = "gemini-2.5-flash"; 

// UPDATED: Now accepts 'previousTranscript' to provide context
export async function transcribeChunk(audioBuffer: Buffer, previousTranscript: string = ""): Promise<string> {
  const model = genAI.getGenerativeModel({ 
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.2, // Low temperature for accuracy
      topK: 1,
    }
  });

  // Take the last 100 characters of context to keep it relevant but short
  const contextSnippet = previousTranscript.slice(-100);

  try {
    const result = await model.generateContent([
      `You are a professional transcriber.
       CONTEXT: The user previously said: "${contextSnippet || '[Start of conversation]'}"
       
       INSTRUCTION: Transcribe the speech in the provided AUDIO chunk exactly.
       - Continue the flow of speech from the CONTEXT naturally.
       - If the audio contains the end of the previous sentence, finish it.
       - If the audio is silence or background noise, return an empty string.
       - Do NOT repeat the text from the CONTEXT. Only output the NEW speech found in the audio.
       - Do NOT output "I'm getting into it" or timestamps.`,
      {
        inlineData: {
          mimeType: "audio/webm",
          data: audioBuffer.toString("base64")
        }
      }
    ]);
    
    let text = result.response.text().trim();

    // GHOST FILTER
    const BANNED_PHRASES = ["I'm getting into it", "Thank you", "Amara.org", "subtitle"];
    for (const phrase of BANNED_PHRASES) {
      if (text.includes(phrase)) return "";
    }

    return text;

  } catch (error) {
    console.error("Gemini Transcription Error:", error);
    return "";
  }
}

export async function summarizeMeeting(fullTranscript: string) {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  
  const prompt = `
    Analyze the following meeting transcript. 
    Provide:
    1. A concise summary (3-4 sentences).
    2. Key Action Items (bullet points).
    3. Important decisions made.
    
    Transcript:
    ${fullTranscript}
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Summary Generation Error:", error);
    return "Could not generate summary due to an error.";
  }
}