#!/bin/bash

echo "Pulling from GitHub..."
git pull
echo "Resetting all the files..."
rm -rf dist/
echo "Building files..."
npm run build

echo "Done"