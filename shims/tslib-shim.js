// Ensures consumers that expect a default export from 'tslib' won't crash.
// Load the real tslib entry via a static relative path to avoid alias recursion.
// Our shim lives at: <root>/shims/tslib-shim.js
// Real file is at:   <root>/node_modules/tslib/tslib.js
const tslib = require('../node_modules/tslib/tslib.js');
module.exports = tslib && tslib.__esModule ? tslib : { default: tslib, ...tslib };
