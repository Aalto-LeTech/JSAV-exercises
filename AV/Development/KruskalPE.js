/*global graphUtils */
(function() {
  "use strict";

  // Required number of discarded edges before the MST is complete.
  // The graph will be regenerated until this number is reached.
  const MINIMUM_DISCARDS = 2;
  // Whether to print debug messages to the console.
  const debug = false;

  var exercise,
      graph,
      edgeList,
      config = ODSA.UTILS.loadConfig(),
      interpret = config.interpreter,
      settings = config.getSettings(),
      jsav = new JSAV($(".avcontainer"), {settings: settings});

  /**
   * Simple implementation of the Union-Find data structure with path compression.
   * Used for model solution Kruskal's algorithm and for checking the goodness of
   * the randomly generated graph.
  */
  class UnionFind {
    constructor() {
      // Stores the parent of each node. If the node is a root, the parent is the node itself.
      this.parent = {};
    }
    /**
     * Makes a new set with one element.
     * @param {*} x - the element to make a set of
     */
    makeSet(x) {
      this.parent[x] = x;
    }

    /**
     * Finds the representative of the set that x belongs to.
     * Does path compression.
     * @param {*} x - the element to find the set of
     * @returns {*} - the representative of the set that x belongs to
     */
    find(x) {
      // Find the root (representative) of x.
      let root = x;
      while (this.parent[root] !== root) {
        root = this.parent[root];
      }

      // Do path compression by traversing the path from x to the root
      // and updating the parent of each node to be the root.
      let current = x;
      while (current !== root) {
        const nextNode = this.parent[current];
        // Update the parent of the current node to to be the root.
        this.parent[current] = root;
        // Move to the next node in the path.
        current = nextNode;
      }

      // Return the representative of the set.
      return root;
    }

    /**
     * Unions the sets that contain x and y.
     * @param {*} x - element in the first set
     * @param {*} y - element in the second set
     */
    union(x, y) {
      const xRoot = this.find(x);
      const yRoot = this.find(y);
      this.parent[xRoot] = yRoot;
    }
  }

  /*
   * New exercise initializer. Creates a random graph with nodes and edges
   * placed in a fixed grid, two connected components.
   */
  function init() {
    // Clear old elements if reset is clicked.
    graph?.clear();
    edgeList?.clear();

    // Settings for input.
    // It is safest to generate one connected component that has more edges
    // than vertices.
    const width = 500, height = 400,  // pixels
        weighted = true,
        directed = false,
        nVertices = [11],
        nEdges = [14];

    // Generate a random planar graph with the given parameters and check that
    // while executing Kruskal's algorithm, the number of discarded edges before
    // the MST is complete is at least MINIMUM_DISCARDS.

    let bestNlGraph,
        highestDiscards = -1,
        trials = 0;

    while (highestDiscards < MINIMUM_DISCARDS && trials < 100) {
      trials++;
      const nlGraph = graphUtils.generatePlanarNl(nVertices, nEdges, weighted,
                                                  directed, width, height);
      const discardCount = countKruskalDiscards(nlGraph, trials);
      debugPrint(`Trial ${trials}: discardCount: ${discardCount}`);

      if (discardCount > highestDiscards) {
        highestDiscards = discardCount;
        bestNlGraph = nlGraph;
      }
    }
    debugPrint(`Total trials when generating the graph: ${trials}`);

    // Create a JSAV graph instance
    graph = jsav.ds.graph({
      width: width,
      height: height,
      layout: "manual",
      directed: directed
    });
    graphUtils.nlToJsav(bestNlGraph, graph);
    graph.layout();

    const edgeMatrixValues = createEdgeMatrix(graph.edges());
    edgeList = jsav.ds.matrix(edgeMatrixValues, {
      style: "table",
      autoresize: false,
      left: 30,
      top: 80
    });

    jsav.displayInit();
    return graph;
  }

  function fixState(modelGraph) {
    var graphEdges = graph.edges(),
        modelEdges = modelGraph.edges();

    // compare the edges between exercise and model
    for (var i = 0; i < graphEdges.length; i++) {
      var edge = graphEdges[i],
          modelEdge = modelEdges[i];
      if (modelEdge.hasClass("spanning") && !edge.hasClass("spanning")) {
        // mark the edge that is marked in the model, but not in the exercise
        markEdge(edge);
        break;
      }
    }
  }

  /*
   * Creates step-by-step visualisation of the model solution.
   */
  function model(modeljsav) {
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

    var modelEdges = modelGraph.edges();

    const edgeMatrixValues = createEdgeMatrix(modelEdges);

    const edgeMatrix = modeljsav.ds.matrix(edgeMatrixValues, {
      style: "table",
      autoresize: false,
      top: 0,
      left: 10
    });

    modeljsav.displayInit();

    // start the algorithm
    kruskal(modelNodes, modelEdges, edgeMatrix, modeljsav);

    modeljsav.umsg(interpret("av_ms_mst"));
    // hide all edges that are not part of the spanning tree
    for (let i = 0; i < modelGraph.edges().length; i++) {
      if (!modelEdges[i].hasClass("spanning")) {
        modelEdges[i].hide();
      }
    }
    modeljsav.step();

    return modelGraph;
  }

  /*
   * Kruskal's algorithm implementation for the correct (model) solution.
  */
  function kruskal(modelNodes, modelEdges, edgeMatrix, modeljsav) {
    // Add all the nodes to the Union-Find data structure.
    const sets = new UnionFind();
    modelNodes.forEach(function(node) {
      sets.makeSet(node.value());
    });

    // Helper functions that use the Union-Find data structure.

    // Checks if adding the edge would create a cycle in the spanning tree
    function createsCycle(edge) {
      const start = edge.start().value();
      const end = edge.end().value();
      // Check if the start and end nodes are in the same connected component.
      return sets.find(start) === sets.find(end);
    }

    // Connect two sets of vertices with an edge (the UNION operation).
    function addEdge(edge) {
      const start = edge.start().value();
      const end = edge.end().value();
      // Union the two sets
      sets.union(start, end);
    }

    // Helper that finds the index of the edge in the edge matrix for marking purposes.
    function edgeIndex(edge) {
      var eName = "(" + edgeName(edge, ", ") + ")";
      // Edge matrix has one extra row for the header
      const edgeMatrixLen = modelEdges.length + 1;

      for (let i = 1; i < edgeMatrixLen; i++) {
        if (edgeMatrix.value(i, 0) === eName) { return i; }
      }
      return -1;
    }

    // Main algorithm

    // sort edges according to weight and alphabetical order
    modelEdges.sort(compareEdges);

    modelEdges.forEach(function(currentEdge) {
      modeljsav.umsg(interpret("av_ms_processing"), {fill: {edge: edgeName(currentEdge, ", ")}});
      const matrixIndex = edgeIndex(currentEdge);

      if (!createsCycle(currentEdge)) {
        // Add to MST
        modeljsav.umsg(interpret("av_ms_adding"), {preserve: true});
        addEdge(currentEdge);
        edgeMatrix.addClass(matrixIndex, 0, "spanning");
        edgeMatrix.addClass(matrixIndex, 1, "spanning");
        markEdge(currentEdge, modeljsav);
      } else {
        // Discard the edge
        modeljsav.umsg(interpret("av_ms_dismiss"), {preserve: true});
        currentEdge.addClass("discarded");
        edgeMatrix.addClass(matrixIndex, 0, "discarded");
        edgeMatrix.addClass(matrixIndex, 1, "discarded");
        modeljsav.step();
      }
    });
  }

  /**
 * Creates a 2D array of string representations of the edges and their weights.
 * The edges are sorted alphabetically and the first row is a header row.
 * If one sorts the edges of the matrix by weight (stable sort that preservers
 * alphabetic order of equal weights), the order of the edges will be the same
 * as processing order in the model solution.
 * @param {Array} edges - Array of JSAV edges of the graph
 * @returns {Array} - 2D array of string representation of the edges and their weights
 */
  function createEdgeMatrix(edges) {
    // Sort the edges alphabetically.
    const edgesAlphabetical = edges.toSorted(function(a, b) {
      const nameA = edgeName(a);
      const nameB = edgeName(b);
      return nameA < nameB ? -1 : 1;
    });
    // Header row for the edge list
    // "Weight" would probably be better than "w" but I do not
    // know how to make the table column wide enough for it.
    const edgeMatrix = [["Edge", "w"]];
    edgesAlphabetical.forEach(function(edge) {
      const eName = "(" + edgeName(edge, ", ") + ")";
      edgeMatrix.push([eName, edge.weight()]);
    });

    return edgeMatrix;
  }

  /**
   * Executes Kruskal's algorithm on the given graph and counts the number of
   * discarded edges before the MST is complete.
   * @param {object} nlGraph. Graph in adjacency list format as generated by graphUtils.generatePlanarNl.
   * @param {*} trials - Number of trials in generating the graph so far. Is used for debug printing.
   * @returns {number} - Number of discarded edges before the MST is complete.
   */
  function countKruskalDiscards(nlGraph, trials) {
    // Helper function that takes an array of operations as strings and counts
    // the number of discard operations before the last union operation.
    function countDiscards(operationsArr) {
      // First find the index of the last union operation.
      let lastUnionIndex = 0;
      operationsArr.forEach((operation, index) => {
        if (operation.startsWith("union")) {
          lastUnionIndex = index;
        }
      });
      debugPrint(`Trial ${trials}: lastUnionIndex: ${lastUnionIndex}`);

      // Now count discards.
      let discardCount = 0;
      for (let i = 0; i < lastUnionIndex; i++) {
        if (operationsArr[i].startsWith("discard")) {
          discardCount++;
        }
      }

      return discardCount;
    }
    // Convert the graph to an array of edges.
    const edgeArr = graphUtils.nlToEdgeArr(nlGraph, false);

    // Execute Kruskal's algorithm and count the number of discarded edges before
    // the MST is complete.

    // Sort the edges by weight and then by alphabetical order (as in the model solution).
    edgeArr.sort((a, b) => {
      const weightDiff = a.w - b.w;
      if (weightDiff !== 0) {
        return weightDiff;
      }
      // Weights are equal, sort alphabetically.
      const nameA = [nodeIndexToLabel(a.u), nodeIndexToLabel(a.v)].sort().join("");
      const nameB = [nodeIndexToLabel(b.u), nodeIndexToLabel(b.v)].sort().join("");
      return nameA < nameB ? -1 : 1;
    });

    const sets = new UnionFind();
    // Add all the nodes to the Union-Find data structure.
    nlGraph.vertices.forEach((vertexObj, index) => {
      sets.makeSet(index); // identify each vertex with its index
    });

    // Create array that stores the operations to count the discarded edges.
    const operations = [];

    // Kruskal main loop
    edgeArr.forEach((edge) => {
      if (sets.find(edge.u) !== sets.find(edge.v)) {
        sets.union(edge.u, edge.v);
        operations.push(`union ${nodeIndexToLabel(edge.u)}-${nodeIndexToLabel(edge.v)}`);
      } else {
        // The edge is discarded as adding it would create a cycle.
        operations.push(`discard ${nodeIndexToLabel(edge.u)}-${nodeIndexToLabel(edge.v)}`);
      }
    });

    return countDiscards(operations);
  }

  function markEdge(edge, av) {
    edge.addClass("spanning");
    edge.start().addClass("spanning");
    edge.end().addClass("spanning");
    if (av) {
      av.gradeableStep();
    } else {
      exercise.gradeableStep();
    }
  }

  function getValue(node) { return node.value(); }

  function edgeName(edge, separator) {
    var s = separator || "";
    return [edge.start(), edge.end()].map(getValue).sort().join(s);
  }

  /*
   * Comparator function for two weighted edges in a JSAV graph.
   */
  function compareEdges(a, b) {
    const weightDiff = a.weight() - b.weight();
    if (weightDiff !== 0) {
      return weightDiff;
    }
    // Weights are equal, sort alphabetically.
    const nameA = edgeName(a);
    const nameB = edgeName(b);
    return nameA < nameB ? -1 : 1;
  }

  /**
   * Converts the index of a node in the graph to a label for the node.
   * @param {number} index - index of the node in the graph
   * @returns {string} - label for the node
   */
  function nodeIndexToLabel(index) {
    return String.fromCharCode("A".charCodeAt(0) + index);
  }

  function debugPrint(...args) {
    if (debug) {
      console.log(...args);
    }
  }

  // Process About button: Pop up a message with an Alert
  function about() {
    window.alert(ODSA.AV.aboutstring(interpret(".avTitle"), interpret("av_Authors")));
  }

  exercise = jsav.exercise(model, init, {
    compare: {class: "spanning"},
    controls: $(".jsavexercisecontrols"),
    resetButtonTitle: interpret("reset"),
    fix: fixState
  });
  exercise.reset();

  $(".jsavcontainer").on("click", ".jsavedge", function() {
    var edge = $(this).data("edge");
    if (!edge.hasClass("spanning")) {
      markEdge(edge);
    }
  });

  $(".jsavcontainer").on("click", ".jsavgraphnode", function() {
    alert("Please click on graph edges from the array to the left NOT graph nodes");
  });

  $("#about").click(about);
})();
