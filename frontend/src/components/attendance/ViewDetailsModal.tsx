import { X, Calendar, User, Clock, MapPin, Zap } from 'lucide-react';

interface UserInfo {
  fname: string;
  lname: string;
}

interface BatchInfo {
  _id: string;
  name: string;
}

interface AttendanceRecord {
  _id: string;
  userId?: UserInfo;
  studentId?: UserInfo;
  userType: 'Student' | 'Teacher';
  date: string;
  timestamp: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  source: 'biometric' | 'manual' | 'bulk_upload';
  deviceId: string;
  verifyMode?: string;
  notes?: string;
  batchId?: BatchInfo;
}

interface ViewDetailsModalProps {
  record: AttendanceRecord;
  isOpen: boolean;
  onClose: () => void;
}

export default function ViewDetailsModal({ record, isOpen, onClose }: ViewDetailsModalProps) {
  if (!isOpen) return null;

  const user = record.userType === 'Student' ? record.studentId : record.userId;
  const fullName = `${user?.fname || ''} ${user?.lname || ''}`;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      present: 'text-green-600 bg-green-50',
      late: 'text-yellow-600 bg-yellow-50',
      absent: 'text-red-600 bg-red-50',
      excused: 'text-blue-600 bg-blue-50'
    };
    return colors[status] || colors.absent;
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      biometric: 'Biometric Device',
      manual: 'Manual Entry',
      bulk_upload: 'Bulk Upload'
    };
    return labels[source] || source;
  };

  const formatDateTime = (dateString: string, timeString: string) => {
    const date = new Date(dateString);
    const time = new Date(timeString);
    
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: time.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      })
    };
  };

  const dateTime = formatDateTime(record.date, record.timestamp);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-lg w-full mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Attendance Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Status Card */}
          <div className={`p-4 rounded-lg ${getStatusColor(record.status)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-75">Attendance Status</p>
                <p className="text-2xl font-bold capitalize mt-1">{record.status}</p>
              </div>
              <div className="text-4xl opacity-20">
                {record.status === 'present' && '✓'}
                {record.status === 'absent' && '✗'}
                {record.status === 'late' && '⏱'}
                {record.status === 'excused' && 'i'}
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Personal Information</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="text-gray-400 mt-1 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase">Name</p>
                  <p className="text-sm text-gray-900 font-medium mt-1">{fullName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Zap className="text-gray-400 mt-1 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase">Type</p>
                  <p className="text-sm text-gray-900 font-medium mt-1">{record.userType}</p>
                </div>
              </div>

              {record.batchId && (
                <div className="flex items-start gap-3">
                  <MapPin className="text-gray-400 mt-1 flex-shrink-0" size={20} />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500 uppercase">Batch</p>
                    <p className="text-sm text-gray-900 font-medium mt-1">
                      {typeof record.batchId === 'object' && record.batchId !== null ? String(record.batchId.name) : String(record.batchId || '')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Attendance Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Attendance Record</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="text-gray-400 mt-1 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase">Date</p>
                  <p className="text-sm text-gray-900 font-medium mt-1">{dateTime.date}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="text-gray-400 mt-1 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase">Time</p>
                  <p className="text-sm text-gray-900 font-medium mt-1">{dateTime.time}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="text-gray-400 mt-1 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase">Device / Source</p>
                  <p className="text-sm text-gray-900 font-medium mt-1">
                    <span className="block">{record.deviceId}</span>
                    <span className="text-xs text-gray-600 mt-1">{getSourceLabel(record.source)}</span>
                  </p>
                </div>
              </div>

              {record.verifyMode && (
                <div className="flex items-start gap-3">
                  <Zap className="text-gray-400 mt-1 flex-shrink-0" size={20} />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500 uppercase">Verify Mode</p>
                    <p className="text-sm text-gray-900 font-medium mt-1 capitalize">{record.verifyMode}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Additional Details</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Record ID</p>
                <p className="text-sm text-gray-900 font-mono mt-1 break-all">{record._id}</p>
              </div>

              {record.notes && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Notes</p>
                  <p className="text-sm text-gray-900 mt-1 p-3 bg-gray-50 rounded border border-gray-200">
                    {record.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-blue-800">
              <strong>Record Source:</strong> This attendance record was created from <strong>{getSourceLabel(record.source).toLowerCase()}</strong>. 
              {record.source === 'biometric' && ' This is an automatic entry from the biometric device.'}
              {record.source === 'manual' && ' This entry was manually marked by an administrator.'}
              {record.source === 'bulk_upload' && ' This entry was imported via bulk upload.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
