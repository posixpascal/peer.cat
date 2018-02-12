#!/usr/bin/env node

var spawn = require('child_process').spawn;
var execSync = require('child_process').execSync;
var phantom_path = execSync("which phantomjs").toString().trim();
var child = spawn('mocha-phantomjs', [
    'test/dist/test.html',
    '--timeout', '50000',
    '-p', phantom_path,
    '--hooks', './test/phantom_hooks.js'
]);

child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stdout);

child.on('close', function (code) {
    console.log('Mocha process exited with code ' + code);
    if (code > 0) {
        process.exit(1);
    }
});