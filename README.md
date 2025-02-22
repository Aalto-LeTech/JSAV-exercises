# JSAV exercises

JavaScript algorithm exercises made using the [JSAV framework](https://github.com/vkaravir/JSAV).

This repo merges exercises from
[traky](https://version.aalto.fi/gitlab/course/traky) and
[jsav-exercise-recorder](https://github.com/Aalto-LeTech/jsav-exercise-recorder)
repositories to one place. Aim is to have all the future development of the exercises in this repository.

Currently work in progress.

## TODO

- Integrate JSAV exercise recorder (as submodule?)
- Add JSAV library as submodule
- Update exercises list seen in github pages?

## Exercises

Check the exercises here:

<http://aalto-letech.github.io/JSAV-exercises/>

The exercise list should be updated!

## Running exercises locally

The exercises can be easily run locally, which is very useful for manually testing them. To do this, open a Unix terminal,
clone the repository and run

```bash
./start_testbench.py <PORT>
```

This will start a Python-based web server on your machine, allowing you to access the exercises by opening their HTML files in your
web browser. The port parameter is optional. By default, port `8000` is used and the exercise files are found from URL <http://localhost:8000/>. To open, for example, a simulation exercise of Dijkstra's algorithm, open
<http://localhost:8000/AV/Development/DijkstraPE-research-v3.html>.

**NOTE**: If you are testing changes to the exercises, you should disable browser cache. Consult [development README](JSAV-exercise-development.md).

**TODO**: Tell about the need to build JSAV if we move to submodule.

## Developing exercises

Instructions for setting up development environment with code linting and for developing and testing the exercises can be found from [development README](JSAV-exercise-development.md).

## Description of files

The JSAV-based visual algorithm simulation exercises are bound to the
[OpenDSA electronic textbook](https://opendsa-server.cs.vt.edu/).

- `AV/Development/` contains the actual exercises.
- `DataStructures/` contains implementations for visualizable data
  structures based on JSAV.
- `JSAV/` contains browser-ready JSAV library, including JS libraries
   jquery.transit and raphael.
- `lib/` contains JS libraries common to OpenDSA, and JS libraries
   jQuery and jQuery-UI.
- `lib/mock-ajax/` contains source code for `lib/odsaAV-min.js`
   which is compatible with JSAV Exercise Recorder, pretends to
   send the submission to a learning management system, and prints
   debug data to the web browser's console.
- `SourceCode/` ??

## Updating gh-pages

You can update gh-pages with the update script:

```bash
git checkout gh-pages
./update
git commit -m "Updated gh-pages"
git push origin gh-pages
git checkout master
```
