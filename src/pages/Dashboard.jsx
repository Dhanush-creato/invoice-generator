import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot, deleteDoc, doc, getDoc } from "firebase/firestore";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { Plus, Eye, Trash2, Receipt, Search, FileText, ChevronRight, AlertTriangle, IndianRupee, Landmark } from "lucide-react";

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch profile
    getDoc(doc(db, "users", auth.currentUser.uid)).then((profSnap) => {
      if (profSnap.exists()) setProfile(profSnap.data());
    });

    // Live listener with metadata changes to detect offline pending writes
    const q = query(collection(db, "invoices"), where("userId", "==", auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const list = [];
      snapshot.forEach((d) => {
        list.push({
          id: d.id,
          ...d.data(),
          _pendingWrite: d.metadata.hasPendingWrites, // true when created/edited offline
        });
      });
      // Stable sort: newest date first, then highest invoice number first (tiebreaker)
      list.sort((a, b) => {
        const dateDiff = new Date(b.date || 0) - new Date(a.date || 0);
        if (dateDiff !== 0) return dateDiff;
        // Same date → sort by invoice number descending
        const numA = parseInt((a.invoice_number || "0").replace(/\D/g, ""), 10) || 0;
        const numB = parseInt((b.invoice_number || "0").replace(/\D/g, ""), 10) || 0;
        return numB - numA;
      });
      setInvoices(list);
      setLoading(false);
    }, (err) => {
      console.error("Error loading dashboard data", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteInvoice = async (id) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    try {
      await deleteDoc(doc(db, "invoices", id));
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete invoice.");
    }
  };

  // Math Metrics
  const totalSales = invoices.reduce((sum, inv) => {
    const amt = (inv.items || []).reduce((s, item) => s + (parseFloat(item.amount) || 0), 0);
    return sum + amt;
  }, 0);

  const calculateGstMetrics = () => {
    let cgstTotal = 0;
    let sgstTotal = 0;
    let totalTaxable = 0;

    invoices.forEach((inv) => {
      const taxable = (inv.items || []).reduce((s, item) => s + (parseFloat(item.amount) || 0), 0);
      totalTaxable += taxable;
      
      if (inv.is_interstate) {
        // Igst
      } else {
        cgstTotal += taxable * ((parseFloat(inv.cgst_percent) || 9) / 100);
        sgstTotal += taxable * ((parseFloat(inv.sgst_percent) || 9) / 100);
      }
    });

    return { cgstTotal, sgstTotal, totalTaxable };
  };

  const { cgstTotal, sgstTotal, totalTaxable } = calculateGstMetrics();
  const totalGst = cgstTotal + sgstTotal;
  const totalReceipts = totalTaxable + totalGst;

  // Filter invoices by search term (null-safe guards prevent crash on missing fields)
  const filteredInvoices = invoices.filter((inv) => {
    if (!searchTerm) return true; // show all when search is empty
    const term = searchTerm.toLowerCase();
    return (
      (inv.invoice_number || "").toLowerCase().includes(term) ||
      (inv.customer_name || "").toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "var(--bg-primary)" }}>
        <div style={{ color: "var(--text-secondary)", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
          <div className="animate-spin" style={{ width: "30px", height: "30px", border: "3px solid var(--accent-color)", borderTopColor: "transparent", borderRadius: "50%" }}></div>
          <span>Loading organization dashboard...</span>
        </div>
      </div>
    );
  }

  // Profile configuration validation warning
  const isProfileIncomplete = !profile || !profile.gstin || !profile.address;

  return (
    <div className="app-container">
      <Sidebar userProfile={profile} />
      <main className="main-content">
        <Header title="Dashboard Overview" />

        {/* Warning if profile is incomplete */}
        {isProfileIncomplete && (
          <div className="glass" style={{
            padding: "16px 24px",
            marginBottom: "32px",
            borderLeft: "4px solid var(--danger-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "15px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <AlertTriangle size={24} style={{ color: "var(--danger-color)", flexShrink: 0 }} />
              <div>
                <h4 style={{ fontWeight: "600" }}>Organization details are incomplete!</h4>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Please complete the organization settings (address, GSTIN, and bank account) to ensure invoices generate correctly.
                </p>
              </div>
            </div>
            <Link to="/settings" style={{
              padding: "8px 16px",
              borderRadius: "8px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "var(--danger-color)",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: "600"
            }}>
              Configure Profile
            </Link>
          </div>
        )}

        {/* Financial Metrics Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "24px",
          marginBottom: "40px"
        }}>
          {/* Card 1: Total Sales */}
          <div className="glass" style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>TOTAL TAXABLE SALES</span>
              <h2 style={{ fontSize: "28px", fontWeight: "700", marginTop: "8px", display: "flex", alignItems: "center" }}>
                <IndianRupee size={22} />
                {totalTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            <div style={{ padding: "12px", borderRadius: "10px", backgroundColor: "rgba(59, 130, 246, 0.1)", color: "var(--accent-color)" }}>
              <Landmark size={24} />
            </div>
          </div>

          {/* Card 2: GST Collected */}
          <div className="glass" style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>GST TAX COLLECTED</span>
              <h2 style={{ fontSize: "28px", fontWeight: "700", marginTop: "8px", display: "flex", alignItems: "center" }}>
                <IndianRupee size={22} />
                {totalGst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            <div style={{ padding: "12px", borderRadius: "10px", backgroundColor: "rgba(16, 185, 129, 0.1)", color: "var(--success-color)" }}>
              <Receipt size={24} />
            </div>
          </div>

          {/* Card 3: Grand Receipts */}
          <div className="glass" style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>GROSS RECEIPTS (TOTAL)</span>
              <h2 style={{ fontSize: "28px", fontWeight: "700", marginTop: "8px", display: "flex", alignItems: "center" }}>
                <IndianRupee size={22} />
                {totalReceipts.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
            <div style={{ padding: "12px", borderRadius: "10px", backgroundColor: "var(--accent-glow)", color: "var(--accent-color)" }}>
              <IndianRupee size={24} />
            </div>
          </div>

          {/* Card 4: Invoice Count */}
          <div className="glass" style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>INVOICES GENERATED</span>
              <h2 style={{ fontSize: "28px", fontWeight: "700", marginTop: "8px" }}>
                {invoices.length}
              </h2>
            </div>
            <div style={{ padding: "12px", borderRadius: "10px", backgroundColor: "rgba(255,255,255,0.05)", color: "var(--text-primary)" }}>
              <FileText size={24} />
            </div>
          </div>
        </div>

        {/* Invoice List Panel */}
        <div className="glass" style={{ padding: "32px", overflow: "hidden" }}>
          
          {/* List Toolbar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px", marginBottom: "28px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "600" }}>Invoices History</h3>
            
            <div style={{ display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap" }}>
              {/* Search Bar */}
              <div style={{ position: "relative", maxWidth: "260px" }}>
                <Search size={18} style={{ position: "absolute", left: "14px", top: "12px", color: "var(--text-secondary)" }} />
                <input
                  type="text"
                  placeholder="Search Invoice # or Client"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: "42px", paddingRight: "14px", paddingTop: "10px", paddingBottom: "10px", fontSize: "14px" }}
                />
              </div>

              {/* Create Invoice Button */}
              <Link to="/invoices/new" style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                borderRadius: "10px",
                backgroundColor: "var(--accent-color)",
                color: "#fff",
                fontWeight: "600",
                fontSize: "14px",
                textDecoration: "none",
                boxShadow: "0 4px 12px 0 rgba(59, 130, 246, 0.2)"
              }}>
                <Plus size={16} />
                Create Invoice
              </Link>
            </div>
          </div>

          {/* Invoices List Table */}
          {filteredInvoices.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-secondary)" }}>
              <FileText size={54} style={{ strokeWidth: 1, marginBottom: "16px", color: "var(--border-color)" }} />
              <h4 style={{ color: "var(--text-primary)", fontWeight: "600", marginBottom: "4px" }}>No Invoices Found</h4>
              <p style={{ fontSize: "14px" }}>
                {searchTerm ? "No invoices match your search term." : "Start by creating your first organization invoice."}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "600px" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border-color)", backgroundColor: "rgba(255,255,255,0.01)" }}>
                    <th style={{ padding: "16px 12px" }}>Invoice #</th>
                    <th style={{ padding: "16px 12px" }}>Client</th>
                    <th style={{ padding: "16px 12px" }}>Date</th>
                    <th style={{ padding: "16px 12px" }}>Template</th>
                    <th style={{ padding: "16px 12px", textAlign: "right" }}>Total Amount</th>
                    <th style={{ padding: "16px 12px", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => {
                    const taxable = (inv.items || []).reduce((s, item) => s + (parseFloat(item.amount) || 0), 0);
                    let rowTax = 0;
                    if (inv.is_interstate) {
                      rowTax = taxable * ((parseFloat(inv.igst_percent) || 0) / 100);
                    } else {
                      rowTax = taxable * (((parseFloat(inv.cgst_percent) || 9) + (parseFloat(inv.sgst_percent) || 9)) / 100);
                    }
                    const grand = taxable + rowTax;

                    return (
                      <tr key={inv.id} style={{ borderBottom: "1px solid var(--border-color)", transition: "background-color 0.2s" }} className="table-row-hover">
                        <td style={{ padding: "16px 12px", fontWeight: "600" }}>
                          #{inv.invoice_number}
                          {inv._pendingWrite && (
                            <span title="Created offline — pending sync" style={{
                              marginLeft: "8px",
                              fontSize: "10px",
                              fontWeight: "700",
                              padding: "2px 6px",
                              borderRadius: "10px",
                              backgroundColor: "rgba(251,191,36,0.15)",
                              color: "#f59e0b",
                              border: "1px solid rgba(251,191,36,0.3)",
                              verticalAlign: "middle"
                            }}>🔄 Syncing</span>
                          )}
                        </td>
                        <td style={{ padding: "16px 12px" }}>{inv.customer_name}</td>
                        <td style={{ padding: "16px 12px", color: "var(--text-secondary)" }}>
                          {new Date(inv.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td style={{ padding: "16px 12px" }}>
                          <span style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: "600",
                            backgroundColor: inv.template_type === "template2" ? "rgba(16, 185, 129, 0.1)" : "var(--accent-glow)",
                            color: inv.template_type === "template2" ? "var(--success-color)" : "var(--accent-color)"
                          }}>
                            {inv.template_type === "template2" ? "e-Invoice (Tax)" : "Icon Systems (GST)"}
                          </span>
                        </td>
                        <td style={{ padding: "16px 12px", textAlign: "right", fontWeight: "700" }}>
                          ₹{grand.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "16px 12px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                            <Link to={`/invoices/view/${inv.id}`} title="View Details" style={{
                              padding: "6px",
                              color: "var(--accent-color)",
                              borderRadius: "6px",
                              display: "flex",
                              alignItems: "center"
                            }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--accent-glow)"}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                            >
                              <Eye size={16} />
                            </Link>
                            <button onClick={() => handleDeleteInvoice(inv.id)} title="Delete Invoice" style={{
                              backgroundColor: "transparent",
                              color: "var(--danger-color)",
                              padding: "6px",
                              borderRadius: "6px",
                              display: "flex",
                              alignItems: "center"
                            }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)"}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
