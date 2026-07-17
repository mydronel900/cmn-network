cat << 'EOF' > cmn-storage.js
import fs from 'fs';
import path from 'path';

export default class CMNStorageManager {
  constructor(dbPath = './cmn-ledger.json') {
    this.dbPath = path.resolve(dbPath);
    this.ensureStorageTopology();
  }

  ensureStorageTopology() {
    if (!fs.existsSync(path.dirname(this.dbPath))) {
      fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    }
    if (!fs.existsSync(this.dbPath)) {
      fs.writeFileSync(this.dbPath, JSON.stringify({ balances: {}, vouchers: {}, registry: {} }, null, 2));
    }
  }

  rehydrate() {
    const data = fs.readFileSync(this.dbPath, 'utf8');
    return JSON.parse(data);
  }

  persist(data) {
    fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
  }
}
EOF
