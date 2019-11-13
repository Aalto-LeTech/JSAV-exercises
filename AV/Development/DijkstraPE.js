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
    graphUtils.generatePlanar(graph, {weighted: true}); // Randomly generate the graph with weights
    graph.layout();
    // mark the 'A' node
    graph.nodes()[0].addClass("marked");

    jsav.displayInit();
    return graph;
  }

  function init() {
    // create the graph
    if (graph) {
      graph.clear();
    }
    graph = jsav.ds.graph({
      width: 400,
      height: 400,
      layout: "manual",
      directed: false
    });
    // Randomly generate the graph with weights
    graphUtils.generatePlanar(graph, {weighted: true, nodes: 10, edges: 12});


    graph.layout();
    // mark the 'A' node
    graph.nodes()[0].addClass("marked");

    validateInput(graph);

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
      width: 400,
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
    dijkstra(modelNodes, distances, modeljsav);

    modeljsav.umsg(interpret("av_ms_shortest"));
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

  function dijkstra(nodes, distances, av) {
    // returns the distance given a node index
    function getDistance(index) {
      var dist = parseInt(distances.value(index, 1), 10);
      if (isNaN(dist)) {
        dist = 99999;
      }
      return dist;
    }
    // returns the node index given the node's value
    function getIndex(value) {
      return value.charCodeAt(0) - "A".charCodeAt(0);
    }

    while (true) {
      var min = 100000,
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
            dThroughNode = getDistance(nodeIndex) + node.edgeTo(neighbor).weight();
        if (!distances.hasClass(neighborIndex, true, "unused") && d > dThroughNode) {
          distances.value(neighborIndex, 1, dThroughNode);
          distances.value(neighborIndex, 2, node.value());
        }
      }
      av.umsg(interpret("av_ms_update_distances"), {fill: {node: node.value()}});
      av.step();

    }
  }

  function validateInput(graph) {
    // Checks whether the random graph is a valid exercise input
    testDijkstra(graph);
  }

  function testDijkstra(graph) {
    // Runs Dijkstra's algorithm on given graph and computes statistics on
    // goodness of the input

    // 1. At some point of algorithm, there is a unique choice for the closest
    // unvisited vertex.

    // 2. At some point of algorithm, there are multiple equal choices for
    // closest unvisited vertex.

    // 3. There is at least one vertex which is unreachable from the initial
    // vertex v0.

    // There is a vertex u such that there are at least two different paths,
    // p1 and p2, such that both lead from v0 to u, p1 is explored before p2,
    // and p2 has lower weight than p1.

    // There is a vertex u such that there are at least two different paths,
    // p1 and p2, such that both lead from v0 to u, p1 is explored before p2,
    // and p2 has equal or greater weight than p1.

    const neighbours = graphUtils.neighbourList(graph);
    const nNodes = neighbours.length;

    // Initial vertex is at index 0. Array 'distances' stores length of
    // shortest path from the initial vertex to each other vertex.
    // Array 'visited' stores the visitedness of each vertex. A visited vertex
    // has their minimum distance decided permanently.
    var distance = Array(nNodes);
    var visited = Array(nNodes);
    for (let i = 0; i < nNodes; i++) {
      distance[i] = Infinity;
      visited[i] = false;
    }
    distance[0] = 0;

    for (let i = 0; i < nNodes; i++) {
      var v = dijkstraMinVertex(distance, visited);
      visited[v] = true;
      if (distance[v] === Infinity) {
        return; // Unreachable
      }
      for (let n of neighbours[v]) {
        if (distance[n.v] > distance[v] + n.weight) {
          // Relax an edge
          distance[n.v] = distance[v] + n.weight;
        }
      }
    }
    console.log(distance);
  }

  function dijkstraMinVertex(distance, visited) {
    // Find the unvisited vertex with the smalled distance
    let v = 0; // Initialize v to first unvisited vertex;
    for (let i = 0; i < visited.length; i++) {
      if (visited[i] === false) {
        v = i;
        break;
      }
    }
    // Now find the smallest value
    for (let i = 0; i < visited.length; i++) {
      if (visited[i] === false &&
          (distance[i] < distance[v] ||
           (distance[i] === distance[v] && i < v))) {
        v = i;
      }
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
