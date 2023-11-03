/*
 * Research version of Dijkstra's algorithm JSAV exercise
 * Johanna Sänger, Artturi Tilanterä
 * johanna.sanger@kantisto.nl
 * artturi.tilantera@aalto.fi
 * 25 August 2023
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

  // JSAV Visualization
  var jsav = new JSAV($('.avcontainer'), {settings: settings});

  // Number of elements in the binary heap
  var heapsize = jsav.variable(0);

  // A list of JSAV graph nodes to keeps track of what node has been focused
  // after a dequeue operation. This is make sure that the class can be removed
  // and that after undoing a dequeue operation the previously focused node is
  // again shown as focused.
  var focusedNodes = [];

  // OpenDSA configuration and translation interpreter
  var config = ODSA.UTILS.loadConfig(),
      interpret = config.interpreter,
      settings = config.getSettings();
  
  var debug = false; // produces debug prints to console

  // Storage of priority queue operations from student's answer to implement
  // custom grading. From PqOperationSequence.js
  var studentPqOperations = new PqOperationSequence();
  var modelPqOperations = new PqOperationSequence();

  jsav.recorded();

  // JSAV Exercise
  var exercise = jsav.exercise(model, init, {
    compare: [{ class: "spanning" }],
    controls: $('.jsavexercisecontrols'),
    resetButtonTitle: interpret("reset"),
    modelDialog: {width: "960px"},
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


  function init() {
    // Uncomment this to have a fixed exercise instance for demonstration
    // purpose
    // JSAV.utils.rand.seedrandom("1");

    // Settings for input
    const width = 500, height = 400,  // pixels
          weighted = true,
          directed = false,
          nVertices = [11, 3],
          nEdges = [14, 2];
    
    studentPqOperations = new PqOperationSequence();
    modelPqOperations = new PqOperationSequence();

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

    // Print statistics of exercise instance generation
    let statsText = "Trials: " + trials + "\n";
    for (let k of Object.keys(sumStats)) {
     statsText += k + ": " + sumStats[k] + "\n";
    }
    debugPrint(statsText);

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

    // Shift the x and y of each node 30 left and up.
    // Otherwise the graph is centered bottom right, now it is centered
    // more or less in the middle
    nlGraph.vertices.forEach(vertex => {
      vertex.x = vertex.x - 30;
      vertex.y = vertex.y - 30;
    })
    graphUtils.nlToJsav(nlGraph, graph);
    addEdgeClickListeners();
    addMinheap(100, 530);
    if (!exerciseLegendCreated) {
      createLegend(jsav, 520, 508, interpret);
      exerciseLegendCreated = true;
    }

    addTable();
    graph.layout();
    graph.nodes()[0].addClass("spanning"); // mark the 'A' node
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
    modelNodes[0].addClass("spanning");

    const mintree = modeljsav.ds.binarytree();
    mintree.layout();

    modeljsav.displayInit();

    // start the algorithm
    prim(modelNodes, distances, modeljsav, mintree);

    modeljsav.umsg(interpret("av_ms_mst"));
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

  /**
   *
   * @param {*} nodes is an array of JSAV nodes
   * @param {*} distances is the JSAV matrix of the distances
   * @param {*} av is the model answer AV
   * @param mintree is the priority queue.
   */
  function prim(nodes, distances, av, mintree) {
    var modelheapsize = 0;
    const aNode = nodes.find(node => node.value() === "A");
    aNode.addClass("focusnode");

    aNode.neighbors().forEach(node => visitNeighbour(aNode, node));
    // debugPrint(aNode);

    // A JSAV node which was dequeued before the current node and therefore
    // was given a wider border to "focus" it (grab the student's attention).
    // (Yes, this is similar to the upper scope variable focusedNodes,
    // except that because the model answer does not need an undo function,
    // this variable is not an array but just a single JSAV node.)
    var previousFocusedNode = aNode;

    while (modelheapsize > 0) {
      const rootVal = deleteRoot();
      const label = rootVal.charAt(rootVal.length - 5);
      const dstNode = nodes.find(node => node.value() === label);
      const dstIndex =  dstNode.value().charCodeAt(0) - "A".charCodeAt(0);
      const srcNode = nodes.find(node => node.value() === distances.value(dstIndex, 2))
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
      neighbours.forEach(node => visitNeighbour(dstNode, node))
    }
    av.umsg(interpret("av_ms_unreachable"));
    previousFocusedNode.removeClass("focusnode");
    av.step();

    /******************************************
     * Helper functions inside function prim()
     ******************************************/

    /**
     * Helper function to visit a node in the model solution.
     * Makes a decision whether to add or update the note in the priority
     * queue, or do nothing.
     * 
     * @param src source node
     * @param neighbour neighbour node that is visited
     */
    function visitNeighbour (src, neighbour) {
      debugPrint("visitNeighbour: src = " + src.value() + ", neighbour = " +
      neighbour.value());
      const edge = src.edgeTo(neighbour) ?? src.edgeFrom(neighbour);
      const neighbourIndex = neighbour.value().charCodeAt(0) - "A".charCodeAt(0);
      const currNeighbourDist = getDistance(neighbourIndex);
      const dist = edge._weight;

      if (currNeighbourDist === Infinity) {
        // Case 1: neighbour's distance is infinity.
        // Add node to the priority queue.
        
        // First step: highlight the comparison
        av.umsg(interpret("av_ms_visit_neighbor_add"),
        {fill: {node: src.value(), neighbor: neighbour.value()}});
        highlight(edge, neighbour);
        av.step()

        // Second step: highlight the update
        addNode(src.value(), neighbour.value(), dist);
        updateModelTable(neighbour, src, dist);
        debugPrint("Model solution gradeable step: ADD ROUTE WITH DIST:",
        dist + neighbour.value());
        highlightUpdate(edge, neighbour);    
        storePqOperationStep('enq', edge, av);
      }
      else if (dist < currNeighbourDist) {
        // Case 2: neighbour's distance is shorter through node `src`.
        // Update node in the priority queue.

        // First step: highlight the comparison
        av.umsg(interpret("av_ms_visit_neighbor_update"),
                {fill: {node: src.value(), neighbor: neighbour.value()}});
        highlight(edge, neighbour);
        av.step();

        // Second step: highlight the update
        updateNode(src.value(), neighbour.value(), dist);
        updateModelTable(neighbour, src, dist);
        debugPrint("Model solution gradeable step:  UPDATE DISTANCE TO:",
        dist + neighbour.value());
        highlightUpdate(edge, neighbour);
        storePqOperationStep('upd', edge, av);
      }
      else {
        // Case 3: neighbour's distance is equal or longer through node `src`.
        // Do not update the priority queue.
        debugPrint("KEEP DISTANCE THE SAME:",
                        currNeighbourDist + neighbour.value())

        av.umsg(interpret("av_ms_visit_neighbor_no_action"),
                {fill: {node: src.value(), neighbor: neighbour.value()}});
                highlight(edge, neighbour);
        av.step();
      }
      removeHighlight(edge, neighbour);
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
      av.umsg(interpret("av_ms_select_node"),
              {fill: {node: nodeLabel}});
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
     * Helper function to add a new node.
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
      while (i > 0 && node.parent()
            && extractDistance(node.parent()) >= distance) {
        // If the distance is the same as the parent, we only want to swap them
        // if the destination node alphabetically comes first compared to the
        // parent. If parent is alphabetically first, we break from the while
        // loop.
        if (extractDistance(node.parent()) === distance
            && extractDestination (node.parent()) < extractDestination (node)) {
          break;
        }
        node.value(node.parent().value());
        i = Math.floor((i-1)/2);
        node.parent().value(label);
        node = node.parent();
      }

      // Add queued class to the edge
      const srcNode = nodes.filter(node =>
          node.element[0].getAttribute("data-value") === srcLabel)[0];
      const dstNode = nodes.filter(node =>
          node.element[0].getAttribute("data-value") === dstLabel)[0];
      const edge = dstNode.edgeFrom(srcNode) ?? dstNode.edgeTo(srcNode);
      edge.addClass("fringe")

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
      // Remove queued class from the old edge
      const oldLabel = updatedNode.value();
      const oldSrcLabel = oldLabel.charAt(oldLabel.length - 2);
      const oldSrcNode = nodes.filter(node =>
          node.element[0].getAttribute("data-value") === oldSrcLabel)[0];
      const oldEdge = dstNode.edgeFrom(oldSrcNode) ?? dstNode.edgeTo(oldSrcNode)
      oldEdge.removeClass("fringe");
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
    }

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
      // Mark current edge as highlighted
      edge.addClass("highlighted");
      // Mark current node being visited as highlighted
      node.addClass("highlighted");
      // Mark current node being visited in the table
      distances.addClass(node.value().charCodeAt(0) - "A".charCodeAt(0),
                         true, "highlighted");
      // Mark current node being visited in the mintree
      const treeNodeList = getTreeNodeList(mintree.root());
      const treeNode = treeNodeList.filter(treeNode =>
          treeNode.value().charAt(treeNode.value().length - 5)
          === node.value())[0];
      if (treeNode) {
        treeNode.addClass("highlighted")
      }
    }

    function highlightUpdate(edge, node) {
      // Mark current node being updated in the table
      const tableRow = node.value().charCodeAt(0) - "A".charCodeAt(0);
      distances.removeClass(tableRow, true, "highlighted");
      distances.addClass(tableRow, true, "updated");
      // Mark current node being visited in the mintree
      const treeNodeList = getTreeNodeList(mintree.root());
      const treeNode = treeNodeList.filter(treeNode =>
          treeNode.value().charAt(treeNode.value().length - 5)
          === node.value())[0];
      if (treeNode) {
        treeNode.removeClass("highlighted")
        treeNode.addClass("updated")
      }
    }
      

    function removeHighlight(edge, node) {
      edge.removeClass("highlighted");
      node.removeClass("highlighted");
      const tableIndex = node.value().charCodeAt(0) - "A".charCodeAt(0);
      distances.removeClass(tableIndex, true, "highlighted");
      distances.removeClass(tableIndex, true, "updated");      
      const treeNodeList = getTreeNodeList(mintree.root());
      const treeNode = treeNodeList.filter(treeNode =>
        treeNode.value().charAt(treeNode.value().length - 5)
        === node.value())[0];
      if (treeNode) {
        treeNode.removeClass("highlighted");
        treeNode.removeClass("updated");
      }
    }

    /**
     * Helper function to update the table. Sets dst's distance to distance
     * via parent src.
     * @param dst destination node
     * @param src source node
     * @param distance distance to be inserted in the table.
     */
     function updateModelTable (dst, src, distance) {
      const dstIndex = dst.value().charCodeAt(0) - "A".charCodeAt(0);
      debugPrint("ADD:", dst.value(), distance, src.value());
      distances.value(dstIndex, 1, distance);
      distances.value(dstIndex, 2, src.value());
    }

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

    /*****************************************************
     * End of function dijkstra() and its inner functions 
     *****************************************************/   
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

  /**
   * Edge click listeners are bound to the graph itself,
   * so each time the graph is destroyed with reset, it needs
   * to be added again. Therefore they are in a wrapper function.
   */
   function addEdgeClickListeners() {
    $(".jsavgraph").on("click", ".jsavedge", edgeClicked);
  }

  $(".jsavcontainer").on("click", ".jsavnode", function () {
    window.alert("Please, click on the edges, not the nodes.");
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
    $(".jsavmodelanswer .jsavcanvas").css("min-height", "700px");
  })

  $("#about").click(about);

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
    const node1id = $(this)[0].getAttribute("data-startnode");
    const node2id = $(this)[0].getAttribute("data-endnode");
    const node1 = $("#" + node1id).data("node");
    const node2 = $("#" + node2id).data("node");

    const src =  isMarked(node1) ? node1 : node2;
    const dst = (src === node1) ? node2 : node1;
    if (!src || !dst) {
      console.warn("Either start or end is not defined. Start: ",
                   src, "\tEnd:", dst);
      return
    }
    const srcLabel = src.element[0].getAttribute("data-value");
    const dstLabel = dst.element[0].getAttribute("data-value");
    const dist = edge._weight;
    const label = dist + dstLabel;

    // Edge is listed in alphabetical order, regardless of which
    // node is listed as the src or dst in JSAV.
    const options = {
      "title": interpret("edge") + " " + ((srcLabel < dstLabel)
                                          ? (srcLabel + dstLabel)
                                          : (dstLabel + srcLabel)),
      "width": "200px",
    }

    const html = "<button type='button' id='enqueueButton'>"
                 + interpret("#enqueue") + ": " + label
                 + "</button> <br> <button type='button'"
                 + "id='updateButton'>"  + interpret("#update") + ": "
                 + label +"</button>";

    const popup = JSAV.utils.dialog(html, options);

    // Enqueue and update button event handlers
    $("#enqueueButton").click({srcLabel, dstLabel, dist, popup, edge},
                              enqueueClicked);
    $("#updateButton").click({srcLabel, dstLabel, dist, popup, edge},
                              updateClicked);
  }

  /**
   * @param node node to be queried if it is marked
   * @returns true when node contains class 'marked', else false
   */
  function isMarked (node) {
    return node.element[0].classList.contains("spanning")
  }

  function findColByNode (nodeLabel) {
    for (var i = 1; i < 15; i++) {
      if (nodeLabel === table.value(0, i)) {
        return i;
      }
    }
  }

  /**
   * Add a node to the priority queue with label dstLabel and distance newDist.
   * Update the table to indicate the distance newDist and parent srcLabel.
   * @param event click event, which has the parameters srcLabel, dstLabel,
   * newDist and popup.
   * 
   * @param srcLabel the source node label
   * @param dstLabel the destination node label
   * @param newDist the new distance from A to destination
   * @param popup the popup window, used to close the window before returning.
   */

  function enqueueClicked (event) {
    const srcLabel = event.data.srcLabel;
    const dstLabel = event.data.dstLabel;
    const dist = event.data.dist;
    const popup = event.data.popup;
    debugPrint(event.data.edge)
    event.data.edge.addClass("fringe");
    if (window.JSAVrecorder) {
      window.JSAVrecorder.appendAnimationEventFields(
        {
          "pqOperation": "enqueue",
          "pqIn": window.JSAVrecorder.jsavObjectToJaalID(
            event.data.edge, "Edge")
        });
    }

    updateTable(srcLabel, dstLabel, dist);
    insertMinheap(srcLabel, dstLabel, dist);
    debugPrint("Exercise gradeable step: enqueue edge " + srcLabel + "-" +
      dstLabel + " distance " + dist);
    storePqOperationStep('enq', event.data.edge)
    popup.close();
  }

  /**
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
    const dist = event.data.dist;
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

    updateTable(srcLabel, dstLabel, dist);
    // Add class to the new edge
    event.data.edge.addClass("fringe")
    // Remove class from the old edge
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
    oldEdge.removeClass("fringe");
    if (window.JSAVrecorder) {
      window.JSAVrecorder.appendAnimationEventFields(
        {
          "pqOperation": "update",
          "pqIn": window.JSAVrecorder.jsavObjectToJaalID(
                  event.data.edge, "Edge"),
          "pqOut": window.JSAVrecorder.jsavObjectToJaalID(oldEdge, "Edge")
        });
    }

    const oldDist = oldLabel.match(/\d+/)[0];
    const label = dist + "<br>" + dstLabel + " (" + srcLabel + ")";
    updatedNode.value(label);

    if (dist > oldDist) {
      minHeapify(updatedNode)
    } else {
      var node = updatedNode;
      while (node != minheap.root() &&
             extractDistance(node) <= extractDistance(node.parent())) {
        // If the distance is the same as the parent node, we only want to
        // swap them around if the node's destination comes earlier in the
        // alphabet than its parent's.
        if (extractDistance(node) === extractDistance(node.parent()) &&
            extractDestination(node) > extractDestination(node.parent())) {
          // Alphabetically later, so break the while loop.
          break;
        }
        const temp = node.parent().value();
        node.parent().value(node.value());
        node.value(temp);
        node = node.parent();
      }
    }
    debugPrint("Exercise gradeable step: update edge " + srcLabel + "-" +
      dstLabel + " distance " + dist);
    storePqOperationStep('upd', event.data.edge);
    popup.close();
  }

  /**
   * Event handler for student's UI:
   * Dequeue button click of the priority queue.
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
    const srcLabel = table.value(2, findColByNode(nodeLabel));
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
   * Update the table: dstLabel's distance is set to newDist,
   * with parent set to srcLabel
   * @param srcLabel
   * @param dstLabel
   * @param newDist
   */
  function updateTable (srcLabel, dstLabel, newDist) {
    const dstIndex = findColByNode(dstLabel);
    table.value(1, dstIndex, newDist)
    table.value(2, dstIndex, srcLabel)
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
  
      // Add a Dequeue button
      const html = "<button type='button' id='dequeueButton'>" +
      interpret("#dequeue") +"</button>";
      $(".jsavtree").append(html);
      $("#dequeueButton").click(dequeueClicked);
      
      heapsize = heapsize.value(0);
  
      minheap.layout() 
    }

  /**
   * Add the initial distance table to the JSAV.
   * The table has distance for A as 0, '∞' for the rest
   * Parent is '-' for all.
   */
   function addTable () {
    if (table) {
      table.clear()
    }
    const labels = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"]
    const labelArr = [interpret("node"), ...labels];
    const distanceArr = Array.from('∞'.repeat(labels.length - 1));
    distanceArr.unshift(interpret("distance"), 0);
    const parentArr = Array.from('-'.repeat(labels.length));
    parentArr.unshift(interpret("parent"));
    const width = String((labels.length) * 30 + 100) + "px";
    table = jsav.ds.matrix([labelArr, distanceArr, parentArr],
                           {style: "table",
                           width: width,
                           left: 150,
                           top: 750});
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
    while (i > 0 && extractDistance(node.parent()) >= distance) {
      //If the distance is the same as the parent, we only want to swap them if
      //the destination node alphabetically comes first compared to the parent.
      //If parent is alphabetically first,
      //we break from the while loop.
      if (extractDistance(node.parent()) === distance && extractDestination (node.parent()) < extractDestination (node)) {
        break;
      }
      node.value(node.parent().value());
      i = Math.floor((i-1)/2);
      node.parent().value(label);
      node = node.parent();
    }

    minheap.layout();
  }

  /**
   * minHeapify algorithm from a node.
   * @param {*} root The node from which to min-heapify.
   */
  function minHeapify(root) {
    const left = root.left();
    const right = root.right();
    var smallest = root;
    if (left) extractDestination(left)
    if (left && extractDistance(left) < extractDistance(smallest)) {
      smallest = left;
    }
    if (left && extractDistance(left) === extractDistance(smallest) &&
    extractDestination(left) < extractDestination(smallest)) {
      smallest = left;
    }
    // if (left && extra)
    if (right && extractDistance(right) < extractDistance(smallest)) {
      smallest = right;
    }
    if (right && extractDistance(right) === extractDistance(smallest) &&
    extractDestination(right) < extractDestination(smallest)) {
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
   * minheapDelete function, delete node at index.
   * @returns value of the deleted node.
   */
  function minheapDelete() {
    if (heapsize.value() === 0) {
      return
    }

    heapsize.value(heapsize.value() - 1);

    // PLACEHOLDER: be able to remove other than min
    const ret = minheap.root().value();

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
   * Helper function to extract the distance from the minheap tree.
   * @param {*} node node whose distance is being extracted
   * @returns the distance.
   */
  function extractDistance (node) {
    return Number(node.value().match(/\d+/)[0])
  }

  /**
   * Helper function to extract the destination node from the minheap tree.
   * @param {*} node node whose destination is being extracted
   * @returns the distance.
   */
   function extractDestination (node) {
    return node.value().match(/[A-Z]/)[0];
  }


  function debugPrint(x) {
    if (debug) {
      console.log(x);
    }
  }

}(jQuery));
