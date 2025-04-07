# JSAV exercises

JavaScript algorithm exercises made using the [JSAV framework](https://github.com/vkaravir/JSAV).

This repository contains

- JSAV Visual Algorithm Simulation (VAS) exercises
- Both a compiled version and the source code of the [JSAV library](https://github.com/vkaravir/JSAV)
- Compiled version of the [JSAV Exercise Recorder](https://github.com/Aalto-LeTech/jsav-exercise-recorder)
- Code that allows integration of JSAV exercises to Aalto University's A+ learning management system

This repository is a modified version of the [OpenDSA](https://github.com/OpenDSA/OpenDSA) project.
The exercises are used in Aalto University course CS-A1141 Data Structures and Algorithms Y by including
this repository as a submodule in the course material repository.

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

## Design of JSAV exercises

The *design* of JSAV exercises is another, advanced aspect involving user
interface design, computing education research, and learning sciences.

### Learning sciences

Mayer, Richard E (2017). *Instruction Based on Visualizations*. In: [Handbook of
  Research on Learning and
  Instruction](https://www.routledge.com/Handbook-of-Research-on-Learning-and-Instruction/Mayer-Alexander/p/book/9781138831766),
  pp. 483-501. Routledge, New York, NY, USA. ISBN 978-1-138-83176-6.

### Computing education research**

Sorva, Juha (2012). [Visual program simulation in introductory programming
education](https://aaltodoc.aalto.fi/handle/123456789/3534). Doctoral
dissertation. Aalto University publication series DOCTORAL DISSERTATIONS,
61/2012. ISSN 1799-4942.

Ville Karavirta, Ari Korhonen, Otto Seppälä (2013). [Misconceptions in Visual Algorithm Simulation Revisited: On UI’s Effect on Student Performance, Attitudes and Misconceptions](http://dx.doi.org/10.1109/LaTiCE.2013.35). In Learning and Teaching in Computing and Engineering (LaTiCE), pages 62–69.

Clifford A. Shaffer, Matthew L. Cooper, Alexander Joel D. Alon, Monika Akbar,
Michael Stewart, Sean Ponce, and Stephen H. Edwards (2010). [Algorithm
Visualization: The State of the
Field](https://doi.org/10.1145/1821996.1821997). ACM Trans. Comput. Educ. 10,
3, Article 9 (August 2010), 22 pages.

## Integrating exercises to other software

While [OpenDSA](https://opendsa-server.cs.vt.edu/) itself provides JSAV
exercises integrated to its other learning material, the standalone JSAV
exercises can be integrated to other software as well.

Aalto University courses on data structures and algorithms
(CS-A1141/CS-A1143/CS-A1140) provide their learning material through [A+
LMS](https://apluslms.github.io/). These courses have custom code to integrate
the JSAV exercises into the material. Contact Artturi Tilanterä or Ari Korhonen
(firstname.lastname(at)aalto.fi) for more information.

## Updating gh-pages

You can update gh-pages with the update script:

```bash
git checkout gh-pages
./update
git commit -m "Updated gh-pages"
git push origin gh-pages
git checkout master
```
