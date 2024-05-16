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

  // Add the code block to the exercise. 
  var config = ODSA.UTILS.loadConfig({'av_container': 'jsavcontainer'}),
    code = config.code, 
    pseudo
  if (code) {
    pseudo = jsav.code($.extend({after: {element: $(".code")}}, code));
  } else {
    pseudo = jsav.code();
  }

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
    graph.nodes()[0].addClass("visited");

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
    graph.nodes()[0].addClass("visited"); // mark the 'A' node
    jsav.displayInit();

    // Remove the initially calculated size so that the graph sits next 
    // to the code. 
    $(".jsavcanvas").css("min-width", "")
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
      if (modelEdge.hasClass("visited") && !edge.hasClass("visited")) {
        // mark the edge that is marked in the model, but not in the exercisemodeljsav
        markEdge(edge);
        break;
      }
    }
  }

  function model(modeljsav) {
    const modelGraph = modeljsav.ds.graph({
      width: 500,
      height: 400,
      left: 150,
      top: 50, // to give space for queue
      layout: "automatic",
      directed: false
    });
    const modelQueue = modeljsav.ds.list({
      left: 150,
    })
    
    // copy the graph and its weights
    graphUtils.copy(graph, modelGraph, {weights: true});
    const modelNodes = modelGraph.nodes();

    // Mark the "A" node and add it to visible queue.
    modelNodes[0].addClass("visited");
    modelQueue.addFirst(modelNodes[0].value())

    modeljsav.displayInit();

    // Start the algorithm.
    // Algorithm records the steps to modeljsav.
    bfs(modelNodes[0], modeljsav, modelQueue);

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
  }

  function markEdge(edge, av) {
    edge.addClass("visited");
    edge.start().addClass("visited");
    edge.end().addClass("visited");
    if (av) {
      av.gradeableStep();
    } else {
      exercise.gradeableStep();
    }
  }

  /**
   * Performs a breadth-first search algorithm on a JSAV graph for the model
   * answer. Adds steps to the JSAV slideshow (JSAV algorithm visualization
   * template).
   * 
   * @param {start} JSAVnode start node for the BFS algorithm
   * @param {av} av JSAV algorithm visualization template
   * @param {modelQueue} JSAVlist horizontal linked list which represents a
   *                              queue in the model answer.
   * 
   */
  function bfs(start, av, modelQueue) {
    var queue = [start], // queue used to run BFS
        node,
        neighbor,
        adjacent;

    function nodeSort(a, b) {
      return a.value().charCodeAt(0) - b.value().charCodeAt(0);
    }

    while (queue.length) {
      // dequeue node
      node = queue.pop();
      node.addClass("focusnode") // add highlighting to recently dequeued node
      modelQueue.removeLast()
      modelQueue.layout()

      // get neighbors and sort them in alphabetical order
      adjacent = node.neighbors();
      adjacent.sort(nodeSort);
      av.umsg(interpret("av_ms_dequeue"), {fill: {node: node.value()}});
      
      av.step();

      // Check if all neighbors have already been visited
      var visitedAll = adjacent.every(function(n) { return n.hasClass("visited"); });

      if (!visitedAll) {
        // go through all neighbors
        while (adjacent.hasNext()) {
          neighbor = adjacent.next();
          av.umsg(interpret("av_ms_process_edge"), {fill: {from: node.value(), to: neighbor.value()}});
          if (!neighbor.hasClass("visited")) {
            // enqueue node
            queue.unshift(neighbor);
            modelQueue.addFirst(neighbor.value())
            modelQueue.layout()
            // visit node
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
      node.removeClass("focusnode") // remove highlighting of recently dequeued node
    }
  }

  // Process About button: Pop up a message with an Alert
  function about() {
    window.alert(ODSA.AV.aboutstring(interpret(".avTitle"), interpret("av_Authors")));
  }

  exercise = jsav.exercise(model, init, {
    compare: {class: "visited"},
    controls: $(".jsavexercisecontrols"),
    resetButtonTitle: interpret("reset"),
    fix: fixState
  });
  exercise.reset();

  $(".jsavcontainer").on("click", ".jsavedge", function() {
    var edge = $(this).data("edge");
    if (!edge.hasClass("visited")) {
      markEdge(edge);
    }
  });

  $(".jsavcontainer").on("click", ".jsavnode", function() {
    window.alert("Please, click on the edges, not the nodes.");
  });

  $("#about").click(about);
})();
