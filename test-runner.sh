#!/usr/bin/env bash

PHANTOM_PATH=$(which phantomjs)
mocha-phantomjs test/dist/test.html --timeout 50000 -p $PHANTOM_PATH --hooks ./test/phantom_hooks.js
./node_modules/.bin/istanbul report --root coverage lcov
