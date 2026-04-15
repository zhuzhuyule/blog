#!/bin/bash

# Hugo server auto-restart watcher
# Run this in your blog directory: ./watch-hugo.sh

cd "$(dirname "$0")"

echo "Starting Hugo server watcher..."
echo "Press Ctrl+C to stop"

while true; do
    if ! lsof -i :1313 > /dev/null 2>&1; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting Hugo server..."
        nohup hugo server -D --port 1313 > /tmp/hugo.log 2>&1 &
        sleep 3
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Hugo server running"
    fi
    sleep 5
done