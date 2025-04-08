/* global graphUtils createLegend*/
(function() {
  "use strict";

  const MIN_EDGE_WEIGHT = 10;
  const MAX_EDGE_WEIGHT = 90;

  var exercise,
      graph,
      config = ODSA.UTILS.loadConfig(),
      code = config.code,
      pseudo,
      interpret = config.interpreter,
      settings = config.getSettings(),
      jsav = new JSAV($(".avcontainer"), {settings: settings});

  var debug = false; // produces debug prints to console

  jsav.recorded();

  //Add the code block to the exercise.

  if (code) {
    pseudo = jsav.code($.extend({left: 10}, code));
    pseudo.highlight(9);
  } else {
    pseudo = jsav.code();
  }

  // Add legend to the exercise.
  createLegend(jsav, 270, 410, interpret, false);

  function init() {
    // Settings for input
    const width = 500, height = 400,  // pixels
        weighted = true,
        directed = false,
        nVertices = [11, 3],
        nEdges = [14, 2];

    // First create a random planar graph instance in neighbour list format
    let nlGraph,
        bestNlGraph,
        bestResult = {score: 0},
        trials = 0;

    // Now evaluate the goodness of the generated graph

    // The target score was set from 5 to 4 as the multiple closest vertices
    // is no more possible to achieve because of the uniqueness of edge weights.
    const targetScore = 4, maxTrials = 150;
    let sumStats = {
      relaxations: 0,
      singleClosest: 0,
      multipleClosest: 0,
      longerPath: 0,
      unreachable: 0};

    let result = {score: 0};
    while (result.score < targetScore && trials < maxTrials) {
      nlGraph = graphUtils.generatePlanarNl(nVertices, nEdges, weighted,
                                            directed, width, height, MIN_EDGE_WEIGHT, MAX_EDGE_WEIGHT);
      // Score the generated graph
      result = testPrim(nlGraph);

      // If the graph has non-unique edge weights, lower the score.
      if (!graphUtils.hasUniqueEdgeWeights(nlGraph.edges, false)) {
        debugPrint("Graph has non-unique edge weights. Retrying.");
        result.score = 1;
      }

      if (result.score > bestResult.score) {
        bestNlGraph = nlGraph;
        bestResult = result;
      }
      for (let k of Object.keys(result.stats)) {
        if (result.stats[k] > 0) {
          sumStats[k]++;
        }
      }
      trials++;
    }
    nlGraph = bestNlGraph;

    // Print statistics of exercise instance generation
    let statsText = "Trials: " + trials + "\n";
    for (let k of Object.keys(sumStats)) {
      statsText += k + ": " + sumStats[k] + "\n";
    }
    debugPrint(statsText);
    debugPrint("Best score: " + bestResult.score);

    // Create a JSAV graph instance
    if (graph) {
      graph.clear();
    }
    graph = jsav.ds.graph({//    Condition:
      width: width,
      height: height,
      layout: "manual",
      directed: directed,
      left: 550
    });
    graphUtils.nlToJsav(nlGraph, graph);
    graph.layout();
    graph.nodes()[0].addClass("spanning"); // mark the 'A' node
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

  function modelSolution(modeljsav) {
    const graphNodes = graph.nodes();
    // create the model
    const modelGraph = modeljsav.ds.graph({
      width: 500,
      height: 400,
      layout: "automatic",
      directed: false,
      top: 0,
      left: 90
    });

    // Add the legend to the model.
    createLegend(modeljsav, 550, 350, interpret, false);

    // copy the graph and its weights
    graphUtils.copy(graph, modelGraph, {weights: true});
    const modelNodes = modelGraph.nodes();

    const distanceMatrixValues = [];
    for (let i = 0; i < graphNodes.length; i++) {
      distanceMatrixValues.push([graphNodes[i].value(), "∞", "-"]);
    }
    distanceMatrixValues[0][1] = 0;

    const distances = modeljsav.ds.matrix(distanceMatrixValues, {
      style: "table",
      center: false,
      left: 20,
      top: 0
    });

    // Mark the 'A' node
    modelNodes[0].addClass("spanning");

    modeljsav.displayInit();

    // start the algorithm
    prim(modelNodes, distances, modeljsav);

    modeljsav.umsg(interpret("av_ms_mst"));
    // hide all edges that are not part of the spanning tree
    const modelEdges = modelGraph.edges();
    for (let i = 0; i < modelGraph.edges().length; i++) {
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

  function prim(nodes, distances, av) {
    // returns the distance given a node index
    function getDistance(index) {
      let dist = parseInt(distances.value(index, 1), 10);
      if (isNaN(dist)) {
        dist = Infinity;
      }
      return dist;
    }
    // returns the node index given the node's value
    function getIndex(value) {
      return value.charCodeAt(0) - "A".charCodeAt(0);
    }

    while (true) {
      var min = Infinity,
          node,
          prev,
          neighbors,
          nodeIndex = -1;
      // find node closest to the minimum spanning tree
      for (var i = 0; i < nodes.length; i++) {
        if (!distances.hasClass(i, true, "unused")) {
          const dist = getDistance(i);
          if (dist < min) {
            min = dist;
            nodeIndex = i;
          }
        }
      }
      if (min === Infinity || nodeIndex === -1) {
        av.umsg(interpret("av_ms_unreachable"));
        av.step();
        break;
      }
      node = nodes[nodeIndex];
      if (!node) { break; }
      distances.addClass(nodeIndex, true, "unused");
      if (nodeIndex === 0) {
        av.umsg(interpret("av_ms_select_a"));
      } else {
        av.umsg(interpret("av_ms_select_node"), {fill: {node: node.value()}});
      }
      av.step();

      // get previous node if any
      prev = nodes[getIndex(distances.value(nodeIndex, 2))];
      if (prev) {
        av.umsg(interpret("av_ms_add_edge"), {fill: {from: prev.value(), to: node.value()}});
        markEdge(prev.edgeTo(node), av);
      }

      // update distances for neighbors
      neighbors = node.neighbors();
      while (neighbors.hasNext()) {
        var neighbor = neighbors.next(),
            neighborIndex = getIndex(neighbor.value()),
            d = getDistance(neighborIndex),
            weight = node.edgeTo(neighbor).weight();
        if (!distances.hasClass(neighborIndex, true, "unused") && d > weight) {
          distances.value(neighborIndex, 1, weight);
          distances.value(neighborIndex, 2, node.value());
        }
      }
      av.umsg(interpret("av_ms_update_distances"), {fill: {node: node.value()}});
      av.step();
    }
  }

  /**
   * Scores the quality of the generated graph.
   * @param {object} graphToTest - graph generated by generatePlanarNl()
   * @returns {{score: number, stats: object}} - object containing the score and statistics
   */
  function testPrim(graphToTest) {
    const nVertices = graphToTest.vertices.length;
    let stats = {
      relaxations: 0,
      singleClosest: 0,
      multipleClosest: 0,
      longerPath: 0,
      unreachable: 0
    };

    // Initial vertex is at index 0. Array 'distances' stores length of
    // shortest path from the initial vertex to each other vertex.
    // Array 'visited' stores the visitedness of each vertex. A visited vertex
    // has their minimum distance decided permanently.
    var distance = Array(nVertices);
    var visited = Array(nVertices);
    for (let i = 0; i < nVertices; i++) {
      distance[i] = Infinity;
      visited[i] = false;
    }
    distance[0] = 0;

    for (let i = 0; i < nVertices; i++) {
      var v = primMinVertex(distance, visited, stats);
      visited[v] = true;
      if (distance[v] === Infinity) {
        stats.unreachable++;
        break;
      }
      for (let e of graphToTest.edges[v]) {
        let d = distance[e.v];
        if (e.weight < d) {
          // Update distance
          if (d < Infinity) {
            stats.relaxations++;
          }
          distance[e.v] = e.weight;
        } else if (visited[e.v] === false) {
          stats.longerPath++;
        }
      }
    }

    // Analyse statistics
    let score = 0;

    // Properties of a good Prim input:
    //
    // 1. At some point of algorithm, there is a unique choice for the closest
    //    unvisited vertex.
    score += (stats.singleClosest > 0) ? 1 : 0;

    // 2. At some point of algorithm, there are multiple equal choices for
    //    closest unvisited vertex.
    score += (stats.multipleClosest > 0) ? 1 : 0;

    // 3. There is at least one vertex which is unreachable from the initial
    //    vertex v0.
    score += (stats.unreachable > 0) ? 1 : 0;

    // 4. There is a vertex that has multiple paths from v0 and its distance
    //    is updated to a shorter value during the algorithm.
    score += (stats.relaxations > 0) ? 1 : 0;

    // 4. There is a vertex that has multiple paths from v0 and its distance
    //    is not updated to a shorter value during the algorithm.
    score += (stats.longerPath > 0) ? 1 : 0;

    return {score: score, stats: stats};
  }

  /*
   * Helper for testPrim(): select nearest unvisited vertex.
   * If there are multiple nearest vertices, select the one with lowest index.
   *
   * Parameters:
   * distance: array of integers, each having a positive value
   * visited: array of booleans indicating which vertices are visited
   * stats: a statistics object created by testPrim(). This is updated.
   *
   * Returns:
   * (int): index of the nearest unvisited vertex.
   */
  function primMinVertex(distance, visited, stats) {
    // Find the unvisited vertex with the smalled distance
    let v = 0; // Initialize v to first unvisited vertex;
    for (let i = 0; i < visited.length; i++) {
      if (visited[i] === false) {
        v = i;
        break;
      }
    }
    // Now find the smallest value
    let equalValues = 1;
    for (let i = 0; i < visited.length; i++) {
      if (visited[i] === false) {
        if (distance[i] < distance[v]) {
          v = i;
          equalValues = 1;
        } else if (distance[i] === distance[v] && i !== v &&
                   distance[v] < Infinity) {
          // There are multiple unvisited vertices with the same finite
          // distance.
          equalValues++;
        }
      }
    }
    if (equalValues === 1) {
      stats.singleClosest++;
    } else {
      stats.multipleClosest++;
    }
    return v;
  }

  // Process About button: Pop up a message with an Alert
  function about() {
    window.alert(ODSA.AV.aboutstring(interpret(".avTitle"), interpret("av_Authors")));
  }

  function debugPrint(x) {
    if (debug) {
      console.log(x);
    }
  }

  exercise = jsav.exercise(modelSolution, init, {
    compare: {class: "spanning"},
    controls: $(".jsavexercisecontrols"),
    resetButtonTitle: interpret("reset"),
    modelDialog: {width: "850px"},
    fix: fixState
  });
  exercise.reset();

  $(".jsavcontainer").on("click", ".jsavedge", function() {
    var edge = $(this).data("edge");
    if (!edge.hasClass("spanning")) {
      markEdge(edge);
    }
  });

  $(".jsavcontainer").on("click", ".jsavnode", function() {
    window.alert("Please, click on the edges, not the nodes.");
  });

  $("#about").click(about);
}(jQuery));
