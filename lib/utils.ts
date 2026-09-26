export function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export const CNIC_REGEX = /^\d{13}$/;
export const PHONE_REGEX = /^03\d{9}$/;

export function calcPercent(obtained?: number | null, total?: number | null) {
  if (!obtained || !total) return 0;
  return Math.round((obtained / total) * 10000) / 100;
}

export const COURSES = [
  "Web Developing",
  "Graphic Designing",
  "Digital Marketing",
  "E-Commerce",
] as const;

export const DOC_TYPES: { key: string; label: string }[] = [
  { key: "fsc_degree", label: "FSC Degree / Certificate" },
  { key: "domicile", label: "Local / Domicile Certificate" },
  { key: "cnic", label: "Student CNIC (Front & Back)" },
  { key: "police_verification", label: "Police Verification" },
  { key: "father_cnic", label: "Father CNIC (Front & Back)" },
  { key: "photo", label: "Photograph (White Background)" },
];

export function formatDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
