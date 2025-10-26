#!/bin/bash

# Crypto Vault Dashboard - Development Server

PORT=8765

echo "Starting Crypto Vault Dashboard development server..."
echo "Server will be available at: http://localhost:$PORT"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python3 -m http.server $PORT
