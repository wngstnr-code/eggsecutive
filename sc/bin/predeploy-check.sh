#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "Missing sc/.env. Copy .env.example first."
  exit 1
fi

set -a
source .env
set +a

require_env() {
  local key="$1"
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required env: $key"
    exit 1
  fi
}

require_uint() {
  local key="$1"
  local value="${!key:-}"
  if [[ -n "$value" && ! "$value" =~ ^[0-9]+$ ]]; then
    echo "Invalid integer env: $key"
    exit 1
  fi
}

require_address() {
  local key="$1"
  local value="${!key:-}"
  if [[ -n "$value" && ! "$value" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
    echo "Invalid address env: $key"
    exit 1
  fi
}

require_private_key() {
  local value="${PRIVATE_KEY:-}"
  if [[ ! "$value" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
    echo "Invalid PRIVATE_KEY format"
    exit 1
  fi
}

if [[ ! "${BASE_SEPOLIA_RPC_URL:-}" =~ ^https?:// ]]; then
  echo "Invalid BASE_SEPOLIA_RPC_URL"
  exit 1
fi

require_env "BASE_SEPOLIA_RPC_URL"
require_env "PRIVATE_KEY"
require_private_key
require_uint "USDC_FAUCET_CLAIM_AMOUNT"
require_uint "SESSION_EXPIRY_DELAY"
require_address "INITIAL_OWNER"
require_address "BACKEND_SIGNER"

echo "==> Building contracts"
forge build

echo "==> Running tests"
forge test --offline

echo "==> Running offline deploy preflight"
FOUNDRY_PROFILE=base_release forge script script/DeployGameContracts.s.sol:DeployGameContracts --offline

if [[ -n "${BASESCAN_API_KEY:-}" ]]; then
  echo "==> Verification env looks ready"
else
  echo "==> Verification env missing BASESCAN_API_KEY"
fi

echo "Predeploy check passed."
