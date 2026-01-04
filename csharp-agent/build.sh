#!/bin/bash
# Build script for SCALPERIUM MT5 Agent
# This script must be run on Windows with .NET 6.0 SDK installed

echo "=========================================="
echo "SCALPERIUM MT5 Agent Build Script"
echo "=========================================="
echo ""

# Check if .NET is installed
if ! command -v dotnet &> /dev/null; then
    echo "❌ ERROR: .NET SDK not found!"
    echo ""
    echo "Please install .NET 6.0 SDK or later from:"
    echo "https://dotnet.microsoft.com/download/dotnet/6.0"
    echo ""
    exit 1
fi

echo "✓ .NET SDK found: $(dotnet --version)"
echo ""

# Navigate to project directory
cd "$(dirname "$0")/MT5AgentAPI" || exit 1

echo "📦 Restoring NuGet packages..."
dotnet restore
if [ $? -ne 0 ]; then
    echo "❌ Failed to restore packages"
    exit 1
fi

echo ""
echo "🔨 Building Release configuration..."
dotnet build -c Release
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "📦 Publishing self-contained executable..."
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true
if [ $? -ne 0 ]; then
    echo "❌ Publish failed"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Build completed successfully!"
echo "=========================================="
echo ""
echo "Executable locations:"
echo "  Standard build: MT5AgentAPI/bin/Release/net6.0/MT5Agent.exe"
echo "  Published build: MT5AgentAPI/bin/Release/net6.0/win-x64/publish/MT5Agent.exe"
echo ""
echo "The published version is self-contained and doesn't require .NET Runtime installed."
echo ""
