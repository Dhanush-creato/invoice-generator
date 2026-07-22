import React from 'react';

export default function Template3({ invoiceData, orgData }) {
  const org = orgData || {};
  const {
    invoice_number = "",
    date = "",
    customer_name = "",
    customer_address = "",
    customer_gstin = "",
    customer_state_code = "",
    items = [],
    is_interstate = false,
    cgst_percent = 9,
    sgst_percent = 9,
    igst_percent = 18,
    bank_name = "",
    bank_branch = "",
    bank_acc_no = "",
    bank_acc_type = "",
    bank_ifsc = "",
    notes = "",
    terms = "",
    need_shipping = false,
    shipping_name = "",
    shipping_address = "",
    shipping_gstin = "",
    shipping_state = "Karnataka",
    shipping_state_code = "29"
  } = invoiceData || {};

  const isIconSystems = (org.name || "").toUpperCase().includes("ICON SYSTEMS");

  // Fallback to org settings if invoice-specific bank details are empty
  const displayBankName = bank_name || org.bank_name || (isIconSystems ? "Janatha seva co-operative bank ltd" : "");
  const displayBankBranch = bank_branch || org.bank_branch || (isIconSystems ? "Moodalapalya" : "");
  const displayBankAccNo = bank_acc_no || org.bank_acc_no || (isIconSystems ? "003110100000493" : "");
  const displayBankAccType = bank_acc_type || org.bank_acc_type || (isIconSystems ? "Current A/C" : "");
  const displayBankIfsc = bank_ifsc || org.bank_ifsc || (isIconSystems ? "JTSC0000003" : "");

  // Formatting date
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Helper: Convert Number to Indian Rupee Words
  const numberToWords = (num) => {
    try {
      const a = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
      ];
      const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

      const numToString = (n) => {
        if (n < 20) return a[n];
        const digit = n % 10;
        return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
      };

      const translate = (n) => {
        if (n < 100) return numToString(n);
        return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + translate(n % 100) : '');
      };

      let rupee = Math.floor(num);
      let paise = Math.round((num - rupee) * 100);
      let rupeeStr = '';
      let paiseStr = '';

      if (rupee === 0) {
        rupeeStr = 'Zero Rupees';
      } else {
        let parts = [];
        if (rupee >= 10000000) {
          parts.push(translate(Math.floor(rupee / 10000000)) + ' Crore');
          rupee %= 10000000;
        }
        if (rupee >= 100000) {
          parts.push(translate(Math.floor(rupee / 100000)) + ' Lakh');
          rupee %= 100000;
        }
        if (rupee >= 1000) {
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

  // Math Calculations
  const itemsList = Array.isArray(items) ? items : [];
  const taxableAmount = itemsList.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  
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

  return (
    <div className="invoice-preview-container pre-printed-layout" style={{
      padding: '8mm 8mm 12mm 8mm',
      background: '#fff',
      color: '#000',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      minHeight: '297mm',
      height: '297mm',
      boxSizing: 'border-box',
      position: 'relative'
    }}>
      
      {/* 1. Print spacer to leave space for pre-printed letterhead header */}
      <div className="pre-printed-header-spacer" style={{ height: '145px' }}></div>

      <div className="icon-systems-invoice" style={{ position: 'relative', marginTop: '10px' }}>
        
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
            {need_shipping ? (
              <div style={{ flex: 1.2, borderRight: '1px solid #000', display: 'flex', fontSize: '11px' }}>
                {/* Billed To */}
                <div style={{ flex: 1, borderRight: '1px solid #000', padding: '5px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', fontSize: '9px', display: 'block', textDecoration: 'underline' }}>Billed to: (TO)</span>
                    <div style={{ fontWeight: 'bold', margin: '2px 0', fontSize: '11px' }}>{customer_name}</div>
                    <div style={{ lineHeight: '1.3', fontSize: '9px' }}>
                      {customer_address ? customer_address.split(/[!\n]/).map((line, lIdx) => {
                        const trimmed = line.trim();
                        return trimmed ? <div key={lIdx}>{trimmed}</div> : null;
                      }) : null}
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '9px', marginTop: '4px' }}>
                    GSTIN : <span style={{ textTransform: 'uppercase' }}>{customer_gstin || "N/A"}</span>
                  </div>
                </div>
                {/* Shipped To */}
                <div style={{ flex: 1, padding: '5px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', fontSize: '9px', display: 'block', textDecoration: 'underline' }}>Shipped to: (Consignee)</span>
                    <div style={{ fontWeight: 'bold', margin: '2px 0', fontSize: '11px' }}>{shipping_name || customer_name}</div>
                    <div style={{ lineHeight: '1.3', fontSize: '9px' }}>
                      {(shipping_address || customer_address) ? (shipping_address || customer_address).split(/[!\n]/).map((line, lIdx) => {
                        const trimmed = line.trim();
                        return trimmed ? <div key={lIdx}>{trimmed}</div> : null;
                      }) : null}
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '9px', marginTop: '4px' }}>
                    GSTIN : <span style={{ textTransform: 'uppercase' }}>{shipping_gstin || customer_gstin || "N/A"}</span>
                  </div>
                </div>
              </div>
            ) : (
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
            )}
            
            {/* Invoice Meta details inside the right side (M/s Icon Systems layout) */}
            <div style={{ flex: 0.8, padding: '5px 8px', fontSize: '11px', lineHeight: '1.4' }}>
              <div><span style={{ fontWeight: 'bold' }}>Invoice No:</span> {invoice_number}</div>
              <div><span style={{ fontWeight: 'bold' }}>Date :</span> {formatDate(date)}</div>
              <div style={{ fontWeight: 'bold', marginTop: '5px', fontSize: '11px', color: '#000' }}>M/s {org.name || "ICON SYSTEMS"}</div>
              <div style={{ fontSize: '10px', lineHeight: '1.3', color: '#333' }}>
                {org.address 
                  ? org.address.split(/[!\n]/).map((line, lIdx) => {
                      const trimmed = line.trim();
                      return trimmed ? <div key={lIdx}>{trimmed}</div> : null;
                    })
                  : (
                    <>
                      <div>#507, 10th Cross, Sanjeevini nagar</div>
                      <div>Nagarbhavi main road</div>
                      <div>Bengaluru-560072</div>
                    </>
                  )}
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '10px', marginTop: '3px' }}>
                GSTN: <span style={{ textTransform: 'uppercase' }}>{org.gstin || "29ANUPR9033R1ZL"}</span>
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '10px' }}>
                State code: {org.state_code || "29"}
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
              {itemsList.map((item, idx) => (
                <tr key={idx} style={{ height: '22px' }}>
                  <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'center', verticalAlign: 'top' }}>{idx + 1}</td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px', verticalAlign: 'top', fontWeight: 'bold' }}>{item.description}</td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'center', verticalAlign: 'top' }}>{item.hsn_code}</td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'center', verticalAlign: 'top', fontWeight: 'bold' }}>{item.quantity} {item.unit || "No"}</td>
                  <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right', verticalAlign: 'top' }}>₹{(parseFloat(item.rate) || 0).toFixed(2)}</td>
                  <td style={{ padding: '4px', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold' }}>₹{(parseFloat(item.amount) || 0).toFixed(2)}</td>
                </tr>
              ))}
              {/* Empty space padding rows */}
              {itemsList.length < 9 && Array.from({ length: 9 - itemsList.length }).map((_, idx) => (
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
            <div style={{ flex: 1.2, padding: '8px', borderRight: '1px solid #000', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: '11px', lineHeight: '1.4', marginTop: 'auto' }}>
                <span style={{ fontWeight: 'bold' }}>Total in words: </span>
                <span style={{ fontWeight: 'bold', fontStyle: 'italic' }}>{numberToWords(grandTotal)}</span>
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
              <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                <div style={{ flex: 1.3, padding: '6px 8px', borderRight: '1px solid #000', fontWeight: 'bold', textAlign: 'right' }}>Round off</div>
                <div style={{ flex: 0.7, padding: '6px 8px', fontWeight: 'bold', textAlign: 'right' }}>₹{roundOff.toFixed(2)}</div>
              </div>
              
              <div style={{ display: 'flex', background: '#f5f5f5', fontSize: '13px' }}>
                <div style={{ flex: 1.3, padding: '8px', borderRight: '1px solid #000', fontWeight: 'extrabold', textAlign: 'right' }}>TOTAL</div>
                <div style={{ flex: 0.7, padding: '8px', fontWeight: 'extrabold', textAlign: 'right' }}>₹{grandTotal.toFixed(2)}</div>
              </div>
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
            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>For {org.name}</div>
            
            {/* Signature image if uploaded in settings */}
            {org.signature_url && (
              <img src={org.signature_url} alt="Signature Stamp" className="invoice-signature" style={{ maxHeight: '55px', position: 'absolute', top: '25px', opacity: 0.85 }} />
            )}
            
            <div style={{ fontWeight: 'bold', marginTop: 'auto', textAlign: 'center', fontSize: '9.5px' }}>Proprietor</div>
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

      {/* 2. Print spacer to leave space for pre-printed letterhead footer */}
      <div className="pre-printed-footer-spacer" style={{ height: '55px' }}></div>

    </div>
  );
}
