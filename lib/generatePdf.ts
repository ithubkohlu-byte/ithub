import jsPDF from "jspdf";

export async function generateAdmissionPdf(opts: {
  trackingId: string;
  fullName: string;
  fatherName: string;
  cnic: string;
  course: string;
  batch: string;
  phone: string;
  email: string;
  photoDataUrl?: string | null;
  qrDataUrl: string;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(11, 96, 176);
  doc.rect(0, 0, pageWidth, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("IT HUB INSTITUTE", 40, 45);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Admission Confirmation Letter", 40, 65);

  doc.setTextColor(20, 20, 20);

  if (opts.photoDataUrl) {
    try {
      doc.addImage(opts.photoDataUrl, "JPEG", pageWidth - 130, 110, 90, 100);
    } catch {}
  }

  doc.addImage(opts.qrDataUrl, "PNG", pageWidth - 130, 230, 90, 90);
  doc.setFontSize(8);
  doc.text("Scan for Roll Slip", pageWidth - 128, 330);

  let y = 130;
  const line = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(label, 40, y);
    doc.setFont("helvetica", "normal");
    doc.text(value || "-", 190, y);
    y += 24;
  };

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(11, 96, 176);
  doc.text(`Tracking ID: ${opts.trackingId}`, 40, y);
  doc.setTextColor(20, 20, 20);
  y += 35;

  line("Full Name:", opts.fullName);
  line("Father Name:", opts.fatherName);
  line("CNIC:", opts.cnic);
  line("Phone:", opts.phone);
  line("Email:", opts.email);
  line("Course:", opts.course);
  line("Batch:", opts.batch);
  line("Status:", "Pending Verification");

  y += 20;
  doc.setDrawColor(0, 209, 255);
  doc.line(40, y, pageWidth - 40, y);
  y += 25;
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(
    "This document confirms your application submission to IT HUB Institute. Please keep your Tracking ID safe.",
    40,
    y,
    { maxWidth: pageWidth - 80 }
  );
  y += 40;
  doc.text("Contact: 03324455006  |  ithubkohlu@gmail.com", 40, y);

  doc.save(`${opts.trackingId}_admission.pdf`);
}
