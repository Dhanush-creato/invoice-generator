import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const A4_WIDTH_MM  = 210;
const A4_WIDTH_PX  = 794; // pixels at 96dpi equivalent

/**
 * Captures the invoice element EXACTLY as it looks on screen.
 * No height overrides — the flex layout stretching is preserved.
 * PDF page height = exact rendered height → ZERO blank space at bottom.
 *
 * Template 1 (height:297mm + social footer at bottom:0) → 297mm PDF ✅
 * Template 2 (minHeight:257mm + flex:1 stretching)     → exact content height PDF ✅
 */
async function renderToPdf(element) {
  const container = element.querySelector(".invoice-preview-container") || element;

  // Only fix overflow so absolutely-positioned elements (social footer) aren't clipped
  const origOverflow = container.style.overflow;
  container.style.overflow = "visible";

  // Brief reflow delay
  await new Promise((r) => setTimeout(r, 60));

  const canvas = await html2canvas(element, {
    scale: 3,
    useCORS: true,
    letterRendering: true,
    scrollX: 0,
    scrollY: 0,
    windowWidth: A4_WIDTH_PX,
    backgroundColor: "#ffffff",
  });

  // Restore overflow
  container.style.overflow = origOverflow;

  const imgData        = canvas.toDataURL("image/png");
  const pageWidthMm    = A4_WIDTH_MM;
  // PDF page height = exact rendered height — NO padding to A4, NO blank space
  const pageHeightMm   = (canvas.height / canvas.width) * A4_WIDTH_MM;

  const pdf = new jsPDF({
    unit: "mm",
    format: [pageWidthMm, pageHeightMm],
    orientation: "portrait",
    compress: true,
  });

  pdf.addImage(imgData, "PNG", 0, 0, pageWidthMm, pageHeightMm);
  return pdf;
}

/** Download PDF — exact content height, no blank space */
export async function downloadPdf(element, filename) {
  const pdf = await renderToPdf(element);
  pdf.save(filename);
}

/** Generate PDF blob — exact content height, no blank space */
export async function generatePdfBlob(element, filename) {
  const pdf = await renderToPdf(element);
  return pdf.output("blob");
}
