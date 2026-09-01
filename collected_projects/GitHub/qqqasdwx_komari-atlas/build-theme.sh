#!/bin/bash

# Komari Atlas Theme Build Script
# This script builds the theme package locally.

set -e  # Exit on any error

echo "Building Komari Atlas Theme Package..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${NC} $1"
}

print_success() {
    echo -e "${GREEN} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW} $1${NC}"
}

print_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# Check if required commands exist
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v zip &> /dev/null; then
        print_error "zip is not installed"
        exit 1
    fi
    
    print_success "All dependencies are available"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm ci --no-audit --no-fund
    print_success "Dependencies installed"
}

# Build the project
build_project() {
    print_status "Building project..."
    npm run build
    print_success "Project built successfully"
}

# Verify required files exist
verify_files() {
    print_status "Verifying required files..."
    
    local files_missing=false
    
    if [ ! -f "preview.png" ]; then
        print_error "preview.png not found"
        files_missing=true
    fi
    
    if [ ! -f "komari-theme.json" ]; then
        print_error "komari-theme.json not found"
        files_missing=true
    fi
    
    if [ ! -d "dist" ]; then
        print_error "dist/ directory not found"
        files_missing=true
    fi
    
    if [ "$files_missing" = true ]; then
        print_error "Some required files are missing"
        exit 1
    fi
    
    print_success "All required files found!"
}

# Create theme package
create_package() {
    print_status "Creating theme package..."
    
    # Get version info
    VERSION_DATE=$(date +"%y.%m.%d")
    if git rev-parse --short HEAD &> /dev/null; then
        COMMIT_HASH=$(git rev-parse --short HEAD)
    else
        COMMIT_HASH="dev"
    fi
    
    # Create a temporary directory for the package
    PROJECT_DIR=$(pwd)
    PACKAGE_DIR=$(mktemp -d)
    trap 'rm -rf "$PACKAGE_DIR"' EXIT
    
    # Copy required files
    cp preview.png "$PACKAGE_DIR/"
    cp komari-theme.json "$PACKAGE_DIR/"
    cp -r dist/ "$PACKAGE_DIR/"
    
    # Create zip file with version and commit hash
    ZIP_NAME="komari-atlas-${VERSION_DATE}-${COMMIT_HASH}.zip"
    OUTPUT_PATH="${PROJECT_DIR}/dist/${ZIP_NAME}"
    
    cd "$PACKAGE_DIR"
    zip -r "$OUTPUT_PATH" .
    cd "$PROJECT_DIR"
    
    print_success "Created package: ${ZIP_NAME}"
    ls -la "dist/${ZIP_NAME}"
}

# Main execution
main() {
    echo "======================================"
    echo "  Komari Atlas Package Builder"
    echo "======================================"
    echo
    
    check_dependencies
    echo
    
    install_dependencies
    echo
    
    build_project
    echo
    
    verify_files
    echo
    
    create_package
    echo
    
    print_success "Theme package build completed!"
    echo
    echo "You can now use the generated zip file as a theme package."
}

# Run main function
main "$@"
