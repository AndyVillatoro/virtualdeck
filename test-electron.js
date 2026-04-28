const e = require('electron');
console.log('TYPE:', typeof e);
if (typeof e === 'object' && e !== null) {
  console.log('KEYS:', Object.keys(e).slice(0, 20));
  console.log('app:', typeof e.app);
  console.log('protocol:', typeof e.protocol);
} else {
  console.log('VALUE:', e);
}
