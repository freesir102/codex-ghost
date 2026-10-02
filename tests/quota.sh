#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p build
xcrun swiftc -swift-version 5 native/Quota.swift tests/main.swift -o build/test-quota
build/test-quota
