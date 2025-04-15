# OpenDSA (JSAV) exercises: submitter to MOOC-grader

This directory contains source code for version of odsaAV.js which
submits students' JSAV exercise solutions to
[A+ LMS](https://apluslms.github.io/). Moreover, this code is compatible
with [JSAV Exercise Recorder](https://github.com/Aalto-LeTech/jsav-exercise-recorder/).

In [JSAV-exercises repo](https://github.com/Aalto-LeTech/JSAV-exercises/),
the compiled code is at `lib/odsaAV-min.js`. Whether JSAV Exercise Recorder
is used with a JSAV exercise or not, the code pretends to send student's
submission to A+ LMS. When the testbench is running and the user clicks the
Grade button of a JSAV exercise, odsaAV-min.js will print the following
to the web browser's console:

```
Final JAAL data: Object { metadata: {…}, definitions: {…}, initialState:
Data to be sent A+: { "description":"JAAL 2.0 recording",
"generator":"JSAV Exercise Recorder 2.0.1",
"encoding":"JSON string -> HTML escape -> zlib compress -> Base64 encode",
"data":" ...
```

This is a debug print to show the data recorded by JSAV Exercise Recorder:
first as a JavaScript object, then as a JSON string containing specifically
encoded JSAV Exercise Recorder data ("JAAL recording").

## Authors

Teemu Lehtinen wrote the original code in 2015.
https://github.com/Aalto-LeTech/mooc-grader-opendsa-course

Artturi Tilanterä modified the code for JSAV Exercise Recorder/Player in 2020.
