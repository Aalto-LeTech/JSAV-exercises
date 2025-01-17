# OpenDSA (JSAV) exercises: submitter to MOOC-grader


At normal course development, there is already a working file at
tools/extras/OpenDSA/lib/odsaAV-min.js.

If you need to debug or develop the OpenDSA---MOOC-grader code:

1. Install node.js https://nodejs.org/en/
2. Install uglify-js:

    npm install uglify-js -g

3. run build.sh

    - To build a minified version which is harder for an average student to
      decipher, just type `./build.sh`.

    - To build a human-readable version for debugging, type
      `./build.sh --debug`.


## More documentation

See ../README.md and ../doc/grading.png.


## Authors

Teemu Lehtinen wrote the original code in 2015.
https://github.com/Aalto-LeTech/mooc-grader-opendsa-course

Artturi Tilanterä modified the code for JSAV Exercise Recorder/Player in 2020.
