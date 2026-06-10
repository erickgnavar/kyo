# Format all source files
format: format-js format-rust

# Format JS/TS/Svelte files
format-js:
    biome format --fix .

# Format Rust code
format-rust:
    cd src-tauri && cargo fmt

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

# Read current version from tauri.conf.json
version:
    @grep '"version"' src-tauri/tauri.conf.json | head -1 | sed 's/.*"\([0-9.]*\)".*/\1/'

# Bump version in all config files and create a tag
# Usage: just bump-version 0.2.0
bump-version version:
    sed -i'' -e 's/"version": "[0-9.]*"/"version": "{{ version }}"/' src-tauri/tauri.conf.json
    sed -i'' -e 's/"version": "[0-9.]*"/"version": "{{ version }}"/' package.json
    sed -i'' -e 's/^version = "[0-9.]*"/version = "{{ version }}"/' src-tauri/Cargo.toml
    cd src-tauri && cargo update --workspace
    git add src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock package.json pnpm-lock.yaml
    git commit -m "chore: bump v{{ version }}"
    git tag -a "v{{ version }}" -m "v{{ version }}"
