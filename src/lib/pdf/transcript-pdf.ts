import { jsPDF } from "jspdf";
import type { DebateResult } from "@/lib/data/types";

function formatTranscriptTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

function formatDebateDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

function slugifyFilename(s: string): string {
  const slug = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return slug.length > 0 ? slug : "debate";
}

/**
 * Builds a printable transcript PDF and triggers a browser download.
 */
export function downloadDebateTranscriptPdf(r: DebateResult): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const innerW = pageW - margin * 2;
  let y = 18;

  const needPage = (h: number) => {
    if (y + h > pageH - 14) {
      doc.addPage();
      y = 18;
    }
  };

  doc.setFillColor(18, 18, 18);
  doc.rect(0, 0, pageW, pageH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(245, 245, 245);
  doc.text("FULL TRANSCRIPT", margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(251, 146, 60);
  const topicLines = doc.splitTextToSize(r.topicTitle, innerW);
  doc.text(topicLines, margin, y);
  y += topicLines.length * 5.5 + 2;

  doc.setTextColor(160, 160, 160);
  doc.setFontSize(9);
  doc.text(`Debated: ${formatDebateDate(r.debatedAt)}`, margin, y);
  y += 6;
  const summaryLines = doc.splitTextToSize(
    `${r.headline} — ${r.subline}`,
    innerW,
  );
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 4.6 + 6;

  doc.setDrawColor(70, 70, 70);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  for (const entry of r.transcript) {
    const pad = 3;
    const speakerLine = 5;
    const bodySize = 10;
    const bodyLines = doc.splitTextToSize(entry.text, innerW - pad * 2 - 2);
    const lineStepMm = 4.8;
    const bodyHeight = bodyLines.length * lineStepMm + 2;
    const blockH = speakerLine + bodyHeight + pad * 2 + 2;

    needPage(blockH + 4);

    doc.setDrawColor(80, 80, 80);
    doc.setFillColor(28, 28, 28);
    doc.roundedRect(margin, y, innerW, blockH, 1, 1, "FD");

    const textX = margin + pad + 1;
    const topTextY = y + pad + 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(253, 186, 116);
    doc.text(entry.speaker.toUpperCase(), textX, topTextY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    const timeStr = formatTranscriptTime(entry.at).toUpperCase();
    const tw = doc.getTextWidth(timeStr);
    doc.text(timeStr, pageW - margin - pad - tw - 1, topTextY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(bodySize);
    doc.setTextColor(230, 230, 230);
    doc.text(bodyLines, textX, topTextY + speakerLine);

    y += blockH + 4;
  }

  const filename = `${slugifyFilename(r.topicTitle)}-transcript.pdf`;
  doc.save(filename);
}
