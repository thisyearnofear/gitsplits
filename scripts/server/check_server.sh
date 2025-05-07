#!/bin/bash

# Print server information
echo "=== Server Information ==="
hostname
echo

# Check disk space
echo "=== Disk Space ==="
df -h
echo

# Check Docker disk usage
echo "=== Docker Disk Usage ==="
docker system df
echo

# List running containers
echo "=== Running Containers ==="
docker ps
echo

# List all containers (including stopped)
echo "=== All Containers ==="
docker ps -a
echo

# List Docker images
echo "=== Docker Images ==="
docker images
echo

# Check system memory
echo "=== Memory Usage ==="
free -h
echo

# Check CPU load
echo "=== CPU Load ==="
uptime
echo

# Check running processes
echo "=== Top Processes ==="
ps aux --sort=-%mem | head -10
echo
