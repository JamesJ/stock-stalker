#!/bin/bash

BRANCH="master"

echo "Pulling from GitHub..."
git pull origin $BRANCH
echo "Resetting all the files..."
rm -rf dist/
echo "Building files..."
npm run build

echo "Done"