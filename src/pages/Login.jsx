import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Mail, Lock, AlertCircle, Receipt } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Invalid email or password.");
      } else {
        setError("Authentication failed. Please check your network and try again.");
      }
    } finally {
      setLoading(false);
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
        maxWidth: "420px",
        width: "100%",
        padding: "40px",
      }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "12px",
              objectFit: "contain",
              marginBottom: "16px"
            }}
          />
          <h2>Sign In</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "8px" }}>
            Access the organization invoice manager
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
            alignItems: "center"
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
              EMAIL ADDRESS
            </label>
            <div style={{ position: "relative" }}>
              <Mail size={18} style={{ position: "absolute", left: "14px", top: "14px", color: "var(--text-secondary)" }} />
              <input
                required
                type="email"
                placeholder="name@organization.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: "44px" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "28px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
              PASSWORD
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={18} style={{ position: "absolute", left: "14px", top: "14px", color: "var(--text-secondary)" }} />
              <input
                required
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: "44px" }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "10px",
              backgroundColor: "var(--accent-color)",
              color: "#fff",
              fontWeight: "600",
              fontSize: "15px",
              boxShadow: "0 4px 14px 0 rgba(59, 130, 246, 0.3)",
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer"
            }}
            onMouseEnter={(e) => { if(!loading) e.currentTarget.style.backgroundColor = "var(--accent-hover)" }}
            onMouseLeave={(e) => { if(!loading) e.currentTarget.style.backgroundColor = "var(--accent-color)" }}
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "24px", fontSize: "14px" }}>
          <span style={{ color: "var(--text-secondary)" }}>New organization? </span>
          <Link to="/register" style={{ color: "var(--accent-color)", fontWeight: "600", textDecoration: "none" }}>
            Register Suite
          </Link>
        </div>
      </div>
    </div>
  );
}
