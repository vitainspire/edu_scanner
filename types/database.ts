export interface Class {
  id: string;
  teacher_id: string;
  name: string;
  grade: string;
  section: string;
  academic_year: string;
  created_at: string;
}

export interface Test {
  id: string;
  teacher_id: string;
  class_id: string;
  subject: string;
  topic: string;
  total_marks: number;
  conducted_on: string;
  term: string | null;
  questions: unknown | null;
}

export interface Student {
  id: string;
  teacher_id: string;
  class_id: string;
  name: string;
  roll_number: number;
  is_active: boolean;
  interests: string | null;
  goal: string | null;
}

export interface Mark {
  id: string;
  test_id: string;
  student_id: string;
  score: number;
  feedback: string | null;
  entered_at: string;
  source: string | null;
}

export interface Teacher {
  id: string;
  user_id: string;
  name: string;
  school_name: string;
  subject: string;
  grade: string;
  phone: string | null;
}
