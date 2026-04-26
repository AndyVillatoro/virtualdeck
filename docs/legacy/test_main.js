"use strict";
const e = require('electron');
console.log('electron type:', typeof e);
console.log('app type:', typeof e.app);
if (e.app) {
  e.app.whenReady().then(() => {
    console.log('Electron ready!');
    setTimeout(() => e.app.quit(), 1000);
  });
} else {
  console.log('electron value:', String(e).substring(0, 80));
  process.exit(1);
}
