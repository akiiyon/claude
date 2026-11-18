import fs from 'node:fs';

if (fs.existsSync('.env')) process.loadEnvFile('.env');

const workDays = (process.env.WORK_DAYS || '1,2,3,4,5,6')
  .split(',')
  .map((d) => Number(d.trim()))
  .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7);

export const config = {
  port: Number(process.env.PORT) || 3100,
  dataDir: process.env.DATA_DIR || './data',
  tz: process.env.APP_TZ || 'Asia/Kolkata',
  workDays: workDays.length ? workDays : [1, 2, 3, 4, 5],
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  sessionDays: Number(process.env.SESSION_DAYS) || 14,
};
