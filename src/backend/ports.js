/**
 * Ports used by the use cases. Adapters (Supabase, fakes) must honour these contracts exactly.
 *
 * @typedef {{ today(): Promise<string>, realToday(): string }} Clock  // 'YYYY-MM-DD'
 * @typedef {{ cards: object[], cardsById: object, ridersById: object, balance: object }} Catalog
 * @typedef {{ load(): Promise<Catalog> }} CatalogReader
 * @typedef {{ kind: 'starter'|'daily', packDate: string, cards: object[] }} PackOpening
 * @typedef {{ expectedVersion: number, before: object, after: object, opening: PackOpening|null }} CollectionChange
 * @typedef {'ok'|'conflict'|'duplicate'} CommitOutcome
 * @typedef {{ load(userId: string): Promise<{ collection: object, version: number }>,
 *             commit(userId: string, change: CollectionChange): Promise<CommitOutcome> }} WalletRepository
 * @typedef {{ get(competitionId: string): Promise<object|null> }} CompetitionReader
 * @typedef {{ save(userId: string, competitionId: string, team: object): Promise<void> }} TeamRepository
 * @typedef {{ getSimulatedDate(): Promise<string|null>, setSimulatedDate(date: string|null): Promise<void> }} SettingsRepository
 */
module.exports = {};
