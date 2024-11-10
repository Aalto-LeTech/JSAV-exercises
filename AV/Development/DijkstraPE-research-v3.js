/*
 * Research version of Dijkstra's algorithm JSAV exercise
 * Johanna Sänger, Artturi Tilanterä (implementation)
 * Ari Korhonen, Otto Seppälä, Juha Sorva (supervision)
 * johanna.sanger@kantisto.nl
 * artturi.tilantera@aalto.fi
 * 19 October 2023
 */

// Make sure to include all relevant JavaScript files before this one to have access to global variables.
/* global jQuery, JSAV, ODSA, graphUtils, MinHeapInterface, PqOperationSequence, PqOperation,
createAdjacencyList, DijkstraInstanceGenerator, createLegend */

(function ($) {
  "use strict";

  // JSAV Graph instance for the student's solution.
  var graph;

  // JSAV Matrix for the student's solution, to display the node-distance
  // -parent table
  var table;

  // Implements the priority queue as min-heap and displays it as a binary tree.
  /** @type {MinHeapInterface} */
  let minHeapInterface;

  // JSAV pseudocode object
  let adjacencyList;

  // Legend box in the exercise view;
  var exerciseLegendCreated = false;

  // OpenDSA configuration and translation interpreter
  var config = ODSA.UTILS.loadConfig(),
    interpret = config.interpreter,
    settings = config.getSettings();

  // JSAV Visualization
  var jsav = new JSAV($(".avcontainer"), {settings: settings});
  var exerciseInstance;

  // A list of JSAV graph nodes to keeps track of what node has been focused
  // after a dequeue operation. This is make sure that the class can be removed
  // and that after undoing a dequeue operation the previously focused node is
  // again shown as focused.
  var focusedNodes = [];

  var debug = false; // produces debug prints to the console

  // Storage of priority queue operations from student's answer to implement
  // custom grading. From PqOperationSequence.js
  var studentPqOperations = new PqOperationSequence();
  var modelPqOperations = new PqOperationSequence();

  // Instance generator (from DijkstraInstanceGenerator.js)
  var generator = new DijkstraInstanceGenerator(debug);

  jsav.recorded();

  // JSAV Exercise
  var exercise = jsav.exercise(model, init, {
    compare: [{ class: ["spanning", "fringe"] }],
    controls: $(".jsavexercisecontrols"),
    modelDialog: {width: "960px"},
    resetButtonTitle: interpret("reset"),
    fix: fixState
  });
  /* Set custom undo and reset function because we also have a custom
   * grader. Save the default prototype functions into separate variables,
   * because we also want to call them. */
  exercise.protoUndo = exercise.undo;
  exercise.undo = scaffoldedUndo;
  exercise.protoReset = exercise.reset;
  exercise.reset = scaffoldedReset;

  exercise.reset();

  /************************************************************
   * Exercise only functions
   * (not used in the model answer)
   ************************************************************/

  /*
   * Exercise initializer function.
   * This function is called every time the Reset button is clicked.
   *
   * Returns:
   * [modelGraph, mintree]: JSAV data structures created in modeljsav that
   * should be used in the grading. These are compared against the data
   * structures in student's solution. JSAV saves snapshots of the data
   * structures automatically.
   */

  function init() {
    // Uncomment this to have a fixed exercise instance for demonstration
    // purpose
    // JSAV.utils.rand.seedrandom("1");

    // Clear the old elements is reset is clicked.
    graph?.clear();
    adjacencyList?.clear();

    // Generate a new exercise instance
    exerciseInstance = generator.generateInstance();

    // Create a JSAV graph instance for the student's solution.
    const layoutSettings = {
      width: 700,      // pixels
      height: 400,     // pixels
      layout: "manual",
      directed: false,
      left: 150
    };
    graph = jsav.ds.graph(layoutSettings);
    researchInstanceToJsav(exerciseInstance.graph, graph, layoutSettings);

    // Convert graph to compatible format for createAdjacencyList.
    const graphAdjList = researchInstanceToAdjList(exerciseInstance.graph);
    // Add visible adjacency list to the exercise.
    // Pass the graphAdjList as an object with edges property to match the
    // expected parameter format.
    adjacencyList = createAdjacencyList({edges: graphAdjList}, jsav, {
      lineNumbers: false,
      left: 10
    });

    // Do other initializations.
    studentPqOperations = new PqOperationSequence();
    modelPqOperations = new PqOperationSequence();
    addEdgeClickListeners();

    addPriorityQueue();
    if (!exerciseLegendCreated) {
      createLegend(jsav, 570, 548, interpret);
      exerciseLegendCreated = true;
    }
    addTable(exerciseInstance.graph);

    // For research
    if (window.JSAVrecorder) {
      window.JSAVrecorder.addMetadata("roleMap", exerciseInstance["roleMap"]);
    }

    graph.layout();
    // mark the 'A' node
    graph.nodes()[exerciseInstance.startIndex].addClass("spanning");
    jsav.displayInit();
    // Return the objects used to grade the exercise.
    // Including the binary tree for grading is probably the same as
    // including the class 'fringe' in the compare parameter of the exercise object
    // as fringe nodes are in the priority queue.
    return [graph, minHeapInterface._btree];
  }

  // Process About button: Pop up a message with an Alert
  function about() {
    window.alert(ODSA.AV.aboutstring(interpret(".avTitle"), interpret("av_Authors")));
  }

  /**
   * Edge click listeners are bound to the graph itself,
   * so each time the graph is destroyed with reset, it needs
   * to be added again. Therefore they are in a wrapper function.
   */
  function addEdgeClickListeners() {
    $(".jsavgraph").on("click", ".jsavedge", edgeClicked);
  }

  $(".jsavcontainer").on("click", ".jsavnode", function () {
    window.alert(interpret("av_please_click_edges"));
  });

  /**
   * Shift down the binary tree and matrix to account for the extra space
   * taken by the "credit not given for this instance" that is shown after
   * the model answer has been opened.
   */
  $("input[name='answer']").on("click", function () {
    debugPrint("Answer button clicked");
    $(".jsavbinarytree").css("margin-top", "34px");
    $(".jsavmatrix").css("margin-top", "34px");
    $(".jsavcanvas").css("min-height", "910px");
    $(".jsavmodelanswer .jsavcanvas").css("min-height", "770px");
  });

  $("#about").click(about);

  /**
   * Add the minheap to the student's JSAV instance.
   *
   * @param {int} x: position: pixels from left
   * @param {int} y: position: pixels from top
   */
  function addPriorityQueue() {
    let previouslyExistingMinheap = false;
    if (minHeapInterface) {
      previouslyExistingMinheap = true;
      minHeapInterface.clearHeap();
      $(".flexcontainer").remove();
      $("#dequeueButton").remove();
    }

    $(".jsavcanvas").append("<div class='flexcontainer'></div>");
    minHeapInterface = new MinHeapInterface(jsav, {relativeTo: $(".flexcontainer"), left: -90, top: 520});

    if (!previouslyExistingMinheap) {
      jsav.label(interpret("priority_queue"), {relativeTo: minHeapInterface._btree,
        top: -135});
    }

    // Add Dequeue button
    const html = "<button type='button' id='dequeueButton'>" +
    interpret("#dequeue") +"</button>";
    $(".jsavtree").append(html);
    $("#dequeueButton").click(dequeueClicked);
  }

  /**
   * Add the initial distance table to the JSAV.
   * The table has distance for A as 0, '∞' for the rest
   * Parent is '-' for all.
   * @param riGraph the research instance graph.
   */
  function addTable(riGraph) {
    if (table) {
      table.clear();
    }
    const labelArr = [interpret("node"), ...(riGraph.vertexLabels.sort())];
    const distanceArr = Array.from("∞".repeat(riGraph.vertexLabels.length - 1));
    distanceArr.unshift(interpret("distance"), 0);
    const parentArr = Array.from("-".repeat(riGraph.vertexLabels.length));
    parentArr.unshift(interpret("parent"));
    const width = String((riGraph.vertexLabels.length) * 30 + 100) + "px";
    table = jsav.ds.matrix([labelArr, distanceArr, parentArr],
      {style: "table",
        width: width,
        left: 10,
        top: 800});
  }

  /**
   * Finds the distance table column which has the given node label.
   * @param {string} nodeLabel 
   * @returns {number} index of the column, first = 1
   */
  function findColByNode (nodeLabel) {
    for (var i = 1; i < 25; i++) {
      if (nodeLabel === table.value(0, i)) {
        return i;
      }
    }
  }

  /**
   * Calculate the new distance for the node. This is the source distance
   * if there's none yet, otherwise it's the distance from the source node
   * to A plus the pathweight from src node to dst node.
   * @param srcLabel the source node's label
   * @param pathWeight the weight of the path between source and destination
   * @returns the new pathWeight
   */
  function getUpdatedDistance (srcLabel, pathWeight) {
    const srcIndex = findColByNode(srcLabel);
    const srcDist = Number(table.value(1, srcIndex));
    return isNaN(srcDist) ? pathWeight : (pathWeight + srcDist);
  }


  /**
   * Checks whether the node is in the spanning tree.
   * 
   * @param node node to be checked
   * @returns true when node contains class 'spanning', else false
   */
  function inSpanningTree (node) {
    return node.hasClass("spanning");
  }    

  /**
   * Update the table: dstLabel's distance is set to newDist,
   * with parent set to srcLabel
   * @param srcLabel
   * @param dstLabel
   * @param newDist
   */
  function updateStudentTable (srcLabel, dstLabel, newDist) {
    const dstIndex = findColByNode(dstLabel);
    table.value(1, dstIndex, newDist);
    table.value(2, dstIndex, srcLabel);
  }

  /**
   * Modifies the style of table in student's solution.
   * 
   * @param {string} dstLabel Label of destination node
   * @param {string} cssClass Name of CSS class
   * @param {boolean} setClass If true, set class, otherwise remove it.
   */
  function modifyStyleOfStudentTable(dstLabel, cssClass, setClass) {
    const row = findColByNode(dstLabel); // Do for all rows
    for (let col = 0; col < 3; col++) {
      if (setClass) {
        table.addClass(col, row, cssClass);
      }
      else {
        table.removeClass(col, row, cssClass);
      }
    }
  }

  /************************************************************
   * Event handlers
   ************************************************************/

  /**
   * Event handler for student's UI:
   * Add a node to the priority queue with label dstLabel and distance newDist.
   * Update the table to indicate the distance newDist and parent srcLabel.
   * @param event click event, which has the parameters srcLabel, dstLabel,
   * newDist and popup.
   * @param srcLabel the source node label
   * @param dstLabel the destination node label
   * @param newDist the new distance from A to destination
   * @param popup the popup window, used to close the window before returning.
   */
  function enqueueClicked (event) {
    const srcLabel = event.data.srcLabel;
    const dstLabel = event.data.dstLabel;
    const newDist = event.data.newDist;
    const popup = event.data.popup;
    const edge = event.data.edge;
    debugPrint(edge);
    edge.addClass("fringe");
    for (const node of [edge.startnode, edge.endnode]) {
      if (!inSpanningTree(node)) {
        node.addClass("fringe");
      }
    }
    
    if (window.JSAVrecorder) {
      window.JSAVrecorder.appendAnimationEventFields(
        {
          "pqOperation": "enqueue",
          "pqIn": window.JSAVrecorder.jsavObjectToJaalID(edge, "Edge")
        });
    }

    updateStudentTable(srcLabel, dstLabel, newDist);
    modifyStyleOfStudentTable(dstLabel, "fringe", true);
    minHeapInterface.insert(srcLabel, dstLabel, newDist);
    debugPrint("Exercise gradeable step: enqueue edge " + srcLabel + "-" +
      dstLabel + " distance " + newDist);
    storePqOperationStep("enq", edge);
    exercise.gradeableStep();
    popup.close();
  }

  /**
   * Event handler for student's UI:
   * Update the first instance of the node with label dstLabel. The updated
   * node is moved up or down the tree as needed.
   * @param event click event, which has the parameters srcLabel, dstLabel,
   * newDist and popup.
   * @param srcLabel the source node label
   * @param dstLabel the destination node label
   * @param newDist the new distance from A to destination
   * @param popup the popup window, used to close the window before returning.
   */
  function updateClicked (event) {
    const srcLabel = event.data.srcLabel;
    const dstLabel = event.data.dstLabel;
    const newDist = event.data.newDist;
    const popup = event.data.popup;

    const nodeToUpdate = minHeapInterface.getNodeByDest(dstLabel);

    // If no node with the correct label exists, do nothing.
    if (!nodeToUpdate) {
      popup.close();
      window.alert(interpret("av_update_not_possible"));
      return;
    }

    updateStudentTable(srcLabel, dstLabel, newDist);

    // Add class to the new edge
    event.data.edge.addClass("fringe");
    // remove class from the old edge
    // Have old label, find previous source node label
    const oldLabel = nodeToUpdate.value();
    const oldSrcLabel = oldLabel.charAt(oldLabel.length - 2);
    // Find node objects to grab the egde
    const oldNode = graph.nodes().filter(node =>
      node.element[0].getAttribute("data-value") === oldSrcLabel)[0];
    const dstNode = graph.nodes().filter(node =>
      node.element[0].getAttribute("data-value") === dstLabel)[0];
    const oldEdge = graph.getEdge(oldNode, dstNode)
              ?? graph.getEdge(dstNode, oldNode);
    // Remove the queued class.
    oldEdge.removeClass("fringe");

    // Note: the coloring of the distance table does not need updating,
    // because we just change the parent of a fringe node.

    if (window.JSAVrecorder) {
      window.JSAVrecorder.appendAnimationEventFields(
        {
          "pqOperation": "update",
          "pqIn": window.JSAVrecorder.jsavObjectToJaalID(event.data.edge, "Edge"),
          "pqOut": window.JSAVrecorder.jsavObjectToJaalID(oldEdge, "Edge")
        });
    }

    const label = newDist + "<br>" + dstLabel + " (" + srcLabel + ")";

    minHeapInterface.updateNodeWithDest(dstLabel, label);

    debugPrint("Exercise gradeable step: update edge " + srcLabel + "-" +
      dstLabel + " distance " + newDist);
    storePqOperationStep("upd", event.data.edge);
    exercise.gradeableStep();
    popup.close();
  }

  /**
   * Event handler for student's UI:
   * Dequeue button click of the priority queue.
   */
  function dequeueClicked() {
    const deleted = minHeapInterface.removeMin();
    if (!deleted) {
      return;
    }
    // Format of node label: "x<br>D (S)", where x is the distance,
    // D is the destination node label and S is the source node label
    const nodeLabel = deleted.charAt(deleted.length - 5);
    const node = graph.nodes().filter(node =>
      node.element[0].getAttribute("data-value") === nodeLabel)[0];
    const srcLabel = deleted.charAt(deleted.length - 2);
    const srcNode = graph.nodes().filter(node =>
      node.element[0].getAttribute("data-value") === srcLabel)[0];
    const edge = graph.getEdge(node, srcNode) ?? graph.getEdge(srcNode, node);
    edge.removeClass("fringe");

    modifyStyleOfStudentTable(nodeLabel, "fringe", false);
    modifyStyleOfStudentTable(nodeLabel, "spanning", true);

    if (window.JSAVrecorder) {
      window.JSAVrecorder.appendAnimationEventFields(
        {
          "pqOperation": "dequeue",
          "pqOut": window.JSAVrecorder.jsavObjectToJaalID(edge, "Edge")
        });
    }
    // Give the last removed node a wider border (2px instead of 1) to 
    // emphasize that this is the last removed node.
    if (focusedNodes.length > 0) {
      focusedNodes[focusedNodes.length - 1].removeClass("focusnode");
    }      
    node.addClass("focusnode");
    focusedNodes.push(node);
    
    // Debug print focusedNodes
    let s = "focusedNodes:";
    for (const x of focusedNodes) {
      s += " " + x.value();
    }
    debugPrint(s);

    // Call markEdge last, because it will also store the JSAV animation step
    if (!edge.hasClass("spanning")) {
      markEdge(edge);
    }
    exercise.gradeableStep();
  }

  /**
   * The edge click listener creates a JSAV pop-up whenever an edge is
   * clicked. The pop-up has two buttons: enqueue and update.
   * Enqueue adds a node to the priority queue
   * Update updates the value of a node in the priority queue.
   * The edge click listener determines which edge is clicked,
   * what the nodes on either end are, which one is to be updated
   * into the queue and what the distance from A is. After that,
   * the two buttons are created in the pop-up, and the corresponding
   * event handlers attached.
   */
  function edgeClicked () {
    const edge = $(this).data("edge");
    const that = $(this);
    const node1id = that[0].getAttribute("data-startnode");
    const node2id = that[0].getAttribute("data-endnode");
    const node1 = $("#" + node1id).data("node");
    const node2 = $("#" + node2id).data("node");

    const src =  inSpanningTree(node1) ? node1 : node2;
    const dst = (src === node1) ? node2 : node1;
    if (!src || !dst) {
      console.warn("Either start or end is not defined. Start: ",
        src, "\tEnd:", dst);
      return;
    }
    const srcLabel = src.element[0].getAttribute("data-value");
    const dstLabel = dst.element[0].getAttribute("data-value");
    const pathWeight = edge._weight;
    const newDist = getUpdatedDistance(srcLabel, pathWeight);

    // Edge is listed in alphabetical order, regardless of which
    // node is listed as the src or dst in JSAV.
    const options = {
      "title": interpret("edge") + " " + ((srcLabel < dstLabel)
        ? (srcLabel + dstLabel)
        : (dstLabel + srcLabel)),
      "width": "200px",
      "dialongRootElement": $(this)
    };

    const html = "<p>" + interpret("node") + " " + dstLabel +
                 interpret("at_distance") + newDist + "</p>" + 
                 "<button type='button' id='enqueueButton'>" +
                 interpret("#enqueue") + "</button>&emsp;" +
                 "<button type='button' id='updateButton'>" +
                 interpret("#update") + "</button>";

    const popup = JSAV.utils.dialog(html, options);

    // Enqueue and update button event handlers
    $("#enqueueButton").click({srcLabel, dstLabel, newDist, popup, edge},
      enqueueClicked);
    $("#updateButton").click({srcLabel, dstLabel, newDist, popup, edge},
      updateClicked);
  }
  
  /************************************************************
   * Functions to handle the state changes of the priority queue.
   ************************************************************/

  /**
   * Custom undo function for the exercise.
   * This is complementary to the function scaffoldedGrader().
   */
  function scaffoldedUndo() {
    // Modified from original JSAV undo function; source:
    // https://github.com/vkaravir/JSAV/blob/master/src/exercise.js#L402-L420
    var oldFx = $.fx.off || false;
    $.fx.off = true;
    // undo last step
    this.jsav.backward(); // the empty new step
    this.jsav.backward(); // the new graded step
    // Undo until the previous graded step.
    // Note: difference to original JSAV undo function: we know that all
    // student's steps are gradable in this exercise.
    // (Frankly, this if-else block might be related to the continuous
    // grading mode of other JSAV exercises and thus irrelevant with this
    // exercise, but let's keep it just in case it makes JSAV do some magic at
    // the background. ;)
    if (this.jsav.backward()) {
      // if such step was found, redo it
      this.jsav.forward();
      this.jsav.step({updateRelative: false});
    } else {
      // ..if not, the first student step was incorrent and we can rewind
      // to beginning
      this.jsav.begin();
    }
    this.jsav._redo = [];
    $.fx.off = oldFx;
    // End of modified JSAV undo code

    const undoneOperation = studentPqOperations.undo();
    debugPrint("studentPqOperations: " + studentPqOperations.toString());
    
    if (undoneOperation && undoneOperation.operation === "deq") {
      // Remove the recently dequeued node from focusedNodes so that when the
      // student performs the next dequeue operation, the correct graph node
      // will lose its "focusedNode" CSS class.
      focusedNodes.pop();
      // Note: JSAV remembers all student's previous steps, including which
      // node had the CSS class "focusnode" at each step. Therefore, we don't
      // need to call .addClass("focusnode") for the previously focused node.
      // Debug print focusedNodes
      let s = "focusedNodes after an undo:";
      for (const x of focusedNodes) {
        s += " " + x.value();
      }
      debugPrint(s);
    }
  };

  /**
   * Custom reset function for this exercise.
   * This is complementary to the function scaffoldedGrader().
   */
  function scaffoldedReset() {
    exercise.protoReset();
    studentPqOperations.clear();
    modelPqOperations.clear();
    focusedNodes = [];
  }

  /**
   * From JSAV API: http://jsav.io/exercises/exercise/
   *
   * "A function that will fix the student’s solution to match the current step
   * in model solution. Before this function is called, the previous incorrect
   * step in student’s solution is undone. The function gets the model
   * structures as a parameter."
   *
   * The exercise currently has fix button disabled.
   */
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
        exercise.gradeableStep();
        break;
      }
    }
  }
  
  /***********************************************************************
   * Generic functions
   * Used by both the exercise view and the model answer
   ***********************************************************************/

  /*
   * Copies edge and vertex data from a research instance graph into a JSAV
   * graph.
   *
   * Parameters:
   * riGraph: a research instance graph returned from
   *          DijkstraInstanceGenerator.generateInstance().
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
    const gridStepX = Math.floor(layoutSettings.width / 6);
    const gridStepY = Math.floor(layoutSettings.height / 4);
    function rnd(x) {
      // Returns a random integer between -x and x (both inclusive)
      return Math.floor(JSAV.utils.rand.random() * (2 * x + 1)); //- x;
    }

    let vertexCoordinates = [];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 6; x++) {
        vertexCoordinates.push({
          left: Math.floor(x * gridStepX + rnd(10)),
          top: Math.floor(y * gridStepY + rnd(10))
        });
      }
    }
    // Add the vertices as JSAV objects
    for (let i = 0; i < riGraph.edges.length; i++) {
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
  
  /**
   * Converts the research instance graph to a suitable format for the
   * createAdjacencyList function.
   * @param {object} riGraph The research instance graph as returned by
   *                        DijkstraInstanceGenerator.generateInstance().
   * @returns {Array<Array<{v: number, weight: number}>>} The adjacency list representation of the graph.
   */
  function researchInstanceToAdjList(riGraph) {
    // Helper that maps index of a vertex in the research instance graph to
    // an index in the adjacency list so that in the adjacency list A is 0, B is 1, etc.
    function mapIndex(vertexIdx) {
      const vertexLabel = riGraph.vertexLabels[vertexIdx];
      return vertexLabel.charCodeAt(0) - "A".charCodeAt(0);
    }
    // Create empty adjacency list where index 0 is A, 1 is B, etc.
    const adjList = riGraph.vertexLabels.map(() => []);

    // Iterate over the edges of each vertex and add them to the adjacency list.
    riGraph.edges.forEach((edge, vertexIdx) => {
      // Add neighbors to the adjacency list.
      edge.forEach(([neighborIdx, weight]) => {
        // Ensuring that the neighbors are added exactly in the same
        // format as in the util function generatePlanarGraphNl.
        // Remember to map the indices!
        adjList[mapIndex(vertexIdx)].push({v: mapIndex(neighborIdx), weight: weight});
      });
    });
    // Sort the neighbors by the index of the neighbor to have student process neighbors in the
    // same order as the model solution (alphabetical order).
    adjList.forEach(neighbors =>
      neighbors.sort((a, b) => a.v - b.v));
    return adjList;
  }

  /**
   * 1. Marks an edge as dequeued in the visualization (both student's and
   *    model solutions).
   * 2. Adds a dequeue operation into the operation sequence of either
   *    student's or model solution. 
   * @param {JSAV edge} edge  
   * @param {*} av a JSAV algorithm visualization template.
   *               If defined, mark an edge in the model solution.
   *               If undefined, mark an edge in the student's solution.
   */
  function markEdge(edge, av) {
    edge.addClass("spanning");
    for (const node of [edge.startnode, edge.endnode]) {
      node.removeClass("fringe");
    }
    edge.start().addClass("spanning");
    edge.end().addClass("spanning");
    storePqOperationStep("deq", edge, av);
  }

  /**
   * Stores a priority queue operation related to an edge into either the
   * student's or model solution's PqOperationSequence.
   * @param {*} operation: one of: {'enq', 'deq', 'upd'}
   * @param {JSAVedge} av a JSAV algorithm visualization template.
   *               If this is undefined, mark an edge in the model solution.
   * @param {*} av a JSAV algorithm visualization template.
   *               If defined, store the operation for the model solution.
   *               Otherwise store the operation for the student's solution.
   */
  function storePqOperationStep(operation, edge, av) {
    const v1 = edge.start().value();
    const v2 = edge.end().value();
    const pqOperation = new PqOperation(operation, v1 + v2);
    if (av) {

      // Add the operation to the priority queue operation sequence for
      // custom grading.
      modelPqOperations.push(pqOperation);
      debugPrint("modelPqOperations: " + modelPqOperations.toString());
    }
    else {
      // Similar block but for student's solution
      studentPqOperations.push(pqOperation);
      debugPrint("studentPqOperations: " + studentPqOperations.toString());
    }
  }




  /**
   * Debug printer
   * 
   * @param {string} x text to be displayed with console.log
   */
  function debugPrint(x) {
    if (debug) {
      console.log(x);
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
      row.push(distances.hasClass(i, true, "unused"));
      debugPrint(row.join("  "));
    }
  }

  /*
   * Creates the model solution of the exercise.
   * Note: this function is called by the JSAV library.
   *
   * Parameters:
   * modeljsav: a JSAV algorithm visualization template
   *            (created like: let modeljsav = new JSAV("container"))
   *
   * Returns:
   * [modelGraph, mintree]: JSAV data structures created in modeljsav that
   * should be used in the grading. These are compared against the data
   * structures in student's solution. JSAV saves snapshots of the data
   * structures automatically.
   */
  function model(modeljsav) {
    var i,
      graphNodes = graph.nodes();
    // create the model
    var modelGraph = modeljsav.ds.graph({
      width: 700,
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

    // List of nodes by [label, index] sorted by labels. The index is the index
    // of modelNodes. Example: [['A', 3], ['B', 1], ['C', 3]]
    let labelsAndIndices = []; 
    
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
      top: -30,
      left: 10
    });

    // Mark the initial node
    modelNodes[exerciseInstance.startIndex].addClass("spanning");

    // $(".jsavcanvas").append(generateLegend(true));
    createLegend(modeljsav, 550, 400, interpret);

    // Create a binary heap
    const modelMinHeapInterface = new MinHeapInterface(modeljsav,
      {relativeTo: modelGraph, left: -150, top: 291});

    modeljsav.label(interpret("priority_queue"), {relativeTo: modelMinHeapInterface._btree, top: -100});

    modeljsav.displayInit();

    // start the algorithm
    let indexOfLabel = {};
    for (let l of labelsAndIndices) {
      indexOfLabel[l[0]] = l[1];
    }
    dijkstra(modelNodes, distances, modeljsav, indexOfLabel, modelMinHeapInterface);

    modeljsav.umsg(interpret("av_ms_shortest"));

    // hide all edges that are not part of the spanning tree
    var modelEdges = modelGraph.edges();
    for (i = 0; i < modelGraph.edges().length; i++) {
      if (!modelEdges[i].hasClass("spanning")) {
        modelEdges[i].hide();
      }
    }

    modeljsav.step();

    return [modelGraph, modelMinHeapInterface._btree];
  }

  /************************************************************************
   * Model answer functions
   ************************************************************************/

  /** 
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
   * @param {MinHeapInterface} modelMinHeapInterface - min-heap instance for the model solution
   * Take care to modify modelMinHeapInterface and not minHeapInterface!
   */
  function dijkstra(nodes, distances, av, indexOfLabel, modelMinHeapInterface) {

    const aNode = nodes[indexOfLabel["A"]];
    av.umsg(interpret("av_ms_select_a"));
    aNode.addClass("focusnode");
    av.step();
    aNode.neighbors().forEach(node => visitNeighbour(aNode, node, 0));

    // A JSAV node which was dequeued before the current node and therefore
    // was given a wider border to "focus" it (grab the student's attention).
    // (Yes, this is similar to the upper scope variable focusedNodes,
    // except that because the model answer does not need an undo function,
    // this variable is not an array but just a single JSAV node.)
    var previousFocusedNode = aNode;

    while (modelMinHeapInterface.heapSize > 0) {
      const rootVal = modelMinHeapInterface.removeMin();
      const dist = Number(rootVal.match(/\d+/)[0]);
      const label = rootVal.charAt(rootVal.length - 5);
      const dstNode = nodes[indexOfLabel[label]];
      const dstIndex =  dstNode.value().charCodeAt(0) - "A".charCodeAt(0);
      const srcNode = nodes[indexOfLabel[distances.value(dstIndex, 2)]];
      const edge = dstNode.edgeFrom(srcNode) ?? dstNode.edgeTo(srcNode);

      // Give the last removed node a wider border (2px instead of 1) to 
      // emphasize that this is the last removed node.
      // This is consistent with the student's solution view.
      previousFocusedNode.removeClass("focusnode");
      dstNode.addClass("focusnode");
      previousFocusedNode = dstNode;

      av.umsg(interpret("av_ms_add_edge"),
        {fill: {from: srcNode.value(), to: dstNode.value()}});
      modifyStyleOfModelTable(label, "fringe", false);
      modifyStyleOfModelTable(label, "spanning", true);
      edge.removeClass("fringe");
      if (!edge.hasClass("spanning")) {
        markEdge(edge, av);
      }
      av.gradeableStep();

      const neighbours = dstNode.neighbors().filter(node =>
        !node.hasClass("spanning"));
      debugPrint("Neighbours of " + dstNode.value() + " before sorting");
      sortNeighbours(neighbours);
      neighbours.forEach(node => visitNeighbour(dstNode, node, dist));
    }
    av.umsg(interpret("av_ms_unreachable"));
    previousFocusedNode.removeClass("focusnode");
    av.step();

    /**********************************************
     * Helper functions inside function dijkstra()
     **********************************************/

    /* Sorts neighbours of a node by alphabetic order of their node values.
     * Implementation: selection sort.
     * This function was implemented because the default
     * Array.prototype.sort() was not functioning correctly with an array of
     * JSAV Nodes under Google Chrome. */
    function sortNeighbours(neighbours) {
      for (let i = 0; i < neighbours.length - 1; i++) {
        let minIndex = i;
        let minVal = neighbours[i].value();
        for (let j = i + 1; j < neighbours.length; j++) {
          let newVal = neighbours[j].value();
          if (newVal < minVal) {
            minVal = newVal;
            minIndex = j;
          }
        }
        if (minIndex !== i) {
          let tmp = neighbours[i];
          neighbours[i] = neighbours[minIndex];
          neighbours[minIndex] = tmp;
        }
      }
    }

    function highlight(edge, node) {
      // Mark current edge as compare
      edge.addClass("compare");
      // Mark current node being visited as compare
      node.addClass("compare");
      // Mark current node being visited in the table
      distances.addClass(node.value().charCodeAt(0) - "A".charCodeAt(0),
        true, "compare");
      // Mark current node being visited in the mintree
      modelMinHeapInterface.addCssClassToNodeWitDest(node.value(), "compare");

    }

    function highlightUpdate(edge, node) {
      // Mark current node being updated in the table
      const tableRow = node.value().charCodeAt(0) - "A".charCodeAt(0);
      distances.removeClass(tableRow, true, "compare");
      distances.addClass(tableRow, true, "updated");
      // Mark current node being visited in the mintree
      modelMinHeapInterface.removeCssClassFromNodeWithDest(node.value(), "compare");
      modelMinHeapInterface.addCssClassToNodeWitDest(node.value(), "updated");
    }

    function removeHighlight(edge, node) {
      edge.removeClass("compare");
      node.removeClass("compare");
      const tableIndex = node.value().charCodeAt(0) - "A".charCodeAt(0);
      distances.removeClass(tableIndex, true, "compare");
      distances.removeClass(tableIndex, true, "updated");      
      
      modelMinHeapInterface.removeCssClassFromNodeWithDest(node.value(), "compare");
      modelMinHeapInterface.removeCssClassFromNodeWithDest(node.value(), "updated");
    }

    /**
     * Modifies the style of table in model solution.
     * 
     * @param {string} dstLabel Label of destination node
     * @param {string} cssClass Name of CSS class
     * @param {boolean} setClass If true, set class, otherwise remove it.
     */
    function modifyStyleOfModelTable(dstLabel, cssClass, setClass) {
      const col = findColByNode(dstLabel) - 1;
      if (setClass) {
        distances.addClass(col, true, cssClass);
      }
      else {
        distances.removeClass(col, true, cssClass);
      }
    }

    /**
     * Helper function: returns the distance for the given index in the
     * JSAV distance matrix.
     * @param {*} index
     * @returns
     */
    function getDistance(index) {
      var dist = parseInt(distances.value(index, 1), 10);
      if (isNaN(dist)) {
        dist = Infinity;
      }
      return dist;
    }

    /**
     * Helper function to update the table. Sets dst's distance to distance
     * via parent src.
     * @param {JSAV Node} dst destination node
     * @param {JSAV Node} src source node
     * @param {number or string} distance distance to be inserted in the table.
     */
    function updateModelTable (dst, src, distance) {
      const dstIndex = dst.value().charCodeAt(0) - "A".charCodeAt(0);

      distances.value(dstIndex, 1, distance);
      distances.value(dstIndex, 2, src.value());
    }

    /**
     * Helper function to visit a node in the model solution.
     * Makes a decision whether to add or update the note in the priority
     * queue, or do nothing.
     * 
     * @param src source node
     * @param neighbour neighbour node that is visited
     * @param srcDist distance to source
     */
    function visitNeighbour (src, neighbour, srcDist) {
      const edge = src.edgeTo(neighbour) ?? src.edgeFrom(neighbour);
      const neighbourIndex = neighbour.value().charCodeAt(0) - "A".charCodeAt(0);
      const currNeighbourDist = getDistance(neighbourIndex);

      const distViaSrc = srcDist + edge._weight;
      if (currNeighbourDist === Infinity) {
        // Case 1: neighbour's distance is infinity.
        // Add node to the priority queue.

        // First step: highlight the comparison
        av.umsg(interpret("av_ms_visit_neighbor_compare"),
          {fill: {node: src.value(), neighbor: neighbour.value()}});
        highlight(edge, neighbour);
        av.step();

        // Second step: highlight the update
        av.umsg(interpret("av_ms_visit_neighbor_add"),
          {fill: {node: src.value(), neighbor: neighbour.value()}});          
        addNode(src.value(), neighbour.value(), distViaSrc);
        updateModelTable(neighbour, src, distViaSrc);
        highlightUpdate(edge, neighbour);
        storePqOperationStep("enq", edge, av);
        av.gradeableStep();
      }
      else if (distViaSrc < currNeighbourDist) {
        // Case 2: neighbour's distance is shorter through node `src`.
        // Update node in the priority queue.

        // First step: highlight the comparison
        av.umsg(interpret("av_ms_visit_neighbor_compare"),
          {fill: {node: src.value(), neighbor: neighbour.value()}});
        highlight(edge, neighbour);
        av.step(); 

        // Second step: highlight the update
        av.umsg(interpret("av_ms_visit_neighbor_update"),
          {fill: {node: src.value(), neighbor: neighbour.value()}});      
        const oldEdge = updateNode(src.value(), neighbour.value(), distViaSrc);
        updateModelTable(neighbour, src, distViaSrc);   
        highlightUpdate(edge, neighbour);
        oldEdge.removeClass("fringe");
        storePqOperationStep("upd", edge, av);
        av.gradeableStep();

      } else {
        // Case 3: neighbour's distance is equal or longer through node `src`.
        // No not update the priority queue.
        av.umsg(interpret("av_ms_visit_neighbor_compare") + " " + interpret("av_ms_visit_neighbor_no_action"),
          {fill: {node: src.value(), neighbor: neighbour.value()}});
          
        highlight(edge, neighbour);
        av.step();
      }
      removeHighlight(edge, neighbour);
    }

    /**
     * Helper function to add a new node into the priority queue (binary heap).
     * @param srcLabel label of the source node
     * @param dstLabel destination node's label
     * @param distance distance to the node
     */
    function addNode (srcLabel, dstLabel, distance) {
      modelMinHeapInterface.insert(srcLabel, dstLabel, distance);

      // Add fringe class to the edge and node to emphasize that they are now
      // in the fringe
      const srcNode = nodes.filter(node =>
        node.element[0].getAttribute("data-value") === srcLabel)[0];
      const dstNode = nodes.filter(node =>
        node.element[0].getAttribute("data-value") === dstLabel)[0];
      const edge = dstNode.edgeFrom(srcNode) ?? dstNode.edgeTo(srcNode);
      edge.addClass("fringe");
      dstNode.addClass("fringe");

      // Add fringe class to the corresponding column in the distance matrix
      modifyStyleOfModelTable(dstLabel, "fringe", true);
    }

    /**
     * Helper function to update a node to its new value.
     * @param srcLabel label of the source node
     * @param dstLabel destination node's label
     * @param distance distance to the node
     */
    function updateNode(srcLabel, dstLabel, distance) {
      const label = distance + "<br>" + dstLabel + " (" + srcLabel + ")";
      
      const oldLabel = modelMinHeapInterface.updateNodeWithDest(dstLabel, label);

      // If no node with the correct label exists, do nothing.
      if (!oldLabel) {
        return;
      }

      // Add queued class to the edge
      const srcNode = nodes.filter(node =>
        node.element[0].getAttribute("data-value") === srcLabel)[0];
      const dstNode = nodes.filter(node =>
        node.element[0].getAttribute("data-value") === dstLabel)[0];
      const edge = dstNode.edgeFrom(srcNode) ?? dstNode.edgeTo(srcNode);
      edge.addClass("fringe");
      // We determine what the old edge is so that we can remove the queued
      // class from it later. 
      
      const oldSrcLabel = oldLabel.charAt(oldLabel.length - 2);
      const oldSrcNode = nodes.filter(node =>
        node.element[0].getAttribute("data-value") === oldSrcLabel)[0];
      const oldEdge = dstNode.edgeFrom(oldSrcNode) ?? dstNode.edgeTo(oldSrcNode);
      return oldEdge;
    /*****************************************************
     * End of function dijkstra() and its inner functions 
     *****************************************************/
    }
  }

}(jQuery));

