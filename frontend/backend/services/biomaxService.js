import Device from "../models/Device.js";

class BiomaxService {
  constructor(deviceConfig) {
    console.log("✅ NEW BiomaxService loaded (bridge mode)");
    this.deviceId = deviceConfig.id;
    this.host = deviceConfig.host;
    this.port = deviceConfig.port;
    this.enabled = deviceConfig.enabled !== false;
    this.bridgeBaseUrl = process.env.BIOMAX_BRIDGE_URL || "http://127.0.0.1:8001";
  }

  async updateDeviceStatus(status, errorMsg = null) {
    try {
      await Device.findOneAndUpdate(
        { deviceId: this.deviceId },
        { status, lastError: errorMsg, lastSync: status === "online" ? new Date() : undefined },
        { upsert: true }
      );
    } catch (err) {
      console.error("Failed to update device status:", err.message);
    }
  }

  async connectViaBridge() {
    const res = await fetch(`${this.bridgeBaseUrl}/device/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host: this.host, port: this.port })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) throw new Error(`Bridge connect failed: ${data?.error ?? res.status}`);
    return data;
  }

  parseBridgeTimestamp(t) {
    // Handle ISO string from C# bridge (already in UTC)
    if (typeof t === "string") {
      const d = new Date(t);
      if (!Number.isNaN(d.getTime())) return d;
    }
    // Handle timestamp number (milliseconds since epoch)
    if (typeof t === "number") {
      const d = new Date(t);
      if (!Number.isNaN(d.getTime())) return d;
    }
    // Handle Date object
    if (t instanceof Date) {
      if (!Number.isNaN(t.getTime())) return t;
    }
    // Handle object with nested timestamp field
    if (t && typeof t === "object") {
      const candidate = t.dateTime || t.value || t.timestamp;
      if (candidate) {
        const d = new Date(candidate);
        if (!Number.isNaN(d.getTime())) return d;
      }
    }
    return null;
  }

  async fetchAttendanceLogs(_ignoredLastSyncTime = null) {
    if (!this.enabled) return [];

    try {
      await this.connectViaBridge();

      const url = new URL(`${this.bridgeBaseUrl}/device/logs`);
      url.searchParams.set("host", this.host);
      url.searchParams.set("port", String(this.port));

      const res = await fetch(url.toString());
      const data = await res.json().catch(() => ({}));

      console.log("Bridge raw count:", (data.logs || []).length);

      if (!res.ok || !data?.success) {
        await this.updateDeviceStatus("error", `Bridge logs failed: ${data?.error ?? res.status}`);
        return [];
      }

      await this.updateDeviceStatus("online", null);

      const logs = (data.logs || [])
        .map((x) => {
          // accept both casing styles
          const userId = x.userId ?? x.UserId;
          const tsRaw = x.timestamp ?? x.Timestamp;
          const logType = x.logType ?? x.LogType;
          const verifyMode = x.verifyMode ?? x.VerifyMode;

          const ts = this.parseBridgeTimestamp(tsRaw);
          if (!userId || !ts) return null;

          return {
            deviceUserId: String(userId),
            timestamp: ts,
            logType,
            verifyMode
          };
        })
        .filter(Boolean);

      console.log("Bridge parsed count:", logs.length);
      if (logs.length === 0 && (data.logs || []).length > 0) {
        console.log("Bridge first raw log:", (data.logs || [])[0]);
      }

      return logs;
    } catch (err) {
      console.error("Error fetching logs:", err.message);
      await this.updateDeviceStatus("error", err.message);
      return [];
    }
  }
}

export default BiomaxService;
