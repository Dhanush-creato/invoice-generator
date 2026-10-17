/**
 * gstPdfGenerator.js
 * Generates and downloads a high-fidelity PDF summary for the Monthly GST Report.
 */
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { formatINR } from "./gstCalculations";

export async function exportGstPdfReport(reportElementId, fileName = "GST_Report.pdf") {
  const element = document.getElementById(reportElementId);
  if (!element) {
    throw new Error(`Report preview element with ID "${reportElementId}" not found.`);
  }

  // Ensure element is visible during capture
  const originalDisplay = element.style.display;
  element.style.display = "block";

  // Reflow delay
  await new Promise((r) => setTimeout(r, 100));

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    letterRendering: true,
    backgroundColor: "#ffffff",
    logging: false
  });

  element.style.display = originalDisplay;

  const imgData = canvas.toDataURL("image/png");
  const pdfWidth = 210; // A4 mm
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  const pdf = new jsPDF({
    unit: "mm",
    format: pdfHeight > 297 ? [pdfWidth, pdfHeight] : "a4",
    orientation: "portrait",
    compress: true
  });

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save(fileName);
}
