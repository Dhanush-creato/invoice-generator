import React, { useState, useEffect } from "react";
import QRCode from "qrcode";

export default function QuotationTemplate({ invoiceData, orgData }) {
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const {
    id = "",
    invoice_number = "46",
    date = new Date().toISOString().split('T')[0],
    customer_name = "",
    customer_address = "",
    customer_gstin = "",
    customer_state = "",
    customer_state_code = "",
    items = [],
    cgst_percent = 9,
    sgst_percent = 9,
    igst_percent = 18,
    is_interstate = false,
    notes = "Make all cheques payable to Company Name.",
    
    // Quotation-specific fields
    quotation_ref_prefix = "",
    quotation_subject = "providing Automatic Water Level Controller Cum Indicator",
    quotation_guarantee = "One year (against manufacturing defect only)",
    quotation_validity = "One month",
    quotation_cable = "As per final measurement",
    show_quotation_cable = true,
    quotation_payment = "Advance 50% after installation 100% payment",
    show_quotation_payment = true,
    quotation_note = "Plumbing & Electrical work is in your scope.",
    show_quotation_note = true,
  } = invoiceData || {};

  const currentYear = date ? new Date(date).getFullYear() : new Date().getFullYear();
  const validYear = isNaN(currentYear) ? new Date().getFullYear() : currentYear;
  const nextYrShort = String((validYear + 1) % 100).padStart(2, "0");
  const fallbackPrefix = `ICS/AWLC/Q/${validYear}-${nextYrShort}/`;
  const cleanQuotationRefPrefix = (quotation_ref_prefix || fallbackPrefix).replace(/\/APD\//i, "/");

  const org = orgData || {
    name: "ICON SYSTEMS",
    tagline: "Automatic Water Level Controller Cum Indicator, Digital Controllers, Digital Indicators And Timers",
    phone: "9845913976, 8884880066",
    website: "www.iconsystemsblr.com",
    address: "# 507, 10th A Cross,!Sanjeevini Nagar, Nagarbhavi Main Road,!Bengaluru- 560072",
    gstin: "29ANUPR9033R1ZL",
    state_code: "29",
    logo_url: "",
    signature_url: ""
  };

  const isIconSystems = (org.name || "").toUpperCase().includes("ICON SYSTEMS");

  // Scramble/unscramble ID for public QR
  const scrambleId = (plainId) => {
    try {
      return btoa(plainId).replace(/=/g, "");
    } catch (e) {
      return plainId;
    }
  };

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
  const rawGrandTotal = taxableAmount + gstTotal;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = parseFloat((grandTotal - rawGrandTotal).toFixed(2));

  // Date Formatter: DD-MM-YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    if (!y || !m || !d) return dateStr;
    return `${d}-${m}-${y}`;
  };

  const numberToWords = (num) => {
    try {
      if (num === 0) return "Zero Rupees Only";
      
      const singleDigits = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
      const doubleDigits = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
      const tensMultiple = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
      
      const translate = (n) => {
        let word = "";
        if (n >= 100) {
          word += singleDigits[Math.floor(n / 100)] + " Hundred ";
          n %= 100;
        }
        if (n > 0) {
          if (n < 10) {
            word += singleDigits[n];
          } else if (n < 20) {
            word += doubleDigits[n - 10];
          } else {
            word += tensMultiple[Math.floor(n / 10)] + " " + singleDigits[n % 10];
          }
        }
        return word.trim();
      };

      let rupee = Math.floor(num);
      let paise = Math.round((num - rupee) * 100);
      let rupeeStr = "";
      let paiseStr = "";

      if (rupee > 0) {
        let parts = [];
        if (rupee >= 10000000) { // Crore
          parts.push(translate(Math.floor(rupee / 10000000)) + ' Crore');
          rupee %= 10000000;
        }
        if (rupee >= 100000) { // Lakh
          parts.push(translate(Math.floor(rupee / 100000)) + ' Lakh');
          rupee %= 100000;
        }
        if (rupee >= 1000) { // Thousand
          parts.push(translate(Math.floor(rupee / 1000)) + ' Thousand');
          rupee %= 1000;
        }
        if (rupee > 0) {
          parts.push(translate(rupee));
        }
        rupeeStr = parts.join(' ') + ' Rupees';
      }

      if (paise > 0) {
        paiseStr = ' and ' + translate(paise) + ' Paise';
      }

      return rupeeStr + paiseStr + ' Only';
    } catch (e) {
      return "";
    }
  };

  // Helper to format leading zero
  const formatSlNo = (index) => {
    const val = index + 1;
    return val < 10 ? `0${val}.` : `${val}.`;
  };

  // Helper to format quantity
  const formatQty = (qty, unit) => {
    const num = parseFloat(qty) || 0;
    const formattedNum = num < 10 ? `0${num}` : `${num}`;
    return `${formattedNum} ${unit || 'Nos'}`;
  };

  return (
    <div className="invoice-preview-container" style={{
      padding: '8mm 8mm 25mm 8mm',
      background: '#fff',
      color: '#000',
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      height: '297mm',
      maxHeight: '297mm',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div className="icon-systems-quotation" style={{ position: 'relative' }}>
        
        {/* Top Header Section (Branding letterhead) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px 10px', alignItems: 'center' }}>
          {org.logo_url && org.use_logo_as_header ? (
            <div style={{ flex: 1 }}>
              <img src={org.logo_url} alt="Company Header Banner" className="invoice-logo" style={{ maxHeight: '50px', objectFit: 'contain' }} />
            </div>
          ) : (
            <>
              {/* Left Side: Square Logo */}
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                <img src={org.logo_url || "/icon_logo_square.png"} alt="Icon Logo" style={{ height: '78px', objectFit: 'contain', marginTop: '2px' }} />
              </div>
              
              {/* Center: Branding Column */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 15px' }}>
                <img src="/icon_naming_text.png" alt="ICON SYSTEMS" style={{ height: '34px', objectFit: 'contain', marginBottom: '3px' }} />
                <p style={{ fontSize: '10px', fontWeight: 'bold', margin: '2px 0', color: '#000', letterSpacing: '0.1px', lineHeight: '1.3' }}>
                  Automatic Water Level Controller<br />
                  Cum Indicator, Digital Controllers, Digital Indicators And Timers
                </p>
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

          {/* Right Side: Save Water Seal */}
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ width: '98px', height: '98px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/save_water_seal.png" alt="Save Water" style={{ width: '98px', height: '98px', objectFit: 'contain', aspectRatio: '1 / 1' }} />
            </div>
          </div>
        </div>

        {/* Horizontal Divider Line */}
        <hr style={{ border: 'none', borderTop: '2px solid #000', margin: '4px 0 8px' }} />

        {/* Quotation Header Meta Details */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', fontFamily: 'Arial, sans-serif' }}>
          <div>REF: {cleanQuotationRefPrefix}{invoice_number}</div>
          <div>Dates: {formatDate(date)}</div>
        </div>

        {/* Customer / Recipient Address Block */}
        <div style={{ fontSize: '13px', lineHeight: '1.45', marginBottom: '8px', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ fontWeight: 'normal' }}>To,</div>
          <div style={{ fontWeight: 'bold' }}>{customer_name || "Customer Name"}</div>
          <div style={{ lineHeight: '1.4' }}>
            {customer_address ? customer_address.split(/[!\n]/).map((line, lIdx) => {
              const trimmed = line.trim();
              return trimmed ? <div key={lIdx}>{trimmed}</div> : null;
            }) : "Customer Address"}
          </div>
        </div>

        {/* Salutation & Subject */}
        <div style={{ fontSize: '13px', lineHeight: '1.45', marginBottom: '8px', fontFamily: 'Arial, sans-serif' }}>
          <div>Dear Sir,</div>
          <div style={{ textAlign: 'center', margin: '4px 0', fontWeight: 'bold' }}>
            Sub: Quotation for {quotation_subject}
            <div style={{ letterSpacing: '2px', fontWeight: 'normal', margin: '2px 0' }}>*******</div>
          </div>
          <div>
            We are leading manufacturers of the Automatic water level controller cum Indicator we hereby our lowest rates as under:
          </div>
        </div>

        {/* Particulars Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'Arial, sans-serif', border: '1.5px solid #000', marginBottom: '10px' }}>
          <thead>
            <tr style={{ height: '28px', backgroundColor: '#f9f9f9', borderBottom: '1.5px solid #000' }}>
              <th style={{ width: '7%', borderRight: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>Sl.</th>
              <th style={{ borderRight: '1px solid #000', padding: '4px 8px', textAlign: 'left', fontWeight: 'bold' }}>Particulars</th>
              <th style={{ width: '16%', borderRight: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>Qty.</th>
              <th style={{ width: '16%', borderRight: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>Rate</th>
              <th style={{ width: '18%', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #000', height: items.length >= 3 ? '20px' : '24px' }}>
                <td style={{ borderRight: '1px solid #000', padding: items.length >= 3 ? '2px 4px' : '4px', textAlign: 'center', verticalAlign: 'middle' }}>
                  {formatSlNo(idx)}
                </td>
                <td style={{ borderRight: '1px solid #000', padding: items.length >= 3 ? '2px 6px' : '4px 8px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 'normal' }}>
                  {item.description}
                </td>
                <td style={{ borderRight: '1px solid #000', padding: items.length >= 3 ? '2px 4px' : '4px', textAlign: 'center', verticalAlign: 'middle' }}>
                  {formatQty(item.quantity, item.unit)}
                </td>
                <td style={{ borderRight: '1px solid #000', padding: items.length >= 3 ? '2px 6px' : '4px 8px', textAlign: 'right', verticalAlign: 'middle' }}>
                  ₹ {(parseFloat(item.rate) || 0).toFixed(2)}
                </td>
                <td style={{ padding: items.length >= 3 ? '2px 6px' : '4px 8px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 'bold' }}>
                  ₹ {(parseFloat(item.amount) || 0).toFixed(2)}
                </td>
              </tr>
            ))}
            
            {/* Empty padding rows if items are fewer than 3 to preserve layout */}
            {items.length < 3 && Array.from({ length: 3 - items.length }).map((_, idx) => (
              <tr key={`empty-${idx}`} style={{ height: '20px', borderBottom: '1px solid #000' }}>
                <td style={{ borderRight: '1px solid #000', padding: '2px 4px' }}>&nbsp;</td>
                <td style={{ borderRight: '1px solid #000', padding: '2px 4px' }}>&nbsp;</td>
                <td style={{ borderRight: '1px solid #000', padding: '2px 4px' }}>&nbsp;</td>
                <td style={{ borderRight: '1px solid #000', padding: '2px 4px' }}>&nbsp;</td>
                <td style={{ padding: '2px 4px' }}>&nbsp;</td>
              </tr>
            ))}

            {/* Totals Section */}
            <tr style={{ borderTop: '1.5px solid #000', height: '26px' }}>
              {/* Left Column: Total in Words spanning the full height of subtotal, tax, and grand total */}
              <td colSpan={3} rowSpan={3} style={{ borderRight: '1.5px solid #000', padding: '6px 8px', verticalAlign: 'bottom', fontSize: '11.5px' }}>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'normal' }}>Total in words: </span>
                  <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{numberToWords(grandTotal)}</span>
                </div>
              </td>
              <td style={{ borderRight: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', textAlign: 'right', verticalAlign: 'middle' }}>
                S Total
              </td>
              <td style={{ padding: '6px 8px', fontWeight: 'bold', textAlign: 'right', verticalAlign: 'middle' }}>
                ₹ {taxableAmount.toFixed(2)}
              </td>
            </tr>
            <tr style={{ height: '26px', borderTop: '1px solid #000' }}>
              <td style={{ borderRight: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', textAlign: 'right', verticalAlign: 'middle' }}>
                GST {is_interstate ? parseFloat(igst_percent) : (parseFloat(cgst_percent) + parseFloat(sgst_percent))}%
              </td>
              <td style={{ padding: '6px 8px', fontWeight: 'bold', textAlign: 'right', verticalAlign: 'middle' }}>
                ₹ {gstTotal.toFixed(2)}
              </td>
            </tr>
            <tr style={{ height: '26px', borderTop: '1px solid #000' }}>
              <td style={{ borderRight: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', textAlign: 'right', verticalAlign: 'middle' }}>
                Total
              </td>
              <td style={{ padding: '6px 8px', fontWeight: 'bold', textAlign: 'right', verticalAlign: 'middle' }}>
                ₹ {grandTotal.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Bottom Terms & Conditions & Sign-off */}
        <div style={{ fontSize: '13px', fontFamily: 'Arial, sans-serif', marginTop: '8px', lineHeight: '1.5' }}>
          <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '6px' }}>TERMS & CONDITIONS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '8px' }}>
            {(() => {
              let index = 1;
              const list = [];
              
              if (quotation_guarantee) {
                list.push(
                  <div key="guarantee" style={{ display: 'flex', alignItems: 'baseline' }}>
                    <div style={{ width: '85px', fontWeight: 'bold', flexShrink: 0 }}>
                      0{index++}. Guarantee
                    </div>
                    <div style={{ width: '10px', fontWeight: 'bold', flexShrink: 0, textAlign: 'center' }}>:</div>
                    <div style={{ flex: 1, fontWeight: 'normal', paddingLeft: '4px' }}>{quotation_guarantee}</div>
                  </div>
                );
              }
              
              if (quotation_validity) {
                list.push(
                  <div key="validity" style={{ display: 'flex', alignItems: 'baseline' }}>
                    <div style={{ width: '85px', fontWeight: 'bold', flexShrink: 0 }}>
                      0{index++}. Validity
                    </div>
                    <div style={{ width: '10px', fontWeight: 'bold', flexShrink: 0, textAlign: 'center' }}>:</div>
                    <div style={{ flex: 1, fontWeight: 'normal', paddingLeft: '4px' }}>{quotation_validity}</div>
                  </div>
                );
              }
              
              if (show_quotation_cable && quotation_cable) {
                list.push(
                  <div key="cable" style={{ display: 'flex', alignItems: 'baseline' }}>
                    <div style={{ width: '85px', fontWeight: 'bold', flexShrink: 0 }}>
                      0{index++}. Cable
                    </div>
                    <div style={{ width: '10px', fontWeight: 'bold', flexShrink: 0, textAlign: 'center' }}>:</div>
                    <div style={{ flex: 1, fontWeight: 'normal', paddingLeft: '4px' }}>{quotation_cable}</div>
                  </div>
                );
              }
              
              if (show_quotation_payment && quotation_payment) {
                list.push(
                  <div key="payment" style={{ display: 'flex', alignItems: 'baseline' }}>
                    <div style={{ width: '85px', fontWeight: 'bold', flexShrink: 0 }}>
                      0{index++}. Payment
                    </div>
                    <div style={{ width: '10px', fontWeight: 'bold', flexShrink: 0, textAlign: 'center' }}>:</div>
                    <div style={{ flex: 1, fontWeight: 'normal', paddingLeft: '4px' }}>{quotation_payment}</div>
                  </div>
                );
              }
              
              if (show_quotation_note && quotation_note && quotation_note.trim().length > 0) {
                list.push(
                  <div key="note" style={{ display: 'flex', alignItems: 'baseline' }}>
                    <div style={{ width: '85px', fontWeight: 'bold', flexShrink: 0 }}>
                      0{index++}. Note
                    </div>
                    <div style={{ width: '10px', fontWeight: 'bold', flexShrink: 0, textAlign: 'center' }}>:</div>
                    <div style={{ flex: 1, fontWeight: 'normal', paddingLeft: '4px' }}>{quotation_note}</div>
                  </div>
                );
              }
              
              return list;
            })()}
          </div>

          <div style={{ fontWeight: 'normal', marginBottom: '8px' }}>
            In anticipation we look forward to receive your order.
          </div>

          <div style={{ fontWeight: 'bold', marginBottom: '12px' }}>
            Thanking you
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            {/* Signature Area */}
            <div style={{ textAlign: 'center', minWidth: '160px', position: 'relative' }}>
              <div style={{ fontWeight: 'bold', fontSize: '12px' }}>For {org.name || "ICON SYSTEMS"}</div>
              {(invoiceData?.show_signature !== false && (invoiceData?.signature_url || org.signature_url)) ? (
                <div style={{ height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0' }}>
                  <img
                    src={invoiceData?.signature_url || org.signature_url}
                    alt="Signature Stamp"
                    style={{ maxHeight: '52px', maxWidth: '150px', objectFit: 'contain' }}
                  />
                </div>
              ) : (
                <div style={{ height: '52px' }}></div>
              )}
              <div style={{ fontSize: '11px', fontWeight: 'bold', margin: '2px 0' }}>
                {invoiceData?.signatory_title || "Proprietor"}
              </div>
            </div>
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
          padding: '28px 15px 20px',
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, position: 'relative', gap: '12px', width: '100%' }}>
            <div style={{ fontWeight: 'bold', fontSize: '12px', letterSpacing: '0.2px', textAlign: 'center', width: '100%', color: '#ffffff' }}>
              {org.address
                ? org.address
                    .split(/[!,]+/)
                    .map(part => part.trim())
                    .filter(part => part.length > 0)
                    .join(', ')
                : ''}
            </div>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
              
              {/* Facebook Pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#fff',
                border: '1px solid #cbd5e1',
                borderRadius: '24px',
                padding: '5px 14px',
                color: '#0083c2',
                fontSize: '11px',
                fontWeight: 'bold',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#0083c2">
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
                borderRadius: '24px',
                padding: '5px 14px',
                color: '#0083c2',
                fontSize: '11px',
                fontWeight: 'bold',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#0083c2">
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
                borderRadius: '24px',
                padding: '5px 14px',
                color: '#0083c2',
                fontSize: '11px',
                fontWeight: 'bold',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0083c2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
