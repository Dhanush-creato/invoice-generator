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
    customer_name = "Icon Systems",
    customer_address = "No.01, 10th Cross, Vigneshwara Nagar, Sunkadakatte, Bengaluru Urban",
    customer_gstin = "29ANUPR9033R1ZL",
    customer_state = "Karnataka",
    customer_state_code = "29",
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

  return (
    <div className="invoice-preview-container" style={{ padding: '20px', background: '#fff', color: '#000' }}>
      <div className="tax-invoice-deepam" style={{ border: '1px solid #000', fontSize: '11px', lineHeight: '1.3' }}>
        
        {/* Top Header Label */}
        <div style={{ display: 'flex', borderBottom: '1px solid #000', fontSize: '11px', fontWeight: 'bold' }}>
          <div style={{ flex: 1, padding: '4px 8px' }}>Tax Invoice</div>
          <div style={{ flex: 1, padding: '4px 8px', textAlign: 'center' }}>(ORIGINAL FOR RECIPIENT)</div>
          <div style={{ flex: 1, padding: '4px 8px', textAlign: 'right' }}>e-Invoice</div>
        </div>

        {/* IRN, Ack No and e-Invoice QR Code section */}
        <div style={{ display: 'flex', borderBottom: '1px solid #000', padding: '8px' }}>
          <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '4px', wordBreak: 'break-all' }}>
            <div><span style={{ fontWeight: 'bold' }}>IRN :</span> {irn || "N/A"}</div>
            <div><span style={{ fontWeight: 'bold' }}>Ack No. :</span> {ack_no || "N/A"}</div>
            <div><span style={{ fontWeight: 'bold' }}>Ack Date :</span> {ack_date ? formatDate(ack_date) : "N/A"}</div>
          </div>
          <div style={{ flex: 0.5, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            {qrCodeUrl ? (
              <div style={{ textAlign: 'center' }}>
                <img src={qrCodeUrl} alt="e-Invoice QR" style={{ width: '85px', height: '85px' }} />
              </div>
            ) : (
              <div style={{ width: '80px', height: '80px', border: '1px dashed #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>QR Code</div>
            )}
          </div>
        </div>

        {/* Company Info / Billing Details */}
        <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
          {/* Seller / Buyer column */}
          <div style={{ flex: 1, borderRight: '1px solid #000', display: 'flex', flexDirection: 'column' }}>
            
            {/* Seller */}
            <div style={{ padding: '8px', borderBottom: '1px solid #000', minHeight: '90px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{org.name}</div>
              <div>{org.address}</div>
              {org.phone && <div>PH NO-{org.phone}</div>}
              <div><span style={{ fontWeight: 'bold' }}>GSTIN/UIN:</span> <span style={{ textTransform: 'uppercase' }}>{org.gstin}</span></div>
              <div><span style={{ fontWeight: 'bold' }}>State Name:</span> Karnataka, Code : {org.state_code}</div>
            </div>

            {/* Consignee (Ship to) */}
            <div style={{ padding: '8px', borderBottom: '1px solid #000', minHeight: '90px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '10px', textDecoration: 'underline' }}>Consignee (Ship to)</span>
              <div style={{ fontWeight: 'bold', margin: '2px 0' }}>{customer_name}</div>
              <div style={{ lineHeight: '1.3', fontSize: '10px' }}>
                {customer_address ? customer_address.split(/[!\n]/).map((line, lIdx) => {
                  const trimmed = line.trim();
                  return trimmed ? <div key={lIdx}>{trimmed}</div> : null;
                }) : null}
              </div>
              <div><span style={{ fontWeight: 'bold' }}>GSTIN/UIN:</span> <span style={{ textTransform: 'uppercase' }}>{customer_gstin}</span></div>
              <div><span style={{ fontWeight: 'bold' }}>State Name:</span> {customer_state}, Code : {customer_state_code}</div>
            </div>

            {/* Buyer (Bill to) */}
            <div style={{ padding: '8px', minHeight: '90px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '10px', textDecoration: 'underline' }}>Buyer (Bill to)</span>
              <div style={{ fontWeight: 'bold', margin: '2px 0' }}>{customer_name}</div>
              <div style={{ lineHeight: '1.3', fontSize: '10px' }}>
                {customer_address ? customer_address.split(/[!\n]/).map((line, lIdx) => {
                  const trimmed = line.trim();
                  return trimmed ? <div key={lIdx}>{trimmed}</div> : null;
                }) : null}
              </div>
              <div><span style={{ fontWeight: 'bold' }}>GSTIN/UIN:</span> <span style={{ textTransform: 'uppercase' }}>{customer_gstin}</span></div>
              <div><span style={{ fontWeight: 'bold' }}>State Name:</span> {customer_state}, Code : {customer_state_code}</div>
            </div>
            
          </div>

          {/* Logistics & Dates column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
              <div style={{ flex: 1, padding: '4px 8px', borderRight: '1px solid #000' }}>
                <span style={{ color: '#555', display: 'block', fontSize: '9px' }}>Invoice No.</span>
                <span style={{ fontWeight: 'bold' }}>{invoice_number}</span>
              </div>
              <div style={{ flex: 1, padding: '4px 8px' }}>
                <span style={{ color: '#555', display: 'block', fontSize: '9px' }}>Dated</span>
                <span style={{ fontWeight: 'bold' }}>{formatDate(date)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
              <div style={{ flex: 1, padding: '4px 8px', borderRight: '1px solid #000', minHeight: '35px' }}>
                <span style={{ color: '#555', display: 'block', fontSize: '9px' }}>Delivery Note</span>
                <span>{delivery_note || "N/A"}</span>
              </div>
              <div style={{ flex: 1, padding: '4px 8px', minHeight: '35px' }}>
                <span style={{ color: '#555', display: 'block', fontSize: '9px' }}>Mode/Terms of Payment</span>
                <span>{payment_mode}</span>
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
              <div style={{ flex: 1, padding: '4px 8px', borderRight: '1px solid #000', minHeight: '35px' }}>
                <span style={{ color: '#555', display: 'block', fontSize: '9px' }}>Reference No. & Date.</span>
                <span>{ref_no_date || "N/A"}</span>
              </div>
              <div style={{ flex: 1, padding: '4px 8px', minHeight: '35px' }}>
                <span style={{ color: '#555', display: 'block', fontSize: '9px' }}>Other References</span>
                <span>{other_references || "N/A"}</span>
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
              <div style={{ flex: 1, padding: '4px 8px', borderRight: '1px solid #000', minHeight: '35px' }}>
                <span style={{ color: '#555', display: 'block', fontSize: '9px' }}>Buyer's Order No.</span>
                <span>{buyer_order_no || "N/A"}</span>
              </div>
              <div style={{ flex: 1, padding: '4px 8px', minHeight: '35px' }}>
                <span style={{ color: '#555', display: 'block', fontSize: '9px' }}>Dated</span>
                <span>{buyer_order_date ? formatDate(buyer_order_date) : "N/A"}</span>
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
              <div style={{ flex: 1, padding: '4px 8px', borderRight: '1px solid #000', minHeight: '35px' }}>
                <span style={{ color: '#555', display: 'block', fontSize: '9px' }}>Dispatch Doc No.</span>
                <span>{dispatch_doc_no || "N/A"}</span>
              </div>
              <div style={{ flex: 1, padding: '4px 8px', minHeight: '35px' }}>
                <span style={{ color: '#555', display: 'block', fontSize: '9px' }}>Delivery Note Date</span>
                <span>{dispatch_doc_date ? formatDate(dispatch_doc_date) : "N/A"}</span>
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
              <div style={{ flex: 1, padding: '4px 8px', borderRight: '1px solid #000', minHeight: '35px' }}>
                <span style={{ color: '#555', display: 'block', fontSize: '9px' }}>Dispatched through</span>
                <span>{dispatched_through || "N/A"}</span>
              </div>
              <div style={{ flex: 1, padding: '4px 8px', minHeight: '35px' }}>
                <span style={{ color: '#555', display: 'block', fontSize: '9px' }}>Destination</span>
                <span>{destination || "N/A"}</span>
              </div>
            </div>

            <div style={{ padding: '4px 8px', flexGrow: 1, minHeight: '50px' }}>
              <span style={{ color: '#555', display: 'block', fontSize: '9px' }}>Terms of Delivery</span>
              <div style={{ whiteSpace: 'pre-wrap' }}>{terms_of_delivery || "N/A"}</div>
            </div>
          </div>
        </div>

        {/* Product Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', borderBottom: '1px solid #000' }}>
          <thead>
            <tr style={{ height: '24px' }}>
              <th style={{ width: '4%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'center' }}>Sl No.</th>
              <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'left' }}>Description of Goods</th>
              <th style={{ width: '10%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'center' }}>HSN/SAC</th>
              <th style={{ width: '8%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'center' }}>GST Rate</th>
              <th style={{ width: '12%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'right' }}>Quantity</th>
              <th style={{ width: '10%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'right' }}>Rate</th>
              <th style={{ width: '8%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'center' }}>per</th>
              <th style={{ width: '12%', borderBottom: '1px solid #000', padding: '4px', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ height: '24px' }}>
                <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'center', verticalAlign: 'top' }}>{idx + 1}</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'left', verticalAlign: 'top', fontWeight: 'bold' }}>{item.description}</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'center', verticalAlign: 'top' }}>{item.hsn_code}</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'center', verticalAlign: 'top' }}>
                  {is_interstate 
                    ? `${parseFloat(igst_percent)} %` 
                    : `${parseFloat(cgst_percent) + parseFloat(sgst_percent)} %`}
                </td>
                <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold' }}>{item.quantity} {item.unit || 'nos'}</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right', verticalAlign: 'top' }}>{parseFloat(item.rate || 0).toFixed(2)}</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'center', verticalAlign: 'top' }}>{item.unit || 'nos.'}</td>
                <td style={{ padding: '4px', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold' }}>{parseFloat(item.amount || 0).toFixed(2)}</td>
              </tr>
            ))}

            {/* Empty space filler */}
            {items.length < 4 && Array.from({ length: 4 - items.length }).map((_, idx) => (
              <tr key={`empty-${idx}`} style={{ height: '30px' }}>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                <td style={{ padding: '4px' }}></td>
              </tr>
            ))}

            {/* Subtotal tax additions rendered in standard Deepam electronics layout */}
            {!is_interstate ? (
              <>
                <tr style={{ height: '22px' }}>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>CGST</td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                  <td style={{ padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>{cgstAmount.toFixed(2)}</td>
                </tr>
                <tr style={{ height: '22px' }}>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>SGST</td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                  <td style={{ padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>{sgstAmount.toFixed(2)}</td>
                </tr>
              </>
            ) : (
              <tr style={{ height: '22px' }}>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>IGST</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                <td style={{ padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>{igstAmount.toFixed(2)}</td>
              </tr>
            )}

            {roundOff !== 0 && (
              <tr style={{ height: '22px' }}>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>ROUND OFF - SALES</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                <td style={{ padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>{roundOff.toFixed(2)}</td>
              </tr>
            )}

            {/* Total Row */}
            <tr style={{ height: '24px', borderTop: '1px solid #000', borderBottom: '1px solid #000', background: '#fafafa', fontWeight: 'bold' }}>
              <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
              <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'left' }}>Total</td>
              <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
              <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
              <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right' }}>{totalQty.toFixed(2)} {items[0]?.unit || 'nos'}</td>
              <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
              <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
              <td style={{ padding: '4px', textAlign: 'right' }}>₹{grandTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Taxable Amount In Words */}
        <div style={{ padding: '6px 8px', borderBottom: '1px solid #000', fontSize: '11px' }}>
          <div>Amount Chargeable (in words)</div>
          <div style={{ fontWeight: 'bold', fontSize: '11.5px', textTransform: 'capitalize' }}>Indian Rupees {numberToWords(grandTotal).replace('Rupees ', '')}</div>
        </div>

        {/* HSN/SAC Tax Summary Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', borderBottom: '1px solid #000', textAlign: 'center' }}>
          <thead>
            <tr style={{ background: '#eee', fontWeight: 'bold' }}>
              <th rowSpan={2} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '6px 4px' }}>HSN/SAC</th>
              <th rowSpan={2} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '6px 4px' }}>Taxable Value</th>
              {!is_interstate ? (
                <>
                  <th colSpan={2} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px' }}>Central Tax</th>
                  <th colSpan={2} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px' }}>State Tax</th>
                </>
              ) : (
                <th colSpan={2} style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px' }}>Integrated Tax</th>
              )}
              <th rowSpan={2} style={{ borderBottom: '1px solid #000', padding: '6px 4px' }}>Total Tax Amount</th>
            </tr>
            <tr style={{ background: '#eee', fontWeight: 'bold' }}>
              {!is_interstate ? (
                <>
                  <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px' }}>Rate</th>
                  <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px' }}>Amount</th>
                  <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px' }}>Rate</th>
                  <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px' }}>Amount</th>
                </>
              ) : (
                <>
                  <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px' }}>Rate</th>
                  <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px' }}>Amount</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {Object.values(hsnGroups).map((group, idx) => {
              const val = group.taxableValue;
              let cRate = 0, cAmt = 0, sRate = 0, sAmt = 0, iRate = 0, iAmt = 0;
              if (is_interstate) {
                iRate = parseFloat(igst_percent);
                iAmt = val * (iRate / 100);
              } else {
                cRate = parseFloat(cgst_percent);
                cAmt = val * (cRate / 100);
                sRate = parseFloat(sgst_percent);
                sAmt = val * (sRate / 100);
              }
              const rowTax = cAmt + sAmt + iAmt;

              return (
                <tr key={idx} style={{ height: '24px' }}>
                  <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px' }}>{group.hsn}</td>
                  <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'right' }}>{val.toFixed(2)}</td>
                  {!is_interstate ? (
                    <>
                      <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px' }}>{cRate}%</td>
                      <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'right' }}>{cAmt.toFixed(2)}</td>
                      <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px' }}>{sRate}%</td>
                      <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'right' }}>{sAmt.toFixed(2)}</td>
                    </>
                  ) : (
                    <>
                      <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px' }}>{iRate}%</td>
                      <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', textAlign: 'right' }}>{iAmt.toFixed(2)}</td>
                    </>
                  )}
                  <td style={{ borderBottom: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>{rowTax.toFixed(2)}</td>
                </tr>
              );
            })}
            <tr style={{ height: '24px', fontWeight: 'bold', background: '#fafafa' }}>
              <td style={{ borderRight: '1px solid #000', padding: '4px' }}>Total</td>
              <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right' }}>{taxableAmount.toFixed(2)}</td>
              {!is_interstate ? (
                <>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right' }}>{cgstAmount.toFixed(2)}</td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right' }}>{sgstAmount.toFixed(2)}</td>
                </>
              ) : (
                <>
                  <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right' }}>{igstAmount.toFixed(2)}</td>
                </>
              )}
              <td style={{ padding: '4px', textAlign: 'right' }}>{totalTax.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Tax Amount In Words */}
        <div style={{ padding: '6px 8px', borderBottom: '1px solid #000', fontSize: '11px' }}>
          <div>Tax Amount (in words) :</div>
          <div style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>Indian Rupees {numberToWords(totalTax).replace('Rupees ', '')}</div>
        </div>

        {/* Bottom Declarations, Bank & Signature Section */}
        <div style={{ display: 'flex', minHeight: '135px' }}>
          {/* Declarations & Bank */}
          <div style={{ flex: 1.2, borderRight: '1px solid #000', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <span style={{ fontWeight: 'bold', textDecoration: 'underline', display: 'block', fontSize: '9px', marginBottom: '2px' }}>Declaration:</span>
              <p style={{ fontSize: '9px', color: '#333' }}>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
            </div>
            
            {/* Bank details */}
            <div style={{ fontSize: '9.5px', marginTop: 'auto', borderTop: '1px dashed #ccc', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 'bold', display: 'block', textDecoration: 'underline', marginBottom: '2px' }}>Company's Bank Details:</span>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: '120px' }}>A/c Holder's Name:</div>
                  <div style={{ fontWeight: 'bold' }}>{org.name}</div>
                </div>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: '120px' }}>Bank Name:</div>
                  <div style={{ fontWeight: 'bold' }}>{displayBankName}</div>
                </div>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: '120px' }}>A/c No:</div>
                  <div style={{ fontWeight: 'bold' }}>{displayBankAccNo}</div>
                </div>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: '120px' }}>Branch & IFS Code:</div>
                  <div style={{ fontWeight: 'bold' }}>{displayBankBranch} & {displayBankIfsc}</div>
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
            <div style={{ fontSize: '9px', fontWeight: 'bold' }}>for {org.name}</div>
            
            {org.signature_url && (
              <img src={org.signature_url} alt="Authorized Signature" className="invoice-signature" style={{ maxHeight: '55px', position: 'absolute', bottom: '25px', right: '25px', opacity: 0.9 }} />
            )}
            
            <div style={{ marginTop: 'auto', fontWeight: 'bold', fontSize: '10px' }}>Authorised Signatory</div>
          </div>
        </div>

        {/* Footer text */}
        <div style={{ borderTop: '1px solid #000', padding: '4px', textAlign: 'center', fontSize: '9px', fontWeight: 'bold' }}>
          This is a Computer Generated Invoice
        </div>

      </div>
    </div>
  );
}
