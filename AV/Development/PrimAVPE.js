/* global ODSA, graphUtils */
(function ($) {
  "use strict";
  var exercise,
      graph,
      config = ODSA.UTILS.loadConfig(),
      interpret = config.interpreter,
      settings = config.getSettings(),
      jsav = new JSAV($('.avcontainer'), {settings: settings});

  jsav.recorded();

  function init_old() {
    // create the graph
    if (graph) {
      graph.clear();
    }
    graph = jsav.ds.graph({
      width: 400,
      height: 400,
      layout: "automatic",
      directed: false
    });
    graphUtils.generate(graph, {weighted: true}); // Randomly generate the graph with weights
    graph.layout();
    // mark the 'A' node
    graph.nodes()[0].addClass("marked");

    jsav.displayInit();
    return graph;
  }

  function init() {
    // Settings for input
    const width = 500, height = 400,  // pixels
          weighted = true,
          directed = false,
          nVertices = [11, 3],
          nEdges = [14, 2];

    // First create a random planar graph instance in neighbour list format
    let nlGraph = undefined,
        bestNlGraph = undefined,
        bestResult = {score: 0},
        trials = 0;
    const targetScore = 5, maxTrials = 100;
    let sumStats = {
      relaxations: 0,
      singleClosest: 0,
      multipleClosest: 0,
      longerPath: 0,
      unreachable: 0 };

    let result = {score: 0};
    while (result.score < targetScore && trials < maxTrials) {
      nlGraph = graphUtils.generatePlanarNl(nVertices, nEdges, weighted,
        directed, width, height);
      result = testPrim(nlGraph);
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

    let statsText = "Trials: " + trials + "\n";
    for (let k of Object.keys(sumStats)) {
      statsText += k + ": " + sumStats[k] + "\n";
    }
    console.log(statsText);

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

  function fixState(modelGraph) {
    var graphEdges = graph.edges(),
        modelEdges = modelGraph.edges();

    // compare the edges between exercise and model
    for (var i = 0; i < graphEdges.length; i++) {
      var edge = graphEdges[i],
          modelEdge = modelEdges[i];
      if (modelEdge.hasClass("marked") && !edge.hasClass("marked")) {
        // mark the edge that is marked in the model, but not in the exercise
        markEdge(edge);
        break;
      }
    }
  }

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

    var distanceMatrixValues = [];
    for (i = 0; i < graphNodes.length; i++) {
      distanceMatrixValues.push([graphNodes[i].value(), "∞", "-"]);
    }
    distanceMatrixValues[0][1] = 0;

    var distances = modeljsav.ds.matrix(distanceMatrixValues, {
      style: "table",
      center: false
    });
    distances.element.css({
      position: "absolute",
      top: 0,
      left: 10
    });

    // Mark the 'A' node
    modelNodes[0].addClass("marked");

    modeljsav.displayInit();

    // start the algorithm
    prim(modelNodes, distances, modeljsav);

    modeljsav.umsg(interpret("av_ms_mst"));
    // hide all edges that are not part of the spanning tree
    var modelEdges = modelGraph.edges();
    for (i = 0; i < modelGraph.edges().length; i++) {
      if (!modelEdges[i].hasClass("marked")) {
        modelEdges[i].hide();
      }
    }

    modeljsav.step();

    return modelGraph;
  }

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

  function prim(nodes, distances, av) {
    // returns the distance given a node index
    function getDistance(index) {
      var dist = parseInt(distances.value(index, 1), 10);
      if (isNaN(dist)) {
        // dist = 99999;
        dist = Infinity;
      }
      return dist;
    }
    // returns the node index given the node's value
    function getIndex(value) {
      return value.charCodeAt(0) - "A".charCodeAt(0);
    }

    while (true) {
      //var min = 100000,
      var min = Infinity,
          node,
          prev,
          neighbors,
          nodeIndex = -1;
      // find node closest to the minimum spanning tree
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

  function testPrim(graph) {
    const nVertices = graph.vertices.length;
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
      for (let e of graph.edges[v]) {
        let d = distance[e.v];
        let dNew = e.weight;
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

    return { score: score, stats: stats }
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

  exercise = jsav.exercise(model, init, {
    compare: { class: "marked" },
    controls: $('.jsavexercisecontrols'),
    fix: fixState
  });
  exercise.reset();

  $(".jsavcontainer").on("click", ".jsavedge", function () {
    var edge = $(this).data("edge");
    if (!edge.hasClass("marked")) {
      markEdge(edge);
    }
  });

  $(".jsavcontainer").on("click", ".jsavnode", function () {
    window.alert("Please, click on the edges, not the nodes.");
  });

  $("#about").click(about);

}(jQuery));
