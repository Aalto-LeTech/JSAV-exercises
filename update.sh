#!/bin/bash
set -euo pipefail # Use 'strict mode'

# Directory to which to move all the files needed for showcasing exercises
OUTPUT_DIR="site"

# Clean output directory
rm -rf "$OUTPUT_DIR"

# Create output directory
mkdir "$OUTPUT_DIR"

# Copy required files from main

# Exercise files
git checkout main -- \
  AV \
  DataStructures \
  SourceCode \
  lib

# JSAV library
git checkout main -- \
  JSAV/build \
  JSAV/css \
  JSAV/extras \
  JSAV/lib

# Move files to output directory
git mv \
  AV \
  DataStructures \
  SourceCode \
  lib \
  JSAV \
  "$OUTPUT_DIR/"

# Create index.html that will be the front page of GitHub pages
python3 index_creator.py

echo "Updating pages completed! Ready to commit changes."
