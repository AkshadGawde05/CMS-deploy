'use client';
import { useState, useEffect, useCallback } from 'react';
import { X, User, Upload, GraduationCap, Users as UsersIcon } from 'lucide-react';
import { createStudent, updateStudent, getAllCourses, getAllBatches, getParentsByStudent } from '@/lib/api';
import type { CourseDTO, BatchDTO } from '@/lib/api';

type StudentLike = {
  _id: string;
  fname?: string;
  lname?: string;
  user_id?: { email?: string; phone?: string };
  dob?: string;
  gender?: string;
  aadhar?: string;
  address?: { street?: string };
  course_id?: string;
  batch_id?: string;
};

interface AddStudentModalProps {
  student?: StudentLike;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddStudentModal({ student, onClose, onSuccess }: AddStudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<CourseDTO[]>([]);
  const [batches, setBatches] = useState<BatchDTO[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<BatchDTO[]>([]);
  const [feePlans, setFeePlans] = useState<Array<{ 
    _id: string; 
    total_amount: number; 
    num_installments: number;
    discount_types: Array<{ code: string; name: string; discount_percent: number }> 
  }>>([]);
  const [discountTypes, setDiscountTypes] = useState<Array<{ code: string; name: string; discount_percent: number }>>([]);
  
  const [formData, setFormData] = useState({
    fname: '',
    lname: '',
    email: '',
    phone: '',
    dob: '',
    gender: 'male',
    aadhar: '',
    address: '',
    course_id: '',
    batch_id: '',
    fee_plan_id: '',
    discount_type: ''
  });

  const [feeCalculation, setFeeCalculation] = useState({
    courseFee: 0,
    discount: 0,
    tax: 0,
    total: 0
  });

  const [guardians, setGuardians] = useState([
    { name: '', phone: '', relationship: '' }
  ]);

  // Fetch courses and batches on mount
  useEffect(() => {
    fetchCoursesAndBatches();
  }, []);

  // Update form if editing
  useEffect(() => {
    if (student) {
      setFormData({
        fname: student.fname || '',
        lname: student.lname || '',
        email: student.user_id?.email || '',
        phone: student.user_id?.phone || '',
        dob: student.dob?.split('T')[0] || '',
        gender: student.gender || 'male',
        aadhar: student.aadhar || '',
        address: student.address?.street || '',
        course_id: student.course_id || '',
        batch_id: student.batch_id || '',
        fee_plan_id: '',
        discount_type: ''
      });
      
      // Fetch existing parents/guardians for this student
      fetchExistingGuardians(student._id);
    }
  }, [student]);
  
  // Fetch existing guardians when editing
  const fetchExistingGuardians = async (studentId: string) => {
    try {
      const result = await getParentsByStudent(studentId);
      if (result.success && result.parents && result.parents.length > 0) {
        const existingGuardians = result.parents.map((parent: {
          user_id: { fname: string; lname: string; phone: string };
          relation: string;
        }) => ({
          name: `${parent.user_id.fname} ${parent.user_id.lname}`,
          phone: parent.user_id.phone,
          relationship: parent.relation
        }));
        setGuardians(existingGuardians);
      }
    } catch (err) {
      console.error('Failed to fetch existing guardians:', err);
    }
  };

  // Calculate fees when fee plan or discount changes
  const calculateFees = useCallback(() => {
    const selectedPlan = feePlans.find(fp => fp._id === formData.fee_plan_id);
    if (!selectedPlan) {
      setFeeCalculation({ courseFee: 0, discount: 0, tax: 0, total: 0 });
      return;
    }

    const courseFee = selectedPlan.total_amount || 0;
    
    // Calculate discount based on selected discount type
    let discount = 0;
    const selectedDiscount = discountTypes.find(dt => dt.code === formData.discount_type);
    if (selectedDiscount) {
      discount = courseFee * (selectedDiscount.discount_percent / 100);
    }

    // Calculate tax (18% GST)
    const taxableAmount = courseFee - discount;
    const tax = taxableAmount * 0.18;
    const total = taxableAmount + tax;

    setFeeCalculation({
      courseFee,
      discount,
      tax,
      total
    });
  }, [feePlans, formData.fee_plan_id, formData.discount_type, discountTypes]);

  useEffect(() => {
    calculateFees();
  }, [calculateFees]);

  // Filter batches when course changes
  useEffect(() => {
    if (formData.course_id) {
      const filtered = batches.filter(batch => (typeof batch.course_id === 'string' ? batch.course_id : batch.course_id?._id) === formData.course_id);
      setFilteredBatches(filtered);
      // Reset batch selection if current batch doesn't belong to selected course
      if (formData.batch_id && !filtered.find(b => b._id === formData.batch_id)) {
        setFormData(prev => ({ ...prev, batch_id: '' }));
      }
    } else {
      setFilteredBatches([]);
      setFormData(prev => ({ ...prev, batch_id: '' }));
    }
  }, [formData.course_id, formData.batch_id, batches]);

  // Fetch fee plans when batch changes
  useEffect(() => {
    if (formData.batch_id) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      console.log('🔍 Fetching fee plans for batch:', formData.batch_id);
      
      fetch(`${apiUrl}/api/fee-plans?batch_id=${formData.batch_id}`)
        .then(res => res.json())
        .then(data => {
          console.log('📦 Fee plans response:', data);
          if (data.plans && data.plans.length > 0) {
            setFeePlans(data.plans);
            console.log(`✅ Found ${data.plans.length} fee plans`);
            // Auto-select first fee plan
            if (data.plans[0]._id) {
              setFormData(prev => ({ ...prev, fee_plan_id: data.plans[0]._id }));
              // Set discount types for the first plan
              if (data.plans[0].discount_types && data.plans[0].discount_types.length > 0) {
                setDiscountTypes(data.plans[0].discount_types);
                setFormData(prev => ({ ...prev, discount_type: data.plans[0].discount_types[0].code }));
              }
            }
          } else {
            setFeePlans([]);
            setDiscountTypes([]);
          }
        })
        .catch(err => {
          console.error('Failed to fetch fee plans:', err);
          setFeePlans([]);
          setDiscountTypes([]);
        });
    } else {
      setFeePlans([]);
      setDiscountTypes([]);
      setFormData(prev => ({ ...prev, fee_plan_id: '', discount_type: '' }));
    }
  }, [formData.batch_id]);

  // Update discount types when fee plan changes
  useEffect(() => {
    if (formData.fee_plan_id) {
      const plan = feePlans.find(fp => fp._id === formData.fee_plan_id);
      if (plan && plan.discount_types && plan.discount_types.length > 0) {
        setDiscountTypes(plan.discount_types);
        // Auto-select first discount if current is invalid
        const validCodes = plan.discount_types.map(dt => dt.code);
        if (!formData.discount_type || !validCodes.includes(formData.discount_type)) {
          setFormData(prev => ({ ...prev, discount_type: plan.discount_types[0].code }));
        }
      } else {
        setDiscountTypes([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.fee_plan_id, feePlans]);

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

  // calculateFees moved to useCallback above

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGuardianChange = (index: number, field: string, value: string) => {
    const updatedGuardians = [...guardians];
    updatedGuardians[index] = { ...updatedGuardians[index], [field]: value };
    setGuardians(updatedGuardians);
  };

  const addGuardian = () => {
    setGuardians([...guardians, { name: '', phone: '', relationship: '' }]);
  };

  const removeGuardian = (index: number) => {
    setGuardians(guardians.filter((_, i) => i !== index));
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const payload = {
      fname: formData.fname,
      lname: formData.lname,
      email: formData.email,
      phone: formData.phone,
      dob: formData.dob,
      gender: formData.gender,
      aadhar: formData.aadhar,
      address: { street: formData.address },
      course_id: formData.course_id,
      batch_id: formData.batch_id,
      fee_plan_id: formData.fee_plan_id,
      discount_type: formData.discount_type,
      guardians: guardians.filter(g => g.name && g.phone && g.relationship)
    };

    if (student) {
      await updateStudent(student._id, payload);
    } else {
      const res = await createStudent(payload);
      if (res?.success) {
        const cred = res?.credentials;
        const msg = cred?.tempPassword
          ? `Student created. Temporary credentials generated. User login will be sent by email.\n\nEmail/Phone: ${cred.email || cred.phone}\nTemp Password: ${cred.tempPassword}`
          : 'Student profile created. User login will be sent by email.';
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


  return (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">

      <div className="bg-white text-black rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="text-xl font-bold text-black-900">
            {student ? 'Edit Student' : 'Add New Student'}
          </h2>
          <button
            onClick={onClose}
            className="text-black-400 hover:text-black-600 transition"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Personal Information Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-semibold text-black-900">Personal Information</h3>
            </div>

            {/* Profile Photo */}
            <div className="flex items-center gap-6 mb-6">
              <div className="h-20 w-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                <Upload className="h-6 w-6 text-black-400" />
              </div>
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Upload Photo
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black-800 mb-1.5">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fname"
                  value={formData.fname}
                  onChange={handleInputChange}
                  placeholder="Enter first name"
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black-800 mb-1.5">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lname"
                  value={formData.lname}
                  onChange={handleInputChange}
                  placeholder="Enter last name"
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black-800 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="student@email.com"
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black-800 mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+91 9876543210"
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black-800 mb-1.5">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-black-800 mb-1.5">
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter complete address"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Academic Information Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-semibold text-black-900">Academic Information</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-black-800 mb-1.5">
                  Assign Course <span className="text-red-500">*</span>
                </label>
                <select
                  name="course_id"
                  value={formData.course_id}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 text-sm text-black-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
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
                <label className="block text-sm font-medium text-black-800 mb-1.5">
                  Assign Batch <span className="text-red-500">*</span>
                </label>
                <select
                  name="batch_id"
                  value={formData.batch_id}
                  onChange={handleInputChange}
                  required
                  disabled={!formData.course_id}
                  className="w-full px-3 py-2 text-sm text-black-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >

                
                    
                  <option value="">Select Batch</option>
                  {(filteredBatches.length ? filteredBatches : batches).map(batch => (
                   <option key={batch._id} value={batch._id}>
                      {batch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black-800 mb-1.5">
                  Fee Plan <span className="text-red-500">*</span>
                </label>
                <select
                  name="fee_plan_id"
                  value={formData.fee_plan_id}
                  onChange={handleInputChange}
                  required
                  disabled={!formData.batch_id}
                  className="w-full px-3 py-2 text-sm text-black-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {!formData.batch_id ? (
                    <option value="">Select Batch First</option>
                  ) : feePlans.length === 0 ? (
                    <option value="">No Fee Plans Available</option>
                  ) : (
                    <>
                      <option value="">-- Select Fee Plan --</option>
                      {feePlans.map(fp => {
                        const discountInfo = fp.discount_types && fp.discount_types.length > 0 
                          ? fp.discount_types.map(dt => `${dt.name} (${dt.discount_percent}% off)`).join(', ')
                          : 'No discount';
                        return (
                          <option key={fp._id} value={fp._id}>
                            ₹{fp.total_amount.toLocaleString()} - {discountInfo} - {fp.num_installments} {fp.num_installments === 1 ? 'installment' : 'installments'}
                          </option>
                        );
                      })}
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-black-800 mb-1.5">
                Discount Type <span className="text-red-500">*</span>
              </label>
              <select
                name="discount_type"
                value={formData.discount_type}
                onChange={handleInputChange}
                required
                disabled={!formData.fee_plan_id}
                className="w-full px-3 py-2 text-sm text-black-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {discountTypes.length === 0 ? (
                  <option value="">Select Fee Plan First</option>
                ) : (
                  discountTypes.map(dt => (
                    <option key={dt.code} value={dt.code}>
                      {dt.name} {dt.discount_percent > 0 ? `(${dt.discount_percent}% Off)` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Effective Fees Display */}
            {formData.fee_plan_id && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-xs font-semibold text-black-700 uppercase mb-2">Effective Fees</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-black-700">Course Fee:</span>
                  <span className="font-semibold text-black-900">₹{feeCalculation.courseFee.toLocaleString()}</span>
                </div>
                {feeCalculation.discount > 0 && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-black-700">Discount:</span>
                    <span className="font-semibold text-green-600">-₹{feeCalculation.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-black-700">Tax (18% GST):</span>
                  <span className="font-semibold text-black-900">₹{feeCalculation.tax.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-base font-bold mt-2 pt-2 border-t border-gray-300">
                  <span className="text-black-900">Total:</span>
                  <span className="text-blue-600">₹{Math.round(feeCalculation.total).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Guardian/Parent Details Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-semibold text-black-900">Guardian/Parent Details</h3>
              </div>
              <button
                type="button"
                onClick={addGuardian}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition font-medium"
              >
                + Add Guardian
              </button>
            </div>

            {guardians.map((guardian, index) => (
              <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg relative">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-black-800">Guardian {index + 1}</h4>
                  {guardians.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGuardian(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-black-800 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={guardian.name}
                      onChange={(e) => handleGuardianChange(index, 'name', e.target.value)}
                      placeholder="Guardian name"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black-800 mb-1">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={guardian.phone}
                      onChange={(e) => handleGuardianChange(index, 'phone', e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black-800 mb-1">
                      Relationship <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={guardian.relationship}
                      onChange={(e) => handleGuardianChange(index, 'relationship', e.target.value)}
                      className="w-full px-3 py-2 text-sm text-black-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="">Select Relationship</option>
                      <option value="father">Father</option>
                      <option value="mother">Mother</option>
                      <option value="guardian">Guardian</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-black-700 hover:bg-gray-50 transition text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm font-medium"
            >
              {loading ? 'Saving...' : student ? 'Update Student' : 'Save Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
