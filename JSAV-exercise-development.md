# Developing JSAV Exercises

This repository is useful for developing JSAV exercises
standalone, even without JSAV Exercise Recorder, full OpenDSA source, or a
learning management system. JSAV exercises are pure browser-side JavaScript,
HTML and CSS. If you would like to develop JSAV exercises but don't know how to
start, here is suggested reading in order.

1. [JSAV webpage](http://jsav.io/). There are installation instructions,
   JSAV API documentation, and even a tutorials to create slideshows and
   exercises.

2. [JSAV-exercise-notes.md](JSAV-exercise-notes.md). In this repository,
   written by Johanna Sänger who developed existing OpenDSA exercises further.
   This document contains a walkthrough of the code of one exercise.

3. [OpenDSA System Documentation](https://opendsa.readthedocs.io/en/latest/AV.html). OpenDSA is the
   open source interactive textbook which contains algorithm visualization
   exercises made with JSAV. Their extensive system documentation includes
   information for developing JSAV exercises. You don't need the whole OpenDSA
   to develop a new, standalone JSAV exercise, but some information here might
   be useful if you're wondering the meaning of some testbench code.

## Setting up development environment with code linting

This repository uses [ESlint](https://eslint.org/) to lint JavaScript code. ESlint is a tool for identifying and reporting on patterns found in JavaScript code, with the goal of making code more consistent and avoiding bugs. The configuration file `eslint.config.mjs` is adapted from [OpenDSA repository](https://github.com/OpenDSA/OpenDSA). You do not really *need* npm or ESlint to develop JSAV exercises, but it is highly recommended to use them. The following steps are for setting up development environment with ESlint.

1. Ensure that you have the following installed:

   - **Node.js** (ESlint requires version ^18.18.0, ^20.9.0, or >=21.1.0)
   - **npm** (Node Package Manager, comes with Node.js)

   This can be checked with commands `node -v` and `npm -v`.

   You can download and install Node.js from the [official website](https://nodejs.org/en/download/package-manager). You will need sudo rights for this. On Aalto Linux machines without sudo rights you can search for available Node.js versions with command `pkcon search name nodejs` and install with `pkcon install <package name>`.

2. Clone this repository (using a SSH key).

   ```bash
   git clone git@github.com:Aalto-LeTech/JSAV-exercises.git

   cd JSAV-exercises # Move to the repository root
   ```

3. Install ESlint and its dependencies listed in `package.json`.

   ```bash
   npm install
   ```

4. You should be good to go. JavaScript code can be linted with the following command:

   ```bash
   npx eslint path/to/your/file.js
   ```

   For real time linting, set up ESlint in your code editor. For example, in Visual Studio Code, install [ESlint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

## Testing the exercises

To test the exercises locally, you should disable browser cache. The following steps outline the workflow:

1. Start the testbench by running `./start_testbench.py` (consult [main README](README.md) for more detailed info)

2. Open <http://localhost:8000/AV/Development/> with your web browser.

3. Open developer tools on your browser.
   (Firefox: Press F12)

4. Disable cache in developer tools.
   (Firefox: Select the Network tab. Tick the 'Disable Cache' box.)

5. Click the link of one of the HTML files in the browser's normal page view.
   Example: DijkstraPE-research.html.

6. The JSAV-based exercise starts now. You can edit the source code on the
   disk with your favorite text editor and then update the page in your
   browser to see the changes.

7. When done, shutdown the testbench by pressing Ctrl+C in the same terminal that was used to start the script.

### Testing Finnish translations

One can test the Finnish translation of a JSAV exercise by adding the following
string at the end of the exercise URL: `?JOP-lang=fi&JXOP-code=finnish`

Example:

- [English Red-black tree](http://localhost:8000/AV/Development/redBlackTreePRO.html)
- [Finnish Red-black tree](http://localhost:8000/AV/Development/redBlackTreePRO.html?JOP-lang=fi&JXOP-code=finnish)

The URL parameter `JOP-lang` controls the language of the exercise interface.
Its value should correspond to a key under key `translations` in the exercise
translation JSON file, e.g. `redBlackTreePRO.json`.

The URL parameter `JXOP-code`controls the language of the pseudocode,
corresponding to a key under key `code`in the exercise translation JSON file.

## Design

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
