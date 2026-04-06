#!/bin/bash
# Shim for demo recording — runs the local binary but looks like npx
export RUAH_NO_UPDATE_CHECK=1
cd /Users/petre/Projects/personal-projects/ruah-product
exec node dist/cli.js demo --fast
