import React, { useState, useEffect } from "react";
import { db, storage, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { Save, Building2, Landmark, ShieldCheck, Upload, Loader, AlertCircle, LayoutDashboard, PlusCircle } from "lucide-react";

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [sigFile, setSigFile] = useState(null);
  const [phonepeFile, setPhonepeFile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if initial load on mobile and path is settings
    const isMobile = window.innerWidth <= 992;
    const isInitialLoad = !sessionStorage.getItem("app_initialized");
    
    // Set initialization flag immediately
    sessionStorage.setItem("app_initialized", "true");

    if (isMobile && isInitialLoad) {
      console.log("Redirecting initial mobile load from settings to dashboard");
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("Loaded profile settings from Firestore:", data);
          setProfile(data);
        } else {
          console.log("No profile settings found in Firestore, using defaults.");
          // Initialize empty profile for new users
          setProfile({ name: "Add Organization", gstin: "" });
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // Convert image file to base64 string for storage in Firestore
  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
  });

  // Compress image to fit within Firestore document size limit (1MB total)
  const compressImage = (file, maxWidth = 350, maxHeight = 350) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // Return quality at 0.75 for super small file size (~20KB) but clear details
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleUpload = async (file, pathName) => {
    if (!file || !auth.currentUser) return "";
    
    // Auto-compress image to fit inside Firestore base64 payload cleanly
    try {
      console.log(`Compressing ${pathName}... Original size:`, file.size);
      const compressedBase64 = await compressImage(file);
      console.log(`Compressed ${pathName} successfully.`);
      return compressedBase64;
    } catch (e) {
      console.warn("Compression failed, using fallback base64 conversion:", e);
      return await fileToBase64(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    if (!auth.currentUser) {
      setMessage("error:Not logged in. Please refresh the page and try again.");
      setSaving(false);
      return;
    }

    try {
      console.log("Saving Settings. Profile state:", profile);
      let logoUrl = profile?.logo_url || "";
      let sigUrl = profile?.signature_url || "";
      let phonepeUrl = profile?.phonepe_url || "";

      if (logoFile) {
        logoUrl = await handleUpload(logoFile, "logo");
      }
      if (sigFile) {
        sigUrl = await handleUpload(sigFile, "signature");
      }
      if (phonepeFile) {
        phonepeUrl = await handleUpload(phonepeFile, "phonepe");
      }

      const updatedProfile = {
        ...profile,
        logo_url: logoUrl,
        signature_url: sigUrl,
        phonepe_url: phonepeUrl,
        updatedAt: new Date().toISOString()
      };

      console.log("Writing to Firestore users document:", auth.currentUser.uid, updatedProfile);
      await setDoc(doc(db, "users", auth.currentUser.uid), updatedProfile);
      setProfile(updatedProfile);
      setMessage("Settings saved successfully!");
      setLogoFile(null);
      setSigFile(null);
      setPhonepeFile(null);
    } catch (err) {
      console.error("Settings save error:", err);
      setMessage(`error:${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Loader className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar userProfile={profile} />
      <main className="main-content">
        <Header title="Org Profile Settings" />

        {/* Quick Navigation Shortcuts */}
        <div style={{
          display: "flex",
          gap: "12px",
          marginBottom: "24px",
          flexWrap: "wrap"
        }}>
          <Link to="/" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            color: "var(--text-primary)",
            padding: "8px 16px",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "13px",
            fontWeight: "600"
          }}>
            <LayoutDashboard size={16} />
            Go to Dashboard
          </Link>
          <Link to="/invoices/new" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "var(--accent-color)",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "13px",
            fontWeight: "600",
            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.2)"
          }}>
            <PlusCircle size={16} />
            Create Invoice
          </Link>
        </div>

        {message && (
          <div className="glass" style={{
            padding: "16px 20px",
            marginBottom: "24px",
            borderLeft: `4px solid ${message.startsWith("error:") ? "var(--danger-color)" : "var(--success-color)"}`,
            color: "var(--text-primary)",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            {message.startsWith("error:") 
              ? <AlertCircle size={20} style={{ color: "var(--danger-color)", flexShrink: 0 }} />
              : <ShieldCheck size={20} style={{ color: "var(--success-color)", flexShrink: 0 }} />
            }
            <span>{message.replace(/^error:/, "")}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Organization Details Panel */}
          <div className="glass" style={{ padding: "32px" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", fontSize: "18px", fontWeight: "600" }}>
              <Building2 size={20} style={{ color: "var(--accent-color)" }} />
              Organization Details
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>ORGANIZATION NAME</label>
                <input required type="text" name="name" value={profile?.name || ""} onChange={handleChange} placeholder="e.g. XXXXXX" />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>TAGLINE / DESCRIPTION</label>
                <input type="text" name="tagline" value={profile?.tagline || ""} onChange={handleChange} placeholder="Business tagline" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>PHONE NUMBER(S)</label>
                <input type="text" name="phone" value={profile?.phone || ""} onChange={handleChange} placeholder="e.g. XXXXXXXXXX" />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>WEBSITE</label>
                <input type="text" name="website" value={profile?.website || ""} onChange={handleChange} placeholder="e.g. www.xxxxxx.com" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>GSTIN (SELLER GST)</label>
                <input type="text" name="gstin" value={profile?.gstin || ""} onChange={handleChange} placeholder="e.g. XXXXXXXXXXXXXXX" style={{ textTransform: "uppercase" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>STATE CODE</label>
                <input type="text" name="state_code" value={profile?.state_code || ""} onChange={handleChange} placeholder="e.g. 29" />
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>OFFICE ADDRESS</label>
              <textarea name="address" rows={3} value={profile?.address || ""} onChange={handleChange} placeholder="Enter full address" />
            </div>

            {/* Logo and Signature Image Uploader */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>COMPANY LOGO / BANNER</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                    {profile?.logo_url ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        <img src={profile.logo_url} alt="Logo" style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "contain", border: "1px solid var(--border-color)" }} />
                        <button
                          type="button"
                          onClick={() => {
                            setProfile(prev => ({ ...prev, logo_url: "" }));
                            setLogoFile(null);
                          }}
                          style={{ padding: "2px 6px", fontSize: "10px", color: "var(--danger-color)", backgroundColor: "transparent", border: "none", cursor: "pointer", fontWeight: "600" }}
                        >
                          Remove
                        </button>
                      </div>
                    ) : null}
                    <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} style={{ display: "none" }} id="logo-input" />
                    <label htmlFor="logo-input" style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px dashed var(--accent-color)",
                      color: "var(--accent-color)",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "600"
                    }}>
                      <Upload size={16} />
                      {logoFile ? logoFile.name : "Upload Logo/Banner"}
                    </label>
                  </div>
                  {profile?.logo_url && (
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer", marginTop: "4px" }}>
                      <input
                        type="checkbox"
                        checked={profile?.use_logo_as_header || false}
                        onChange={(e) => setProfile(prev => ({ ...prev, use_logo_as_header: e.target.checked }))}
                        style={{ width: "auto", margin: 0, height: "auto" }}
                      />
                      <span style={{ color: "var(--text-primary)" }}>Use uploaded Logo as a full-width header banner (hides company text name)</span>
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>SIGNATURE STAMP</label>
                <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                  {profile?.signature_url ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                      <img src={profile.signature_url} alt="Signature" style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "contain", border: "1px solid var(--border-color)" }} />
                      <button
                        type="button"
                        onClick={() => {
                          setProfile(prev => ({ ...prev, signature_url: "" }));
                          setSigFile(null);
                        }}
                        style={{ padding: "2px 6px", fontSize: "10px", color: "var(--danger-color)", backgroundColor: "transparent", border: "none", cursor: "pointer", fontWeight: "600" }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                  <input type="file" accept="image/*" onChange={(e) => setSigFile(e.target.files[0])} style={{ display: "none" }} id="sig-input" />
                  <label htmlFor="sig-input" style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px dashed var(--accent-color)",
                    color: "var(--accent-color)",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "600"
                  }}>
                    <Upload size={16} />
                    {sigFile ? sigFile.name : "Upload Signature"}
                  </label>
                </div>
              </div>

              {/* PhonePe QR Code Uploader */}
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>PHONEPE QR CODE SCANNER</label>
                <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                  {profile?.phonepe_url ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                      <img src={profile.phonepe_url} alt="PhonePe QR" style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "contain", border: "1px solid var(--border-color)" }} />
                      <button
                        type="button"
                        onClick={() => {
                          setProfile(prev => ({ ...prev, phonepe_url: "" }));
                          setPhonepeFile(null);
                        }}
                        style={{ padding: "2px 6px", fontSize: "10px", color: "var(--danger-color)", backgroundColor: "transparent", border: "none", cursor: "pointer", fontWeight: "600" }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                  <input type="file" accept="image/*" onChange={(e) => setPhonepeFile(e.target.files[0])} style={{ display: "none" }} id="phonepe-input" />
                  <label htmlFor="phonepe-input" style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px dashed var(--accent-color)",
                    color: "var(--accent-color)",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "600"
                  }}>
                    <Upload size={16} />
                    {phonepeFile ? phonepeFile.name : "Upload PhonePe QR"}
                  </label>
                </div>
              </div>
            </div>

          </div>

          {/* Bank Credentials Panel */}
          <div className="glass" style={{ padding: "32px" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", fontSize: "18px", fontWeight: "600" }}>
              <Landmark size={20} style={{ color: "var(--accent-color)" }} />
              Bank Account Details
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>BANK NAME</label>
                <input type="text" name="bank_name" value={profile?.bank_name || ""} onChange={handleChange} placeholder="e.g. Kotak Mahindra Bank" />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>BRANCH LOCATION</label>
                <input type="text" name="bank_branch" value={profile?.bank_branch || ""} onChange={handleChange} placeholder="Branch name" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>ACCOUNT NUMBER</label>
                <input type="text" name="bank_acc_no" value={profile?.bank_acc_no || ""} onChange={handleChange} placeholder="Account Number" />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>IFSC CODE</label>
                <input type="text" name="bank_ifsc" value={profile?.bank_ifsc || ""} onChange={handleChange} placeholder="IFSC Code" style={{ textTransform: "uppercase" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>ACCOUNT TYPE</label>
                <select name="bank_acc_type" value={profile?.bank_acc_type || "Current A/C"} onChange={handleChange}>
                  <option value="Current A/C">Current A/C</option>
                  <option value="Savings A/C">Savings A/C</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "14px 28px",
                borderRadius: "10px",
                backgroundColor: "var(--accent-color)",
                color: "#fff",
                fontWeight: "600",
                fontSize: "15px",
                boxShadow: "0 4px 14px 0 rgba(59, 130, 246, 0.3)",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
              {saving ? "Saving Profile..." : "Save Settings"}
            </button>
          </div>

        </form>
      </main>
    </div>
  );
}
