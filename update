#!/bin/bash

#remove a directory
rm -fR a

#create a directories
mkdir a
mkdir a/JSAV

#copy exercises and lib directories from master
git checkout master -- exercises
git checkout master -- lib

#move directories
git mv exercises a
git mv lib a

#build JSAV
cd JSAV
make
cd ..

#copy necessay JSAV files
cp -r JSAV/build a/JSAV
cp -r JSAV/css a/JSAV
cp -r JSAV/extras a/JSAV
cp -r JSAV/lib a/JSAV

git add a/JSAV

python index_creator.py

echo Done! Ready to commit changes!
