export default {
  devices: [
    {
      id: 'fk_device_001',
      name: 'Main Entrance Device',
      model: 'N-WL20',
      serialNumber: 'AMDB23082B00851',
      host: '192.168.29.203',
      port: 5005,
      cloudId: 'C2630891E70C2D25',
      location: 'Main Building',
      firmware: 'A107A2Y2KblcQTbc v1.15',
      enabled: true
    }
  ],
  connection: {
    timeout: 5000,
    retries: 3,
    protocol: 'tcp'
  },
  sync: {
    intervalMinutes: 1,
    batchSize: 100,
    autoStart: true
  },
  attendance: {
    defaultVerifyMode: 'fingerprint',
    lateThresholdMinutes: 15,
    autoMarkAbsent: true
  }
};
