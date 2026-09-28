import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { RollNumber, Student } from "@/types";
import { HOD_SIGNATURE_ASPECT, HOD_SIGNATURE_DATA_URL, SIGNATORY_NAME, SIGNATORY_TITLE } from "@/lib/signature";

interface AdmissionLetterInput {
  student: Student;
  courseName: string;
  batchName: string;
  photoDataUrl?: string | null;
  logoDataUrl?: string | null;
  /** Institute display name printed in the header, e.g. "IT HUB Kohlu". */
  instituteName?: string;
  /** Base site URL (e.g. window.location.origin) the verification QR code should point at. */
  verifyBaseUrl?: string;
  /** Optional admin-set note printed on the letter, e.g. "Please bring original documents on the first day of class." */
  note?: string | null;
}

// Draws one line of text centered on `cx` with letter spacing (like
// "I T   H U B   K O H L U"). Font family/style/size must already be set.
// If `maxWidth` is given, the font size is shrunk until the spaced text fits.
// `spacing` is the extra gap between letters as a fraction of the font size.
// Returns the drawn (visible) width so callers can e.g. underline it.
function drawSpacedCentered(
  doc: jsPDF,
  text: string,
  cx: number,
  y: number,
  spacing: number,
  maxWidth?: number,
  minFontSize = 6
): number {
  let size = doc.getFontSize();
  const measure = () => {
    doc.setCharSpace(0);
    return doc.getTextWidth(text) + Math.max(text.length - 1, 0) * spacing * size;
  };
  let width = measure();
  while (maxWidth && width > maxWidth && size > minFontSize) {
    size -= 0.25;
    doc.setFontSize(size);
    width = measure();
  }
  doc.setCharSpace(spacing * size);
  doc.text(text, cx - width / 2, y);
  doc.setCharSpace(0);
  return width;
}

export async function generateAdmissionLetter({
  student,
  courseName,
  batchName,
  photoDataUrl,
  logoDataUrl,
  instituteName = "IT HUB Kohlu",
  verifyBaseUrl,
  note,
}: AdmissionLetterInput): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header band
  doc.setFillColor(10, 14, 26);
  doc.rect(0, 0, pageWidth, 98, "F");
  doc.setFillColor(34, 211, 238);
  doc.rect(0, 96, pageWidth, 3, "F");

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", 40, 22, 56, 56);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(25);
  const nameY = 52;
  const instituteLabel = instituteName.toUpperCase();
  // Centered on the page; width limited so it never runs into the logo (or its mirror on the right).
  const headerCx = pageWidth / 2;
  const headerMaxW = (headerCx - 108) * 2;
  const nameWidth = drawSpacedCentered(doc, instituteLabel, headerCx, nameY, 0.14, headerMaxW, 12);
  // Underline drawn manually — jsPDF's text() has no built-in underline option.
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.4);
  doc.line(headerCx - nameWidth / 2, nameY + 4, headerCx + nameWidth / 2, nameY + 4);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  drawSpacedCentered(doc, "Official Admission Letter", headerCx, nameY + 22, 0.22, headerMaxW, 8);

  let y = 138;
  doc.setTextColor(20, 20, 20);

  if (photoDataUrl) {
    doc.addImage(photoDataUrl, "JPEG", pageWidth - 130, 110, 90, 100);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Tracking ID: ${student.tracking_id}`, 40, y);
  y += 30;

  const row = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(label, 40, y);
    doc.setFont("helvetica", "normal");
    doc.text(value || "-", 200, y);
    y += 22;
  };

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Personal Information", 40, y);
  y += 20;
  row("Full Name:", student.full_name);
  row("Father's Name:", student.father_name);
  row("Date of Birth:", student.dob);
  row("Gender:", student.gender);
  row("CNIC:", student.student_cnic);
  row("City:", student.city);
  row("Address:", student.address);

  y += 10;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Academic Information", 40, y);
  y += 20;
  row("Matric:", `${student.matric_board} • ${student.matric_year} • ${student.matric_percentage}%`);
  row("FSC:", `${student.fsc_board} • ${student.fsc_group} • ${student.fsc_percentage}%`);

  y += 10;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Enrollment Details", 40, y);
  y += 20;
  row("Course:", courseName);
  row("Batch:", batchName);
  row("Admission Date:", new Date().toLocaleDateString());

  // Optional admin note (e.g. "Please bring original documents on the first day of class.")
  y += 10;
  if (note && note.trim()) {
    const noteLines = doc.splitTextToSize(note.trim(), pageWidth - 100);
    const boxHeight = 26 + noteLines.length * 13;
    doc.setFillColor(255, 248, 225);
    doc.setDrawColor(245, 190, 60);
    doc.roundedRect(40, y, pageWidth - 80, boxHeight, 4, 4, "FD");
    doc.setTextColor(150, 100, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("NOTE", 50, y + 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(noteLines, 50, y + 30);
    y += boxHeight + 20;
    doc.setTextColor(20, 20, 20);
  }

  // QR Code — scanning it opens the public verification page, which confirms whether
  // this letter is a genuine record or a fake/tampered one.
  const qrY = Math.max(y, 400);
  const verifyUrl = `${(verifyBaseUrl ?? "").replace(/\/$/, "")}/verify?tid=${encodeURIComponent(student.tracking_id)}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
  doc.addImage(qrDataUrl, "PNG", pageWidth - 130, qrY, 90, 90);
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 20);
  doc.text("Scan to verify", pageWidth - 128, qrY + 100);

  // Signature line
  const sigY = Math.max(y + 30, qrY + 60);
  // Lab Incharge signature sits just above the line
  const sigW = 130;
  const sigH = sigW / HOD_SIGNATURE_ASPECT;
  doc.addImage(HOD_SIGNATURE_DATA_URL, "PNG", 50, sigY - sigH - 2, sigW, sigH);
  doc.line(40, sigY, 220, sigY);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(SIGNATORY_NAME, 40, sigY + 15);
  doc.setFont("helvetica", "normal");
  doc.text(SIGNATORY_TITLE, 40, sigY + 28);

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `This is a system-generated admission letter from ${instituteName}. Scan the QR code or visit the verify page with the Tracking ID to confirm it is genuine.`,
    40,
    Math.max(sigY + 60, 780),
    { maxWidth: pageWidth - 80 }
  );

  // Certificate-style double border framing the whole page — a bold outer
  // line plus a thin accent line inside it — drawn last so it sits on top
  // of everything else for a clean, professional finish. Colors match the
  // header band/accent strip so the frame blends with it up top and reads
  // as a clean rule once it crosses onto the white body below.
  const margin = 10;
  doc.setDrawColor(10, 14, 26);
  doc.setLineWidth(3);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);
  doc.setDrawColor(34, 211, 238);
  doc.setLineWidth(1);
  doc.rect(margin + 6, margin + 6, pageWidth - (margin + 6) * 2, pageHeight - (margin + 6) * 2);

  return doc;
}

// ---------------------------------------------------------------------------
// STUDENT ID CARD
// ---------------------------------------------------------------------------
// CR80 card size (the standard plastic ID card / bank card size): 3.375in x
// 2.125in = 243pt x 153pt at 72pt/in. One PDF page holds both the front and
// back, stacked, each framed with a dashed cut-guide the same size as a real
// card — so printing this on card stock and cutting along the dashed lines
// gives an actual wallet-sized card.
const CARD_W = 243;
const CARD_H = 153;

interface IdCardInput {
  // Only what the card is allowed to show — all captured from the student's
  // own admission application, never re-typed by the admin.
  student: Pick<Student, "full_name" | "father_name" | "phone" | "tracking_id" | "student_cnic" | "photo_url">;
  /** Card's issue date (ISO date string). */
  issueDate?: string | null;
  /** Card's expiry date (ISO date string) — auto-calculated as the student's batch end date. */
  validUntil?: string | null;
  photoDataUrl?: string | null;
  logoDataUrl?: string | null;
  instituteName?: string;
  /** Base site URL (e.g. window.location.origin) the verification QR code should point at. */
  verifyBaseUrl?: string;
  /** Terms & Conditions text printed on the back of the card. */
  termsText?: string | null;
}

function formatCardDate(d: string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Draws the dashed cut-guide rectangle that marks the real card boundary on
// the printed sheet.
function drawCutGuide(doc: jsPDF, x: number, y: number) {
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.75);
  doc.setLineDashPattern([3, 2], 0);
  doc.rect(x, y, CARD_W, CARD_H);
  doc.setLineDashPattern([], 0);
}

function drawCardFront(doc: jsPDF, x: number, y: number, { student, photoDataUrl, logoDataUrl, instituteName }: IdCardInput) {
  drawCutGuide(doc, x, y);

  // Header band — fixed height, squared off (no rounded/overlapping shapes),
  // so nothing below it is ever drawn on top of the blue line.
  const headerH = 30;
  doc.setFillColor(13, 46, 96);
  doc.rect(x, y, CARD_W, headerH, "F");
  doc.setFillColor(56, 189, 248);
  doc.rect(x, y + headerH, CARD_W, 2, "F");

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", x + 7, y + 4, 20, 20);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  // Centered on the card; width limited so it never runs into the logo (or its mirror on the right).
  const cardCx = x + CARD_W / 2;
  const cardMaxW = CARD_W - 2 * 32;
  drawSpacedCentered(doc, (instituteName ?? "IT HUB Kohlu").toUpperCase(), cardCx, y + 14, 0.12, cardMaxW, 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  drawSpacedCentered(doc, "Student Identity Card", cardCx, y + 23, 0.2, cardMaxW, 4);

  // Everything below this line sits on the plain white body — no negative
  // offsets, so nothing can ever creep back up into the header.
  const bodyTop = y + headerH + 6;

  // Photo — in its own corner (top-left of the white area), fields sit
  // beside it rather than under it, so the two never collide.
  const photoW = 58;
  const photoH = 68;
  const photoX = x + 10;
  const photoY = bodyTop;
  doc.setDrawColor(13, 46, 96);
  doc.setLineWidth(1);
  doc.roundedRect(photoX - 1.5, photoY - 1.5, photoW + 3, photoH + 3, 2, 2, "S");
  if (photoDataUrl) {
    doc.addImage(photoDataUrl, "JPEG", photoX, photoY, photoW, photoH);
  } else {
    doc.setFillColor(226, 232, 240);
    doc.rect(photoX, photoY, photoW, photoH, "F");
  }

  // Fields to the right of the photo
  const fx = photoX + photoW + 12;
  const fMax = x + CARD_W - 10 - fx;
  let fy = photoY + 8;
  const field = (label: string, value: string, big?: boolean) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.6);
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), fx, fy);
    fy += big ? 8 : 7.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(big ? 9 : 7.2);
    doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(value || "-", fMax);
    doc.text(lines.slice(0, 1), fx, fy);
    fy += big ? 10 : 8.5;
  };
  field("Name", student.full_name, true);
  field("Father Name", student.father_name);
  field("CNIC", student.student_cnic);
  field("Mobile Number", student.phone);

  // Lab Incharge signature — front of the card, right-aligned above the footer strip
  const hodSigY = y + CARD_H - 16 - 19;
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.6);
  const hodSigW = 56;
  const hodSigH = hodSigW / HOD_SIGNATURE_ASPECT;
  doc.addImage(HOD_SIGNATURE_DATA_URL, "PNG", x + CARD_W - 50 - hodSigW / 2, hodSigY - hodSigH - 1, hodSigW, hodSigH);
  doc.line(x + CARD_W - 90, hodSigY, x + CARD_W - 10, hodSigY);
  doc.setFontSize(5.8);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.text(SIGNATORY_NAME, x + CARD_W - 50, hodSigY + 6, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(SIGNATORY_TITLE, x + CARD_W - 50, hodSigY + 12, { align: "center" });

  // Footer strip — the tracking ID doubles as the Student ID
  doc.setFillColor(13, 46, 96);
  doc.rect(x, y + CARD_H - 16, CARD_W, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(`Student ID: ${student.tracking_id}`, x + CARD_W / 2, y + CARD_H - 6, { align: "center" });
}

async function drawCardBack(
  doc: jsPDF,
  x: number,
  y: number,
  { student, issueDate, validUntil, verifyBaseUrl, termsText }: IdCardInput
) {
  drawCutGuide(doc, x, y);

  const footerH = 16;
  const footerTop = y + CARD_H - footerH;

  // Top strip
  doc.setFillColor(13, 46, 96);
  doc.rect(x, y, CARD_W, 10, "F");

  // Footer strip — Issue / Expiry dates, same blue bar style as the front's Student ID
  doc.setFillColor(13, 46, 96);
  doc.rect(x, footerTop, CARD_W, footerH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.6);
  doc.text(`Issue Date: ${formatCardDate(issueDate)}`, x + 10, y + CARD_H - 6);
  doc.text(`Expiry Date: ${formatCardDate(validUntil)}`, x + CARD_W - 10, y + CARD_H - 6, { align: "right" });

  // QR code — bottom-left corner, just above the footer
  const verifyUrl = `${(verifyBaseUrl ?? "").replace(/\/$/, "")}/id-card?cnic=${encodeURIComponent(student.student_cnic ?? "")}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 0, width: 160 });
  const qrSize = 30;
  const qrTop = footerTop - 7 - qrSize;
  doc.addImage(qrDataUrl, "PNG", x + 10, qrTop, qrSize, qrSize);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.6);
  doc.setTextColor(100, 116, 139);
  doc.text("Scan to verify", x + 10 + qrSize / 2, footerTop - 2, { align: "center" });

  // Student signature — bottom-right corner, opposite the QR code
  const sigY = footerTop - 9;
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.6);
  doc.line(x + CARD_W - 90, sigY, x + CARD_W - 10, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.setTextColor(20, 20, 20);
  doc.text("Student Signature", x + CARD_W - 50, sigY + 6, { align: "center" });

  // Terms & Conditions — block sits a little left of center, text left-aligned,
  // vertically centered in the space between the top strip and the QR row
  const termsX = x + 18;
  const termsW = CARD_W - 50;
  const terms =
    termsText && termsText.trim()
      ? termsText.trim()
      : "1. This card is the property of the institute.\n2. If found, please return to the institute office.\n3. Non-transferable — must be carried at all times.";
  let termsSize = 6.3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(termsSize);
  let termLines: string[] = doc.splitTextToSize(terms, termsW);
  const areaTop = y + 10;
  const areaBottom = qrTop - 4;
  const areaH = areaBottom - areaTop;
  const titleBlockH = 8 + 8; // title + divider gap
  if (titleBlockH + termLines.length * (termsSize + 2.4) > areaH) {
    termsSize = 5.4;
    doc.setFontSize(termsSize);
    termLines = doc.splitTextToSize(terms, termsW);
  }
  const lineH = termsSize + 2.4;
  const blockH = titleBlockH + termLines.length * lineH;
  const startY = areaTop + Math.max((areaH - blockH) / 2, 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(13, 46, 96);
  doc.text("TERMS AND CONDITIONS", termsX, startY + 6);
  doc.setDrawColor(56, 189, 248);
  doc.setLineWidth(0.8);
  doc.line(termsX, startY + 10, termsX + 44, startY + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(termsSize);
  doc.setTextColor(60, 60, 60);
  termLines.forEach((line, i) => {
    doc.text(line, termsX, startY + titleBlockH + 4 + i * lineH);
  });
}

export async function generateIdCardPdf(input: IdCardInput): Promise<jsPDF> {
  // Page is a full A4 sheet; the CR80 front/back cards are centered on it
  // (with a small vertical gap between them) so the sheet still prints and
  // cuts the same way, just on standard paper instead of a card-sized page.
  const gap = 24;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const x = (pageW - CARD_W) / 2;
  const blockH = CARD_H * 2 + gap;
  const yTop = (pageH - blockH) / 2;

  drawCardFront(doc, x, yTop, input);
  await drawCardBack(doc, x, yTop + CARD_H + gap, input);

  doc.setFontSize(6.5);
  doc.setTextColor(150, 150, 150);
  doc.text("Cut along the dashed lines", pageW / 2, yTop + CARD_H + gap / 2 + 2, { align: "center" });

  return doc;
}

// ---------------------------------------------------------------------------
// ROLL NUMBER SLIP
// ---------------------------------------------------------------------------
// Uses the exact same A4 template as the Admission Letter (dark header band
// with logo + institute name, photo top-right, label/value rows, note box,
// QR + signature line, footer text and double border) — only the data is
// roll-number specific: candidate info, test details, note, instructions.

interface RollSlipInput {
  student: Pick<Student, "full_name" | "father_name" | "student_cnic" | "tracking_id" | "photo_url">;
  rollNumber: RollNumber;
  courseName: string;
  batchName: string;
  photoDataUrl?: string | null;
  logoDataUrl?: string | null;
  instituteName?: string;
  /** Base site URL (e.g. window.location.origin) the verification QR code should point at. */
  verifyBaseUrl?: string;
}

export async function generateRollSlipPdf({
  student,
  rollNumber,
  courseName,
  batchName,
  photoDataUrl,
  logoDataUrl,
  instituteName = "IT HUB Kohlu",
  verifyBaseUrl,
}: RollSlipInput): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header band (same as admission letter)
  doc.setFillColor(10, 14, 26);
  doc.rect(0, 0, pageWidth, 98, "F");
  doc.setFillColor(34, 211, 238);
  doc.rect(0, 96, pageWidth, 3, "F");

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", 40, 22, 56, 56);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(25);
  const nameY = 52;
  const instituteLabel = instituteName.toUpperCase();
  // Centered on the page; width limited so it never runs into the logo (or its mirror on the right).
  const headerCx = pageWidth / 2;
  const headerMaxW = (headerCx - 108) * 2;
  const nameWidth = drawSpacedCentered(doc, instituteLabel, headerCx, nameY, 0.14, headerMaxW, 12);
  // Underline drawn manually — jsPDF's text() has no built-in underline option.
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.4);
  doc.line(headerCx - nameWidth / 2, nameY + 4, headerCx + nameWidth / 2, nameY + 4);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  drawSpacedCentered(doc, "Roll Number Slip", headerCx, nameY + 22, 0.22, headerMaxW, 8);

  let y = 138;
  doc.setTextColor(20, 20, 20);

  if (photoDataUrl) {
    doc.addImage(photoDataUrl, "JPEG", pageWidth - 130, 110, 90, 100);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Tracking ID: ${student.tracking_id}`, 40, y);
  y += 30;

  // Rows next to the photo (y < 215) wrap narrower so they never run under it.
  const row = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(label, 40, y);
    doc.setFont("helvetica", "normal");
    const maxW = y < 215 ? pageWidth - 130 - 200 - 12 : pageWidth - 200 - 40;
    const lines = doc.splitTextToSize(value || "-", maxW);
    doc.text(lines, 200, y);
    y += 22 + (lines.length - 1) * 13;
  };

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Candidate Information", 40, y);
  y += 20;
  row("Full Name:", student.full_name);
  row("Father's Name:", student.father_name);
  row("CNIC:", student.student_cnic);
  row("Course:", courseName);
  row("Batch:", batchName);

  y += 10;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Test Details", 40, y);
  y += 20;
  const formattedDate = rollNumber.exam_date
    ? new Date(rollNumber.exam_date).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "-";
  row("Roll Number:", rollNumber.roll_no);
  row("Test Type:", rollNumber.test_type || "Entry Test");
  row("Test Day & Date:", formattedDate);
  row("Reporting Time:", rollNumber.reporting_time || rollNumber.exam_time || "-");
  if (rollNumber.reporting_time && rollNumber.exam_time) {
    row("Test Time:", rollNumber.exam_time);
  }
  row("Test Center:", rollNumber.exam_center);

  // Optional admin note (same box style as the admission letter)
  y += 10;
  if (rollNumber.note && rollNumber.note.trim()) {
    const noteLines = doc.splitTextToSize(rollNumber.note.trim(), pageWidth - 100);
    const boxHeight = 26 + noteLines.length * 13;
    doc.setFillColor(255, 248, 225);
    doc.setDrawColor(245, 190, 60);
    doc.setLineWidth(1);
    doc.roundedRect(40, y, pageWidth - 80, boxHeight, 4, 4, "FD");
    doc.setTextColor(150, 100, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("NOTE", 50, y + 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(noteLines, 50, y + 30);
    y += boxHeight + 20;
    doc.setTextColor(20, 20, 20);
  }

  // Important instructions
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Important Instructions", 40, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const instructions = [
    "Please bring a printout of this Roll No. Slip on the test day along with your original CNIC/B-Form (MANDATORY).",
    "Bring your own Clipboard and Ball Pen (black/blue). Electronic devices including mobile phones and calculators are not allowed in the test hall.",
    "Reach the test center well before the reporting time — no candidate will be entertained after the test begins.",
    "This Roll No. Slip is issued provisionally, subject to verification of your original documents. No entry into the test center without it.",
  ];
  instructions.forEach((line, i) => {
    const lines = doc.splitTextToSize(`${i + 1}. ${line}`, pageWidth - 80);
    doc.text(lines, 40, y);
    y += lines.length * 11.5 + 3;
  });
  y += 6;

  // QR Code — scanning it opens the public verification page.
  const qrY = Math.max(y, 400);
  const verifyUrl = `${(verifyBaseUrl ?? "").replace(/\/$/, "")}/verify?tid=${encodeURIComponent(student.tracking_id)}&roll=${encodeURIComponent(rollNumber.roll_no)}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
  doc.addImage(qrDataUrl, "PNG", pageWidth - 130, qrY, 90, 90);
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 20);
  doc.text("Scan to verify", pageWidth - 128, qrY + 100);

  // Signature line
  const sigY = Math.max(y + 30, qrY + 60);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  // Lab Incharge signature sits just above the line
  const sigW = 130;
  const sigH = sigW / HOD_SIGNATURE_ASPECT;
  doc.addImage(HOD_SIGNATURE_DATA_URL, "PNG", 50, sigY - sigH - 2, sigW, sigH);
  doc.line(40, sigY, 220, sigY);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(SIGNATORY_NAME, 40, sigY + 15);
  doc.setFont("helvetica", "normal");
  doc.text(SIGNATORY_TITLE, 40, sigY + 28);

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `This is a system-generated roll number slip from ${instituteName}. Scan the QR code or visit the verify page with the Tracking ID to confirm it is genuine.`,
    40,
    Math.max(sigY + 60, 780),
    { maxWidth: pageWidth - 80 }
  );

  // Certificate-style double border — identical to the admission letter.
  const margin = 10;
  doc.setDrawColor(10, 14, 26);
  doc.setLineWidth(3);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);
  doc.setDrawColor(34, 211, 238);
  doc.setLineWidth(1);
  doc.rect(margin + 6, margin + 6, pageWidth - (margin + 6) * 2, pageHeight - (margin + 6) * 2);

  return doc;
}

// ---------------------------------------------------------------------------
// Result sheet (public /result search + dashboard) — same header style as the
// roll slip so all documents look like one family.
// ---------------------------------------------------------------------------
export interface ResultSheetInput {
  student: { full_name: string; father_name: string; tracking_id: string; student_cnic: string };
  courseName?: string | null;
  batchName?: string | null;
  rollNo?: string | null;
  results: {
    title: string;
    result_status: string;
    marks_obtained: number | null;
    marks_total: number | null;
    remarks: string | null;
    created_at: string;
  }[];
  photoDataUrl?: string | null;
  logoDataUrl?: string | null;
  instituteName?: string;
}

export async function generateResultPdf({
  student,
  courseName,
  batchName,
  rollNo,
  results,
  photoDataUrl,
  logoDataUrl,
  instituteName = "IT HUB Kohlu",
}: ResultSheetInput): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  doc.setFillColor(10, 14, 26);
  doc.rect(0, 0, pw, 98, "F");
  doc.setFillColor(34, 211, 238);
  doc.rect(0, 96, pw, 3, "F");
  if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", 40, 22, 56, 56);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(25);
  const cx = pw / 2;
  const maxW = (cx - 108) * 2;
  const nw = drawSpacedCentered(doc, instituteName.toUpperCase(), cx, 52, 0.14, maxW, 12);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.4);
  doc.line(cx - nw / 2, 56, cx + nw / 2, 56);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  drawSpacedCentered(doc, "Result Sheet", cx, 74, 0.22, maxW, 8);

  let y = 138;
  doc.setTextColor(20, 20, 20);
  if (photoDataUrl) doc.addImage(photoDataUrl, "JPEG", pw - 130, 110, 90, 100);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Candidate Information", 40, y);
  y += 22;
  const row = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(label, 40, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value || "-", y < 215 ? pw - 130 - 200 - 12 : pw - 240);
    doc.text(lines, 200, y);
    y += 22 + (lines.length - 1) * 13;
  };
  row("Full Name:", student.full_name);
  row("Father's Name:", student.father_name);
  row("CNIC:", student.student_cnic);
  row("Tracking ID:", student.tracking_id);
  if (rollNo) row("Roll Number:", rollNo);
  row("Course:", courseName ?? "-");
  row("Batch:", batchName ?? "-");

  y = Math.max(y, 232) + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Result Details", 40, y);
  y += 12;

  for (const r of results) {
    if (y > ph - 150) {
      doc.addPage();
      y = 60;
    }
    y += 10;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.6);
    doc.roundedRect(40, y, pw - 80, r.remarks ? 84 : 66, 6, 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(r.title || "Result", 54, y + 22);
    const st = (r.result_status || "pending").toUpperCase();
    const good = ["PASS", "MERIT"].includes(st);
    const bad = st === "FAIL";
    doc.setTextColor(good ? 5 : bad ? 200 : 160, good ? 120 : bad ? 30 : 110, good ? 70 : bad ? 30 : 0);
    doc.text(st, pw - 54 - doc.getTextWidth(st), y + 22);
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    const marks =
      r.marks_obtained != null
        ? `Marks: ${r.marks_obtained}${r.marks_total != null ? ` / ${r.marks_total}` : ""}${
            r.marks_total ? `  (${((Number(r.marks_obtained) / Number(r.marks_total)) * 100).toFixed(1)}%)` : ""
          }`
        : "Marks: -";
    doc.text(marks, 54, y + 44);
    doc.text(`Date: ${new Date(r.created_at).toLocaleDateString()}`, pw - 54 - 120, y + 44);
    if (r.remarks) {
      doc.setFontSize(9.5);
      doc.text(`Remarks: ${doc.splitTextToSize(r.remarks, pw - 130)[0]}`, 54, y + 64);
    }
    y += r.remarks ? 84 : 66;
  }

  doc.setFontSize(8.5);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated ${new Date().toLocaleString()} — computer generated result sheet.`, 40, ph - 30);
  return doc;
}
