# Eggsecutive Smart Contracts

This package contains the backend-authoritative onchain flow for Eggsecutive on Base Sepolia.
All contracts are deployed as UUPS proxies (`ERC1967Proxy` + separate implementations).

Included contracts:

- `GameUSDC`: mock USDC with 6 decimals
- `USDCFaucet`: testnet bootstrap faucet
- `GameVault`: custody layer for available, locked, and treasury balances
- `GameSettlement`: session manager that verifies backend EIP-712 signatures
- `TrustPassport`: onchain credential for anti-bot / proof-of-human style flows

## Contract Summary

### GameUSDC

- Name: `Mock USD Coin`
- Symbol: `USDC`
- Decimals: `6`
- No initial supply
- Only approved minters can call `mint`
- Upgradeable through UUPS

### USDCFaucet

- `claim()` mints `100 * 10^6` to the caller
- No cooldown
- Owner can `pause`, `unpause`, and `setClaimAmount`
- Upgradeable through UUPS

### GameVault

- Users `approve` USDC and then call `deposit(amount)`
- Tracks `available`, `locked`, and `treasury` balances separately
- Users can only `withdraw(amount)` from their available balance
- `fundTreasury(amount)` is used to bootstrap payout liquidity
- Owner can withdraw treasury funds and rescue stray tokens
- Only `GameSettlement` can lock stake and settle outcomes
- Upgradeable through UUPS

### GameSettlement

- `startSession(bytes32 onchainSessionId, uint256 stakeAmount)` locks stake in the vault
- One wallet can only have one active session at a time
- `settleWithSignature(...)` verifies backend EIP-712 settlement payloads
- `expireSession(bytes32 sessionId)` closes stale sessions as `CRASHED`
- Owner can `pause()` and `unpause()`
- `sessionExpiryDelay` is configurable
- Upgradeable through UUPS

## Prerequisites

- Foundry installed
- a Base Sepolia RPC URL
- a deployer private key for broadcasts

## Environment

Set values in `sc/.env`:

```bash
BASE_SEPOLIA_RPC_URL=https://your-base-sepolia-rpc
PRIVATE_KEY=0xyour_private_key

# Optional deploy overrides
INITIAL_OWNER=0xyour_owner_address
BACKEND_SIGNER=0xyour_backend_signer_address
USDC_FAUCET_CLAIM_AMOUNT=100000000
SESSION_EXPIRY_DELAY=86400

# Optional verification
BASESCAN_API_KEY=your_basescan_api_key

# Signer rotation script only
GAME_SETTLEMENT_ADDRESS=0xyour_game_settlement_proxy
TRUST_PASSPORT_ADDRESS=0xyour_trust_passport_proxy
NEW_BACKEND_SIGNER=0xyour_new_backend_signer_address
```

Minimum required values for deployment are:

- `BASE_SEPOLIA_RPC_URL`
- `PRIVATE_KEY`

Optional deploy overrides:

- `INITIAL_OWNER`
- `BACKEND_SIGNER`
- `USDC_FAUCET_CLAIM_AMOUNT`
- `SESSION_EXPIRY_DELAY`

Verification only:

- `BASESCAN_API_KEY`

Signer rotation only:

- `GAME_SETTLEMENT_ADDRESS`
- `TRUST_PASSPORT_ADDRESS`
- `NEW_BACKEND_SIGNER`

## Commands

### Build

```bash
forge build
```

### Build for Base Deployment

```bash
FOUNDRY_PROFILE=base_release forge build
```

### Test

```bash
forge test --offline
```

### Predeploy Check

```bash
./bin/predeploy-check.sh
```

This runs the full local readiness flow:

- validates required deploy env values
- builds contracts
- runs tests
- runs the deploy script in `--offline` mode with the `base_release` profile

Using `--offline` avoids a recent Foundry/OpenChain HTTP panic that can happen in some local or sandboxed macOS environments during non-broadcast dry-runs.

### Format

```bash
forge fmt
```

## Deploy to Base Sepolia

### Standard deploy

```bash
source .env
forge script script/DeployGameContracts.s.sol:DeployGameContracts --rpc-url "$BASE_SEPOLIA_RPC_URL" --broadcast
```

### Deterministic metadata deploy

```bash
source .env
FOUNDRY_PROFILE=base_release forge script script/DeployGameContracts.s.sol:DeployGameContracts --rpc-url "$BASE_SEPOLIA_RPC_URL" --broadcast
```

The deploy script:

- deploys implementations for `GameUSDC`, `USDCFaucet`, `GameVault`, `GameSettlement`, and `TrustPassport`
- deploys UUPS proxies
- grants the faucet token minting rights
- sets `GameSettlement` as the authorized vault settlement operator
- prints the deployed addresses

Frontend-facing proxy outputs:

```bash
NEXT_PUBLIC_USDC_ADDRESS=<deployed_game_usdc>
NEXT_PUBLIC_USDC_FAUCET_ADDRESS=<deployed_usdc_faucet>
NEXT_PUBLIC_GAME_VAULT_ADDRESS=<deployed_game_vault>
NEXT_PUBLIC_GAME_SETTLEMENT_ADDRESS=<deployed_game_settlement>
NEXT_PUBLIC_TRUST_PASSPORT_ADDRESS=<deployed_trust_passport>
```

Backend-facing env outputs:

```bash
GAME_VAULT_ADDRESS=<deployed_game_vault>
GAME_SETTLEMENT_ADDRESS=<deployed_game_settlement>
TRUST_PASSPORT_ADDRESS=<deployed_trust_passport>
FAUCET_CONTRACT_ADDRESS=<deployed_usdc_faucet>
```

## Verification

### Verify on BaseScan

```bash
source .env
forge verify-contract \
  <contract_address> \
  <contract_name> \
  --chain base-sepolia \
  --watch \
  --etherscan-api-key "$BASESCAN_API_KEY"
```

### Verify with Sourcify

```bash
FOUNDRY_PROFILE=base_release forge verify-contract \
  <contract_address> \
  <contract_name> \
  --chain 84532 \
  --verifier sourcify
```

## Rotate Backend Signer

To update the backend signer after deployment:

```bash
source .env
forge script script/UpdateBackendSigner.s.sol:UpdateBackendSigner --rpc-url "$BASE_SEPOLIA_RPC_URL" --broadcast
```

Use the owner key for the target contracts.

## Backend-Authoritative Flow

1. The user approves USDC and deposits into the vault.
2. The backend creates an `onchain_session_id`.
3. The frontend calls `GameSettlement.startSession(...)`.
4. The backend validates the game result offchain and signs a settlement payload.
5. The frontend or backend relayer submits settlement onchain.
6. Cashouts move value back into the user's available vault balance.
7. Crashes route stake into treasury.
