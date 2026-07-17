import fs from 'fs';
import path from 'path';

export class CMNStorageManager {
  constructor(nodeId) {
    this.nodeId = nodeId;
    this.dbPath = path.join(process.cwd(), `db_${nodeId}.json`);
  }

  load() {
    if (!fs.existsSync(this.dbPath)) {
      this.initDefaultDb();
    }
    try {
      const raw = fs.readFileSync(this.dbPath, 'utf8');
      // Deep clone the parsed JSON to completely break any in-memory reference sharing
      return JSON.parse(JSON.stringify(JSON.parse(raw)));
    } catch (err) {
      this.initDefaultDb();
      const raw = fs.readFileSync(this.dbPath, 'utf8');
      return JSON.parse(JSON.stringify(JSON.parse(raw)));
    }
  }

  persist(trustMesh, oracle, clearing) {
    // Deep clone before stringifying and writing to eliminate shared-reference mutations
    const data = JSON.parse(JSON.stringify({ trustMesh, oracle, clearing }));
    fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf8');
  }

  initDefaultDb() {
    const defaultDb = {
      trustMesh: {
        balances: {
          anchor_london_coop: 500,
          node_tokyo_mesh: 500,
          node_sydney_mesh: 500
        },
        assets: {
          anchor_london_coop: { wheat_local_v1: 100 },
          node_tokyo_mesh: { wheat_local_v1: 0 },
          node_sydney_mesh: {}
        },
        publicKeys: {},
        slashedNodes: []
      },
      oracle: {
        registeredAssets: ['wheat_local_v1']
      },
      clearing: {
        accountActivity: {}
      }
    };
    fs.writeFileSync(this.dbPath, JSON.stringify(defaultDb, null, 2), 'utf8');
  }
}
