import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  FileText,
  IndianRupee,
  Layers,
  ChevronRight,
  Eye,
  Info,
  Check,
  Filter
} from "lucide-react";
import {
  FY_MONTHS,
  getFinancialYear,
  getSelectableFinancialYears,
  getDateRangeForMonth,
  aggregateGstReport,
  formatINR,
  round2
} from "../utils/gstCalculations";
import { exportGstExcelReport, groupByHsnAndRate } from "../utils/gstExcelGenerator";
import { exportGstPdfReport } from "../utils/gstPdfGenerator";

export default function GstReport() {
  const [profile, setProfile] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState("template"); // "template", "b2b", "b2c", "hsn"

  // Reporting Period State (Defaults to current FY & current month)
  const currentFY = useMemo(() => getFinancialYear(new Date().toISOString()), []);
  const currentMonthIdx = useMemo(() => new Date().getMonth() + 1, []);
  const initialRange = useMemo(() => getDateRangeForMonth(currentFY, currentMonthIdx), [currentFY, currentMonthIdx]);

  const [selectedFY, setSelectedFY] = useState(currentFY);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthIdx);
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);

  const availableFYs = useMemo(() => getSelectableFinancialYears(2026), []);

  // Quick Month selector handler (sets From Date to 1st and To Date to last day)
  const handleSelectMonth = (mIndex) => {
    setSelectedMonth(mIndex);
    const range = getDateRangeForMonth(selectedFY, mIndex);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
  };

  // Financial Year change handler
  const handleSelectFY = (newFY) => {
    setSelectedFY(newFY);
    const range = getDateRangeForMonth(newFY, selectedMonth);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
  };

  // Quick Range Presets
  const handlePreset = (type) => {
    const [startYearStr] = (selectedFY || "2026-27").split("-");
    const startYear = parseInt(startYearStr, 10) || 2026;
    const endYear = startYear + 1;

    switch (type) {
      case "full_fy":
        setFromDate(`${startYear}-04-01`);
        setToDate(`${endYear}-03-31`);
        setSelectedMonth(null);
        break;
      case "q1":
        setFromDate(`${startYear}-04-01`);
        setToDate(`${startYear}-06-30`);
        setSelectedMonth(null);
        break;
      case "q2":
        setFromDate(`${startYear}-07-01`);
        setToDate(`${startYear}-09-30`);
        setSelectedMonth(null);
        break;
      case "q3":
        setFromDate(`${startYear}-10-01`);
        setToDate(`${startYear}-12-31`);
        setSelectedMonth(null);
        break;
      case "q4":
        setFromDate(`${endYear}-01-01`);
        setToDate(`${endYear}-03-31`);
        setSelectedMonth(null);
        break;
      case "last_30": {
        const today = new Date();
        const past = new Date();
        past.setDate(today.getDate() - 30);
        setFromDate(past.toISOString().split("T")[0]);
        setToDate(today.toISOString().split("T")[0]);
        setSelectedMonth(null);
        break;
      }
      default:
        break;
    }
  };

  // Load User Profile and Live Invoices
  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch org profile
    getDoc(doc(db, "users", auth.currentUser.uid)).then((snap) => {
      if (snap.exists()) setProfile(snap.data());
    });

    // Live invoices listener
    const q = query(collection(db, "invoices"), where("userId", "==", auth.currentUser.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() });
        });
        setInvoices(list);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load invoices for GST report:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Compute aggregated report data based on exact fromDate & toDate
  const reportData = useMemo(() => {
    return aggregateGstReport(invoices, profile, {
      fromDate,
      toDate,
      financialYear: selectedFY,
      monthIndex: selectedMonth
    });
  }, [invoices, profile, fromDate, toDate, selectedFY, selectedMonth]);

  // Group items by (HSN + Rate) for on-screen Interactive Spreadsheet preview
  const b2bItemsGrouped = useMemo(() => {
    const raw = reportData.b2bInvoices.flatMap((inv) => inv.calculatedItems || []);
    return groupByHsnAndRate(raw);
  }, [reportData.b2bInvoices]);

  const b2cItemsGrouped = useMemo(() => {
    const raw = reportData.b2cInvoices.flatMap((inv) => inv.calculatedItems || []);
    return groupByHsnAndRate(raw);
  }, [reportData.b2cInvoices]);

  // Handle Excel Download
  const handleDownloadExcel = async () => {
    try {
      setExportingExcel(true);
      await exportGstExcelReport(reportData, profile);
    } catch (err) {
      console.error("Excel generation error:", err);
      alert("Failed to generate Excel report: " + err.message);
    } finally {
      setExportingExcel(false);
    }
  };

  // Handle PDF Download
  const handleDownloadPdf = async () => {
    try {
      setExportingPdf(true);
      const safePeriod = reportData.periodLabel.replace(/\s+/g, "_");
      await exportGstPdfReport("printable-gst-pdf-target", `GST_Report_${safePeriod}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF summary: " + err.message);
    } finally {
      setExportingPdf(false);
    }
  };

  const businessName = profile?.name || "Icon Systems";
  const businessGstin = profile?.gstin || "29AABCI1234F1Z5";
  const businessState = profile?.state_code ? `${profile.state_code} (Karnataka)` : "29 (Karnataka)";

  return (
    <div className="app-container">
      <Sidebar userProfile={profile} />

      <main className="main-content">
        <style>{`
          /* Pure Crisp White Calendar Picker Indicator for Date Inputs */
          .gst-date-input {
            color-scheme: dark !important;
          }
          .gst-date-input::-webkit-calendar-picker-indicator {
            cursor: pointer !important;
            filter: invert(1) brightness(1.8) !important;
            -webkit-filter: invert(1) brightness(1.8) !important;
            opacity: 1 !important;
            width: 20px !important;
            height: 20px !important;
            padding: 2px !important;
            border-radius: 4px !important;
            transition: all 0.2s ease !important;
          }
          .gst-date-input::-webkit-calendar-picker-indicator:hover {
            background-color: rgba(255, 255, 255, 0.25) !important;
            transform: scale(1.1) !important;
          }
        `}</style>
        <Header title="Monthly GST Report" />

        {/* ─── Top Control Bar: Fiscal Period, Month, Business Details & Actions ─── */}
        <div className="glass" style={{ padding: "24px", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px" }}>
            
            {/* Left: Organization & Period Details */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(59, 130, 246, 0.15)",
                  color: "var(--accent-color)",
                  fontSize: "12px",
                  fontWeight: "700",
                  letterSpacing: "0.5px"
                }}>
                  GST RETURN FILING SUPPORT
                </span>
              </div>

              <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "6px" }}>
                Monthly GST Outward Report — {reportData.periodLabel}
              </h2>

              <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "var(--text-secondary)", fontSize: "13px", flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Building2 size={16} style={{ color: "var(--accent-color)" }} />
                  <strong>Business:</strong> {businessName}
                </span>
                <span>•</span>
                <span><strong>GSTIN:</strong> <code style={{ color: "var(--text-primary)", fontWeight: "600" }}>{businessGstin}</code></span>
                <span>•</span>
                <span><strong>State:</strong> {businessState}</span>
              </div>
            </div>

            {/* Right: Export & Utility Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={handleDownloadExcel}
                disabled={exportingExcel}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  fontWeight: "600",
                  fontSize: "13px",
                  boxShadow: "0 4px 12px rgba(22, 163, 74, 0.25)"
                }}
              >
                <FileSpreadsheet size={16} />
                {exportingExcel ? "Generating Excel..." : "Download Excel"}
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={exportingPdf}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  backgroundColor: "var(--accent-color)",
                  color: "#ffffff",
                  fontWeight: "600",
                  fontSize: "13px",
                  boxShadow: "0 4px 12px var(--accent-glow)"
                }}
              >
                <Download size={16} />
                {exportingPdf ? "Generating PDF..." : "Download PDF"}
              </button>
            </div>
          </div>

          {/* ─── Period Selectors: Date Range, Financial Year & Months Bar ─── */}
          <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "18px" }}>
            
            {/* Row 1: From Date & To Date Pickers + Financial Year */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", flexWrap: "wrap", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "14px", flexWrap: "wrap", flex: "1 1 500px" }}>
                
                {/* Financial Year Dropdown */}
                <div style={{ display: "flex", flexDirection: "column", gap: "5px", minWidth: "140px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", letterSpacing: "0.5px" }}>FINANCIAL YEAR</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "var(--input-bg)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "0 10px" }}>
                    <Calendar size={15} style={{ color: "var(--accent-color)" }} />
                    <select
                      value={selectedFY}
                      onChange={(e) => handleSelectFY(e.target.value)}
                      style={{
                        padding: "8px 0",
                        fontSize: "13px",
                        fontWeight: "600",
                        border: "none",
                        backgroundColor: "transparent",
                        color: "var(--text-primary)",
                        cursor: "pointer"
                      }}
                    >
                      {availableFYs.map((fy) => (
                        <option key={fy} value={fy} style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}>FY {fy}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* From Date Picker Container with Highly Visible Calendar Icon */}
                <div style={{ display: "flex", flexDirection: "column", gap: "5px", flex: "1 1 180px", minWidth: "160px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--accent-color)", letterSpacing: "0.5px" }}>FROM DATE</label>
                  <div
                    onClick={(e) => {
                      const input = e.currentTarget.querySelector("input");
                      if (input && typeof input.showPicker === "function") {
                        try { input.showPicker(); } catch (_) { input.focus(); }
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      backgroundColor: "var(--input-bg)",
                      border: "1.5px solid var(--accent-color)",
                      borderRadius: "8px",
                      padding: "4px 10px",
                      boxShadow: "0 0 0 1px var(--accent-glow)",
                      cursor: "pointer"
                    }}
                  >
                    <Calendar size={17} style={{ color: "var(--accent-color)", flexShrink: 0 }} />
                    <input
                      type="date"
                      className="gst-date-input"
                      value={fromDate}
                      onChange={(e) => {
                        setFromDate(e.target.value);
                        setSelectedMonth(null);
                      }}
                      style={{
                        padding: "4px 0",
                        fontSize: "14px",
                        fontWeight: "600",
                        border: "none",
                        backgroundColor: "transparent",
                        color: "var(--text-primary)",
                        width: "100%",
                        cursor: "pointer"
                      }}
                    />
                  </div>
                </div>

                {/* To Date Picker Container with Highly Visible Calendar Icon */}
                <div style={{ display: "flex", flexDirection: "column", gap: "5px", flex: "1 1 180px", minWidth: "160px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--accent-color)", letterSpacing: "0.5px" }}>TO DATE</label>
                  <div
                    onClick={(e) => {
                      const input = e.currentTarget.querySelector("input");
                      if (input && typeof input.showPicker === "function") {
                        try { input.showPicker(); } catch (_) { input.focus(); }
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      backgroundColor: "var(--input-bg)",
                      border: "1.5px solid var(--accent-color)",
                      borderRadius: "8px",
                      padding: "4px 10px",
                      boxShadow: "0 0 0 1px var(--accent-glow)",
                      cursor: "pointer"
                    }}
                  >
                    <Calendar size={17} style={{ color: "var(--accent-color)", flexShrink: 0 }} />
                    <input
                      type="date"
                      className="gst-date-input"
                      value={toDate}
                      onChange={(e) => {
                        setToDate(e.target.value);
                        setSelectedMonth(null);
                      }}
                      style={{
                        padding: "4px 0",
                        fontSize: "14px",
                        fontWeight: "600",
                        border: "none",
                        backgroundColor: "transparent",
                        color: "var(--text-primary)",
                        width: "100%",
                        cursor: "pointer"
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Active Filter Details Badge */}
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "8px",
                backgroundColor: "rgba(59, 130, 246, 0.12)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                fontSize: "13px",
                color: "var(--text-primary)",
                marginTop: "4px"
              }}>
                <Filter size={15} style={{ color: "var(--accent-color)" }} />
                <span>
                  Filtering: <strong style={{ color: "var(--accent-color)" }}>{reportData.periodLabel}</strong> ({reportData.invoicesCount} {reportData.invoicesCount === 1 ? "invoice" : "invoices"})
                </span>
              </div>
            </div>

            {/* Row 2: Quick Presets (Full Year, Q1, Q2, Q3, Q4, Last 30 Days) */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginRight: "4px" }}>
                Quick Presets:
              </span>
              <button
                type="button"
                onClick={() => handlePreset("full_fy")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  backgroundColor: "var(--input-bg)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer"
                }}
              >
                Full FY (12 Months)
              </button>
              <button
                type="button"
                onClick={() => handlePreset("q1")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  backgroundColor: "var(--input-bg)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer"
                }}
              >
                Q1 (Apr - Jun)
              </button>
              <button
                type="button"
                onClick={() => handlePreset("q2")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  backgroundColor: "var(--input-bg)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer"
                }}
              >
                Q2 (Jul - Sep)
              </button>
              <button
                type="button"
                onClick={() => handlePreset("q3")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  backgroundColor: "var(--input-bg)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer"
                }}
              >
                Q3 (Oct - Dec)
              </button>
              <button
                type="button"
                onClick={() => handlePreset("q4")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  backgroundColor: "var(--input-bg)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer"
                }}
              >
                Q4 (Jan - Mar)
              </button>
              <button
                type="button"
                onClick={() => handlePreset("last_30")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  backgroundColor: "var(--input-bg)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer"
                }}
              >
                Last 30 Days
              </button>
            </div>

            {/* Row 3: 12 Months Fast Selection Bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>
                  Select Single Month (Auto-sets From 1st to End of Month):
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  Swipe to view all months ↔
                </span>
              </div>
              <div style={{
                display: "flex",
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                gap: "8px",
                padding: "8px 6px",
                backgroundColor: "var(--input-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px"
              }}>
                {FY_MONTHS.map((m) => {
                  const range = getDateRangeForMonth(selectedFY, m.index);
                  const isSelected = selectedMonth === m.index || (fromDate === range.fromDate && toDate === range.toDate);
                  return (
                    <button
                      key={m.index}
                      type="button"
                      onClick={() => handleSelectMonth(m.index)}
                      style={{
                        flex: "1 0 64px",
                        minWidth: "64px",
                        padding: "9px 6px",
                        borderRadius: "8px",
                        textAlign: "center",
                        backgroundColor: isSelected ? "var(--accent-color)" : "transparent",
                        color: isSelected ? "#ffffff" : "var(--text-secondary)",
                        fontWeight: isSelected ? "700" : "500",
                        fontSize: "13px",
                        border: isSelected ? "1px solid var(--accent-color)" : "1px solid transparent",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {m.short}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ─── GST Summary Dashboard Cards ─── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "14px",
          marginBottom: "24px"
        }}>
          {/* Card 1: B2B Invoices */}
          <div className="glass" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase" }}>
              Total B2B Invoices
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <span style={{ fontSize: "28px", fontWeight: "700", color: "#8b5cf6" }}>
                {reportData.summary.b2b.count}
              </span>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>records</span>
            </div>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Taxable: <strong style={{ color: "var(--text-primary)" }}>{formatINR(reportData.summary.b2b.taxable)}</strong>
            </span>
          </div>

          {/* Card 2: B2C Invoices */}
          <div className="glass" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase" }}>
              Total B2C Invoices
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <span style={{ fontSize: "28px", fontWeight: "700", color: "#0284c7" }}>
                {reportData.summary.b2c.count}
              </span>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>records</span>
            </div>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Taxable: <strong style={{ color: "var(--text-primary)" }}>{formatINR(reportData.summary.b2c.taxable)}</strong>
            </span>
          </div>

          {/* Card 3: Total Taxable Value */}
          <div className="glass" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase" }}>
              Total Taxable Value
            </span>
            <span style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)" }}>
              {formatINR(reportData.summary.totalTaxable)}
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Net sales before GST</span>
          </div>

          {/* Card 4: Total CGST */}
          <div className="glass" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase" }}>
              Total CGST (Central)
            </span>
            <span style={{ fontSize: "24px", fontWeight: "700", color: "#ef4444" }}>
              {formatINR(reportData.summary.totalCgst)}
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Intra-state central tax</span>
          </div>

          {/* Card 5: Total SGST */}
          <div className="glass" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase" }}>
              Total SGST (State)
            </span>
            <span style={{ fontSize: "24px", fontWeight: "700", color: "#f97316" }}>
              {formatINR(reportData.summary.totalSgst)}
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Intra-state state tax</span>
          </div>

          {/* Card 6: Total IGST (if applicable) */}
          {reportData.summary.totalIgst > 0 && (
            <div className="glass" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase" }}>
                Total IGST (Integrated)
              </span>
              <span style={{ fontSize: "24px", fontWeight: "700", color: "#3b82f6" }}>
                {formatINR(reportData.summary.totalIgst)}
              </span>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Inter-state supplies</span>
            </div>
          )}

          {/* Card 7: Grand Total Value */}
          <div className="glass" style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            borderLeft: "4px solid var(--accent-color)"
          }}>
            <span style={{ fontSize: "12px", color: "var(--accent-color)", fontWeight: "700", textTransform: "uppercase" }}>
              Total Invoice Value
            </span>
            <span style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)" }}>
              {formatINR(reportData.summary.totalInvoiceValue)}
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Total GST: <strong>{formatINR(reportData.summary.totalGst)}</strong>
            </span>
          </div>
        </div>

        {/* ─── Validation & Compliance Alert Panel ─── */}
        {reportData.warnings.length > 0 ? (
          <div className="glass" style={{
            padding: "18px 24px",
            marginBottom: "24px",
            borderLeft: "4px solid #f59e0b",
            backgroundColor: "rgba(245, 158, 11, 0.05)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <AlertTriangle size={20} style={{ color: "#f59e0b" }} />
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#f59e0b" }}>
                Validation Discrepancies & Audit Warnings ({reportData.warnings.length})
              </h3>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "12px" }}>
              The following potential issues were detected in this reporting period. Please review before filing your GSTR returns:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {reportData.warnings.map((w, idx) => (
                <div key={idx} style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(0,0,0,0.15)"
                }}>
                  <span style={{
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: "700",
                    backgroundColor: w.severity === "error" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)",
                    color: w.severity === "error" ? "#ef4444" : "#f59e0b"
                  }}>
                    Inv #{w.invoiceNumber}
                  </span>
                  <span>{w.message}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="glass" style={{
            padding: "14px 20px",
            marginBottom: "24px",
            borderLeft: "4px solid var(--success-color)",
            backgroundColor: "rgba(16, 185, 129, 0.05)",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <ShieldCheck size={20} style={{ color: "var(--success-color)", flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>GST Data Audit Passed: </strong>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                All line items and customer records in {reportData.periodLabel} have valid GSTINs, HSN codes, and balanced tax totals.
              </span>
            </div>
          </div>
        )}

        {/* ─── Navigation Tabs ─── */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", overflowX: "auto" }}>
          <button
            onClick={() => setActiveTab("template")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "8px",
              backgroundColor: activeTab === "template" ? "var(--accent-color)" : "transparent",
              color: activeTab === "template" ? "#fff" : "var(--text-secondary)",
              fontWeight: "600",
              fontSize: "14px"
            }}
          >
            <FileSpreadsheet size={16} />
            Template Layout View (GST TEST.xlsx)
          </button>

          <button
            onClick={() => setActiveTab("b2b")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "8px",
              backgroundColor: activeTab === "b2b" ? "var(--accent-color)" : "transparent",
              color: activeTab === "b2b" ? "#fff" : "var(--text-secondary)",
              fontWeight: "600",
              fontSize: "14px"
            }}
          >
            <Building2 size={16} />
            B2B Invoices ({reportData.b2bInvoices.length})
          </button>

          <button
            onClick={() => setActiveTab("b2c")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "8px",
              backgroundColor: activeTab === "b2c" ? "var(--accent-color)" : "transparent",
              color: activeTab === "b2c" ? "#fff" : "var(--text-secondary)",
              fontWeight: "600",
              fontSize: "14px"
            }}
          >
            <Layers size={16} />
            B2C Invoices ({reportData.b2cInvoices.length})
          </button>

          <button
            onClick={() => setActiveTab("hsn")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "8px",
              backgroundColor: activeTab === "hsn" ? "var(--accent-color)" : "transparent",
              color: activeTab === "hsn" ? "#fff" : "var(--text-secondary)",
              fontWeight: "600",
              fontSize: "14px"
            }}
          >
            <FileText size={16} />
            HSN / SAC Summary ({reportData.allHsnList.length})
          </button>
        </div>

        {/* ─── TAB 1: Client Template Layout (Matches GST TEST.xlsx) ─── */}
        {activeTab === "template" && (
          <div className="glass" style={{ padding: "24px", overflowX: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                  Interactive Spreadsheet Preview
                </span>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  (Accurate representation of GST TEST.xlsx download)
                </span>
              </div>
            </div>

            {/* Template Container styled like Excel sheet */}
            <div style={{
              backgroundColor: "#ffffff",
              color: "#000000",
              fontFamily: "'Bookman Old Style', 'Calibri', serif",
              padding: "24px",
              borderRadius: "8px",
              boxShadow: "inset 0 0 10px rgba(0,0,0,0.05)",
              minWidth: "980px"
            }}>
              {/* Row 4: Solid RED Bar */}
              <div style={{
                backgroundColor: "#ff0000",
                height: "24px",
                width: "100%",
                marginBottom: "16px"
              }}></div>

              {/* Row 5: Date */}
              <div style={{ marginBottom: "6px", fontWeight: "bold", fontSize: "13px", color: "#000" }}>
                {reportData.periodLabel}
              </div>

              {/* Row 6: B2B Header */}
              <div style={{ marginBottom: "12px" }}>
                <span style={{ color: "#ff0000", fontWeight: "bold", fontSize: "16px" }}>
                  B2B
                </span>
              </div>

              {/* B2B Section: Left Summary Box + Single Unified B2B Table */}
              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "20px", marginBottom: "24px", alignItems: "start" }}>
                
                {/* Column A: Summary Box */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ color: "#7030a0", fontWeight: "bold", fontSize: "14px", marginBottom: "4px" }}>
                    B2B
                  </div>
                  <div style={{ backgroundColor: "#ffff00", padding: "6px 10px", fontWeight: "bold", color: "#7030a0", fontSize: "13px" }}>
                    {formatINR(reportData.summary.b2b.taxable)}
                  </div>
                  <div style={{ backgroundColor: "#ffff00", padding: "6px 10px", fontWeight: "bold", color: "#7030a0", fontSize: "13px" }}>
                    {formatINR(reportData.summary.b2b.sgst)}
                  </div>
                  <div style={{ backgroundColor: "#ffff00", padding: "6px 10px", fontWeight: "bold", color: "#7030a0", fontSize: "13px" }}>
                    {formatINR(reportData.summary.b2b.cgst)}
                  </div>
                  <div style={{ backgroundColor: "#ffff00", padding: "6px 10px", fontWeight: "bold", color: "#7030a0", fontSize: "13px" }}>
                    {formatINR(reportData.summary.b2b.total)}
                  </div>
                </div>

                {/* Single Clean B2B Table (All HSNs together) */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ color: "#ff0000", fontWeight: "bold", borderBottom: "2px solid #ccc" }}>
                        <th style={{ textAlign: "left", padding: "8px 6px" }}>HSN</th>
                        <th style={{ textAlign: "right", padding: "8px 6px", color: "#7030a0" }}>Qty</th>
                        <th style={{ textAlign: "right", padding: "8px 6px" }}>Unit Rate</th>
                        <th style={{ textAlign: "right", padding: "8px 6px" }}>Taxable Value</th>
                        <th style={{ textAlign: "right", padding: "8px 6px" }}>SGST</th>
                        <th style={{ textAlign: "right", padding: "8px 6px" }}>CGST</th>
                        <th style={{ textAlign: "right", padding: "8px 6px" }}>Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b2bItemsGrouped.length > 0 ? (
                        <>
                          {b2bItemsGrouped.map((it, idx) => (
                            <tr key={idx} style={{ borderBottom: "1px solid #f0f0f0" }}>
                              <td style={{ padding: "6px" }}>{it.hsn_code || "Misc"}</td>
                              <td style={{ textAlign: "right", padding: "6px" }}>{it.quantity}</td>
                              <td style={{ textAlign: "right", padding: "6px" }}>{formatINR(it.rate)}</td>
                              <td style={{ textAlign: "right", padding: "6px" }}>{formatINR(it.taxableValue)}</td>
                              <td style={{ textAlign: "right", padding: "6px" }}>{formatINR(it.sgstAmount)}</td>
                              <td style={{ textAlign: "right", padding: "6px" }}>{formatINR(it.cgstAmount)}</td>
                              <td style={{ textAlign: "right", padding: "6px", fontWeight: "500" }}>{formatINR(it.total)}</td>
                            </tr>
                          ))}
                          {/* Subtotal Row (Red) */}
                          <tr style={{ color: "#ff0000", fontWeight: "bold", borderTop: "2px solid #ccc", backgroundColor: "#fff5f5" }}>
                            <td style={{ padding: "8px 6px" }}>B2B Subtotal</td>
                            <td style={{ textAlign: "right", padding: "8px 6px", color: "#7030a0" }}>
                              {b2bItemsGrouped.reduce((s, it) => s + it.quantity, 0)}
                            </td>
                            <td style={{ textAlign: "right", padding: "8px 6px" }}>-</td>
                            <td style={{ textAlign: "right", padding: "8px 6px" }}>
                              {formatINR(b2bItemsGrouped.reduce((s, it) => s + it.taxableValue, 0))}
                            </td>
                            <td style={{ textAlign: "right", padding: "8px 6px" }}>
                              {formatINR(b2bItemsGrouped.reduce((s, it) => s + it.sgstAmount, 0))}
                            </td>
                            <td style={{ textAlign: "right", padding: "8px 6px" }}>
                              {formatINR(b2bItemsGrouped.reduce((s, it) => s + it.cgstAmount, 0))}
                            </td>
                            <td style={{ textAlign: "right", padding: "8px 6px" }}>
                              {formatINR(b2bItemsGrouped.reduce((s, it) => s + it.total, 0))}
                            </td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td colSpan="7" style={{ textAlign: "center", padding: "16px", color: "#94a3b8", fontStyle: "italic" }}>
                            No B2B items in this period
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Row 27: Solid CYAN Bar */}
              <div style={{
                backgroundColor: "#00b0f0",
                height: "22px",
                width: "100%",
                marginBottom: "16px"
              }}></div>

              {/* Row 28: B2C Header */}
              <div style={{ marginBottom: "12px" }}>
                <span style={{ color: "#0070c0", fontWeight: "bold", fontSize: "16px" }}>
                  B2C
                </span>
              </div>

              {/* B2C Section: Left Combined Total Box + Single Unified B2C Table */}
              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "20px", marginBottom: "20px", alignItems: "start" }}>
                
                {/* Column A: Total (B2B + B2C) Combined Summary Box */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ color: "#7030a0", fontWeight: "bold", fontSize: "13px", marginBottom: "4px" }}>
                    Total (B2B + B2C)
                  </div>
                  <div style={{ backgroundColor: "#ffff00", padding: "6px 10px", fontWeight: "bold", color: "#ff0000", fontSize: "13px" }}>
                    {formatINR((reportData.summary.b2b.taxable || 0) + (reportData.summary.b2c.taxable || 0))}
                  </div>
                  <div style={{ backgroundColor: "#ffff00", padding: "6px 10px", fontWeight: "bold", color: "#ff0000", fontSize: "13px" }}>
                    {formatINR((reportData.summary.b2b.sgst || 0) + (reportData.summary.b2c.sgst || 0))}
                  </div>
                  <div style={{ backgroundColor: "#ffff00", padding: "6px 10px", fontWeight: "bold", color: "#ff0000", fontSize: "13px" }}>
                    {formatINR((reportData.summary.b2b.cgst || 0) + (reportData.summary.b2c.cgst || 0))}
                  </div>
                  <div style={{ backgroundColor: "#ffff00", padding: "6px 10px", fontWeight: "bold", color: "#ff0000", fontSize: "13px" }}>
                    {formatINR((reportData.summary.b2b.total || 0) + (reportData.summary.b2c.total || 0))}
                  </div>
                </div>

                {/* Single Clean B2C Table (All HSNs together) */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ color: "#0070c0", fontWeight: "bold", borderBottom: "2px solid #ccc" }}>
                        <th style={{ textAlign: "left", padding: "8px 6px" }}>HSN</th>
                        <th style={{ textAlign: "right", padding: "8px 6px", color: "#7030a0" }}>Qty</th>
                        <th style={{ textAlign: "right", padding: "8px 6px" }}>Unit Rate</th>
                        <th style={{ textAlign: "right", padding: "8px 6px" }}>Taxable Value</th>
                        <th style={{ textAlign: "right", padding: "8px 6px" }}>SGST</th>
                        <th style={{ textAlign: "right", padding: "8px 6px" }}>CGST</th>
                        <th style={{ textAlign: "right", padding: "8px 6px" }}>Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b2cItemsGrouped.length > 0 ? (
                        <>
                          {b2cItemsGrouped.map((it, idx) => (
                            <tr key={idx} style={{ borderBottom: "1px solid #f0f0f0" }}>
                              <td style={{ padding: "6px" }}>{it.hsn_code || "Misc"}</td>
                              <td style={{ textAlign: "right", padding: "6px" }}>{it.quantity}</td>
                              <td style={{ textAlign: "right", padding: "6px" }}>{formatINR(it.rate)}</td>
                              <td style={{ textAlign: "right", padding: "6px" }}>{formatINR(it.taxableValue)}</td>
                              <td style={{ textAlign: "right", padding: "6px" }}>{formatINR(it.sgstAmount)}</td>
                              <td style={{ textAlign: "right", padding: "6px" }}>{formatINR(it.cgstAmount)}</td>
                              <td style={{ textAlign: "right", padding: "6px", fontWeight: "500" }}>{formatINR(it.total)}</td>
                            </tr>
                          ))}
                          {/* Total B2C Subtotal Row (Green) */}
                          <tr style={{ color: "#385723", fontWeight: "bold", borderTop: "2px solid #ccc", backgroundColor: "#e2efda" }}>
                            <td style={{ padding: "8px 6px" }}>Total B2C</td>
                            <td style={{ textAlign: "right", padding: "8px 6px" }}>
                              {b2cItemsGrouped.reduce((s, it) => s + it.quantity, 0)}
                            </td>
                            <td style={{ textAlign: "right", padding: "8px 6px" }}>-</td>
                            <td style={{ textAlign: "right", padding: "8px 6px" }}>
                              {formatINR(b2cItemsGrouped.reduce((s, it) => s + it.taxableValue, 0))}
                            </td>
                            <td style={{ textAlign: "right", padding: "8px 6px" }}>
                              {formatINR(b2cItemsGrouped.reduce((s, it) => s + it.sgstAmount, 0))}
                            </td>
                            <td style={{ textAlign: "right", padding: "8px 6px" }}>
                              {formatINR(b2cItemsGrouped.reduce((s, it) => s + it.cgstAmount, 0))}
                            </td>
                            <td style={{ textAlign: "right", padding: "8px 6px" }}>
                              {formatINR(b2cItemsGrouped.reduce((s, it) => s + it.total, 0))}
                            </td>
                          </tr>
                          {/* Grand Total (B2B + B2C) Row */}
                          <tr style={{ color: "#ff0000", fontWeight: "bold", borderTop: "2px solid #b91c1c", backgroundColor: "#fff8dc" }}>
                            <td style={{ padding: "9px 6px", fontSize: "13px" }}>Grand Total (B2B + B2C)</td>
                            <td style={{ textAlign: "right", padding: "9px 6px", color: "#7030a0", fontSize: "13px" }}>
                              {b2bItemsGrouped.reduce((s, it) => s + it.quantity, 0) + b2cItemsGrouped.reduce((s, it) => s + it.quantity, 0)}
                            </td>
                            <td style={{ textAlign: "right", padding: "9px 6px" }}>-</td>
                            <td style={{ textAlign: "right", padding: "9px 6px", fontSize: "13px" }}>
                              {formatINR((reportData.summary.b2b.taxable || 0) + (reportData.summary.b2c.taxable || 0))}
                            </td>
                            <td style={{ textAlign: "right", padding: "9px 6px", fontSize: "13px" }}>
                              {formatINR((reportData.summary.b2b.sgst || 0) + (reportData.summary.b2c.sgst || 0))}
                            </td>
                            <td style={{ textAlign: "right", padding: "9px 6px", fontSize: "13px" }}>
                              {formatINR((reportData.summary.b2b.cgst || 0) + (reportData.summary.b2c.cgst || 0))}
                            </td>
                            <td style={{ textAlign: "right", padding: "9px 6px", fontSize: "13px" }}>
                              {formatINR((reportData.summary.b2b.total || 0) + (reportData.summary.b2c.total || 0))}
                            </td>
                          </tr>
                        </>
                      ) : (
                        <>
                          <tr>
                            <td colSpan="7" style={{ textAlign: "center", padding: "16px", color: "#94a3b8", fontStyle: "italic" }}>
                              No B2C items in this period
                            </td>
                          </tr>
                          {/* Grand Total (B2B + B2C) Row even when B2C is empty */}
                          <tr style={{ color: "#ff0000", fontWeight: "bold", borderTop: "2px solid #b91c1c", backgroundColor: "#fff8dc" }}>
                            <td style={{ padding: "9px 6px", fontSize: "13px" }}>Grand Total (B2B + B2C)</td>
                            <td style={{ textAlign: "right", padding: "9px 6px", color: "#7030a0", fontSize: "13px" }}>
                              {b2bItemsGrouped.reduce((s, it) => s + it.quantity, 0)}
                            </td>
                            <td style={{ textAlign: "right", padding: "9px 6px" }}>-</td>
                            <td style={{ textAlign: "right", padding: "9px 6px", fontSize: "13px" }}>
                              {formatINR(reportData.summary.b2b.taxable || 0)}
                            </td>
                            <td style={{ textAlign: "right", padding: "9px 6px", fontSize: "13px" }}>
                              {formatINR(reportData.summary.b2b.sgst || 0)}
                            </td>
                            <td style={{ textAlign: "right", padding: "9px 6px", fontSize: "13px" }}>
                              {formatINR(reportData.summary.b2b.cgst || 0)}
                            </td>
                            <td style={{ textAlign: "right", padding: "9px 6px", fontSize: "13px" }}>
                              {formatINR(reportData.summary.b2b.total || 0)}
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Grand Total Combined Highlight Banner */}
              <div style={{
                backgroundColor: "rgba(59, 130, 246, 0.08)",
                border: "1.5px solid var(--accent-color)",
                borderRadius: "8px",
                padding: "12px 20px",
                marginTop: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                color: "var(--text-primary)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CheckCircle2 size={18} style={{ color: "var(--accent-color)" }} />
                  <span style={{ fontWeight: "700", fontSize: "14px" }}>Grand Total (B2B + B2C)</span>
                </div>
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", fontSize: "13px" }}>
                  <span>Taxable: <strong>{formatINR((reportData.summary.b2b.taxable || 0) + (reportData.summary.b2c.taxable || 0))}</strong></span>
                  <span>SGST: <strong style={{ color: "#f97316" }}>{formatINR((reportData.summary.b2b.sgst || 0) + (reportData.summary.b2c.sgst || 0))}</strong></span>
                  <span>CGST: <strong style={{ color: "#ef4444" }}>{formatINR((reportData.summary.b2b.cgst || 0) + (reportData.summary.b2c.cgst || 0))}</strong></span>
                  <span style={{ color: "var(--accent-color)", fontWeight: "800", fontSize: "14px" }}>
                    Total: {formatINR((reportData.summary.b2b.total || 0) + (reportData.summary.b2c.total || 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: B2B Invoices Drill-Down ─── */}
        {activeTab === "b2b" && (
          <div className="glass" style={{ padding: "24px", overflowX: "auto" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px" }}>
              B2B Outward Invoices ({reportData.b2bInvoices.length})
            </h3>
            {reportData.b2bInvoices.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
                No B2B invoices recorded for this period.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                    <th style={{ textAlign: "left", padding: "10px" }}>Invoice No</th>
                    <th style={{ textAlign: "left", padding: "10px" }}>Date</th>
                    <th style={{ textAlign: "left", padding: "10px" }}>Customer Name</th>
                    <th style={{ textAlign: "left", padding: "10px" }}>Customer GSTIN</th>
                    <th style={{ textAlign: "left", padding: "10px" }}>Place of Supply</th>
                    <th style={{ textAlign: "right", padding: "10px" }}>Taxable (₹)</th>
                    <th style={{ textAlign: "right", padding: "10px" }}>CGST (₹)</th>
                    <th style={{ textAlign: "right", padding: "10px" }}>SGST (₹)</th>
                    <th style={{ textAlign: "right", padding: "10px" }}>IGST (₹)</th>
                    <th style={{ textAlign: "right", padding: "10px" }}>Total (₹)</th>
                    <th style={{ textAlign: "center", padding: "10px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.b2bInvoices.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "10px", fontWeight: "600" }}>{inv.invoice_number}</td>
                      <td style={{ padding: "10px" }}>{inv.date}</td>
                      <td style={{ padding: "10px" }}>{inv.customer_name}</td>
                      <td style={{ padding: "10px" }}>
                        <code style={{ color: "var(--accent-color)" }}>{inv.customer_gstin}</code>
                      </td>
                      <td style={{ padding: "10px" }}>{inv.customer_state || "Karnataka"}</td>
                      <td style={{ textAlign: "right", padding: "10px" }}>{formatINR(inv.calculatedTaxable)}</td>
                      <td style={{ textAlign: "right", padding: "10px", color: "#ef4444" }}>{formatINR(inv.calculatedCgst)}</td>
                      <td style={{ textAlign: "right", padding: "10px", color: "#f97316" }}>{formatINR(inv.calculatedSgst)}</td>
                      <td style={{ textAlign: "right", padding: "10px", color: "#3b82f6" }}>{formatINR(inv.calculatedIgst)}</td>
                      <td style={{ textAlign: "right", padding: "10px", fontWeight: "700" }}>{formatINR(inv.calculatedTotal)}</td>
                      <td style={{ textAlign: "center", padding: "10px" }}>
                        <Link
                          to={`/invoices/view/${inv.id}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            color: "var(--accent-color)",
                            textDecoration: "none",
                            fontSize: "12px",
                            fontWeight: "600"
                          }}
                        >
                          <Eye size={14} />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ─── TAB 3: B2C Invoices Drill-Down ─── */}
        {activeTab === "b2c" && (
          <div className="glass" style={{ padding: "24px", overflowX: "auto" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px" }}>
              B2C Outward Invoices ({reportData.b2cInvoices.length})
            </h3>
            {reportData.b2cInvoices.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
                No B2C invoices recorded for this period.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                    <th style={{ textAlign: "left", padding: "10px" }}>Invoice No</th>
                    <th style={{ textAlign: "left", padding: "10px" }}>Date</th>
                    <th style={{ textAlign: "left", padding: "10px" }}>Customer Name</th>
                    <th style={{ textAlign: "left", padding: "10px" }}>Classification</th>
                    <th style={{ textAlign: "right", padding: "10px" }}>Taxable (₹)</th>
                    <th style={{ textAlign: "right", padding: "10px" }}>CGST (₹)</th>
                    <th style={{ textAlign: "right", padding: "10px" }}>SGST (₹)</th>
                    <th style={{ textAlign: "right", padding: "10px" }}>Total (₹)</th>
                    <th style={{ textAlign: "center", padding: "10px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.b2cInvoices.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "10px", fontWeight: "600" }}>{inv.invoice_number}</td>
                      <td style={{ padding: "10px" }}>{inv.date}</td>
                      <td style={{ padding: "10px" }}>{inv.customer_name || "Consumer Buyer"}</td>
                      <td style={{ padding: "10px" }}>
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          backgroundColor: "rgba(2, 132, 199, 0.15)",
                          color: "#0284c7",
                          fontWeight: "600"
                        }}>
                          B2C Unregistered
                        </span>
                      </td>
                      <td style={{ textAlign: "right", padding: "10px" }}>{formatINR(inv.calculatedTaxable)}</td>
                      <td style={{ textAlign: "right", padding: "10px", color: "#ef4444" }}>{formatINR(inv.calculatedCgst)}</td>
                      <td style={{ textAlign: "right", padding: "10px", color: "#f97316" }}>{formatINR(inv.calculatedSgst)}</td>
                      <td style={{ textAlign: "right", padding: "10px", fontWeight: "700" }}>{formatINR(inv.calculatedTotal)}</td>
                      <td style={{ textAlign: "center", padding: "10px" }}>
                        <Link
                          to={`/invoices/view/${inv.id}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            color: "var(--accent-color)",
                            textDecoration: "none",
                            fontSize: "12px",
                            fontWeight: "600"
                          }}
                        >
                          <Eye size={14} />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ─── TAB 4: HSN / SAC Summary ─── */}
        {activeTab === "hsn" && (
          <div className="glass" style={{ padding: "24px", overflowX: "auto" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px" }}>
              HSN / SAC Summary Table ({reportData.allHsnList.length} Categories)
            </h3>
            {reportData.allHsnList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
                No line items recorded for this period.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                    <th style={{ textAlign: "left", padding: "10px" }}>HSN/SAC Code</th>
                    <th style={{ textAlign: "left", padding: "10px" }}>Description</th>
                    <th style={{ textAlign: "right", padding: "10px" }}>Unit Rate (₹)</th>
                    <th style={{ textAlign: "right", padding: "10px" }}>Total Qty</th>
                    <th style={{ textAlign: "center", padding: "10px" }}>Unit</th>
                    <th style={{ textAlign: "right", padding: "10px" }}>GST Rate</th>
                    <th style={{ textAlign: "right", padding: "10px" }}>Taxable (₹)</th>
                    <th style={{ textAlign: "right", padding: "10px" }}>CGST (₹)</th>
                    <th style={{ textAlign: "right", padding: "10px" }}>SGST (₹)</th>
                    <th style={{ textAlign: "right", padding: "10px" }}>IGST (₹)</th>
                    <th style={{ textAlign: "right", padding: "10px" }}>Total Tax (₹)</th>
                    <th style={{ textAlign: "right", padding: "10px" }}>Total Value (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.allHsnList.map((h, idx) => {
                    const totalTax = h.cgstAmount + h.sgstAmount + h.igstAmount;
                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "10px", fontWeight: "700" }}>{h.hsn_code}</td>
                        <td style={{ padding: "10px" }}>{h.description}</td>
                        <td style={{ textAlign: "right", padding: "10px", fontWeight: "600" }}>{formatINR(h.rate)}</td>
                        <td style={{ textAlign: "right", padding: "10px", fontWeight: "600" }}>{h.quantity}</td>
                        <td style={{ textAlign: "center", padding: "10px" }}>{h.unit}</td>
                        <td style={{ textAlign: "right", padding: "10px" }}>{h.taxRate}%</td>
                        <td style={{ textAlign: "right", padding: "10px", fontWeight: "600" }}>{formatINR(h.taxableValue)}</td>
                        <td style={{ textAlign: "right", padding: "10px", color: "#ef4444" }}>{formatINR(h.cgstAmount)}</td>
                        <td style={{ textAlign: "right", padding: "10px", color: "#f97316" }}>{formatINR(h.sgstAmount)}</td>
                        <td style={{ textAlign: "right", padding: "10px", color: "#3b82f6" }}>{formatINR(h.igstAmount)}</td>
                        <td style={{ textAlign: "right", padding: "10px", fontWeight: "600" }}>{formatINR(totalTax)}</td>
                        <td style={{ textAlign: "right", padding: "10px", fontWeight: "700" }}>{formatINR(h.totalAmount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ─── HIDDEN PRINTABLE ELEMENT (Used for High-Res PDF Generation) ─── */}
        <div id="printable-gst-pdf-target" style={{
          display: "none",
          width: "794px",
          padding: "36px",
          backgroundColor: "#ffffff",
          color: "#1e293b",
          fontFamily: "'Outfit', 'Segoe UI', sans-serif"
        }}>
          {/* PDF Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #0f172a", paddingBottom: "16px", marginBottom: "20px" }}>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", marginBottom: "4px" }}>
                {businessName}
              </h1>
              <div style={{ fontSize: "12px", color: "#475569" }}>
                <strong>GSTIN:</strong> {businessGstin} | <strong>State:</strong> {businessState}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#2563eb" }}>
                MONTHLY GST REPORT
              </div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>
                {reportData.periodLabel}
              </div>
            </div>
          </div>

          {/* PDF Summary KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "20px" }}>
            <div style={{ border: "1px solid #e2e8f0", padding: "10px", borderRadius: "6px" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold" }}>TOTAL TAXABLE</div>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: "#0f172a" }}>{formatINR(reportData.summary.totalTaxable)}</div>
            </div>
            <div style={{ border: "1px solid #e2e8f0", padding: "10px", borderRadius: "6px" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold" }}>TOTAL CGST</div>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: "#ef4444" }}>{formatINR(reportData.summary.totalCgst)}</div>
            </div>
            <div style={{ border: "1px solid #e2e8f0", padding: "10px", borderRadius: "6px" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold" }}>TOTAL SGST</div>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: "#f97316" }}>{formatINR(reportData.summary.totalSgst)}</div>
            </div>
            <div style={{ border: "1px solid #e2e8f0", padding: "10px", borderRadius: "6px", backgroundColor: "#f8fafc" }}>
              <div style={{ fontSize: "11px", color: "#2563eb", fontWeight: "bold" }}>GROSS RECEIPT</div>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: "#0f172a" }}>{formatINR(reportData.summary.totalInvoiceValue)}</div>
            </div>
          </div>

          {/* PDF HSN Summary Table */}
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px", color: "#0f172a" }}>
              HSN / SAC Summary Breakup
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ backgroundColor: "#0f172a", color: "#ffffff" }}>
                  <th style={{ padding: "6px", textAlign: "left" }}>HSN Code</th>
                  <th style={{ padding: "6px", textAlign: "left" }}>Description</th>
                  <th style={{ padding: "6px", textAlign: "right" }}>Price (₹)</th>
                  <th style={{ padding: "6px", textAlign: "right" }}>Qty</th>
                  <th style={{ padding: "6px", textAlign: "right" }}>GST %</th>
                  <th style={{ padding: "6px", textAlign: "right" }}>Taxable (₹)</th>
                  <th style={{ padding: "6px", textAlign: "right" }}>CGST (₹)</th>
                  <th style={{ padding: "6px", textAlign: "right" }}>SGST (₹)</th>
                  <th style={{ padding: "6px", textAlign: "right" }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {reportData.allHsnList.map((h, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "6px", fontWeight: "bold" }}>{h.hsn_code}</td>
                    <td style={{ padding: "6px" }}>{h.description}</td>
                    <td style={{ padding: "6px", textAlign: "right" }}>{formatINR(h.rate)}</td>
                    <td style={{ padding: "6px", textAlign: "right" }}>{h.quantity}</td>
                    <td style={{ padding: "6px", textAlign: "right" }}>{h.taxRate}%</td>
                    <td style={{ padding: "6px", textAlign: "right" }}>{formatINR(h.taxableValue)}</td>
                    <td style={{ padding: "6px", textAlign: "right" }}>{formatINR(h.cgstAmount)}</td>
                    <td style={{ padding: "6px", textAlign: "right" }}>{formatINR(h.sgstAmount)}</td>
                    <td style={{ padding: "6px", textAlign: "right", fontWeight: "bold" }}>{formatINR(h.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PDF Footer Verification */}
          <div style={{ marginTop: "30px", paddingTop: "12px", borderTop: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b" }}>
            <div>
              Generated on {new Date().toLocaleDateString("en-IN")} via InvoiceGen Suite
            </div>
            <div style={{ textAlign: "right" }}>
              Authorised Signatory for {businessName}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
