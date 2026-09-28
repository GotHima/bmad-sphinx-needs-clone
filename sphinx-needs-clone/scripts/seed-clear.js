/**
 * Clear all seed data from the database.
 * The `open` status value (seeded by the app on startup) is preserved.
 *
 * Usage:
 *   npm run seed:clear
 */

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const DB_PATH = path.join(process.cwd(), '.data', 'db.sqlite')

if (!fs.existsSync(DB_PATH)) {
  console.error('Database not found at', DB_PATH)
  process.exit(1)
}

const db = new Database(DB_PATH)
db.pragma('foreign_keys = ON')

db.transaction(() => {
  db.prepare(`DELETE FROM need_link`).run()
  db.prepare(`DELETE FROM need`).run()
  db.prepare(`DELETE FROM need_type`).run()
  db.prepare(`DELETE FROM status_value WHERE value != 'open'`).run()
})()

const counts = {
  needs:  db.prepare(`SELECT COUNT(*) AS n FROM need`).get().n,
  types:  db.prepare(`SELECT COUNT(*) AS n FROM need_type`).get().n,
  links:  db.prepare(`SELECT COUNT(*) AS n FROM need_link`).get().n,
}

console.log('Cleared all seed data.')
console.log(`  needs: ${counts.needs} · types: ${counts.types} · links: ${counts.links}`)

db.close()
