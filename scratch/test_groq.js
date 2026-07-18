

const DEFAULT_KEY = "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";

async function test() {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DEFAULT_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 100,
        messages: [
          { role: "user", content: "Hello" }
        ]
      })
    });
    const data = await response.json();
    console.log("Status Code:", response.status);
    console.log("Response Data:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Fetch Error:", error);
  }
}

test();
