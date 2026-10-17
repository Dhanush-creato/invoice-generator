/**
 * gstCalculations.js
 * Comprehensive GST calculation, classification, aggregation, and validation utilities.
 */

// Standard Indian GSTIN Regex: 2 digits (state) + 5 letters (PAN) + 4 digits + 1 letter + 1 char + 'Z' + 1 checksum char
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;

/**
 * Validates a GSTIN string
 */
export function validateGSTIN(gstin) {
  if (!gstin || typeof gstin !== "string") return false;
  const clean = gstin.trim().toUpperCase();
  return GSTIN_REGEX.test(clean);
}

/**
 * Extracts state code from GSTIN (first 2 digits)
 */
export function getStateCodeFromGSTIN(gstin) {
  if (!gstin || typeof gstin !== "string") return "";
  const clean = gstin.trim();
  if (clean.length >= 2 && /^\d{2}/.test(clean)) {
    return clean.substring(0, 2);
  }
  return "";
}

/**
 * Indian State Codes Mapping
 */
export const STATE_CODES = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory"
};

/**
 * Rounds a number consistently to 2 decimal places
 */
export function round2(num) {
  const n = parseFloat(num) || 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Formats a number as Indian Currency (e.g. ₹ 1,31,074.82)
 */
export function formatINR(num) {
  const n = round2(num);
  return "₹ " + n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Determines Financial Year from date (e.g., "2026-10-15" -> "2026-27", "2027-02-10" -> "2026-27")
 */
export function getFinancialYear(dateStr) {
  if (!dateStr) return "2026-27";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "2026-27";
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  if (month >= 4) {
    const nextShort = String((year + 1) % 100).padStart(2, "0");
    return `${year}-${nextShort}`;
  } else {
    const curShort = String(year % 100).padStart(2, "0");
    return `${year - 1}-${curShort}`;
  }
}

/**
 * List of months in Indian Financial Year order (April to March)
 */
export const FY_MONTHS = [
  { index: 4, name: "April", short: "Apr" },
  { index: 5, name: "May", short: "May" },
  { index: 6, name: "June", short: "Jun" },
  { index: 7, name: "July", short: "Jul" },
  { index: 8, name: "August", short: "Aug" },
  { index: 9, name: "September", short: "Sep" },
  { index: 10, name: "October", short: "Oct" },
  { index: 11, name: "November", short: "Nov" },
  { index: 12, name: "December", short: "Dec" },
  { index: 1, name: "January", short: "Jan" },
  { index: 2, name: "February", short: "Feb" },
  { index: 3, name: "March", short: "Mar" }
];

/**
 * Generates selectable financial years (e.g., 2026-27, 2025-26, etc.)
 */
export function getSelectableFinancialYears(centerYear = 2026) {
  const list = [];
  for (let yr = centerYear + 1; yr >= centerYear - 3; yr--) {
    const nextShort = String((yr + 1) % 100).padStart(2, "0");
    list.push(`${yr}-${nextShort}`);
  }
  return list;
}

/**
 * Classifies an invoice as B2B or B2C
 */
export function classifyInvoice(invoice) {
  const gstin = (invoice.customer_gstin || "").trim();
  // Valid or non-empty GSTIN indicates a registered business customer
  if (gstin.length >= 8) {
    return "B2B";
  }
  return "B2C";
}

/**
 * Determines whether a transaction is Inter-State (IGST) or Intra-State (CGST + SGST)
 */
export function isInterstateSupply(invoice, sellerProfile) {
  if (invoice.is_interstate === true || invoice.is_interstate === "true") return true;
  if (invoice.is_interstate === false || invoice.is_interstate === "false") return false;

  const sellerStateCode = (sellerProfile?.state_code || "29").toString().trim();
  const customerStateCode = (invoice.customer_state_code || getStateCodeFromGSTIN(invoice.customer_gstin) || "").toString().trim();

  if (customerStateCode && sellerStateCode && customerStateCode !== sellerStateCode) {
    return true;
  }
  return false;
}

/**
 * Calculates line-item GST amounts
 */
export function calculateLineItemGst(item, invoice, sellerProfile) {
  const qty = parseFloat(item.quantity) || 0;
  const rate = parseFloat(item.rate) || 0;
  const discount = parseFloat(item.discount) || 0;

  // Use saved item.amount if valid, otherwise compute qty * rate
  let rawTaxable = 0;
  if (item.amount !== undefined && item.amount !== null && !isNaN(parseFloat(item.amount)) && parseFloat(item.amount) > 0) {
    rawTaxable = parseFloat(item.amount) - discount;
  } else {
    rawTaxable = (qty * rate) - discount;
  }
  const taxableValue = round2(Math.max(0, rawTaxable));

  const interstate = isInterstateSupply(invoice, sellerProfile);

  // Determine tax rate
  let totalTaxRate = 18;
  if (item.gst_rate !== undefined && item.gst_rate !== null && !isNaN(parseFloat(item.gst_rate))) {
    totalTaxRate = parseFloat(item.gst_rate);
  } else if (interstate && invoice.igst_percent !== undefined) {
    totalTaxRate = parseFloat(invoice.igst_percent) || 18;
  } else {
    const c = parseFloat(invoice.cgst_percent) || 0;
    const s = parseFloat(invoice.sgst_percent) || 0;
    if (c + s > 0) {
      totalTaxRate = c + s;
    }
  }

  let cgstRate = 0;
  let sgstRate = 0;
  let igstRate = 0;

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (interstate) {
    igstRate = totalTaxRate;
    igstAmount = round2(taxableValue * (igstRate / 100));
  } else {
    cgstRate = totalTaxRate / 2;
    sgstRate = totalTaxRate / 2;
    cgstAmount = round2(taxableValue * (cgstRate / 100));
    sgstAmount = round2(taxableValue * (sgstRate / 100));
  }

  const totalGst = round2(cgstAmount + sgstAmount + igstAmount);
  const totalAmount = round2(taxableValue + totalGst);

  return {
    description: item.description || "",
    hsn_code: String(item.hsn_code || "").trim(),
    quantity: qty,
    unit: item.unit || "No",
    rate: rate,
    discount: discount,
    taxableValue,
    totalTaxRate,
    interstate,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    totalGst,
    totalAmount
  };
}

/**
 * Returns { fromDate, toDate } strings ('YYYY-MM-DD') for a given financial year and month index
 */
export function getDateRangeForMonth(financialYear, monthIndex) {
  const [startYearStr] = (financialYear || "2026-27").split("-");
  const startYear = parseInt(startYearStr, 10) || 2026;
  const mIdx = parseInt(monthIndex, 10) || 4;
  const calendarYear = mIdx >= 4 ? startYear : startYear + 1;
  const mStr = String(mIdx).padStart(2, "0");
  const lastDay = new Date(calendarYear, mIdx, 0).getDate();

  return {
    fromDate: `${calendarYear}-${mStr}-01`,
    toDate: `${calendarYear}-${mStr}-${String(lastDay).padStart(2, "0")}`
  };
}

/**
 * Normalizes different date formats (ISO, DD/MM/YYYY, DD-MM-YYYY, Firestore timestamps) into 'YYYY-MM-DD'
 */
export function normalizeDate(dateVal) {
  if (!dateVal) return "";
  if (typeof dateVal === "object") {
    if (dateVal.toDate && typeof dateVal.toDate === "function") {
      return dateVal.toDate().toISOString().split("T")[0];
    }
    if (dateVal.seconds) {
      return new Date(dateVal.seconds * 1000).toISOString().split("T")[0];
    }
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      return dateVal.toISOString().split("T")[0];
    }
  }
  const str = String(dateVal).trim();
  if (!str) return "";

  // Check DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Check YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, "0");
    const day = ymdMatch[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return str.split("T")[0];
}

/**
 * Filters invoices by selected date range (fromDate & toDate) or financial year and month
 */
export function filterInvoices(invoices, optionsOrFY, maybeMonthIndex) {
  if (!Array.isArray(invoices)) return [];

  let fromDate = "";
  let toDate = "";

  if (typeof optionsOrFY === "object" && optionsOrFY !== null) {
    fromDate = optionsOrFY.fromDate || "";
    toDate = optionsOrFY.toDate || "";
    if ((!fromDate || !toDate) && optionsOrFY.financialYear && optionsOrFY.monthIndex) {
      const range = getDateRangeForMonth(optionsOrFY.financialYear, optionsOrFY.monthIndex);
      fromDate = fromDate || range.fromDate;
      toDate = toDate || range.toDate;
    }
  } else if (typeof optionsOrFY === "string" && maybeMonthIndex) {
    const range = getDateRangeForMonth(optionsOrFY, maybeMonthIndex);
    fromDate = range.fromDate;
    toDate = range.toDate;
  }

  return invoices.filter((inv) => {
    // Strictly exclude quotations
    if (inv.template_type === "quotation") return false;

    const invDate = normalizeDate(inv.date);
    if (!invDate) return false;

    if (fromDate && invDate < fromDate) return false;
    if (toDate && invDate > toDate) return false;

    return true;
  });
}

/**
 * Validates invoice records and produces diagnostic warnings
 */
export function validateInvoicesForGst(invoices, sellerProfile) {
  const warnings = [];
  const seenNumbers = new Set();

  invoices.forEach((inv) => {
    const invNo = inv.invoice_number || "Unknown";
    const classification = classifyInvoice(inv);

    // 1. Duplicate invoice numbers
    if (seenNumbers.has(invNo)) {
      warnings.push({
        type: "DUPLICATE_INVOICE",
        severity: "error",
        invoiceNumber: invNo,
        message: `Duplicate invoice number "${invNo}" detected in reporting period.`
      });
    } else {
      seenNumbers.add(invNo);
    }

    // 2. GSTIN check for B2B
    if (classification === "B2B") {
      const gstin = (inv.customer_gstin || "").trim();
      if (!validateGSTIN(gstin)) {
        warnings.push({
          type: "INVALID_GSTIN",
          severity: "warning",
          invoiceNumber: invNo,
          message: `Customer GSTIN "${gstin || "EMPTY"}" is missing or does not match standard 15-character GSTIN format.`
        });
      }
    }

    // 3. Place of supply / State check
    if (!inv.customer_state && !inv.customer_state_code) {
      warnings.push({
        type: "MISSING_POS",
        severity: "warning",
        invoiceNumber: invNo,
        message: `Place of supply / Customer state is missing. Tax treatment may be inaccurate.`
      });
    }

    // 4. Line item checks & reconciliation
    const items = inv.items || [];
    if (items.length === 0) {
      warnings.push({
        type: "NO_ITEMS",
        severity: "error",
        invoiceNumber: invNo,
        message: `Invoice has no line items.`
      });
    }

    let calculatedTaxable = 0;
    let calculatedGst = 0;

    items.forEach((item, idx) => {
      const hsn = (item.hsn_code || "").toString().trim();
      if (!hsn) {
        warnings.push({
          type: "MISSING_HSN",
          severity: "warning",
          invoiceNumber: invNo,
          message: `Item #${idx + 1} ("${item.description || "Untitled"}") is missing HSN/SAC code.`
        });
      }

      const calculated = calculateLineItemGst(item, inv, sellerProfile);
      calculatedTaxable += calculated.taxableValue;
      calculatedGst += calculated.totalGst;
    });

    const calculatedTotal = round2(calculatedTaxable + calculatedGst);
    const invoiceTotal = parseFloat(inv.total_amount);

    if (!isNaN(invoiceTotal) && Math.abs(invoiceTotal - calculatedTotal) > 1.0) {
      warnings.push({
        type: "TOTAL_MISMATCH",
        severity: "warning",
        invoiceNumber: invNo,
        message: `Saved invoice total (₹${invoiceTotal.toFixed(2)}) differs from recalculated line item total (₹${calculatedTotal.toFixed(2)}).`
      });
    }
  });

  return warnings;
}

/**
 * Aggregates all GST metrics, summaries, and HSN blocks for the selected period / date range
 */
export function aggregateGstReport(invoices, sellerProfile, optionsOrFY, maybeMonthIndex) {
  let filterOpts = {};
  if (typeof optionsOrFY === "object" && optionsOrFY !== null) {
    filterOpts = { ...optionsOrFY };
  } else {
    filterOpts = {
      financialYear: optionsOrFY,
      monthIndex: maybeMonthIndex
    };
  }

  // Derive fromDate and toDate if not provided
  if ((!filterOpts.fromDate || !filterOpts.toDate) && filterOpts.financialYear && filterOpts.monthIndex) {
    const r = getDateRangeForMonth(filterOpts.financialYear, filterOpts.monthIndex);
    filterOpts.fromDate = filterOpts.fromDate || r.fromDate;
    filterOpts.toDate = filterOpts.toDate || r.toDate;
  }

  const { fromDate, toDate, financialYear, monthIndex } = filterOpts;
  const filtered = filterInvoices(invoices, filterOpts);
  const warnings = validateInvoicesForGst(filtered, sellerProfile);

  // Compute clean period label
  let periodLabel = filterOpts.periodLabel || "";
  if (!periodLabel) {
    if (fromDate && toDate) {
      const formatDMY = (dStr) => {
        try {
          const [y, m, d] = dStr.split("-");
          return `${d}.${m}.${y}`;
        } catch (_) {
          return dStr;
        }
      };
      if (fromDate === toDate) {
        periodLabel = formatDMY(fromDate);
      } else {
        periodLabel = `${formatDMY(fromDate)} to ${formatDMY(toDate)}`;
      }
    } else if (monthIndex) {
      const mName = FY_MONTHS.find((m) => m.index === monthIndex)?.name || "Month";
      const startYear = parseInt((financialYear || "2026-27").split("-")[0], 10) || 2026;
      const calYear = monthIndex >= 4 ? startYear : startYear + 1;
      periodLabel = `${mName} ${calYear}`;
    } else {
      periodLabel = "Custom Period";
    }
  }

  let totalB2BCount = 0;
  let totalB2CCount = 0;

  let b2bTaxable = 0;
  let b2bCgst = 0;
  let b2bSgst = 0;
  let b2bIgst = 0;
  let b2bTotal = 0;

  let b2cTaxable = 0;
  let b2cCgst = 0;
  let b2cSgst = 0;
  let b2cIgst = 0;
  let b2cTotal = 0;

  const b2bInvoices = [];
  const b2cInvoices = [];

  // HSN summary maps
  const b2bHsnMap = new Map();
  const b2cHsnMap = new Map();
  const allHsnMap = new Map();

  const processLineItem = (item, inv, targetMap) => {
    const calc = calculateLineItemGst(item, inv, sellerProfile);
    const itemRate = Number(calc.rate) || 0;
    const key = `${calc.hsn_code || "N/A"}_${itemRate}_${calc.totalTaxRate}`;

    const existing = targetMap.get(key) || {
      hsn_code: calc.hsn_code || "N/A",
      description: item.description || "Goods / Services",
      taxRate: calc.totalTaxRate,
      rate: itemRate,
      quantity: 0,
      unit: item.unit || "No",
      taxableValue: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalAmount: 0,
      items: []
    };

    existing.quantity += calc.quantity;
    existing.taxableValue = round2(existing.taxableValue + calc.taxableValue);
    existing.cgstAmount = round2(existing.cgstAmount + calc.cgstAmount);
    existing.sgstAmount = round2(existing.sgstAmount + calc.sgstAmount);
    existing.igstAmount = round2(existing.igstAmount + calc.igstAmount);
    existing.totalAmount = round2(existing.totalAmount + calc.totalAmount);
    existing.items.push({ ...calc, invoiceNumber: inv.invoice_number, date: inv.date });

    targetMap.set(key, existing);
  };

  filtered.forEach((inv) => {
    const classification = classifyInvoice(inv);
    let invTaxable = 0;
    let invCgst = 0;
    let invSgst = 0;
    let invIgst = 0;

    const items = (inv.items || []).map((it) => {
      const calc = calculateLineItemGst(it, inv, sellerProfile);
      invTaxable += calc.taxableValue;
      invCgst += calc.cgstAmount;
      invSgst += calc.sgstAmount;
      invIgst += calc.igstAmount;

      if (classification === "B2B") {
        processLineItem(it, inv, b2bHsnMap);
      } else {
        processLineItem(it, inv, b2cHsnMap);
      }
      processLineItem(it, inv, allHsnMap);

      return calc;
    });

    const enrichedInvoice = {
      ...inv,
      calculatedTaxable: round2(invTaxable),
      calculatedCgst: round2(invCgst),
      calculatedSgst: round2(invSgst),
      calculatedIgst: round2(invIgst),
      calculatedTotal: round2(invTaxable + invCgst + invSgst + invIgst),
      calculatedItems: items,
      classification
    };

    if (classification === "B2B") {
      totalB2BCount++;
      b2bTaxable += invTaxable;
      b2bCgst += invCgst;
      b2bSgst += invSgst;
      b2bIgst += invIgst;
      b2bTotal += enrichedInvoice.calculatedTotal;
      b2bInvoices.push(enrichedInvoice);
    } else {
      totalB2CCount++;
      b2cTaxable += invTaxable;
      b2cCgst += invCgst;
      b2cSgst += invSgst;
      b2cIgst += invIgst;
      b2cTotal += enrichedInvoice.calculatedTotal;
      b2cInvoices.push(enrichedInvoice);
    }
  });

  const sortByHsnAndRate = (a, b) => {
    const hsnComp = (a.hsn_code || "").localeCompare(b.hsn_code || "");
    if (hsnComp !== 0) return hsnComp;
    return (Number(a.rate) || 0) - (Number(b.rate) || 0);
  };

  const b2bHsnList = Array.from(b2bHsnMap.values()).sort(sortByHsnAndRate);
  const b2cHsnList = Array.from(b2cHsnMap.values()).sort(sortByHsnAndRate);
  const allHsnList = Array.from(allHsnMap.values()).sort(sortByHsnAndRate);

  const totalTaxable = round2(b2bTaxable + b2cTaxable);
  const totalCgst = round2(b2bCgst + b2cCgst);
  const totalSgst = round2(b2bSgst + b2cSgst);
  const totalIgst = round2(b2bIgst + b2cIgst);
  const totalGst = round2(totalCgst + totalSgst + totalIgst);
  const totalInvoiceValue = round2(totalTaxable + totalGst);

  return {
    financialYear,
    monthIndex,
    fromDate,
    toDate,
    periodLabel,
    invoicesCount: filtered.length,
    totalB2BCount,
    totalB2CCount,
    summary: {
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalGst,
      totalInvoiceValue,
      b2b: {
        count: totalB2BCount,
        taxable: round2(b2bTaxable),
        cgst: round2(b2bCgst),
        sgst: round2(b2bSgst),
        igst: round2(b2bIgst),
        total: round2(b2bTotal)
      },
      b2c: {
        count: totalB2CCount,
        taxable: round2(b2cTaxable),
        cgst: round2(b2cCgst),
        sgst: round2(b2cSgst),
        igst: round2(b2cIgst),
        total: round2(b2cTotal)
      }
    },
    b2bInvoices,
    b2cInvoices,
    b2bHsnList,
    b2cHsnList,
    allHsnList,
    warnings
  };
}

/**
 * Built-in Sample Data mirroring the client's `GST TEST.xlsx`
 * Available for testing and instant preview verification
 */
export const SAMPLE_TEMPLATE_INVOICES = [
  // B2B Invoices matching GST TEST.xlsx
  {
    id: "sample-b2b-01",
    invoice_number: "ICS/25-26/101",
    date: "2025-10-10",
    customer_name: "Apex Engineering Systems",
    customer_gstin: "29AABCA1234F1Z1",
    customer_state: "Karnataka",
    customer_state_code: "29",
    is_interstate: false,
    cgst_percent: 9,
    sgst_percent: 9,
    igst_percent: 18,
    template_type: "template1",
    items: [
      { description: "Controller Model A", hsn_code: "9032", quantity: 2, unit: "No", rate: 7000, amount: 14000 },
      { description: "Controller Unit Pro", hsn_code: "9032", quantity: 20, unit: "No", rate: 1250, amount: 25000 },
      { description: "Controller Special", hsn_code: "9032", quantity: 2, unit: "No", rate: 8000, amount: 16000 },
      { description: "Controller Standard", hsn_code: "9032", quantity: 1, unit: "No", rate: 3800, amount: 3800 }
    ]
  },
  {
    id: "sample-b2b-02",
    invoice_number: "ICS/25-26/102",
    date: "2025-10-12",
    customer_name: "Karnataka Industrial Controls",
    customer_gstin: "29BBBCB5678G2Z2",
    customer_state: "Karnataka",
    customer_state_code: "29",
    is_interstate: false,
    cgst_percent: 9,
    sgst_percent: 9,
    igst_percent: 18,
    template_type: "template1",
    items: [
      { description: "Multi-core Cable", hsn_code: "8544", quantity: 1045, unit: "Mtr", rate: 36.196, amount: 37824.82 },
      { description: "PVC Conduit Pipe", hsn_code: "3917", quantity: 2725, unit: "Mtr", rate: 10.00, amount: 27250.00 },
      { description: "Pressure Level Sensor", hsn_code: "9026", quantity: 4, unit: "No", rate: 1000, amount: 4000.00 },
      { description: "Insulating Fitting Set", hsn_code: "854790", quantity: 4, unit: "Set", rate: 800, amount: 3200.00 }
    ]
  },
  // B2C Sample Invoices
  {
    id: "sample-b2c-01",
    invoice_number: "ICS/25-26/103",
    date: "2025-10-15",
    customer_name: "Rajesh Kumar (Retail)",
    customer_gstin: "",
    customer_state: "Karnataka",
    customer_state_code: "29",
    is_interstate: false,
    cgst_percent: 9,
    sgst_percent: 9,
    igst_percent: 18,
    template_type: "template1",
    items: [
      { description: "Domestic Level Controller", hsn_code: "9032", quantity: 1, unit: "No", rate: 3500, amount: 3500 }
    ]
  }
];
