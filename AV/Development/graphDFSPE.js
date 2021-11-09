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
    graphUtils.generate(graph); // Randomly generate the graph without weights
    graph.layout();
    // mark the 'A' node
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
    var i;
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

    // Mark the 'A' node
    modelNodes[0].addClass("marked");

    modeljsav.displayInit();

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

  function dfs(start, av) {
    var adjacent = start.neighbors();
    //Sort the neighbors according to their value
    adjacent.sort(function (a, b) {
      return a.value().charCodeAt(0) - b.value().charCodeAt(0);
    });
    for (var next = adjacent.next(); next; next = adjacent.next()) {
      av.umsg(interpret("av_ms_process_edge"), {fill: {from: start.value(), to: next.value()}});
      if (next.hasClass("marked")) {
        av.umsg(interpret("av_ms_already_visited"), {
          preserve: true,
          fill: {
            node: next.value()
          }
        });
      }
      av.step();
      if (!next.hasClass("marked")) {
        markEdge(start.edgeTo(next), av);
        dfs(next, av);
      }
    }
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
