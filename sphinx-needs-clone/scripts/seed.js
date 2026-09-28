/**
 * Seed script — Digital Car Key project example data
 *
 * Usage:
 *   npm run seed
 *
 * The app must have been started at least once (`npm run dev`) so that
 * the database and schema exist before this script runs.
 */

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const DB_DIR = path.join(process.cwd(), '.data')
const DB_PATH = path.join(DB_DIR, 'db.sqlite')
const RESET = process.argv.includes('--reset')

if (!fs.existsSync(DB_PATH)) {
  console.error('Database not found at', DB_PATH)
  console.error('Run `npm run dev` first to initialise the database, then re-run this script.')
  process.exit(1)
}

const db = new Database(DB_PATH)
db.pragma('foreign_keys = ON')

const seed = db.transaction(() => {
  // ── Optional reset — wipe existing seed data before re-inserting ──────────
  if (RESET) {
    db.prepare(`DELETE FROM need_link`).run()
    db.prepare(`DELETE FROM need`).run()
    db.prepare(`DELETE FROM need_type`).run()
    db.prepare(`DELETE FROM status_value WHERE value != 'open'`).run()
    console.log('Reset: cleared existing data.')
  }

  // ── Need Types ────────────────────────────────────────────────────────────
  const insertType = db.prepare(
    `INSERT OR IGNORE INTO need_type (name, prefix, color) VALUES (?, ?, ?)`
  )
  insertType.run('Requirement',    'REQ',  '#2563EB')
  insertType.run('Specification',  'SPEC', '#7C3AED')
  insertType.run('Test Case',      'TEST', '#16A34A')
  insertType.run('Implementation', 'IMPL', '#EA580C')

  // ── Status Values ─────────────────────────────────────────────────────────
  const insertStatus = db.prepare(`INSERT OR IGNORE INTO status_value (value) VALUES (?)`)
  insertStatus.run('in-progress')
  insertStatus.run('in-review')
  insertStatus.run('verified')
  insertStatus.run('closed')

  // ── Look up type IDs by prefix ────────────────────────────────────────────
  const getTypeId = db.prepare(`SELECT id FROM need_type WHERE prefix = ?`)
  const reqId  = getTypeId.get('REQ').id
  const specId = getTypeId.get('SPEC').id
  const testId = getTypeId.get('TEST').id
  const implId = getTypeId.get('IMPL').id

  const now = new Date().toISOString()

  const insertNeed = db.prepare(`
    INSERT OR IGNORE INTO need
      (id, type_id, title, status, tags, description, seq, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  // ── Requirements ──────────────────────────────────────────────────────────
  const requirements = [
    {
      id: 'REQ_001', seq: 1, status: 'verified',
      title: 'BLE Communication for Vehicle Access',
      tags: 'ble,connectivity,access',
      description:
        'The system shall support Bluetooth Low Energy (BLE) communication to enable ' +
        'smartphone-to-vehicle proximity detection and secure channel establishment for ' +
        'digital key operations.',
    },
    {
      id: 'REQ_002', seq: 2, status: 'verified',
      title: 'UWB Precise Positioning for Authentication',
      tags: 'uwb,positioning,security',
      description:
        'The system shall use Ultra-Wideband (UWB) ranging to authenticate the digital ' +
        'key based on physical proximity, preventing relay attacks that are possible with ' +
        'BLE-only systems.',
    },
    {
      id: 'REQ_003', seq: 3, status: 'in-progress',
      title: 'Digital Key Sharing Between Authorized Users',
      tags: 'sharing,access-control',
      description:
        'The system shall allow the primary key holder to share a digital key with other ' +
        'authorized users, with configurable permissions (e.g. drive-only, full access) ' +
        'and an optional expiry time.',
    },
    {
      id: 'REQ_004', seq: 4, status: 'in-progress',
      title: 'Remote Key Revocation via Cloud',
      tags: 'revocation,cloud,security',
      description:
        'The system shall allow the vehicle owner to remotely revoke any issued digital ' +
        'key through a cloud service. Revocation shall propagate to the vehicle and the ' +
        "key holder's device within a defined time window.",
    },
    {
      id: 'REQ_005', seq: 5, status: 'open',
      title: 'Passive Entry — Proximity-Triggered Unlock',
      tags: 'passive-entry,ux,ble',
      description:
        'The system shall automatically unlock the vehicle when the authenticated key ' +
        'holder approaches within 1.5 metres, without requiring any button press or ' +
        'app interaction.',
    },
    {
      id: 'REQ_006', seq: 6, status: 'verified',
      title: 'Key Credentials Stored in Secure Enclave',
      tags: 'security,secure-enclave,cryptography',
      description:
        'All digital key credentials shall be generated and stored within the device hardware-backed ' +
        'secure enclave (iOS Secure Enclave / Android StrongBox). Credentials shall never be ' +
        'exported to application memory in plaintext.',
    },
  ]

  for (const r of requirements) {
    insertNeed.run(r.id, reqId, r.title, r.status, r.tags, r.description, r.seq, now, now)
  }

  // ── Specifications ────────────────────────────────────────────────────────
  const specifications = [
    {
      id: 'SPEC_001', seq: 1, status: 'verified',
      title: 'BLE Advertisement Timing',
      tags: 'ble,timing',
      description:
        'BLE advertisement interval: 100 ms in active mode (screen on / app foreground), ' +
        '500 ms in idle mode. Connection establishment timeout: 2 s. ' +
        'RSSI threshold for proximity detection: −75 dBm.',
    },
    {
      id: 'SPEC_002', seq: 2, status: 'verified',
      title: 'UWB Ranging Accuracy Requirements',
      tags: 'uwb,accuracy',
      description:
        'UWB ranging accuracy shall be ±10 cm (1σ) at distances up to 5 m in open-air conditions. ' +
        'Minimum of 3 consecutive ranging measurements required before triggering an access event. ' +
        'Ranging session timeout: 500 ms.',
    },
    {
      id: 'SPEC_003', seq: 3, status: 'in-review',
      title: 'Key Provisioning — CCC Digital Key 3.0 Compliance',
      tags: 'ccc,provisioning,standard',
      description:
        'The digital key provisioning flow shall comply with the Car Connectivity Consortium ' +
        '(CCC) Digital Key 3.0 specification. Key delivery shall use the OEM cloud-to-device ' +
        'channel with end-to-end encryption (AES-256-GCM). The SPAKE2+ PAKE protocol is used ' +
        'for pairing authentication.',
    },
    {
      id: 'SPEC_004', seq: 4, status: 'in-progress',
      title: 'Remote Revocation Propagation SLA',
      tags: 'revocation,sla',
      description:
        'Revocation commands issued via the cloud service shall reach the target vehicle within ' +
        '60 seconds of server acknowledgment under normal network conditions. The vehicle shall ' +
        'enforce revocation offline for up to 24 hours using a cached revocation list.',
    },
    {
      id: 'SPEC_005', seq: 5, status: 'open',
      title: 'Passive Entry Latency Budget',
      tags: 'passive-entry,latency',
      description:
        'Total passive entry latency from UWB detection trigger to door-unlock actuator signal: ' +
        '≤ 300 ms. Budget breakdown: UWB session negotiation ≤ 80 ms, ' +
        'authentication ≤ 120 ms, CAN bus command ≤ 100 ms.',
    },
  ]

  for (const s of specifications) {
    insertNeed.run(s.id, specId, s.title, s.status, s.tags, s.description, s.seq, now, now)
  }

  // ── Test Cases ────────────────────────────────────────────────────────────
  const testCases = [
    {
      id: 'TEST_001', seq: 1, status: 'verified',
      title: 'BLE Connection Establishment Timing',
      tags: 'ble,timing,regression',
      description:
        'Verify that a BLE connection is established within 2 seconds of the test device ' +
        'entering the configured RSSI proximity threshold. Run 50 trials across 3 device models ' +
        '(iOS, Android flagship, Android mid-range). Required pass rate: ≥ 98%.',
    },
    {
      id: 'TEST_002', seq: 2, status: 'verified',
      title: 'UWB Ranging Accuracy Validation',
      tags: 'uwb,accuracy,lab',
      description:
        'Measure UWB ranging error across 50 samples at distances 0.5 m, 1 m, 2 m, 3 m, 5 m. ' +
        'All samples must fall within ±10 cm of ground truth. ' +
        'Environment: anechoic chamber (no multipath). Devices: iPhone 15 Pro / Pixel 9 Pro.',
    },
    {
      id: 'TEST_003', seq: 3, status: 'in-progress',
      title: 'Key Revocation Enforcement',
      tags: 'revocation,security',
      description:
        'Issue a digital key to a secondary device. Trigger remote revocation via the cloud ' +
        'dashboard. Verify the secondary device can no longer unlock the vehicle within 60 seconds ' +
        'of revocation. Also verify rejection is still enforced after 24 h in airplane mode.',
    },
    {
      id: 'TEST_004', seq: 4, status: 'open',
      title: 'Passive Entry Distance Threshold',
      tags: 'passive-entry,field-test',
      description:
        'Walk toward vehicle from 5 m at normal pace. Record the exact distance at which the ' +
        'door unlock triggers. Repeat 30 times. 95th-percentile trigger distance: 1.5 m ± 0.3 m. ' +
        'False triggers at > 2 m: 0 occurrences.',
    },
  ]

  for (const t of testCases) {
    insertNeed.run(t.id, testId, t.title, t.status, t.tags, t.description, t.seq, now, now)
  }

  // ── Implementations ───────────────────────────────────────────────────────
  const implementations = [
    {
      id: 'IMPL_001', seq: 1, status: 'verified',
      title: 'BLE Stack Integration',
      tags: 'ble,ios,android',
      description:
        'iOS: CoreBluetooth CBCentralManager / CBPeripheralManager. ' +
        'Android: BluetoothLeScanner + GattServer. Advertisement payload includes the vehicle ' +
        'service UUID and an encrypted device identifier. Background scanning uses ' +
        'allowDuplicates: false (iOS) / SCAN_MODE_LOW_POWER (Android).',
    },
    {
      id: 'IMPL_002', seq: 2, status: 'verified',
      title: 'UWB Session Manager',
      tags: 'uwb,ios,android',
      description:
        'iOS: NearbyInteraction NISession with UWBConfiguration. ' +
        'Android: RangingSession via UwbManager. Session lifecycle is tied to BLE connection state — ' +
        'on disconnect the UWB session is invalidated immediately. Ranging results are published ' +
        'to a Kotlin Flow / Combine publisher consumed by the access decision engine.',
    },
    {
      id: 'IMPL_003', seq: 3, status: 'verified',
      title: 'Key Vault — Secure Enclave Integration',
      tags: 'secure-enclave,cryptography,ios,android',
      description:
        'iOS: SecKeyCreateRandomKey with kSecAttrTokenIDSecureEnclave. ' +
        'Android: KeyPairGenerator with setIsStrongBoxBacked(true). ' +
        'Key alias: com.example.digitalkey.vehiclekey_{vin}. ' +
        'Access control: biometry or device passcode required for all key export operations.',
    },
    {
      id: 'IMPL_004', seq: 4, status: 'in-progress',
      title: 'Cloud Revocation Listener',
      tags: 'cloud,revocation,push',
      description:
        'FCM (Android) / APNs (iOS) push channel for revocation commands. On receipt: ' +
        'validate HMAC signature, update local revocation cache, invalidate active BLE/UWB session. ' +
        'Background processing budget: ≤ 10 s (iOS BGProcessingTask / Android WorkManager EXPEDITED).',
    },
  ]

  for (const i of implementations) {
    insertNeed.run(i.id, implId, i.title, i.status, i.tags, i.description, i.seq, now, now)
  }

  // ── Links ─────────────────────────────────────────────────────────────────
  // Convention: from_id "references" to_id
  //   SPEC → REQ  (specifies)
  //   TEST → REQ + SPEC  (validates)
  //   IMPL → REQ + SPEC  (implements)
  const insertLink = db.prepare(`INSERT OR IGNORE INTO need_link (from_id, to_id) VALUES (?, ?)`)

  const links = [
    // Specifications → Requirements
    ['SPEC_001', 'REQ_001'],
    ['SPEC_002', 'REQ_002'],
    ['SPEC_003', 'REQ_003'],
    ['SPEC_004', 'REQ_004'],
    ['SPEC_005', 'REQ_005'],

    // Test Cases → Requirements + Specifications
    ['TEST_001', 'REQ_001'],
    ['TEST_001', 'SPEC_001'],
    ['TEST_002', 'REQ_002'],
    ['TEST_002', 'SPEC_002'],
    ['TEST_003', 'REQ_004'],
    ['TEST_003', 'SPEC_004'],
    ['TEST_004', 'REQ_005'],
    ['TEST_004', 'SPEC_005'],

    // Implementations → Requirements + Specifications
    ['IMPL_001', 'REQ_001'],
    ['IMPL_001', 'SPEC_001'],
    ['IMPL_002', 'REQ_002'],
    ['IMPL_002', 'SPEC_002'],
    ['IMPL_003', 'REQ_006'],
    ['IMPL_004', 'REQ_004'],
    ['IMPL_004', 'SPEC_004'],
  ]

  for (const [from, to] of links) {
    insertLink.run(from, to)
  }
})

seed()

const counts = {
  need_types:    db.prepare(`SELECT COUNT(*) AS n FROM need_type`).get().n,
  status_values: db.prepare(`SELECT COUNT(*) AS n FROM status_value`).get().n,
  needs:         db.prepare(`SELECT COUNT(*) AS n FROM need`).get().n,
  links:         db.prepare(`SELECT COUNT(*) AS n FROM need_link`).get().n,
}

console.log('Seed complete.')
console.log(`  need_types:    ${counts.need_types}`)
console.log(`  status_values: ${counts.status_values}`)
console.log(`  needs:         ${counts.needs}  (6 REQ · 5 SPEC · 4 TEST · 4 IMPL)`)
console.log(`  links:         ${counts.links}`)

db.close()
