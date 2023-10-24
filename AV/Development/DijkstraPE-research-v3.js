/*
 * Research version of Dijkstra's algorithm JSAV exercise
 * Johanna Sänger, Artturi Tilanterä (implementation)
 * Ari Korhonen, Otto Seppälä, Juha Sorva (supervision)
 * johanna.sanger@kantisto.nl
 * artturi.tilantera@aalto.fi
 * 19 October 2023
 */

/* global ODSA, graphUtils */
(function ($) {
  "use strict";

   // JSAV Graph instance for the student's solution.
  var graph;

  // JSAV Matrix for the student's solution, to display the node-distance
  // -parent table
  var table;

  // JSAV Binary Tree  for the student's solution, to display the priority
  // queue as a binary heap
  var minheap;

  // Legend box in the exercise view;
  var exerciseLegendCreated = false;

  // OpenDSA configuration and translation interpreter
  var config = ODSA.UTILS.loadConfig(),
      interpret = config.interpreter,
      settings = config.getSettings();

  // JSAV Visualization
  var jsav = new JSAV($('.avcontainer'), {settings: settings});
  var exerciseInstance;

  // Number of elements in the binary heap
  var heapsize = jsav.variable(0);

  // A list of JSAV graph nodes to keeps track of what node has been focused
  // after a dequeue operation. This is make sure that the class can be removed
  // and that after undoing a dequeue operation the previously focused node is
  // again shown as focused.
  var focusedNodes = [];

  var lastLinearTransform = -1; // for generateInstance()
  var debug = false; // produces debug prints to the console

  // Storage of priority queue operations from student's answer to implement
  // custom grading. From PqOperationSequence.js
  var studentPqOperations = new PqOperationSequence();
  var modelPqOperations = new PqOperationSequence();

  jsav.recorded();

  // JSAV Exercise
  var exercise = jsav.exercise(model, init, {
    compare: [{ class: ["spanning", "fringe"] }],
    controls: $('.jsavexercisecontrols'),
    modelDialog: {width: "960px"},
    resetButtonTitle: interpret("reset"),
    grader: scaffoldedGrader,
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

    // Create a JSAV graph instance
    if (graph) {
      graph.clear();
    }
    const layoutSettings = {
      width: 700,      // pixels
      height: 400,     // pixels
      layout: "manual",
      directed: false
    }
    graph = jsav.ds.graph(layoutSettings);

    exerciseInstance = generateInstance();
    studentPqOperations = new PqOperationSequence();
    modelPqOperations = new PqOperationSequence();
    researchInstanceToJsav(exerciseInstance.graph, graph, layoutSettings);
    addMinheap(100, 530);
    if (!exerciseLegendCreated) {
      createLegend(jsav, 520, 530, interpret);
      exerciseLegendCreated = true;
    }
    addTable(exerciseInstance.graph);

    // For research
    if (window.JSAVrecorder) {
      window.JSAVrecorder.addMetadata('roleMap', exerciseInstance['roleMap']);
    }

    graph.layout();
    // mark the 'A' node
    graph.nodes()[exerciseInstance.startIndex].addClass("spanning");
    jsav.displayInit();
    return [graph, minheap];
  }

  /**
   * Custom grading function for the exercise.
   */
  function scaffoldedGrader() {
    debugPrint('scaffoldedGrader():\n' +
      'student: ' + studentPqOperations.toString() + '\n' +
      'model  : ' + modelPqOperations.toString());
    let grade = studentPqOperations.gradeAgainst(modelPqOperations);

    let score = {
      // Number of correct steps in student's solution
      correct: grade.studentGrade,
      // Continuous grading mode not used, therefore `fix` is zero
      fix: 0,
      // Number of total steps in student's solution
      student: studentPqOperations.length(),
      // Number of total steps in model solution
      total: grade.maxGrade,
      // Continuous grading mode not used, therefore `undo` is zero
      undo: 0
    }
    this.score = score;
  }

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
    debugPrint('studentPqOperations: ' + studentPqOperations.toString());
    
    if (undoneOperation && undoneOperation.operation === 'deq') {
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
        s += ' ' + x.value();
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
      top: -30,
      left: 10
    });

    // Mark the initial node
    modelNodes[exerciseInstance.startIndex].addClass("spanning");

    // $(".jsavcanvas").append(generateLegend(true));
    createLegend(modeljsav, 550, 400, interpret);

    // Create a binary heap
    const mintree = modeljsav.ds.binarytree({relativeTo: modelGraph,
      left: -150, top: 291});
    modeljsav.label(interpret("priority_queue"), {relativeTo: mintree,
        top: -100});
    mintree.layout();

    modeljsav.displayInit();

    // start the algorithm
    let indexOfLabel = {};
    for (let l of labelsAndIndices) {
      indexOfLabel[l[0]] = l[1];
    }
    dijkstra(modelNodes, distances, modeljsav, indexOfLabel, mintree);

    modeljsav.umsg(interpret("av_ms_shortest"));

    // hide all edges that are not part of the spanning tree
    var modelEdges = modelGraph.edges();
    for (i = 0; i < modelGraph.edges().length; i++) {
      if (!modelEdges[i].hasClass("spanning")) {
        modelEdges[i].hide();
      }
    }

    modeljsav.step();

    return [modelGraph, mintree];
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
    storePqOperationStep('deq', edge, av);
  }

  /**
   * 1. Stores a priority queue operation related to an edge into either the
   *    student's or model solution's PqOperationSequence.
   * 2. Generates a gradeable step in the JSAV representation.
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
      // Tell JSAV that this is a gradeable step just to:
      // (i) generate a step in the model solution;
      // (ii) make JSAV Exercise Recorder to record this step.
      av.gradeableStep();
      // Add the operation to the priority queue operation sequence for
      // custom grading.
      modelPqOperations.push(pqOperation);
      debugPrint('modelPqOperations: ' + modelPqOperations.toString());
    }
    else {
      // Similar block but for student's solution
      exercise.gradeableStep();
      studentPqOperations.push(pqOperation);
      debugPrint('studentPqOperations: ' + studentPqOperations.toString());
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
  function dijkstra(nodes, distances, av, indexOfLabel, mintree) {

    var modelheapsize = 0;
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

    while (modelheapsize > 0) {
      const rootVal = deleteRoot();
      const dist = Number(rootVal.match(/\d+/)[0])
      const label = rootVal.charAt(rootVal.length - 5);
      const dstNode = nodes[indexOfLabel[label]];
      const dstIndex =  dstNode.value().charCodeAt(0) - "A".charCodeAt(0);
      const srcNode = nodes[indexOfLabel[distances.value(dstIndex, 2)]]
      const edge = dstNode.edgeFrom(srcNode) ?? dstNode.edgeTo(srcNode);

      // Give the last removed node a wider border (2px instead of 1) to 
      // emphasize that this is the last removed node.
      // This is consistent with the student's solution view.
      previousFocusedNode.removeClass("focusnode");
      dstNode.addClass("focusnode");
      previousFocusedNode = dstNode;

      av.umsg(interpret("av_ms_add_edge"),
              {fill: {from: srcNode.value(), to: dstNode.value()}});
      edge.removeClass("fringe");
      if (!edge.hasClass("spanning")) {
        markEdge(edge, av);
      }
      const neighbours = dstNode.neighbors().filter(node =>
        !node.hasClass("spanning"));
      debugPrint("Neighbours of " + dstNode.value() + " before sorting");
      sortNeighbours(neighbours);
      neighbours.forEach(node => visitNeighbour(dstNode, node, dist))
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
      const treeNodeList = getTreeNodeList(mintree.root());
      const treeNode = treeNodeList.filter(treeNode =>
          treeNode.value().charAt(treeNode.value().length - 5)
          === node.value())[0];
      if (treeNode) {
        treeNode.addClass("compare")
      }
    }

    function highlightUpdate(edge, node) {
      // Mark current node being updated in the table
      const tableRow = node.value().charCodeAt(0) - "A".charCodeAt(0);
      distances.removeClass(tableRow, true, "compare");
      distances.addClass(tableRow, true, "updated");
      // Mark current node being visited in the mintree
      const treeNodeList = getTreeNodeList(mintree.root());
      const treeNode = treeNodeList.filter(treeNode =>
          treeNode.value().charAt(treeNode.value().length - 5)
          === node.value())[0];
      if (treeNode) {
        treeNode.removeClass("compare")
        treeNode.addClass("updated")
      }
    }

    function removeHighlight(edge, node) {
      edge.removeClass("compare");
      node.removeClass("compare");
      const tableIndex = node.value().charCodeAt(0) - "A".charCodeAt(0);
      distances.removeClass(tableIndex, true, "compare");
      distances.removeClass(tableIndex, true, "updated");
      const treeNodeList = getTreeNodeList(mintree.root());
      const treeNode = treeNodeList.filter(treeNode =>
        treeNode.value().charAt(treeNode.value().length - 5)
        === node.value())[0];
      if (treeNode) {
        treeNode.removeClass("compare");
        treeNode.removeClass("updated");
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
     * Helper function that deletes the root node and does a step
     * to display the text which node is deleted.
     * @returns the value of the deleted node.
     */
    function deleteRoot () {
      if (!mintree.root() || modelheapsize <= 0) {
        return;
      }
      modelheapsize -= 1;

      const ret = mintree.root().value();

      // Mark table row as "unused" (grey background)
      // Then set selected message, and step the av.
      const nodeLabel = ret.charAt(ret.length - 5)
      distances.addClass(nodeLabel.charCodeAt(0) - "A".charCodeAt(0), true, "unused")
      // av.umsg(interpret("av_ms_select_node"),
      //         {fill: {node: nodeLabel}});
      av.step();

      // Parent node of last node in the heap
      const parentLast = findParent(modelheapsize, mintree);

      // Last node in the heap
      const lastNode = ((modelheapsize)%2 === 1) ? parentLast.left()
                                                 : parentLast.right();

      if (lastNode) {
        mintree.root().value(lastNode.value());
        lastNode.value(ret);
        lastNode.remove();
        minHeapify(mintree.root());
      } else {
        mintree.root().remove();
      }
      mintree.layout();
      return ret
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
      debugPrint("visitNeighbour: src = " + src.value() + ", neighbour = " +
        neighbour.value());
      const edge = src.edgeTo(neighbour) ?? src.edgeFrom(neighbour);
      const neighbourIndex = neighbour.value().charCodeAt(0) - "A".charCodeAt(0);
      const currNeighbourDist = getDistance(neighbourIndex);

      const distViaSrc = srcDist + edge._weight;
      if (currNeighbourDist === Infinity) {
        // Case 1: neighbour's distance is infinity.
        // Add node to the priority queue.

        // First step: highlight the comparison
        av.umsg(interpret("av_ms_visit_neighbor_compare") + ' ' +
                interpret("av_ms_visit_neighbor_add"),
                {fill: {node: src.value(), neighbor: neighbour.value()}});
        highlight(edge, neighbour);
        av.step()

        // Second step: highlight the update
        addNode(src.value(), neighbour.value(), distViaSrc);
        updateModelTable(neighbour, src, distViaSrc);
        debugPrint("Model solution gradeable step: ADD ROUTE WITH DIST:",
          distViaSrc + neighbour.value());
        highlightUpdate(edge, neighbour);
        storePqOperationStep('enq', edge, av);
      }
      else if (distViaSrc < currNeighbourDist) {
        // Case 2: neighbour's distance is shorter through node `src`.
        // Update node in the priority queue.

        // First step: highlight the comparison
        av.umsg(interpret("av_ms_visit_neighbor_compare") + ' ' +
                interpret("av_ms_visit_neighbor_update"),
                {fill: {node: src.value(), neighbor: neighbour.value()}});
        highlight(edge, neighbour);
        av.step(); 

        // Second step: highlight the update
        const oldEdge = updateNode(src.value(), neighbour.value(), distViaSrc);
        updateModelTable(neighbour, src, distViaSrc);
        debugPrint("Model solution gradeable step:  UPDATE DISTANCE TO:",
         distViaSrc + neighbour.value());      
        highlightUpdate(edge, neighbour);
        oldEdge.removeClass("fringe")
        storePqOperationStep('upd', edge, av);
      } else {
        // Case 3: neighbour's distance is equal or longer through node `src`.
        // No not update the priority queue.
        debugPrint("KEEP DISTANCE THE SAME:",
                        currNeighbourDist + neighbour.value())

        av.umsg(interpret("av_ms_visit_neighbor_compare") + ' ' +
                interpret("av_ms_visit_neighbor_no_action"),
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
      var i = modelheapsize;
      modelheapsize += 1;
      const label = distance + "<br>" + dstLabel + " (" + srcLabel + ")"
      const newNode = mintree.newNode(label);
      if (i === 0) {
        mintree.root(newNode);
      } else {
        const parent = findParent(i, mintree);
        (i % 2 === 1) ? parent.left(newNode) : parent.right(newNode);
      }

      var node = newNode;
      while (i > 0 && node.parent() && extractDistance(node.parent()) > distance) {
        node.value(node.parent().value());
        i = Math.floor((i-1)/2);
        node.parent().value(label);
        node = node.parent();
      }

      // Add fringe class to the edge and node to emphasize that they are now
      // in the fringe
      const srcNode = nodes.filter(node =>
          node.element[0].getAttribute("data-value") === srcLabel)[0];
      const dstNode = nodes.filter(node =>
          node.element[0].getAttribute("data-value") === dstLabel)[0];
      const edge = dstNode.edgeFrom(srcNode) ?? dstNode.edgeTo(srcNode);
      edge.addClass("fringe");
      dstNode.addClass("fringe")

      // Add fringe class to the corresponding column in the distance matrix

      /* distances.addClass(node.value().charCodeAt(0) - "A".charCodeAt(0),
             true, "compare");
        
        the matrix has a function .addClass(row, col, className)
      */
      const row = true; // Apply for all rows
      const col = dstLabel - "A".charCodeAt(0)
      table.addClass()
       
      mintree.layout();
    }

    /**
     * Helper function to update a node to its new value.
     * @param srcLabel label of the source node
     * @param dstLabel destination node's label
     * @param distance distance to the node
     */
    function updateNode(srcLabel, dstLabel, distance) {
      const label = distance + "<br>" + dstLabel + " (" + srcLabel + ")"
      const nodeArr = getTreeNodeList(mintree.root())
      // Grab first node with the correct destination.
      const updatedNode = nodeArr.filter(node =>
              node.value().charAt(node.value().length - 5) === dstLabel)[0];

      // If no node with the correct label exists, do nothing.
      if (!updatedNode) {
        return;
      }
      debugPrint("UPDATE:", updatedNode.value(), "TO:", distance + label);

      // Add queued class to the edge
      const srcNode = nodes.filter(node =>
          node.element[0].getAttribute("data-value") === srcLabel)[0];
      const dstNode = nodes.filter(node =>
          node.element[0].getAttribute("data-value") === dstLabel)[0];
      const edge = dstNode.edgeFrom(srcNode) ?? dstNode.edgeTo(srcNode)
      edge.addClass("fringe")
      // We determine what the old edge is so that we can remove the queued
      // class from it later. 
      const oldLabel = updatedNode.value();
      const oldSrcLabel = oldLabel.charAt(oldLabel.length - 2);
      const oldSrcNode = nodes.filter(node =>
          node.element[0].getAttribute("data-value") === oldSrcLabel)[0];
      const oldEdge = dstNode.edgeFrom(oldSrcNode) ?? dstNode.edgeTo(oldSrcNode)
      updatedNode.value(label);
      // Inline while loop to move the value up if needed.
      // Because if you pass a node along as a parameter, it does not like
      // being asked about its parent... Grading will break in ODSA part.
      var node = updatedNode;
      while (node != mintree.root() &&
             extractDistance(node) < extractDistance(node.parent())) {
        const temp = node.parent().value();
        node.parent().value(node.value());
        node.value(temp);
        node = node.parent();
      }
      mintree.layout();
      return oldEdge
    }
    /*****************************************************
     * End of function dijkstra() and its inner functions 
     *****************************************************/
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

  function findColByNode (nodeLabel) {
    for (var i = 1; i < 25; i++) {
      if (nodeLabel === table.value(0, i)) {
        return i;
      }
    }
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
   * Preorder traversal to get node list of the tree
   * Since there is no function for this in the JSAV library
   * @param node the root node to start the traversal at
   * @param arr array to store the nodes in. Optional parameterl
   * an empty array is initialised if none is supplied.
   * @returns an array containing the nodes of the tree.
   */
  function getTreeNodeList (node, arr) {
    var nodeArr = arr || [];

    if (node) {
      nodeArr.push(node);
      nodeArr = getTreeNodeList(node.left(), nodeArr);
      nodeArr = getTreeNodeList(node.right(), nodeArr);
    }
    return nodeArr;
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
    const srcDist = Number(table.value(1, srcIndex))
    return isNaN(srcDist) ? pathWeight : (pathWeight + srcDist)
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
    table.value(1, dstIndex, newDist)
    table.value(2, dstIndex, srcLabel)
  }

  

  /**
   * Event handler:
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
    debugPrint(edge)
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
    insertMinheap(srcLabel, dstLabel, newDist);
    debugPrint("Exercise gradeable step: enqueue edge " + srcLabel + "-" +
      dstLabel + " distance " + newDist);
    storePqOperationStep('enq', edge);
    popup.close();
  }

  /**
   * Event handler:
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

    const nodeArr = getTreeNodeList(minheap.root());
    // Grab first node with the correct destination.
    const updatedNode = nodeArr.filter(node =>
            node.value().charAt(node.value().length - 5) === dstLabel)[0];

    // If no node with the correct label exists, do nothing.
    if (!updatedNode) {
      popup.close();
      window.alert(interpret("av_update_not_possible"));
      return;
    }

    updateStudentTable(srcLabel, dstLabel, newDist);
    // Add class to the new edge
    event.data.edge.addClass("fringe")
    // remove class from the old edge
    // Have old label, find previous source node label
    const oldLabel = updatedNode.value();
    const oldSrcLabel = oldLabel.charAt(oldLabel.length - 2);
    // Find node objects to grab the egde
    const oldNode = graph.nodes().filter(node =>
        node.element[0].getAttribute("data-value") === oldSrcLabel)[0];
    const dstNode = graph.nodes().filter(node =>
        node.element[0].getAttribute("data-value") === dstLabel)[0];
    const oldEdge = graph.getEdge(oldNode, dstNode)
              ?? graph.getEdge(dstNode, oldNode);
    // Remove the queued class.
    oldEdge.removeClass("fringe")
    if (window.JSAVrecorder) {
      window.JSAVrecorder.appendAnimationEventFields(
        {
          "pqOperation": "update",
          "pqIn": window.JSAVrecorder.jsavObjectToJaalID(event.data.edge, "Edge"),
          "pqOut": window.JSAVrecorder.jsavObjectToJaalID(oldEdge, "Edge")
        });
    }
    const oldDist = oldLabel.match(/\d+/)[0];
    const label = newDist + "<br>" + dstLabel + " (" + srcLabel + ")";
    updatedNode.value(label);

    if (newDist > oldDist) {
      minHeapify(updatedNode)
    } else {
      var node = updatedNode;
      while (node != minheap.root() &&
             extractDistance(node) < extractDistance(node.parent())) {
        const temp = node.parent().value();
        node.parent().value(node.value());
        node.value(temp);
        node = node.parent();
      }
    }
    debugPrint("Exercise gradeable step: update edge " + srcLabel + "-" +
      dstLabel + " distance " + newDist);
    storePqOperationStep('upd', event.data.edge);
    popup.close();
  }

  /**
   * Event handler: Dequeue button click of the priority queue.
   */
  function dequeueClicked() {
    const deleted = minheapDelete(0);
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
      s += ' ' + x.value();
    }
    debugPrint(s);

    minheap.layout();
    // Call markEdge last, because it will also store the JSAV animation step
    if (!edge.hasClass("spanning")) {
      markEdge(edge);
    }
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
      return
    }
    const srcLabel = src.element[0].getAttribute("data-value");
    const dstLabel = dst.element[0].getAttribute("data-value");
    const pathWeight = edge._weight;
    const newDist = getUpdatedDistance(srcLabel, pathWeight);
    const label = dstLabel + interpret("at_distance") + newDist;

    // Edge is listed in alphabetical order, regardless of which
    // node is listed as the src or dst in JSAV.
    const options = {
      "title": interpret("edge") + " " + ((srcLabel < dstLabel)
                                          ? (srcLabel + dstLabel)
                                          : (dstLabel + srcLabel)),
      "width": "200px",
      "dialongRootElement": $(this)
    }

    const html = "<p>" + interpret("node") + ' ' + dstLabel +
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
  })

  $("#about").click(about);

  /*
   * Preconfigured template for research
   */

   // Dijkstra's algorithm
   // Preconfigured template 3
   //
   //       a       b
   //   A-------B-------C       D
   //         / |               |
   //      c/   |d              |s
   //     /     |   g           |
   //   E       F-------G       H
   //   | \       \     | \
   //  e|   \f     h\   |i  \j
   //   |     \       \ |     \
   //   I---k---J-------K-------L
   //     \     |       |   m
   //      n\   |o      |p
   //         \ |       |
   //   M-------N       O-------P
   //       q               r
   //
   // Edge order: AB, BC, BE, BF, EI, EJ, FG, FK, JN, KL, NM, KO, OP

  function randomInt(a, b) {
    // Returns a random integer between a and b (both inclusive).
    return Math.floor(JSAV.utils.rand.random() * (b - a + 1)) + 1
  }

  function determineWeights() {
    function rnd(x) {
      // Returns a random integer between 1 and x (both inclusive)
      return Math.floor(JSAV.utils.rand.random() * x) + 1;
    }
    // Randomize 1: try to fulfill inequalities for single-source sourcest
    // paths.
    let a = rnd(6);                           // Path AB
    let b = rnd(6);                           // ABC
    let c = b + rnd(5);                       // ABE
    let d = c + rnd(5);                       // ABF
    let e = d - c + rnd(5);                   // ABEI
    let f = e + rnd(5);                       // ABEJ
    let g = c + f - d + rnd(5);               // ABFG
    let h = g + rnd(5);                       // ABFK
    let o = d + h - (c + f) + rnd(5);         // ABEJN
    let m = c + f + o - (d + h) + rnd(5);     // ABFKL
    let q = d + h + m - (c + f + o) + rnd(5); // ABEJNM
    let p = c + f + o + q - (d + h) + rnd(5); // ABFKO
    let r = rnd(9);                           // ABFKOP

    // Randomize 2: try to fulfill inequalities for discarded edges.
    let k = f - e + rnd(5);            // ABEJ shorter than ABEIJ
    let l = d + h - (c + f) + rnd(5);  // ABFK shorter than ABEJK
    let n = f + o - e + rnd(5);        // ABEJN shorter than ABEIN
    let i = h - g + rnd(5);            // ABFK shorter than ABFGK
    let j = h + m - g + rnd(5);        // ABFKL shorter than ABFGL

    // Randomize 3: edge weights for the connected component unreachable
    // from the start node.
    let s = rnd(9);                    // DH is unreachable

    // Validation. In the above, we used a randomized algorithm to determine the
    // edge weights. There is less than zero probability that in some cases
    // the randomized edge weights do not fulfill the original inequations.

    // Validate 1: Single-source shortest path tree: list paths from each node
    // reachable from A in increasing order of path weigths. Ensure that the order
    // is correct and each path weight is unique.
    let path_weights = [
      a,                 // AB
      a + b,             // ABC
      a + c,             // ABE
      a + d,             // ABF
      a + c + e,         // ABEI
      a + c + f,         // ABEJ
      a + d + g,         // ABFG
      a + d + h,         // ABFK
      a + c + f + o,     // ABEJN
      a + d + h + m,     // ABFKL
      a + c + f + o + q, // ABEJNM
      a + d + h + p,     // ABFKO
      a + d + h + p + r, // ABFKOP
    ]
    for (let ind = 1; ind < path_weights.length; ind++) {
      if (path_weights[ind - 1] >= path_weights[ind]) {
        return undefined;
      }
    }

    // Validate 2: inequalities for discarded edges
    let pass = (
      (f < e + k) &&         // IJ
      (d + h < c + f + l) && // JK
      (f + o < e + n) &&     // IN
      (h < g + i) &&         // GK
      (n + m < g + j)        // GL
    )
    if (!pass) {
      return undefined;
    }
    return {
      'a': a, 'b': b, 'c': c, 'd': d, 'e': e, 'f': f, 'g': g, 'h': h,
      'i': i, 'j': j, 'k': k, 'l': l, 'm': m, 'n': n, 'o': o, 'p': p,
      'q': q, 'r': r, 's': s
    }

  }

  /*
  * Generates a graph from weights.
  *
  * Parameters:
  * w: dictionary with keys 'a'...'o' and positive integer values
  *
  * Returns: undirected graph with positive integer weights
  *
  * Returns:
  * g = {
  *   vertexLabels: ['A', ..., 'O'],
  *   edges: [
  *     [[v, w], ..., [v, w]],
  *     ...
  *   ]
  * }
  * g.edges[v1] contains a neighbor list for vertex v1. Each entry in
  * neighbor list is [v2, w], where v2 is the integer ID of the end vertex in
  * the edge and w is the weight. Thus (g.edges[v1][i] == [v2, w]) means that
  * there is edge from v1 to v2 with weight w.
  */
  function graphFromWeights(w) {

    // Node labels (letters A-O) are mapped to integers (0-14),
    // because then graph algorithms have simpler code and greater performance
    // on neighbor lists. (Access by direct integer index is faster than access
    // by letter because of hashing.)

    const vertexCount = 16;

    // Maps from vertex number (0...14) to node label (letters A-O)
    const vertexLabels = ['A', 'B', 'C', 'D', // 0..3
                          'E', 'F', 'G', 'H', // 4..7
                          'I', 'J', 'K', 'L', // 8..11
                          'M', 'N', 'O', 'P'];     // 12..14

    let g = {
      vertexLabels: vertexLabels,
      edges: new Array(vertexCount)
    }
    for (let i = 0; i < vertexCount; i++) {
      g.edges[i] = [];
    }

    // 'XY:z' means that:
    // - X is the letter of the source vertex,
    // - Y is the letter of the destination vertex,
    // - z is the letter of the weight variable
    const graphSpec =
      ['AB:a',
      'BC:b', 'BE:c', 'BF:d',
      'DH:s',
      'EI:e', 'EJ:f',
      'FG:g', 'FK:h',
      'GK:i', 'GL:j',
      'IJ:k', 'IN:n',
      'JK:l', 'JN:o',
      'KL:m', 'KO:p',
      'MN:q', 'OP:r'];

    for (let e of graphSpec) {
      let v1 = e.charCodeAt(0) - 65;
      let v2 = e.charCodeAt(1) - 65;
      let weight = w[e[3]];
      g.edges[v1].push([v2, weight])
      g.edges[v2].push([v1, weight])
    }

    return g;
  }

  /*
  * Prints a text description of the given graph.
  *
  * Parameters:
  * g = {
  *   vertexLabels: ['A', ..., 'O'],
  *   edges: [
  *     [[v, w], ..., [v, w]],
  *     ...
  *   ]
  * }
  * g.edges[v1] contains a neighbor list for vertex v1. Each entry in
  * neighbor list is [v2, w], where v2 is the integer ID of the end vertex in
  * the edge and w is the weight. Thus (g.edges[v1][i] == [v2, w]) means that
  * there is edge from v1 to v2 with weight w.
  */
  function printGraph(g) {
    debugPrint("Vertex labels: " + g.vertexLabels);
    for (let i = 0; i < g.edges.length; i++) {
      let s = [g.vertexLabels[i], " : "];
      for (let e of g.edges[i]) {
        s.push(g.vertexLabels[e[0]], " ", e[1], ", ");
      }
      debugPrint(s.join(""));
    }
  }

  /*
  * Perform a linear transformation of the graph topology: rotate or reflect
  * edge configuration so that the 4 x 4 grid is preserved.
  *
  * There are eight transformations. The letters A-P indicate how start and
  * end vertices of the edges are remapped.
  *
  * A B C D     M I E A     P O N M     D H L P
  * E F G H     N J F W     L K J I     G C K O
  * I J K L     O K G C     H G F E     B F J N
  * M N O P     P L H D     D C B A     A E I M
  *    0           1           2           3
  *
  * M N O P     D C B A     A E I M     P L H D
  * I J K L     H G F E     B F J N     O K G C
  * E F G H     L K J I     C G K O     N J F B
  * A B C D     P O N M     D H L P     M I E A
  *    4           5           6
  *(s === expected)
  * 0:   no transformation
  * 1-3: 90, 180, and 270 degrees clockwise
  * 4:   reflection respect to the horizontal axis
  * 5:   reflection respect to the vertical axis
  * 6:   reflection respect to the diagonal axis AFKP
  * 7:   reflection respect to the diagonal axis MJGD
  *
  * Parameters:
  * t: number of the transformation (0..7)
  * sourceArray: an array with length of 16
  *
  * Returns:
  * A copy of sourceArray where elements have been permuted according to the
  * transformation.
  */

  function linearTransform(t, sourceArray) {
    if (sourceArray.length != 16) {
      throw "Length of sourceArray must be 16."
    }
    // transformation[t][i] gives the *new* index of original index i at
    // transformation t.
    //
    const transformation = [
      [ 0,  1 , 2 , 3,   // 0: no transformation.
        4,  5,  6,  7,   // These are the original indices in the 4 x 4
        8,  9, 10, 11,   // element grid.
      12, 13, 14, 15],

      [ 3,  7, 11, 15,    // 1: rotation 90 degrees clockwise
        2,  6, 10, 14,
        1,  5,  9, 13,
        0,  4,  8, 12],

      [15, 14, 13, 12,   // 2: rotation 180 degrees clockwise
      11, 10,  9,  8,
        7,  6,  5,  4,
        3,  2,  1,  0],

      [12,  8 , 4 , 0,   // 3: rotation 270 degrees clockwise
      13,  9,  5,  1,
      14, 10,  6,  2,
      15, 11,  7,  3],

      [12, 13, 14, 15,   // 4: reflection respect to the horizontal axis
        8,  9, 10, 11,
        4,  5,  6,  7,
        0,  1,  2,  3],

      [ 3,  2 , 1 , 0,   // 5: reflection respect to the vertical axis
        7,  6,  5,  4,
      11, 10,  9,  8,
      15, 14, 13, 12],

      [ 0,  4,  8, 12,   // 6: reflection respect to the diagonal axis 0-5-10-15
        1,  5,  9, 13,
        2,  6, 10, 14,
        3,  7, 11, 15],

      [15, 11,  7,  3,   // 7: reflection respect to the diagonal axis 3-6-9-12
      14, 10,  6,  2,
      13,  9,  5,  1,
      12,  8,  4,  0]
    ]

    let transformedArray = new Array(sourceArray.length);
    for (let i = 0; i < sourceArray.length; i++) {
      transformedArray[i] = sourceArray[transformation[t][i]];
    }
    return transformedArray;
  }

  // Swaps elements at indices i and j in array A.
  function swapIndices(A, i, j) {
    let tmp = A[i];
    A[i] = A[j];
    A[j] = tmp;
  }

  /*
  * Randomises the order of the array using the Fisher-Yates shuffle algorithm.
  * https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
  * "Algorithm P" on page 145 in:
  * Donald E. Knuth : The Art of Computer Programming (3rd. ed.). Volume 2 /
  * Seminumerical Algorithms. Addison-Wesley, 1998. ISBN 0-201-89684-2.
  *
  * Parameters:
  * a: array
  *
  * Returns:
  * A copy of the array
  */
  function shuffle(sourceArray) {
    if (sourceArray === undefined) {
      console.warn("shuffle(undefined)!")
      return;
    }
    let shuffled = [...sourceArray];
    // Iterate from end to beginning.
    // At each round,
    //  indices 0...j contain the unprocessed region of the array, and
    //  indices j+1...a.length contain the processed region of the array.
    // Choose random element from the unprocessed portion and swap it to the
    // beginning of the portion. Then that element belongs to the processed
    // region.
    let j, k, tmp;
    for (j = shuffled.length - 1; j > 0; j--) {
      // j is the upper index
      // k is the lower index: a random integer from range [0, j-1]
      // (At first round, we have a.length choices, then a.length - 1, etc.)
      k = Math.floor((j + 1) * JSAV.utils.rand.random());
      // swap elements at indices j and k
      swapIndices(shuffled, j, k);
    }
    return shuffled;
  }

  // A mock shuffle for test purposes. It shuffles adjacent pairs of elements.
  function mockShuffle(sourceArray) {
    let shuffled = [...sourceArray];
    for (j = 1; j < shuffled.length; j += 2) {
      swapIndices(shuffled, j, j - 1);
    }
    return shuffled;
  }

  /*
  * Returns a permuted copy of the array using the given mapping.
  *
  * Parameters:
  * a: array
  * mapping: mapping[i] is the new index of element at originally index i
  *
  * Returns:
  * a copy of array a transformed by mapping.
  */
  function permuteArray(a, mapping) {
    let newA = new Array(a.length);
    for (let i = 0; i < a.length; i++) {
      newA[i] = a[mapping[i]];
    }
    return newA;
  }

  /*
  * Returns an inverse mapping of the given mapping.
  *
  * Parameters:
  * mapping: j = mapping[i] is the new index of element at originally index i
  *
  * Returns:
  * inverse: inverse[mapping[i]] = i
  */
  function inverseMap(mapping) {
    let inverse = new Array(mapping.length);
    for (let i = 0; i < mapping.length; i++) {
      inverse[mapping[i]] = i;
    }
    return inverse;
  }

  /*
  * Remaps the edges of the graph and expands it from a 4 by 4 to a
  * 6 by 4 graph, with 2 columns of unconnected nodes.
  *
  * Parameters:
  * graph = {
  *   vertexLabels: ['A', ..., 'O'],
  *   edges: [
  *     [[v, w], ..., [v, w]],
  *     ...
  *   ]
  * }
  * vertexMap: i is the old index, vertexMap[i] is the new index.
  * left: a boolean to indicate whether the core component is on the
  * left or the right of the 6 by 4 graph.
  *
  * Returns: a transformed graph instance
  */

  function remapEdges(graph, vertexMap, left) {
    debugPrint(graph)
    debugPrint(vertexMap)
    let newGraph = {
      vertexLabels: [...graph.vertexLabels],
      edges: new Array(vertexMap.length)
    }
    for (let i = 0; i < vertexMap.length; i++) {
      newGraph.edges[i] = [];
    }

    // Process by source vertex.
    // vertexMap[i] is the old index, i is the new index.
    for (let i = 0; i < vertexMap.length; i++) {
      let newStart = vertexMap[i];
      for (let e of graph.edges[i]) {
        let newEnd = vertexMap[e[0]];
        let weight = e[1];
        newGraph.edges[newStart].push([newEnd, weight]);
      }
    }

    // Create a 6 by 4 graph with the extra labels.
    // Initialise empty edge array, this will be filled
    // with the new edges with the two extra columns as off-set.
    let paddedGraph = {
      vertexLabels: [...graph.vertexLabels,
                      "Q", "R", "S", "T", "U", "V", "W", "X"],
      edges: new Array(24)
    }
    for (let i = 0; i < paddedGraph.edges.length; i++) {
      paddedGraph.edges[i] = [];
    }

    // Remap the 4 by 4 component to 6 by 4
    // For left: add 2 empty node columns at the right side
    // for right: add 2 empty node columns at the left side
    if (left) {
      for (let i = 0; i < newGraph.edges.length; i++) {
        // offset of new index compared to old. This is for the source.
        let offset = 2 * Math.floor(i/4);
        for (let e of newGraph.edges[i]) {
          // new destination index.
          let newIndex = e[0] + (2 * Math.floor(e[0]/4));
          paddedGraph.edges[i + offset].push([newIndex, e[1]])
        }
      }
    } else {
      for (let i = 0; i < newGraph.edges.length; i++) {
        // Offset for the new source index.
        // + 1 for the cases where i = 0, 4, 8, 12
        let offset = (i%4) ? 2 * (Math.ceil(i/4)) : 2 * (Math.ceil(i/4) + 1);
        for (let e of newGraph.edges[i]) {
          // Offset and new index of the destination index.
          let off = (e[0]%4) ? Math.ceil(e[0]/4) : Math.ceil(e[0]/4) + 1;
          let newIndex = e[0] + 2 * off;
          paddedGraph.edges[i + offset].push([newIndex, e[1]])
        }
      }
    }

    return paddedGraph;
  }

  /*
  * Reorganizes the vertex labels in the given graph.
  *
  * Parameters:
  * graph = {
  *   vertexLabels: ['A', ..., 'O'],
  *   edges: [
  *     [[v, w], ..., [v, w]],
  *     ...
  *   ]
  * }
  * vertexMap: vertexMap[i] is the old index, i is the new index
  *
  * Example return value:
  * ['C', 'P', 'D', ..., 'O']
  */

  function relabelVertices(graph, vertexMap) {
    let a = [];
    for (let i = 0; i < graph.vertexLabels.length; i++) {
      a.push(graph.vertexLabels[vertexMap[i]]);
    }
    graph.vertexLabels = a;
  }

  /**
  * Function to add edges that are disconnected from the core component
  * @param graph the graph as it is created thus far. 6 by 4, with
  * the core component on the left or the right side.
  * @param leftSide Boolean indicating whether the core component is on
  * the left side or not.
  * @returns the graph with the disconnected edges
  */
  function addDisconnectedEdges(graph, leftSide) {
    /**
     * Q -0- R
     * | \ / |    \ 10
     * 1  x  2
     * | / \ |    / 11
     * S -3- T
     * | \ / |    \ 12
     * 4  x  5
     * | / \ |    / 13
     * U -6- V
     * | \ / |    \ 14
     * 7  x  8
     * | / \ |    / 15
     * W -9- X
     */

    // This object maps the egdes with the numbering as above to the node
    // numbers. This assumes that the component is placed on the right side,
    // an off-set of +4 needs to be added to use the nodes on the left side.
    const edgeNodeMap = {
      0: [0, 1], // QR
      1: [0, 6], // QS
      2: [1, 7], // RT
      3: [6, 7], // ST
      4: [6, 12], // SU
      5: [7, 13], // TV
      6: [12, 13], // UV
      7: [12, 18], // UW
      8: [13, 19], // VX
      9: [18, 19], // WX
      10: [0, 7], // QT
      11: [1, 6], // RS
      12: [6, 13], // SV
      13: [7, 12], // TU
      14: [12, 19], // VX
      15: [13, 18], // UX
    }

    // untakenEdges is a list of all the edges that are possible
    // to be added to the graph without the research component changing.
    // We select randomly approximately half of these edges
    let untakenEdges = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
                        [10,11], [12,13], [14,15]];

    if (leftSide) {
      if (lastLinearTransform === 1) {
        edgeNodeMap[16] = [16, 21] // PV
        edgeNodeMap[17] = [21, 22] // OP
        untakenEdges.push(16, 17)
      }
      if (lastLinearTransform === 4) {
        edgeNodeMap[16] = [10, 15] // LS
        edgeNodeMap[17] = [15, 16] // LV
        edgeNodeMap[18] = [15, 22] // LW
        edgeNodeMap[19] = [16, 21] // PV
        edgeNodeMap[20] = [21, 22] // PW
        untakenEdges.push(16, 17, [18, 19], 20);
      }
      if (lastLinearTransform === 0) {
        edgeNodeMap[16] = [3, 4] // DQ
        edgeNodeMap[17] = [3, 10] // DS
        edgeNodeMap[18] = [4, 9] // HQ
        edgeNodeMap[19] = [9, 10] // HS
        edgeNodeMap[20] = [9, 16] // HU
        untakenEdges.push(16, [17, 18], 19, 20);
      }
      if (lastLinearTransform === 7) {
        edgeNodeMap[16] = [3, 4] // DQ
        edgeNodeMap[17] = [3, 10] // DS
        untakenEdges.push(16, 17)
      }
    } else {
      if (lastLinearTransform === 3) {
        edgeNodeMap[16] = [1, 2] // AR
        edgeNodeMap[17] = [2, 7] // AT
        untakenEdges.push(16, 17)
      }
      if (lastLinearTransform === 5) {
        edgeNodeMap[16] = [1, 2] // AR
        edgeNodeMap[17] = [1, 8] // ER
        edgeNodeMap[18] = [2, 7] // AT
        edgeNodeMap[19] = [7, 8] // ET
        edgeNodeMap[20] = [8, 13] // EV
        untakenEdges.push(16, [17, 18], 19, 20);
      }
      if (lastLinearTransform === 2) {
        edgeNodeMap[16] = [7, 14] // IT
        edgeNodeMap[17] = [13, 14] // IV
        edgeNodeMap[18] = [13, 20] // MV
        edgeNodeMap[19] = [14, 19] // IX
        edgeNodeMap[20] = [19, 20] // MX
        untakenEdges.push(16, 17, [18, 19], 20);
      }
      if (lastLinearTransform === 6) {
        edgeNodeMap[16] = [13, 20] // MV
        edgeNodeMap[17] = [19, 20] // MX
        untakenEdges.push(16, 17)
      }
    }

    // Replace cross points with one of the two edges, randomly selected
    for (let i = 0; i < untakenEdges.length; i++) {
      if (Array.isArray(untakenEdges[i])) {
        untakenEdges[i] = untakenEdges[i][Math.round(JSAV.utils.rand.random())]
      }
    }

    // Add half the number of edges that can be added to it.
    // This is so that it doesn't look too empty or too full, as the total
    // number of edges can be between 13 and 17, depending on how edge DH is.
    const numEdges = Math.ceil(untakenEdges.length / 2);
    const takenEdges = shuffle(untakenEdges).slice(0, numEdges);

    for (i = 0; i < takenEdges.length; i++) {
      const nodes = edgeNodeMap[takenEdges[i]];
      const weight = Math.round(JSAV.utils.rand.random()*8) + 1;
      // offset for the 16 "core" edges
      const offset = (takenEdges[i] < 16 && leftSide) ? 4 : 0;
      const src = nodes[0] + offset;
      const dst = nodes[1] + offset;

      graph.edges[src].push([dst, weight]);
      graph.edges[dst].push([src, weight]);
    }

    return graph;
  }

  // TODO: general algorithm
  // 1. generate graph from the preconfigured template
  // 2. perform a linear transformation of the topology
  //    2.1. run several transformations. Each time the source_str is modified.
  //    2.2. remap edges
  // 3. perform a transformation of vertex labels
  //    3.1 random shuffle vertex labels
  // 4. save the total transformation of vertex labels (topology + random shuffle)

  /*
  * Generates a Dijkstra's algorithm exercise instance.
  *
  * Returns:
  * {
  *   'graph': {
  *       vertexLabels: ['A', ..., 'O'],
  *       edges: [
  *         [[v, w], ..., [v, w]],
  *         ...
  *       ]
  *   },
  *   'roleMap': {
  *     keys letters as in vertexLabels, values integers 0..15 representing
  *     the role of each vertex in the topology of the template graph
  *   },
  *   'startIndex': index of start node (0..15)
  * }
  */
  function generateInstance() {
    // 1. generate graph from the preconfigured template
    const attempts = 100;
    let g = undefined;
    for (let i = 0; i < attempts; i++) {
      let w = determineWeights();
      if (w !== undefined) {
        g = graphFromWeights(w);
        // printGraph(g);
        break;
      }
    }

    // 2. perform a transformation of the graph topology.
    // Preserve the labels and locations of vertices, but rotate or reflect the
    // 4 x 4 grid on which the edges are placed.
    const vertexLayout = [ 0,  1,  2,  3,
                          4,  5,  6,  7,
                          8,  9, 10, 11,
                          12, 13, 14, 15]; // original vertex layout
    // Never use the same transform two times adjacently.
    // Otherwise the student sees that the graph topology does not change.
    let transform = lastLinearTransform;
    while (transform === lastLinearTransform) {
      transform = Math.floor(8 * JSAV.utils.rand.random());
    }
    lastLinearTransform = transform;
    let linearMap = linearTransform(transform, vertexLayout);


    // 3. remap edges.
    // Get a random permutation of *indices*.
    // Randomly decide to place the core component on the left
    // or the right, 50% chance for each.
    let left = JSAV.utils.rand.random() < 0.5;
    let newGraph = remapEdges(g, linearMap, left);
    let roleMap = inverseMap(linearMap);
    // Now newGraph has still the alphabetical vertex labeling:
    // A B C D
    // E F G H
    // I J K L
    // M N O P
    // However, the *roles* of the vertices have been changed.
    // The two possible layouts now are this:
    // with core component (0...15) either on the left or right
    const leftLayout = [0, 1, 2, 3, 16, 17,
                        4, 5, 6, 7, 18, 19,
                        8, 9, 10, 11, 20, 21,
                        12, 13, 14, 15, 22, 23]
    const rightLayout = [16, 17, 0, 1, 2, 3,
                        18, 19, 4, 5, 6, 7,
                        20, 21, 8, 9, 10, 11,
                        22, 23, 12, 13, 14, 15]
    // new index of start node
    const startIndex = (left) ? leftLayout.indexOf(roleMap.indexOf(0))
                              : rightLayout.indexOf(roleMap.indexOf(0))

    // printGraph(newGraph);

    // 4. randomize vertex labels except A, which is always the start node.
    let randomMap = shuffle((left) ? leftLayout : rightLayout);
    let indexOfA = randomMap.indexOf(0);
    swapIndices(randomMap, startIndex, indexOfA);

    relabelVertices(newGraph, randomMap);

    newGraph = addDisconnectedEdges(newGraph, left);
    // printGraph(newGraph);
    let packedRoleMap = {};
    for (let i = 0; i < newGraph.vertexLabels.length; i++) {
      packedRoleMap[newGraph.vertexLabels[i]] = roleMap[i];
    }

    debugPrint("Role map:\n", packedRoleMap)

    return { 'graph': newGraph,
            'roleMap': packedRoleMap,
            'startIndex': startIndex }
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
    const gridStepX = Math.floor(layoutSettings.width / 6);
    const gridStepY = Math.floor(layoutSettings.height / 4);
    function rnd(x) {
      // Returns a random integer between -x and x (both inclusive)
      return Math.floor(JSAV.utils.rand.random() * (2 * x + 1)) //- x;
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

    addEdgeClickListeners();
  }

  /**
   * Add the initial distance table to the JSAV.
   * The table has distance for A as 0, '∞' for the rest
   * Parent is '-' for all.
   * @param riGraph the research instance graph.
   */
  function addTable (riGraph) {
    if (table) {
      table.clear()
    }
    const labelArr = [interpret("node"), ...(riGraph.vertexLabels.sort())];
    const distanceArr = Array.from('∞'.repeat(riGraph.vertexLabels.length - 1));
    distanceArr.unshift(interpret("distance"), 0);
    const parentArr = Array.from('-'.repeat(riGraph.vertexLabels.length));
    parentArr.unshift(interpret("parent"));
    const width = String((riGraph.vertexLabels.length) * 30 + 100) + "px";
    table = jsav.ds.matrix([labelArr, distanceArr, parentArr],
                           {style: "table",
                           width: width,
                           left: 10,
                           top: 780});
  }

  /**
   * Add the minheap to the student's JSAV instance.
   *
   * @param {int} x: position: pixels from left
   * @param {int} y: position: pixels from top
   */
  function addMinheap(x, y) {
    let previouslyExistingMinheap = false;
    if (minheap) {
      previouslyExistingMinheap = true;
      minheap.clear();
      $('.flexcontainer').remove();
      $('#dequeueButton').remove();
    }

    $(".jsavcanvas").append("<div class='flexcontainer'></div>");
    minheap = jsav.ds.binarytree({relativeTo: $(".flexcontainer"),
      left: -180, top: 140});

    if (!previouslyExistingMinheap) {
      jsav.label(interpret("priority_queue"), {relativeTo: minheap,
        top: -135});
      }

    // Add Dequeue button
    const html = "<button type='button' id='dequeueButton'>" +
    interpret("#dequeue") +"</button>";
    $(".jsavtree").append(html);
    $("#dequeueButton").click(dequeueClicked);
    
    heapsize = heapsize.value(0);

    minheap.layout()

    
  }

  function createLegend(av, x, y, interpret) {
    // Center on a pixel to produce crisp edges
    x = Math.floor(x) + 0.5;
    y = Math.floor(y) + 0.5;
    const width = 250; // pixels
    const height = 250; // pixels
    av.g.rect(x, y, width, height, {
        "stroke-width": 1,
        fill: "white",
    }).addClass("legendbox");
    av.label(interpret("legend"), {left: x + 100, top: y - 35});

    const hpos = [26, 76, 90]; // line start, line end, text start (pixels)
    const vpos = [30, 80, 130]; // vertical position for each three edge types
    const edgeClass = ["legend-edge", "legend-fringe", "legend-spanning"];
    const edgeText = ["legend_unvisited", "legend_fringe", 
        "legend_spanning_tree"];
    const textvadjust = -22;
    for (let i = 0; i < 3; i++) {
        av.g.line(x + hpos[0], y + vpos[i],
                x + hpos[1], y + vpos[i]).addClass(edgeClass[i]);
        av.label(interpret(edgeText[i]), {left: x + hpos[2],
                top: y + vpos[i] + textvadjust,
                "text-align": "center"})
            .addClass("legendtext")            
    }
    av.g.circle(x + 51, y + 201, 22);    
    av.label("5<br>C (B)", {left: x + 35, top: y + 166})
        .addClass("legendtext")
        .addClass("textcentering");
    av.label(interpret("node_explanation"),
            {left: x + hpos[2], top: y + 166})
        .addClass("legendtext");
}

  /**
   * Insert the new node into the minheap according to the
   * insertMinheap algorithm.
   * @param srcLabel label of the source node
   * @param dstLabel label of the destination node
   * @param distance distance to be inserted.
   */
  function insertMinheap (srcLabel, dstLabel, distance) {
    var i = heapsize.value();

    heapsize.value(heapsize.value() + 1);

    const label = distance + "<br>" + dstLabel + " (" + srcLabel + ")"
    const newNode = minheap.newNode(label);
    if (i === 0) {
      minheap.root(newNode);
    } else {
      const parent = findParent(i, minheap);
      (i % 2 === 1) ? parent.left(newNode) : parent.right(newNode);
    }

    // Heapify up
    var node = newNode;
    while (i > 0 && extractDistance(node.parent()) > distance) {
      node.value(node.parent().value());
      i = Math.floor((i-1)/2);
      node.parent().value(label);
      node = node.parent();
    }

    minheap.layout();
  }

  /**
   * Return the parent node of node at index.
   * @param {*} index the index of the node whose parent we want.
   * @returns parent of node at index.
   */
  function findParent (index, heap) {
    const chain = [];
    while (index > 0) {
      index = Math.floor((index - 1) / 2);
      chain.unshift(index);
    }
    var parent_node = heap.root();
    for (var i = 1; i < chain.length; i++) {
      var prev_index = chain[i-1];
      var curr_index = chain[i];
      if (prev_index * 2 + 1 === curr_index) {
        parent_node = parent_node.left();
      } else {
        parent_node = parent_node.right();
      }
    }

    return parent_node;
  }

  /**
   * minheapDelete function, delete node at index.
   * @param {*} index index of node to be deleted
   * @returns value of the deleted node.
   */
  function minheapDelete(index) {
    if (heapsize.value() === 0) {
      return
    }

    heapsize.value(heapsize.value() - 1);

    // PLACEHOLDER: be able to remove other than min
    const ret = (index === 0) ? minheap.root().value() : minheap.root().value();

    // Parent of the last node in the heap
    const parentLast = findParent(heapsize.value(), minheap);

    // The last node in the heap (the one to be deleted)
    const lastNode = (heapsize.value() % 2 === 1) ? parentLast.left()
                                                  : parentLast.right();

    if (lastNode) {
      // Swap the values of the root and the last node
      minheap.root().value(lastNode.value());
      lastNode.value(ret);

      lastNode.remove();

      minHeapify(minheap.root());
    } else {
      minheap.root().remove();
    }
    return ret
  }

  /**
   * minHeapify algorithm from a node.
   * @param {*} root The node from which to min-heapify.
   */
  function minHeapify(root) {
    const left = root.left();
    const right = root.right();
    var smallest = root;
    if (left && extractDistance(left) < extractDistance(smallest)) {
      smallest = left;
    }
    if (right && extractDistance(right) < extractDistance(smallest)) {
      smallest = right;
    }
    if (smallest != root) {
      const temp = smallest.value();
      smallest.value(root.value());
      root.value(temp);
      minHeapify(smallest);
    }

  }

  /**
   * Helper function to extract the distance from the minheap tree.
   * @param {*} node node whose distance is being extracted
   * @returns the distance.
   */
  function extractDistance (node) {
    return Number(node.value().match(/\d+/)[0])
  }

  function debugPrint(x) {
    if (debug) {
      console.log(x);
    }
  }

}(jQuery));
