"use client";


import { X, Star, Calendar, User } from "lucide-react";

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
  fullName?: string;
  phone: string;
  email?: string;
  source: string;
  interest: string;
  location?: string;
  address?: string;
  status: string;
  createdAt: string;
  notesHistory?: NoteHistory[];
}

interface ViewEnquiryModalProps {
  enquiry: Enquiry;
  onClose: () => void;
}

export default function ViewEnquiryModal({
  enquiry,
  onClose,
}: ViewEnquiryModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-black">Enquiry Details</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition"
          >
            <X className="h-5 w-5 text-gray-700" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                {enquiry.firstName || (enquiry.name ? enquiry.name.split(' ')[0] : '')}
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                {enquiry.lastName || (enquiry.name ? enquiry.name.split(' ').slice(1).join(' ') : '')}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                {enquiry.phone}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                {enquiry.email || "Not provided"}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                {enquiry.location || "Not provided"}
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                {enquiry.address || "Not provided"}
              </div>
            </div>

            {/* Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                  {enquiry.source}
                </span>
              </div>
            </div>

            {/* Interest */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interest
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {enquiry.interest}
                </span>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 capitalize ">
                  {enquiry.status}
                </span>
              </div>
            </div>

            {/* Date Added */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Added
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                {new Date(enquiry.createdAt).toLocaleDateString()}
              </div>
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

          

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-black bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}