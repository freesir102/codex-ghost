import Foundation
func bucket(_ used: Any, minutes: Int = 10080, reset: Double = Date().timeIntervalSince1970+86400) -> [String: Any] {
    ["limitId": "codex", "primary": ["usedPercent": used, "windowDurationMins": minutes, "resetsAt": reset]]
}
func response(_ b: [String: Any]) -> [String: Any] { ["result": ["rateLimits": b]] }
let good = try QuotaSnapshot.parse(response(bucket(65)))
precondition(good.remaining == 35 && good.displayed == 35)
let zero = try QuotaSnapshot.parse(response(bucket(0))), fraction = try QuotaSnapshot.parse(response(bucket(0.1))), full = try QuotaSnapshot.parse(response(bucket(100)))
precondition(zero.displayed == 100 && fraction.displayed == 99 && full.displayed == 0)
for value in [-1.0,101.0,Double.nan,Double.infinity] {
    do { _ = try QuotaSnapshot.parse(response(bucket(value))); fatalError("invalid quota accepted") } catch {}
}
for b in [bucket(true), bucket("65"), bucket(65, minutes: 300), bucket(65,reset: 1)] {
    do { _ = try QuotaSnapshot.parse(response(b)); fatalError("invalid window accepted") } catch {}
}
var wrong = bucket(65); wrong["limitId"] = "other"
do { _ = try QuotaSnapshot.parse(response(wrong)); fatalError("wrong bucket accepted") } catch {}
let multi: [String: Any] = ["result": ["rateLimits": wrong, "rateLimitsByLimitId": ["codex": bucket(23)]]]
let multiple = try QuotaSnapshot.parse(multi)
precondition(multiple.displayed == 77)
print("PASS quota parser: primary/multibucket weekly remaining, floor, zero/full, wrong window/bucket, stale reset, invalid and boolean rejection")
if CommandLine.arguments.contains("--live") {
    let live = try QuotaReader().read()
    print(String(data: try JSONSerialization.data(withJSONObject: live.record, options: [.sortedKeys]), encoding: .utf8)!)
}
