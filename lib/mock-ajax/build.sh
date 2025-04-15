#!/bin/bash
#
# Builds odsaAV-min.js:
#
# ../odsaAV.js + comment.js + submitter.js > odsaAV-min.js

cp ../odsaAV.js odsaAV-min.js
cat comment.js >> odsaAV-min.js
cat submitter.js >> odsaAV-min.js

