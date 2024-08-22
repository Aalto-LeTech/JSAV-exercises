/* global TraversalExerciseBuilder*/
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
    jsav.code($.extend({after: {element: $(".code")}}, code)) // // add pseudocode to exercise
      .highlight(2);
  } else {
    jsav.code(); // pseudo is just blank if code is not defined
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

  function dfs(start, av) {
    var adjacent = start.neighbors();
    //Sort the neighbors according to their value
    adjacent.sort(function(a, b) {
      return a.value().charCodeAt(0) - b.value().charCodeAt(0);
    });
    for (var next = adjacent.next(); next; next = adjacent.next()) {
      av.umsg(interpret("av_ms_process_edge"), {fill: {from: start.value(), to: next.value()}});
      if (next.hasClass("visited")) {
        av.umsg(interpret("av_ms_already_visited"), {
          preserve: true,
          fill: {
            node: next.value()
          }
        });
      }
      av.step();
      if (!next.hasClass("visited")) {
        markEdge(start.edgeTo(next), av);
        dfs(next, av);
      }
    }
  }

  const builder = new TraversalExerciseBuilder();

  const init = builder.buildInit(jsav);
  const fixState = builder.buildFixState(exercise);
  const modelSolution = builder.buildModel(dfs, interpret, false);
  const aboutAlert = builder.buildAboutAlert(interpret);

  exercise = jsav.exercise(modelSolution, init, {
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

  $("#about").click(aboutAlert);
}(jQuery));
