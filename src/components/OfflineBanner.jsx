import { useState, useEffect } from "react";

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReturned, setShowReturned] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowReturned(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowReturned(true);
      setTimeout(() => setShowReturned(false), 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline && !showReturned) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        padding: "5px 12px",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "11px",
        fontWeight: "600",
        whiteSpace: "nowrap",
        borderRadius: "20px",
        backgroundColor: isOffline ? "rgba(220,38,38,0.55)" : "rgba(22,163,74,0.55)",
        color: "#fff",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: isOffline
          ? "1px solid rgba(239,68,68,0.4)"
          : "1px solid rgba(34,197,94,0.4)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        pointerEvents: "none", // doesn't block taps
      }}
    >
      <span style={{ fontSize: "12px" }}>{isOffline ? "⚠️" : "✅"}</span>
      {isOffline ? "Offline — cached mode" : "Back online!"}
    </div>
  );
}
