'use client';
import { useState, useEffect } from 'react';
import { X, User, Upload, Users as UsersIcon, Briefcase } from 'lucide-react';
import { createParent, updateParent, getAllStudents } from '@/lib/api';

type ParentLike = {
  _id: string;
  user_id?: { fname?: string; lname?: string; email?: string; phone?: string };
  student_id?: { _id: string };
  aadhar?: string;
  relation?: string;
  occupation?: string;
  annual_income?: number;
  address?: { street?: string };
};

interface AddParentModalProps {
  parent?: ParentLike;
  onClose: () => void;
  onSuccess: () => void;
}

interface Student {
  _id: string;
  fname: string;
  lname: string;
  user_id: {
    email: string;
  };
}

export default function AddParentModal({ parent, onClose, onSuccess }: AddParentModalProps) {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [formData, setFormData] = useState({
    fname: '',
    lname: '',
    email: '',
    phone: '',
    student_id: '',
    aadhar: '',
    relation: 'father',
    occupation: '',
    annual_income: '',
    address: ''
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (parent) {
      setFormData({
        fname: parent.user_id?.fname || '',
        lname: parent.user_id?.lname || '',
        email: parent.user_id?.email || '',
        phone: parent.user_id?.phone || '',
        student_id: parent.student_id?._id || '',
        aadhar: parent.aadhar || '',
        relation: parent.relation || 'father',
        occupation: parent.occupation || '',
        annual_income: parent.annual_income?.toString() || '',
        address: parent.address?.street || ''
      });
    }
  }, [parent]);

  const fetchStudents = async () => {
    try {
      const result = await getAllStudents();
      setStudents(result.students || []);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
        student_id: formData.student_id,
        aadhar: formData.aadhar,
        relation: formData.relation,
        occupation: formData.occupation,
        annual_income: parseFloat(formData.annual_income) || 0,
        address: { street: formData.address }
      };

      if (parent) {
        await updateParent(parent._id, payload);
      } else {
        const res = await createParent(payload);
        if (res?.success) {
          const cred = res?.credentials;
          const msg = cred?.tempPassword
            ? `Parent created. Temporary credentials generated. User login will be sent by email.\n\nEmail/Phone: ${cred.email || cred.phone}\nTemp Password: ${cred.tempPassword}`
            : 'Parent profile created. User login will be sent by email.';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-green-600 rounded-lg flex items-center justify-center">
              <UsersIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-black">
                {parent ? 'Edit Parent' : 'Add New Parent'}
              </h2>
              <p className="text-xs text-black">Complete all sections to add parent</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-black hover:text-black transition"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-green-600" />
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
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-600"
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
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-600"
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
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-600"
                    />
                  </div>
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
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-600"
                    />
                  </div>
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
                      placeholder="Enter 12-digit Aadhar"
                      maxLength={12}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1.5">
                      Relation <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="relation"
                      value={formData.relation}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                    >
                      <option value="father">Father</option>
                      <option value="mother">Mother</option>
                      <option value="guardian">Guardian</option>
                    </select>
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
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-600"
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
                  className="w-full px-3 py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Upload Photo
                </button>
                <p className="text-xs text-black mt-2 text-center">
                  JPG, PNG up to 2MB
                </p>
              </div>
            </div>
          </div>

          {/* Student Assignment Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <UsersIcon className="h-5 w-5 text-green-600" />
              <h3 className="text-base font-semibold text-black">Student Assignment</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1.5">
                Assign to Student <span className="text-red-500">*</span>
              </label>
              <select
                name="student_id"
                value={formData.student_id}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
              >
                <option value="">Select Student</option>
                {students.map(student => (
                  <option key={student._id} value={student._id}>
                    {student.fname} {student.lname} ({student.user_id?.email})
                  </option>
                ))}
              </select>
              <p className="text-xs text-black mt-1">
                Select the student this parent/guardian is associated with
              </p>
            </div>
          </div>

          {/* Professional Information Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-5 w-5 text-green-600" />
              <h3 className="text-base font-semibold text-black">Professional Information</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1.5">
                  Occupation
                </label>
                <input
                  type="text"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleInputChange}
                  placeholder="Enter occupation"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1.5">
                  Annual Income
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black">₹</span>
                  <input
                    type="number"
                    name="annual_income"
                    value={formData.annual_income}
                    onChange={handleInputChange}
                    placeholder="Enter annual income"
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <p className="text-xs text-black">
              Fields marked with <span className="text-red-500">*</span> are required
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-black hover:bg-gray-50 transition text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-sm font-medium"
              >
                {loading ? 'Saving...' : parent ? 'Update Parent' : 'Add Parent'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
