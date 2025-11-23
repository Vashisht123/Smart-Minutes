const https = require('https');

// 1. Get the key from your .env file or hardcode it for this test
// Note: If you hardcode it here, DO NOT share this file publicly.
// We try to read it from the environment variable first.
const apiKey = process.env.GEMINI_API_KEY || "YOUR_HARDCODED_KEY_HERE_IF_ENV_FAILS";

if (!apiKey || apiKey.startsWith("YOUR_")) {
  console.error("❌ Error: API Key not found. Please replace 'YOUR_HARDCODED_KEY_HERE_IF_ENV_FAILS' with your actual key in the script.");
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log(`🔍 Checking available models for your API Key...`);

https.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      
      if (json.error) {
        console.error("❌ API Error:", json.error.message);
        return;
      }

      console.log("\n✅ SUCCESS! Here are the models your key can access:\n");
      const models = json.models || [];
      
      // Filter for models that support 'generateContent'
      const available = models
        .filter(m => m.supportedGenerationMethods.includes("generateContent"))
        .map(m => m.name.replace("models/", "")); // Clean up the name

      if (available.length === 0) {
        console.log("⚠️ No models found. This usually means your API Project needs billing enabled or is in a restricted region.");
      } else {
        available.forEach(name => console.log(`   - "${name}"`));
        console.log("\n👇 USE THIS IN YOUR CODE:");
        console.log(`const MODEL_NAME = "${available.includes('gemini-1.5-flash') ? 'gemini-1.5-flash' : available[0]}";`);
      }

    } catch (e) {
      console.error("❌ Error parsing response:", e.message);
      console.log("Raw response:", data);
    }
  });

}).on('error', (e) => {
  console.error("❌ Network Error:", e.message);
});