#!/bin/sh
set -eu
echo "[Railway] starting Diggerz server"
exec node diggerz-server.js
