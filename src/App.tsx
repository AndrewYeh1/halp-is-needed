// src/App.tsx
import React, { useState } from "react";

const SERVER_URL = "http://100.73.120.82:1234";

const App: React.FC = () => {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const sendPrompt = async () => {
    if (!prompt) return;

    setLoading(true);
    setResponse("");

    try {
      const res = await fetch(`${SERVER_URL}/v1/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "dolphin-2.9.3-mistral-nemo-12b",
          input: [
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 100,
          stop: ["\n"],
          temperature: 0.0
        }),
      });


      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      // LM Studio usually returns { choices: [{ text: "..." }] }
      const assistantMessage = data.output?.[0]?.content?.[0]?.text;
      setResponse(assistantMessage || "No response");
    } catch (err: any) {
      setResponse(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>LM Studio Client</h1>
      <textarea
        rows={5}
        cols={50}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Type your prompt..."
      />
      <br />
      <button onClick={sendPrompt} disabled={loading} style={{ marginTop: 10 }}>
        {loading ? "Loading..." : "Send"}
      </button>
      <div style={{ marginTop: 20 }}>
        <h2>Response:</h2>
        <pre>{response}</pre>
      </div>
    </div>
  );
};

export default App;
