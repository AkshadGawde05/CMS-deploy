"use client";

import { useState } from "react";
import { X, Star, Calendar, User } from "lucide-react";
import { updateEnquiry, addEnquiryNote } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface NoteHistory {
  note: string;
  addedBy?: { _id: string; fname?: string; lname?: string; name?: string };
  addedAt: Date;
}

interface Enquiry {
  _id: string;
  name?: string; // For backward compatibility
  firstName?: string;
  lastName?: string;
  phone: string;
  phone2?: string;
  email?: string;
  dateOfBirth?: string;
  source: string;
  interest: string;
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
  status: string;
  notesHistory?: NoteHistory[];
}

interface EditEnquiryModalProps {
  enquiry: Enquiry;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditEnquiryModal({
  enquiry,
  onClose,
  onSuccess,
}: EditEnquiryModalProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    firstName: enquiry.firstName || (enquiry.name ? enquiry.name.split(' ')[0] : ''),
    lastName: enquiry.lastName || (enquiry.name ? enquiry.name.split(' ').slice(1).join(' ') : ''),
    phone: enquiry.phone,
    phone2: enquiry.phone2 || "",
    email: enquiry.email || "",
    dateOfBirth: enquiry.dateOfBirth || "",
    building: enquiry.building || "",
    flatRoom: enquiry.flatRoom || "",
    landmark: enquiry.landmark || "",
    location: enquiry.location || "",
    city: enquiry.city || "",
    state: enquiry.state || "",
    source: enquiry.source,
    interest: enquiry.interest,
    courseInterested: enquiry.courseInterested || "",
    gradeClass: enquiry.gradeClass || "",
    academicYear: enquiry.academicYear || "",
    schoolName: enquiry.schoolName || "",
    address: enquiry.address || "",
  });
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const sources = ["Website", "Facebook", "Google Ads", "Referral", "Walk-in", "Phone Call"];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const interests = ["Full Stack", "Data Science", "Digital Marketing", "UI/UX", "Python", "Java"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      showToast({
        type: 'warning',
        title: 'Missing Required Fields',
        message: 'Please fill in first name, last name, and phone number'
      });
      return;
    }

    try {
      setSaving(true);
      await updateEnquiry(enquiry._id, formData);
      showToast({
        type: 'success',
        title: 'Enquiry Updated',
        message: `Enquiry for ${formData.firstName} ${formData.lastName} has been updated successfully`
      });
      onSuccess();
    } catch (error) {
      console.error("Update enquiry error:", error);
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = err?.response?.data?.message || err?.message || "Failed to update enquiry";
      
      showToast({
        type: 'error',
        title: 'Failed to Update Enquiry',
        message: errorMessage
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setSaving(true);
      await updateEnquiry(enquiry._id, { status: newStatus });
      showToast({
        type: 'success',
        title: 'Status Updated',
        message: `Enquiry status changed to ${newStatus.replace('_', ' ')}`
      });
      onSuccess(); // This will refresh the parent component
    } catch (error) {
      console.error("Status change error:", error);
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = err?.response?.data?.message || err?.message || "Failed to update status";
      
      showToast({
        type: 'error',
        title: 'Failed to Update Status',
        message: errorMessage
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStatusToLead = async () => {
    await handleStatusChange('lead');
  };

  const handleAddDescription = async () => {
    if (!description.trim()) {
      showToast({
        type: 'warning',
        title: 'Empty Description',
        message: 'Please enter a description before adding'
      });
      return;
    }

    try {
      setSaving(true);
      // Use the new note endpoint with timestamp
      await addEnquiryNote(enquiry._id, { note: description.trim() });
      showToast({
        type: 'success',
        title: 'Note Added',
        message: 'Note has been added successfully with timestamp'
      });
      setDescription(""); // Clear the description field
      onSuccess(); // Refresh the parent component to show updated notes
    } catch (error) {
      console.error("Add note error:", error);
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = err?.response?.data?.message || err?.message || "Failed to add note";
      
      showToast({
        type: 'error',
        title: 'Failed to Add Note',
        message: errorMessage
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-black">Edit Enquiry Details</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition"
          >
            <X className="h-5 w-5 text-gray-700" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex">
          {/* Form Section */}
          <div className="flex-1 p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Info Section */}
              <div>
                <h3 className="text-lg font-medium text-black mb-4">Personal Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Name */}
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      placeholder="Anjali"
                    />
                  </div>

                  {/* Last Name */}
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      placeholder="Verma"
                    />
                  </div>

                  {/* Phone No 1 */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone No 1
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      placeholder="9876543210"
                    />
                  </div>

                  {/* Phone No 2 */}
                  <div>
                    <label htmlFor="phone2" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone No 2
                    </label>
                    <input
                      type="tel"
                      id="phone2"
                      name="phone2"
                      value={formData.phone2}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      placeholder="Optional"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div className="md:col-span-2">
                    <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      id="dateOfBirth"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    />
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div>
                <h3 className="text-lg font-medium text-black mb-4">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Building/Street */}
                  <div>
                    <label htmlFor="building" className="block text-sm font-medium text-gray-700 mb-2">
                      Building/Street
                    </label>
                    <input
                      type="text"
                      id="building"
                      name="building"
                      value={formData.building}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      placeholder="e.g., Sunshine Apartments"
                    />
                  </div>

                  {/* Flat/Room No. */}
                  <div>
                    <label htmlFor="flatRoom" className="block text-sm font-medium text-gray-700 mb-2">
                      Flat/Room No.
                    </label>
                    <input
                      type="text"
                      id="flatRoom"
                      name="flatRoom"
                      value={formData.flatRoom}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      placeholder="e.g., A-402"
                    />
                  </div>

                  {/* Nearby Landmark */}
                  <div>
                    <label htmlFor="landmark" className="block text-sm font-medium text-gray-700 mb-2">
                      Nearby Landmark
                    </label>
                    <input
                      type="text"
                      id="landmark"
                      name="landmark"
                      value={formData.landmark}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      placeholder="e.g., Near City Mall"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      placeholder="e.g., Koregaon Park"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      placeholder="e.g., Pune"
                    />
                  </div>

                  {/* State */}
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      placeholder="e.g., Maharashtra"
                    />
                  </div>
                </div>
              </div>

              {/* More Info Section */}
              <div>
                <h3 className="text-lg font-medium text-black mb-4">More Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Course Interested In */}
                  <div>
                    <label htmlFor="courseInterested" className="block text-sm font-medium text-gray-700 mb-2">
                      Course Interested In
                    </label>
                    <input
                      type="text"
                      id="courseInterested"
                      name="courseInterested"
                      value={formData.courseInterested}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      placeholder="e.g., IIT-JEE Preparation"
                    />
                  </div>

                  {/* Grade/Class */}
                  <div>
                    <label htmlFor="gradeClass" className="block text-sm font-medium text-gray-700 mb-2">
                      Grade/Class
                    </label>
                    <input
                      type="text"
                      id="gradeClass"
                      name="gradeClass"
                      value={formData.gradeClass}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      placeholder="e.g., 11th Grade"
                    />
                  </div>

                  {/* Academic Year */}
                  <div>
                    <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700 mb-2">
                      Academic Year
                    </label>
                    <input
                      type="text"
                      id="academicYear"
                      name="academicYear"
                      value={formData.academicYear}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      placeholder="e.g., 2023-24"
                    />
                  </div>

                  {/* School Name */}
                  <div>
                    <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700 mb-2">
                      School Name
                    </label>
                    <input
                      type="text"
                      id="schoolName"
                      name="schoolName"
                      value={formData.schoolName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      placeholder="e.g., ABC High School"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-black bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Updating..." : "Update Enquiry"}
                </button>
              </div>
            </form>
          </div>

          {/* Actions Sidebar */}
          <div className="w-80 bg-gray-50 p-6 border-l border-gray-200">
            <div className="space-y-6">
              {/* Actions */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Actions</h4>
                <button
                  type="button"
                  onClick={handleChangeStatusToLead}
                  disabled={saving}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition disabled:opacity-50"
                >
                  <Star className="h-4 w-4" />
                  Change Status to Lead
                </button>
              </div>

              {/* Classify As */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Classify As</h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleStatusChange('cold_lead')}
                    disabled={saving}
                    className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-200 rounded-md hover:bg-red-200 transition disabled:opacity-50"
                  >
                    Cold
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('warm_lead')}
                    disabled={saving}
                    className="px-3 py-1 text-xs font-medium text-orange-700 bg-orange-100 border border-orange-200 rounded-md hover:bg-orange-200 transition disabled:opacity-50"
                  >
                    Warm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('hot_lead')}
                    disabled={saving}
                    className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-200 rounded-md hover:bg-green-200 transition disabled:opacity-50"
                  >
                    Hot
                  </button>
                </div>
              </div>

              {/* Progression Workflow */}
              {enquiry.status === 'hot_lead' && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Next Step</h4>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('contacted')}
                    disabled={saving}
                    className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    Mark as Contacted
                  </button>
                </div>
              )}

              {enquiry.status === 'contacted' && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Student Response</h4>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleStatusChange('interested')}
                      disabled={saving}
                      className="w-full px-3 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-200 rounded-md hover:bg-green-200 transition disabled:opacity-50"
                    >
                      Interested
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('not_interested')}
                      disabled={saving}
                      className="w-full px-3 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-200 rounded-md hover:bg-red-200 transition disabled:opacity-50"
                    >
                      Not Interested
                    </button>
                  </div>
                </div>
              )}

              {(enquiry.status === 'interested' || enquiry.status === 'not_interested') && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Final Outcome</h4>
                  <div className="space-y-2">
                    {enquiry.status === 'interested' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange('enrolled')}
                        disabled={saving}
                        className="w-full px-3 py-2 text-sm font-medium text-white bg-green-600 border border-green-600 rounded-md hover:bg-green-700 transition disabled:opacity-50"
                      >
                        Enrolled Successfully
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStatusChange('lost')}
                      disabled={saving}
                      className="w-full px-3 py-2 text-sm font-medium text-white bg-gray-600 border border-gray-600 rounded-md hover:bg-gray-700 transition disabled:opacity-50"
                    >
                      Mark as Lost
                    </button>
                  </div>
                </div>
              )}

              {/* Add Description / History */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Add Note</h4>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black text-sm"
                  placeholder="Add a new note about the interaction..."
                />
                <button
                  type="button"
                  onClick={handleAddDescription}
                  disabled={saving || !description.trim()}
                  className="mt-2 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-200 rounded-md hover:bg-blue-200 transition disabled:opacity-50"
                >
                  Add Note
                </button>
              </div>

              {/* Notes History */}
              {enquiry.notesHistory && enquiry.notesHistory.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Notes History</h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {/* Display notes in reverse chronological order (newest first) */}
                    {[...enquiry.notesHistory].reverse().map((noteItem, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(noteItem.addedAt).toLocaleString()}
                        </div>
                        {/* {noteItem.addedBy && (
                          <div className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {noteItem.addedBy.name || `${noteItem.addedBy.fname || ''} ${noteItem.addedBy.lname || ''}`.trim() || 'Unknown'}
                          </div>
                        )} */}
                        <p className="text-sm text-gray-700 break-words">{noteItem.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}