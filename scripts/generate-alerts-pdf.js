import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const sourcePath = path.join(projectRoot, "data", "alerts-ds-clean.json");
const outputPath = path.join(projectRoot, "output", "pdf", "alert-atlas.pdf");
const publicPath = path.join(projectRoot, "public", "downloads", "alert-atlas.pdf");
const data = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const alerts = Array.isArray(data) ? data : data.alerts;
const generatedAt = Array.isArray(data) ? null : data.metadata?.generated_at;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.mkdirSync(path.dirname(publicPath), { recursive: true });

const colors = {
  ink: "#2f2d2b",
  muted: "#6f716f",
  line: "#d8d2cc",
  brand: "#7b293d",
  soft: "#f3efeb",
  critical: "#b93535",
  warning: "#d67a12",
  informational: "#34738a",
};
const margin = 38;
const doc = new PDFDocument({
  size: "A4",
  margins: { top: 48, right: margin, bottom: 42, left: margin },
  info: {
    Title: "Alert atlas - Alert Handbook",
    Author: "Alert atlas",
    Subject: "Coffee machine alert responses",
  },
});
const output = fs.createWriteStream(outputPath);
doc.pipe(output);
let alertsOnPage = 0;
let pageNumber = 1;

function clean(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value)
    .replaceAll("\u2011", "-")
    .replaceAll("\u2013", "-")
    .replaceAll("\u2014", "-")
    .replaceAll("\u00a0", " ");
}

function handbookDate(timestamp) {
  if (!timestamp) return "Version unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "UTC", timeZoneName: "short",
  }).format(new Date(timestamp));
}

function drawRunningHeader() {
  doc.save();
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(colors.brand)
    .text("ACME COFFEE", margin, 24, { characterSpacing: 0.8, lineBreak: false });
  doc.font("Helvetica").fillColor(colors.muted)
    .text("ALERT ATLAS HANDBOOK", 400, 24, { width: 157, align: "right", lineBreak: false });
  doc.strokeColor(colors.line).lineWidth(0.5).moveTo(margin, 36).lineTo(557, 36).stroke();
  doc.restore();
  doc.x = margin;
  doc.y = 48;
}

function drawPageFooter() {
  const originalBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  doc.strokeColor(colors.line).lineWidth(0.4).moveTo(margin, 808).lineTo(557, 808).stroke();
  doc.font("Helvetica").fontSize(7.5).fillColor(colors.muted)
    .text("FICTIONAL DEMONSTRATION - NOT FOR OPERATIONAL USE", margin, 817, {
      width: 330, align: "left", lineBreak: false,
    });
  doc.text(`Alert atlas  |  Page ${pageNumber}`, 370, 817, {
      width: 187, align: "right", lineBreak: false,
    });
  doc.page.margins.bottom = originalBottomMargin;
  doc.x = margin;
  doc.y = 48;
}

function addContentPage() {
  doc.addPage();
  pageNumber += 1;
  drawRunningHeader();
  drawPageFooter();
  alertsOnPage = 0;
}

function ensureSpace(height) {
  const remaining = doc.page.height - doc.page.margins.bottom - doc.y;
  if (remaining < height) addContentPage();
}

function textHeight(text, options = {}) {
  return doc.heightOfString(clean(text), { width: options.width ?? 519, lineGap: options.lineGap ?? 1 });
}

function responseBlock(label, value) {
  ensureSpace(25);
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(colors.brand)
    .text(label.toUpperCase(), { characterSpacing: 0.45 });
  doc.moveDown(0.18);
  doc.font("Helvetica").fontSize(8.6).fillColor(colors.ink)
    .text(clean(value), { width: 519, lineGap: 1.4 });
  doc.moveDown(0.42);
}

function estimatedAlertHeight(alert) {
  doc.font("Helvetica-Bold").fontSize(13);
  let height = textHeight(`${clean(alert.ID)}  ${clean(alert["Alert Title"])}`) + 36;
  doc.font("Helvetica").fontSize(8.6);
  for (const field of ["Alert Description", "Operator Response", "Service Response", "Technician Response"]) {
    height += textHeight(alert[field] || (field === "Operator Response" ? "No operator action required." : "-"), { lineGap: 1.4 }) + 18;
  }
  return height;
}

function drawAlert(alert) {
  const estimate = estimatedAlertHeight(alert);
  const usablePageHeight = doc.page.height - 90;
  if (estimate < usablePageHeight) ensureSpace(estimate);

  doc.strokeColor(colors.line).lineWidth(0.6).moveTo(margin, doc.y).lineTo(557, doc.y).stroke();
  doc.moveDown(0.55);
  const severityColor = colors[clean(alert.Type).toLowerCase()] || colors.muted;
  doc.font("Helvetica-Bold").fontSize(13).fillColor(colors.ink)
    .text(`${clean(alert.ID)}  ${clean(alert["Alert Title"])}`, { width: 390, continued: false });
  const headingY = doc.y - 14;
  doc.roundedRect(447, headingY, 110, 17, 4).fill(severityColor);
  doc.font("Helvetica-Bold").fontSize(6.8).fillColor("#ffffff")
    .text(`${clean(alert.Type)} / ${clean(alert.Severity)}`.toUpperCase(), 451, headingY + 5, {
      width: 102, align: "center", lineBreak: false,
    });
  doc.x = margin;
  doc.y = Math.max(doc.y + 4, headingY + 23);

  doc.font("Helvetica-Bold").fontSize(7.2).fillColor(colors.muted)
    .text(`SYSTEM AREA  ${clean(alert["System Area"])}    MODEL  ${clean(alert.Model)}    UPDATED  ${clean(alert["Last Update"])}`, {
      characterSpacing: 0.15,
    });
  doc.moveDown(0.55);
  doc.font("Helvetica").fontSize(9).fillColor(colors.ink)
    .text(clean(alert["Alert Description"]), { width: 519, lineGap: 1.4 });
  doc.moveDown(0.55);
  responseBlock("Operator response", alert["Operator Response"] || "No operator action required.");
  responseBlock("Service response", alert["Service Response"]);
  responseBlock("Technician response", alert["Technician Response"]);
  doc.moveDown(0.2);
  alertsOnPage += 1;
}

doc.rect(0, 0, doc.page.width, doc.page.height).fill("#30292a");
doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(34)
  .text("Alert atlas", margin, 106, { width: 430 });
doc.fillColor("#d7d1cc").font("Helvetica").fontSize(17)
  .text("Compact alert response handbook", margin, 176);
doc.strokeColor("#7b293d").lineWidth(5).moveTo(margin, 225).lineTo(170, 225).stroke();
doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(25)
  .text(String(alerts.length), margin, 280);
doc.fillColor("#beb8b4").font("Helvetica").fontSize(9)
  .text("ALERTS", margin, 312, { characterSpacing: 1.2 });
doc.fillColor("#d7d1cc").fontSize(9)
  .text("FICTIONAL PORTFOLIO DEMONSTRATION - NOT FOR OPERATIONAL USE", margin, 660, {
    width: 519, characterSpacing: 0.5,
  });
doc.fillColor("#d7d1cc").fontSize(9)
  .text(`Dataset generated ${handbookDate(generatedAt)}`, margin, 720);
doc.text("Generated from data/alerts-ds.json", margin, 738);
drawPageFooter();

addContentPage();
alerts.forEach((alert) => {
  if (alertsOnPage >= 4) addContentPage();
  drawAlert(alert);
});

doc.end();

output.on("finish", () => {
  fs.copyFileSync(outputPath, publicPath);
  console.log(`Generated ${path.relative(projectRoot, outputPath)} and site download copy.`);
});
