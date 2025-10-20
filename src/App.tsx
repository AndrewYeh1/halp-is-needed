// src/App.tsx
import React, { useState, useRef } from "react";

const SERVER_URL = "http://100.73.120.82:1234";

const App: React.FC = () => {
  /* ---------- State ---------- */
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  /* ---------- Ref to abort the stream ---------- */
  const abortControllerRef = useRef<AbortController | null>(null);

  /* ---------- Stream helper ---------- */
  const readStream = async (reader: ReadableStreamDefaultReader) => {
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (!loading) {
      const { done, value } = await reader.read();
      if (done) break;

      // Keep partial chunks in a buffer
      buffer += decoder.decode(value, { stream: true });

      // Split on newlines – LM‑Studio prefixes each JSON line with "data:"
      const lines = buffer.split("\n");
      // keep the last incomplete line for next chunk
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        if (!rawLine.trim().startsWith("data: ")) continue;

        const data = rawLine.replace(/^data:\s*/, "");

        if (data === "[DONE]") {
          setLoading(false);
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content =
            parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content;

          if (content) {
            // Append to the full response
            setResponse((prev) => prev + content);
          }
        } catch (e) {
          console.warn("Failed to parse stream chunk:", data, e);
        }
      }
    }

    setLoading(false);
  };

  /* ---------- Send prompt ---------- */
  const sendPrompt = async () => {
    if (!prompt.trim()) return;

    // Abort any previous request
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setResponse("");

    try {
      const res = await fetch(`${SERVER_URL}/v1/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: [{ role: "user", content: prompt }],
          stream: true, // <-- important
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Server error ${res.status}`);
      }

      const reader = res.body.getReader();
      await readStream(reader);
    } catch (err: any) {
      console.error(err);
      setResponse((prev) => prev + `\nError: ${err.message ?? err}`);
      setLoading(false);
    }
  };

  /* ---------- Cancel streaming ---------- */
  const cancel = () => {
    abortControllerRef.current?.abort();
    setLoading(false);
  };

  return (
    <div
      style={{
        padding: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100vw",
        height: "100vh",
        boxSizing: "border-box",
        overflow: "auto",
        fontFamily: "sans-serif",
      }}
    >
      <h2>LM Studio Stream Demo</h2>

      {/* ---------- Response area ---------- */}
      <pre
        style={{
          whiteSpace: "pre-wrap",
          width: "80%",
          background: "#251a1aff",
          padding: "12px 16px",
          borderRadius: 8,
          minHeight: 200,
          maxHeight: 400,
          overflowY: "auto",
        }}
      >
        {response}
      </pre>

      {/* ---------- Controls ---------- */}
      <div style={{ display: "flex", width: "80%", marginTop: 20, gap: 10 }}>
        <textarea
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Type your prompt…"
          style={{
            flexGrow: 1,
            padding: 8,
            fontSize: 14,
            borderRadius: 4,
            border: "1px solid #ccc",
          }}
        />
        <button
          onClick={sendPrompt}
          disabled={loading}
          style={{
            width: 80,
            background: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Streaming…" : "Send"}
        </button>
        {loading && (
          <button
            onClick={cancel}
            style={{
              width: 80,
              background: "#dc3545",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default App;
