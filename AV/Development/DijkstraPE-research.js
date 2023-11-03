/*
 * Research version of Dijkstra's algorithm JSAV exercise
 * Artturi Tilanterä
 * artturi.tilantera@aalto.fi
 * 5 November 2021
 */

/* global ODSA, graphUtils */
(function ($) {
  "use strict";
  var exercise,
      graph,
      config = ODSA.UTILS.loadConfig(),
      interpret = config.interpreter,
      settings = config.getSettings(),
      code = config.code,
      pseudo,
      jsav = new JSAV($('.avcontainer'), {settings: settings}),
      exerciseInstance,
      generator,
      debug = false; // produces debug prints to console

  generator = new DijkstraInstanceGenerator(debug);
  jsav.recorded();

  if (code) {
    pseudo = jsav.code($.extend({after: {element: $(".code")}}, code));
    pseudo.highlight(8)
  } else {
    pseudo = jsav.code();
  }

   //Add the legend to the exercise
   const edge = '<path d="M25,30L75,30" class="legend-edge"></path>'
              +'<text x="90" y="35">' + interpret("graph_edge") + '</text>'
    const spanningEdge = '<path d="M25,80L75,80" class="legend-spanning">' 
                       + '</path><text x="90" y="85">'
                       + interpret("spanning_edge") + '</text>'
    const legend = "<div class='subheading'><center><strong>" 
                 + interpret("legend")
                 + "</center></strong></div>" 
                 + "<div class='legend'>"
                 + "<svg version='1.1' xmlns='http://www.w3.org/ 2000/svg'> "
                 + edge + spanningEdge
                 + " </svg></div>"
    $(".codeblock").append(legend)

  function init() {
    // Create a JSAV graph instance
    if (graph) {
      graph.clear();
    }
    const layoutSettings = {
      width: 500,      // pixels
      height: 400,     // pixels
      layout: "manual",
      directed: false
    }
    graph = jsav.ds.graph(layoutSettings);
    
    exerciseInstance = generator.generateInstance();
    researchInstanceToJsav(exerciseInstance.graph, graph, layoutSettings);
    // window.JSAVrecorder.addMetadata('roleMap', exerciseInstance['roleMap']);

    graph.layout();
    graph.nodes()[exerciseInstance.startIndex].addClass("spanning"); // mark the 'A' node
    jsav.displayInit();
    // Remove the initially calculated min-width to ensure that the graph is 
    // to the right of the code block. 
    $(".jsavcanvas").css("min-width", "")
    return graph;
  }

  /*
   * Copies edge and vertex data from a research instance graph into a JSAV
   * graph.
   *
   * Parameters:
   * riGraph: a research instance graph returned fron generateInstance().
   * jsavGraph: a JSAV graph object.
   * layoutSettings: Graph layout settings. The JSAV exercise uses this first
   *                 to create a JSAV graph instance. The same settings are
   *                 used here to communicate the pixel width and height of
   *                 the graph layout.
   *   layoutSettings = {
   *     width: 500,       // pixels
   *     height: 400,      // pixels
   *     layout: "manual", // only for JSAV
   *     directed: false   // only for JSAV
   *   }
   */
  function researchInstanceToJsav(riGraph, jsavGraph, layoutSettings) {
    // Compute coordinates of the vertices in the JSAV exercise
    const gridStepX = Math.floor(layoutSettings.width / 4);
    const gridStepY = Math.floor(layoutSettings.height / 4);
    function rnd(x) {
      // Returns a random integer between -x and x (both inclusive)
      return Math.floor(Math.random() * (2 * x + 1)) - x;
    }

    let vertexCoordinates = [];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        vertexCoordinates.push({
          left: Math.floor(x * gridStepX + rnd(10)),
          top: Math.floor(y * gridStepY + rnd(10))
        });
      }
    }
    // Add the vertices as JSAV objects
    for (let i = 0; i < riGraph.edges.length; i++) {
      let label = riGraph.vertexLabels[i];
      jsavGraph.addNode(riGraph.vertexLabels[i], vertexCoordinates[i]);
    }
    // Add the edges as JSAV objects
    const gNodes  = jsavGraph.nodes();
    let options = {};
    for (let i = 0; i < riGraph.edges.length; i++) {
      for (let e of riGraph.edges[i]) {
        // i is the index of start node
        // e[0] is the index of end node
        // e[1] is the weight
        options.weight = e[1];
        jsavGraph.addEdge(gNodes[i], gNodes[e[0]], options);
      }
    }
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
   * Creates the model solution of the exercise.
   * Note: this function is called by the JSAV library.
   *
   * Parameters:
   * modeljsav: a JSAV algorithm visualization template
   *            (created like: let modeljsav = new JSAV("container"))
   */
  function model(modeljsav) {
    var i,
        graphNodes = graph.nodes();
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

    // Create a distance matrix for the visualization.
    // - Each row is a node.
    // - Columns: label of node, distance, previous node
    // Initially all nodes have infinity distance and no previous node,
    // except that the distance to the initial node is 0.

    let labelsAndIndices = []; // List of nodes by [label, index] sorted by
                               // labels. The index is the index of
                               // modelNodes. Example:
                               // [['A', 3], ['B', 1], ['C', 3]]
    for (i = 0; i < graphNodes.length; i++) {
      labelsAndIndices.push([graphNodes[i].value(), i]);
    }
    labelsAndIndices.sort();
    var distanceMatrixValues = [];
    for (i = 0; i < graphNodes.length; i++) {
      distanceMatrixValues.push([labelsAndIndices[i][0], "∞", "-"]);
    }
    // Initial node is A which is at index 1. Set its distance to 0.
    distanceMatrixValues[0][1] = 0;

    // Set layout of the distance matrix
    var distances = modeljsav.ds.matrix(distanceMatrixValues, {
      style: "table",
      center: false
    });
    distances.element.css({
      position: "absolute",
      top: 0,
      left: 10
    });

    // Mark the initial node
    modelNodes[exerciseInstance.startIndex].addClass("spanning");

    modeljsav.displayInit();

    // start the algorithm
    let indexOfLabel = {};
    for (let l of labelsAndIndices) {
      indexOfLabel[l[0]] = l[1];
    }
    dijkstra(modelNodes, distances, modeljsav, indexOfLabel);

    modeljsav.umsg(interpret("av_ms_shortest"));

    // hide all edges that are not part of the spanning tree
    var modelEdges = modelGraph.edges();
    for (i = 0; i < modelGraph.edges().length; i++) {
      if (!modelEdges[i].hasClass("spanning")) {
        modelEdges[i].hide();
      }
    }

    modeljsav.step();

    return modelGraph;
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

  /*
   * Dijkstra's algorithm which creates the model solution used in grading
   * the exercise or creating an algorithm animation.
   *
   * Parameters:
   * nodes:     an array of JSAV Nodes
   * distances: a JSAV Matrix containing the following columns:
   *              label of node, distance, previous node.
   * av:        a JSAV algorithm visualization template
   * indexOfLabel: mapping from node labels ("A", "B", "C") to indices of
   *               array `nodex`.
   */
  function dijkstra(nodes, distances, av, indexOfLabel) {

    // Helper function: returns the distance for the given index in the
    // JSAV distance matrix.
    function getDistance(index) {
      var dist = parseInt(distances.value(index, 1), 10);
      if (isNaN(dist)) {
        dist = Infinity;
      }
      return dist;
    }

    // Note: this is a variant of the Dijkstra's algorithm which does *not*
    // use a priority queue as an auxiliary data structure. Instead, at
    // every round of the main loop, it scans through all nodes and finds the
    // one which is not yet visited and has minimal distance.
    for (let counter = 0; counter < 30; counter++) { // prevent infinite loop
      // find node closest to the minimum spanning tree
      var min = Infinity,        // distance of the closest node not yet visited
          nodeIndex = -1;        // index of the closest node not yet visited
                                 // in the distance matrix
      logDistanceMatrix(distances);
      for (var i = 0; i < nodes.length; i++) {
        if (!distances.hasClass(i, true, "unused")) {
          var dist = getDistance(i);
          if (dist < min) {
            min = dist;
            nodeIndex = i;
          }
        }
      }
      if (min === Infinity || nodeIndex === -1) {
        // No reachable nodes left, finish the algorithm.
        av.umsg(interpret("av_ms_unreachable"));
        av.step();
        break;
      }
      let node = nodes[indexOfLabel[String.fromCharCode(65 + nodeIndex)]];
      if (!node) { break; } // failsafe?
      distances.addClass(nodeIndex, true, "unused");
      debugPrint("Dijkstra: select node " + node.value());

      if (nodeIndex === 0) {
        av.umsg(interpret("av_ms_select_a"));
      } else {
        av.umsg(interpret("av_ms_select_node"), {fill: {node: node.value()}});
      }
      av.step();

      // get previous node if any
      let prevLabel = distances.value(nodeIndex, 2);
      if (prevLabel !== "-") {
        let prevNode = nodes[indexOfLabel[prevLabel]]
        av.umsg(interpret("av_ms_add_edge"),
          { fill: {from: prevNode.value(), to: node.value()}});
        markEdge(prevNode.edgeTo(node), av);
        debugPrint("Add edge: " + prevNode.value() + "-" + node.value());
      }

      // update distances for neighbors
      let neighbors = node.neighbors();
      while (neighbors.hasNext()) {
        let neighbor = neighbors.next();
        // neighborIndex: index in the distance matrix
        let neighborIndex = neighbor.value().charCodeAt(0) - "A".charCodeAt(0);
        // nodeIndex: index in the distance matrix
        let nodeIndex = node.value().charCodeAt(0) - "A".charCodeAt(0);
        let d = getDistance(neighborIndex);
        let dThroughNode = getDistance(nodeIndex) +
              node.edgeTo(neighbor).weight();
        debugPrint("Neighbor: " + neighbor.value() + " distance: " + d);

        // Shorter route found?
        if (!distances.hasClass(neighborIndex, true, "unused") && d > dThroughNode) {
          // update the distance of the neighbour in the distance matrix
          distances.value(neighborIndex, 1, dThroughNode);
          // update the label previous node of the neighbour in the distance
          // matrix
          distances.value(neighborIndex, 2, node.value());
        }
      }
      av.umsg(interpret("av_ms_update_distances"), {fill: {node: node.value()}});
      av.step();

    }
  }

  /*
  * Artturi's debug print, because inspecting JSAV data structures in a
  * JavaScript debugger is a pain (too complex).
  *
  * Parameters:
  *
  * distances: a JSAV Matrix containing the following columns:
  *              label of node, distance, previous node.
  *
  * debugPrint()s the distance matrix values.
  */
  function logDistanceMatrix(distances) {
    debugPrint("Distance matrix");
    debugPrint("Label distance previous unused");
    for (let i = 0; i < distances._arrays.length; i++) {
      let row = [...distances._arrays[i]._values];
      row.push(distances.hasClass(i, true, "unused"))
      debugPrint(row.join("  "));
    }
  }

  // Process About button: Pop up a message with an Alert
  function about() {
    window.alert(ODSA.AV.aboutstring(interpret(".avTitle"), interpret("av_Authors")));
  }

  exercise = jsav.exercise(model, init, {
    compare: { class: "spanning" },
    controls: $('.jsavexercisecontrols'),
    modelDialog: {width: "800px"},
    resetButtonTitle: interpret("reset"),
    fix: fixState
  });
  exercise.reset();

  $(".jsavcontainer").on("click", ".jsavedge", function () {
    var edge = $(this).data("edge");
    if (!edge.hasClass("spanning")) {
      markEdge(edge);
    }
  });

  $(".jsavcontainer").on("click", ".jsavnode", function () {
    window.alert("Please, click on the edges, not the nodes.");
  });

  $("#about").click(about);
  

  function debugPrint(x) {
    if (debug) {
       console.log(x);
    }
  }

}(jQuery));
