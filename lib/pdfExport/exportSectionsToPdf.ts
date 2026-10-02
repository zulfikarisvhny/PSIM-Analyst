// lib/pdfExport/exportSectionsToPdf.ts
// Client-only. Drives a report's own tab-switcher through each section,
// screenshots whichever DOM node is currently rendered (via html2canvas),
// and assembles one PDF page per section (via jsPDF) — instead of hand-
// rebuilding every chart/table a second time in a PDF-drawing API. Both
// libs are dynamically imported so they stay out of the main bundle until
// someone actually clicks "Download PDF".

export interface PdfSection {
  /** Printed as the page's small subtitle. */
  label: string;
  /** Triggers the state change that makes this section's content render (e.g. setActiveTab("stats")). */
  activate: () => void;
}

/** Waits a couple of animation frames plus a short settle delay — enough for
 * React to flush the state update from `activate()` and for the browser to
 * finish laying out (SVGs in particular) before the screenshot is taken. */
async function waitForRender() {
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  await new Promise((resolve) => setTimeout(resolve, 150));
}

export async function exportSectionsToPdf({
  title,
  subtitle,
  sections,
  getElement,
  filename,
}: {
  title: string;
  subtitle?: string;
  sections: PdfSection[];
  getElement: () => HTMLElement | null;
  filename: string;
}) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas")]);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 28;
  const headerHeight = subtitle ? 54 : 40;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    section.activate();
    await waitForRender();

    const el = getElement();
    if (!el) continue;

    const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");

    if (i > 0) doc.addPage();

    doc.setFontSize(13);
    doc.setTextColor(18, 27, 45);
    doc.text(title, margin, margin + 4);
    if (subtitle) {
      doc.setFontSize(9);
      doc.setTextColor(140, 140, 140);
      doc.text(subtitle, margin, margin + 18);
    }
    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235);
    doc.text(section.label, margin, margin + headerHeight - 14);

    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2 - headerHeight;
    const scale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height, 1);
    const drawWidth = canvas.width * scale;
    const drawHeight = canvas.height * scale;

    doc.addImage(imgData, "PNG", margin, margin + headerHeight, drawWidth, drawHeight);
  }

  doc.save(filename);
}
