import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { Plus, Trash2, Tag, AlertCircle, Loader, PackagePlus, CheckCircle, Users, UserPlus, Edit2 } from "lucide-react";

export default function Items() {
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [activeTab, setActiveTab] = useState("items"); // "items" or "dealers"
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null); // ID of item/dealer being edited

  // Item Form State
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [unit, setUnit] = useState("No");

  // Dealer Form State
  const [dealerName, setDealerName] = useState("");
  const [dealerAddress, setDealerAddress] = useState("");
  const [dealerGstin, setDealerGstin] = useState("");
  const [dealerStateCode, setDealerStateCode] = useState("29");

  const fetchData = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      // Fetch org profile
      const profSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (profSnap.exists()) setProfile(profSnap.data());

      // Fetch predefined items
      const q = query(collection(db, "predefined_items"), where("userId", "==", auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      const list = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setItems(list);

      // Fetch predefined dealers
      const qd = query(collection(db, "predefined_dealers"), where("userId", "==", auth.currentUser.uid));
      const qdSnap = await getDocs(qd);
      const dList = [];
      qdSnap.forEach((doc) => {
        dList.push({ id: doc.id, ...doc.data() });
      });
      setDealers(dList);
    } catch (e) {
      console.error("fetchData error:", e);
      setError(`Failed to fetch database data: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for auth state to be ready before fetching
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchData();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAddItem = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name || !rate) {
      setError("Item name and rate are required.");
      return;
    }

    if (!auth.currentUser) {
      setError("You must be logged in to save items. Please refresh and try again.");
      return;
    }

    setSaving(true);
    try {
      const newItem = {
        userId: auth.currentUser.uid,
        name: name.trim(),
        rate: parseFloat(rate) || 0,
        hsn_code: hsnCode.trim(),
        unit: unit.trim() || "No"
      };

      if (editingId) {
        await updateDoc(doc(db, "predefined_items", editingId), newItem);
        setItems((prev) => prev.map((item) => item.id === editingId ? { id: editingId, ...newItem } : item));
        setSuccess(`"${name.trim()}" updated successfully!`);
      } else {
        const docRef = await addDoc(collection(db, "predefined_items"), newItem);
        setItems((prev) => [...prev, { id: docRef.id, ...newItem }]);
        setSuccess(`"${name.trim()}" added to inventory!`);
      }

      // Reset form
      setName("");
      setRate("");
      setHsnCode("");
      setUnit("No");
      setAdding(false);
      setEditingId(null);
    } catch (err) {
      console.error("Firestore write error:", err);
      setError(`Failed to save item: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteDoc(doc(db, "predefined_items", id));
      setItems((prev) => prev.filter((i) => i.id !== id));
      setSuccess("Item deleted successfully.");
    } catch (err) {
      console.error(err);
      setError("Failed to delete item.");
    }
  };

  const handleAddDealer = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!dealerName) {
      setError("Dealer name is required.");
      return;
    }

    if (!auth.currentUser) {
      setError("You must be logged in to save dealers. Please refresh and try again.");
      return;
    }

    setSaving(true);
    try {
      const newDealer = {
        userId: auth.currentUser.uid,
        name: dealerName.trim(),
        address: dealerAddress.trim(),
        gstin: dealerGstin.trim().toUpperCase(),
        state_code: dealerStateCode.trim()
      };

      if (editingId) {
        await updateDoc(doc(db, "predefined_dealers", editingId), newDealer);
        setDealers((prev) => prev.map((dealer) => dealer.id === editingId ? { id: editingId, ...newDealer } : dealer));
        setSuccess(`Dealer "${dealerName.trim()}" updated successfully!`);
      } else {
        const docRef = await addDoc(collection(db, "predefined_dealers"), newDealer);
        setDealers((prev) => [...prev, { id: docRef.id, ...newDealer }]);
        setSuccess(`Dealer "${dealerName.trim()}" added successfully!`);
      }

      // Reset form
      setDealerName("");
      setDealerAddress("");
      setDealerGstin("");
      setDealerStateCode("29");
      setAdding(false);
      setEditingId(null);
    } catch (err) {
      console.error("Firestore write error:", err);
      setError(`Failed to save dealer: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDealer = async (id) => {
    if (!window.confirm("Are you sure you want to delete this dealer?")) return;
    try {
      await deleteDoc(doc(db, "predefined_dealers", id));
      setDealers((prev) => prev.filter((d) => d.id !== id));
      setSuccess("Dealer deleted successfully.");
    } catch (err) {
      console.error(err);
      setError("Failed to delete dealer.");
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
        <Header title="Predefined Inventory & Dealers" />

        {error && (
          <div className="glass" style={{ padding: "12px 20px", marginBottom: "20px", borderLeft: "4px solid var(--danger-color)", color: "var(--danger-color)" }}>
            <AlertCircle size={18} style={{ marginRight: "10px", verticalAlign: "middle" }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="glass" style={{ padding: "12px 20px", marginBottom: "20px", borderLeft: "4px solid var(--success-color)", color: "var(--text-primary)" }}>
            <span>{success}</span>
          </div>
        )}

        {/* Tab Selection Bar */}
        <div className="glass" style={{ display: "flex", gap: "10px", padding: "8px", borderRadius: "12px", marginBottom: "24px", width: "fit-content" }}>
          <button
            onClick={() => {
              setActiveTab("items");
              setAdding(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "8px",
              backgroundColor: activeTab === "items" ? "rgba(59, 130, 246, 0.15)" : "transparent",
              color: activeTab === "items" ? "var(--accent-color)" : "var(--text-secondary)",
              fontWeight: "600",
              fontSize: "14px",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <Tag size={16} />
            Manage Items
          </button>
          <button
            onClick={() => {
              setActiveTab("dealers");
              setAdding(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "8px",
              backgroundColor: activeTab === "dealers" ? "rgba(59, 130, 246, 0.15)" : "transparent",
              color: activeTab === "dealers" ? "var(--accent-color)" : "var(--text-secondary)",
              fontWeight: "600",
              fontSize: "14px",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <Users size={16} />
            Manage Dealers
          </button>
        </div>

        {/* Section Heading & Add Action */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)" }}>
            {activeTab === "items" ? "Inventory Items" : "Dealers & Customers"}
          </h2>
          <button
            onClick={() => {
              if (adding) {
                // Cancel/Reset Form
                setName("");
                setRate("");
                setHsnCode("");
                setUnit("No");
                setDealerName("");
                setDealerAddress("");
                setDealerGstin("");
                setDealerStateCode("29");
                setEditingId(null);
              }
              setAdding(!adding);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "10px",
              backgroundColor: adding ? "var(--border-color)" : "var(--accent-color)",
              color: "#fff",
              fontWeight: "600",
              fontSize: "14px",
              border: "none",
              cursor: "pointer"
            }}
          >
            <Plus size={16} />
            {adding ? "Cancel" : activeTab === "items" ? "Add New Item" : "Add New Dealer"}
          </button>
        </div>

        {/* Condition 1: Items Tab Content */}
        {activeTab === "items" && (
          <>
            {/* Add Item Form */}
            {adding && (
              <form onSubmit={handleAddItem} className="glass" style={{ padding: "32px", marginBottom: "32px" }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", fontSize: "16px", fontWeight: "600" }}>
                  {editingId ? <Edit2 size={18} style={{ color: "var(--accent-color)" }} /> : <PackagePlus size={18} style={{ color: "var(--accent-color)" }} />}
                  {editingId ? "Edit Product Details" : "Predefine Product Details"}
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "24px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>PRODUCT/ITEM NAME</label>
                    <input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wire Systems / Sensor Cable" />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>RATE / UNIT PRICE (₹)</label>
                    <input required type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 3500.00" />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "24px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>HSN/SAC CODE</label>
                    <input type="text" value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} placeholder="e.g. 9032 / 8544" />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>DEFAULT UNIT</label>
                    <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. No / mts / nos" />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "12px 24px",
                      borderRadius: "8px",
                      backgroundColor: "var(--accent-color)",
                      color: "#fff",
                      fontWeight: "600",
                      fontSize: "14px",
                      boxShadow: "0 4px 10px 0 rgba(59, 130, 246, 0.2)",
                      opacity: saving ? 0.7 : 1,
                      cursor: saving ? "not-allowed" : "pointer",
                      border: "none"
                    }}
                  >
                    {saving ? <Loader size={15} className="animate-spin" /> : editingId ? <Edit2 size={15} /> : <PackagePlus size={15} />}
                    {saving ? "Saving..." : editingId ? "Update Product" : "Save Product"}
                  </button>
                </div>
              </form>
            )}

            {/* Predefined Items Table */}
            <div className="glass items-table-wrapper">
              {items.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
                  <Tag size={48} style={{ strokeWidth: 1, marginBottom: "12px" }} />
                  <p>No predefined items saved. Add items above to select them directly during invoice creation.</p>
                </div>
              ) : (
                <>
                  {/* Desktop / Tablet table */}
                  <div className="items-scroll-wrapper">
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "480px" }}>
                      <thead>
                        <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border-color)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                          <th style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>Item Name</th>
                          <th style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>HSN/SAC</th>
                          <th style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>Unit</th>
                          <th style={{ padding: "14px 16px", textAlign: "right", whiteSpace: "nowrap" }}>Unit Price</th>
                          <th style={{ padding: "14px 16px", textAlign: "center", whiteSpace: "nowrap" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <td style={{ padding: "14px 16px", fontWeight: "600" }}>{item.name}</td>
                            <td style={{ padding: "14px 16px", color: "var(--text-secondary)" }}>{item.hsn_code || "N/A"}</td>
                            <td style={{ padding: "14px 16px", color: "var(--text-secondary)" }}>{item.unit || "No"}</td>
                            <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: "700" }}>₹{parseFloat(item.rate).toFixed(2)}</td>
                            <td style={{ padding: "14px 16px", textAlign: "center", whiteSpace: "nowrap" }}>
                              <button
                                onClick={() => {
                                  setEditingId(item.id);
                                  setName(item.name || "");
                                  setRate(item.rate || "");
                                  setHsnCode(item.hsn_code || "");
                                  setUnit(item.unit || "No");
                                  setAdding(true);
                                }}
                                style={{ backgroundColor: "transparent", color: "var(--accent-color)", padding: "6px", borderRadius: "6px", border: "none", cursor: "pointer", marginRight: "8px" }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.15)"}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                style={{ backgroundColor: "transparent", color: "var(--danger-color)", padding: "6px", borderRadius: "6px", border: "none", cursor: "pointer" }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)"}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile card list */}
                  <div className="items-card-list">
                    {items.map((item) => (
                      <div key={item.id} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "14px 16px",
                        borderBottom: "1px solid var(--border-color)",
                        gap: "12px"
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: "700", fontSize: "14px", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                          <div style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                            {item.hsn_code && <span>HSN: {item.hsn_code}</span>}
                            <span>Unit: {item.unit || "No"}</span>
                            <span style={{ color: "var(--accent-color)", fontWeight: "700" }}>₹{parseFloat(item.rate).toFixed(2)}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                          <button
                            onClick={() => {
                              setEditingId(item.id);
                              setName(item.name || "");
                              setRate(item.rate || "");
                              setHsnCode(item.hsn_code || "");
                              setUnit(item.unit || "No");
                              setAdding(true);
                            }}
                            style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", color: "var(--accent-color)", padding: "8px", borderRadius: "8px", border: "none", cursor: "pointer" }}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "var(--danger-color)", padding: "8px", borderRadius: "8px", flexShrink: 0, border: "none", cursor: "pointer" }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Condition 2: Dealers Tab Content */}
        {activeTab === "dealers" && (
          <>
            {/* Add Dealer Form */}
            {adding && (
              <form onSubmit={handleAddDealer} className="glass" style={{ padding: "32px", marginBottom: "32px" }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", fontSize: "16px", fontWeight: "600" }}>
                  {editingId ? <Edit2 size={18} style={{ color: "var(--accent-color)" }} /> : <UserPlus size={18} style={{ color: "var(--accent-color)" }} />}
                  {editingId ? "Edit Dealer Details" : "Predefine Dealer Details"}
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "24px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>DEALER / CUSTOMER NAME</label>
                    <input required type="text" value={dealerName} onChange={(e) => setDealerName(e.target.value)} placeholder="e.g. M/s Icon Traders" />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>GST NUMBER (GSTIN)</label>
                    <input type="text" value={dealerGstin} onChange={(e) => setDealerGstin(e.target.value)} placeholder="e.g. 29ANUPR9033R1ZL (Optional)" />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: "20px", marginBottom: "24px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>BILLING ADDRESS</label>
                    <input type="text" value={dealerAddress} onChange={(e) => setDealerAddress(e.target.value)} placeholder="e.g. #12, 1st Cross, Gandhi Nagar, Bengaluru-560009" />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>STATE CODE</label>
                    <input type="text" value={dealerStateCode} onChange={(e) => setDealerStateCode(e.target.value)} placeholder="e.g. 29" />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "12px 24px",
                      borderRadius: "8px",
                      backgroundColor: "var(--accent-color)",
                      color: "#fff",
                      fontWeight: "600",
                      fontSize: "14px",
                      boxShadow: "0 4px 10px 0 rgba(59, 130, 246, 0.2)",
                      opacity: saving ? 0.7 : 1,
                      cursor: saving ? "not-allowed" : "pointer",
                      border: "none"
                    }}
                  >
                    {saving ? <Loader size={15} className="animate-spin" /> : editingId ? <Edit2 size={15} /> : <UserPlus size={15} />}
                    {saving ? "Saving..." : editingId ? "Update Dealer" : "Save Dealer"}
                  </button>
                </div>
              </form>
            )}

            {/* Predefined Dealers Table */}
            <div className="glass items-table-wrapper">
              {dealers.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
                  <Users size={48} style={{ strokeWidth: 1, marginBottom: "12px" }} />
                  <p>No predefined dealers saved. Add dealers above to select them directly during invoice creation.</p>
                </div>
              ) : (
                <>
                  {/* Desktop / Tablet table */}
                  <div className="items-scroll-wrapper">
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "480px" }}>
                      <thead>
                        <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border-color)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                          <th style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>Dealer Name</th>
                          <th style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>GSTIN</th>
                          <th style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>State Code</th>
                          <th style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>Address</th>
                          <th style={{ padding: "14px 16px", textAlign: "center", whiteSpace: "nowrap" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dealers.map((dealer) => (
                          <tr key={dealer.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <td style={{ padding: "14px 16px", fontWeight: "600" }}>{dealer.name}</td>
                            <td style={{ padding: "14px 16px", color: "var(--text-secondary)" }}>{dealer.gstin || "N/A"}</td>
                            <td style={{ padding: "14px 16px", color: "var(--text-secondary)" }}>{dealer.state_code || "N/A"}</td>
                            <td style={{ padding: "14px 16px", color: "var(--text-secondary)", fontSize: "13px", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dealer.address || "N/A"}</td>
                            <td style={{ padding: "14px 16px", textAlign: "center", whiteSpace: "nowrap" }}>
                              <button
                                onClick={() => {
                                  setEditingId(dealer.id);
                                  setDealerName(dealer.name || "");
                                  setDealerAddress(dealer.address || "");
                                  setDealerGstin(dealer.gstin || "");
                                  setDealerStateCode(dealer.state_code || "29");
                                  setAdding(true);
                                }}
                                style={{ backgroundColor: "transparent", color: "var(--accent-color)", padding: "6px", borderRadius: "6px", border: "none", cursor: "pointer", marginRight: "8px" }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.15)"}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteDealer(dealer.id)}
                                style={{ backgroundColor: "transparent", color: "var(--danger-color)", padding: "6px", borderRadius: "6px", border: "none", cursor: "pointer" }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)"}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile card list */}
                  <div className="items-card-list">
                    {dealers.map((dealer) => (
                      <div key={dealer.id} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "14px 16px",
                        borderBottom: "1px solid var(--border-color)",
                        gap: "12px"
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: "700", fontSize: "14px", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dealer.name}</div>
                          <div style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                            {dealer.gstin && <span>GSTIN: {dealer.gstin}</span>}
                            <span>State: {dealer.state_code || "N/A"}</span>
                          </div>
                          {dealer.address && (
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {dealer.address}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                          <button
                            onClick={() => {
                              setEditingId(dealer.id);
                              setDealerName(dealer.name || "");
                              setDealerAddress(dealer.address || "");
                              setDealerGstin(dealer.gstin || "");
                              setDealerStateCode(dealer.state_code || "29");
                              setAdding(true);
                            }}
                            style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", color: "var(--accent-color)", padding: "8px", borderRadius: "8px", border: "none", cursor: "pointer" }}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteDealer(dealer.id)}
                            style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "var(--danger-color)", padding: "8px", borderRadius: "8px", flexShrink: 0, border: "none", cursor: "pointer" }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
