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
    const hsnStr = String(it.hsn_code || "").trim();
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

  // Set Column Widths to match client's template
  wsTemplate.columns = [
    { key: "A", width: 18 },
    { key: "B", width: 12 },
    { key: "C", width: 10 },
    { key: "D", width: 4 },
    { key: "E", width: 4 },
    { key: "F", width: 15 },
    { key: "G", width: 16 },
    { key: "H", width: 14 },
    { key: "I", width: 14 },
    { key: "J", width: 4 },
    { key: "K", width: 12 },
    { key: "L", width: 10 },
    { key: "M", width: 4 },
    { key: "N", width: 4 },
    { key: "O", width: 14 },
    { key: "P", width: 15 },
    { key: "Q", width: 14 },
    { key: "R", width: 14 },
  ];

  // Helper for applying cell styling
  const styleCell = (cell, options = {}) => {
    if (options.font) cell.font = options.font;
    if (options.fill) cell.fill = options.fill;
    if (options.numFmt) cell.numFmt = options.numFmt;
    if (options.alignment) cell.alignment = options.alignment;
    if (options.border) cell.border = options.border;
  };

  // Row 4: Solid RED Bar across columns A to R
  const r4 = wsTemplate.getRow(4);
  for (let c = 1; c <= 18; c++) {
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

  // Row 6: B6 = "Controller", F6 = "B2B"
  const cellB6 = wsTemplate.getCell("B6");
  cellB6.value = "Controller";
  cellB6.font = { name: FONT_FAMILY, size: 12, bold: true, color: { argb: COLOR_RED } };

  const cellF6 = wsTemplate.getCell("F6");
  cellF6.value = "B2B";
  cellF6.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_RED } };

  // Row 8: Table Header (Red bold text, Bookman Old Style 11pt)
  const headerFontRed = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_RED } };
  const headerFontPurple = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_PURPLE } };

  wsTemplate.getCell("B8").value = "HSN";
  wsTemplate.getCell("B8").font = headerFontRed;

  wsTemplate.getCell("C8").value = "Qty";
  wsTemplate.getCell("C8").font = headerFontPurple;

  wsTemplate.getCell("F8").value = "Amount";
  wsTemplate.getCell("F8").font = headerFontRed;

  wsTemplate.getCell("G8").value = "Amount";
  wsTemplate.getCell("G8").font = headerFontRed;

  wsTemplate.getCell("H8").value = "SGST";
  wsTemplate.getCell("H8").font = headerFontRed;

  wsTemplate.getCell("I8").value = "CGST";
  wsTemplate.getCell("I8").font = headerFontRed;

  // Right Table Headers (Col K, L, O, P, Q, R)
  wsTemplate.getCell("K8").value = "HSN";
  wsTemplate.getCell("K8").font = headerFontRed;

  wsTemplate.getCell("L8").value = "Qty";
  wsTemplate.getCell("L8").font = headerFontPurple;

  wsTemplate.getCell("O8").value = "Amount";
  wsTemplate.getCell("O8").font = headerFontRed;

  wsTemplate.getCell("P8").value = "Amount";
  wsTemplate.getCell("P8").font = headerFontRed;

  wsTemplate.getCell("Q8").value = "SGST";
  wsTemplate.getCell("Q8").font = headerFontRed;

  wsTemplate.getCell("R8").value = "CGST";
  wsTemplate.getCell("R8").font = headerFontRed;

  // Separate B2B items into Controller (HSN 9032) and Other HSNs,
  // then group each bucket by (HSN + Rate) so identical price rows are merged.
  const b2bControllerRaw = [];
  const b2bOtherRaw = [];

  b2bInvoices.forEach((inv) => {
    (inv.calculatedItems || []).forEach((it) => {
      if (String(it.hsn_code).trim() === "9032") {
        b2bControllerRaw.push(it);
      } else {
        b2bOtherRaw.push(it);
      }
    });
  });

  const b2bControllerItems = groupByHsnAndRate(b2bControllerRaw);
  const b2bOtherItems      = groupByHsnAndRate(b2bOtherRaw);

  // Populate B2B Rows (Row 9 through 16)
  let subtotalB2BQty = 0;
  let subtotalB2BRate = 0;
  let subtotalB2BTaxable = 0;
  let subtotalB2BSgst = 0;
  let subtotalB2BCgst = 0;

  for (let i = 0; i < 8; i++) {
    const rowNum = 9 + i;
    const itLeft = b2bControllerItems[i];

    if (itLeft) {
      wsTemplate.getCell(`B${rowNum}`).value = itLeft.hsn_code || "9032";
      wsTemplate.getCell(`C${rowNum}`).value = itLeft.quantity;
      wsTemplate.getCell(`F${rowNum}`).value = itLeft.rate;
      wsTemplate.getCell(`G${rowNum}`).value = itLeft.taxableValue;
      wsTemplate.getCell(`H${rowNum}`).value = itLeft.sgstAmount;
      wsTemplate.getCell(`I${rowNum}`).value = itLeft.cgstAmount;

      subtotalB2BQty += itLeft.quantity;
      subtotalB2BRate += itLeft.rate;
      subtotalB2BTaxable += itLeft.taxableValue;
      subtotalB2BSgst += itLeft.sgstAmount;
      subtotalB2BCgst += itLeft.cgstAmount;
    } else {
      wsTemplate.getCell(`B${rowNum}`).value = "9032";
      wsTemplate.getCell(`C${rowNum}`).value = 0;
      wsTemplate.getCell(`F${rowNum}`).value = 0;
      wsTemplate.getCell(`G${rowNum}`).value = 0;
      wsTemplate.getCell(`H${rowNum}`).value = 0;
      wsTemplate.getCell(`I${rowNum}`).value = 0;
    }

    [wsTemplate.getCell(`B${rowNum}`), wsTemplate.getCell(`C${rowNum}`)].forEach((c) => {
      c.font = { name: FONT_FAMILY, size: 11 };
    });
    [`F${rowNum}`, `G${rowNum}`, `H${rowNum}`, `I${rowNum}`].forEach((coord) => {
      const c = wsTemplate.getCell(coord);
      c.font = { name: FONT_FAMILY, size: 11 };
      c.numFmt = NUM_FMT_INR;
    });

    // Populate Right table row
    const itRight = b2bOtherItems[i];
    if (itRight) {
      wsTemplate.getCell(`K${rowNum}`).value = itRight.hsn_code;
      wsTemplate.getCell(`L${rowNum}`).value = itRight.quantity;
      wsTemplate.getCell(`O${rowNum}`).value = itRight.rate;
      wsTemplate.getCell(`P${rowNum}`).value = itRight.taxableValue;
      wsTemplate.getCell(`Q${rowNum}`).value = itRight.sgstAmount;
      wsTemplate.getCell(`R${rowNum}`).value = itRight.cgstAmount;
    } else {
      const defaultHsns = ["8544", "8544", "3917", "3917", "9026", "9026", "995461", "9107"];
      wsTemplate.getCell(`K${rowNum}`).value = defaultHsns[i] || "";
      wsTemplate.getCell(`L${rowNum}`).value = 0;
      wsTemplate.getCell(`O${rowNum}`).value = 0;
      wsTemplate.getCell(`P${rowNum}`).value = 0;
      wsTemplate.getCell(`Q${rowNum}`).value = 0;
      wsTemplate.getCell(`R${rowNum}`).value = 0;
    }

    [wsTemplate.getCell(`K${rowNum}`), wsTemplate.getCell(`L${rowNum}`)].forEach((c) => {
      c.font = { name: FONT_FAMILY, size: 11 };
    });
    [`O${rowNum}`, `P${rowNum}`, `Q${rowNum}`, `R${rowNum}`].forEach((coord) => {
      const c = wsTemplate.getCell(coord);
      c.font = { name: FONT_FAMILY, size: 11 };
      c.numFmt = NUM_FMT_INR;
    });
  }

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

  // Subtotal for Controller (Row 17)
  const redSubtotalFont = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_RED } };
  wsTemplate.getCell("C17").value = subtotalB2BQty;
  wsTemplate.getCell("C17").font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_PURPLE } };

  wsTemplate.getCell("F17").value = subtotalB2BRate;
  wsTemplate.getCell("F17").font = redSubtotalFont;
  wsTemplate.getCell("F17").numFmt = NUM_FMT_INR;

  wsTemplate.getCell("G17").value = subtotalB2BTaxable;
  wsTemplate.getCell("G17").font = redSubtotalFont;
  wsTemplate.getCell("G17").numFmt = NUM_FMT_INR;

  wsTemplate.getCell("H17").value = subtotalB2BSgst;
  wsTemplate.getCell("H17").font = redSubtotalFont;
  wsTemplate.getCell("H17").numFmt = NUM_FMT_INR;

  wsTemplate.getCell("I17").value = subtotalB2BCgst;
  wsTemplate.getCell("I17").font = redSubtotalFont;
  wsTemplate.getCell("I17").numFmt = NUM_FMT_INR;

  // Additional HSN blocks (Row 20 to 24)
  for (let r = 20; r <= 24; r++) {
    if (r === 24) {
      const extraItem = b2bOtherItems[8];
      wsTemplate.getCell("K24").value = extraItem ? extraItem.hsn_code : "";
      wsTemplate.getCell("L24").value = extraItem ? extraItem.quantity : 0;
      wsTemplate.getCell("O24").value = extraItem ? extraItem.rate : 0;
      wsTemplate.getCell("P24").value = extraItem ? extraItem.taxableValue : 0;
      wsTemplate.getCell("Q24").value = extraItem ? extraItem.sgstAmount : 0;
      wsTemplate.getCell("R24").value = extraItem ? extraItem.cgstAmount : 0;

      [wsTemplate.getCell("K24"), wsTemplate.getCell("L24")].forEach((c) => {
        c.font = { name: FONT_FAMILY, size: 11 };
      });
      ["O24", "P24", "Q24", "R24"].forEach((coord) => {
        const c = wsTemplate.getCell(coord);
        c.font = { name: FONT_FAMILY, size: 11 };
        c.numFmt = NUM_FMT_INR;
      });
    }
  }

  // Row 27: Solid CYAN Bar across columns A to R
  const r27 = wsTemplate.getRow(27);
  for (let c = 1; c <= 18; c++) {
    const cell = r27.getCell(c);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR_CYAN }
    };
  }

  // Row 28: F28 = "B2C" (bold blue)
  const cellF28 = wsTemplate.getCell("F28");
  cellF28.value = "B2C";
  cellF28.font = { name: FONT_FAMILY, size: 12, bold: true, color: { argb: COLOR_BLUE } };

  // Row 29: Header row for B2C (bold blue)
  const headerFontBlue = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_BLUE } };
  ["B29", "F29", "G29", "H29", "I29", "K29", "M29", "N29", "O29", "P29"].forEach((coord) => {
    const c = wsTemplate.getCell(coord);
    c.font = headerFontBlue;
  });
  wsTemplate.getCell("B29").value = "HSN";
  wsTemplate.getCell("C29").value = "Qty";
  wsTemplate.getCell("C29").font = headerFontPurple;
  wsTemplate.getCell("F29").value = "Amount";
  wsTemplate.getCell("G29").value = "Amount";
  wsTemplate.getCell("H29").value = "SGST";
  wsTemplate.getCell("I29").value = "CGST";

  wsTemplate.getCell("K29").value = "HSN";
  wsTemplate.getCell("L29").value = "Qty";
  wsTemplate.getCell("L29").font = headerFontPurple;
  wsTemplate.getCell("M29").value = "Amount";
  wsTemplate.getCell("N29").value = "Amount";
  wsTemplate.getCell("O29").value = "SGST";
  wsTemplate.getCell("P29").value = "CGST";

  // Separate B2C items into Controller (9032) and others,
  // then group each bucket by (HSN + Rate) so identical price rows are merged.
  const b2cControllerRaw = [];
  const b2cOtherRaw = [];

  b2cInvoices.forEach((inv) => {
    (inv.calculatedItems || []).forEach((it) => {
      if (String(it.hsn_code).trim() === "9032") {
        b2cControllerRaw.push(it);
      } else {
        b2cOtherRaw.push(it);
      }
    });
  });

  const b2cControllerItems = groupByHsnAndRate(b2cControllerRaw);
  const b2cOtherItems      = groupByHsnAndRate(b2cOtherRaw);

  // Populate B2C rows (Rows 30 to 38)
  for (let i = 0; i < 8; i++) {
    const rowNum = 30 + i;
    const itLeft = b2cControllerItems[i];

    if (itLeft) {
      wsTemplate.getCell(`B${rowNum}`).value = itLeft.hsn_code || "9032";
      wsTemplate.getCell(`C${rowNum}`).value = itLeft.quantity;
      wsTemplate.getCell(`F${rowNum}`).value = itLeft.rate;
      wsTemplate.getCell(`G${rowNum}`).value = itLeft.taxableValue;
      wsTemplate.getCell(`H${rowNum}`).value = itLeft.sgstAmount;
      wsTemplate.getCell(`I${rowNum}`).value = itLeft.cgstAmount;
    } else {
      wsTemplate.getCell(`B${rowNum}`).value = "9032";
      wsTemplate.getCell(`C${rowNum}`).value = 0;
      wsTemplate.getCell(`F${rowNum}`).value = 0;
      wsTemplate.getCell(`G${rowNum}`).value = 0;
      wsTemplate.getCell(`H${rowNum}`).value = 0;
      wsTemplate.getCell(`I${rowNum}`).value = 0;
    }

    [wsTemplate.getCell(`B${rowNum}`), wsTemplate.getCell(`C${rowNum}`)].forEach((c) => {
      c.font = { name: FONT_FAMILY, size: 11 };
    });
    [`F${rowNum}`, `G${rowNum}`, `H${rowNum}`, `I${rowNum}`].forEach((coord) => {
      const c = wsTemplate.getCell(coord);
      c.font = { name: FONT_FAMILY, size: 11 };
      c.numFmt = NUM_FMT_INR;
    });

    const itRight = b2cOtherItems[i];
    if (itRight) {
      wsTemplate.getCell(`K${rowNum}`).value = itRight.hsn_code;
      wsTemplate.getCell(`L${rowNum}`).value = itRight.quantity;
      wsTemplate.getCell(`M${rowNum}`).value = itRight.rate;
      wsTemplate.getCell(`N${rowNum}`).value = itRight.taxableValue;
      wsTemplate.getCell(`O${rowNum}`).value = itRight.sgstAmount;
      wsTemplate.getCell(`P${rowNum}`).value = itRight.cgstAmount;
    } else {
      const defaultB2cHsns = ["8544", "3917", "995461", "9026", "9026"];
      wsTemplate.getCell(`K${rowNum}`).value = defaultB2cHsns[i] || "";
      wsTemplate.getCell(`L${rowNum}`).value = 0;
      wsTemplate.getCell(`M${rowNum}`).value = 0;
      wsTemplate.getCell(`N${rowNum}`).value = 0;
      wsTemplate.getCell(`O${rowNum}`).value = 0;
      wsTemplate.getCell(`P${rowNum}`).value = 0;
    }

    [wsTemplate.getCell(`K${rowNum}`), wsTemplate.getCell(`L${rowNum}`)].forEach((c) => {
      c.font = { name: FONT_FAMILY, size: 11 };
    });
    [`M${rowNum}`, `N${rowNum}`, `O${rowNum}`, `P${rowNum}`].forEach((coord) => {
      const c = wsTemplate.getCell(coord);
      c.font = { name: FONT_FAMILY, size: 11 };
      c.numFmt = NUM_FMT_INR;
    });
  }

  // Row 41: "Total B2C" (green highlight)
  const greenFill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_LIGHT_GREEN } };
  const cellF41 = wsTemplate.getCell("F41");
  cellF41.value = "Total B2C";
  cellF41.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: "FF385723" } };
  cellF41.fill = greenFill;

  const cellG41 = wsTemplate.getCell("G41");
  cellG41.value = summary.b2c.taxable;
  cellG41.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: "FF385723" } };
  cellG41.fill = greenFill;
  cellG41.numFmt = NUM_FMT_INR;

  const cellH41 = wsTemplate.getCell("H41");
  cellH41.value = summary.b2c.sgst;
  cellH41.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: "FF385723" } };
  cellH41.fill = greenFill;
  cellH41.numFmt = NUM_FMT_INR;

  const cellI41 = wsTemplate.getCell("I41");
  cellI41.value = summary.b2c.cgst;
  cellI41.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: "FF385723" } };
  cellI41.fill = greenFill;
  cellI41.numFmt = NUM_FMT_INR;

  // Row 39-42: Left Side Summary repeat
  wsTemplate.getCell("A39").value = "B2B";
  wsTemplate.getCell("A39").font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_PURPLE } };

  wsTemplate.getCell("A40").value = summary.b2b.taxable;
  wsTemplate.getCell("A40").font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_RED } };
  wsTemplate.getCell("A40").numFmt = NUM_FMT_INR;

  wsTemplate.getCell("A41").value = summary.b2b.sgst;
  wsTemplate.getCell("A41").font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_RED } };
  wsTemplate.getCell("A41").numFmt = NUM_FMT_INR;

  wsTemplate.getCell("A42").value = summary.b2b.cgst;
  wsTemplate.getCell("A42").font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_RED } };
  wsTemplate.getCell("A42").numFmt = NUM_FMT_INR;

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
      hsn: it.hsn_code || "",
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
      hsn: it.hsn_code || "",
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
    { header: "Description", key: "desc", width: 32 },
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
      hsn: hsnItem.hsn_code,
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
