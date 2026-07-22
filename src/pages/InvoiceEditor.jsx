import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db, auth, storage } from "../firebase";
import { doc, getDoc, getDocFromCache, setDoc, addDoc, collection, getDocs, getDocsFromCache, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import Template1 from "../components/Template1";
import Template2 from "../components/Template2";
import Template3 from "../components/Template3";
import html2pdf from "html2pdf.js";
import Toast from "../components/Toast";
import { Save, Plus, Trash2, ArrowLeft, Loader, Users, FileText, Settings, AlertCircle, Percent, PlusCircle, MinusCircle, Download } from "lucide-react";

// localStorage keys for offline caching
const LS_ITEMS_KEY   = "iconsys_cached_items";
const LS_DEALERS_KEY = "iconsys_cached_dealers";
const LS_INV_COUNT   = "iconsys_last_inv_count";

export default function InvoiceEditor() {
  const { id } = useParams(); // if edit mode
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [predefinedItems, setPredefinedItems] = useState([]);
  const [predefinedDealers, setPredefinedDealers] = useState([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null); // { message, type }

  // Invoice State variables
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [templateType, setTemplateType] = useState("template1"); // template1 or template2
  // Predefined items select dropdown state
  
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [customerState, setCustomerState] = useState("Karnataka");
  const [customerStateCode, setCustomerStateCode] = useState("29");
  const [invoicePhone, setInvoicePhone] = useState(""); // per-invoice phone override
  const [showWebsite, setShowWebsite] = useState(true); // show/hide website on invoice
  const [showMobilePreview, setShowMobilePreview] = useState(false); // mobile overlay preview toggle
  const [modalScale, setModalScale] = useState(0.85); // mobile PDF preview scale
  const [showSuggestions, setShowSuggestions] = useState(false); // autocomplete suggestions toggle
  const [focusedItemRowIndex, setFocusedItemRowIndex] = useState(null); // track product row with active autocomplete suggestions
  const [needShipping, setNeedShipping] = useState(false);
  const [shippingName, setShippingName] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingGstin, setShippingGstin] = useState("");
  const [shippingState, setShippingState] = useState("Karnataka");
  const [shippingStateCode, setShippingStateCode] = useState("29");

  // Taxes
  const [cgstPercent, setCgstPercent] = useState("9");
  const [sgstPercent, setSgstPercent] = useState("9");
  const [igstPercent, setIgstPercent] = useState("18");
  const [isInterstate, setIsInterstate] = useState(false);

  // e-Invoice details for template2
  const [irn, setIrn] = useState("");
  const [ackNo, setAckNo] = useState("");
  const [ackDate, setAckDate] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [paymentMode, setPaymentMode] = useState("Other");
  const [refNoDate, setRefNoDate] = useState("");
  const [otherReferences, setOtherReferences] = useState("");
  const [buyerOrderNo, setBuyerOrderNo] = useState("");
  const [buyerOrderDate, setBuyerOrderDate] = useState("");
  const [dispatchDocNo, setDispatchDocNo] = useState("");
  const [dispatchDocDate, setDispatchDocDate] = useState("");
  const [dispatchedThrough, setDispatchedThrough] = useState("");
  const [destination, setDestination] = useState("");
  const [termsOfDelivery, setTermsOfDelivery] = useState("");

  const [notes, setNotes] = useState("Make all cheques payable to Company Name.");

  // Line items - start with one empty row
  const [items, setItems] = useState([
    { description: "", hsn_code: "", quantity: 1, unit: "No", rate: 0, amount: 0 }
  ]);

  useEffect(() => {
    const loadInitData = async () => {
      if (!auth.currentUser) return;
      const uid = auth.currentUser.uid;

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // PHASE 1 — localStorage (synchronous, ~0ms)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      try {
        const ci = localStorage.getItem(LS_ITEMS_KEY);
        if (ci) setPredefinedItems(JSON.parse(ci));
        const cd = localStorage.getItem(LS_DEALERS_KEY);
        if (cd) setPredefinedDealers(JSON.parse(cd));
        if (!id) {
          const cc = parseInt(localStorage.getItem(LS_INV_COUNT) || "0", 10);
          if (cc > 0) setInvoiceNumber((cc + 391).toString());
        }
      } catch (_) {}

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // PHASE 2 — Firestore IndexedDB cache (~10-50ms)
      // Reads local device storage only, never waits for network
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      try {
        const profSnap = await getDocFromCache(doc(db, "users", uid));
        if (profSnap.exists()) {
          const profData = profSnap.data();
          setProfile(profData);
          setInvoicePhone(profData.phone || "");
        }
      } catch (_) {} // not in cache yet — will load in phase 3

      try {
        const qItems = query(collection(db, "predefined_items"), where("userId", "==", uid));
        const itemsSnap = await getDocsFromCache(qItems);
        const preItems = [];
        itemsSnap.forEach((d) => preItems.push({ id: d.id, ...d.data() }));
        if (preItems.length > 0) {
          setPredefinedItems(preItems);
          try { localStorage.setItem(LS_ITEMS_KEY, JSON.stringify(preItems)); } catch (_) {}
        }
      } catch (_) {}

      try {
        const qDealers = query(collection(db, "predefined_dealers"), where("userId", "==", uid));
        const dealersSnap = await getDocsFromCache(qDealers);
        const preDealers = [];
        dealersSnap.forEach((d) => preDealers.push({ id: d.id, ...d.data() }));
        if (preDealers.length > 0) {
          setPredefinedDealers(preDealers);
          try { localStorage.setItem(LS_DEALERS_KEY, JSON.stringify(preDealers)); } catch (_) {}
        }
      } catch (_) {}

      if (id) {
        try {
          const invSnap = await getDocFromCache(doc(db, "invoices", id));
          if (invSnap.exists()) applyInvoiceData(invSnap.data());
        } catch (_) {}
      }

      // ── Show the form immediately after cache reads ──
      setLoading(false);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // PHASE 3 — Network refresh (background, online only)
      // Updates state silently without blocking the UI
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      if (!navigator.onLine) return;
      try {
        const profSnap = await getDoc(doc(db, "users", uid));
        if (profSnap.exists()) {
          const profData = profSnap.data();
          setProfile(profData);
          setInvoicePhone(profData.phone || "");
        }

        const qItems = query(collection(db, "predefined_items"), where("userId", "==", uid));
        const itemsSnap = await getDocs(qItems);
        const preItems = [];
        itemsSnap.forEach((d) => preItems.push({ id: d.id, ...d.data() }));
        setPredefinedItems(preItems);
        try { localStorage.setItem(LS_ITEMS_KEY, JSON.stringify(preItems)); } catch (_) {}

        const qDealers = query(collection(db, "predefined_dealers"), where("userId", "==", uid));
        const dealersSnap = await getDocs(qDealers);
        const preDealers = [];
        dealersSnap.forEach((d) => preDealers.push({ id: d.id, ...d.data() }));
        setPredefinedDealers(preDealers);
        try { localStorage.setItem(LS_DEALERS_KEY, JSON.stringify(preDealers)); } catch (_) {}

        if (id) {
          const invSnap = await getDoc(doc(db, "invoices", id));
          if (invSnap.exists()) applyInvoiceData(invSnap.data());
        } else {
          const qInv = query(collection(db, "invoices"), where("userId", "==", uid));
          const snap = await getDocs(qInv);
          const count = snap.size;
          try { localStorage.setItem(LS_INV_COUNT, String(count)); } catch (_) {}
          setInvoiceNumber((count + 391).toString());
        }
      } catch (err) {
        console.warn("Background network refresh failed:", err);
      }
    };

    // Helper: apply fetched invoice document fields to state
    const applyInvoiceData = (data) => {
      setInvoiceNumber(data.invoice_number);
      setDate(data.date);
      setDueDate(data.due_date || "");
      setTemplateType(data.template_type || "template1");
      setCustomerName(data.customer_name);
      setCustomerAddress(data.customer_address);
      setCustomerGstin(data.customer_gstin);
      setCustomerState(data.customer_state);
      setCustomerStateCode(data.customer_state_code);
      setNeedShipping(data.need_shipping || false);
      setShippingName(data.shipping_name || "");
      setShippingAddress(data.shipping_address || "");
      setShippingGstin(data.shipping_gstin || "");
      setShippingState(data.shipping_state || "Karnataka");
      setShippingStateCode(data.shipping_state_code || "29");
      setCgstPercent(data.cgst_percent?.toString() || "9");
      setSgstPercent(data.sgst_percent?.toString() || "9");
      setIgstPercent(data.igst_percent?.toString() || "18");
      setIsInterstate(data.is_interstate || false);
      setItems(data.items || []);
      setNotes(data.notes || "");
      setIrn(data.irn || "");
      setAckNo(data.ack_no || "");
      setAckDate(data.ack_date || "");
      setDeliveryNote(data.delivery_note || "");
      setPaymentMode(data.payment_mode || "Other");
      setRefNoDate(data.ref_no_date || "");
      setOtherReferences(data.other_references || "");
      setBuyerOrderNo(data.buyer_order_no || "");
      setBuyerOrderDate(data.buyer_order_date || "");
      setDispatchDocNo(data.dispatch_doc_no || "");
      setDispatchDocDate(data.dispatch_doc_date || "");
      setInvoicePhone(data.invoice_phone || data.phone || "");
      setShowWebsite(data.show_website !== false);
      setDispatchedThrough(data.dispatched_through || "");
      setDestination(data.destination || "");
      setTermsOfDelivery(data.terms_of_delivery || "");
    };

    loadInitData();
  }, [id]);

  // Auto-generate IRN and Ack details when invoiceNumber or date changes
  useEffect(() => {
    if (invoiceNumber || date) {
      const combined = `${invoiceNumber}-${date}`.trim();
      if (!combined || combined === "-") return;

      // Deterministic IRN Hash generator
      let hash = "";
      let seed = 0;
      for (let i = 0; i < combined.length; i++) {
        seed = (seed * 31 + combined.charCodeAt(i)) & 0xffffffff;
      }
      let tempSeed = seed;
      for (let j = 0; j < 8; j++) {
        tempSeed = Math.sin(tempSeed + j) * 10000;
        const hex = Math.abs(Math.floor(tempSeed)).toString(16).padEnd(8, "A").toUpperCase();
        hash += hex;
      }
      const finalIrn = hash.slice(0, 64);

      // Deterministic Ack No generator (12-digit e-invoice number like 122612345678)
      let ackSeed = 1;
      for (let i = 0; i < combined.length; i++) {
        ackSeed = (ackSeed * 131 + combined.charCodeAt(i)) % 1000000000;
      }
      const finalAck = `122${Math.floor(2000 + (Math.abs(ackSeed) % 8000))}${String(Math.abs(ackSeed) % 100000).padStart(5, "3")}`;

      setIrn(finalIrn);
      setAckNo(finalAck);
      setAckDate(date);
    }
  }, [invoiceNumber, date]);

  // Handle mobile PDF preview scale based on screen width
  useEffect(() => {
    if (!showMobilePreview) return;
    const updateScale = () => {
      const width = window.innerWidth;
      if (width < 780) {
        // PDF sheet minWidth is 760px, give 20px padding (10px each side)
        const scale = (width - 20) / 760;
        setModalScale(Math.max(0.25, Math.min(0.85, scale)));
      } else {
        setModalScale(0.85);
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [showMobilePreview]);

  // Autofill predefined item details on selection
  const handleSelectPredefinedItem = (index, itemId) => {
    if (!itemId) return;
    const selected = predefinedItems.find((pi) => pi.id === itemId);
    if (selected) {
      const list = [...items];
      list[index].description = selected.name;
      list[index].hsn_code = selected.hsn_code || "";
      list[index].rate = selected.rate;
      list[index].unit = selected.unit || "No";
      list[index].amount = (parseFloat(list[index].quantity) || 1) * selected.rate;
      setItems(list);
    }
  };

  // Add Item line
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { description: "", hsn_code: "", quantity: 1, unit: "No", rate: 0, amount: 0 }
    ]);
  };

  // Remove Item line
  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Row update helpers
  const handleRowChange = (index, field, value) => {
    const list = [...items];
    list[index][field] = value;
    
    if (field === "quantity" || field === "rate") {
      const q = parseFloat(field === "quantity" ? value : list[index].quantity) || 0;
      const r = parseFloat(field === "rate" ? value : list[index].rate) || 0;
      list[index].amount = q * r;
    }
    
    setItems(list);
  };

  // Quantity control buttons
  const handleQtyChange = (index, value) => {
    // Allows decimal inputs and typing manually
    const list = [...items];
    list[index].quantity = value;
    const q = parseFloat(value) || 0;
    const r = parseFloat(list[index].rate) || 0;
    list[index].amount = q * r;
    setItems(list);
  };

  const handleQtyIncrement = (index) => {
    const list = [...items];
    const q = (parseFloat(list[index].quantity) || 0) + 1;
    list[index].quantity = q;
    list[index].amount = q * (parseFloat(list[index].rate) || 0);
    setItems(list);
  };

  const handleQtyDecrement = (index) => {
    const list = [...items];
    const currentQ = parseFloat(list[index].quantity) || 0;
    if (currentQ <= 1) return;
    const q = currentQ - 1;
    list[index].quantity = q;
    list[index].amount = q * (parseFloat(list[index].rate) || 0);
    setItems(list);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (!customerName || !invoiceNumber) {
        setError("Please enter customer name and invoice number.");
        setSaving(false);
        return;
      }

      const invoicePayload = {
        userId: auth.currentUser.uid,
        invoice_number: invoiceNumber,
        date,
        due_date: dueDate,
        template_type: templateType,
        customer_name: customerName,
        customer_address: customerAddress,
        customer_gstin: (customerGstin || "").toUpperCase(),
        customer_state: customerState,
        customer_state_code: customerStateCode,
        need_shipping: needShipping,
        shipping_name: shippingName,
        shipping_address: shippingAddress,
        shipping_gstin: (shippingGstin || "").toUpperCase(),
        shipping_state: shippingState,
        shipping_state_code: shippingStateCode,
        cgst_percent: parseFloat(cgstPercent) || 0,
        sgst_percent: parseFloat(sgstPercent) || 0,
        igst_percent: parseFloat(igstPercent) || 0,
        is_interstate: isInterstate,
        items: items.map((it) => ({
          description: it.description || "",
          hsn_code: it.hsn_code || "",
          quantity: parseFloat(it.quantity) || 0,
          unit: it.unit || "No",
          rate: parseFloat(it.rate) || 0,
          amount: (parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0)
        })),
        notes,
        
        // template 2 specific
        irn: templateType === "template2" ? irn || "MockIRN-" + Math.random().toString(36).substring(4).toUpperCase() : "",
        ack_no: templateType === "template2" ? ackNo : "",
        ack_date: templateType === "template2" ? ackDate : "",
        delivery_note: deliveryNote,
        payment_mode: paymentMode,
        ref_no_date: refNoDate,
        other_references: otherReferences,
        buyer_order_no: buyerOrderNo,
        buyer_order_date: buyerOrderDate,
        dispatch_doc_no: dispatchDocNo,
        dispatch_doc_date: dispatchDocDate,
        dispatched_through: dispatchedThrough,
        destination: destination,
        terms_of_delivery: termsOfDelivery,
        invoice_phone: invoicePhone,
        show_website: showWebsite,
        updated_at: new Date().toISOString()
      };

      const isOffline = !navigator.onLine;
      const invoiceDocId = id || doc(collection(db, "invoices")).id;
      let pdfUrl = "";

      // Attempt background PDF generation and upload if online (non-blocking)
      if (!isOffline) {
        (async () => {
          try {
            const element = document.getElementById("hidden-pdf-print-target");
            if (element) {
              const opt = {
                margin:       0,
                filename:     `Invoice_${invoiceNumber}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2.0, useCORS: true, letterRendering: true },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
              };
              const pdfBlob = await html2pdf().from(element).set(opt).output('blob');
              const storageRef = ref(storage, `invoices/${invoiceDocId}.pdf`);
              await uploadBytes(storageRef, pdfBlob);
              const downloadUrl = await getDownloadURL(storageRef);
              
              // Update the invoice doc with the pdf_url silently in the background
              await setDoc(doc(db, "invoices", invoiceDocId), { pdf_url: downloadUrl }, { merge: true });
            }
          } catch (storageErr) {
            console.warn("Background Firebase Storage PDF upload skipped or failed:", storageErr);
          }
        })();
      }

      const finalPayload = {
        ...invoicePayload,
        pdf_url: pdfUrl
      };

      if (id) {
        // Edit mode
        await setDoc(doc(db, "invoices", id), finalPayload, { merge: true });
        if (isOffline) {
          setToast({ message: "Updated offline — will sync when back online", type: "warning" });
          setTimeout(() => navigate("/"), 1800);
        } else {
          navigate(`/invoices/view/${id}`);
        }
      } else {
        // Create mode
        await setDoc(doc(db, "invoices", invoiceDocId), {
          ...finalPayload,
          created_at: new Date().toISOString()
        });
        if (isOffline) {
          // Increment cached count for next offline invoice number
          try {
            const prev = parseInt(localStorage.getItem(LS_INV_COUNT) || "0", 10);
            localStorage.setItem(LS_INV_COUNT, String(prev + 1));
          } catch (_) {}
          setToast({ message: "Invoice saved offline — will sync when back online", type: "warning" });
          setTimeout(() => navigate("/"), 1800);
        } else {
          navigate(`/invoices/view/${invoiceDocId}`);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save the invoice. Please check parameters.");
    } finally {
      setSaving(false);
    }
  };

  const previewInvoiceData = {
    id: id || "temp-preview-id",
    invoice_number: invoiceNumber,
    date,
    due_date: dueDate,
    template_type: templateType,
    customer_name: customerName || "Customer Name Placeholder",
    customer_address: customerAddress || "Customer Billing Address",
    customer_gstin: customerGstin,
    customer_state: customerState,
    customer_state_code: customerStateCode,
    need_shipping: needShipping,
    shipping_name: shippingName || customerName || "Shipping Name Placeholder",
    shipping_address: shippingAddress || customerAddress || "Shipping Address Placeholder",
    shipping_gstin: shippingGstin || customerGstin,
    shipping_state: shippingState,
    shipping_state_code: shippingStateCode,
    cgst_percent: cgstPercent,
    sgst_percent: sgstPercent,
    igst_percent: igstPercent,
    is_interstate: isInterstate,
    items,
    notes,
    irn,
    ack_no: ackNo,
    ack_date: ackDate,
    delivery_note: deliveryNote,
    payment_mode: paymentMode,
    ref_no_date: refNoDate,
    other_references: otherReferences,
    buyer_order_no: buyerOrderNo,
    buyer_order_date: buyerOrderDate,
    dispatch_doc_no: dispatchDocNo,
    dispatch_doc_date: dispatchDocDate,
    dispatched_through: dispatchedThrough,
    destination: destination,
    terms_of_delivery: termsOfDelivery
  };

  // Build org data override — merges saved profile with per-invoice phone and website toggle
  const previewOrgData = profile ? {
    ...profile,
    phone: invoicePhone || profile.phone || "",
    show_website: showWebsite
  } : null;

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Loader className="animate-spin" size={32} />
      </div>
    );
  }

  // Download PDF from hidden target
  const handleDownloadPdf = () => {
    const element = document.getElementById("hidden-pdf-print-target");
    if (!element) return;
    const opt = {
      margin: 0,
      filename: `Invoice_${invoiceNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2.5, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().from(element).set(opt).save();
  };

  return (
    <div className="app-container">
      {/* Hidden print container for always-on PDF generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '760px' }}>
        <div id="hidden-pdf-print-target">
          {templateType === "template1" ? (
            <Template1 invoiceData={previewInvoiceData} orgData={previewOrgData} />
          ) : templateType === "template3" ? (
            <Template3 invoiceData={previewInvoiceData} orgData={previewOrgData} />
          ) : (
            <Template2 invoiceData={previewInvoiceData} orgData={previewOrgData} />
          )}
        </div>
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <Sidebar userProfile={profile} />
      <main className="main-content editor-main" style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "100px" }}>
        
        {/* Header toolbar */}
        <div className="no-print editor-toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={() => navigate("/")} style={{ padding: "8px", borderRadius: "8px", backgroundColor: "var(--card-bg)", color: "var(--text-primary)", flexShrink: 0 }}>
              <ArrowLeft size={18} />
            </button>
            <h1 className="editor-title">{id ? "Edit Invoice" : "Create New Invoice"}</h1>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {/* View PDF Button (Always Visible) */}
            <button
              type="button"
              className="mobile-preview-trigger"
              onClick={() => setShowMobilePreview(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                borderRadius: "8px",
                backgroundColor: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                color: "var(--text-primary)",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              👁️ View PDF
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                borderRadius: "10px",
                backgroundColor: "var(--accent-color)",
                color: "#fff",
                fontWeight: "600",
                fontSize: "14px",
                flexShrink: 0,
                boxShadow: "0 4px 12px 0 rgba(59, 130, 246, 0.2)",
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
              {saving ? "Saving..." : "Save Invoice"}
            </button>
          </div>
        </div>

        {error && (
          <div className="glass no-print" style={{ padding: "12px 20px", borderLeft: "4px solid var(--danger-color)", color: "var(--danger-color)" }}>
            <AlertCircle size={18} style={{ marginRight: "10px", verticalAlign: "middle" }} />
            <span>{error}</span>
          </div>
        )}

        {/* Builder Work Area: Split screen */}
        <div className="invoice-builder-layout">
          
          {/* Left panel: Input Form */}
          <div className="glass no-print editor-form-panel" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Template Selector & Meta */}
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "var(--accent-color)" }}>Invoice Templates</h3>
              <div className="template-selector-grid" style={{ gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setTemplateType("template1")}
                  style={{
                    padding: "12px 8px",
                    borderRadius: "10px",
                    border: templateType === "template1" ? "2px solid var(--accent-color)" : "1px solid var(--border-color)",
                    backgroundColor: templateType === "template1" ? "var(--accent-glow)" : "var(--input-bg)",
                    color: "var(--text-primary)",
                    fontWeight: "600",
                    fontSize: "12px",
                    textAlign: "center"
                  }}
                >
                  <span className="template-btn-full">Icon Systems GST Style</span>
                  <span className="template-btn-short">1</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType("template2")}
                  style={{
                    padding: "12px 8px",
                    borderRadius: "10px",
                    border: templateType === "template2" ? "2px solid var(--accent-color)" : "1px solid var(--border-color)",
                    backgroundColor: templateType === "template2" ? "var(--accent-glow)" : "var(--input-bg)",
                    color: "var(--text-primary)",
                    fontWeight: "600",
                    fontSize: "12px",
                    textAlign: "center"
                  }}
                >
                  <span className="template-btn-full">Tax / e-Invoice Style</span>
                  <span className="template-btn-short">2</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType("template3")}
                  style={{
                    padding: "12px 8px",
                    borderRadius: "10px",
                    border: templateType === "template3" ? "2px solid var(--accent-color)" : "1px solid var(--border-color)",
                    backgroundColor: templateType === "template3" ? "var(--accent-glow)" : "var(--input-bg)",
                    color: "var(--text-primary)",
                    fontWeight: "600",
                    fontSize: "12px",
                    textAlign: "center"
                  }}
                >
                  <span className="template-btn-full">Pre-Printed Letterhead Style</span>
                  <span className="template-btn-short">3</span>
                </button>
              </div>
            </div>

            {/* General Meta Info */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
              <div className="form-grid-2">
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>INVOICE NUMBER</label>
                  <input required type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="e.g. 391" />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>INVOICE DATE</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Customer Lookup & Inputs */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>CUSTOMER INFO</label>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                {/* Autocomplete Input Container */}
                <div style={{ position: "relative" }}>
                  <input
                    required
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => {
                      // Delay hiding suggestions so click event on suggestion item fires first
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    placeholder="Customer Company Name"
                    autoComplete="off"
                    style={{ width: "100%" }}
                  />
                  
                  {/* Floating Autocomplete Suggestions Box */}
                  {showSuggestions && predefinedDealers.length > 0 && (
                    <div style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      backgroundColor: "#111827", /* Matches dark theme input container card */
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
                      zIndex: 100,
                      maxHeight: "300px",
                      overflowY: "auto",
                      marginTop: "4px"
                    }}>
                      {(() => {
                        const list = customerName
                          ? predefinedDealers.filter(d => d.name?.toLowerCase().includes(customerName.toLowerCase()))
                          : predefinedDealers;
                        
                        const sortedList = [...list].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

                        if (sortedList.length === 0) {
                          return (
                            <div style={{ padding: "10px 14px", color: "var(--text-secondary)", fontSize: "12px" }}>
                              No matching dealers found
                            </div>
                          );
                        }

                        return sortedList.map((d) => (
                          <div
                            key={d.id}
                            onMouseDown={() => {
                              /* Use onMouseDown instead of onClick to prevent input onBlur from hiding dropdown first */
                              setCustomerName(d.name || "");
                              setCustomerAddress(d.address || "");
                              setCustomerGstin(d.gstin || "");
                              setCustomerStateCode(d.state_code || "29");
                              setShowSuggestions(false);
                            }}
                            style={{
                              padding: "10px 14px",
                              cursor: "pointer",
                              borderBottom: "1px solid rgba(255,255,255,0.05)",
                              fontSize: "13px",
                              textAlign: "left"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.15)"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                          >
                            <div style={{ color: "var(--accent-color)", fontWeight: "700" }}>{d.name}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {d.gstin ? `GSTIN: ${d.gstin} | ` : ""}{d.address || "No address"}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>

                <textarea rows={3} value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Full Billing Address" />
                
                <div className="form-grid-2">
                  <input type="text" value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)} placeholder="Customer GSTIN" style={{ textTransform: "uppercase" }} />
                  <input type="text" value={customerStateCode} onChange={(e) => setCustomerStateCode(e.target.value)} placeholder="State Code (e.g. 29)" />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "5px" }}>
                  <input 
                    type="checkbox" 
                    id="needShipping" 
                    checked={needShipping} 
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setNeedShipping(checked);
                      if (checked) {
                        if (!shippingName) setShippingName(customerName);
                        if (!shippingAddress) setShippingAddress(customerAddress);
                        if (!shippingGstin) setShippingGstin(customerGstin);
                        if (!shippingState) setShippingState(customerState);
                        if (!shippingStateCode) setShippingStateCode(customerStateCode);
                      }
                    }} 
                  />
                  <label htmlFor="needShipping" style={{ fontSize: "12px", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }}>
                    Enable Shipping Details (Consignee)
                  </label>
                </div>

                {needShipping && (
                  <div style={{ borderLeft: "2px solid var(--accent-color)", paddingLeft: "12px", display: "flex", flexDirection: "column", gap: "12px", marginTop: "5px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--accent-color)" }}>SHIPPING DETAILS (CONSIGNEE)</div>
                    <input 
                      type="text" 
                      value={shippingName} 
                      onChange={(e) => setShippingName(e.target.value)} 
                      placeholder="Consignee Name" 
                    />
                    <textarea 
                      rows={2} 
                      value={shippingAddress} 
                      onChange={(e) => setShippingAddress(e.target.value)} 
                      placeholder="Consignee Shipping Address" 
                    />
                    <div className="form-grid-2">
                      <input 
                        type="text" 
                        value={shippingGstin} 
                        onChange={(e) => setShippingGstin(e.target.value)} 
                        placeholder="Consignee GSTIN" 
                        style={{ textTransform: "uppercase" }} 
                      />
                      <input 
                        type="text" 
                        value={shippingStateCode} 
                        onChange={(e) => setShippingStateCode(e.target.value)} 
                        placeholder="State Code (e.g. 29)" 
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Invoice Phone Number Override ── */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>
                  📞 INVOICE PHONE NUMBER
                </label>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)", opacity: 0.7 }}>(shown on invoice header)</span>
              </div>
              <input
                type="tel"
                value={invoicePhone}
                onChange={(e) => setInvoicePhone(e.target.value)}
                placeholder="e.g. 9845913976, 8884880066"
              />
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "6px", opacity: 0.75 }}>
                Pre-filled from your Org Profile. Change here to use a different number on this invoice only.
              </p>

              {/* Website toggle */}
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginTop: "14px",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid var(--border-color)",
                backgroundColor: "var(--input-bg)",
                cursor: "pointer",
                userSelect: "none"
              }}>
                <input
                  type="checkbox"
                  checked={showWebsite}
                  onChange={(e) => setShowWebsite(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--accent-color)" }}
                />
                <div>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>🌐 Show website on invoice</span>
                  <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "2px 0 0" }}>
                    {showWebsite ? `Website (${profile?.website || "www.iconsystemsblr.com"}) will appear in the invoice header` : "Website will be hidden from this invoice"}
                  </p>
                </div>
              </label>
            </div>

            {/* Template 2 Specific Details */}
            {templateType === "template2" && (
              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "15px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>e-INVOICE LOGISTICS DETAILS</h3>
                  <span style={{ fontSize: "11px", color: "var(--success-color)", fontWeight: "600" }}>✓ Auto-generated from Inv No & Date</span>
                </div>
                <div className="form-grid-2">
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "10px", color: "var(--text-secondary)" }}>IRN HASH (64 CHAR)</label>
                    <input type="text" value={irn} readOnly placeholder="Automatically generated" style={{ fontSize: "11px", opacity: 0.85, cursor: "not-allowed", backgroundColor: "rgba(255,255,255,0.02)", width: "100%" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "10px", color: "var(--text-secondary)" }}>ACK NO.</label>
                    <input type="text" value={ackNo} readOnly placeholder="Automatically generated" style={{ opacity: 0.85, cursor: "not-allowed", backgroundColor: "rgba(255,255,255,0.02)", width: "100%" }} />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "10px", color: "var(--text-secondary)" }}>ACK DATE</label>
                    <input type="date" value={ackDate} readOnly style={{ opacity: 0.85, cursor: "not-allowed", backgroundColor: "rgba(255,255,255,0.02)", width: "100%" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "10px", color: "var(--text-secondary)" }}>PAYMENT MODE</label>
                    <input type="text" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} placeholder="e.g. Cash / Credit / Bank" />
                  </div>
                </div>
                <div className="form-grid-2">
                  <input type="text" value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} placeholder="Delivery Note" />
                  <input type="text" value={refNoDate} onChange={(e) => setRefNoDate(e.target.value)} placeholder="Ref No & Date" />
                </div>
                <div className="form-grid-2">
                  <input type="text" value={buyerOrderNo} onChange={(e) => setBuyerOrderNo(e.target.value)} placeholder="Buyer Order No" />
                  <input type="text" value={dispatchedThrough} onChange={(e) => setDispatchedThrough(e.target.value)} placeholder="Dispatched Through (e.g. Courier)" />
                </div>
                <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Destination City" />
                <textarea rows={2} value={termsOfDelivery} onChange={(e) => setTermsOfDelivery(e.target.value)} placeholder="Terms of Delivery" />
              </div>
            )}

            {/* Writable Tax Configuration */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>GST CONFIGURATION (WRITABLE TAXES)</h3>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
                  <input type="checkbox" checked={isInterstate} onChange={(e) => setIsInterstate(e.target.checked)} style={{ width: "auto" }} />
                  Interstate (IGST)
                </label>
              </div>

              {isInterstate ? (
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>IGST RATE (%)</label>
                  <div style={{ position: "relative" }}>
                    <input type="number" step="0.5" value={igstPercent} onChange={(e) => setIgstPercent(e.target.value)} />
                    <Percent size={14} style={{ position: "absolute", right: "14px", top: "16px", color: "var(--text-secondary)" }} />
                  </div>
                </div>
              ) : (
                <div className="form-grid-2">
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>CGST RATE (%)</label>
                    <div style={{ position: "relative" }}>
                      <input type="number" step="0.5" value={cgstPercent} onChange={(e) => setCgstPercent(e.target.value)} />
                      <Percent size={14} style={{ position: "absolute", right: "14px", top: "16px", color: "var(--text-secondary)" }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>SGST RATE (%)</label>
                    <div style={{ position: "relative" }}>
                      <input type="number" step="0.5" value={sgstPercent} onChange={(e) => setSgstPercent(e.target.value)} />
                      <Percent size={14} style={{ position: "absolute", right: "14px", top: "16px", color: "var(--text-secondary)" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Line Items Editor with +/- Qty Controls */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>PRODUCT LINE ITEMS</h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(59,130,246,0.1)",
                    color: "var(--accent-color)",
                    fontSize: "12px",
                    fontWeight: "600"
                  }}
                >
                  <Plus size={14} /> Add Line
                </button>
              </div>

              {/* Rows loop */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {items.map((item, idx) => (
                  <div key={idx} className="bordered-box item-card" style={{
                    padding: "16px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "10px",
                    backgroundColor: "rgba(255,255,255,0.01)",
                    position: "relative",
                    overflow: "visible"
                  }}>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        style={{
                          position: "absolute",
                          top: "12px",
                          right: "12px",
                          color: "var(--danger-color)",
                          background: "transparent",
                          padding: "4px"
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px", position: "relative" }}>
                      <input
                        required
                        type="text"
                        placeholder="Description of Goods (e.g. Sensor cable)"
                        value={item.description}
                        onChange={(e) => {
                          handleRowChange(idx, "description", e.target.value);
                          setFocusedItemRowIndex(idx);
                        }}
                        onFocus={() => setFocusedItemRowIndex(idx)}
                        onBlur={() => {
                          setTimeout(() => setFocusedItemRowIndex(null), 200);
                        }}
                        autoComplete="off"
                        style={{ width: "100%" }}
                      />

                      {/* Floating Autocomplete Suggestions Box for Predefined Items */}
                      {focusedItemRowIndex === idx && predefinedItems.length > 0 && (
                        <div style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          backgroundColor: "#111827",
                          border: "1px solid var(--border-color)",
                          borderRadius: "8px",
                          boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
                          zIndex: 100,
                          maxHeight: "300px",
                          overflowY: "auto",
                          marginTop: "4px"
                        }}>
                          {(() => {
                            const queryVal = item.description || "";
                            const list = queryVal
                              ? predefinedItems.filter(pi => pi.name?.toLowerCase().includes(queryVal.toLowerCase()))
                              : predefinedItems;

                            const sortedList = [...list].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

                            if (sortedList.length === 0) {
                              return (
                                <>
                                  <div
                                    onMouseDown={() => setFocusedItemRowIndex(null)}
                                    style={{
                                      padding: "8px 14px",
                                      cursor: "pointer",
                                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                                      fontSize: "12px",
                                      color: "var(--text-secondary)",
                                      textAlign: "right",
                                      fontWeight: "600"
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                  >
                                    ✕ Close List
                                  </div>
                                  <div style={{ padding: "10px 14px", color: "var(--text-secondary)", fontSize: "12px" }}>
                                    No matching items found
                                  </div>
                                </>
                              );
                            }

                            return (
                              <>
                                <div
                                  onMouseDown={() => setFocusedItemRowIndex(null)}
                                  style={{
                                    padding: "8px 14px",
                                    cursor: "pointer",
                                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                                    fontSize: "12px",
                                    color: "var(--text-secondary)",
                                    textAlign: "right",
                                    fontWeight: "600"
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                >
                                  ✕ Close List
                                </div>
                                {sortedList.map((pi) => (
                                  <div
                                    key={pi.id}
                                    onMouseDown={() => {
                                      handleSelectPredefinedItem(idx, pi.id);
                                      setFocusedItemRowIndex(null);
                                    }}
                                    style={{
                                      padding: "10px 14px",
                                      cursor: "pointer",
                                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                                      fontSize: "13px",
                                      textAlign: "left"
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.15)"}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                  >
                                    <div style={{ fontWeight: "700", color: "var(--accent-color)", marginBottom: "2px" }}>
                                      {pi.name}
                                    </div>
                                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", display: "flex", gap: "10px" }}>
                                      <span>HSN: {pi.hsn_code || "N/A"}</span>
                                      <span>Unit: {pi.unit || "No"}</span>
                                      <span>Price: ₹{pi.rate}</span>
                                    </div>
                                  </div>
                                ))}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* HSN, Unit, Qty, Rate, Amount in cleaner grid */}
                    <div className="item-row-grid">
                      <div>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "10px", color: "var(--text-secondary)" }}>HSN/SAC</label>
                        <input
                          type="text"
                          placeholder="e.g. 9032"
                          value={item.hsn_code}
                          onChange={(e) => handleRowChange(idx, "hsn_code", e.target.value)}
                          style={{ padding: "8px 10px", fontSize: "13px", width: "100%" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "10px", color: "var(--text-secondary)" }}>UNIT</label>
                        <input
                          type="text"
                          placeholder="No / mts"
                          value={item.unit}
                          onChange={(e) => handleRowChange(idx, "unit", e.target.value)}
                          style={{ padding: "8px 10px", fontSize: "13px", width: "100%" }}
                        />
                      </div>

                      {/* QTY with +/- buttons */}
                      <div>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "10px", color: "var(--text-secondary)" }}>QUANTITY</label>
                        <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden", backgroundColor: "var(--input-bg)" }}>
                          <button
                            type="button"
                            onClick={() => handleQtyDecrement(idx)}
                            style={{ padding: "8px 10px", fontWeight: "bold", fontSize: "16px", color: "var(--text-secondary)", background: "transparent", flexShrink: 0, borderRight: "1px solid var(--border-color)" }}
                          >−</button>
                          <input
                            type="text"
                            value={item.quantity}
                            onChange={(e) => handleQtyChange(idx, e.target.value)}
                            style={{ flex: 1, padding: "8px 4px", fontSize: "13px", textAlign: "center", border: "none", background: "transparent", color: "var(--text-primary)", width: "100%" }}
                          />
                          <button
                            type="button"
                            onClick={() => handleQtyIncrement(idx)}
                            style={{ padding: "8px 10px", fontWeight: "bold", fontSize: "16px", color: "var(--accent-color)", background: "transparent", flexShrink: 0, borderLeft: "1px solid var(--border-color)" }}
                          >+</button>
                        </div>
                      </div>

                      <div>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "10px", color: "var(--text-secondary)" }}>RATE (₹)</label>
                        <input
                          required
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={item.rate === 0 ? "" : item.rate}
                          onChange={(e) => handleRowChange(idx, "rate", e.target.value)}
                          style={{ padding: "8px 10px", fontSize: "13px", width: "100%" }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "10px", color: "var(--text-secondary)" }}>AMOUNT</label>
                        <div style={{ padding: "9px 10px", fontWeight: "700", fontSize: "13px", color: "var(--accent-color)", border: "1px solid var(--border-color)", borderRadius: "8px", backgroundColor: "rgba(59,130,246,0.05)", minHeight: "38px" }}>
                          ₹{(parseFloat(item.amount) || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>

                  </div>
                ))}
              </div>

              {/* Bottom Add Line Button */}
              <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={handleAddItem}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "12px",
                    borderRadius: "10px",
                    backgroundColor: "rgba(59, 130, 246, 0.08)",
                    color: "var(--accent-color)",
                    fontSize: "13px",
                    fontWeight: "700",
                    border: "2px dashed rgba(59, 130, 246, 0.4)",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  <Plus size={16} /> Add Product Line Item
                </button>
              </div>
            </div>

            {/* Note & Bottom Declarations */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>INVOICE FOOTER NOTE</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Terms, payments notices..." />
            </div>

          </div>

          {/* Right panel: Live PDF Preview */}
          <div className="invoice-preview-panel" style={{
            borderRadius: "16px",
            border: "1px solid var(--card-border)",
            boxShadow: "var(--shadow-main)",
            backgroundColor: "#525659", // Gray canvas background to make A4 stand out
            padding: "24px 10px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 14px 14px", color: "#fff" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "1px" }}>LIVE PRINT PREVIEW (A4)</span>
              <span style={{ fontSize: "11px", opacity: 0.7 }}>Scroll to view full page</span>
            </div>
            
            {/* Preview Sheet Container */}
            <div style={{ transform: "scale(0.96)", transformOrigin: "top center", overflowX: "auto", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
              <div style={{ minWidth: "760px" }}>
                {templateType === "template1" ? (
                  <Template1 invoiceData={previewInvoiceData} orgData={previewOrgData} />
                ) : templateType === "template3" ? (
                  <Template3 invoiceData={previewInvoiceData} orgData={previewOrgData} />
                ) : (
                  <Template2 invoiceData={previewInvoiceData} orgData={previewOrgData} />
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Full-screen Mobile Preview Modal */}
        {showMobilePreview && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            backgroundColor: "#2a2b2d",
            display: "flex",
            flexDirection: "column",
            padding: "10px"
          }}>
            {/* Header controls inside modal */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 15px", borderBottom: "1px solid #444", color: "#fff", marginBottom: "15px" }}>
              <button
                type="button"
                onClick={() => setShowMobilePreview(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  backgroundColor: "#ef4444",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px"
                }}
              >
                ⬅ Back to Editor
              </button>
              <span style={{ fontSize: "14px", fontWeight: "bold" }}>A4 PDF PREVIEW</span>
              <button
                type="button"
                onClick={handleDownloadPdf}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  backgroundColor: "#3b82f6",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px"
                }}
              >
                Download
              </button>
            </div>
            
            {/* Modal Scroll Container */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "10px 0" }}>
              <div style={{ transform: `scale(${modalScale})`, transformOrigin: "top center", overflowX: "auto", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", width: "100%", maxWidth: "800px" }}>
                <div style={{ minWidth: "760px", backgroundColor: "#fff" }}>
                  {templateType === "template1" ? (
                    <Template1 invoiceData={previewInvoiceData} orgData={previewOrgData} />
                  ) : templateType === "template3" ? (
                    <Template3 invoiceData={previewInvoiceData} orgData={previewOrgData} />
                  ) : (
                    <Template2 invoiceData={previewInvoiceData} orgData={previewOrgData} />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Sticky Bottom Actions Bar for Mobile (≤ 992px) */}
      <div className="mobile-bottom-bar no-print" style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "var(--card-bg)",
        borderTop: "1px solid var(--border-color)",
        padding: "12px 16px",
        display: "none",
        justifyContent: "space-between",
        gap: "12px",
        zIndex: 990,
        boxShadow: "0 -4px 12px rgba(0,0,0,0.15)",
        backdropFilter: "blur(8px)",
      }}>
        <button
          type="button"
          onClick={() => setShowMobilePreview(true)}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "12px",
            borderRadius: "8px",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            color: "var(--accent-color)",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer"
          }}
        >
          👁️ View PDF
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "12px",
            borderRadius: "8px",
            backgroundColor: "var(--accent-color)",
            border: "none",
            color: "#fff",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer"
          }}
        >
          {saving ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
          Save Invoice
        </button>
      </div>
    </div>
  );
}
