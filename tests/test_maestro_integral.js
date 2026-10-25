const projectRoot = require('path').resolve(__dirname, '..');
// The previous string checks passed even when app.js did not parse.
// This entry point now runs the actual compiled application in Chromium.
require('../scripts/regression.cjs');
