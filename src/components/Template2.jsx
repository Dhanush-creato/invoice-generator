import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { numberToWords, formatDate } from "../utils/helpers";
import { scrambleId } from "../utils/crypto";

export default function Template2({ invoiceData, orgData }) {
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const {
    id = "",
    invoice_number = "992",
    date = new Date().toISOString().split('t')[0],
    due_date = "",
    customer_name = "",
    customer_address = "",
    customer_gstin = "",
    customer_state = "",
    customer_state_code = "",
    need_shipping = false,
    shipping_name = "",
    shipping_address = "",
    shipping_gstin = "",
    shipping_state = "",
    shipping_state_code = "",
    items = [],
    cgst_percent = 9,
    sgst_percent = 9,
    igst_percent = 0,
    is_interstate = false,
    irn = "76d6ce50250c953c782c117e8441cad274557097e05c1cfebf56e1c6c25809eb",
    ack_no = "112631182691225",
    ack_date = "2026-06-30",
    delivery_note = "",
    payment_mode = "Other",
    ref_no_date = "",
    other_references = "",
    buyer_order_no = "",
    buyer_order_date = "",
    dispatch_doc_no = "",
    dispatch_doc_date = "",
    dispatched_through = "",
    destination = "",
    terms_of_delivery = "",
    bank_name = "",
    bank_branch = "",
    bank_acc_no = "",
    bank_ifsc = "",
    notes = "",
  } = invoiceData || {};

  const org = orgData || {
    name: "DEEPAM ELECTRONICS",
    tagline: "Wholesale & Retail Electronic Components Dealer",
    phone: "22221246, 42108401",
    website: "",
    address: "NO.4, SUBHAN SAHEB LANE, S.J.P. CROSS ROAD, BANGALORE",
    gstin: "29AABFD9534F1ZD",
    state_code: "29",
    logo_url: "",
    signature_url: ""
  };

  const isDefaultOrg = (org.name || "").toUpperCase().includes("DEEPAM") || (org.name || "").toUpperCase().includes("ICON SYSTEMS");

  let sellerAddress = org.address || "";
  if ((org.name || "").toUpperCase().includes("ICON")) {
    if (!sellerAddress || (sellerAddress.includes("Sanjeevini Nagar") && !sellerAddress.includes("!"))) {
      sellerAddress = "# 507, 10th A Cross,!Sanjeevini Nagar, Nagarbhavi Main Road,!Bengaluru- 560072";
    }
  }

  // Fallback to org settings if custom settings exist, otherwise use template default strings
  const displayBankName = org.bank_name || bank_name || (isDefaultOrg ? "KOTAK MAHINDRA BANK LTD" : "");
  const displayBankBranch = org.bank_branch || bank_branch || (isDefaultOrg ? "Nr Road" : "");
  const displayBankAccNo = org.bank_acc_no || bank_acc_no || (isDefaultOrg ? "1611416266" : "");
  const displayBankIfsc = org.bank_ifsc || bank_ifsc || (isDefaultOrg ? "KKBK0008038" : "");

  // Generate QR Code URL
  useEffect(() => {
    if (id) {
      const shareUrl = invoiceData.pdf_url || `${window.location.origin}/public/invoice/${scrambleId(id)}`;
      QRCode.toDataURL(
        shareUrl,
        {
          width: 100,
          margin: 1
        },
        (err, url) => {
          if (!err) setQrCodeUrl(url);
        }
      );
    }
  }, [id, invoiceData.pdf_url]);

  // Group items by HSN/SAC for the bottom summary table
  const hsnGroups = items.reduce((acc, item) => {
    const hsn = item.hsn_code || "N/A";
    const amt = parseFloat(item.amount) || 0;
    if (!acc[hsn]) {
      acc[hsn] = { hsn, taxableValue: 0 };
    }
    acc[hsn].taxableValue += amt;
    return acc;
  }, {});

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

  const totalTax = cgstAmount + sgstAmount + igstAmount;
  const rawGrandTotal = taxableAmount + totalTax;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = parseFloat((grandTotal - rawGrandTotal).toFixed(2));

  const totalQty = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);

  // Adjust heights and font sizes of Logistics grid based on whether shipping details are enabled (to keep height matching left side)
  const rowMinHeight  = need_shipping ? '38px' : '34px';
  const termsMinHeight = need_shipping ? '45px' : '36px';
  const cellPadding   = '4px 8px';
  const labelFontSize = '11.5px';
  const valFontSize   = '13px';

  return (
    <div className="invoice-preview-container" style={{ padding: '20px', background: '#fff', color: '#000', minHeight: '257mm', display: 'flex', flexDirection: 'column' }}>
      <div className="tax-invoice-deepam" style={{ border: '1px solid #000', fontSize: '11px', lineHeight: '1.3', flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Top Header Label */}
        <div style={{ display: 'flex', borderBottom: '1px solid #000', fontSize: '11px', fontWeight: 'bold' }}>
          <div style={{ flex: 1, padding: '4px 8px' }}>Tax Invoice</div>
          <div style={{ flex: 1, padding: '4px 8px', textAlign: 'right' }}>(ORIGINAL FOR RECIPIENT)</div>
        </div>

        {/* Company Info / Billing Details */}
        <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
          {/* Seller / Buyer column */}
          <div style={{ flex: 1, borderRight: '1px solid #000', display: 'flex', flexDirection: 'column' }}>
            
            {/* Seller */}
            <div style={{ padding: '8px', borderBottom: '1px solid #000', minHeight: '90px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '3px' }}>{org.name}</div>
                <div style={{ lineHeight: '1.35', fontSize: '11px', marginBottom: '5px' }}>
                  {sellerAddress ? sellerAddress.split(/[!\n]/).map((line, lIdx) => {
                    const trimmed = line.trim();
                    return trimmed ? <div key={lIdx}>{trimmed}</div> : null;
                  }) : null}
                </div>
                {org.phone && <div style={{ marginBottom: '4px' }}>PH NO-{org.phone}</div>}
                <div style={{ margin: '4px 0 3px' }}><span style={{ fontWeight: 'bold' }}>GSTIN/UIN:</span> <span style={{ textTransform: 'uppercase' }}>{org.gstin}</span></div>
                <div style={{ margin: '3px 0 0' }}><span style={{ fontWeight: 'bold' }}>State Name:</span> Karnataka, Code : {org.state_code}</div>
              </div>
            </div>

            {/* Consignee (Ship to) */}
            {need_shipping && (
              <div style={{ padding: '8px', borderBottom: '1px solid #000', flexGrow: 1 }}>
                <span style={{ fontWeight: 'bold', fontSize: '11px', textDecoration: 'underline', display: 'block', marginBottom: '2px' }}>Consignee (Ship to)</span>
                <div style={{ fontWeight: 'bold', fontSize: '13.5px', margin: '2px 0 3px' }}>{shipping_name || customer_name}</div>
                <div style={{ lineHeight: '1.35', fontSize: '11px', marginBottom: '5px' }}>
                  {(shipping_address || customer_address) ? (shipping_address || customer_address).split(/[!\n]/).map((line, lIdx) => {
                    const trimmed = line.trim();
                    return trimmed ? <div key={lIdx}>{trimmed}</div> : null;
                  }) : null}
                </div>
                <div style={{ margin: '4px 0 3px' }}><span style={{ fontWeight: 'bold' }}>GSTIN/UIN:</span> <span style={{ textTransform: 'uppercase' }}>{shipping_gstin || customer_gstin}</span></div>
                <div style={{ margin: '3px 0 0' }}><span style={{ fontWeight: 'bold' }}>State Name:</span> {shipping_state || customer_state}, Code : {shipping_state_code || customer_state_code}</div>
              </div>
            )}

            {/* Buyer (Bill to) */}
            <div style={{ padding: '8px', flexGrow: 1 }}>
              <span style={{ fontWeight: 'bold', fontSize: '11px', textDecoration: 'underline', display: 'block', marginBottom: '2px' }}>Buyer (Bill to)</span>
              <div style={{ fontWeight: 'bold', fontSize: '13.5px', margin: '2px 0 3px' }}>{customer_name}</div>
              <div style={{ lineHeight: '1.35', fontSize: '11px', marginBottom: '5px' }}>
                {customer_address ? customer_address.split(/[!\n]/).map((line, lIdx) => {
                  const trimmed = line.trim();
                  return trimmed ? <div key={lIdx}>{trimmed}</div> : null;
                }) : null}
              </div>
              <div style={{ margin: '4px 0 3px' }}><span style={{ fontWeight: 'bold' }}>GSTIN/UIN:</span> <span style={{ textTransform: 'uppercase' }}>{customer_gstin}</span></div>
              <div style={{ margin: '3px 0 0' }}><span style={{ fontWeight: 'bold' }}>State Name:</span> {customer_state}, Code : {customer_state_code}</div>
            </div>
            
          </div>

          {/* Logistics & Dates column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', fontSize: valFontSize }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #000', minHeight: rowMinHeight }}>
              <div style={{ flex: 1, padding: cellPadding, borderRight: '1px solid #000', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ color: '#000', display: 'block', fontSize: labelFontSize, marginBottom: '2px', lineHeight: '1.2' }}>Invoice No.</span>
                <span style={{ fontWeight: 'bold', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: '1.25' }}>{invoice_number}</span>
              </div>
              <div style={{ flex: 1, padding: cellPadding, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ color: '#000', display: 'block', fontSize: labelFontSize, marginBottom: '2px', lineHeight: '1.2' }}>Dated</span>
                <span style={{ fontWeight: 'bold', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: '1.25' }}>{formatDate(date)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #000', minHeight: rowMinHeight }}>
              <div style={{ flex: 1, padding: cellPadding, borderRight: '1px solid #000', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ color: '#000', display: 'block', fontSize: labelFontSize, marginBottom: '2px', lineHeight: '1.2' }}>Reference No. & Date.</span>
                <span style={{ fontWeight: '600', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: '1.25' }}>{ref_no_date || "N/A"}</span>
              </div>
              <div style={{ flex: 1, padding: cellPadding, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ color: '#000', display: 'block', fontSize: labelFontSize, marginBottom: '2px', lineHeight: '1.2' }}>Other References</span>
                <span style={{ fontWeight: '600', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: '1.25' }}>{other_references || "N/A"}</span>
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #000', minHeight: rowMinHeight }}>
              <div style={{ flex: 1, padding: cellPadding, borderRight: '1px solid #000', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ color: '#000', display: 'block', fontSize: labelFontSize, marginBottom: '2px', lineHeight: '1.2' }}>Purchase Order No.</span>
                <span style={{ fontWeight: '600', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: '1.25' }}>{buyer_order_no || "N/A"}</span>
              </div>
              <div style={{ flex: 1, padding: cellPadding, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ color: '#000', display: 'block', fontSize: labelFontSize, marginBottom: '2px', lineHeight: '1.2' }}>Dated</span>
                <span style={{ fontWeight: '600', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: '1.25' }}>{buyer_order_date ? formatDate(buyer_order_date) : "N/A"}</span>
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #000', minHeight: rowMinHeight }}>
              <div style={{ flex: 1, padding: cellPadding, borderRight: '1px solid #000', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ color: '#000', display: 'block', fontSize: labelFontSize, marginBottom: '2px', lineHeight: '1.2' }}>Dispatch Challan No.</span>
                <span style={{ fontWeight: '600', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: '1.25' }}>{dispatch_doc_no || "N/A"}</span>
              </div>
              <div style={{ flex: 1, padding: cellPadding, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ color: '#000', display: 'block', fontSize: labelFontSize, marginBottom: '2px', lineHeight: '1.2' }}>Delivery Challan Date</span>
                <span style={{ fontWeight: '600', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: '1.25' }}>{dispatch_doc_date ? formatDate(dispatch_doc_date) : "N/A"}</span>
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #000', minHeight: rowMinHeight }}>
              <div style={{ flex: 1, padding: cellPadding, borderRight: '1px solid #000', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ color: '#000', display: 'block', fontSize: labelFontSize, marginBottom: '2px', lineHeight: '1.2' }}>Dispatched through</span>
                <span style={{ fontWeight: '600', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: '1.25' }}>{dispatched_through || "N/A"}</span>
              </div>
              <div style={{ flex: 1, padding: cellPadding, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ color: '#000', display: 'block', fontSize: labelFontSize, marginBottom: '2px', lineHeight: '1.2' }}>Destination</span>
                <span style={{ fontWeight: '600', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: '1.25' }}>{destination || "N/A"}</span>
              </div>
            </div>

            <div style={{ padding: cellPadding, flexGrow: 1, minHeight: termsMinHeight, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
              <span style={{ color: '#444', display: 'block', fontSize: labelFontSize, marginBottom: '2px', lineHeight: '1.2' }}>Terms of Delivery</span>
              <div style={{ fontWeight: '600', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: '1.25' }}>{terms_of_delivery || "N/A"}</div>
            </div>
          </div>
        </div>

        {/* Product Items Table — flex:1 makes this grow to fill remaining A4 space */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', borderBottom: '1px solid #000', flex: 1, height: '100%' }}>
          <thead>
            <tr style={{ height: '24px' }}>
              <th style={{ width: '4%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'center' }}>Sl No.</th>
              <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'left' }}>Description of Goods</th>
              <th style={{ width: '12%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'center' }}>HSN/SAC</th>
              <th style={{ width: '12%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'right' }}>Quantity</th>
              <th style={{ width: '12%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'right' }}>Rate</th>
              <th style={{ width: '8%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'center' }}>per</th>
              <th style={{ width: '12%', borderBottom: '1px solid #000', padding: '4px', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ height: '1px' }}>
                <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'center', verticalAlign: 'top' }}>{idx + 1}</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'left', verticalAlign: 'top', fontWeight: 'bold' }}>{item.description}</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'center', verticalAlign: 'top' }}>{item.hsn_code}</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold' }}>{item.quantity} {item.unit || 'nos'}</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right', verticalAlign: 'top' }}>{parseFloat(item.rate || 0).toFixed(2)}</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'center', verticalAlign: 'top' }}>{item.unit || 'nos.'}</td>
                <td style={{ padding: '4px', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold' }}>{parseFloat(item.amount || 0).toFixed(2)}</td>
              </tr>
            ))}

            {/* Flexible spacer row that absorbs all excess height, keeping taxes together at the bottom */}
            <tr style={{ height: '100%' }}>
              <td style={{ borderRight: '1px solid #000', padding: '0 4px' }}>&nbsp;</td>
              <td style={{ borderRight: '1px solid #000', padding: '0 4px' }}>&nbsp;</td>
              <td style={{ borderRight: '1px solid #000', padding: '0 4px' }}>&nbsp;</td>
              <td style={{ borderRight: '1px solid #000', padding: '0 4px' }}>&nbsp;</td>
              <td style={{ borderRight: '1px solid #000', padding: '0 4px' }}>&nbsp;</td>
              <td style={{ borderRight: '1px solid #000', padding: '0 4px' }}>&nbsp;</td>
              <td style={{ padding: '0 4px' }}>&nbsp;</td>
            </tr>

            {/* Subtotal tax additions rendered tightly together */}
            {!is_interstate ? (
              <>
                <tr style={{ height: '1px' }}>
                  <td style={{ borderRight: '1px solid #000', padding: '2px 4px' }}></td>
                  <td style={{ borderRight: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>CGST</td>
                  <td style={{ borderRight: '1px solid #000', padding: '2px 4px' }}></td>
                  <td style={{ borderRight: '1px solid #000', padding: '2px 4px' }}></td>
                  <td style={{ borderRight: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>{cgst_percent}%</td>
                  <td style={{ borderRight: '1px solid #000', padding: '2px 4px' }}></td>
                  <td style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>{cgstAmount.toFixed(2)}</td>
                </tr>
                <tr style={{ height: '1px' }}>
                  <td style={{ borderRight: '1px solid #000', padding: '2px 4px' }}></td>
                  <td style={{ borderRight: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>SGST</td>
                  <td style={{ borderRight: '1px solid #000', padding: '2px 4px' }}></td>
                  <td style={{ borderRight: '1px solid #000', padding: '2px 4px' }}></td>
                  <td style={{ borderRight: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>{sgst_percent}%</td>
                  <td style={{ borderRight: '1px solid #000', padding: '2px 4px' }}></td>
                  <td style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>{sgstAmount.toFixed(2)}</td>
                </tr>
              </>
            ) : (
              <tr style={{ height: '1px' }}>
                <td style={{ borderRight: '1px solid #000', padding: '2px 4px' }}></td>
                <td style={{ borderRight: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>IGST</td>
                <td style={{ borderRight: '1px solid #000', padding: '2px 4px' }}></td>
                <td style={{ borderRight: '1px solid #000', padding: '2px 4px' }}></td>
                <td style={{ borderRight: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>{igst_percent}%</td>
                <td style={{ borderRight: '1px solid #000', padding: '2px 4px' }}></td>
                <td style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>{igstAmount.toFixed(2)}</td>
              </tr>
            )}

            <tr style={{ height: '1px' }}>
              <td style={{ borderRight: '1px solid #000', padding: '2px 4px' }}></td>
              <td style={{ borderRight: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>ROUND OFF - SALES</td>
              <td style={{ borderRight: '1px solid #000', padding: '2px 4px' }}></td>
              <td style={{ borderRight: '1px solid #000', padding: '2px 4px' }}></td>
              <td style={{ borderRight: '1px solid #000', padding: '2px 4px' }}></td>
              <td style={{ borderRight: '1px solid #000', padding: '2px 4px' }}></td>
              <td style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>{roundOff.toFixed(2)}</td>
            </tr>

            {/* Total Row */}
            <tr style={{ height: '1px', borderTop: '1px solid #000', borderBottom: '1px solid #000', background: '#fafafa', fontWeight: 'bold' }}>
              <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
              <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'left' }}>Total</td>
              <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
              <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right' }}>{totalQty.toFixed(2)} {items[0]?.unit || 'nos'}</td>
              <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
              <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
              <td style={{ padding: '4px', textAlign: 'right' }}>₹{grandTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        </div>

        {/* Taxable Amount In Words */}
        <div style={{ padding: '6px 8px', borderBottom: '1px solid #000', fontSize: '11px' }}>
          <div>Amount Chargeable (in words)</div>
          <div style={{ fontWeight: 'bold', fontSize: '11.5px', textTransform: 'capitalize' }}>Indian Rupees {numberToWords(grandTotal).replace('Rupees ', '')}</div>
        </div>

        {/* GST Tax Summary Table in Box Format (Single-row, no HSN) */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', borderBottom: '1px solid #000', textAlign: 'center' }}>
          <thead>
            <tr style={{ background: '#eee', fontWeight: 'bold', height: '26px' }}>
              <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '6px 4px', width: '20%', verticalAlign: 'middle' }}>Taxable Value</th>
              {!is_interstate ? (
                <>
                  <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '6px 4px', width: '12%', verticalAlign: 'middle' }}>CGST Rate</th>
                  <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '6px 4px', width: '16%', verticalAlign: 'middle' }}>CGST Amount</th>
                  <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '6px 4px', width: '12%', verticalAlign: 'middle' }}>SGST Rate</th>
                  <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '6px 4px', width: '16%', verticalAlign: 'middle' }}>SGST Amount</th>
                </>
              ) : (
                <>
                  <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '6px 4px', width: '25%', verticalAlign: 'middle' }}>IGST Rate</th>
                  <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '6px 4px', width: '30%', verticalAlign: 'middle' }}>IGST Amount</th>
                </>
              )}
              <th style={{ borderBottom: '1px solid #000', padding: '6px 4px', width: '24%', verticalAlign: 'middle' }}>Total Tax Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ height: '24px', fontWeight: 'bold' }}>
              <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'right' }}>{taxableAmount.toFixed(2)}</td>
              {!is_interstate ? (
                <>
                  <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px' }}>{cgst_percent}%</td>
                  <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'right' }}>{cgstAmount.toFixed(2)}</td>
                  <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px' }}>{sgst_percent}%</td>
                  <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'right' }}>{sgstAmount.toFixed(2)}</td>
                </>
              ) : (
                <>
                  <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px' }}>{igst_percent}%</td>
                  <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'right' }}>{igstAmount.toFixed(2)}</td>
                </>
              )}
              <td style={{ borderBottom: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>{totalTax.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Tax Amount In Words */}
        <div style={{ padding: '6px 8px', borderBottom: '1px solid #000', fontSize: '11px' }}>
          <div>Tax Amount (in words) :</div>
          <div style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>Indian Rupees {numberToWords(totalTax).replace('Rupees ', '')}</div>
        </div>

        {/* Bottom Declarations, Bank & Signature Section */}
        <div style={{ display: 'flex', minHeight: '160px' }}>
          {/* Declarations & Bank */}
          <div style={{ flex: 1.2, borderRight: '1px solid #000', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <span style={{ fontWeight: 'bold', textDecoration: 'underline', display: 'block', fontSize: '12px', marginBottom: '2px' }}>Declaration:</span>
              <p style={{ fontSize: '12px', color: '#000' }}>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
            </div>
            
            {/* Bank details */}
            <div style={{ fontSize: '12px', marginTop: 'auto', borderTop: '1px dashed #ccc', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 'bold', display: 'block', textDecoration: 'underline', marginBottom: '2px' }}>Company's Bank Details:</span>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: '140px' }}>A/c Holder's Name:</div>
                  <div style={{ fontWeight: 'bold' }}>{org.name}</div>
                </div>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: '140px' }}>Bank Name:</div>
                  <div style={{ fontWeight: 'bold' }}>{displayBankName}</div>
                </div>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: '140px' }}>A/c No:</div>
                  <div style={{ fontWeight: 'bold' }}>{displayBankAccNo}</div>
                </div>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: '140px' }}>Branch &amp; IFS Code:</div>
                  <div style={{ fontWeight: 'bold' }}>{displayBankBranch} &amp; {displayBankIfsc}</div>
                </div>
              </div>

              {org.phonepe_url && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <img src={org.phonepe_url} alt="Payment QR" style={{ width: '60px', height: '60px', objectFit: 'contain', border: '1px solid #ddd', padding: '2px', borderRadius: '4px', background: '#fff' }} />
                  <span style={{ fontSize: '7px', fontWeight: 'bold', color: '#555', marginTop: '2px' }}>Payment Scanner</span>
                </div>
              )}
            </div>
          </div>

          {/* Authorised Signatory */}
          <div style={{ flex: 0.8, padding: '6px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>for {org.name}</div>
            
            {org.signature_url && (
              <img src={org.signature_url} alt="Authorized Signature" className="invoice-signature" style={{ maxHeight: '55px', position: 'absolute', bottom: '25px', right: '25px', opacity: 0.9 }} />
            )}
            
            <div style={{ marginTop: 'auto', fontWeight: 'bold', fontSize: '12px' }}>Authorised Signatory</div>
          </div>
        </div>

        {/* Footer text */}
        <div style={{ borderTop: '1px solid #000', padding: '6px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>
          This is a Computer Generated Invoice
        </div>

      </div>
    </div>
  );
}
