import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Mail, Lock, User, AlertCircle, Receipt } from "lucide-react";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [orgName, setOrgName] = useState("Add Organization"); // Default pre-fill
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      // 1. Create firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Set default profile settings for the organization (Pre-filled with Icon Systems details)
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        userId: user.uid,
        name: orgName,
        tagline: orgName.toLowerCase().includes("icon system") 
          ? "Automatic Water Level Controller Cum Indicator, Digital Controllers, Digital Indicators And Timers" 
          : "Professional Invoice Suite",
        phone: orgName.toLowerCase().includes("icon system") ? "9845913976, 8884880066" : "",
        website: orgName.toLowerCase().includes("icon system") ? "www.iconsystemsblr.com" : "",
        address: orgName.toLowerCase().includes("icon system") 
          ? "# 507, 10th A Cross, Sanjeevini Nagar, Nagarbhavi Main Road, Bengaluru- 560072" 
          : "",
        gstin: orgName.toLowerCase().includes("icon system") ? "29ANUPR9033R1ZL" : "",
        state_code: "29", // default Karnataka
        bank_name: orgName.toLowerCase().includes("icon system") ? "Janatha seva co-operative bank ltd" : "",
        bank_branch: orgName.toLowerCase().includes("icon system") ? "Moodalapalya" : "",
        bank_acc_no: orgName.toLowerCase().includes("icon system") ? "003110100000493" : "",
        bank_ifsc: orgName.toLowerCase().includes("icon system") ? "JTSC0000003" : "",
        bank_acc_type: "Current A/C",
        logo_url: "",
        signature_url: ""
      });

      // 3. Navigate home
      navigate("/");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered.");
      } else if (err.code === "auth/operation-not-allowed") {
        setError("Registration failed: The 'Email/Password' provider is disabled in your Firebase console. Please go to your Firebase Console under Authentication -> Sign-in method, click 'Email/Password', enable it, and save.");
      } else {
        setError(`Registration failed: ${err.message || 'Unknown error'} (${err.code || 'unknown-error'})`);
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
        maxWidth: "450px",
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
          <h2>Register Suite</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "8px" }}>
            Set up your organization billing dashboard
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
            marginBottom: "20px",
            alignItems: "center"
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
              ORGANIZATION NAME
            </label>
            <div style={{ position: "relative" }}>
              <User size={18} style={{ position: "absolute", left: "14px", top: "14px", color: "var(--text-secondary)" }} />
              <input
                required
                type="text"
                placeholder="e.g. XXXXXX"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                style={{ paddingLeft: "44px" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
              EMAIL ADDRESS
            </label>
            <div style={{ position: "relative" }}>
              <Mail size={18} style={{ position: "absolute", left: "14px", top: "14px", color: "var(--text-secondary)" }} />
              <input
                required
                type="email"
                placeholder="e.g. xxxxx@xxxxx.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: "44px" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
              PASSWORD
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={18} style={{ position: "absolute", left: "14px", top: "14px", color: "var(--text-secondary)" }} />
              <input
                required
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: "44px" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
              CONFIRM PASSWORD
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={18} style={{ position: "absolute", left: "14px", top: "14px", color: "var(--text-secondary)" }} />
              <input
                required
                type="password"
                placeholder="Retype password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? "Registering Suite..." : "Create Account"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "24px", fontSize: "14px" }}>
          <span style={{ color: "var(--text-secondary)" }}>Already registered? </span>
          <Link to="/login" style={{ color: "var(--accent-color)", fontWeight: "600", textDecoration: "none" }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
