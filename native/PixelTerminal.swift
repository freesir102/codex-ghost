import AppKit
import WebKit
import CryptoKit

let buildID = "2026-10-02-native-r12"
func sha256(_ url: URL) -> String { ((try? Data(contentsOf: url)).map { SHA256.hash(data: $0).map { String(format: "%02x", $0) }.joined() }) ?? "unavailable" }
final class CompanionWindow: NSWindow { override var canBecomeKey: Bool { true }; override var canBecomeMain: Bool { true } }

final class Companion: NSObject, NSApplicationDelegate, WKNavigationDelegate, NSWindowDelegate {
    var window: NSWindow!
    var web: WKWebView!
    var timer: Timer?
    let reader = QuotaReader()
    var busy = false, ready = false, validating = false
    var instanceFD: Int32 = -1
    var lastSuccess: Date?
    var useSmallScreen = false
    var latest: QuotaSnapshot?
    var rows = [[String: Any]]()
    let storage = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("CodexPixelCompanion", isDirectory: true)
    var evidence: URL { storage.appendingPathComponent("validation", isDirectory: true) }
    func write(_ object: Any, _ name: String, at directory: URL? = nil) {
        let dir = directory ?? storage
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        if let data = try? JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys]) { try? data.write(to: dir.appendingPathComponent(name), options: .atomic) }
    }
    func event(_ entry: [String: Any]) {
        var record = entry; record["time"] = ISO8601DateFormatter().string(from: Date()); record["build"] = buildID
        let url = storage.appendingPathComponent("events.json")
        var history = ((try? Data(contentsOf: url)).flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [[String: Any]]) ?? []
        history.append(record); write(Array(history.suffix(100)), "events.json")
    }
    func applicationDidFinishLaunching(_ notification: Notification) {
        let identity = Bundle.main.bundleIdentifier!
        try? FileManager.default.createDirectory(at: storage, withIntermediateDirectories: true)
        instanceFD = open(storage.appendingPathComponent("instance.lock").path, O_CREAT|O_RDWR, 0o600)
        guard instanceFD >= 0 else { NSApp.terminate(nil); return }
        if flock(instanceFD, LOCK_EX|LOCK_NB) != 0 {
            NSRunningApplication.runningApplications(withBundleIdentifier: identity).first(where: { $0.processIdentifier != getpid() })?.activate(options: [.activateAllWindows])
            close(instanceFD); instanceFD = -1; NSApp.terminate(nil); return
        }
        NSApp.setActivationPolicy(.regular)
        let menu = NSMenu(), appMenu = NSMenu(), root = NSMenuItem(); root.submenu = appMenu; menu.addItem(root)
        func item(_ title: String, _ selector: Selector, _ key: String = "") { let m = NSMenuItem(title: title, action: selector, keyEquivalent: key); m.target = self; appMenu.addItem(m) }
        item("刷新额度", #selector(refresh), "r")
        item("全屏／退出全屏", #selector(fullscreen), "f")
        appMenu.addItem(.separator())
        item("动画预览（八种示例状态）", #selector(validateAnimations))
        item("小动作预览（五种）", #selector(validateMoments))
        item("返回实时额度", #selector(returnToLive))
        appMenu.addItem(.separator())
        let hide = NSMenuItem(title: "隐藏 Codex 小幽灵", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        hide.target = NSApp; appMenu.addItem(hide)
        item("退出 Codex 小幽灵", #selector(quit), "q"); NSApp.mainMenu = menu
        let config = WKWebViewConfiguration(); config.websiteDataStore = .nonPersistent()
        // Bundled markup only. No browser/navigation bridge, file picker, camera, or remote content.
        web = WKWebView(frame: NSRect(x: 0, y: 0, width: 1280, height: 720), configuration: config)
        web.navigationDelegate = self; web.setValue(false, forKey: "drawsBackground")
        let screen = NSScreen.screens.first { $0.localizedName.lowercased().contains("wokyis") }
        let frame = screen?.frame ?? NSRect(x: 0, y: 0, width: 960, height: 540)
        useSmallScreen = screen != nil
        window = CompanionWindow(contentRect: frame, styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Codex 小幽灵"; window.backgroundColor = .black; window.delegate = self
        window.contentView = web; window.minSize = NSSize(width: 640, height: 360)
        window.collectionBehavior = [.fullScreenPrimary]; window.isReleasedWhenClosed = false
        if let screen { window.setFrame(screen.frame, display: false) }
        if screen == nil { window.center(); window.setFrameAutosaveName("PixelCompanion") }
        window.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
        guard let htmlURL = Bundle.main.url(forResource: "index", withExtension: "html"), let original = try? String(contentsOf: htmlURL, encoding: .utf8) else {
            let alert = NSAlert(); alert.messageText = "应用资源缺失"; alert.informativeText = "无法读取包内界面，请重新安装本应用。"; alert.runModal(); NSApp.terminate(nil); return
        }
        // Native startup never briefly renders the prototype's sample 65%.
        let html = original.replacingOccurrences(of: "progress:65,date:null,time:null", with: "progress:null,date:null,time:null")
            .replacingOccurrences(of: "像素陪伴终端设计原型：示例进度、当地日期与时间", with: "Codex 每周剩余额度、当地日期与时间")
        web.loadHTMLString(html, baseURL: nil)
        write(["build": buildID, "bundle": Bundle.main.bundleURL.path, "pid": getpid(), "html_sha256": sha256(htmlURL),
               "executable_sha256": sha256(Bundle.main.executableURL!), "observed_at": ISO8601DateFormatter().string(from: Date()),
               "screens": NSScreen.screens.map { ["name": $0.localizedName, "width": $0.frame.width, "height": $0.frame.height] },
               "selected_screen": screen?.localizedName ?? "default", "actual_window_screen": window.screen?.localizedName ?? "unknown", "window_frame": NSStringFromRect(window.frame), "source_cli": QuotaReader.executable?.path ?? "unavailable"], "launch.json")
        event(["event": "launch", "bundle": Bundle.main.bundleURL.path])
    }
    // Finder/Dock reopening is a user request to show the existing window,
    // including its full-screen Space. Never restart the quota reader or create
    // a second window, and never steal focus on periodic quota updates.
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        guard let window else { return true }
        let wasHidden = sender.isHidden, wasMiniaturized = window.isMiniaturized
        sender.unhide(nil)
        if wasMiniaturized { window.deminiaturize(nil) }
        window.makeKeyAndOrderFront(nil)
        sender.activate(ignoringOtherApps: true)
        event(["event": "reopen", "had_visible_windows": flag, "was_hidden": wasHidden,
               "was_miniaturized": wasMiniaturized, "window_visible": window.isVisible,
               "native_fullscreen": window.styleMask.contains(.fullScreen),
               "actual_screen": window.screen?.localizedName ?? "unknown", "pid": getpid()])
        return false
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        decisionHandler(navigationAction.request.url?.absoluteString == "about:blank" ? .allow : .cancel)
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        web.evaluateJavaScript("typeof window.pixelTerminal.setState === 'function'") { value, error in
            self.ready = error == nil && value as? Bool == true
            self.event(["event": "web_ready", "ready": self.ready])
            if self.ready {
                if self.useSmallScreen { self.window.toggleFullScreen(nil) }
                self.refresh(); self.timer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { _ in self.refresh() }
            }
        }
    }
    func update(_ state: [String: Any], completion: ((Any?, Error?) -> Void)? = nil) {
        guard let data = try? JSONSerialization.data(withJSONObject: state), let json = String(data: data, encoding: .utf8) else { return }
        web.evaluateJavaScript("window.pixelTerminal.setState(\(json)); JSON.stringify(window.pixelTerminal.getState())", completionHandler: completion)
    }
    @objc func refresh() {
        guard ready, !busy else { return }; busy = true
        DispatchQueue.global(qos: .utility).async {
            var result = Result { try self.reader.read() }
            // A single bounded retry handles transient service rejection, never authentication changes.
            if case .failure = result {
                Thread.sleep(forTimeInterval: 3)
                result = Result { try self.reader.read() }
            }
            DispatchQueue.main.async {
                self.busy = false
                switch result {
                case .success(let snapshot):
                    self.latest = snapshot; self.lastSuccess = Date(); self.write(snapshot.record, "quota.json")
                    let observed = self.lastSuccess!
                    DispatchQueue.main.asyncAfter(deadline: .now()+min(120, snapshot.resetsAt-Date().timeIntervalSince1970)) {
                        guard self.lastSuccess == observed else { return }
                        self.latest = nil
                        self.event(["event": "quota_result_expired"])
                        if !self.validating { self.update(["progress": NSNull()]) }
                    }
                    self.event(["event": "quota_refresh", "available": true, "remaining_percent": snapshot.remaining, "displayed_percent": snapshot.displayed, "observed_at": snapshot.observedAt])
                    if !self.validating {
                        self.update(["progress": snapshot.displayed, "date": NSNull(), "time": NSNull()]) { value, error in
                            self.write(["build": buildID, "quota": snapshot.record, "actual_webview_state": value ?? NSNull(), "javascript_ok": error == nil, "bundle": Bundle.main.bundleURL.path], "live-view-check.json", at: self.evidence)
                            self.capture("live") { _ in }
                        }
                    }
                case .failure(let error):
                    let reason = (error as? QuotaError)?.rawValue ?? "unavailable"
                    let fresh = self.lastSuccess.map { Date().timeIntervalSince($0) < 120 && (self.latest?.resetsAt ?? 0) > Date().timeIntervalSince1970 } ?? false
                    if !fresh { self.latest = nil }
                    self.write(["available": false, "reason": reason, "observed_at": ISO8601DateFormatter().string(from: Date()), "displaying_recent_result": fresh, "last_success": self.lastSuccess.map { ISO8601DateFormatter().string(from: $0) } as Any? ?? NSNull()], "quota.json")
                    self.event(["event": "quota_refresh", "available": false, "reason": reason, "displaying_recent_result": fresh])
                    if !self.validating && !fresh { self.update(["progress": NSNull(), "date": NSNull(), "time": NSNull()]) }
                }
            }
        }
    }
    @objc func returnToLive() {
        validating = false
        web.evaluateJavaScript("window.pixelTerminal.stopMomentPreview()", completionHandler: nil)
        update(["progress": latest.map { $0.displayed } as Any? ?? NSNull(), "date": NSNull(), "time": NSNull()]); refresh()
    }
    @objc func fullscreen() { window.toggleFullScreen(nil) }
    func window(_ window: NSWindow, willUseFullScreenPresentationOptions proposedOptions: NSApplication.PresentationOptions) -> NSApplication.PresentationOptions {
        proposedOptions.union([.autoHideMenuBar, .autoHideDock])
    }
    func windowDidEnterFullScreen(_ notification: Notification) { event(["event": "fullscreen_entered", "native_fullscreen": window.styleMask.contains(.fullScreen), "actual_screen": window.screen?.localizedName ?? "unknown", "presentation_options": NSApp.presentationOptions.rawValue]) }
    func windowDidExitFullScreen(_ notification: Notification) { event(["event": "fullscreen_exited", "native_fullscreen": window.styleMask.contains(.fullScreen)]) }
    @objc func quit() { NSApp.terminate(nil) }
    func windowShouldClose(_ sender: NSWindow) -> Bool { NSApp.terminate(nil); return true }
    func applicationWillTerminate(_ notification: Notification) {
        timer?.invalidate(); reader.stop()
        if instanceFD >= 0 { event(["event": "quit"]); flock(instanceFD, LOCK_UN); close(instanceFD); instanceFD = -1 }
    }
    // Runs in the real visible WKWebView and takes two actual native snapshots per state.
    // Menu-only synthetic check, never mixed into live quota records; automatically returns to live.
    @objc func validateAnimations() {
        guard ready, !validating else { return }; validating = true; rows = []
        try? FileManager.default.createDirectory(at: evidence, withIntermediateDirectories: true)
        event(["event": "animation_validation_started", "synthetic": true]); validateState(0)
    }
    // The same live rAF path drives these five short, explicitly synthetic moments.
    // Actual host snapshots are taken before, during and after each action.
    @objc func validateMoments() {
        guard ready, !validating else { return }; validating = true; rows = []
        try? FileManager.default.createDirectory(at: evidence, withIntermediateDirectories: true)
        event(["event": "moments_validation_started", "synthetic": true]); validateMoment(0)
    }
    func validateMoment(_ index: Int) {
        guard validating else { return }
        let kinds = ["apple-bite", "shy-kiss", "sleepy-yawn", "little-wave", "playful-wink"]
        if index == kinds.count {
            write(["build": buildID, "observed_at": ISO8601DateFormatter().string(from: Date()), "renderer": "native WKWebView", "moments": rows], "moments-check.json", at: evidence)
            event(["event": "moments_validation_finished", "moments": rows.count]); returnToLive(); return
        }
        let kind = kinds[index], p = index < 2 ? 30 : 65, time = index == 2 ? "23:41" : "13:41", label = "moment-" + kind
        update(["progress": p, "date": "2026-10-2", "time": time]) { _, error in
            guard self.validating else { return }
            if error != nil { self.rows.append(["moment": kind, "error": "state_update_failed"]); self.validateMoment(index+1); return }
            self.web.evaluateJavaScript("window.pixelTerminal.startMomentPreview('\(kind)')") { _, error in
                if error != nil { self.rows.append(["moment": kind, "error": "preview_start_failed"]); self.validateMoment(index+1); return }
                DispatchQueue.main.asyncAfter(deadline: .now()+0.3) {
                    guard self.validating else { return }
                    self.capture(label+"-a") { a in
                        self.web.evaluateJavaScript("document.getElementById('terminal').innerHTML") { svgA, _ in
                            DispatchQueue.main.asyncAfter(deadline: .now()+1.9) {
                                guard self.validating else { return }
                                self.capture(label+"-b") { b in
                                    self.web.evaluateJavaScript("JSON.stringify({state:window.pixelTerminal.getState(),moment:window.pixelTerminal.getMomentStatus(),svg:document.getElementById('terminal').innerHTML,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches})") { value, _ in
                                        let object = (value as? String).flatMap { $0.data(using: .utf8) }.flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [String: Any]
                                        let svgB = object?["svg"] as? String
                                        DispatchQueue.main.asyncAfter(deadline: .now()+6.0) {
                                            guard self.validating else { return }
                                            self.capture(label+"-c") { c in
                                                self.web.evaluateJavaScript("JSON.stringify({state:window.pixelTerminal.getState(),moment:window.pixelTerminal.getMomentStatus(),svg:document.getElementById('terminal').innerHTML})") { final, _ in
                                                    let after = (final as? String).flatMap { $0.data(using: .utf8) }.flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [String: Any]
                                                    self.rows.append(["moment": kind, "progress": p, "time": time, "synthetic": true,
                                                        "readback": object?["state"] ?? NSNull(), "active_status": object?["moment"] ?? NSNull(),
                                                        "reduced_motion": object?["reduced"] ?? NSNull(), "after_status": after?["moment"] ?? NSNull(),
                                                        "after_readback": after?["state"] ?? NSNull(), "active_marker_observed": svgB?.contains("data-moment=\"\(kind)\"") ?? false,
                                                        "returned_to_ordinary": !((after?["svg"] as? String)?.contains("data-moment=") ?? true),
                                                        "svg_changed": (svgA as? String) != svgB, "snapshot_a": a ?? "failed", "snapshot_b": b ?? "failed", "snapshot_c": c ?? "failed",
                                                        "sample_delays_seconds": [0.3,2.2,8.2]])
                                                    self.validateMoment(index+1)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    func validateState(_ index: Int) {
        guard validating else { return }
        if index == 8 {
            write(["build": buildID, "observed_at": ISO8601DateFormatter().string(from: Date()), "renderer": "native WKWebView", "states": rows], "animation-check.json", at: evidence)
            event(["event": "animation_validation_finished", "states": rows.count]); returnToLive(); return
        }
        let p = [30,65,85,100][index/2], time = index%2 == 0 ? "13:41" : "23:41", label = "\(p)-\(index%2 == 0 ? "day" : "night")"
        update(["progress": p, "date": "2026-9-30", "time": time]) { _, error in
            if error != nil { self.rows.append(["state": label, "error": "state_update_failed"]); self.validateState(index+1); return }
            DispatchQueue.main.asyncAfter(deadline: .now()+0.3) {
                self.capture(label+"-a") { a in
                    self.web.evaluateJavaScript("document.getElementById('terminal').innerHTML") { svgA, _ in
                        DispatchQueue.main.asyncAfter(deadline: .now()+1.2) {
                            self.capture(label+"-b") { b in
                                self.web.evaluateJavaScript("JSON.stringify({state:window.pixelTerminal.getState(),svg:document.getElementById('terminal').innerHTML,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches})") { value, _ in
                                    let object = (value as? String).flatMap { $0.data(using: .utf8) }.flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [String: Any]
                                    let svgB = object?["svg"] as? String
                                    // Three fixed-time samples avoid aliasing a quantized 1–2 px float.
                                    // Retain equal A/B frames as observed; don't replace them with a favorable pair.
                                    DispatchQueue.main.asyncAfter(deadline: .now()+0.7) {
                                        self.capture(label+"-c") { c in
                                            self.web.evaluateJavaScript("document.getElementById('terminal').innerHTML") { svgC, _ in
                                                self.rows.append(["state": label, "progress": p, "time": time, "synthetic": true, "readback": object?["state"] ?? NSNull(), "reduced_motion": object?["reduced"] ?? NSNull(), "svg_changed": (svgA as? String) != svgB || (svgA as? String) != (svgC as? String), "snapshot_a": a ?? "failed", "snapshot_b": b ?? "failed", "snapshot_c": c ?? "failed", "snapshots_changed": a != nil && b != nil && c != nil && (a != b || a != c), "sample_delays_seconds": [0,1.2,1.9], "apple_observed": (svgC as? String)?.contains("data-accessory=\"apple\"") ?? false, "obsolete_coffee_observed": [svgA as? String,svgB,svgC as? String].compactMap { $0 }.contains { $0.contains("data-accessory=\"cup\"") || $0.contains("data-accessory=\"steam\"") }, "kiss_observed": [svgA as? String,svgB,svgC as? String].compactMap { $0 }.contains { $0.contains("data-expression=\"kiss\"") }])
                                                self.validateState(index+1)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    func capture(_ name: String, completion: @escaping (String?) -> Void) {
        let config = WKSnapshotConfiguration()
        web.takeSnapshot(with: config) { image, _ in
            guard let tiff = image?.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff), let png = rep.representation(using: .png, properties: [:]) else { completion(nil); return }
            let url = self.evidence.appendingPathComponent(name+".png")
            do { try png.write(to: url, options: .atomic); completion(sha256(url)) } catch { completion(nil) }
        }
    }
}
@main struct PixelCompanionMain {
    static func main() {
        let application = NSApplication.shared
        let companion = Companion()
        application.delegate = companion
        withExtendedLifetime(companion) { application.run() }
    }
}
