/*
Contains common code for graph traversal exercises BFS and DFS.
Implements the TraversalExerciseBuilder class which is used to create
initialization, model solution, fix state and that can be passed for
JSAV exercise object.
*/

/* global graphUtils createAdjacencyList*/

/**
 * Calculate the spanning tree for the nlGraph. This is used to ensure
 * that the spanning tree is sufficiently large and the exercise is not
 * trivially easy.
 * The spanning tree is calculated using the BFS algorithm.
 * @param nlGraph as returned by graphUtils.js
 * @returns spanning tree edge list
 */
function spanning_tree(nlGraph) {
  let visited = [];
  let queue = [];
  let edges = []; //Edges selected in the bfs spanning tree.
  let node = 0;
  queue.push(node);

  while (queue.length > 0) {
    node = queue.shift();
    visited.push(node);
    for (const neighbor of nlGraph.edges[node]) {
      if (!visited.includes(neighbor.v) && !queue.includes(neighbor.v)) {
        queue.push(neighbor.v);
        edges.push([node, neighbor.v]);
      }
    }
  }
  return edges;
}


/**
 * Builder class that has methods for creating the initialization, model solution,
 * fix state and about functions for a BFS or DFS exercise. Holds the graph and
 * adjacency list representation as the graph as instance variables so that they
 * can be accessed in init, model and fix state functions. Note the declaration of
 * built functions as arrow functions so that they can access the instance variables.
 */
class TraversalExerciseBuilder {
  constructor() {
    this.graph = null;
    this.neighbourList = null; // type of this is JSAV pseudo code object
  }

  /**
   * Builds the initialization function for the exercise.
   * @param {Object} jsav - The JSAV instance.
   * @returns {Function} The initialization function.
  */
  buildInit(jsav) {
    // This is arrow function so that this is inherited.
    const init = () => {
      // Settings for input
      const width = 500, height = 400,  // pixels
          weighted = false,
          directed = false,
          nVertices = [11, 3],
          nEdges = [14, 2];

      // First create a random planar graph instance in neighbour list format
      let nlGraph = graphUtils.generatePlanarNl(nVertices, nEdges, weighted,
                                                directed, width, height);

      // Assure that the random planar graph has A connected to another node
      // and a sufficiently large spanning tree, i.e. at least 7 edges
      while (spanning_tree(nlGraph).length < 7) {
        console.warn("TOO SMALL SPANNING TREE:", spanning_tree(nlGraph).length);
        nlGraph = graphUtils.generatePlanarNl(nVertices, nEdges, weighted, directed, width, height);
      }

      this.neighbourList?.clear(); // clear neighbour list if it already exist (when reset is clicked)
      this.neighbourList = createAdjacencyList(nlGraph, jsav, {
        lineNumbers: false,
        after: {element: $(".neighbourlist")}
      });
      // Create a JSAV graph instance
      this.graph?.clear();
      this.graph = jsav.ds.graph({
        width: width,
        height: height,
        layout: "manual",
        directed: directed
      });

      graphUtils.nlToJsav(nlGraph, this.graph);
      this.graph.layout();
      this.graph.nodes()[0].addClass("visited"); // mark the 'A' node
      jsav.displayInit();

      // Remove the initially calculated size so that the graph sits next
      // to the code.
      $(".jsavcanvas").css("min-width", "");
      return this.graph;
    };
    return init;
  }

  /**
   * Builds the model solution function for the exercise.
   * @param {Function} algorithm - The algorithm to be used (BFS or DFS).
   * @param {Function} interpret - The interpret function for messages.
   * @param {boolean} [addQueue=false] - Whether to add a queue for BFS.
   * @returns {Function} The model solution function.
   */
  buildModel(algorithm, interpret, addQueue = false) {
    // This is again arrow function so that this is inherited.
    const modelSolution = (modeljsav) => {
      const modelGraph = modeljsav.ds.graph({
        width: 500,
        height: 400,
        left: 150,
        top: 50, // to give space for queue
        layout: "automatic",
        directed: false
      });

      const modelQueue = addQueue ? modeljsav.ds.list({left: 150}) : null;

      // copy the graph and its weights
      graphUtils.copy(this.graph, modelGraph, {weights: true});
      const modelNodes = modelGraph.nodes();

      // Mark the "A" node and add it to visible queue.
      modelNodes[0].addClass("visited");
      modelQueue?.addFirst(modelNodes[0].value());

      modeljsav.displayInit();

      // Start the algorithm.
      // Algorithm records the steps to modeljsav.
      algorithm(modelNodes[0], modeljsav, modelQueue);

      modeljsav.umsg(interpret("av_ms_final"));
      // hide all edges that are not part of the search tree
      const modelEdges = modelGraph.edges();
      for (let i = 0; i < modelEdges.length; i++) {
        if (!modelEdges[i].hasClass("visited")) {
          modelEdges[i].hide();
        }
      }

      modeljsav.step();

      return modelGraph;
    };
    return modelSolution;
  }

  /**
   * Builds the fix state function for the exercise.
   * @param {Object} exercise - The exercise instance.
   * @returns {Function} The fix state function.
   */
  buildFixState(exercise) {
    // Helper
    function markEdge(edge) {
      edge.addClass("visited");
      edge.start().addClass("visited");
      edge.end().addClass("visited");
      exercise.gradeableStep();
    }
    // This is again arrow function so that this is inherited.
    const fixState = (modelGraph) => {
      const graphEdges = this.graph.edges(),
          modelEdges = modelGraph.edges();

      // compare the edges between exercise and model
      for (let i = 0; i < graphEdges.length; i++) {
        const edge = graphEdges[i],
            modelEdge = modelEdges[i];
        if (modelEdge.hasClass("visited") && !edge.hasClass("visited")) {
          // mark the edge that is marked in the model, but not in the exercisemodeljsav
          markEdge(edge);
          break;
        }
      }
    };
    return fixState;
  }

  /**
   * Builds the about function for the exercise.
   * @param {Function} interpret - The interpret function for messages.
   * @returns {Function} The about function.
   */
  buildAboutAlert(interpret) {
    function about() {
      window.alert(ODSA.AV.aboutstring(interpret(".avTitle"), interpret("av_Authors")));
    }
    return about;
  }
}
