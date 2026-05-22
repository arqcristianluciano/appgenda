// Firestore-based deployment: no legacy agenda_storage migration needed.
// Kept as no-op for callers in storage.ts; real data lands via backup import.

export async function needsMigration(_userId: string): Promise<boolean> {
  return false
}

export async function migrateOldData(_userId: string): Promise<boolean> {
  return false
}
