import { useState, useEffect } from "react";

// Usage: <Toast message="..." type="success|error|warning|info" onClose={() => {}} />
export default function Toast({ message, type = "info", duration = 4000, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose && onClose(), 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: { bg: "rgba(22,163,74,0.92)", border: "rgba(34,197,94,0.5)", icon: "✅" },
    error:   { bg: "rgba(220,38,38,0.92)",  border: "rgba(239,68,68,0.5)",  icon: "❌" },
    warning: { bg: "rgba(217,119,6,0.92)",  border: "rgba(251,191,36,0.5)", icon: "⚠️" },
    info:    { bg: "rgba(37,99,235,0.92)",  border: "rgba(96,165,250,0.5)", icon: "ℹ️" },
  };

  const c = colors[type] || colors.info;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "70px",
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? "0" : "20px"})`,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease, transform 0.3s ease",
        zIndex: 10000,
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 18px",
        borderRadius: "24px",
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        color: "#fff",
        fontSize: "13px",
        fontWeight: "600",
        maxWidth: "90vw",
        textAlign: "center",
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}
    >
      <span>{c.icon}</span>
      <span>{message}</span>
    </div>
  );
}
