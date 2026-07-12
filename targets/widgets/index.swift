import AppIntents
import SwiftUI
import WidgetKit

// MARK: - Shared snapshot
// Contract v1, written by the app (src/lib/widgets/snapshot.ts) into the
// App Group on every store persist. This side only renders — keep all
// content decisions in the JS layer, which ships over OTA.

private let appGroup = "group.com.josiahturnq.selah"
private let snapshotKey = "widgetSnapshot"

struct Snapshot: Decodable {
  struct PrayerItem: Decodable {
    let id: String
    let text: String
    let prayed: Bool
  }
  struct PrayerSlot: Decodable {
    let at: Double
    let listId: String
    let listTitle: String
    let text: String
    let items: [PrayerItem]?
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

// MARK: - Check-off inbox
// The widget can't touch the app's store, so a check-off appends to an
// inbox in the App Group; the app folds it in (idempotently) on its next
// launch or foreground. The provider overlays pending ids so the widget
// reflects the tap immediately.

private let actionsKey = "widgetActions"

struct PendingAction: Codable {
  let itemId: String
  let listId: String
  let dayKey: String
}

func readPendingActions() -> [PendingAction] {
  guard
    let defaults = UserDefaults(suiteName: appGroup),
    let raw = defaults.string(forKey: actionsKey),
    let data = raw.data(using: .utf8)
  else { return [] }
  return (try? JSONDecoder().decode([PendingAction].self, from: data)) ?? []
}

func localDayKey(_ date: Date = Date()) -> String {
  let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
  return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
}

struct MarkPrayedIntent: AppIntent {
  static var title: LocalizedStringResource = "Mark prayed"
  static var isDiscoverable = false

  @Parameter(title: "Item") var itemId: String
  @Parameter(title: "List") var listId: String

  init() {}
  init(itemId: String, listId: String) {
    self.itemId = itemId
    self.listId = listId
  }

  func perform() async throws -> some IntentResult {
    var pending = readPendingActions()
    if !pending.contains(where: { $0.itemId == itemId && $0.dayKey == localDayKey() }) {
      pending.append(PendingAction(itemId: itemId, listId: listId, dayKey: localDayKey()))
      if let data = try? JSONEncoder().encode(pending),
         let raw = String(data: data, encoding: .utf8) {
        UserDefaults(suiteName: appGroup)?.set(raw, forKey: actionsKey)
      }
    }
    WidgetCenter.shared.reloadTimelines(ofKind: "PrayerWidget")
    return .result()
  }
}

// MARK: - Pray widget

struct PrayerEntry: TimelineEntry {
  struct Item {
    let id: String
    let text: String
    let prayed: Bool
  }
  let date: Date
  let listId: String?
  let listTitle: String?
  let items: [Item]
}

// MARK: - Per-widget list choice
// The picker's options come from the snapshot in the App Group, so editing
// the widget works without the app running. "All lists" keeps the rotation.

struct PrayerListEntity: AppEntity {
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Prayer List"
  static var defaultQuery = PrayerListQuery()

  var id: String
  var title: String

  var displayRepresentation: DisplayRepresentation { .init(title: "\(title)") }

  static let all = PrayerListEntity(id: "", title: "All lists")
}

struct PrayerListQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [PrayerListEntity] {
    allOptions().filter { identifiers.contains($0.id) }
  }

  func suggestedEntities() async throws -> [PrayerListEntity] {
    allOptions()
  }

  func defaultResult() async -> PrayerListEntity? {
    .all
  }

  private func allOptions() -> [PrayerListEntity] {
    var out: [PrayerListEntity] = [.all]
    guard let snap = readSnapshot() else { return out }
    var seen = Set<String>()
    for slot in snap.prayer.slots where !seen.contains(slot.listId) {
      seen.insert(slot.listId)
      out.append(PrayerListEntity(id: slot.listId, title: slot.listTitle))
    }
    return out
  }
}

struct PrayerConfigIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "A moment to pray"
  static var description = IntentDescription("Choose which prayer list this widget shows.")

  @Parameter(title: "List") var list: PrayerListEntity?
}

struct PrayerProvider: AppIntentTimelineProvider {
  typealias Item = PrayerEntry.Item

  func placeholder(in _: Context) -> PrayerEntry {
    PrayerEntry(
      date: .now,
      listId: nil,
      listTitle: "Family",
      items: [Item(id: "", text: "A moment to pray", prayed: false)]
    )
  }

  func snapshot(for configuration: PrayerConfigIntent, in _: Context) async -> PrayerEntry {
    currentEntry(for: configuration)
  }

  func timeline(for configuration: PrayerConfigIntent, in _: Context) async -> Timeline<PrayerEntry> {
    let now = Date()
    let slots = chosenSlots(for: configuration)
    guard !slots.isEmpty else {
      let empty = PrayerEntry(date: now, listId: nil, listTitle: nil, items: [])
      return Timeline(entries: [empty], policy: .after(now.addingTimeInterval(4 * 3600)))
    }

    let pending = Set(readPendingActions().map(\.itemId))
    let all = slots.map { entry(for: $0, at: Date(timeIntervalSince1970: $0.at / 1000), pending: pending) }
    let current = all.last(where: { $0.date <= now })
    let future = all.filter { $0.date > now }

    var entries: [PrayerEntry] = []
    if let current {
      entries.append(PrayerEntry(date: now, listId: current.listId, listTitle: current.listTitle, items: current.items))
    }
    entries.append(contentsOf: future)

    // A stale snapshot (app not opened in days) has no future slots left —
    // keep showing the last prompt and check back periodically instead of
    // re-requesting in a tight loop via .atEnd.
    if future.isEmpty {
      return Timeline(entries: entries, policy: .after(now.addingTimeInterval(4 * 3600)))
    }
    return Timeline(entries: entries, policy: .atEnd)
  }

  /** The snapshot's slots, narrowed to the configured list. Falls back to
      the full rotation if the chosen list no longer has slots. */
  private func chosenSlots(for configuration: PrayerConfigIntent) -> [Snapshot.PrayerSlot] {
    guard let snap = readSnapshot(), !snap.prayer.empty else { return [] }
    let chosen = configuration.list?.id ?? ""
    if chosen.isEmpty { return snap.prayer.slots }
    let filtered = snap.prayer.slots.filter { $0.listId == chosen }
    return filtered.isEmpty ? snap.prayer.slots : filtered
  }

  private func entry(for slot: Snapshot.PrayerSlot, at date: Date, pending: Set<String>) -> PrayerEntry {
    // Older snapshots (written before the app updated) carry only `text`.
    let items = (slot.items ?? [Snapshot.PrayerItem(id: "", text: slot.text, prayed: false)]).map {
      Item(id: $0.id, text: $0.text, prayed: $0.prayed || pending.contains($0.id))
    }
    return PrayerEntry(date: date, listId: slot.listId, listTitle: slot.listTitle, items: items)
  }

  private func currentEntry(for configuration: PrayerConfigIntent) -> PrayerEntry {
    let now = Date()
    let slots = chosenSlots(for: configuration)
    guard let slot = slots.last(where: { Date(timeIntervalSince1970: $0.at / 1000) <= now }) ?? slots.first
    else {
      return PrayerEntry(date: now, listId: nil, listTitle: nil, items: [])
    }
    return entry(for: slot, at: now, pending: Set(readPendingActions().map(\.itemId)))
  }
}

struct PrayerWidgetView: View {
  var entry: PrayerEntry
  @Environment(\.widgetFamily) private var family

  private var rowLimit: Int { family == .systemMedium ? 3 : 2 }

  var body: some View {
    VStack(alignment: .leading, spacing: family == .systemMedium ? 6 : 4) {
      HStack(alignment: .firstTextBaseline) {
        Text((entry.listTitle ?? "Pray").uppercased())
          .font(.system(size: 10, weight: .semibold))
          .kerning(0.9)
          .foregroundStyle(.secondary)
          .lineLimit(1)
        Spacer(minLength: 4)
        if entry.items.count > rowLimit {
          Text("+\(entry.items.count - rowLimit)")
            .font(.system(size: 10, weight: .semibold))
            .foregroundStyle(.tertiary)
        }
      }

      if entry.items.isEmpty {
        Spacer(minLength: 2)
        Text("Add someone to pray for")
          .font(.system(.footnote, design: .serif))
          .foregroundStyle(.secondary)
        Spacer(minLength: 0)
      } else {
        Spacer(minLength: 0)
        ForEach(entry.items.prefix(rowLimit), id: \.id) { item in
          HStack(alignment: .center, spacing: 7) {
            if item.id.isEmpty {
              Circle()
                .strokeBorder(Color.primary.opacity(0.35), lineWidth: 1.5)
                .frame(width: 15, height: 15)
            } else {
              Button(intent: MarkPrayedIntent(itemId: item.id, listId: entry.listId ?? "")) {
                // Prayed reads as rest, not a spotlight: a faint check, and
                // the words recede with it.
                Image(systemName: item.prayed ? "checkmark.circle.fill" : "circle")
                  .font(.system(size: 15, weight: .light))
                  .foregroundStyle(item.prayed ? Color.primary.opacity(0.3) : Color.primary.opacity(0.45))
              }
              .buttonStyle(.plain)
            }
            Text(item.text)
              .font(.system(family == .systemMedium ? .subheadline : .footnote, design: .serif))
              .foregroundStyle(item.prayed ? .tertiary : .primary)
              .lineLimit(1)
              .minimumScaleFactor(0.9)
          }
        }
        Spacer(minLength: 0)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .containerBackground(for: .widget) { Color(uiColor: .systemBackground) }
    .widgetURL(URL(string: entry.listId.map { "selah://prayer/\($0)" } ?? "selah://pray"))
  }
}

struct PrayerWidget: Widget {
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: "PrayerWidget", intent: PrayerConfigIntent.self, provider: PrayerProvider()) { entry in
      PrayerWidgetView(entry: entry)
    }
    .configurationDisplayName("A moment to pray")
    .description("Your prayer requests — pick a list, or rotate through them all.")
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
