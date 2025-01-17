#!/bin/bash
#
# Builds odsaAV-min.js:
#
# odsaAV.js + comment.js + md5.min.js + submitter.js > odsaAV-min.js
#
# Updates odsaAV-min.js at two locations in Trak Y repo:
# 1. tools/extras/OpenDSA/lib
# 2. _build/html/OpenDSA/lib
#
# Ýou can have docker-up.sh running locally while running this script.

cp odsaAV.js odsaAV-min.js
cat comment.js >> odsaAV-min.js

cat submitter.js >> odsaAV-min.js

rm ../OpenDSA/lib/odsaAV-min.js
mv odsaAV-min.js ../OpenDSA/lib
