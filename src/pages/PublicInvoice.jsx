import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import Template1 from "../components/Template1";
import Template2 from "../components/Template2";
import Template3 from "../components/Template3";
import QuotationTemplate from "../components/QuotationTemplate";
import { downloadPdf, generatePdfBlob } from "../utils/pdfUtils";
import { Download, Printer, Loader, AlertCircle, CloudUpload } from "lucide-react";
import { getRealInvoiceId } from "../utils/crypto";
import { initDriveAuth, uploadPdfToDrive } from "../utils/driveUpload";

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
  const [uploadingDrive, setUploadingDrive] = useState(false);

  useEffect(() => {
    initDriveAuth();
  }, []);

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

  const handleDownloadPdf = async () => {
    const element = document.querySelector(".invoice-preview-container");
    if (!element || !invoice) return;
    setDownloading(true);
    try {
      const isQuotation = invoice.template_type === "quotation";
      const custName = (invoice.customer_name || "").replace(/\s+/g, '_');
      const filename = `${isQuotation ? "Quotation" : "Invoice"}_${invoice.invoice_number}${custName ? `_${custName}` : ""}.pdf`;
      await downloadPdf(element, filename);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleUploadToDrive = async () => {
    const element = document.querySelector(".invoice-preview-container");
    if (!element || !invoice) return;
    setUploadingDrive(true);
    try {
      const isQuotation = invoice.template_type === "quotation";
      const fileName = `${isQuotation ? "Quotation" : "Invoice"}_${invoice.invoice_number}_${(invoice.customer_name || "").replace(/\s+/g, '_')}.pdf`;
      const pdfBlob = await generatePdfBlob(element, fileName);

      const result = await uploadPdfToDrive(pdfBlob, fileName, isQuotation);
      alert(`Uploaded to Google Drive in folder 'ICON ${isQuotation ? "Quotations" : "Invoices"}'!\nView file: ${result.webViewLink}`);
      if (result && result.webViewLink) {
        window.open(result.webViewLink, "_blank");
      }
    } catch (err) {
      console.error("Google Drive upload failed:", err);
      alert(`Google Drive upload failed: ${err.message || "Authorization canceled"}`);
    } finally {
      setUploadingDrive(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-primary)",
        gap: "12px"
      }}>
        <Loader className="animate-spin" size={32} />
        <span>Loading invoice...</span>
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
        ) : invoice.template_type === "quotation" ? (
          <QuotationTemplate invoiceData={invoice} orgData={profile} />
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
              {invoice.template_type === "quotation" ? "Quotation" : "Invoice"} Downloaded!
            </h2>
            
            <p style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.5", marginBottom: "28px" }}>
              PDF for {invoice.template_type === "quotation" ? "Quotation" : "Invoice"} <strong>#{invoice.invoice_number}</strong> from <strong>{profile?.name || "the seller"}</strong> has been saved directly to your device.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
              <button
                type="button"
                onClick={handleUploadToDrive}
                disabled={uploadingDrive}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.4)",
                  color: "#10b981",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  opacity: uploadingDrive ? 0.7 : 1
                }}
              >
                {uploadingDrive ? <Loader className="animate-spin" size={16} /> : <CloudUpload size={16} />}
                {uploadingDrive ? "Uploading to Drive..." : "☁️ Save to Google Drive"}
              </button>

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
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  {invoice.template_type === "quotation" ? "Quotation" : "Invoice"} #{invoice.invoice_number}
                </span>
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
                {invoice.template_type === "quotation" ? "Download Quotation" : "Download PDF"}
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
                ) : invoice.template_type === "quotation" ? (
                  <QuotationTemplate invoiceData={invoice} orgData={profile} />
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
