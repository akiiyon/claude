import path from 'node:path';
import { config } from './config.js';
import { openDb } from './db.js';
import { createApp } from './app.js';

const db = openDb(path.join(config.dataDir, 'team-tracker.db'));
const app = createApp({ db, config });

app.listen(config.port, () => {
  console.log(`Team Tracker running on http://localhost:${config.port} (today is decided in ${config.tz})`);
});
