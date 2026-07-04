import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { db, auth } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import Template1 from "../components/Template1";
import Template2 from "../components/Template2";
import Template3 from "../components/Template3";
import html2pdf from "html2pdf.js";
import { ArrowLeft, Edit, Printer, Download, Share2, Copy, Check, Loader, AlertCircle } from "lucide-react";

export default function InvoiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchInvoiceAndProfile = async () => {
      if (!auth.currentUser) return;
      try {
        // Fetch Org profile
        const profSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (profSnap.exists()) {
          setProfile(profSnap.data());
        }

        // Fetch invoice
        const invSnap = await getDoc(doc(db, "invoices", id));
        if (invSnap.exists()) {
          const data = invSnap.data();
          // Verify owner
          if (data.userId !== auth.currentUser.uid) {
            setError("Unauthorized access to this invoice.");
          } else {
            setInvoice({ id: invSnap.id, ...data });
          }
        } else {
          setError("Invoice not found.");
        }
      } catch (err) {
        console.error(err);
        setError("Error loading invoice.");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoiceAndProfile();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const element = document.querySelector(".invoice-preview-container");
    if (!element) return;

    const opt = {
      margin:       0,
      filename:     `Invoice_${invoice.invoice_number}_${invoice.customer_name.replace(/\s+/g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2.5, useCORS: true, letterRendering: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).save();
  };

  const shareUrl = `${window.location.origin}/public/invoice/${id}`;

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Loader className="animate-spin" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <Sidebar userProfile={profile} />
        <main className="main-content">
          <Header title="Invoice Viewer" />
          <div className="glass" style={{ padding: "32px", textAlign: "center", color: "var(--danger-color)" }}>
            <AlertCircle size={48} style={{ strokeWidth: 1.5, marginBottom: "16px" }} />
            <h3>{error}</h3>
            <Link to="/" style={{ color: "var(--accent-color)", display: "block", marginTop: "16px", textDecoration: "none", fontWeight: "600" }}>
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar userProfile={profile} />
      <main className="main-content" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* Detail Toolbar */}
        <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={() => navigate("/")} style={{ padding: "8px", borderRadius: "8px", backgroundColor: "var(--card-bg)", color: "var(--text-primary)" }}>
              <ArrowLeft size={18} />
            </button>
            <h1 style={{ fontSize: "24px", fontWeight: "700" }}>Invoice #{invoice.invoice_number}</h1>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            
            {/* Copy shareable link */}
            <button onClick={copyShareUrl} style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "8px",
              backgroundColor: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              color: "var(--text-primary)",
              fontSize: "14px",
              fontWeight: "600"
            }}>
              {copied ? <Check size={16} style={{ color: "var(--success-color)" }} /> : <Share2 size={16} />}
              {copied ? "Link Copied!" : "Copy Share Link"}
            </button>

            {/* Edit Invoice link */}
            <Link to={`/invoices/edit/${invoice.id}`} style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "8px",
              backgroundColor: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              color: "var(--text-primary)",
              fontSize: "14px",
              fontWeight: "600",
              textDecoration: "none"
            }}>
              <Edit size={16} />
              Edit
            </Link>

            {/* Download PDF button */}
            <button onClick={handleDownloadPdf} style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "8px",
              backgroundColor: "var(--accent-color)",
              color: "#fff",
              fontSize: "14px",
              fontWeight: "600",
              boxShadow: "0 4px 10px 0 rgba(59, 130, 246, 0.2)"
            }}>
              <Download size={16} />
              Download PDF
            </button>
          </div>
        </div>

        {/* Share info box */}
        <div className="glass no-print" style={{ padding: "20px", fontSize: "14px" }}>
          <span style={{ fontWeight: "600", display: "block", marginBottom: "8px", color: "var(--text-secondary)" }}>PUBLIC SCAN / SHARE URL</span>
          <div style={{ display: "flex", gap: "10px" }}>
            <input type="text" readOnly value={shareUrl} style={{ flexGrow: 1, padding: "8px 12px", fontSize: "13px", fontFamily: "monospace" }} />
            <button onClick={copyShareUrl} style={{ padding: "8px 16px", backgroundColor: "var(--accent-color)", color: "#fff", borderRadius: "8px", fontWeight: "600" }}>
              <Copy size={16} />
            </button>
          </div>
          <small style={{ display: "block", color: "var(--text-secondary)", marginTop: "8px" }}>
            Anyone who has this link or scans the QR code on the invoice can view and download the PDF.
          </small>
        </div>

        {/* Invoice print wrap */}
        <div style={{
          backgroundColor: "#525659",
          padding: "40px 10px",
          display: "flex",
          justifyContent: "center",
          borderRadius: "16px",
          boxShadow: "var(--shadow-main)",
        }}>
          <div style={{ maxWidth: "800px", width: "100%", overflowX: "auto", borderRadius: "8px", boxShadow: "0 12px 24px rgba(0,0,0,0.4)" }}>
            <div style={{ minWidth: "760px" }}>
              {(() => {
                // Merge per-invoice phone and website toggle into orgData
                const orgDataWithPhone = profile ? {
                  ...profile,
                  phone: invoice.invoice_phone || profile.phone || "",
                  show_website: invoice.show_website !== false
                } : null;
                return invoice.template_type === "template1" ? (
                  <Template1 invoiceData={invoice} orgData={orgDataWithPhone} />
                ) : invoice.template_type === "template3" ? (
                  <Template3 invoiceData={invoice} orgData={orgDataWithPhone} />
                ) : (
                  <Template2 invoiceData={invoice} orgData={orgDataWithPhone} />
                );
              })()}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
