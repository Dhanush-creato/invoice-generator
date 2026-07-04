import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, getDoc } from "firebase/firestore";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { Plus, Trash2, Users, AlertCircle, Loader, UserPlus, MapPin, Receipt } from "lucide-react";

export default function Customers() {
  const [profile, setProfile] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Customer Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gstin, setGstin] = useState("");
  const [stateCode, setStateCode] = useState("29");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");

  const fetchProfileAndCustomers = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      // Fetch org profile
      const profSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (profSnap.exists()) setProfile(profSnap.data());

      // Fetch customers
      const q = query(collection(db, "customers"), where("userId", "==", auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      const list = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setCustomers(list);
    } catch (e) {
      console.error(e);
      setError("Failed to fetch customer data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndCustomers();
  }, []);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name) {
      setError("Customer name is required.");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "customers"), {
        userId: auth.currentUser.uid,
        name,
        email,
        phone,
        gstin: gstin.toUpperCase(),
        state_code: stateCode,
        billing_address: billingAddress,
        shipping_address: shippingAddress || billingAddress // default shipping to billing
      });

      setCustomers((prev) => [...prev, {
        id: docRef.id,
        userId: auth.currentUser.uid,
        name,
        email,
        phone,
        gstin: gstin.toUpperCase(),
        state_code: stateCode,
        billing_address: billingAddress,
        shipping_address: shippingAddress || billingAddress
      }]);

      setSuccess("Customer added successfully!");
      // Reset form
      setName("");
      setEmail("");
      setPhone("");
      setGstin("");
      setStateCode("29");
      setBillingAddress("");
      setShippingAddress("");
      setAdding(false);
    } catch (err) {
      console.error(err);
      setError("Failed to create customer.");
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) return;
    try {
      await deleteDoc(doc(db, "customers", id));
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setSuccess("Customer deleted.");
    } catch (err) {
      console.error(err);
      setError("Failed to delete customer.");
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
        <Header title="Customers Directory" />

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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600" }}>Manage Client List</h2>
          <button
            onClick={() => setAdding(!adding)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "10px",
              backgroundColor: adding ? "var(--border-color)" : "var(--accent-color)",
              color: "#fff",
              fontWeight: "600",
              fontSize: "14px"
            }}
          >
            <Plus size={16} />
            {adding ? "Cancel" : "Add Customer"}
          </button>
        </div>

        {/* Add Customer Form */}
        {adding && (
          <form onSubmit={handleAddCustomer} className="glass" style={{ padding: "32px", marginBottom: "32px" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", fontSize: "16px", fontWeight: "600" }}>
              <UserPlus size={18} style={{ color: "var(--accent-color)" }} />
              New Customer Information
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>CLIENT/COMPANY NAME</label>
                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. M/S Alpha Systems" />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>EMAIL ADDRESS</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@company.com" />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>PHONE NUMBER</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>GSTIN (BUYER GST)</label>
                <input type="text" value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="e.g. 29AAOPR7835E1Z3" style={{ textTransform: "uppercase" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>STATE CODE</label>
                <input type="text" value={stateCode} onChange={(e) => setStateCode(e.target.value)} placeholder="e.g. 29" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>BILLING ADDRESS</label>
                <textarea required rows={3} value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} placeholder="Full billing address" />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>SHIPPING ADDRESS (OPTIONAL)</label>
                <textarea rows={3} value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="If different from billing address" />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                style={{
                  padding: "12px 24px",
                  borderRadius: "8px",
                  backgroundColor: "var(--accent-color)",
                  color: "#fff",
                  fontWeight: "600",
                  fontSize: "14px",
                  boxShadow: "0 4px 10px 0 rgba(59, 130, 246, 0.2)"
                }}
              >
                Save Customer
              </button>
            </div>
          </form>
        )}

        {/* Customers Table */}
        <div className="glass" style={{ overflow: "hidden" }}>
          {customers.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
              <Users size={48} style={{ strokeWidth: 1, marginBottom: "12px" }} />
              <p>No customers added yet. Create one above to start autofilling invoices.</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border-color)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                  <th style={{ padding: "16px" }}>Name / Details</th>
                  <th style={{ padding: "16px" }}>GSTIN</th>
                  <th style={{ padding: "16px" }}>Billing Address</th>
                  <th style={{ padding: "16px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "16px" }}>
                      <div style={{ fontWeight: "600" }}>{c.name}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                        {c.email && <span>{c.email}</span>}
                        {c.phone && <span style={{ marginLeft: c.email ? "10px" : 0 }}>Ph: {c.phone}</span>}
                      </div>
                    </td>
                    <td style={{ padding: "16px", textTransform: "uppercase", fontWeight: "600" }}>
                      {c.gstin || <span style={{ color: "var(--text-secondary)", fontWeight: "normal" }}>Unregistered</span>}
                      {c.state_code && <div style={{ fontSize: "10px", color: "var(--text-secondary)", fontWeight: "normal" }}>State Code: {c.state_code}</div>}
                    </td>
                    <td style={{ padding: "16px", color: "var(--text-secondary)", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.billing_address}
                    </td>
                    <td style={{ padding: "16px", textAlign: "center" }}>
                      <button
                        onClick={() => handleDeleteCustomer(c.id)}
                        style={{
                          backgroundColor: "transparent",
                          color: "var(--danger-color)",
                          padding: "6px",
                          borderRadius: "6px"
                        }}
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
          )}
        </div>
      </main>
    </div>
  );
}
