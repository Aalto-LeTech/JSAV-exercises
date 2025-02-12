# Developer notes for JSAV exercises

Johanna Sänger, 2023

The full JSAV documentation can be found at https://jsav.io/ . 

Creating JSAV exercises requires several files: 
- an HTML file that embeds the JSAV exercise
- a JSON file that contains the translations and extra parameters such as code
- a JS file that contains the JSAV exercise information
- optionally, a CSS file that contains extra style information

-------

## HTML & CSS: 

The structure of the HTML is explained based on the
Common Trie exercise whose source code is at
[commonTriePRO.html](testbench/OpenDSA/AV/Development/commonTriePRO.html).
See [the main README > Introduction with testbench](README.md) on how to run
the exercise in the testbench.



OpenDSA and JSAV have two style sheets that are typically linked in the header: 

```html
  <link rel="stylesheet" href="../../JSAV/css/JSAV.css" type="text/css" />
  <link rel="stylesheet" href="../../lib/odsaAV-min.css" type="text/css" />
```

Additionally, most exercises have their own style sheet. These contain the exercise-specific style rules. These are located in the same folder, and thus embedded under an `href="exerciseName.css"`


Next, in the body, the html contains the scaffold for the JSAV exercise. In the case of `commonTriePRO.html`, this is minimal:
```html
  <div id="jsavcontainer">
    <h1 class="exerciseTitle"></h1>
    <p class="instructLabel"></p>
    <p class="instructions"></p>
    <p align="center" class="jsavexercisecontrols"></p>
    <p class="jsavoutput jsavline"></p>
    <p class="jsavscore"></p>
  </div>
```
Some exercises have more parts there, but the above example is sufficient for the JSAV exercises. 

Next, the exercise includes a list of scripts. This starts with the specific library dependencies (jQuery and raphael). Then comes the JSAV & OpenDSA specific includes: `JSAV-min.js`, `odsaUtils-min.js`, and `odsaAV-min.js`. This exercise in specific also has the stack dependency. Lastly, the exercise includes two more scripts: `ClickHandler.js`, which is required for every exercise to ensure proper working of clicking, and the exercise specific file `commonTriePRO.js`. 

This last file changes with the exercise and contains the JSAV exercise. 

```html
  <script src="https://code.jquery.com/jquery-2.1.4.min.js"></script>
  <script src="https://code.jquery.com/ui/1.11.4/jquery-ui.min.js"></script>
  <script src="../../JSAV/lib/jquery.transit.js"></script>
  <script src="../../JSAV/lib/raphael.js"></script>
  <script src="../../JSAV/build/JSAV-min.js"></script>
  <script src="../../JSAV/extras/stack.js"></script>
  <script src="../../lib/odsaUtils-min.js"></script>
  <script src="../../lib/odsaAV-min.js"></script>
  <script src="ClickHandler.js"></script>
  <script src="commonTriePRO.js"></script>
```
-------
## JavaScript

The JavaScript files that contain the actual exercise follow a consistent format. The format is described at the hand of the `graphDFSPE.js` file, which is a depth-first search exercise. 
The exercise API can be found [here](https://jsav.io/exercises/exercise/), and the documentation's tutorial can be found [here](https://jsav.io/exercises/tutorial-exercise/). 

-------
### Initial set of variables

The JavaScript files have a fairly consistent format in that they contain purely the code for that specific exercise. The initialisation of the exercises follows a set pattern. First, a bunch of variables are declared. Below is the first part of `graphDFSPE.js`:

```js
  var exercise,
      graph,
      config = ODSA.UTILS.loadConfig(),
      interpret = config.interpreter,
      settings = config.getSettings(),
      jsav = new JSAV($('.avcontainer'), {settings: settings});

  jsav.recorded();
```
A quick explanation:
- `exercise`: gets the JSAV exercise later on in the file. 
- `graph`: gets the graph object later on in the file
- `config`: allows us to call the interpreter, get settings, and get code
- `interpret`: the interpreter function that is used to display the text strings from the JSON file (more on that later)
- `settings`: the settings that need to be passed on to JSAV for creating the exercise
- `jsav`: also called `av` in some files. This is the exercise algorithm visualisation. The jQuery selector is used to select the `div` in which the exercise will be located. 

`jsav.recorded()` is an important line of code: this line of code makes it so that the learner's actions are animated. Further explanation on this can be found in the [JSAV Documentation](https://jsav.io/exercises/tutorial-exercise/). 

-------
### The exercise variable
The exercise variable stores the JSAV exercise instance. It has three parameters that need to be passed along:
- `model`: the model answer function
- `init`: the initialisation function
- An object that contains extra parameters. 
  - `compare`: optional parameters that need to be compared on. Default is complete equality. In this exercise, it only looks at whether all objects are equal with regards to having the class "marked". 
  - `controls`: the HTML element in which the buttons should end up
  - `resetButtonTitle`: This changes the default value of the reset button to the specified value. Default is "reset". 
  - `fix`: A function that fixes student's mistake in a continuously graded exercise.  

```js
  exercise = jsav.exercise(model, init, {
    compare: { class: "marked" },
    controls: $('.jsavexercisecontrols'),
    resetButtonTitle: interpret("reset"),
    fix: fixState
  });
  exercise.reset();
```
To ensure that the initial exercise is properly generated, we call `exercise.reset()`. 

More information about the JSAV exercises can be found in the [documentation](https://jsav.io/exercises/exercise/). 

-------
### Initialisation function
Next, the exercise needs an initialisation function. Although there is no requirements on the name for it, often the function is called `init` or `initialise` in the Trak Y material. The function takes no parameters and returns a single JSAV dat structure or an array of JSAV data structures. 

A shortened version of the `graphDFSPE.js` init function is shown below.

```js 
function init() {
    /***
     Some code has been emitted for brevity
     ***/

    // Create a JSAV graph instance
    if (graph) {
      graph.clear();
    }
    graph = jsav.ds.graph({//    Condition:
      width: width,
      height: height,
      layout: "manual",
      directed: directed
    });
    graphUtils.nlToJsav(nlGraph, graph);
    graph.layout();
    graph.nodes()[0].addClass("marked"); // mark the 'A' node
    jsav.displayInit();
    return graph;
  }
```
The code uses the graph variable that has been initialised at the start of the file. First, the variable is cleared if it contains something. Then with `graph = jsav.ds.graph()` the JSAV data structure is created with the passed variables. In this instance, the layout is manual, rather than calculated by JSAV. After each time that the layout is changed, the `.layout()` function needs to be called on the changed data structure. Only at this point does JSAV visualise the changes in the state. 

At the end of the init function, the graph is returned. This means that the graph is the only part of the exercise that is used for grading purposes, i.e. other parts of the exercise and ancillary structures are ignored for the purpose of determining the student's grade. 

-------
### Handling of the learner's steps
The init function is purely there to initialise the exercise instance and bind relevant handlers. The handling of the learner's behaviour happens in other parts of the code. For example, in `graphDFSPE.js`, the users can click on the edges and mark them that way. This is done via the following two functions: 

```js
  $(".jsavcontainer").on("click", ".jsavedge", function () {
    var edge = $(this).data("edge");
    if (!edge.hasClass("marked")) {
      markEdge(edge);
    }
  });

  function markEdge(edge, av) {
    edge.addClass("marked");
    edge.start().addClass("marked");
    edge.end().addClass("marked");
    if (av) {
      av.gradeableStep();
    } else {
      exercise.gradeableStep();
    }
  }
```
The first function binds the click handler to the edges, and the second function records the action for the exercise. The learner's step is saved in `exercise.gradeableStep()`. When `markEdge` gets called on an edge, it adds the `marked` class to the edge and the nodes on either side of the edge. The class is added using the methods of the JSAV datastructure for the edge, as we want JSAV to track the change that happens here. If the class change is done using jQuery, then JSAV does not store the information. 

This function specifically is used both by the model answer and by the exercise. The model answer passes the extra variable `av`. The model answer in this case calls `av.gradeableStep()`, although the model answer also has the possibility of calling `av.step()`, for when there is an extra step to break down multiple changes or multiple lines of narration without it being the gradeable step. 

### Model answer

The model answer contains the solution for the exercise. The model answer has to return the same data structure types as the exercise. For exercises with multiple data structures being returned as an array, the elements of the array must be in the same order. Unlike the initialisation function, the model answer takes one parameter: the model av. This parameter is passed to it by JSAV. 

Below is the model answer for `graphDFSPE.js`. This exercise uses a helper function to generate a copy of the graph instance. 

```js
function model(modeljsav) {
    var i;
    // create the model
    var modelGraph = modeljsav.ds.graph({
      width: 500,
      height: 400,
      layout: "automatic",
      directed: false
    });

    // copy the graph and its weights
    graphUtils.copy(graph, modelGraph, {weights: true});
    var modelNodes = modelGraph.nodes();

    // Mark the 'A' node
    modelNodes[0].addClass("marked");

    modeljsav.displayInit();
```
After the instance is copied and the starting points are equivalent, it is time to run the solution algorithm on it. In this case, that is the function `dfs()`. This helper function does the majority of the model answer. `modeljsav` is passed along as a variable so that the `dfs()` function can make gradeable steps in the model answer, as well as set and update the explanations in it. 

```js
    // start the algorithm
    dfs(modelNodes[0], modeljsav);

    modeljsav.umsg(interpret("av_ms_final"));
    // hide all edges that are not part of the search tree
    var modelEdges = modelGraph.edges();
    for (i = 0; i < modelGraph.edges().length; i++) {
      if (!modelEdges[i].hasClass("marked")) {
        modelEdges[i].hide();
      }
    }

    modeljsav.step();

    return modelGraph;
  }
``` 
Once the algorithm is ran, a few wrap-ups are done.  `modeljsav.umsg()` sets the text message on screen. The `interpret()` function reads the string from the exercise-corresponding JSON in the correct language. In this way, the same exercise exists in both Finnish and English.

At the end of the code snippet, `modeljsav.step()` is called. This is to show the final explanation without introducing a gradeable state. `.step()` is used for extra explanation in the model answer. 

The model answer can function the exact same way as the exercise AV, but the model answer has extra functionality it can call upon as well to give explanations. 

---
## JSON

The JSON file is one object that contains at least a `"translations"` object. The `"translations"` object contains an unspecified amount of language objects, indexed by the two-letter acronym, i.e. `"fi"` for Finnish. 

The below code is a shortened version of `commonTriePRO.json`. The translations object contains both English and Finnish strings. Each language object contains the same keys within it. 

There is also a `code` object in this json file. Each code object contains language objects as well, though this time it is the programming language. Each language object contains the information about where the code file is stored in the `url` key.

```json
{
  "translations" :{
    "en": {
      ".exerciseTitle": "Common Trie",
      ".instructLabel": "",
      ".instructions": ""
    },
    "fi": {
      ".exerciseTitle": "Merkkijonopuu",
      ".instructLabel": "Ohjeet:",
      ".instructions": ""
    }
  },
  "code": {
    "pseudo": {
      "url": "../../SourceCode/Pseudo/Binary/CommonTrie.txt",
      "tags": {}
    }
  }
}
```

The code block can also have multiple objects related to different pieces of code. This can be different code files, or different line ranges within the code file, as in the `rotationPRO.json` file. Where to start and end is indicated by the `startAfter` and `endBefore` keys. 

```json
"code" : {
    "C": {
      "single": {
        "url": "../../SourceCode/C/Binary/TreeRotation.c",
        "startAfter": "/* *** ODSATag: single *** */",
        "endBefore": "/* *** ODSAendTag: single *** */"
      },
      "double": {
        "url": "../../SourceCode/C/Binary/TreeRotation.c",
        "startAfter": "/* *** ODSATag: double *** */",
        "endBefore": "/* *** ODSAendTag: double *** */"
      },
      "struct": {
        "url": "../../SourceCode/C/Binary/TreeRotation.c",
        "startAfter": "/* *** ODSATag: struct *** */",
        "endBefore": "/* *** ODSAendTag: struct *** */"
      }
    }
  }
```

A second option is that the code is directly stored in the JSON file, as done in   `redBlackTree.json`. A shortened fragment of it is shown below. Note that each line of code gets its own string. 

```json
  "code": {
    "english": [
      "1. Search (top-down) and insert the new item u as in a Binary Search Tree.",
      "2. Return (bottom-up) and",
      "2.1 If u is root, make it black and the algorithm ends.",
      "2.2 if u's parent t is black, the algorithm ends."
    ],
    "finnish": [
      "1. Hae (juuresta lehteen) alkion paikka puussa ja lisää alkio",
      "   kuten binäärisessä hakupuussa.",
      "2. Palaa (lehdestä juureen päin) ja",
      "2.1 jos u on juuri, väritetä se mustaksi ja lopeta.",
      "2.2 jos u:n vanhempi t on musta, lopeta."
    ]
  }
```




## Some common functionality and oddities

### Code blocks
Several exercises, including the graph exercises, have JSAV Code blocks in them. These code blocks are floating divs, so as to easily accomodate for less wide screens. 
The code blocks have their own div in the HTML file. This div contains a second div, that is used for actually placing the code block. This is because JSAV can only append code after a div, not inside a div. The outer div contains the float information, and the inner div is used to append to. 

### Scaffolded exercises
The scaffolded exercises rebuild the priority queue, legend and table for every exercise. This is needed to get the exercise to work properly and to properly reset the exercises. 

The tables are positioned relative to the div that contains the priority queue and the legend, this was the easiest way to get them to be centered. The same reason is why the priority queue and legend are in a div together - for ease of centering. 

The legend is an SVG that is hard-coded into the exercise file. There are separate style rules for them in the css file. 




