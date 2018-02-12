#!/usr/bin/env node

var spawn = require('child_process').spawnSync;
var execSync = require('child_process').execSync;
var phantom_path = execSync("which phantomjs").toString().trim();
spawn('mocha-phantomjs', [
    'test/dist/test.html',
    '--timeout', '50000',
    '-p', phantom_path,
    '--hooks', './test/phantom_hooks.js'
]);

execSync('./node_modules/.bin/istanbul report --root coverage lcov');
