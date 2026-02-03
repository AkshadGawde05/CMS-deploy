import Device from '../models/Device.js';
import BiomaxService from '../services/biomaxService.js';

export const getAllDevices = async (req, res) => {
  try {
    const devices = await Device.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      devices
    });

  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

export const createDevice = async (req, res) => {
  try {
    const { deviceId, name, host, port, location, model, serialNumber, cloudId } = req.body;

    if (!deviceId || !name || !host || !port) {
      return res.status(400).json({
        success: false,
        message: 'deviceId, name, host, and port are required'
      });
    }

    const existing = await Device.findOne({ deviceId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Device with this ID already exists'
      });
    }

    const device = new Device({
      deviceId,
      name,
      host,
      port,
      location,
      model: model || 'N-WL20',
      serialNumber,
      cloudId,
      enabled: true
    });

    await device.save();

    res.status(201).json({
      success: true,
      message: 'Device added successfully',
      device
    });

  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

export const updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const device = await Device.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    res.json({
      success: true,
      message: 'Device updated',
      device
    });

  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

export const deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findByIdAndDelete(id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    res.json({
      success: true,
      message: 'Device deleted'
    });

  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

export const testConnection = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findById(id);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const service = new BiomaxService({
      id: device.deviceId,
      host: device.host,
      port: device.port,
      enabled: device.enabled
    });

    const result = await service.testConnection();

    res.json({
      success: true,
      ...result
    });

  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};
