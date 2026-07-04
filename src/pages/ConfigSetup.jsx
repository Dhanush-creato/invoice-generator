import React, { useState } from "react";
import { Key, AlertCircle, Copy, HelpCircle } from "lucide-react";
import { saveLocalFirebaseConfig } from "../firebase";

export default function ConfigSetup() {
  const [rawConfig, setRawConfig] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    try {
      // Clean up string: see if it's JSON or JS object
      let parsed = null;
      let text = rawConfig.trim();
      
      // If it looks like a JavaScript object declarations, try to extract the inner object
      if (text.includes("firebaseConfig = {")) {
        const matches = text.match(/firebaseConfig\s*=\s*({[\s\S]*?});/);
        if (matches && matches[1]) {
          text = matches[1];
        }
      }
      
      // Attempt to clean JSON formatting (convert unquoted keys to quoted)
      // Standard JSON parsing first
      try {
        parsed = JSON.parse(text);
      } catch (jsonErr) {
        // Fallback: simple evaluation if it's a JS object literal
        // We'll parse it manually safely or clean keys
        // Replace comments
        const cleanText = text
          .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '') // strip comments
          .replace(/([a-zA-Z0-9_]+)\s*:/g, '"$1":') // quote keys
          .replace(/'/g, '"') // convert single quotes to double
          .replace(/,\s*}/g, '}'); // strip trailing comma
        
        parsed = JSON.parse(cleanText);
      }

      if (!parsed.apiKey || !parsed.projectId) {
        setError("Invalid configuration. Firebase configuration must contain at least 'apiKey' and 'projectId'.");
        return;
      }

      // Success
      saveLocalFirebaseConfig(parsed);
    } catch (err) {
      console.error(err);
      setError("Failed to parse the configuration. Please ensure it is a valid JSON object or the exact code block copied from Firebase console.");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "var(--bg-primary)",
      padding: "20px",
    }}>
      <div className="glass" style={{
        maxWidth: "540px",
        width: "100%",
        padding: "40px",
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "14px",
            backgroundColor: "var(--accent-glow)",
            color: "var(--accent-color)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px"
          }}>
            <Key size={28} />
          </div>
          <h2>Connect Firebase Database</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "8px", lineHeight: "1.5" }}>
            The app runs on a serverless architecture. To get started, you need to connect your own Firebase Project. It runs completely within your browser and keeps all data under your control.
          </p>
        </div>

        {error && (
          <div style={{
            display: "flex",
            gap: "10px",
            padding: "12px 16px",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "10px",
            color: "var(--danger-color)",
            fontSize: "13px",
            marginBottom: "24px",
            lineHeight: "1.4"
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
              PASTE FIREBASE WEB APP CONFIGURATION
            </label>
            <textarea
              required
              rows={8}
              placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "...",\n  projectId: "...",\n  storageBucket: "...",\n  messagingSenderId: "...",\n  appId: "..."\n};`}
              value={rawConfig}
              onChange={(e) => setRawConfig(e.target.value)}
              style={{
                fontFamily: "monospace",
                fontSize: "12px",
                lineHeight: "1.5",
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "10px",
              backgroundColor: "var(--accent-color)",
              color: "#fff",
              fontWeight: "600",
              fontSize: "15px",
              boxShadow: "0 4px 14px 0 rgba(59, 130, 246, 0.3)",
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--accent-hover)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--accent-color)"}
          >
            Save Configuration & Connect
          </button>
        </form>

        <div style={{
          marginTop: "32px",
          paddingTop: "24px",
          borderTop: "1px solid var(--border-color)",
          fontSize: "13px",
          color: "var(--text-secondary)",
          lineHeight: "1.5",
        }}>
          <h4 style={{ color: "var(--text-primary)", fontWeight: "600", marginBottom: "6px" }}>How to get this?</h4>
          <ol style={{ paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-color)", fontWeight: "600", textDecoration: "none" }}>Firebase Console</a>.</li>
            <li>Create a new project (e.g. "Icon Systems Invoice").</li>
            <li>Click the **Web** icon (<code>&lt;/&gt;</code>) to register a web app.</li>
            <li>Copy the <code>firebaseConfig</code> object and paste it here!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
