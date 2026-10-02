import Foundation
import CoreFoundation
import Darwin

enum QuotaError: String, Error {
    case unavailableCLI, launchFailed, timeout, malformedResponse, serverRejected, missingWeeklyWindow
}

struct QuotaSnapshot {
    let used: Double
    let resetsAt: Double
    let observedAt: String
    var remaining: Double { 100 - used }
    // Floor avoids displaying 100% while some quota has already been consumed.
    var displayed: Int { Int(remaining.rounded(.down)) }
    var record: [String: Any] {
        ["used_percent": used, "remaining_percent": remaining, "displayed_percent": displayed,
         "window_minutes": 10080, "resets_at": resetsAt, "observed_at": observedAt,
         "source": "codex_app_server", "available": true]
    }
    static func parse(_ response: [String: Any], now: Date = Date()) throws -> QuotaSnapshot {
        guard response["error"] == nil, let result = response["result"] as? [String: Any] else { throw QuotaError.serverRejected }
        let buckets = result["rateLimitsByLimitId"] as? [String: Any]
        guard let bucket = (buckets?["codex"] as? [String: Any]) ?? (result["rateLimits"] as? [String: Any]),
              bucket["limitId"] == nil || bucket["limitId"] as? String == "codex" else { throw QuotaError.missingWeeklyWindow }
        for key in ["primary", "secondary"] {
            guard let w = bucket[key] as? [String: Any],
                  let mins = w["windowDurationMins"] as? NSNumber, CFGetTypeID(mins) != CFBooleanGetTypeID(), mins.doubleValue == 10080,
                  let used = w["usedPercent"] as? NSNumber, CFGetTypeID(used) != CFBooleanGetTypeID(),
                  used.doubleValue.isFinite, (0...100).contains(used.doubleValue),
                  let reset = w["resetsAt"] as? NSNumber, CFGetTypeID(reset) != CFBooleanGetTypeID(),
                  reset.doubleValue.isFinite, reset.doubleValue > now.timeIntervalSince1970 else { continue }
            return QuotaSnapshot(used: used.doubleValue, resetsAt: reset.doubleValue, observedAt: ISO8601DateFormatter().string(from: now))
        }
        throw QuotaError.missingWeeklyWindow
    }
}

// Only initialize + rateLimits/read; never creates a thread or starts inference.
// The official installed CLI handles its own existing sign-in. No credential files are read here.
final class QuotaReader {
    private let lock = NSLock()
    private var child: Process?
    static var executable: URL? {
        let paths = [
            "/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex",
            "/Applications/Codex.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex",
            "/Applications/Codex.app/Contents/Resources/codex",
            NSHomeDirectory()+"/.local/bin/codex", "/opt/homebrew/bin/codex"
        ]
        return paths.first(where: { FileManager.default.isExecutableFile(atPath: $0) }).map { URL(fileURLWithPath: $0) }
    }
    func stop() {
        lock.lock(); let p = child; lock.unlock()
        if let p, p.isRunning { p.terminate() }
    }
    func read() throws -> QuotaSnapshot {
        guard let executable = Self.executable else { throw QuotaError.unavailableCLI }
        let process = Process(), input = Pipe(), output = Pipe()
        process.executableURL = executable
        process.arguments = ["app-server", "--listen", "stdio://"]
        process.currentDirectoryURL = URL(fileURLWithPath: NSHomeDirectory())
        process.standardInput = input; process.standardOutput = output; process.standardError = FileHandle.nullDevice
        do { try process.run() } catch { throw QuotaError.launchFailed }
        lock.lock(); child = process; lock.unlock()
        let deadline = DispatchWorkItem { if process.isRunning { process.terminate() } }
        DispatchQueue.global().asyncAfter(deadline: .now()+25, execute: deadline)
        defer {
            deadline.cancel()
            try? input.fileHandleForWriting.close()
            if process.isRunning { process.terminate() }
            let pid = process.processIdentifier
            let killDeadline = DispatchWorkItem { if process.isRunning { kill(pid, SIGKILL) } }
            DispatchQueue.global().asyncAfter(deadline: .now()+2, execute: killDeadline)
            process.waitUntilExit(); killDeadline.cancel()
            try? output.fileHandleForReading.close()
            lock.lock(); if child === process { child = nil }; lock.unlock()
        }
        var buffer = Data()
        func send(_ message: [String: Any]) throws {
            var data = try JSONSerialization.data(withJSONObject: message); data.append(10)
            try input.fileHandleForWriting.write(contentsOf: data)
        }
        func response(_ id: Int) throws -> [String: Any] {
            while true {
                while let newline = buffer.firstIndex(of: 10) {
                    let line = buffer.prefix(upTo: newline); buffer.removeSubrange(...newline)
                    guard let object = (try? JSONSerialization.jsonObject(with: line)) as? [String: Any] else { continue }
                    if object["id"] as? Int == id { return object }
                }
                if buffer.count > 2_000_000 { throw QuotaError.malformedResponse }
                let chunk = output.fileHandleForReading.availableData
                if chunk.isEmpty { throw QuotaError.timeout }; buffer.append(chunk)
            }
        }
        try send(["id": 1, "method": "initialize", "params": ["clientInfo": ["name": "jingyan_pixel_companion", "title": "Codex 小幽灵", "version": "1.0.0"], "capabilities": [:]]])
        let initialized = try response(1)
        guard initialized["error"] == nil, initialized["result"] != nil else { throw QuotaError.serverRejected }
        try send(["method": "initialized"])
        try send(["id": 2, "method": "account/rateLimits/read", "params": NSNull()])
        return try QuotaSnapshot.parse(response(2))
    }
}
