// Виджет «Сто лет»: сколько дней прошло с того, что делаешь редко.
//
// Дни считаются здесь, а не в приложении: виджет обновляется сам по таймлайну,
// и если положить в него готовое число, оно замрёт на дне последнего запуска.
// Приложение кладёт только даты, остальное арифметика.

import WidgetKit
import SwiftUI

private let groupId = "group.app.stolet.ios"
private let storeKey = "widget"

// MARK: - данные

struct Row: Decodable {
    /// название
    let t: String
    /// дата последней отметки, ISO; nil — ещё ни разу
    let a: String?
    /// срок в днях, если он известен
    let e: Int?
}

private struct Payload: Decodable {
    let v: Int
    let items: [Row]
}

private func readRows() -> [Row] {
    guard
        let raw = UserDefaults(suiteName: groupId)?.string(forKey: storeKey),
        let data = raw.data(using: .utf8),
        let payload = try? JSONDecoder().decode(Payload.self, from: data)
    else { return [] }
    return payload.items
}

/// JavaScript пишет дату с долями секунды, стандартный парсер их не берёт.
private func parseDate(_ iso: String) -> Date? {
    let withMs = ISO8601DateFormatter()
    withMs.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let d = withMs.date(from: iso) { return d }
    return ISO8601DateFormatter().date(from: iso)
}

/// Календарные дни, а не сутки: отметила вчера вечером — сегодня это «вчера».
private func daysSince(_ iso: String?, now: Date) -> Int? {
    guard let iso, let then = parseDate(iso) else { return nil }
    let cal = Calendar.current
    return cal.dateComponents([.day], from: cal.startOfDay(for: then), to: cal.startOfDay(for: now)).day
}

private func daysWord(_ n: Int) -> String {
    let a = abs(n) % 100, b = a % 10
    if a > 10 && a < 20 { return "дней" }
    if b > 1 && b < 5 { return "дня" }
    if b == 1 { return "день" }
    return "дней"
}

private func isDue(_ row: Row, now: Date) -> Bool {
    guard let every = row.e else { return false }
    guard let days = daysSince(row.a, now: now) else { return true }
    return days >= every
}

// MARK: - таймлайн

struct Entry: TimelineEntry {
    let date: Date
    let rows: [Row]
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry {
        Entry(date: Date(), rows: [Row(t: "Меняла линзы", a: nil, e: 30)])
    }

    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        completion(Entry(date: Date(), rows: readRows()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let rows = readRows()
        let cal = Calendar.current
        let start = cal.startOfDay(for: Date())
        // по записи на каждую ближайшую полночь: число тикает само, даже если
        // приложение не открывали неделю
        var entries = [Entry(date: Date(), rows: rows)]
        for day in 1...7 {
            if let d = cal.date(byAdding: .day, value: day, to: start) {
                entries.append(Entry(date: d, rows: rows))
            }
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

// MARK: - вид

private let lime = Color(red: 200 / 255, green: 1, blue: 74 / 255)
private let dim = Color(red: 154 / 255, green: 154 / 255, blue: 160 / 255)

struct Big: View {
    let row: Row
    let now: Date

    var body: some View {
        let days = daysSince(row.a, now: now)
        let due = isDue(row, now: now)
        VStack(alignment: .leading, spacing: 4) {
            Text(row.t)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(dim)
                .lineLimit(2)
            if let days {
                HStack(alignment: .firstTextBaseline, spacing: 5) {
                    Text("\(days)")
                        .font(.system(size: 40, weight: .heavy))
                        .monospacedDigit()
                        .foregroundStyle(due ? lime : .white)
                    Text(days == 0 ? "сегодня" : daysWord(days))
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(dim)
                }
            } else {
                Text("Ещё ни разу")
                    .font(.system(size: 19, weight: .bold))
                    .foregroundStyle(due ? lime : .white)
            }
        }
    }
}

struct Line: View {
    let row: Row
    let now: Date

    var body: some View {
        let days = daysSince(row.a, now: now)
        let due = isDue(row, now: now)
        HStack(spacing: 8) {
            Text(row.t)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(.white)
                .lineLimit(1)
            Spacer(minLength: 8)
            Text(days.map(String.init) ?? "—")
                .font(.system(size: 17, weight: .bold))
                .monospacedDigit()
                .foregroundStyle(due ? lime : dim)
        }
    }
}

struct Empty: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Сто лет")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(.white)
            Text("Добавь, что делаешь редко")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(dim)
        }
    }
}

struct WidgetView: View {
    @Environment(\.widgetFamily) var family
    var entry: Entry

    var body: some View {
        Group {
            if entry.rows.isEmpty {
                Empty()
            } else if family == .systemSmall {
                Big(row: entry.rows[0], now: entry.date)
            } else {
                VStack(alignment: .leading, spacing: 10) {
                    Big(row: entry.rows[0], now: entry.date)
                    ForEach(Array(entry.rows.dropFirst().prefix(2).enumerated()), id: \.offset) { _, row in
                        Line(row: row, now: entry.date)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .containerBackground(for: .widget) { Color(red: 11 / 255, green: 11 / 255, blue: 12 / 255) }
    }
}

@main
struct StoLetWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "StoLetWidget", provider: Provider()) { entry in
            WidgetView(entry: entry)
        }
        .configurationDisplayName("Сто лет")
        .description("Сколько прошло с того, что делаешь редко.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
