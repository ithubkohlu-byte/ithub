export type HomeContent = {
  id: string;
  hero_title: string;
  hero_subtitle: string;
  about_text: string;
  why_choose_us_points: string[];
  contact_phone: string;
  contact_address: string;
  contact_email: string;
  course_descriptions: Record<string, { title: string; desc: string }>;
};

export type Batch = {
  id: string;
  batch_name: string;
  course_name: string;
  start_date: string;
  end_date: string;
  seats_total: number;
  seats_filled: number;
  status: "Draft" | "Open" | "Closed";
  is_announced: boolean;
  created_at: string;
};

export type Student = {
  id: string;
  auth_user_id: string;
  tracking_id: string;
  full_name: string;
  email: string;
  phone: string;
  father_name: string;
  dob: string;
  gender: string;
  address: string;
  city: string;
  cnic: string;
  father_cnic: string;
  matric_board: string;
  matric_year: string;
  matric_total: number;
  matric_obtained: number;
  matric_percent: number;
  fsc_board: string;
  fsc_year: string;
  fsc_group: string;
  fsc_total: number;
  fsc_obtained: number;
  fsc_percent: number;
  status: "Pending" | "Verified" | "Rejected" | "Enrolled";
  created_at: string;
};

export type Document = {
  id: string;
  student_id: string;
  doc_type: string;
  file_url: string;
  status: "Pending" | "Verified" | "Rejected";
  admin_comment: string | null;
};

export type Enrollment = {
  id: string;
  student_id: string;
  course_name: string;
  batch_id: string;
  admission_date: string;
  status: string;
};

export type RollNumber = {
  id: string;
  student_id: string;
  enrollment_id: string;
  roll_no: string;
  exam_center: string;
  exam_date: string;
  exam_time: string;
};

export type GalleryImage = {
  id: string;
  image_url: string;
  batch_name: string;
  caption: string;
  is_visible: boolean;
};
