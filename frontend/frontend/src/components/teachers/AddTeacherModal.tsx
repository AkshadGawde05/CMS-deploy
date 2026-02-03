'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { X, User, Upload, GraduationCap, Briefcase, ChevronDown } from 'lucide-react';
import { createTeacher, updateTeacher, getAllCourses, getAllBatches } from '@/lib/api';
import type { CourseDTO, BatchDTO } from '@/lib/api';
import axios from 'axios';

type TeacherLike = {
  _id: string;
  user_id?: { fname?: string; lname?: string; email?: string; phone?: string };
  dob?: string;
  address?: { street?: string };
  p_address?: { street?: string };
  subjects?: string[];
  emp_no?: string;
  aadhar?: string;
  pan_number?: string;
  bank_account?: string;
  bank_ifsc?: string;
  highest_degree?: string;
  salary?: number;
};

interface AddTeacherModalProps {
  teacher?: TeacherLike;
  onClose: () => void;
  onSuccess: () => void;
}

// Using CourseDTO and BatchDTO types from api.ts

export default function AddTeacherModal({ teacher, onClose, onSuccess }: AddTeacherModalProps) {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<CourseDTO[]>([]);
  const [batches, setBatches] = useState<BatchDTO[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const subjectDropdownRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    fname: '',
    lname: '',
    email: '',
    phone: '',
    dob: '',
    address: '',
    p_address: '',
    subjects: [] as string[],
    course_id: '',
    batch_id: '',
    emp_no: '',
    aadhar: '',
    pan_number: '',
    bank_account: '',
    bank_ifsc: '',
    highest_degree: '',
    salary: ''
  });

  const [sameAsAddress, setSameAsAddress] = useState(false);

  useEffect(() => {
    fetchCoursesAndBatches();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (teacher) {
      setFormData({
        fname: teacher.user_id?.fname || '',
        lname: teacher.user_id?.lname || '',
        email: teacher.user_id?.email || '',
        phone: teacher.user_id?.phone || '',
        dob: teacher.dob?.split('T')[0] || '',
        address: teacher.address?.street || '',
        p_address: teacher.p_address?.street || '',
        subjects: teacher.subjects || [],
        course_id: '',
        batch_id: '',
        emp_no: teacher.emp_no || '',
        aadhar: teacher.aadhar || '',
        pan_number: teacher.pan_number || '',
        bank_account: teacher.bank_account || '',
        bank_ifsc: teacher.bank_ifsc || '',
        highest_degree: teacher.highest_degree || '',
        salary: teacher.salary?.toString() || ''
      });
    }
  }, [teacher]);

  const calculateCompletion = useCallback(() => {
    const requiredFields = ['fname', 'lname', 'email', 'phone'] as const;
    const optionalFields = ['dob', 'address', 'aadhar', 'pan_number', 'bank_account', 'highest_degree', 'salary'] as const;
    const allFields = [...requiredFields, ...optionalFields];
    const filledFields = allFields.filter((field) => (formData as Record<string, unknown>)[field]).length;
    const subjectsCount = formData.subjects.length > 0 ? 1 : 0;
    const percentage = Math.round(((filledFields + subjectsCount) / (allFields.length + 1)) * 100);
    setCompletionPercentage(percentage);
  }, [formData]);

  useEffect(() => {
    calculateCompletion();
  }, [calculateCompletion]);

  useEffect(() => {
    if (sameAsAddress) {
      setFormData(prev => ({ ...prev, p_address: prev.address }));
    }
  }, [sameAsAddress, formData.address]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target as Node)) {
        setIsSubjectDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCoursesAndBatches = async () => {
    try {
      const [coursesRes, batchesRes] = await Promise.all([
        getAllCourses(),
        getAllBatches()
      ]);
      setCourses(coursesRes.courses || []);
      setBatches(batchesRes.batches || []);
    } catch (err) {
      console.error('Failed to fetch courses/batches:', err);
    }
  };

  const fetchSubjects = async () => {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await axios.get(`${baseURL}/api/syllabus`, {
        withCredentials: true
      });
      
      if (response.data.success && response.data.data) {
        // Extract unique subjects from all syllabus items
        const subjectsSet = new Set<string>();
        response.data.data.forEach((syllabus: { items: { subject: string }[] }) => {
          if (syllabus.items && syllabus.items.length > 0) {
            syllabus.items.forEach((item: { subject: string }) => {
              if (item.subject) {
                subjectsSet.add(item.subject);
              }
            });
          }
        });
        setAvailableSubjects(Array.from(subjectsSet).sort());
      }
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
      // Fallback to empty array
      setAvailableSubjects([]);
    }
  };

  // removed duplicate calculateCompletion

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (formData.subjects.length === 0) {
    alert('Please select at least one subject');
    return;
  }
  
  setLoading(true);

  try {
    const payload = {
      fname: formData.fname,
      lname: formData.lname,
      email: formData.email,
      phone: formData.phone,
      subjects: formData.subjects,
      emp_no: formData.emp_no,
      aadhar: formData.aadhar.trim() || undefined,
      address: { street: formData.address },
      p_address: { street: formData.p_address },
      salary: parseFloat(formData.salary) || 0,
      pan_number: formData.pan_number.trim() || undefined,
      bank_account: formData.bank_account.trim() || undefined,
      bank_ifsc: formData.bank_ifsc.trim() || undefined,
      highest_degree: formData.highest_degree.trim() || undefined,
      batch_id: formData.batch_id || null
    };

    if (teacher) {
      await updateTeacher(teacher._id, payload);
    } else {
      const res = await createTeacher(payload);
      if (res?.success) {
        const cred = res?.credentials;
        const msg = cred?.tempPassword
          ? `Teacher created. Temporary credentials generated. User login will be sent by email.\n\nEmail/Phone: ${cred.email || cred.phone}\nTemp Password: ${cred.tempPassword}`
          : 'Teacher profile created. User login will be sent by email.';
        alert(msg);
      }
    }
    onSuccess();
  } catch (err) {
    const anyErr = err as { response?: { data?: { message?: string } } };
    alert(anyErr?.response?.data?.message || 'Operation failed');
  } finally {
    setLoading(false);
  }
};

  const handleSaveAsDraft = () => {
    // Save to localStorage or backend as draft
    localStorage.setItem('teacher_draft', JSON.stringify(formData));
    alert('Saved as draft!');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-black">
                {teacher ? 'Edit Teacher' : 'Add New Teacher'}
              </h2>
              <p className="text-xs text-black">Complete all sections to add teacher</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-black">Profile Completion</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${completionPercentage}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-green-600">{completionPercentage}%</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-black hover:text-black transition"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-semibold text-black">Basic Information</h3>
            </div>

            <div className="grid grid-cols-12 gap-4">
              {/* Left: Form Fields */}
              <div className="col-span-9 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1.5">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="fname"
                      value={formData.fname}
                      onChange={handleInputChange}
                      placeholder="Enter first name"
                      required
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1.5">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lname"
                      value={formData.lname}
                      onChange={handleInputChange}
                      placeholder="Enter last name"
                      required
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter email"
                      required
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1.5">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                      required
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1.5">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1.5">
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter complete address"
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                  />
                </div>
              </div>

              {/* Right: Profile Photo */}
              <div className="col-span-3 flex flex-col items-center">
                <div className="w-28 h-28 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 mb-3">
                  <Upload className="h-8 w-8 text-black" />
                </div>
                <button
                  type="button"
                  className="w-full px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Upload Photo
                </button>
                <p className="text-xs text-gray-600 mt-2 text-center">
                  JPG, PNG up to 2MB
                </p>
              </div>
            </div>
          </div>

          {/* Course & Subject Assignment Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-semibold text-black">Course & Subject Assignment</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1.5">
                  Assign to Course
                </label>
                <select
                  name="course_id"
                  value={formData.course_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Select Course</option>
                  {courses.map(course => (
                    <option key={course._id} value={course._id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1.5">
                  Assign Subjects <span className="text-red-500">*</span>
                </label>
                <div className="relative" ref={subjectDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                    className="w-full px-3 py-2 text-sm text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all flex items-center justify-between"
                  >
                    <span className={formData.subjects.length > 0 ? 'text-black' : 'text-gray-500'}>
                      {formData.subjects.length > 0 
                        ? `${formData.subjects.length} subject${formData.subjects.length > 1 ? 's' : ''} selected`
                        : availableSubjects.length === 0 ? 'No subjects available' : 'Select subjects'}
                    </span>
                    <ChevronDown 
                      className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isSubjectDropdownOpen ? 'transform rotate-180' : ''}`}
                    />
                  </button>
                  
                  {isSubjectDropdownOpen && availableSubjects.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                      <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        {availableSubjects.map((subject) => (
                          <label
                            key={subject}
                            className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              checked={formData.subjects.includes(subject)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData(prev => ({
                                    ...prev,
                                    subjects: [...prev.subjects, subject]
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    subjects: prev.subjects.filter(s => s !== subject)
                                  }));
                                }
                              }}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                            />
                            <span className="text-sm text-gray-700 flex-1">{subject}</span>
                            {formData.subjects.includes(subject) && (
                              <span className="text-xs text-blue-600 font-semibold">✓</span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {formData.subjects.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {formData.subjects.map((subject) => (
                        <span
                          key={subject}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                          <span className="font-medium">{subject}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                subjects: prev.subjects.filter(s => s !== subject)
                              }));
                            }}
                            className="hover:text-blue-900 transition-colors"
                            aria-label={`Remove ${subject}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1.5">
                  Assign Batch
                </label>
                <select
                  name="batch_id"
                  value={formData.batch_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Select Batch</option>
                  {batches.map(batch => (
                    <option key={batch._id} value={batch._id}>
                      {batch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Employment Documents Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-semibold text-black">Employment Documents</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1.5">
                  Aadhar Number
                </label>
                <input
                  type="text"
                  name="aadhar"
                  value={formData.aadhar}
                  onChange={handleInputChange}
                  placeholder="Enter Aadhar number"
                  maxLength={12}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1.5">
                  PAN Card Number
                </label>
                <input
                  type="text"
                  name="pan_number"
                  value={formData.pan_number}
                  onChange={handleInputChange}
                  placeholder="Enter PAN number"
                  maxLength={10}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-black mb-1.5">
                Permanent Address
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={sameAsAddress}
                  onChange={(e) => setSameAsAddress(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-black">Same as current address</span>
              </div>
              <textarea
                name="p_address"
                value={formData.p_address}
                onChange={handleInputChange}
                placeholder="Enter permanent address"
                rows={2}
                disabled={sameAsAddress}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-gray-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1.5">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  name="bank_account"
                  value={formData.bank_account}
                  onChange={handleInputChange}
                  placeholder="Enter account number"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1.5">
                  Bank IFSC Code
                </label>
                <input
                  type="text"
                  name="bank_ifsc"
                  value={formData.bank_ifsc}
                  onChange={handleInputChange}
                  placeholder="Enter IFSC code"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1.5">
                  Highest Degree
                </label>
                <select
                  name="highest_degree"
                  value={formData.highest_degree}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Select Degree</option>
                  <option value="B.Ed">B.Ed</option>
                  <option value="M.Ed">M.Ed</option>
                  <option value="B.Sc">B.Sc</option>
                  <option value="M.Sc">M.Sc</option>
                  <option value="B.A">B.A</option>
                  <option value="M.A">M.A</option>
                  <option value="PhD">PhD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1.5">
                  Degree Certificate
                </label>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2 text-black"
                >
                  <Upload className="h-4 w-4" />
                  Upload Certificate
                </button>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-black mb-1.5">
                Monthly Salary
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black">₹</span>
                <input
                  type="number"
                  name="salary"
                  value={formData.salary}
                  onChange={handleInputChange}
                  placeholder="Enter salary amount"
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <p className="text-xs text-black">Fields marked with <span className="text-red-500">*</span> are required</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-black hover:bg-gray-50 transition text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAsDraft}
                className="px-5 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm font-medium"
              >
                Save as Draft
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm font-medium"
              >
                {loading ? 'Adding...' : teacher ? 'Update Teacher' : 'Add Teacher'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}