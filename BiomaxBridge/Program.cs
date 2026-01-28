using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// BIOMAX_MOCK=true => returns dummy logs so frontend/dev can work
bool mockMode =
    string.Equals(Environment.GetEnvironmentVariable("BIOMAX_MOCK"), "1", StringComparison.OrdinalIgnoreCase) ||
    string.Equals(Environment.GetEnvironmentVariable("BIOMAX_MOCK"), "true", StringComparison.OrdinalIgnoreCase);

var connections = new Dictionary<string, int>();

// ---- Startup check (SDK files near exe) ----
string[] required = new[]
{
    "FK623Attend.dll",
    "FKAttend.dll",
    "FKViaDev.dll",
    "FpDataConv.dll",
    "FaceDataConv.dll",
    "FKPwdEncDec.dll",
    "LFWViaDev.dll",
    "FKModelDic.ini"
};

var baseDir = AppContext.BaseDirectory;
Console.WriteLine($"📁 Running from: {baseDir}");

bool allFilesExist = true;
foreach (var f in required)
{
    var p = Path.Combine(baseDir, f);
    if (!File.Exists(p))
    {
        Console.WriteLine($"❌ MISSING: {p}");
        allFilesExist = false;
    }
    else
    {
        Console.WriteLine($"✅ Found: {f}");
    }
}

// FAIL if critical files are missing (unless in mock mode)
if (!allFilesExist && !mockMode)
{
    Console.WriteLine("🛑 FATAL: Critical SDK files are missing. Cannot proceed without device libraries.");
    Console.WriteLine("   Either place SDK files in the application directory, or set BIOMAX_MOCK=true for testing.");
    Environment.Exit(1);
}

Console.WriteLine($"🧪 Mock mode: {mockMode}");

// Connect/Disconnect from FKAttend.dll (exported FK_ConnectNet/FK_DisConnect) [image:1]
[DllImport("FKAttend.dll", EntryPoint = "FK_ConnectNet", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
static extern int FKConnectNet(int machineNumber, string ipAddress, int port, int netPassword, int timeOut, int protocolType, int license);

[DllImport("FKAttend.dll", EntryPoint = "FK_DisConnect", CallingConvention = CallingConvention.StdCall)]
static extern void FKDisConnect(int handleIndex);

// Logs/status from FK623Attend.dll [file:50]
[DllImport("FK623Attend.dll", CallingConvention = CallingConvention.StdCall)]
static extern int FKLoadGeneralLogData(int handleIndex);

[DllImport("FK623Attend.dll", CallingConvention = CallingConvention.StdCall)]
static extern int FKGetGeneralLogData(int handleIndex, ref int enrollNumber,
    ref int verifyMode, ref int inOutMode, ref int year, ref int month, ref int day,
    ref int hour, ref int minute);

[DllImport("FK623Attend.dll", CallingConvention = CallingConvention.StdCall)]
static extern int FKEmptyGeneralLogData(int handleIndex);

[DllImport("FK623Attend.dll", CallingConvention = CallingConvention.StdCall)]
static extern int FKGetDeviceStatus(int handleIndex, ref int adminCnt, ref int userCount,
    ref int fpCount, ref int pwdCount, ref int oplogCount, ref int attlogCount);

// Health
app.MapGet("/", async (HttpContext ctx) =>
{
    await ctx.Response.WriteAsJsonAsync(new
    {
        service = "BioMax Bridge",
        status = "running",
        mockMode,
        activeConnections = connections.Count,
        sdkFilesValidated = allFilesExist
    });
});

// Connect
app.MapPost("/device/connect", async (HttpContext ctx) =>
{
    try
    {
        var req = await ctx.Request.ReadFromJsonAsync<DeviceRequest>();
        if (req == null)
        {
            ctx.Response.StatusCode = 400;
            await ctx.Response.WriteAsJsonAsync(new { success = false, error = "Invalid request" });
            return;
        }

        var key = $"{req.Host}:{req.Port}";
        Console.WriteLine($"🔌 Connecting to {key}...");

        if (mockMode)
        {
            connections[key] = 999;
            await ctx.Response.WriteAsJsonAsync(new { success = true, handle = 999, message = "Mock connected" });
            return;
        }

        int handle = FKConnectNet(1, req.Host, req.Port, 0, 5000, 1, 0);

        if (handle > 0)
        {
            connections[key] = handle;
            await ctx.Response.WriteAsJsonAsync(new { success = true, handle, message = "Connected" });
        }
        else
        {
            ctx.Response.StatusCode = 400;
            await ctx.Response.WriteAsJsonAsync(new { success = false, error = handle });
        }
    }
    catch (Exception ex)
    {
        ctx.Response.StatusCode = 500;
        await ctx.Response.WriteAsJsonAsync(new { success = false, error = ex.Message });
    }
});

// Logs (IMPORTANT: Timestamp is ISO string now)
app.MapGet("/device/logs", async (HttpContext ctx) =>
{
    try
    {
        var host = ctx.Request.Query["host"].ToString();
        var portStr = ctx.Request.Query["port"].ToString();

        if (string.IsNullOrEmpty(host) || !int.TryParse(portStr, out int port))
        {
            ctx.Response.StatusCode = 400;
            await ctx.Response.WriteAsJsonAsync(new { success = false, error = "Missing host or port" });
            return;
        }

        var key = $"{host}:{port}";
        if (!connections.ContainsKey(key))
        {
            ctx.Response.StatusCode = 400;
            await ctx.Response.WriteAsJsonAsync(new { success = false, error = "Device not connected" });
            return;
        }

        if (mockMode)
        {
            var now = DateTime.UtcNow;

            var logs = new List<AttendanceLog>
            {
            new("10001", now.AddMinutes(-25).ToString("O"), "checkin",  "fingerprint"),
            new("10002", now.AddMinutes(-20).ToString("O"), "checkin",  "face"),
            new("10005", now.AddMinutes(-10).ToString("O"), "checkin",  "card"),
            new("10001", now.AddMinutes(-2).ToString("O"),  "checkout", "fingerprint")

            };

            await ctx.Response.WriteAsJsonAsync(new { success = true, logs, count = logs.Count });
            return;
        }

        int handle = connections[key];
        int load = FKLoadGeneralLogData(handle);
        if (load != 1)
        {
            ctx.Response.StatusCode = 400;
            await ctx.Response.WriteAsJsonAsync(new { success = false, error = load, logs = new List<AttendanceLog>() });
            return;
        }

        var list = new List<AttendanceLog>();
        int enrollNumber = 0, verifyMode = 0, inOutMode = 0;
        int year = 0, month = 0, day = 0, hour = 0, minute = 0;

        while (true)
        {
            int r = FKGetGeneralLogData(handle, ref enrollNumber, ref verifyMode, ref inOutMode,
                ref year, ref month, ref day, ref hour, ref minute);

            if (r != 1) break;

            // Create DateTime in local timezone as reported by device
            // Then convert to UTC for consistent storage
            DateTime localTime = new DateTime(year, month, day, hour, minute, 0, DateTimeKind.Local);
            DateTime utcTime = localTime.ToUniversalTime();

            list.Add(new AttendanceLog(
                UserId: enrollNumber.ToString(),
                Timestamp: utcTime.ToString("O"),  // ISO 8601 string in UTC
                LogType: inOutMode == 0 ? "checkin" : "checkout",
                VerifyMode: verifyMode switch
                {
                    0 => "fingerprint",
                    1 => "password",
                    2 => "card",
                    3 => "face",
                    _ => "fingerprint"
                }
            ));
        }

        FKEmptyGeneralLogData(handle);

        await ctx.Response.WriteAsJsonAsync(new { success = true, logs = list, count = list.Count });
    }
    catch (Exception ex)
    {
        ctx.Response.StatusCode = 500;
        await ctx.Response.WriteAsJsonAsync(new { success = false, error = ex.Message });
    }
});

// Status
app.MapGet("/device/status", async (HttpContext ctx) =>
{
    try
    {
        var host = ctx.Request.Query["host"].ToString();
        var portStr = ctx.Request.Query["port"].ToString();

        if (string.IsNullOrEmpty(host) || !int.TryParse(portStr, out int port))
        {
            ctx.Response.StatusCode = 400;
            await ctx.Response.WriteAsJsonAsync(new { success = false, error = "Missing host or port" });
            return;
        }

        var key = $"{host}:{port}";
        if (!connections.ContainsKey(key))
        {
            ctx.Response.StatusCode = 400;
            await ctx.Response.WriteAsJsonAsync(new { success = false, error = "Device not connected" });
            return;
        }

        if (mockMode)
        {
            await ctx.Response.WriteAsJsonAsync(new { success = true, admins = 1, users = 120, fingerprints = 80, passwords = 10, attendanceLogs = 345 });
            return;
        }

        int handle = connections[key];
        int adminCnt = 0, userCount = 0, fpCount = 0, pwdCount = 0, oplogCount = 0, attlogCount = 0;

        int result = FKGetDeviceStatus(handle, ref adminCnt, ref userCount, ref fpCount, ref pwdCount, ref oplogCount, ref attlogCount);

        if (result == 1)
            await ctx.Response.WriteAsJsonAsync(new { success = true, admins = adminCnt, users = userCount, fingerprints = fpCount, passwords = pwdCount, attendanceLogs = attlogCount });
        else
        {
            ctx.Response.StatusCode = 400;
            await ctx.Response.WriteAsJsonAsync(new { success = false, error = result });
        }
    }
    catch (Exception ex)
    {
        ctx.Response.StatusCode = 500;
        await ctx.Response.WriteAsJsonAsync(new { success = false, error = ex.Message });
    }
});

// Disconnect
app.MapPost("/device/disconnect", async (HttpContext ctx) =>
{
    try
    {
        var host = ctx.Request.Query["host"].ToString();
        var portStr = ctx.Request.Query["port"].ToString();

        if (string.IsNullOrEmpty(host) || !int.TryParse(portStr, out int port))
        {
            ctx.Response.StatusCode = 400;
            await ctx.Response.WriteAsJsonAsync(new { success = false, error = "Missing host or port" });
            return;
        }

        var key = $"{host}:{port}";

        if (mockMode)
        {
            connections.Remove(key);
            await ctx.Response.WriteAsJsonAsync(new { success = true, message = "Mock disconnected" });
            return;
        }

        if (!connections.TryGetValue(key, out var handle))
        {
            ctx.Response.StatusCode = 400;
            await ctx.Response.WriteAsJsonAsync(new { success = false, error = "Not connected" });
            return;
        }

        FKDisConnect(handle);
        connections.Remove(key);

        await ctx.Response.WriteAsJsonAsync(new { success = true });
    }
    catch (Exception ex)
    {
        ctx.Response.StatusCode = 500;
        await ctx.Response.WriteAsJsonAsync(new { success = false, error = ex.Message });
    }
});

Console.WriteLine("🚀 BioMax Bridge Service running on http://127.0.0.1:8001");
app.Run("http://127.0.0.1:8001");

record DeviceRequest(string Host, int Port);

// Timestamp as string fixes Node Invalid Date issues
record AttendanceLog(string UserId, string Timestamp, string LogType, string VerifyMode);
