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

## Running the exercises locally

The exercises can be easily run locally, which is very useful for manually testing them. To do this, open a Unix terminal,
clone the repository and run

```bash
./start_testbench.py
```

This will start a Python-based web server on your machine, allowing you to access the exercises by opening their HTML files in your
web browser. By default, the URL is `http://localhost:8000/`. To open, for example, a simulation exercise of Dijkstra's algorithm, open
`http://localhost:8000/AV/Development/DijkstraPE-research-v3.html`.

TODO: Tell about the need to build JSAV if we move to submodule.

## Developing the exercises

Instructions for setting up development environment with code linting and developing the exercises can be found from [development README](JSAV-exercise-development.md).

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

## Developing and testing the exercises

This is a local configuration to test a JSAV-based visual algorithm simulation
exercise with ?JSAV Exercise Recorder? in local development.

- Some developer instruction here, linting

### Testing

Open a UNIX terminal and start the script:

```bash
./start_testbench.py
```

This starts a Python-based web server on your machine and allows you to access exercise html files in you web browser. By default, the URL is `http://localhost:8000/`.

To test modification to exercise recorder (if/when exercise recorder is integrated):

You will need to install a Node.js program
[watchify](https://www.npmjs.com/package/watchify). E.g.

```bash
npm install -g watchify
```

In another terminal:

```bash
./update-recorder.sh
```

This starts a Node.js program [watchify](https://www.npmjs.com/package/watchify)
which will update the JSAV Exercise recorder on the local Python-based web
server. This happens automatically and continuously every time the source code
file of JSAV Exercise Recorder is edited and saved.

Now the testing of exercises and recorder works as follows:

1. Open <http://localhost:8000/AV/Development/> with your web browser.

2. Open developer tools on your browser.
   (Firefox: Press F12)

3. Disable cache in developer tools.
   (Firefox: Select the Network tab. Tick the 'Disable Cache' box.)

4. Click the link of one of the HTML files in the browser's normal page view.
   Example: DijkstraPE-research.html.

5. The JSAV-based exercise starts now. You can edit the source code on the
   disk with your favorite text editor and then update the page in your
   browser to see the changes.

6. Finally shutdown the scripts start at steps 1 and 2 with Ctrl+C.

### Testing Finnish translations

One can test the Finnish translation of a JSAV exercise by adding the following
string at the end of the exercise URL: `?JOP-lang=fi&JXOP-code=finnish`

Example:

- [English Red-black tree](http://localhost:8000/OpenDSA/AV/Development/redBlackTreePRO.html)
- [Finnish Red-black tree](http://localhost:8000/OpenDSA/AV/Development/redBlackTreePRO.html?JOP-lang=fi&JXOP-code=finnish)

The URL parameter `JOP-lang` controls the language of the exercise interface.
Its value should correspond to a key under key `translations` in the exercise
translation JSON file, e.g. redBlackTreePRO.json.

The URL parameter `JXOP-code`controls the language of the pseudocode,
corresponding to a key under key `code`in the exercise translation JSON file.

## Updating gh-pages

You can update gh-pages with the update script:

```bash
git checkout gh-pages
./update
git commit -m "Updated gh-pages"
git push origin gh-pages
git checkout master
```
