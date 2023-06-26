/* global graphUtils */
(function() {
  "use strict";
  var exercise,
      graph,
      config = ODSA.UTILS.loadConfig(),
      interpret = config.interpreter,
      settings = config.getSettings(),
      jsav = new JSAV($(".avcontainer"), {settings: settings});

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
    graphUtils.generate(graph); // Randomly generate the graph without weights
    graph.layout();
    // mark the "A" node
    graph.nodes()[0].addClass("marked");

    jsav.displayInit();
    return graph;
  }

  function init() {
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

    // Mark the "A" node
    modelNodes[0].addClass("marked");

    modeljsav.displayInit();

    // start the algorithm
    bfs(modelNodes[0], modeljsav);

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

  function bfs(start, av) {
    var queue = [start],
        node,
        neighbor,
        adjacent;
    function nodeSort(a, b) {
      return a.value().charCodeAt(0) - b.value().charCodeAt(0);
    }

    while (queue.length) {
      // dequeue node
      node = queue.pop();
      // get neighbors and sort them in alphabetical order
      adjacent = node.neighbors();
      adjacent.sort(nodeSort);
      av.umsg(interpret("av_ms_dequeue"), {fill: {node: node.value()}});
      av.step();

      // Check if all neighbors have already been visited
      var visitedAll = adjacent.every(function(n) { return n.hasClass("marked"); });

      if (!visitedAll) {
        // go through all neighbors
        while (adjacent.hasNext()) {
          neighbor = adjacent.next();
          av.umsg(interpret("av_ms_process_edge"), {fill: {from: node.value(), to: neighbor.value()}});
          if (!neighbor.hasClass("marked")) {
            // enqueue and visit node
            queue.unshift(neighbor);
            markEdge(node.edgeTo(neighbor), av);
          } else {
            av.umsg(interpret("av_ms_already_visited"), {
              preserve: true,
              fill: {
                node: neighbor.value()
              }
            });
            av.step();
          }
        }
      } else {
        av.umsg(interpret("av_ms_all_neighbors_visited"), {fill: {node: node.value()}});
        av.step();
      }
    }
  }


  // Process About button: Pop up a message with an Alert
  function about() {
    window.alert(ODSA.AV.aboutstring(interpret(".avTitle"), interpret("av_Authors")));
  }

  exercise = jsav.exercise(model, init, {
    compare: {class: "marked"},
    controls: $(".jsavexercisecontrols"),
    fix: fixState
  });
  exercise.reset();

  $(".jsavcontainer").on("click", ".jsavedge", function() {
    var edge = $(this).data("edge");
    if (!edge.hasClass("marked")) {
      markEdge(edge);
    }
  });

  $(".jsavcontainer").on("click", ".jsavnode", function() {
    window.alert("Please, click on the edges, not the nodes.");
  });

  $("#about").click(about);
})();
