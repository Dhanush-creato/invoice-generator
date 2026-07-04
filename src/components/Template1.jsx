import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { numberToWords, formatDate } from "../utils/helpers";
import { scrambleId } from "../utils/crypto";

export default function Template1({ invoiceData, orgData }) {
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const {
    id = "",
    invoice_number = "391",
    date = new Date().toISOString().split('t')[0],
    customer_name = "M/S Alpha Systems",
    customer_address = "No. 37, Kempegowda service Road, Domlur Layout, Bengaluru- 560071",
    customer_gstin = "29AAOPR7835E1Z3",
    customer_state = "Karnataka",
    customer_state_code = "29",
    items = [],
    cgst_percent = 9,
    sgst_percent = 9,
    igst_percent = 0,
    is_interstate = false,
    bank_name = "",
    bank_branch = "",
    bank_acc_no = "",
    bank_ifsc = "",
    bank_acc_type = "",
    notes = "Make all cheques payable to Company Name.",
  } = invoiceData || {};

  const org = orgData || {
    name: "ICON SYSTEMS",
    tagline: "Automatic Water Level Controller Cum Indicator, Digital Controllers, Digital Indicators And Timers",
    phone: "9845913976, 8884880066",
    website: "www.iconsystemsblr.com",
    address: "# 507, 10th A Cross, Sanjeevini Nagar, Nagarbhavi Main Road, Bengaluru- 560072",
    gstin: "29ANUPR9033R1ZL",
    state_code: "29",
    logo_url: "",
    signature_url: ""
  };

  const isIconSystems = (org.name || "").toUpperCase().includes("ICON SYSTEMS");

  // Fallback to org settings if custom settings exist, otherwise use template default strings
  const displayBankName = org.bank_name || bank_name || (isIconSystems ? "Janatha seva co-operative bank ltd" : "");
  const displayBankBranch = org.bank_branch || bank_branch || (isIconSystems ? "Moodalapalya" : "");
  const displayBankAccNo = org.bank_acc_no || bank_acc_no || (isIconSystems ? "003110100000493" : "");
  const displayBankAccType = org.bank_acc_type || bank_acc_type || (isIconSystems ? "Current A/C" : "");
  const displayBankIfsc = org.bank_ifsc || bank_ifsc || (isIconSystems ? "JTSC0000003" : "");

  // Generate QR Code URL
  useEffect(() => {
    if (id) {
      const shareUrl = invoiceData.pdf_url || `${window.location.origin}/public/invoice/${scrambleId(id)}`;
      QRCode.toDataURL(
        shareUrl,
        {
          width: 90,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#ffffff"
          }
        },
        (err, url) => {
          if (!err) setQrCodeUrl(url);
        }
      );
    }
  }, [id, invoiceData.pdf_url]);

  // Calculations
  const taxableAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (is_interstate) {
    igstAmount = taxableAmount * (parseFloat(igst_percent) / 100);
  } else {
    cgstAmount = taxableAmount * (parseFloat(cgst_percent) / 100);
    sgstAmount = taxableAmount * (parseFloat(sgst_percent) / 100);
  }

  const gstTotal = cgstAmount + sgstAmount + igstAmount;
  const grandTotal = taxableAmount + gstTotal;

  return (
    <div className="invoice-preview-container" style={{
      padding: '8mm 8mm 25mm 8mm',
      background: '#fff',
      color: '#000',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      minHeight: '297mm',
      height: '297mm',
      boxSizing: 'border-box',
      position: 'relative'
    }}>
      <div className="icon-systems-invoice" style={{ position: 'relative' }}>
        
        {/* Top Header Section (Centered layout, borderless matching paper layout) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px 10px', alignItems: 'center' }}>
          
          {org.logo_url && org.use_logo_as_header ? (
            <div style={{ flex: 1 }}>
              <img src={org.logo_url} alt="Company Header Banner" className="invoice-logo" style={{ maxHeight: '50px', objectFit: 'contain' }} />
            </div>
          ) : (
            <>
              {/* Left Side: Square Logo (Enlarged) */}
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                <img src={org.logo_url || "/icon_logo_square.png"} alt="Icon Logo" style={{ height: '78px', objectFit: 'contain', marginTop: '2px' }} />
              </div>
              
              {/* Center: Branding column (Centered & Enlarged) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 15px' }}>
                {/* Line 1: Naming Image (Centered & Enlarged) */}
                <img src="/icon_naming_text.png" alt="ICON SYSTEMS" style={{ height: '34px', objectFit: 'contain', marginBottom: '3px' }} />

                {/* Line 2: Tagline (Centered) */}
                <p style={{ fontSize: '10px', fontWeight: 'bold', margin: '2px 0', color: '#000', letterSpacing: '0.1px', lineHeight: '1.3' }}>
                  Automatic Water Level Controller<br />
                  Cum Indicator, Digital Controllers, Digital Indicators And Timers
                </p>
 
                {/* Line 3: Phone & Website (Centered, Enlarged) */}
                {(() => {
                  const phoneRaw = org.phone || "9845913976, 8884880066";
                  const phones = phoneRaw.split(/[,\/]/).map(p => p.trim()).filter(Boolean);
                  const phone1 = phones[0] || "9845913976";
                  const phone2 = phones[1] || "";
                  const showWeb = org.show_website !== false;
                  return (
                    <p style={{ fontSize: '12.5px', fontWeight: 'bold', margin: '4px 0 0', color: '#005b8a' }}>
                      Ph:{' '}
                      <a href={`tel:${phone1.replace(/\s/g, '')}`} style={{ color: '#005b8a', textDecoration: 'none' }}>{phone1}</a>
                      {phone2 && (<>
                        {' '}/{' '}
                        <a href={`https://wa.me/91${phone2.replace(/\s/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#005b8a', textDecoration: 'none' }}>{phone2}</a>
                      </>)}
                      {showWeb && (<>
                        <span style={{ margin: '0 6px', color: '#ccc' }}>|</span>{' '}
                        <a href={`http://${org.website || "www.iconsystemsblr.com"}`} target="_blank" rel="noopener noreferrer" style={{ color: '#006fa6', textDecoration: 'none' }}>
                          {org.website || "www.iconsystemsblr.com"}
                        </a>
                      </>)}
                    </p>
                  );
                })()}
              </div>
            </>
          )}

          {/* Right Side: Save Water Seal + e-Invoice QR Code side-by-side (Enlarged) */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexShrink: 0 }}>
            {/* Save Water Seal (Enlarged) */}
            <div style={{ width: '95px', height: '95px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/save_water_seal.png" alt="Save Water" style={{ width: '95px', height: '95px', objectFit: 'contain' }} />
            </div>
            
            {/* e-Invoice QR Code (Enlarged) */}
            {qrCodeUrl && (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img src={qrCodeUrl} alt="e-Invoice QR" style={{ width: '64px', height: '64px', border: '1px solid #000' }} />
                <span style={{ fontSize: '7px', fontWeight: 'bold', marginTop: '2.5px', color: '#000', letterSpacing: '0.5px' }}>e-INVOICE</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Bordered Invoice Body Box (starts at CASH/CREDIT row, border top single solid line) */}
        <div style={{ borderLeft: '2px solid #000', borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>
          {/* Invoice Title */}
          <div style={{
            display: 'flex',
            borderTop: '1.5px solid #000',
            borderBottom: '1px solid #000',
            fontSize: '11px',
            fontWeight: 'bold'
          }}>
          <div style={{ flex: 1, padding: '3px', borderRight: '1px solid #000', textAlign: 'center' }}>CASH/CREDIT</div>
          <div style={{ flex: 2, padding: '3px', borderRight: '1px solid #000', textAlign: 'center', fontSize: '13px', letterSpacing: '1px' }}>INVOICE</div>
          <div style={{ flex: 1, padding: '3px', textAlign: 'center' }}>Original / Duplicate</div>
        </div>

        {/* Customer & Invoice Meta Details */}
        <div style={{ display: 'flex', borderBottom: '1px solid #000', fontSize: '11px' }}>
          {/* Buyer */}
          <div style={{ flex: 1.2, borderRight: '1px solid #000', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ padding: '5px 8px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '10px', display: 'block' }}>TO,</span>
              <div style={{ fontWeight: 'bold', margin: '2px 0', fontSize: '12px' }}>{customer_name}</div>
              <div style={{ lineHeight: '1.3', fontSize: '10px' }}>
                {customer_address ? customer_address.split(/[!\n]/).map((line, lIdx) => {
                  const trimmed = line.trim();
                  return trimmed ? <div key={lIdx}>{trimmed}</div> : null;
                }) : null}
              </div>
            </div>
            <div style={{ padding: '4px 8px', fontWeight: 'bold', fontSize: '10px' }}>
              Customer GSTIN : <span style={{ textTransform: 'uppercase' }}>{customer_gstin || "N/A"}</span>
            </div>
          </div>
          {/* Invoice Meta */}
          <div style={{ flex: 0.8, fontSize: '11px' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
              <div style={{ width: '90px', fontWeight: 'bold', padding: '4px 6px', borderRight: '1px solid #000' }}>Invoice no:</div>
              <div style={{ padding: '4px 6px', fontWeight: 'bold' }}>{invoice_number}</div>
            </div>
            <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
              <div style={{ width: '90px', fontWeight: 'bold', padding: '4px 6px', borderRight: '1px solid #000' }}>Date :</div>
              <div style={{ padding: '4px 6px', fontWeight: 'bold' }}>{formatDate(date)}</div>
            </div>
            <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
              <div style={{ width: '90px', fontWeight: 'bold', padding: '4px 6px', borderRight: '1px solid #000' }}>GSTIN:</div>
              <div style={{ padding: '4px 6px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px' }}>{org.gstin}</div>
            </div>
            <div style={{ display: 'flex' }}>
              <div style={{ width: '90px', fontWeight: 'bold', padding: '4px 6px', borderRight: '1px solid #000' }}>State code:</div>
              <div style={{ padding: '4px 6px', fontWeight: 'bold' }}>{customer_state_code || org.state_code}</div>
            </div>
          </div>
        </div>

        {/* Product Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', borderBottom: '1px solid #000' }}>
          <thead>
            <tr style={{ height: '24px', backgroundColor: '#f0f4ff' }}>
              <th style={{ width: '5%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '3px 4px', textAlign: 'center' }}>Sl.No</th>
              <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '3px 4px', textAlign: 'left' }}>Products Description</th>
              <th style={{ width: '11%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '3px 4px', textAlign: 'center' }}>HSN Code</th>
              <th style={{ width: '10%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '3px 4px', textAlign: 'center' }}>Qty</th>
              <th style={{ width: '12%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '3px 4px', textAlign: 'right' }}>Rate</th>
              <th style={{ width: '14%', borderBottom: '1px solid #000', padding: '3px 4px', textAlign: 'right' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'center', verticalAlign: 'top' }}>{idx + 1}</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'left', verticalAlign: 'top', fontWeight: '500' }}>{item.description}</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'center', verticalAlign: 'top' }}>{item.hsn_code}</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'center', verticalAlign: 'top' }}>{item.quantity} {item.unit || 'No'}</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right', verticalAlign: 'top' }}>₹{(parseFloat(item.rate) || 0).toFixed(2)}</td>
                <td style={{ padding: '4px', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold' }}>₹{(parseFloat(item.amount) || 0).toFixed(2)}</td>
              </tr>
            ))}
            {/* Empty space padding rows */}
            {items.length < 9 && Array.from({ length: 9 - items.length }).map((_, idx) => (
              <tr key={`empty-${idx}`} style={{ height: '22px' }}>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}>&nbsp;</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}>&nbsp;</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}>&nbsp;</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}>&nbsp;</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}>&nbsp;</td>
                <td style={{ padding: '4px' }}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals & Calculations Grid */}
        <div style={{ display: 'flex', fontSize: '12px' }}>
          {/* Word Conversion Left block */}
          <div style={{ flex: 1.2, padding: '8px', borderRight: '1px solid #000', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Total in words</span>
              <div style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '11px', lineHeight: '1.4' }}>{numberToWords(grandTotal)}</div>
            </div>
          </div>
          {/* Math Calculations block */}
          <div style={{ flex: 0.8 }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
              <div style={{ flex: 1.3, padding: '6px 8px', borderRight: '1px solid #000', fontWeight: 'bold', textAlign: 'right' }}>Taxable amount</div>
              <div style={{ flex: 0.7, padding: '6px 8px', fontWeight: 'bold', textAlign: 'right' }}>₹{taxableAmount.toFixed(2)}</div>
            </div>
            
            {is_interstate ? (
              <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                <div style={{ flex: 1.3, padding: '6px 8px', borderRight: '1px solid #000', fontWeight: 'bold', textAlign: 'right' }}>IGST {igst_percent}%</div>
                <div style={{ flex: 0.7, padding: '6px 8px', fontWeight: 'bold', textAlign: 'right' }}>₹{igstAmount.toFixed(2)}</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                  <div style={{ flex: 1.3, padding: '6px 8px', borderRight: '1px solid #000', fontWeight: 'bold', textAlign: 'right' }}>CGST {cgst_percent}%</div>
                  <div style={{ flex: 0.7, padding: '6px 8px', fontWeight: 'bold', textAlign: 'right' }}>₹{cgstAmount.toFixed(2)}</div>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                  <div style={{ flex: 1.3, padding: '6px 8px', borderRight: '1px solid #000', fontWeight: 'bold', textAlign: 'right' }}>SGST {sgst_percent}%</div>
                  <div style={{ flex: 0.7, padding: '6px 8px', fontWeight: 'bold', textAlign: 'right' }}>₹{sgstAmount.toFixed(2)}</div>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                  <div style={{ flex: 1.3, padding: '6px 8px', borderRight: '1px solid #000', fontWeight: 'bold', textAlign: 'right' }}>GST Total Amount {parseFloat(cgst_percent) + parseFloat(sgst_percent)}%</div>
                  <div style={{ flex: 0.7, padding: '6px 8px', fontWeight: 'bold', textAlign: 'right' }}>₹{gstTotal.toFixed(2)}</div>
                </div>
              </>
            )}
            
            <div style={{ display: 'flex', background: '#f5f5f5', fontSize: '13px' }}>
              <div style={{ flex: 1.3, padding: '8px', borderRight: '1px solid #000', fontWeight: 'extrabold', textAlign: 'right' }}>TOTAL</div>
              <div style={{ flex: 0.7, padding: '8px', fontWeight: 'extrabold', textAlign: 'right' }}>₹{grandTotal.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Bank & Signature Section */}
        <div style={{ display: 'flex', borderTop: '2px solid #000', marginTop: '1px', fontSize: '11px', minHeight: '155px' }}>
          {/* Bank Details (Removed borderRight to eliminate vertical center liner) */}
          <div style={{ flex: 1.2, padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              {notes && (
                <div style={{ marginBottom: '8px', fontSize: '10px', lineHeight: '1.4' }}>
                  <span style={{ fontWeight: 'bold' }}>Note: </span>{notes}
                </div>
              )}
              <span style={{ fontWeight: 'bold', textDecoration: 'underline', display: 'block', marginBottom: '4px' }}>Bank Details :</span>
              <div><span style={{ fontWeight: 'bold' }}>Bank Name : </span>{displayBankName}</div>
              <div><span style={{ fontWeight: 'bold' }}>Branch : </span>{displayBankBranch}</div>
              <div><span style={{ fontWeight: 'bold' }}>Account no : </span>{displayBankAccNo} <span style={{ fontWeight: 'bold' }}>({displayBankAccType})</span></div>
              <div><span style={{ fontWeight: 'bold' }}>IFSC Code : </span><span style={{ textTransform: 'uppercase' }}>{displayBankIfsc}</span></div>
            </div>

            {org.phonepe_url && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '10px', flexShrink: 0 }}>
                <img src={org.phonepe_url} alt="Payment QR" style={{ width: '85px', height: '85px', objectFit: 'contain', border: '1px solid #ddd', padding: '2px', borderRadius: '4px', background: '#fff' }} />
                <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#555', marginTop: '4px' }}>Payment Scanner</span>
              </div>
            )}
          </div>
          
          {/* Authorised Signature */}
          <div style={{ flex: 0.8, padding: '8px 8px 15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px' }}>For {org.name}</div>
            
            {/* Signature image if uploaded in settings */}
            {org.signature_url && (
              <img src={org.signature_url} alt="Signature Stamp" className="invoice-signature" style={{ maxHeight: '55px', position: 'absolute', top: '25px', opacity: 0.85 }} />
            )}
            
            <div style={{ fontWeight: 'bold', marginTop: 'auto', borderTop: '1px dashed #000', width: '80%', textAlign: 'center', paddingTop: '4px' }}>Proprietor</div>
          </div>
        </div>

        {/* Sub-footer notices */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: '1px solid #000',
          padding: '6px 8px',
          fontSize: '10px',
          fontWeight: 'bold',
          background: '#fcfcfc'
        }}>
          <div>This is computerised invoice not required receiver sign</div>
          <div>Thank you for your Business</div>
        </div>

      </div>
      </div>

      {/* Social Handles Bottom Footer (hidden on print via .social-footer) */}
      <div className="social-footer" style={{
        position: 'absolute',
        bottom: '0',
        left: '0',
        right: '0',
        backgroundColor: '#0083c2',
        color: '#fff',
        padding: '24px 15px 20px',
        fontSize: '9px',
        fontWeight: 'bold',
        borderRadius: '0',
        overflow: 'hidden'
      }}>
        {/* SVG Curve at the top boundary to simulate paper layout wave */}
        <svg viewBox="0 0 100 10" preserveAspectRatio="none" style={{
          position: 'absolute',
          top: '-1px',
          left: 0,
          width: '100%',
          height: '10px',
          fill: '#fff'
        }}>
          <path d="M0,10 C30,0 70,0 100,10 Z" />
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2, position: 'relative', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontWeight: '800', fontSize: '9px', letterSpacing: '0.2px' }}>{org.address}</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            
            {/* Facebook Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#fff',
              border: '1px solid #cbd5e1',
              borderRadius: '20px',
              padding: '3px 10px',
              color: '#0083c2',
              fontSize: '8px',
              fontWeight: 'bold',
              gap: '5px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#0083c2">
                <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
              </svg>
              <span>www.facebook.com/iconsystems</span>
            </div>

            {/* Twitter Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#fff',
              border: '1px solid #cbd5e1',
              borderRadius: '20px',
              padding: '3px 10px',
              color: '#0083c2',
              fontSize: '8px',
              fontWeight: 'bold',
              gap: '5px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#0083c2">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
              </svg>
              <span>www.twitter.com/@icon_systemsblr</span>
            </div>

            {/* Instagram Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#fff',
              border: '1px solid #cbd5e1',
              borderRadius: '20px',
              padding: '3px 10px',
              color: '#0083c2',
              fontSize: '8px',
              fontWeight: 'bold',
              gap: '5px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0083c2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              <span>www.instagram.com/iconsystems</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
