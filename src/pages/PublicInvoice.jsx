import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import Template1 from "../components/Template1";
import Template2 from "../components/Template2";
import Template3 from "../components/Template3";
import html2pdf from "html2pdf.js";
import { Download, Printer, Loader, AlertCircle } from "lucide-react";
import { getRealInvoiceId } from "../utils/crypto";

export default function PublicInvoice() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const realId = getRealInvoiceId(id);
        // 1. Fetch invoice document (security rules permit individual document gets)
        const invSnap = await getDoc(doc(db, "invoices", realId));
        if (invSnap.exists()) {
          const invData = invSnap.data();
          setInvoice({ id: invSnap.id, ...invData });

          // 2. Fetch user profile (to render org name/logo/bank details)
          const profSnap = await getDoc(doc(db, "users", invData.userId));
          if (profSnap.exists()) {
            setProfile(profSnap.data());
          }
        } else {
          setError("Invoice not found or deleted.");
        }
      } catch (err) {
        console.error(err);
        setError("Error loading invoice. Please check the link.");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
  }, [id]);

  // Auto-download as soon as data is fetched
  useEffect(() => {
    if (!loading && invoice && profile && !downloadStarted) {
      setDownloadStarted(true);
      setDownloading(true);
      setTimeout(() => {
        handleDownloadPdf();
      }, 1000);
    }
  }, [loading, invoice, profile, downloadStarted]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const element = document.querySelector(".invoice-preview-container");
    if (!element) {
      setDownloading(false);
      return;
    }

    const opt = {
      margin:       0,
      filename:     `Invoice_${invoice.invoice_number}_${invoice.customer_name.replace(/\s+/g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2.5, useCORS: true, letterRendering: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    setDownloading(true);
    html2pdf().from(element).set(opt).save()
      .then(() => {
        setDownloading(false);
      })
      .catch((err) => {
        console.error("PDF generation failed:", err);
        setDownloading(false);
      });
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f7fb",
        color: "#1e293b",
        gap: "12px"
      }}>
        <div style={{ width: "24px", height: "24px", border: "3px solid #2563eb", borderTopColor: "transparent", borderRadius: "50%" }} className="animate-spin"></div>
        <span style={{ fontSize: "14px", fontWeight: "600" }}>Fetching public invoice details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f7fb",
        color: "#ef4444",
        padding: "20px"
      }}>
        <AlertCircle size={44} style={{ marginBottom: "16px" }} />
        <h3 style={{ fontWeight: "700", marginBottom: "4px" }}>Access Denied</h3>
        <p style={{ color: "#64748b", fontSize: "14px" }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#f0f2f5", minHeight: "100vh", paddingBottom: "60px", display: "flex", flexDirection: "column" }}>
      {downloading && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(6px)",
          zIndex: 10000,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          gap: "16px"
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            border: "4px solid rgba(59, 130, 246, 0.2)",
            borderTopColor: "#3b82f6",
            borderRadius: "50%"
          }} className="animate-spin"></div>
          <div style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "4px" }}>Generating Invoice PDF</h3>
            <p style={{ fontSize: "13px", color: "#94a3b8" }}>Please wait, your download will start automatically...</p>
          </div>
        </div>
      )}

      {/* Render off-screen template for html2pdf.js generation */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        {invoice.template_type === "template1" ? (
          <Template1 invoiceData={invoice} orgData={profile} />
        ) : invoice.template_type === "template3" ? (
          <Template3 invoiceData={invoice} orgData={profile} />
        ) : (
          <Template2 invoiceData={invoice} orgData={profile} />
        )}
      </div>

      {!showFullPreview ? (
        /* Dedicated Downloader Success View */
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
          textAlign: "center"
        }}>
          <div className="glass" style={{
            maxWidth: "480px",
            width: "100%",
            padding: "40px 30px",
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              color: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              marginBottom: "24px"
            }}>
              ✓
            </div>
            
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#1e293b", marginBottom: "8px" }}>
              Invoice Downloaded!
            </h2>
            
            <p style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.5", marginBottom: "28px" }}>
              PDF for Invoice <strong>#{invoice.invoice_number}</strong> from <strong>{profile?.name || "the seller"}</strong> has been saved directly to your device.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
              <button
                onClick={handleDownloadPdf}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  backgroundColor: "#2563eb",
                  color: "#fff",
                  fontWeight: "600",
                  fontSize: "14px",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(37,99,235,0.2)",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#1d4ed8"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
              >
                📥 Re-download PDF
              </button>
              
              <button
                onClick={() => setShowFullPreview(true)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  backgroundColor: "transparent",
                  color: "#475569",
                  fontWeight: "600",
                  fontSize: "14px",
                  border: "1px solid #cbd5e1",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8fafc";
                  e.currentTarget.style.color = "#0f172a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#475569";
                }}
              >
                👁️ View Invoice on Screen
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Full Shared Preview View */
        <>
          {/* Floating Action Top Bar */}
          <div className="no-print" style={{
            backgroundColor: "#fff",
            borderBottom: "1px solid #e2e8f0",
            padding: "12px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 50,
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={() => setShowFullPreview(false)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#fff",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  color: "#475569"
                }}
              >
                ← Back
              </button>
              <div>
                <span style={{ fontWeight: "700", fontSize: "14px", color: "#1e293b", display: "block" }}>{profile?.name}</span>
                <span style={{ fontSize: "11px", color: "#64748b" }}>Invoice #{invoice.invoice_number}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleDownloadPdf}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#2563eb",
                  color: "#fff",
                  fontWeight: "600",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(37,99,235,0.2)"
                }}
              >
                <Download size={15} />
                Download PDF
              </button>
            </div>
          </div>

          {/* Renders Invoice Layout Sheet */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: "32px", padding: "0 10px" }}>
            <div style={{ maxWidth: "800px", width: "100%", overflowX: "auto", borderRadius: "8px", boxShadow: "0 10px 20px rgba(0,0,0,0.06)", backgroundColor: "#fff" }}>
              <div style={{ minWidth: "760px" }}>
                {invoice.template_type === "template1" ? (
                  <Template1 invoiceData={invoice} orgData={profile} />
                ) : invoice.template_type === "template3" ? (
                  <Template3 invoiceData={invoice} orgData={profile} />
                ) : (
                  <Template2 invoiceData={invoice} orgData={profile} />
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
