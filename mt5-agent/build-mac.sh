#!/bin/bash
# Scalperium Build Script for Mac
# Complete build including C# cross-compilation for Windows

set -e

NODE_VERSION="20.10.0"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALLER_DIR="$SCRIPT_DIR/installer"
BUNDLE_DIR="$INSTALLER_DIR/bundle"
PUBLISH_DIR="$INSTALLER_DIR/bin/Release/net8.0-windows/publish"

echo "========================================"
echo "  Scalperium Build (Mac)"
echo "========================================"

# Create directories
mkdir -p "$BUNDLE_DIR/nodejs"
mkdir -p "$BUNDLE_DIR/wsserver"
mkdir -p "$BUNDLE_DIR/mql5/Indicators"
mkdir -p "$BUNDLE_DIR/mql5/Include"
mkdir -p "$BUNDLE_DIR/mql5/Libraries"
mkdir -p "$BUNDLE_DIR/mql5/Experts"
mkdir -p "$BUNDLE_DIR/mql5/Presets"
mkdir -p "$PUBLISH_DIR"

# Step 1: Build C# Agent for Windows
echo ""
echo "[1/5] Building C# Agent for Windows..."
cd "$SCRIPT_DIR"
dotnet publish src/MT5Agent.Service/MT5Agent.Service.csproj \
    -c Release \
    -r win-x64 \
    --self-contained \
    -o "$PUBLISH_DIR"
echo "  ✓ C# Agent built for Windows"

# Step 2: Download Node.js for Windows
echo ""
echo "[2/5] Downloading Node.js $NODE_VERSION for Windows..."
NODE_ZIP="$BUNDLE_DIR/node-win.zip"
NODE_URL="https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-win-x64.zip"

if [ ! -f "$NODE_ZIP" ]; then
    curl -L -o "$NODE_ZIP" "$NODE_URL"
fi

# Extract Node.js
cd "$BUNDLE_DIR"
unzip -o -q "$NODE_ZIP"
if [ -d "node-v$NODE_VERSION-win-x64" ]; then
    cp -r node-v$NODE_VERSION-win-x64/* nodejs/
    rm -rf node-v$NODE_VERSION-win-x64
fi
echo "  ✓ Node.js downloaded and extracted"

# Step 3: Prepare WebSocket Server
echo ""
echo "[3/5] Preparing WebSocket Server..."
cd "$SCRIPT_DIR/websocket-server"

# Install dependencies
npm install --omit=dev

# Copy to bundle
cp server.js "$BUNDLE_DIR/wsserver/"
cp package.json "$BUNDLE_DIR/wsserver/"
cp -r node_modules "$BUNDLE_DIR/wsserver/"
cp -r prisma "$BUNDLE_DIR/wsserver/"
echo "  ✓ WebSocket Server prepared"

# Step 4: Copy MQL5 files
echo ""
echo "[4/5] Copying MQL5 files..."
MQL5_SRC="$SCRIPT_DIR/mql5"

# Indicators
if [ -d "$MQL5_SRC/Indicators" ]; then
    cp -r "$MQL5_SRC/Indicators/"* "$BUNDLE_DIR/mql5/Indicators/" 2>/dev/null || true
    echo "  - Indicators copied"
fi

# Include files (Bridge)
if [ -d "$MQL5_SRC/Include" ]; then
    cp -r "$MQL5_SRC/Include/"* "$BUNDLE_DIR/mql5/Include/" 2>/dev/null || true
    echo "  - Include files copied"
fi

# Libraries
if [ -d "$MQL5_SRC/Libraries" ]; then
    cp -r "$MQL5_SRC/Libraries/"* "$BUNDLE_DIR/mql5/Libraries/" 2>/dev/null || true
    echo "  - Libraries copied"
fi

# Experts (Galaxy Gold Scalper EA)
if [ -d "$MQL5_SRC/Experts" ]; then
    cp -r "$MQL5_SRC/Experts/"* "$BUNDLE_DIR/mql5/Experts/" 2>/dev/null || true
    echo "  - Experts (EA) copied"
fi

# Presets
if [ -d "$MQL5_SRC/Presets" ]; then
    cp -r "$MQL5_SRC/Presets/"* "$BUNDLE_DIR/mql5/Presets/" 2>/dev/null || true
    echo "  - Presets copied"
fi

echo "  ✓ MQL5 files copied"

# Step 5: Create the bundle zip (ready for VPS - only needs Inno Setup compile)
echo ""
echo "[5/5] Creating installer bundle..."
cd "$SCRIPT_DIR"

# Create a zip with everything pre-built
zip -r ~/Downloads/scalperium-bundle.zip \
    installer/bin/ \
    installer/bundle/ \
    installer/assets/ \
    installer/MT5AgentSetup-AllInOne.iss \
    installer/README-AllInOne.md \
    -x "*.DS_Store" \
    -x "installer/bundle/node-win.zip"

echo ""
echo "========================================"
echo "  Build Complete!"
echo "========================================"
echo ""
echo "Bundle: ~/Downloads/scalperium-bundle.zip"
echo ""
echo "Contents:"
du -sh "$PUBLISH_DIR" | awk '{print "  C# Agent:      " $1}'
du -sh "$BUNDLE_DIR/nodejs" | awk '{print "  Node.js:       " $1}'
du -sh "$BUNDLE_DIR/wsserver" | awk '{print "  WebSocket:     " $1}'
du -sh "$BUNDLE_DIR/mql5" | awk '{print "  MQL5 Files:    " $1}'
echo ""
ls -lh ~/Downloads/scalperium-bundle.zip | awk '{print "  Total Bundle:  " $5}'
echo ""
echo "On VPS, run:"
echo "  1. Extract: unzip scalperium-bundle.zip -d scalperium"
echo "  2. Compile: \"C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe\" scalperium\\installer\\MT5AgentSetup-AllInOne.iss"
echo ""
echo "That's it! The installer will be at: scalperium\\installer\\output\\ScalperiumSetup-1.0.0.exe"
