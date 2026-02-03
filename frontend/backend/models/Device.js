import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
  deviceId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  model: { 
    type: String, 
    default: 'N-WL20' 
  },
  serialNumber: String,
  host: { 
    type: String, 
    required: true 
  },
  port: { 
    type: Number, 
    default: 5005 
  },
  cloudId: String,
  location: String,
  firmware: String,
  status: { 
    type: String, 
    enum: ['online', 'offline', 'error'], 
    default: 'offline' 
  },
  lastSync: Date,
  lastError: String,
  totalLogsSynced: {
    type: Number,
    default: 0
  },
  enabled: { 
    type: Boolean, 
    default: true 
  }
}, { 
  timestamps: true 
});

deviceSchema.index({ host: 1, port: 1 });

export default mongoose.model('Device', deviceSchema);
