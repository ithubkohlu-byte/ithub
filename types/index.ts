export type ApplicationStatus = "pending" | "verified" | "rejected" | "enrolled";
export type DocStatus = "pending" | "verified" | "rejected";
export type BatchStatus = "draft" | "open" | "closed";

// Course names are admin-managed (see the `courses` table) — new batches simply
// reference whatever course names currently exist, so this is a plain string.
export type CourseName = string;

// Small fixed set of icons an admin can pick for a course in the admin panel.
export const COURSE_ICON_KEYS = ["code", "palette", "megaphone", "cart", "layers", "book"] as const;
export type CourseIconKey = (typeof COURSE_ICON_KEYS)[number];

export interface Course {
  id: string;
  name: string;
  description: string;
  duration: string;
  icon_key: CourseIconKey | string;
  display_order: number;
  is_open: boolean;
  // Longer write-up (eligibility, syllabus, fee, etc.) shown to a student once
  // they select this course — admin-editable from Admin > Courses.
  full_info: string;
  created_at: string;
}

export const DOC_TYPES = [
  { key: "fsc_degree", label: "FSC Degree / DMC" },
  { key: "domicile", label: "Local / Domicile Certificate" },
  { key: "cnic_student_front", label: "Student CNIC (Front)" },
  { key: "cnic_student_back", label: "Student CNIC (Back)" },
  { key: "police_verification", label: "Police Verification Certificate" },
  { key: "cnic_father_front", label: "Father CNIC (Front)" },
  { key: "cnic_father_back", label: "Father CNIC (Back)" },
  { key: "photo", label: "Passport Size Photo (white background)" },
] as const;
export type DocKey = (typeof DOC_TYPES)[number]["key"];

export interface Batch {
  id: string;
  batch_name: string;
  // Primary/legacy course — kept for backward compatibility (e.g. existing
  // enrollments). A batch can additionally offer more courses; see below.
  course_name: CourseName;
  start_date: string;
  end_date: string;
  seats_total: number;
  seats_filled: number;
  status: BatchStatus;
  is_announced: boolean;
  created_at: string;
}

// Row of the `batch_courses` join table: every extra course a batch offers
// besides its primary `course_name`.
export interface BatchCourse {
  id: string;
  batch_id: string;
  course_name: CourseName;
  created_at: string;
}

// A batch enriched with the full list of courses it offers (primary +
// anything in `batch_courses`), used wherever the UI needs to show/pick from
// every course available in a batch.
export type BatchWithCourses = Batch & { course_names: string[] };

export interface Student {
  id: string;
  tracking_id: string;
  full_name: string;
  email: string;
  phone: string;
  father_name: string;
  dob: string;
  gender: string;
  address: string;
  city: string;
  student_cnic: string;
  father_cnic: string;
  matric_board: string;
  matric_year: string;
  matric_total: number;
  matric_obtained: number;
  matric_percentage: number;
  fsc_board: string;
  fsc_year: string;
  fsc_group: string;
  fsc_total: number;
  fsc_obtained: number;
  fsc_percentage: number;
  photo_url: string | null;
  username: string | null;
  auth_provider: "password" | "google" | "facebook" | "github";
  application_status: ApplicationStatus;
  onboarding_step: number;
  created_at: string;
}

export interface AdditionalQualification {
  id: string;
  student_id: string;
  qualification_name: string;
  institute_name: string;
  year: string | null;
  document_path: string | null;
  created_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  batch_id: string;
  course_name: string;
  enrolled_at: string;
  // Set by admin, independent of seat count — whether this applicant was
  // actually shortlisted/selected after applications closed.
  is_shortlisted: boolean;
  shortlist_remarks: string | null;
}

export interface DocumentRow {
  id: string;
  student_id: string;
  doc_type: DocKey;
  file_path: string;
  status: DocStatus;
  admin_comment: string | null;
  uploaded_at: string;
}

export interface GalleryItem {
  id: string;
  image_url: string;
  batch_name: string | null;
  caption: string | null;
  is_hidden: boolean;
  created_at: string;
}

// Preset options an admin can pick when assigning a roll number; "Custom"
// lets them type any other label instead.
export const TEST_TYPE_PRESETS = ["Entry Test", "Final Exam", "Mid Term Exam", "Merit Test", "Interview"] as const;

export interface RollNumber {
  id: string;
  student_id: string;
  enrollment_id: string | null;
  roll_no: string;
  // What this roll number is for — admin picks a preset ("Entry Test", "Final
  // Exam", "Merit Test", "Interview") or types a custom label.
  test_type: string;
  exam_center: string;
  exam_date: string;
  exam_time: string;
  // Optional arrival time if different from the test's start time itself
  // (e.g. "7:30 AM" reporting for a 9:00 AM test). Falls back to exam_time
  // on the slip when left blank.
  reporting_time: string | null;
  // Optional per-student instruction shown on their roll no. slip
  // (e.g. "Please arrive 30 minutes before exam time.").
  note: string | null;
}

export interface HomeContent {
  id: number;
  hero_title: string;
  hero_subtitle: string;
  about_text: string;
  why_choose_us_points: string[];
  contact_phone: string;
  contact_email: string;
  contact_address: string;
  admission_open: boolean;
  logo_url: string | null;
  institute_name: string;
  developer_name: string;
  help_content: string;
  // Optional note printed on every generated admission letter
  // (e.g. "Please bring original documents on the first day of class.").
  admission_note: string;
  // Terms & Conditions text printed on the back of every student ID card.
  id_card_terms: string;
}

// A card the admin has issued for an ENROLLED student — see public.id_cards.
// A student only shows up on /id-card once both this row exists AND their
// application_status is 'enrolled'.
export interface IdCard {
  id: string;
  student_id: string;
  card_no: string;
  class_section: string | null;
  emergency_contact: string | null;
  blood_group: string | null;
  issue_date: string;
  valid_until: string | null;
  created_at: string;
}

// A row in public.admins — anyone listed here can sign in and reach /admin.
// Multiple admins are supported: any admin can add/remove others from
// Admin > Settings > Manage Admins (except removing themselves, and the
// last remaining admin can never be removed).
export interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

export interface DashboardTab {
  id: string;
  title: string;
  content: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Result {
  id: string;
  student_id: string;
  enrollment_id: string | null;
  title: string;
  result_status: "pending" | "pass" | "fail" | "merit" | "waitlist";
  marks_obtained: number | null;
  marks_total: number | null;
  remarks: string | null;
  file_path: string | null;
  is_published: boolean;
  created_at: string;
}

// Admin-managed extra public page/nav tab (e.g. "Scholarships", "FAQ") — lets
// admin add or remove a tab on the public site without any code changes.
export interface SitePage {
  id: string;
  title: string;
  slug: string;
  content: string;
  show_in_nav: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Feedback {
  id: string;
  student_id: string;
  student_name: string | null;
  message: string;
  rating: number | null;
  // Admin approval: only feedback the admin has approved shows up on the
  // public "Student Reviews" section on the website.
  is_approved: boolean;
  created_at: string;
}
