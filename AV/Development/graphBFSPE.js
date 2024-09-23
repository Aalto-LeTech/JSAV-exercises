/* global TraversalExerciseBuilder, LinkedQueue */
(function() {
  "use strict";
  var exercise,
      config = ODSA.UTILS.loadConfig(),
      interpret = config.interpreter,
      settings = config.getSettings(),
      jsav = new JSAV($(".avcontainer"), {settings: settings});

  jsav.recorded();

  // Add the code block to the exercise.
  const code = ODSA.UTILS.loadConfig({av_container: "jsavcontainer"}).code; // fetch code

  if (code) {
    jsav.code($.extend({after: {element: $(".code")}}, code)) // add pseudocode to exercise
      .highlight(12); // highlight row that marks node visited
  } else {
    jsav.code(); // what does this actually do??
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
   * @param {JSAV_node} start start node for the BFS algorithm
   * @param {JSAV_object} av JSAV algorithm visualization template
   * @param {LinkedQueue} modelQueue horizontal linked list which represents a
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
      node.addClass("focusnode"); // add highlighting to recently dequeued node
      modelQueue.dequeue(); // updates layout automatically

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
            modelQueue.enqueue(neighbor.value()); // updates layout automatically
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
      node.removeClass("focusnode"); // remove highlighting of recently dequeued node
    }
    av.umsg(interpret("av_ms_queue_empty"));
    av.step();
  }

  const builder = new TraversalExerciseBuilder();

  const init = builder.buildInit(jsav);

  const modelGraphOptions = {
    width: 500,
    height: 400,
    left: 30,
    top: 150,
    layout: "automatic",
    directed: false
  };
  const modelQueueOptions = {left: 100, top: 100};
  // Model queue label position is defined in the buildModel method.
  const modelSolution = builder.buildModel(bfs, interpret, modelGraphOptions, modelQueueOptions);

  const fixState = builder.buildFixState(exercise);
  const aboutAlert = builder.buildAboutAlert(interpret);

  exercise = jsav.exercise(modelSolution, init, {
    compare: {class: "visited"},
    controls: $(".jsavexercisecontrols"),
    resetButtonTitle: interpret("reset"),
    modelDialog: {
      width: 700,
      height: 900
    },
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

  $("#about").click(aboutAlert);
})();
