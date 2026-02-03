import axios from "axios";

// ---- Types ----
export interface CourseDTO {
  _id?: string;
  name: string;
  description: string;
  duration_months?: number;
  batches?: string[];
  students_count?: number;
  status?: string;
  course_fee?: number;
  course_start?: Date | string;
  course_end?: Date | string;
}

export interface BatchDTO {
  _id?: string;
  name: string;
  course_id: string | { _id: string; name: string };
  teacher_id?: string | { _id: string; name: string };
  syllabus_id?: string;
  schedule: string; // JSON string
  students_count?: number;
  fees_collected?: number;
  total_fees?: number;
  archived?: boolean;
  isArchived?: boolean;
}

export interface LectureDTO {
  _id?: string;
  course_id: string | { _id: string; name: string };
  batch_id: string | { _id: string; name: string };
  teacher_id: string | { _id: string; fname: string; lname: string };
  subject: string;
  topic: string;
  subtopic?: string;
  date: Date | string;
  lecture_start: Date | string;
  lecture_end: Date | string;
  note?: string;
  attendance_count?: number;
  total_students?: number;
  status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  archived?: boolean;
  isArchived?: boolean;
  metadata?: {
    attendance_percentage: number;
    duration_minutes: number;
  };
}

// Centralized Axios instance so we can later add interceptors (auth, logging, etc.)
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  withCredentials: true,
});

export interface HealthResponse {
  success: boolean;
  message: string;
}

export const getHealth = async (): Promise<HealthResponse> => {
  const { data } = await api.get<HealthResponse>("/");
  return data;
};

// Get courses with pagination
export const getCourses = async (page = 1, limit = 10) => {
  const { data } = await api.get<{ success: boolean; courses: CourseDTO[]; total: number }>(
    `/api/courses?page=${page}&limit=${limit}`
  );
  return data;
};

export const getArchivedCourses = async (page = 1, limit = 10) => {
  const { data } = await api.get<{ success: boolean; courses: CourseDTO[]; total: number }>(
    `/api/courses?archived=true&page=${page}&limit=${limit}`
  );
  return data;
};

// Fetch ALL courses (iterates through pagination)
export const getAllCourses = async () => {
  let page = 1;
  const limit = 50; // batch size per request
  const allCourses: CourseDTO[] = [];
  let total = 0;
  let success = true;
  try {
    while (true) {
      const data = await getCourses(page, limit);
      if (!data.success) {
        success = false;
        break;
      }
      allCourses.push(...data.courses);
      total = data.total;
      if (allCourses.length >= total) break;
      page++;
    }
  } catch {
    success = false;
  }
  return { success, courses: allCourses, total };
};

// Delete course
export const deleteCourse = async (id: string) => {
  const { data } = await api.delete<{ success: boolean }>(`/api/courses/${id}`);
  return data;
};

// Edit course
export const editCourse = async (id: string, course: CourseDTO) => {
  const { data } = await api.put<{ success: boolean; course: CourseDTO }>(`/api/courses/${id}`, course);
  return data;
};

// Archive course
export const archiveCourse = async (id: string) => {
  const { data } = await api.patch<{ success: boolean; course: CourseDTO }>(`/api/courses/${id}/archive`, {});
  return data;
};

export const restoreCourse = async (id: string) => {
  const { data } = await api.patch<{ success: boolean; course: CourseDTO }>(`/api/courses/${id}/restore`, {});
  return data;
};

export const addCourse = async (course: CourseDTO) => {
  const { data } = await api.post<{ success: boolean; course: CourseDTO }>("/api/courses", course);
  return data;
};

// Auth
export async function login(emailOrPhone: string, password: string) {
  const response = await api.post("/auth/login", { emailOrPhone, password });
  return response.data;
}

export async function requestOtp(phone: string) {
  const response = await api.post("/auth/request-otp", { phone });
  return response.data;
}

export async function verifyOtp(phone: string, otp: string) {
  const response = await api.post("/auth/verify-otp", { phone, otp });
  return response.data;
}

export type MeResponse = {
  success: boolean;
  user: { id: string; name?: string; email: string; role: 'SuperAdmin'|'Admin'|'Teacher'|'Student'|'Parent'; linkedStudents?: string[] };
};

export async function me() {
  const response = await api.get<MeResponse>("/api/me");
  return response.data;
}

export async function logout() {
  const response = await api.post("/auth/logout", {});
  return response.data;
}

export async function refresh() {
  const response = await api.post("/auth/refresh", {});
  return response.data;
}

// Feature flags
export async function getFeatures() {
  const { data } = await api.get<{ success: boolean; features: Record<string, boolean> }>("/api/features");
  return data.features;
}

// User management APIs removed per user request

// Sessions (current user)
export async function getSessions() {
  const { data } = await api.get<{ success: boolean; sessions: Array<{ _id: string; device?: string; createdAt: string; lastUsedAt?: string; expiresAt: string }> }>(`/auth/sessions`);
  return data.sessions;
}

export async function revokeSession(id: string) {
  const { data } = await api.delete<{ success: boolean }>(`/auth/sessions/${id}`);
  return data;
}

// Registration is disabled; accounts are created via admin modals

// Batches API functions
export const getBatches = async (page = 1, limit = 10) => {
  const { data } = await api.get<{ success: boolean; batches: BatchDTO[]; total: number }>(
    `/api/batches?page=${page}&limit=${limit}`
  );
  return data;
};

// Batches grouped by course
export type BatchesByCourseItem = { _id: string; batches: string[]; count: number };
export const getBatchesByCourse = async () => {
  const { data } = await api.get<{ success: boolean; byCourse: BatchesByCourseItem[] }>(`/api/batches/by-course`);
  return data;
};

// Lightweight client-side event hub to notify others about batch changes
type Listener = () => void;
const batchEventListeners = new Set<Listener>();
export const onBatchesChanged = (cb: Listener) => {
  batchEventListeners.add(cb);
  return () => batchEventListeners.delete(cb);
};
export const emitBatchesChanged = () => {
  batchEventListeners.forEach((cb) => {
    try {
      cb();
    } catch {
      /* ignore */
    }
  });
};

// Get archived batches (for admin views)
export const getArchivedBatches = async (page = 1, limit = 10) => {
  const { data } = await api.get<{ success: boolean; batches: BatchDTO[]; total: number }>(
    `/api/batches?archived=true&page=${page}&limit=${limit}`
  );
  return data;
};

export const addBatch = async (batch: BatchDTO) => {
  const { data } = await api.post<{ success: boolean; batch: BatchDTO }>("/api/batches", batch);
  if (data?.success) emitBatchesChanged();
  return data;
};

export const editBatch = async (id: string, batch: BatchDTO) => {
  const { data } = await api.put<{ success: boolean; batch: BatchDTO }>(`/api/batches/${id}`, batch);
  if (data?.success) emitBatchesChanged();
  return data;
};

export const deleteBatch = async (id: string) => {
  const { data } = await api.delete<{ success: boolean }>(`/api/batches/${id}`);
  return data;
};

export const archiveBatch = async (id: string) => {
  const { data } = await api.patch<{ success: boolean; batch: BatchDTO }>(`/api/batches/${id}/archive`, {});
  if (data?.success) emitBatchesChanged();
  return data;
};

export const restoreBatch = async (id: string) => {
  const { data } = await api.patch<{ success: boolean; batch: BatchDTO }>(`/api/batches/${id}/restore`, {});
  if (data?.success) emitBatchesChanged();
  return data;
};

// Student API functions
export async function createStudent(studentData: {
  fname: string;
  lname: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  aadhar?: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  course_id?: string;
  batch_id?: string;
  fee_status?: string;
}) {
  const response = await api.post("/api/students", studentData);
  return response.data;
}

export async function getAllStudents() {
  const response = await api.get("/api/students");
  return response.data;
}

export async function getStudentById(id: string) {
  const response = await api.get(`/api/students/${id}`);
  return response.data;
}

export async function updateStudent(id: string, studentData: Record<string, unknown>) {
  const response = await api.put(`/api/students/${id}`, studentData);
  return response.data;
}

export async function deleteStudent(id: string) {
  const response = await api.delete(`/api/students/${id}`);
  return response.data;
}

// Get all batches (you'll need to create this endpoint)
export async function getAllBatches() {
  const response = await api.get("/api/batches");
  return response.data;
}

// Get course by ID
export async function getCourseById(id: string) {
  const response = await api.get(`/api/courses/${id}`);
  return response.data;
}


// Teacher API functions
export async function getAllTeachers() {
  const response = await api.get('/api/teachers');
  return response.data;
}

export async function getTeacherById(id: string) {
  const response = await api.get(`/api/teachers/${id}`);
  return response.data;
}

export async function createTeacher(teacherData: Record<string, unknown>) {
  const response = await api.post('/api/teachers', teacherData);
  return response.data;
}

export async function updateTeacher(id: string, teacherData: Record<string, unknown>) {
  const response = await api.put(`/api/teachers/${id}`, teacherData);
  return response.data;
}

export async function deleteTeacher(id: string) {
  const response = await api.delete(`/api/teachers/${id}`);
  return response.data;
}


// Parent API functions
export async function getAllParents() {
  const response = await api.get('/api/parents');
  return response.data;
}

export async function getParentsByStudent(studentId: string) {
  const response = await api.get(`/api/parents/student/${studentId}`);
  return response.data;
}

export async function getParentById(id: string) {
  const response = await api.get(`/api/parents/${id}`);
  return response.data;
}

export async function createParent(parentData: Record<string, unknown>) {
  const response = await api.post('/api/parents', parentData);
  return response.data;
}

export async function updateParent(id: string, parentData: Record<string, unknown>) {
  const response = await api.put(`/api/parents/${id}`, parentData);
  return response.data;
}

export async function deleteParent(id: string) {
  const response = await api.delete(`/api/parents/${id}`);
  return response.data;
}

// Lecture API functions
export const getLectures = async (page = 1, limit = 10, filters?: {
  course_id?: string;
  batch_id?: string;
  teacher_id?: string;
  date?: string;
}) => {
  let url = `/api/lectures?page=${page}&limit=${limit}`;
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) url += `&${key}=${encodeURIComponent(value)}`;
    });
  }
  console.log("🔍 [API] getLectures URL:", url);
  const { data } = await api.get<{ 
    success: boolean; 
    lectures: LectureDTO[]; 
    total: number; 
    page: number; 
    totalPages: number;
  }>(url);
  console.log("🔍 [API] getLectures raw response:", data);
  return data;
};

export const getAllLectures = async () => {
  console.log("🔍 [API] getAllLectures called");
  let page = 1;
  const limit = 50;
  const allLectures: LectureDTO[] = [];
  let total = 0;
  let success = true;
  try {
    while (true) {
      console.log(`🔍 [API] Fetching page ${page} with limit ${limit}`);
      const data = await getLectures(page, limit);
      console.log("🔍 [API] getLectures response:", data);
      if (!data.success) {
        success = false;
        break;
      }
      allLectures.push(...data.lectures);
      total = data.total;
      console.log(`🔍 [API] Page ${page}: got ${data.lectures.length} lectures, total so far: ${allLectures.length}/${total}`);
      if (allLectures.length >= total) break;
      page++;
    }
  } catch (error) {
    console.error("🔍 [API] Error in getAllLectures:", error);
    success = false;
  }
  console.log("🔍 [API] getAllLectures final result:", { success, lectureCount: allLectures.length, total });
  return { success, lectures: allLectures, total };
};

export const getLectureById = async (id: string) => {
  const { data } = await api.get<{ success: boolean; lecture: LectureDTO }>(`/api/lectures/${id}`);
  return data;
};

export const createLecture = async (lectureData: Omit<LectureDTO, '_id' | 'metadata'>) => {
  const { data } = await api.post<{ success: boolean; lecture: LectureDTO }>('/api/lectures', lectureData);
  return data;
};

export const updateLecture = async (id: string, lectureData: Partial<LectureDTO>) => {
  const { data } = await api.put<{ success: boolean; lecture: LectureDTO }>(`/api/lectures/${id}`, lectureData);
  return data;
};

export const deleteLecture = async (id: string) => {
  const { data } = await api.delete<{ success: boolean; message: string }>(`/api/lectures/${id}`);
  return data;
};

export const updateLectureAttendance = async (id: string, attendance_count: number) => {
  const { data } = await api.patch<{ success: boolean; lecture: LectureDTO }>(`/api/lectures/${id}/attendance`, {
    attendance_count
  });
  return data;
};

// Archive lecture
export const archiveLecture = async (id: string) => {
  const { data } = await api.patch<{ success: boolean; lecture: LectureDTO }>(`/api/lectures/${id}/archive`, {});
  return data;
};

// Restore lecture
export const restoreLecture = async (id: string) => {
  const { data } = await api.patch<{ success: boolean; lecture: LectureDTO }>(`/api/lectures/${id}/restore`, {});
  return data;
};

// Get archived lectures
export const getArchivedLectures = async (page = 1, limit = 10) => {
  const { data } = await api.get<{ 
    success: boolean; 
    lectures: LectureDTO[]; 
    total: number; 
    page: number; 
    totalPages: number;
  }>(`/api/lectures/archived?page=${page}&limit=${limit}`);
  return data;
};

export const getTopicsByCourseAndSubject = async (courseId: string, subject: string) => {
  const { data } = await api.get<{ success: boolean; topics: string[] }>(`/api/lectures/topics?course_id=${courseId}&subject=${subject}`);
  return data;
};

export const getSubtopicsByTopic = async (courseId: string, subject: string, topic: string, batchId?: string) => {
  try {
    const params = new URLSearchParams({
      course_id: courseId,
      subject: subject,
      topic: topic,
    });
    if (batchId) params.append('batch_id', batchId);

    const { data } = await api.get<{ success: boolean; subtopics: string[] }>(`/api/lectures/subtopics?${params}`);
    return data;
  } catch {
    return { success: false, subtopics: [] };
  }
};

// Get unique subjects for a given course by fetching topics and extracting subjects
export const getSubjectsByCourse = async (courseId: string) => {
  try {
    const { data } = await api.get<{ success: boolean; subjects: string[] }>(`/api/lectures/subjects/${courseId}`);
    return data;
  } catch {
    return { success: false, subjects: [] };
  }
};



// ===== PAYMENT API FUNCTIONS =====

export async function getAllPayments(filters?: {
  course?: string;
  batch?: string;
  student?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.course) params.append('course', filters.course);
  if (filters?.batch) params.append('batch', filters.batch);
  if (filters?.student) params.append('student', filters.student);
  if (filters?.status) params.append('status', filters.status);
  
  const response = await api.get(`/api/payments?${params.toString()}`);
  return response.data;
}

export async function getPaymentStats() {
  const response = await api.get('/api/payments/stats');
  return response.data;
}

export async function createPayment(data: Record<string, unknown>) {
  const response = await api.post('/api/payments', data);
  return response.data;
}

export async function updatePayment(id: string, data: Record<string, unknown>) {
  const response = await api.put(`/api/payments/${id}`, data);
  return response.data;
}

export async function deletePayment(id: string) {
  const response = await api.delete(`/api/payments/${id}`);
  return response.data;
}

// ===== EXPENSE API FUNCTIONS =====

export async function getAllExpenses(filters?: {
  category?: string;
  status?: string;
  from?: string; // YYYY-MM-DD (optional; server may ignore if unsupported)
  to?: string;   // YYYY-MM-DD (optional; server may ignore if unsupported)
  q?: string;    // search query (optional; server may ignore if unsupported)
}) {
  const params = new URLSearchParams();
  if (filters?.category) params.append('category', filters.category);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.from) params.append('from', filters.from);
  if (filters?.to) params.append('to', filters.to);
  if (filters?.q) params.append('q', filters.q);
  
  const response = await api.get(`/api/expenses?${params.toString()}`);
  return response.data;
}

export async function getExpenseStats(params?: { from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (params?.from) qs.append('from', params.from);
  if (params?.to) qs.append('to', params.to);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const response = await api.get(`/api/expenses/stats${suffix}`);
  return response.data;
}

export async function getExpenseMeta() {
  const response = await api.get('/api/expenses/meta');
  return response.data as { success: boolean; categories: Array<{ key: string; label: string }>; statuses: string[]; payment_modes: string[] };
}

export async function createExpense(data: FormData | Record<string, unknown>) {
  // Supports FormData for file uploads
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  const headers = isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined;
  const response = await api.post('/api/expenses', data, { headers });
  return response.data;
}

export async function updateExpense(id: string, data: FormData | Record<string, unknown>) {
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  const headers = isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined;
  const response = await api.put(`/api/expenses/${id}`, data, { headers });
  return response.data;
}

export async function deleteExpense(id: string) {
  const response = await api.delete(`/api/expenses/${id}`);
  return response.data;
}

// ===== SALARY API FUNCTIONS =====

export async function getAllSalaries(filters?: {
  month?: number;
  year?: number;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.month) params.append('month', filters.month.toString());
  if (filters?.year) params.append('year', filters.year.toString());
  if (filters?.status) params.append('status', filters.status);
  
  const response = await api.get(`/api/salaries?${params.toString()}`);
  return response.data;
}

export async function getSalaryStats() {
  const response = await api.get('/api/salaries/stats');
  return response.data;
}

export async function createSalary(data: Record<string, unknown>) {
  const response = await api.post('/api/salaries', data);
  return response.data;
}

export async function updateSalary(id: string, data: Record<string, unknown>) {
  const response = await api.put(`/api/salaries/${id}`, data);
  return response.data;
}

export async function deleteSalary(id: string) {
  const response = await api.delete(`/api/salaries/${id}`);
  return response.data;
}






export interface FeePlanDTO {
  _id?: string;
  plan_code?: number;
  batch_id: string | { _id: string; name: string; course_id?: string | { _id: string; name: string } };
  total_amount: number;
  num_installments: number;
  created_at?: string | Date;
  discount_types?: Array<{ code: string; name: string; discount_percent: number }>;
}

export const getFeePlans = async () => {
  const { data } = await api.get<{ success: boolean; plans: FeePlanDTO[] }>(`/api/fee-plans`);
  return data;
};

export const createFeePlan = async (payload: Omit<FeePlanDTO, '_id' | 'created_at' | 'plan_code'> & { installments?: Array<{ installment_no: number; due_date: string | Date; amount: number }>}) => {
  const { data } = await api.post<{ success: boolean; plan: FeePlanDTO }>(`/api/fee-plans`, payload);
  return data;
};

export const updateFeePlan = async (id: string, payload: Partial<FeePlanDTO>) => {
  const { data } = await api.put<{ success: boolean; plan: FeePlanDTO }>(`/api/fee-plans/${id}`, payload);
  return data;
};

export const deleteFeePlan = async (id: string) => {
  const { data } = await api.delete<{ success: boolean; message: string }>(`/api/fee-plans/${id}`);
  return data;
};










// Add this to lib/api.ts
export async function getStudentPayments(filters?: {
  course?: string;
  batch?: string;
  student?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  
  if (filters?.course) params.append('course', filters.course);
  if (filters?.batch) params.append('batch', filters.batch);
  if (filters?.student) params.append('student', filters.student);
  if (filters?.status) params.append('status', filters.status);
  
  const response = await api.get(`/api/student-payments?${params.toString()}`);
  return response.data;
}

// Types for record payment API
export interface FeePaymentDTO {
  _id?: string;
  student_id: string;
  installment_id: string;
  paid_amount: number;
  paid_date: string | Date;
  payment_mode: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'cheque';
  status: 'paid' | 'partial' | 'pending';
  receipt_no: string;
  transaction_id?: string;
  remarks?: string;
  created_at?: string | Date;
}

export interface UpdatedInstallmentDTO {
  installment_id: string;
  installment_no: number;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string | Date;
  status: 'paid' | 'partial' | 'pending' | 'overdue';
  last_paid_date?: string | Date;
  last_receipt_no?: string;
}

export interface RecordPaymentResponse {
  success: boolean;
  message: string;
  payment: FeePaymentDTO;
  updated_installment: UpdatedInstallmentDTO;
}

export async function recordPayment(payload: {
  student_id: string;
  fee_plan_id: string;
  installment_no: number;
  paid_amount: number;
  paid_date?: string | Date;
  payment_mode: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'cheque';
  transaction_id?: string;
  receipt_no?: string;
  remarks?: string;
}) {
  const { data } = await api.post<RecordPaymentResponse>(
    '/api/record-payment',
    payload
  );
  return data;
}






// ===== EXAMS & RESULTS =====

export interface ExamDTO {
  _id?: string;
  batch_id: string | { _id: string; name: string; course_id?: string };
  exam_type: 'on_theory' | 'off_theory' | 'on_mcq' | 'off_mcq';
  subject: string;
  topic: string;
  date: Date | string;
  duration?: string;
  total_marks: number;
  exam_link?: string; // Add this field
  status?: 'scheduled' | 'completed' | 'cancelled';
  created_at?: Date | string;
}

export interface ResultDTO {
  _id?: string;
  exam_id: string | { _id: string; subject: string; topic: string; total_marks: number };
  student_id: string | { _id: string; fname: string; lname: string };
  marks_obtained: number;
  grade?: string;
  remarks?: string;
  created_at?: Date | string;
}

// Exams
export const getExams = async (page = 1, limit = 10, filters?: {
  batch_id?: string;
  status?: string;
}) => {
  let url = `/api/exams?page=${page}&limit=${limit}`;
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) url += `&${key}=${encodeURIComponent(value)}`;
    });
  }
  const { data } = await api.get<{
    success: boolean;
    exams: ExamDTO[];
    total: number;
    page: number;
    totalPages: number;
  }>(url);
  return data;
};

export const getExamById = async (id: string) => {
  const { data } = await api.get<{ success: boolean; exam: ExamDTO }>(`/api/exams/${id}`);
  return data;
};

export const createExam = async (examData: Omit<ExamDTO, '_id'>) => {
  const { data } = await api.post<{ success: boolean; exam: ExamDTO }>('/api/exams', examData);
  return data;
};

export const updateExam = async (id: string, examData: Partial<ExamDTO>) => {
  const { data } = await api.put<{ success: boolean; exam: ExamDTO }>(`/api/exams/${id}`, examData);
  return data;
};

export const deleteExam = async (id: string) => {
  const { data } = await api.delete<{ success: boolean; message: string }>(`/api/exams/${id}`);
  return data;
};

export const completeExam = async (id: string) => {
  const { data } = await api.patch<{ success: boolean; exam: ExamDTO }>(`/api/exams/${id}/complete`, {});
  return data;
};

// Results
export const getResults = async (page = 1, limit = 50, filters?: {
  exam_id?: string;
  student_id?: string;
  batch_id?: string;
}) => {
  let url = `/api/results?page=${page}&limit=${limit}`;
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) url += `&${key}=${encodeURIComponent(value)}`;
    });
  }
  const { data } = await api.get<{
    success: boolean;
    results: ResultDTO[];
    total: number;
    page: number;
    totalPages: number;
  }>(url);
  return data;
};

export const getResultsByExam = async (examId: string) => {
  const { data } = await api.get<{
    success: boolean;
    exam: ExamDTO;
    students: Array<{
      student_id: string;
      student_name: string;
      marks_obtained: number | null;
      grade: string | null;
      result_id: string | null;
    }>;
    total_students: number;
  }>(`/api/results/exam/${examId}`);
  return data;
};

export const saveResult = async (resultData: {
  exam_id: string;
  student_id: string;
  marks_obtained: number;
  grade?: string;
  remarks?: string;
}) => {
  const { data } = await api.post<{ success: boolean; result: ResultDTO }>('/api/results', resultData);
  return data;
};

export const bulkSaveResults = async (exam_id: string, results: Array<{
  student_id: string;
  marks_obtained: number;
  grade?: string;
}>) => {
  const { data } = await api.post<{
    success: boolean;
    message: string;
    successful: number;
    failed: Array<Record<string, unknown>>;
  }>('/api/results/bulk', { exam_id, results });
  return data;
};

export const downloadResultsTemplate = async (examId: string) => {
  const response = await api.get(`/api/results/template/${examId}`, {
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `results_${examId}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const uploadResultsExcel = async (examId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('exam_id', examId);
  
  const { data } = await api.post<{
    success: boolean;
    message: string;
    successful: number;
    failed: Array<Record<string, unknown>>;
  }>('/api/results/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};




// Exam Bulk Upload
export const downloadExamTemplate = async () => {
  const response = await api.get('/api/exams/template', {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'exam_template.xlsx');
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const uploadExamsExcel = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post<{
    success: boolean;
    message: string;
      results: {
        success: unknown[];
        failed: unknown[];
        total: number;
      };
  }>('/api/exams/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};




// ===== ENQUIRY MANAGEMENT =====

export interface EnquiryDTO {
  _id: string;
  srNo?: number;
  name?: string; // For backward compatibility
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone: string;
  phone2?: string;
  email?: string;
  dateOfBirth?: string;
  source: 'Website' | 'Facebook' | 'Google Ads' | 'Referral' | 'Walk-in' | 'Phone Call';
  interest: 'Full Stack' | 'Data Science' | 'Digital Marketing' | 'UI/UX' | 'Python' | 'Java';
  location?: string;
  address?: string;
  building?: string;
  flatRoom?: string;
  landmark?: string;
  city?: string;
  state?: string;
  courseInterested?: string;
  gradeClass?: string;
  academicYear?: string;
  schoolName?: string;
  status: 'raw' | 'cold_lead' | 'warm_lead' | 'hot_lead' | 'contacted' | 'interested' | 'not_interested' | 'enrolled' | 'lost';
  contactAttempts?: ContactAttempt[];
  leadScore?: number;
  convertedDate?: Date;
  conversionValue?: number;
  lostReason?: string;
  assignedTo?: { _id: string; name: string; email: string };
  createdBy?: { _id: string; name: string; email: string };
  lastContactedAt?: Date;
  nextFollowUpDate?: Date;
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactAttempt {
  date: Date;
  method: 'phone' | 'email' | 'whatsapp' | 'in_person';
  response: 'answered' | 'no_answer' | 'busy' | 'invalid_number';
  notes?: string;
  nextFollowUp?: Date;
}

export interface EnquiryAnalytics {
  total: number;
  conversionRate: number;
  converted: number;
  byStatus: { _id: string; count: number }[];
  bySource: { _id: string; count: number }[];
  byInterest: { _id: string; count: number }[];
  monthlyTrends: { _id: { year: number; month: number }; count: number }[];
}

// Get all enquiries with filtering
export const getEnquiries = async (params?: {
  status?: string;
  source?: string;
  interest?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data: EnquiryDTO[];
  pagination: {
    current: number;
    total: number;
    count: number;
    totalRecords: number;
  };
}> => {
  const response = await api.get("/api/enquiries", { params });
  return response.data;
};

// Get enquiries by status
export const getEnquiriesByStatus = async (
  status: string,
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    source?: string;
    interest?: string;
  }
): Promise<{
  success: boolean;
  data: EnquiryDTO[];
  pagination: {
    current: number;
    total: number;
    count: number;
    totalRecords: number;
  };
}> => {
  console.log(`🔧 Making API call to /api/enquiries/${status}`, params);
  const response = await api.get(`/api/enquiries/${status}`, { params });
  console.log(`🔧 API response for ${status}:`, response.data);
  return response.data;
};

// Create new enquiry
export const createEnquiry = async (enquiryData: {
  name: string;
  phone: string;
  email?: string;
  source: string;
  interest: string;
  location?: string;
  notes?: string;
}): Promise<{ success: boolean; message: string; data: EnquiryDTO }> => {
  const response = await api.post("/api/enquiries", enquiryData);
  return response.data;
};

// Update enquiry
export const updateEnquiry = async (
  id: string,
  updates: Partial<EnquiryDTO>
): Promise<{ success: boolean; message: string; data: EnquiryDTO }> => {
  const response = await api.put(`/api/enquiries/${id}`, updates);
  return response.data;
};

// Delete enquiry
export const deleteEnquiry = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/api/enquiries/${id}`);
  return response.data;
};

// Update enquiry status
export const updateEnquiryStatus = async (
  id: string,
  status: string,
  notes?: string,
  assignedTo?: string
): Promise<{ success: boolean; message: string; data: EnquiryDTO }> => {
  const response = await api.patch(`/api/enquiries/${id}/status`, {
    status,
    notes,
    assignedTo,
  });
  return response.data;
};

// Add contact attempt
export const addContactAttempt = async (
  id: string,
  contactData: {
    method: 'phone' | 'email' | 'whatsapp' | 'in_person';
    response: 'answered' | 'no_answer' | 'busy' | 'invalid_number';
    notes?: string;
    nextFollowUp?: Date;
  }
): Promise<{ success: boolean; message: string; data: EnquiryDTO }> => {
  const response = await api.post(`/api/enquiries/${id}/contact`, contactData);
  return response.data;
};

// Bulk upload enquiries
export const uploadEnquiriesExcel = async (file: File): Promise<{
  success: boolean;
  message: string;
  results: {
    success: EnquiryDTO[];
    failed: Record<string, unknown>[];
    total: number;
  };
}> => {
  // Create a new FormData instance
  const formData = new FormData();
  
  // Append the file directly - no cloning needed
  formData.append("file", file);
  
  // Add timeout and retry logic for network issues
  const response = await api.post("/api/enquiries/bulk-upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 60000, // 60 second timeout for file uploads
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  return response.data;
};

// Download enquiry template
export const downloadEnquiryTemplate = async (): Promise<void> => {
  const response = await api.get("/api/enquiries/template", {
    responseType: "blob",
  });

  const blob = new Blob([response.data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "enquiry_template.xlsx";

  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Get enquiry analytics
export const getEnquiryAnalytics = async (): Promise<{
  success: boolean;
  data: EnquiryAnalytics;
}> => {
  const response = await api.get("/api/enquiries/analytics");
  return response.data;
};

// Helper functions for specific statuses
export const getRawEnquiries = async (params?: Record<string, unknown>) => {
  const response = await getEnquiriesByStatus('raw', params);
  return response.data;  // This is already the data array from the API response
};

export const getColdLeads = async (params?: Record<string, unknown>) => {
  const response = await getEnquiriesByStatus('cold_lead', params);
  return response.data;
};

export const getWarmLeads = async (params?: Record<string, unknown>) => {
  const response = await getEnquiriesByStatus('warm_lead', params);
  return response.data;
};

export const getHotLeads = async (params?: Record<string, unknown>) => {
  const response = await getEnquiriesByStatus('hot_lead', params);
  return response.data;
};

export const getContactedEnquiries = async (params?: Record<string, unknown>) => {
  const response = await getEnquiriesByStatus('contacted', params);
  return response.data;
};

export const getInterestedEnquiries = async (params?: Record<string, unknown>) => {
  const response = await getEnquiriesByStatus('interested', params);
  return response.data;
};

export const getEnrolledEnquiries = async (params?: Record<string, unknown>) => {
  const response = await getEnquiriesByStatus('enrolled', params);
  return response.data;
};

export const getLostEnquiries = async (params?: Record<string, unknown>) => {
  const response = await getEnquiriesByStatus('lost', params);
  return response.data;
};

// Get count for each status
export const getEnquiryCounts = async (): Promise<{
  success: boolean;
  data: {
    raw: number;
    cold_lead: number;
    warm_lead: number;
    hot_lead: number;
    contacted: number;
    interested: number;
    not_interested: number;
    enrolled: number;
    lost: number;
  };
}> => {
  try {
    console.log("🔍 Fetching enquiry counts...");
    const response = await api.get("/api/enquiries/counts");
    console.log("📊 Counts API response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Counts API error:", error);
    // Return default structure if API fails
    return {
      success: false,
      data: {
        raw: 0,
        cold_lead: 0,
        warm_lead: 0,
        hot_lead: 0,
        contacted: 0,
        interested: 0,
        not_interested: 0,
        enrolled: 0,
        lost: 0
      }
    };
  }
};

// ===== ATTENDANCE =====

export interface AttendanceDTO {
  _id?: string;
  userId: string;
  userType: 'Student' | 'Teacher';
  date: string;
  timestamp: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  source: 'biometric' | 'manual' | 'bulk_upload';
  deviceId: string;
  verifyMode?: string;
  notes?: string;
  batchId?: string;
}

export const getAttendance = async (filters: {
  page?: number;
  limit?: number;
  batchId?: string;
  studentId?: string;
  userId?: string;
  userType?: string;
  status?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
} = {}) => {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.batchId) params.append('batchId', filters.batchId);
  if (filters.studentId) params.append('studentId', filters.studentId);
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.userType) params.append('userType', filters.userType);
  if (filters.status) params.append('status', filters.status);
  if (filters.source) params.append('source', filters.source);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  const { data } = await api.get(`/api/attendance?${params}`);
  return data;
};

export const getAttendanceStats = async (filters: {
  userType?: string;
  startDate?: string;
  endDate?: string;
} = {}) => {
  const params = new URLSearchParams();
  if (filters.userType) params.append('userType', filters.userType);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  const { data } = await api.get(`/api/attendance/stats?${params}`);
  return data;
};

export const markAttendance = async (attendanceData: {
  userId: string;
  userType: 'Student' | 'Teacher';
  status: 'present' | 'late' | 'absent' | 'excused';
  date: string;
  notes?: string;
  source?: string;
}) => {
  const { data } = await api.post('/api/attendance/mark', attendanceData);
  return data;
};

export const exportAttendance = async (filters: {
  status?: string;
  userType?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
} = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.userType) params.append('userType', filters.userType);
  if (filters.source) params.append('source', filters.source);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  return api.get(`/api/attendance/export?${params}`, {
    responseType: 'blob'
  });
};

export const triggerDeviceSync = async () => {
  const { data } = await api.post('/api/attendance/sync');
  return data;
};

export const updateAttendance = async (id: string, updateData: {
  status: 'present' | 'late' | 'absent' | 'excused';
  notes?: string;
}) => {
  const { data } = await api.put(`/api/attendance/${id}`, updateData);
  return data;
};

export const deleteAttendance = async (id: string) => {
  const { data } = await api.delete(`/api/attendance/${id}`);
  return data;
};

export const getUserAttendanceStats = async (userId: string, userType?: 'Student' | 'Teacher') => {
  const params = userType ? { userType } : {};
  const { data } = await api.get(`/api/attendance/user/${userId}/stats`, { params });
  return data;
};

// ===== Dashboard APIs =====

export const getStudentDashboard = async () => {
  const { data } = await api.get('/api/dashboard/student');
  return data;
};

export const getTeacherDashboard = async () => {
  const { data } = await api.get('/api/dashboard/teacher');
  return data;
};

export const getParentDashboard = async () => {
  const { data } = await api.get('/api/dashboard/parent');
  return data;
};

export default api;
