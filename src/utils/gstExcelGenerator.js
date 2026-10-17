/**
 * gstExcelGenerator.js
 * Generates Excel workbooks using ExcelJS matching the client's GST TEST.xlsx template.
 */
import ExcelJS from "exceljs";

/**
 * Groups an array of invoice line items by (HSN code + Rate).
 * Items sharing the same HSN and the same unit rate are merged into one row
 * with their quantities and all monetary fields summed.
 * Items with the same HSN but a different rate become separate rows.
 *
 * @param {Array} items  - Flat array of calculatedItems from invoices
 * @returns {Array}      - Grouped & merged array
 */
export function groupByHsnAndRate(items) {
  const map = new Map();

  items.forEach((it) => {
    const rawHsn = String(it.hsn_code || "").trim();
    const hsnStr = (rawHsn && rawHsn !== "undefined" && rawHsn !== "null" && rawHsn !== "N/A") ? rawHsn : "Misc";
    const rateNum = Number(it.rate) || 0;
    // Key = HSN + "||" + Rate
    const key = `${hsnStr}||${rateNum}`;

    if (map.has(key)) {
      const existing = map.get(key);
      existing.quantity     += Number(it.quantity)     || 0;
      existing.taxableValue += Number(it.taxableValue) || 0;
      existing.sgstAmount   += Number(it.sgstAmount)   || 0;
      existing.cgstAmount   += Number(it.cgstAmount)   || 0;
      existing.igstAmount   += Number(it.igstAmount)   || 0;
      existing.totalAmount  += Number(it.totalAmount)  || 0;
      if (it.invoice_number && !existing.invoices.includes(it.invoice_number)) {
        existing.invoices.push(it.invoice_number);
      }
      if (it.customer_name && !existing.customers.includes(it.customer_name)) {
        existing.customers.push(it.customer_name);
      }
    } else {
      map.set(key, {
        ...it,
        hsn_code:     hsnStr,
        rate:         rateNum,
        quantity:     Number(it.quantity)     || 0,
        taxableValue: Number(it.taxableValue) || 0,
        sgstAmount:   Number(it.sgstAmount)   || 0,
        cgstAmount:   Number(it.cgstAmount)   || 0,
        igstAmount:   Number(it.igstAmount)   || 0,
        totalAmount:  Number(it.totalAmount)  || 0,
        invoices:     it.invoice_number ? [it.invoice_number] : [],
        customers:    it.customer_name ? [it.customer_name] : []
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    const hsnComp = String(a.hsn_code).localeCompare(String(b.hsn_code));
    if (hsnComp !== 0) return hsnComp;
    return (Number(a.rate) || 0) - (Number(b.rate) || 0);
  });
}

const FONT_FAMILY = "Bookman Old Style";
const COLOR_RED = "FFFF0000";
const COLOR_BLUE = "FF0070C0";
const COLOR_PURPLE = "FF7030A0";
const COLOR_CYAN = "FF00B0F0";
const COLOR_YELLOW = "FFFFFF00";
const COLOR_LIGHT_GREEN = "FFE2EFDA";
const NUM_FMT_INR = '"₹" #,##0.00';

/**
 * Downloads a buffer or blob as a file in browser
 */
function triggerBrowserDownload(buffer, fileName) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }, 200);
}

/**
 * Generates and downloads the Excel report
 */
export async function exportGstExcelReport(reportData, businessProfile) {
  const { financialYear, monthIndex, summary, b2bInvoices, b2cInvoices, b2bHsnList, b2cHsnList, allHsnList, periodLabel } = reportData;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = businessProfile?.name || "Icon Systems";
  workbook.created = new Date();
  workbook.modified = new Date();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SHEET 1: Client Template Layout (Matches GST TEST.xlsx)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const wsTemplate = workbook.addWorksheet("GST Summary", {
    views: [{ showGridLines: true }]
  });

  // Set Column Widths for single clean table layout
  wsTemplate.columns = [
    { key: "A", width: 18 }, // Summary Box (Yellow B2B Box & Combined Total)
    { key: "B", width: 14 }, // HSN
    { key: "C", width: 10 }, // Qty
    { key: "D", width: 14 }, // Unit Rate (₹)
    { key: "E", width: 18 }, // Taxable Value (₹)
    { key: "F", width: 14 }, // SGST (₹)
    { key: "G", width: 14 }, // CGST (₹)
    { key: "H", width: 18 }, // Total Amount (₹)
  ];

  // Helper for applying cell styling
  const styleCell = (cell, options = {}) => {
    if (options.font) cell.font = options.font;
    if (options.fill) cell.fill = options.fill;
    if (options.numFmt) cell.numFmt = options.numFmt;
    if (options.alignment) cell.alignment = options.alignment;
    if (options.border) cell.border = options.border;
  };

  // Row 4: Solid RED Bar across columns A to H
  const r4 = wsTemplate.getRow(4);
  for (let c = 1; c <= 8; c++) {
    const cell = r4.getCell(c);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR_RED }
    };
  }

  // Row 5: Date in B5 (Selected Period / Date Range)
  const cellB5 = wsTemplate.getCell("B5");
  cellB5.value = reportData.periodLabel || "10.10.2025";
  cellB5.font = { name: FONT_FAMILY, size: 11, bold: true };

  // Row 6: B6 = "B2B Sales"
  const cellB6 = wsTemplate.getCell("B6");
  cellB6.value = "B2B Sales";
  cellB6.font = { name: FONT_FAMILY, size: 12, bold: true, color: { argb: COLOR_RED } };

  // Row 8: Table Header (Red & Purple bold text, Bookman Old Style 11pt)
  const headerFontRed = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_RED } };
  const headerFontPurple = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_PURPLE } };

  wsTemplate.getCell("B8").value = "HSN";
  wsTemplate.getCell("B8").font = headerFontRed;

  wsTemplate.getCell("C8").value = "Qty";
  wsTemplate.getCell("C8").font = headerFontPurple;

  wsTemplate.getCell("D8").value = "Unit Rate";
  wsTemplate.getCell("D8").font = headerFontRed;

  wsTemplate.getCell("E8").value = "Taxable Value";
  wsTemplate.getCell("E8").font = headerFontRed;

  wsTemplate.getCell("F8").value = "SGST";
  wsTemplate.getCell("F8").font = headerFontRed;

  wsTemplate.getCell("G8").value = "CGST";
  wsTemplate.getCell("G8").font = headerFontRed;

  wsTemplate.getCell("H8").value = "Total Amount";
  wsTemplate.getCell("H8").font = headerFontRed;

  // Group ALL B2B items by (HSN + Rate) - NO artificial 9032 separation
  const b2bRaw = [];
  b2bInvoices.forEach((inv) => {
    (inv.calculatedItems || []).forEach((it) => {
      b2bRaw.push(it);
    });
  });
  const b2bItems = groupByHsnAndRate(b2bRaw);

  // Group ALL B2C items by (HSN + Rate) - NO artificial 9032 separation
  const b2cRaw = [];
  b2cInvoices.forEach((inv) => {
    (inv.calculatedItems || []).forEach((it) => {
      b2cRaw.push(it);
    });
  });
  const b2cItems = groupByHsnAndRate(b2cRaw);

  // Populate B2B Rows sequentially
  let currentRow = 9;
  let subtotalB2BQty = 0;
  let subtotalB2BTaxable = 0;
  let subtotalB2BSgst = 0;
  let subtotalB2BCgst = 0;
  let subtotalB2BTotal = 0;

  b2bItems.forEach((it) => {
    wsTemplate.getCell(`B${currentRow}`).value = it.hsn_code || "Misc";
    wsTemplate.getCell(`C${currentRow}`).value = it.quantity;
    wsTemplate.getCell(`D${currentRow}`).value = it.rate;
    wsTemplate.getCell(`E${currentRow}`).value = it.taxableValue;
    wsTemplate.getCell(`F${currentRow}`).value = it.sgstAmount;
    wsTemplate.getCell(`G${currentRow}`).value = it.cgstAmount;
    wsTemplate.getCell(`H${currentRow}`).value = it.totalAmount;

    [wsTemplate.getCell(`B${currentRow}`), wsTemplate.getCell(`C${currentRow}`)].forEach((c) => {
      c.font = { name: FONT_FAMILY, size: 11 };
    });
    [`D${currentRow}`, `E${currentRow}`, `F${currentRow}`, `G${currentRow}`, `H${currentRow}`].forEach((coord) => {
      const c = wsTemplate.getCell(coord);
      c.font = { name: FONT_FAMILY, size: 11 };
      c.numFmt = NUM_FMT_INR;
    });

    subtotalB2BQty += it.quantity;
    subtotalB2BTaxable += it.taxableValue;
    subtotalB2BSgst += it.sgstAmount;
    subtotalB2BCgst += it.cgstAmount;
    subtotalB2BTotal += it.totalAmount;
    currentRow++;
  });

  // Subtotal for B2B
  const b2bSubtotalRow = Math.max(currentRow, 10);
  const redSubtotalFont = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_RED } };

  wsTemplate.getCell(`B${b2bSubtotalRow}`).value = "Total B2B";
  wsTemplate.getCell(`B${b2bSubtotalRow}`).font = redSubtotalFont;

  wsTemplate.getCell(`C${b2bSubtotalRow}`).value = subtotalB2BQty;
  wsTemplate.getCell(`C${b2bSubtotalRow}`).font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_PURPLE } };

  wsTemplate.getCell(`E${b2bSubtotalRow}`).value = subtotalB2BTaxable;
  wsTemplate.getCell(`E${b2bSubtotalRow}`).font = redSubtotalFont;
  wsTemplate.getCell(`E${b2bSubtotalRow}`).numFmt = NUM_FMT_INR;

  wsTemplate.getCell(`F${b2bSubtotalRow}`).value = subtotalB2BSgst;
  wsTemplate.getCell(`F${b2bSubtotalRow}`).font = redSubtotalFont;
  wsTemplate.getCell(`F${b2bSubtotalRow}`).numFmt = NUM_FMT_INR;

  wsTemplate.getCell(`G${b2bSubtotalRow}`).value = subtotalB2BCgst;
  wsTemplate.getCell(`G${b2bSubtotalRow}`).font = redSubtotalFont;
  wsTemplate.getCell(`G${b2bSubtotalRow}`).numFmt = NUM_FMT_INR;

  wsTemplate.getCell(`H${b2bSubtotalRow}`).value = subtotalB2BTotal;
  wsTemplate.getCell(`H${b2bSubtotalRow}`).font = redSubtotalFont;
  wsTemplate.getCell(`H${b2bSubtotalRow}`).numFmt = NUM_FMT_INR;

  // Row 15: Column A has "B2B" (bold purple)
  const cellA15 = wsTemplate.getCell("A15");
  cellA15.value = "B2B";
  cellA15.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_PURPLE } };

  // Row 16-19: Yellow Box on Column A
  const yellowFill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_YELLOW } };

  const cellA16 = wsTemplate.getCell("A16");
  cellA16.value = summary.b2b.taxable;
  cellA16.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_PURPLE } };
  cellA16.fill = yellowFill;
  cellA16.numFmt = NUM_FMT_INR;

  const cellA17 = wsTemplate.getCell("A17");
  cellA17.value = summary.b2b.sgst;
  cellA17.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_PURPLE } };
  cellA17.fill = yellowFill;
  cellA17.numFmt = NUM_FMT_INR;

  const cellA18 = wsTemplate.getCell("A18");
  cellA18.value = summary.b2b.cgst;
  cellA18.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_PURPLE } };
  cellA18.fill = yellowFill;
  cellA18.numFmt = NUM_FMT_INR;

  const cellA19 = wsTemplate.getCell("A19");
  cellA19.value = summary.b2b.total;
  cellA19.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_PURPLE } };
  cellA19.fill = yellowFill;
  cellA19.numFmt = NUM_FMT_INR;

  // Solid CYAN Bar across columns A to H for B2C section
  const cyanBarRow = Math.max(b2bSubtotalRow + 2, 21);
  const rCyan = wsTemplate.getRow(cyanBarRow);
  for (let c = 1; c <= 8; c++) {
    rCyan.getCell(c).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR_CYAN }
    };
  }

  // B2C Header row
  const b2cTitleRow = cyanBarRow + 1;
  const cellB2cTitle = wsTemplate.getCell(`B${b2cTitleRow}`);
  cellB2cTitle.value = "B2C Sales";
  cellB2cTitle.font = { name: FONT_FAMILY, size: 12, bold: true, color: { argb: COLOR_BLUE } };

  const b2cHeaderRow = b2cTitleRow + 1;
  const headerFontBlue = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_BLUE } };

  wsTemplate.getCell(`B${b2cHeaderRow}`).value = "HSN";
  wsTemplate.getCell(`B${b2cHeaderRow}`).font = headerFontBlue;

  wsTemplate.getCell(`C${b2cHeaderRow}`).value = "Qty";
  wsTemplate.getCell(`C${b2cHeaderRow}`).font = headerFontPurple;

  wsTemplate.getCell(`D${b2cHeaderRow}`).value = "Unit Rate";
  wsTemplate.getCell(`D${b2cHeaderRow}`).font = headerFontBlue;

  wsTemplate.getCell(`E${b2cHeaderRow}`).value = "Taxable Value";
  wsTemplate.getCell(`E${b2cHeaderRow}`).font = headerFontBlue;

  wsTemplate.getCell(`F${b2cHeaderRow}`).value = "SGST";
  wsTemplate.getCell(`F${b2cHeaderRow}`).font = headerFontBlue;

  wsTemplate.getCell(`G${b2cHeaderRow}`).value = "CGST";
  wsTemplate.getCell(`G${b2cHeaderRow}`).font = headerFontBlue;

  wsTemplate.getCell(`H${b2cHeaderRow}`).value = "Total Amount";
  wsTemplate.getCell(`H${b2cHeaderRow}`).font = headerFontBlue;

  // Populate B2C rows sequentially
  let currentB2cRow = b2cHeaderRow + 1;
  let subtotalB2CQty = 0;
  let subtotalB2CTaxable = 0;
  let subtotalB2CSgst = 0;
  let subtotalB2CCgst = 0;
  let subtotalB2CTotal = 0;

  b2cItems.forEach((it) => {
    wsTemplate.getCell(`B${currentB2cRow}`).value = it.hsn_code || "Misc";
    wsTemplate.getCell(`C${currentB2cRow}`).value = it.quantity;
    wsTemplate.getCell(`D${currentB2cRow}`).value = it.rate;
    wsTemplate.getCell(`E${currentB2cRow}`).value = it.taxableValue;
    wsTemplate.getCell(`F${currentB2cRow}`).value = it.sgstAmount;
    wsTemplate.getCell(`G${currentB2cRow}`).value = it.cgstAmount;
    wsTemplate.getCell(`H${currentB2cRow}`).value = it.totalAmount;

    [wsTemplate.getCell(`B${currentB2cRow}`), wsTemplate.getCell(`C${currentB2cRow}`)].forEach((c) => {
      c.font = { name: FONT_FAMILY, size: 11 };
    });
    [`D${currentB2cRow}`, `E${currentB2cRow}`, `F${currentB2cRow}`, `G${currentB2cRow}`, `H${currentB2cRow}`].forEach((coord) => {
      const c = wsTemplate.getCell(coord);
      c.font = { name: FONT_FAMILY, size: 11 };
      c.numFmt = NUM_FMT_INR;
    });

    subtotalB2CQty += it.quantity;
    subtotalB2CTaxable += it.taxableValue;
    subtotalB2CSgst += it.sgstAmount;
    subtotalB2CCgst += it.cgstAmount;
    subtotalB2CTotal += it.totalAmount;
    currentB2cRow++;
  });

  // Total B2C Highlight Bar (Green)
  const b2cSubtotalRow = Math.max(currentB2cRow, b2cHeaderRow + 2);
  const greenFill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_LIGHT_GREEN } };
  const greenFont = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: "FF385723" } };

  wsTemplate.getCell(`B${b2cSubtotalRow}`).value = "Total B2C";
  wsTemplate.getCell(`B${b2cSubtotalRow}`).font = greenFont;
  wsTemplate.getCell(`B${b2cSubtotalRow}`).fill = greenFill;

  wsTemplate.getCell(`C${b2cSubtotalRow}`).value = subtotalB2CQty;
  wsTemplate.getCell(`C${b2cSubtotalRow}`).font = greenFont;
  wsTemplate.getCell(`C${b2cSubtotalRow}`).fill = greenFill;

  wsTemplate.getCell(`D${b2cSubtotalRow}`).fill = greenFill;

  wsTemplate.getCell(`E${b2cSubtotalRow}`).value = subtotalB2CTaxable;
  wsTemplate.getCell(`E${b2cSubtotalRow}`).font = greenFont;
  wsTemplate.getCell(`E${b2cSubtotalRow}`).fill = greenFill;
  wsTemplate.getCell(`E${b2cSubtotalRow}`).numFmt = NUM_FMT_INR;

  wsTemplate.getCell(`F${b2cSubtotalRow}`).value = subtotalB2CSgst;
  wsTemplate.getCell(`F${b2cSubtotalRow}`).font = greenFont;
  wsTemplate.getCell(`F${b2cSubtotalRow}`).fill = greenFill;
  wsTemplate.getCell(`F${b2cSubtotalRow}`).numFmt = NUM_FMT_INR;

  wsTemplate.getCell(`G${b2cSubtotalRow}`).value = subtotalB2CCgst;
  wsTemplate.getCell(`G${b2cSubtotalRow}`).font = greenFont;
  wsTemplate.getCell(`G${b2cSubtotalRow}`).fill = greenFill;
  wsTemplate.getCell(`G${b2cSubtotalRow}`).numFmt = NUM_FMT_INR;

  wsTemplate.getCell(`H${b2cSubtotalRow}`).value = subtotalB2CTotal;
  wsTemplate.getCell(`H${b2cSubtotalRow}`).font = greenFont;
  wsTemplate.getCell(`H${b2cSubtotalRow}`).fill = greenFill;
  wsTemplate.getCell(`H${b2cSubtotalRow}`).numFmt = NUM_FMT_INR;

  // Dedicated Grand Total (B2B + B2C) Row across table
  const grandTotalRow = b2cSubtotalRow + 1;
  const grandTotalFont = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_RED } };
  const grandTotalFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };

  wsTemplate.getCell(`B${grandTotalRow}`).value = "Grand Total (B2B + B2C)";
  wsTemplate.getCell(`B${grandTotalRow}`).font = grandTotalFont;
  wsTemplate.getCell(`B${grandTotalRow}`).fill = grandTotalFill;

  wsTemplate.getCell(`C${grandTotalRow}`).value = subtotalB2BQty + subtotalB2CQty;
  wsTemplate.getCell(`C${grandTotalRow}`).font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_PURPLE } };
  wsTemplate.getCell(`C${grandTotalRow}`).fill = grandTotalFill;

  wsTemplate.getCell(`D${grandTotalRow}`).fill = grandTotalFill;

  wsTemplate.getCell(`E${grandTotalRow}`).value = subtotalB2BTaxable + subtotalB2CTaxable;
  wsTemplate.getCell(`E${grandTotalRow}`).font = grandTotalFont;
  wsTemplate.getCell(`E${grandTotalRow}`).fill = grandTotalFill;
  wsTemplate.getCell(`E${grandTotalRow}`).numFmt = NUM_FMT_INR;

  wsTemplate.getCell(`F${grandTotalRow}`).value = subtotalB2BSgst + subtotalB2CSgst;
  wsTemplate.getCell(`F${grandTotalRow}`).font = grandTotalFont;
  wsTemplate.getCell(`F${grandTotalRow}`).fill = grandTotalFill;
  wsTemplate.getCell(`F${grandTotalRow}`).numFmt = NUM_FMT_INR;

  wsTemplate.getCell(`G${grandTotalRow}`).value = subtotalB2BCgst + subtotalB2CCgst;
  wsTemplate.getCell(`G${grandTotalRow}`).font = grandTotalFont;
  wsTemplate.getCell(`G${grandTotalRow}`).fill = grandTotalFill;
  wsTemplate.getCell(`G${grandTotalRow}`).numFmt = NUM_FMT_INR;

  wsTemplate.getCell(`H${grandTotalRow}`).value = subtotalB2BTotal + subtotalB2CTotal;
  wsTemplate.getCell(`H${grandTotalRow}`).font = grandTotalFont;
  wsTemplate.getCell(`H${grandTotalRow}`).fill = grandTotalFill;
  wsTemplate.getCell(`H${grandTotalRow}`).numFmt = NUM_FMT_INR;

  // Bottom-Left Combined Total Box (B2B + B2C) on Column A (4 complete rows with Grand Total)
  const totalTaxableCombined = (summary.b2b?.taxable || 0) + (summary.b2c?.taxable || 0);
  const totalSgstCombined = (summary.b2b?.sgst || 0) + (summary.b2c?.sgst || 0);
  const totalCgstCombined = (summary.b2b?.cgst || 0) + (summary.b2c?.cgst || 0);
  const totalAmountCombined = (summary.b2b?.total || 0) + (summary.b2c?.total || 0);

  const bottomBoxRow = Math.max(grandTotalRow + 1, 30);
  wsTemplate.getCell(`A${bottomBoxRow - 4}`).value = "Total (B2B + B2C)";
  wsTemplate.getCell(`A${bottomBoxRow - 4}`).font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: COLOR_PURPLE } };

  wsTemplate.getCell(`A${bottomBoxRow - 3}`).value = totalTaxableCombined;
  wsTemplate.getCell(`A${bottomBoxRow - 3}`).font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_RED } };
  wsTemplate.getCell(`A${bottomBoxRow - 3}`).fill = yellowFill;
  wsTemplate.getCell(`A${bottomBoxRow - 3}`).numFmt = NUM_FMT_INR;

  wsTemplate.getCell(`A${bottomBoxRow - 2}`).value = totalSgstCombined;
  wsTemplate.getCell(`A${bottomBoxRow - 2}`).font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_RED } };
  wsTemplate.getCell(`A${bottomBoxRow - 2}`).fill = yellowFill;
  wsTemplate.getCell(`A${bottomBoxRow - 2}`).numFmt = NUM_FMT_INR;

  wsTemplate.getCell(`A${bottomBoxRow - 1}`).value = totalCgstCombined;
  wsTemplate.getCell(`A${bottomBoxRow - 1}`).font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_RED } };
  wsTemplate.getCell(`A${bottomBoxRow - 1}`).fill = yellowFill;
  wsTemplate.getCell(`A${bottomBoxRow - 1}`).numFmt = NUM_FMT_INR;

  wsTemplate.getCell(`A${bottomBoxRow}`).value = totalAmountCombined;
  wsTemplate.getCell(`A${bottomBoxRow}`).font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_RED } };
  wsTemplate.getCell(`A${bottomBoxRow}`).fill = yellowFill;
  wsTemplate.getCell(`A${bottomBoxRow}`).numFmt = NUM_FMT_INR;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SHEET 2: B2B Invoices Detailed Drill-Down (Grouped by HSN & Rate)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const wsB2b = workbook.addWorksheet("B2B Invoices");
  wsB2b.columns = [
    { header: "HSN / SAC", key: "hsn", width: 14 },
    { header: "Item Description", key: "desc", width: 28 },
    { header: "Unit Rate (₹)", key: "rate", width: 14 },
    { header: "Total Qty", key: "qty", width: 12 },
    { header: "Unit", key: "unit", width: 8 },
    { header: "Taxable Value (₹)", key: "taxable", width: 18 },
    { header: "CGST Rate %", key: "cgstRate", width: 12 },
    { header: "CGST (₹)", key: "cgst", width: 14 },
    { header: "SGST Rate %", key: "sgstRate", width: 12 },
    { header: "SGST (₹)", key: "sgst", width: 14 },
    { header: "IGST Rate %", key: "igstRate", width: 12 },
    { header: "IGST (₹)", key: "igst", width: 14 },
    { header: "Total Amount (₹)", key: "total", width: 18 },
    { header: "Invoice No(s)", key: "invNo", width: 24 },
    { header: "Customer(s)", key: "customer", width: 28 }
  ];

  // Header style
  const headerRowB2B = wsB2b.getRow(1);
  headerRowB2B.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  headerRowB2B.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
  headerRowB2B.alignment = { vertical: "middle", horizontal: "center" };

  const b2bItemsRaw = [];
  b2bInvoices.forEach((inv) => {
    (inv.calculatedItems || []).forEach((it) => {
      b2bItemsRaw.push({
        ...it,
        invoice_number: inv.invoice_number,
        customer_name: inv.customer_name
      });
    });
  });

  const b2bGrouped = groupByHsnAndRate(b2bItemsRaw);

  b2bGrouped.forEach((it) => {
    const row = wsB2b.addRow({
      hsn: it.hsn_code || "Misc",
      desc: it.description || "",
      rate: it.rate,
      qty: it.quantity,
      unit: it.unit || "No",
      taxable: it.taxableValue,
      cgstRate: it.cgstRate ? `${it.cgstRate}%` : "-",
      cgst: it.cgstAmount,
      sgstRate: it.sgstRate ? `${it.sgstRate}%` : "-",
      sgst: it.sgstAmount,
      igstRate: it.igstRate ? `${it.igstRate}%` : "-",
      igst: it.igstAmount,
      total: it.totalAmount,
      invNo: (it.invoices || []).join(", ") || "",
      customer: (it.customers || []).join(", ") || ""
    });

    [3, 6, 8, 10, 12, 13].forEach((colIdx) => {
      row.getCell(colIdx).numFmt = NUM_FMT_INR;
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SHEET 3: B2C Invoices Detailed Drill-Down (Grouped by HSN & Rate)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const wsB2c = workbook.addWorksheet("B2C Invoices");
  wsB2c.columns = [
    { header: "HSN / SAC", key: "hsn", width: 14 },
    { header: "Item Description", key: "desc", width: 28 },
    { header: "Unit Rate (₹)", key: "rate", width: 14 },
    { header: "Total Qty", key: "qty", width: 12 },
    { header: "Unit", key: "unit", width: 8 },
    { header: "Taxable Value (₹)", key: "taxable", width: 18 },
    { header: "CGST Rate %", key: "cgstRate", width: 12 },
    { header: "CGST (₹)", key: "cgst", width: 14 },
    { header: "SGST Rate %", key: "sgstRate", width: 12 },
    { header: "SGST (₹)", key: "sgst", width: 14 },
    { header: "IGST Rate %", key: "igstRate", width: 12 },
    { header: "IGST (₹)", key: "igst", width: 14 },
    { header: "Total Amount (₹)", key: "total", width: 18 },
    { header: "Invoice No(s)", key: "invNo", width: 24 }
  ];

  const headerRowB2C = wsB2c.getRow(1);
  headerRowB2C.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  headerRowB2C.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0284C7" } };
  headerRowB2C.alignment = { vertical: "middle", horizontal: "center" };

  const b2cItemsRaw = [];
  b2cInvoices.forEach((inv) => {
    (inv.calculatedItems || []).forEach((it) => {
      b2cItemsRaw.push({
        ...it,
        invoice_number: inv.invoice_number
      });
    });
  });

  const b2cGrouped = groupByHsnAndRate(b2cItemsRaw);

  b2cGrouped.forEach((it) => {
    const row = wsB2c.addRow({
      hsn: it.hsn_code || "Misc",
      desc: it.description || "",
      rate: it.rate,
      qty: it.quantity,
      unit: it.unit || "No",
      taxable: it.taxableValue,
      cgstRate: it.cgstRate ? `${it.cgstRate}%` : "-",
      cgst: it.cgstAmount,
      sgstRate: it.sgstRate ? `${it.sgstRate}%` : "-",
      sgst: it.sgstAmount,
      igstRate: it.igstRate ? `${it.igstRate}%` : "-",
      igst: it.igstAmount,
      total: it.totalAmount,
      invNo: (it.invoices || []).join(", ") || ""
    });

    [3, 6, 8, 10, 12, 13].forEach((colIdx) => {
      row.getCell(colIdx).numFmt = NUM_FMT_INR;
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SHEET 4: HSN / SAC Summary (Grouped by HSN & Rate)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const wsHsn = workbook.addWorksheet("HSN Summary");
  wsHsn.columns = [
    { header: "HSN / SAC Code", key: "hsn", width: 16 },
    { header: "Description", key: "desc", width: 28 },
    { header: "Unit Rate (₹)", key: "rate", width: 14 },
    { header: "Total Quantity", key: "qty", width: 14 },
    { header: "UQC / Unit", key: "unit", width: 12 },
    { header: "Tax Rate (%)", key: "taxRate", width: 14 },
    { header: "Total Taxable Value (₹)", key: "taxable", width: 22 },
    { header: "CGST (₹)", key: "cgst", width: 16 },
    { header: "SGST (₹)", key: "sgst", width: 16 },
    { header: "IGST (₹)", key: "igst", width: 16 },
    { header: "Total Tax (₹)", key: "tax", width: 18 },
    { header: "Total Value (₹)", key: "total", width: 20 }
  ];

  const headerRowHsn = wsHsn.getRow(1);
  headerRowHsn.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  headerRowHsn.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } };
  headerRowHsn.alignment = { vertical: "middle", horizontal: "center" };

  const allItemsRaw = [];
  [...b2bInvoices, ...b2cInvoices].forEach((inv) => {
    (inv.calculatedItems || []).forEach((it) => {
      allItemsRaw.push(it);
    });
  });
  const groupedAllHsnList = groupByHsnAndRate(allItemsRaw);

  groupedAllHsnList.forEach((hsnItem) => {
    const totalTax = (hsnItem.cgstAmount || 0) + (hsnItem.sgstAmount || 0) + (hsnItem.igstAmount || 0);
    const taxRateDisplay = hsnItem.taxRate !== undefined ? hsnItem.taxRate : ((hsnItem.cgstRate || 0) + (hsnItem.sgstRate || 0) + (hsnItem.igstRate || 0));
    const row = wsHsn.addRow({
      hsn: hsnItem.hsn_code || "Misc",
      desc: hsnItem.description || "Goods / Services",
      rate: hsnItem.rate,
      qty: hsnItem.quantity,
      unit: hsnItem.unit || "No",
      taxRate: `${taxRateDisplay}%`,
      taxable: hsnItem.taxableValue,
      cgst: hsnItem.cgstAmount,
      sgst: hsnItem.sgstAmount,
      igst: hsnItem.igstAmount,
      tax: totalTax,
      total: hsnItem.totalAmount
    });

    [3, 7, 8, 9, 10, 11, 12].forEach((colIdx) => {
      row.getCell(colIdx).numFmt = NUM_FMT_INR;
    });
  });

  // Export to Buffer and Trigger Download
  const buffer = await workbook.xlsx.writeBuffer();
  const safePeriod = periodLabel.replace(/\s+/g, "_");
  const fileName = `GST_Report_${safePeriod}.xlsx`;

  triggerBrowserDownload(buffer, fileName);
}
