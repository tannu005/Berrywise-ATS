const fs = require('fs');
let css = fs.readFileSync('dashboard.css');
let str = css.toString('utf8');
// Remove any null bytes, BOMs, replacement chars, double quotes, and trim trailing whitespace
str = str.replace(/[\uFFFD\x00\"]+$/g, '').trimEnd() + '\n';
fs.writeFileSync('dashboard.css', str);
console.log('Fixed dashboard.css encoding');
