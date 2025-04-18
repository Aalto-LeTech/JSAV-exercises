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

3. [JSAV-grader-functionality.md](JSAV-grader-functionality.md). Also a document in this repository. Contains
   notes on how the grading of the exercises works.

4. [OpenDSA System Documentation](https://opendsa.readthedocs.io/en/latest/AV.html). OpenDSA is the
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

## Testing exercises

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
