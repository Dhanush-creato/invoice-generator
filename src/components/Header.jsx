import React, { useEffect, useState } from "react";
import { Sun, Moon, AlertTriangle, Key } from "lucide-react";
import { isFirebaseInitialized, clearLocalFirebaseConfig } from "../firebase";

export default function Header({ title }) {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    // Check local storage for theme preference
    const savedTheme = localStorage.getItem("invoice_theme");
    if (savedTheme === "light") {
      document.body.classList.add("light-theme");
      setIsLight(true);
    }
  }, []);

  const toggleTheme = () => {
    if (isLight) {
      document.body.classList.remove("light-theme");
      localStorage.setItem("invoice_theme", "dark");
      setIsLight(false);
    } else {
      document.body.classList.add("light-theme");
      localStorage.setItem("invoice_theme", "light");
      setIsLight(true);
    }
  };

  return (
    <header className="no-print" style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "32px",
      backgroundColor: "transparent",
    }}>
      <div>
        <h1 style={{ fontSize: "28px", fontWeight: "700", letterSpacing: "-0.5px" }}>{title}</h1>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        
        {/* Firebase Config Reset Option (if manually initialized via localStorage) */}
        {localStorage.getItem("icon_systems_invoice_firebase_config") && (
          <button 
            onClick={clearLocalFirebaseConfig}
            title="Reset Firebase Credentials"
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "var(--danger-color)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              fontWeight: "600"
            }}
          >
            <Key size={14} />
            Reset Firebase
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          style={{
            padding: "10px",
            borderRadius: "12px",
            backgroundColor: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            color: "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--shadow-main)",
          }}
        >
          {isLight ? <Moon size={20} /> : <Sun size={20} />}
        </button>

      </div>
    </header>
  );
}
