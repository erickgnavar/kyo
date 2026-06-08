# Format all supported files
format:
    biome format --fix .

# Check formatting
format-check:
    biome check .

# Lint
lint:
    biome lint .

# Run all checks
check: format-check lint

# Install + build frontend
build:
    pnpm install
    pnpm build

# Run dev server
dev:
    pnpm dev

# Run Tauri dev
tauri-dev:
    pnpm tauri dev
