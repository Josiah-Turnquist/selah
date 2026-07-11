import SwiftUI
import WidgetKit

// MARK: - Shared snapshot
// Contract v1, written by the app (src/lib/widgets/snapshot.ts) into the
// App Group on every store persist. This side only renders — keep all
// content decisions in the JS layer, which ships over OTA.

private let appGroup = "group.com.josiahturnq.selah"
private let snapshotKey = "widgetSnapshot"

struct Snapshot: Decodable {
  struct PrayerSlot: Decodable {
    let at: Double
    let listId: String
    let listTitle: String
    let text: String
  }
  struct Prayer: Decodable {
    let empty: Bool
    let slots: [PrayerSlot]
  }
  struct Memory: Decodable {
    let empty: Bool
    let deckId: String?
    let ref: String?
    let cloze: String?
    let stage: String?
    let dueCount: Int
  }
  let v: Int
  let updatedAt: Double
  let prayer: Prayer
  let memory: Memory
}

func readSnapshot() -> Snapshot? {
  guard
    let defaults = UserDefaults(suiteName: appGroup),
    let raw = defaults.string(forKey: snapshotKey),
    let data = raw.data(using: .utf8)
  else { return nil }
  return try? JSONDecoder().decode(Snapshot.self, from: data)
}

// MARK: - Pray widget

struct PrayerEntry: TimelineEntry {
  let date: Date
  let listId: String?
  let listTitle: String?
  let text: String?
}

struct PrayerProvider: TimelineProvider {
  func placeholder(in _: Context) -> PrayerEntry {
    PrayerEntry(date: .now, listId: nil, listTitle: "Family", text: "A moment to pray")
  }

  func getSnapshot(in _: Context, completion: @escaping (PrayerEntry) -> Void) {
    completion(currentEntry())
  }

  func getTimeline(in _: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
    let now = Date()
    guard let snap = readSnapshot(), !snap.prayer.empty, !snap.prayer.slots.isEmpty else {
      let empty = PrayerEntry(date: now, listId: nil, listTitle: nil, text: nil)
      completion(Timeline(entries: [empty], policy: .after(now.addingTimeInterval(4 * 3600))))
      return
    }

    let all = snap.prayer.slots.map { slot in
      PrayerEntry(
        date: Date(timeIntervalSince1970: slot.at / 1000),
        listId: slot.listId,
        listTitle: slot.listTitle,
        text: slot.text
      )
    }
    let current = all.last(where: { $0.date <= now })
    let future = all.filter { $0.date > now }

    var entries: [PrayerEntry] = []
    if let current {
      entries.append(PrayerEntry(date: now, listId: current.listId, listTitle: current.listTitle, text: current.text))
    }
    entries.append(contentsOf: future)

    // A stale snapshot (app not opened in days) has no future slots left —
    // keep showing the last prompt and check back periodically instead of
    // re-requesting in a tight loop via .atEnd.
    if future.isEmpty {
      completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(4 * 3600))))
    } else {
      completion(Timeline(entries: entries, policy: .atEnd))
    }
  }

  private func currentEntry() -> PrayerEntry {
    let now = Date()
    guard let snap = readSnapshot(), !snap.prayer.empty,
          let slot = snap.prayer.slots.last(where: { Date(timeIntervalSince1970: $0.at / 1000) <= now })
            ?? snap.prayer.slots.first
    else {
      return PrayerEntry(date: now, listId: nil, listTitle: nil, text: nil)
    }
    return PrayerEntry(date: now, listId: slot.listId, listTitle: slot.listTitle, text: slot.text)
  }
}

struct PrayerWidgetView: View {
  var entry: PrayerEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text((entry.listTitle ?? "Pray").uppercased())
        .font(.system(size: 10, weight: .semibold))
        .kerning(0.9)
        .foregroundStyle(.secondary)
        .lineLimit(1)

      Spacer(minLength: 2)

      Text(entry.text ?? "Add someone to pray for")
        .font(.system(family == .systemMedium ? .title3 : .subheadline, design: .serif))
        .foregroundStyle(entry.text == nil ? .secondary : .primary)
        .lineLimit(family == .systemMedium ? 3 : 4)
        .minimumScaleFactor(0.9)

      Spacer(minLength: 0)

      if family == .systemMedium {
        Text("a moment to pray")
          .font(.system(.caption2, design: .serif).italic())
          .foregroundStyle(.tertiary)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .containerBackground(for: .widget) { Color(uiColor: .systemBackground) }
    .widgetURL(URL(string: entry.listId.map { "selah://prayer/\($0)" } ?? "selah://pray"))
  }
}

struct PrayerWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "PrayerWidget", provider: PrayerProvider()) { entry in
      PrayerWidgetView(entry: entry)
    }
    .configurationDisplayName("A moment to pray")
    .description("Rotates gently through your prayer requests.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

// MARK: - Memorize widget

struct MemoryEntry: TimelineEntry {
  let date: Date
  let deckId: String?
  let ref: String?
  let cloze: String?
  let stage: String?
  let dueCount: Int
}

struct MemoryProvider: TimelineProvider {
  func placeholder(in _: Context) -> MemoryEntry {
    MemoryEntry(date: .now, deckId: nil, ref: "John 3:16", cloze: "For ___ so _____ the world…", stage: "Learning", dueCount: 0)
  }

  func getSnapshot(in _: Context, completion: @escaping (MemoryEntry) -> Void) {
    completion(entry())
  }

  func getTimeline(in _: Context, completion: @escaping (Timeline<MemoryEntry>) -> Void) {
    // Content only changes when the app rewrites the snapshot (it reloads us
    // then); the periodic re-read is just a safety net.
    completion(Timeline(entries: [entry()], policy: .after(Date().addingTimeInterval(4 * 3600))))
  }

  private func entry() -> MemoryEntry {
    guard let snap = readSnapshot(), !snap.memory.empty else {
      return MemoryEntry(date: .now, deckId: nil, ref: nil, cloze: nil, stage: nil, dueCount: 0)
    }
    let m = snap.memory
    return MemoryEntry(date: .now, deckId: m.deckId, ref: m.ref, cloze: m.cloze, stage: m.stage, dueCount: m.dueCount)
  }
}

struct MemoryWidgetView: View {
  var entry: MemoryEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack(alignment: .firstTextBaseline) {
        Text(entry.ref ?? "Memorize")
          .font(.system(.subheadline, design: .serif).weight(.semibold))
          .foregroundStyle(.primary)
          .lineLimit(1)
        Spacer(minLength: 4)
        if entry.dueCount > 0 {
          Text("\(entry.dueCount) due")
            .font(.system(size: 10, weight: .semibold))
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Capsule().fill(Color.primary.opacity(0.08)))
            .foregroundStyle(.secondary)
        }
      }

      Spacer(minLength: 2)

      if let cloze = entry.cloze, !cloze.isEmpty {
        Text(cloze)
          .font(.system(.footnote, design: .serif))
          .foregroundStyle(.primary)
          .lineLimit(family == .systemMedium ? 4 : 5)
          .minimumScaleFactor(0.85)
      } else if entry.ref != nil {
        Text("Say it from memory.")
          .font(.system(.footnote, design: .serif).italic())
          .foregroundStyle(.secondary)
      } else {
        Text("Add a verse to memorize")
          .font(.system(.footnote, design: .serif))
          .foregroundStyle(.secondary)
      }

      Spacer(minLength: 0)

      if let stage = entry.stage {
        Text(stage.uppercased())
          .font(.system(size: 9, weight: .semibold))
          .kerning(0.9)
          .foregroundStyle(.tertiary)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .containerBackground(for: .widget) { Color(uiColor: .systemBackground) }
    .widgetURL(URL(string: entry.deckId.map { "selah://deck/\($0)/study?mode=recall&scope=all" } ?? "selah://study"))
  }
}

struct MemoryWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "MemoryWidget", provider: MemoryProvider()) { entry in
      MemoryWidgetView(entry: entry)
    }
    .configurationDisplayName("Verse in progress")
    .description("The verse you're memorizing, fading as you learn it.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

// MARK: - Bundle

@main
struct SelahWidgets: WidgetBundle {
  var body: some Widget {
    PrayerWidget()
    MemoryWidget()
  }
}
