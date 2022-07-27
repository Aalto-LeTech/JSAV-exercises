/*
 * Research version of Dijkstra's algorithm JSAV exercise
 * Artturi Tilanterä
 * artturi.tilantera@aalto.fi
 * 5 November 2021
 */

/* global ODSA, graphUtils */
(function ($) {
  "use strict";
  var exercise,
      graph,
      table,
      minheap,
      heapsize = 0,
      config = ODSA.UTILS.loadConfig(),
      interpret = config.interpreter,
      settings = config.getSettings(),
      jsav = new JSAV($('.avcontainer'), {settings: settings}),
      exerciseInstance,
      lastLinearTransform = -1, // for generateInstance()
      debug = false; // produces debug prints to console

  jsav.recorded();

  function init() {
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
    researchInstanceToJsav(exerciseInstance.graph, graph, layoutSettings);
    addMinheap();
    addTable(exerciseInstance.graph);
    window.JSAVrecorder.addMetadata('roleMap', exerciseInstance['roleMap']);

    graph.layout();
    graph.nodes()[exerciseInstance.startIndex].addClass("marked"); // mark the 'A' node
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

  /*
   * Creates the model solution of the exercise.
   * Note: this function is called by the JSAV library.
   *
   * Parameters:
   * modeljsav: a JSAV algorithm visualization template
   *            (created like: let modeljsav = new JSAV("container"))
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
      top: 0,
      left: 10
    });

    // Mark the initial node
    modelNodes[exerciseInstance.startIndex].addClass("marked");

    modeljsav.displayInit();

    // start the algorithm
    let indexOfLabel = {};
    for (let l of labelsAndIndices) {
      indexOfLabel[l[0]] = l[1];
    }
    dijkstra(modelNodes, distances, modeljsav, indexOfLabel);

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
  function dijkstra(nodes, distances, av, indexOfLabel) {

    // Helper function: returns the distance for the given index in the
    // JSAV distance matrix.
    function getDistance(index) {
      var dist = parseInt(distances.value(index, 1), 10);
      if (isNaN(dist)) {
        dist = Infinity;
      }
      return dist;
    }

    // Note: this is a variant of the Dijkstra's algorithm which does *not*
    // use a priority queue as an auxiliary data structure. Instead, at
    // every round of the main loop, it scans through all nodes and finds the
    // one which is not yet visited and has minimal distance.
    for (let counter = 0; counter < 30; counter++) { // prevent infinite loop
      // find node closest to the minimum spanning tree
      var min = Infinity,        // distance of the closest node not yet visited
          nodeIndex = -1;        // index of the closest node not yet visited
                                 // in the distance matrix
      if (debug)
        logDistanceMatrix(distances);
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
        // No reachable nodes left, finish the algorithm.
        av.umsg(interpret("av_ms_unreachable"));
        av.step();
        break;
      }
      let node = nodes[indexOfLabel[String.fromCharCode(65 + nodeIndex)]];
      if (!node) { break; } // failsafe?
      distances.addClass(nodeIndex, true, "unused");
      if (debug) {
        console.log("Dijkstra: select node " + node.value());
      }
      if (nodeIndex === 0) {
        av.umsg(interpret("av_ms_select_a"));
      } else {
        av.umsg(interpret("av_ms_select_node"), {fill: {node: node.value()}});
      }
      av.step();

      // get previous node if any
      let prevLabel = distances.value(nodeIndex, 2);
      if (prevLabel !== "-") {
        let prevNode = nodes[indexOfLabel[prevLabel]]
        av.umsg(interpret("av_ms_add_edge"),
          { fill: {from: prevNode.value(), to: node.value()}});
        markEdge(prevNode.edgeTo(node), av);
        if (debug) {
          console.log("Add edge: " + prevNode.value() + "-" + node.value());
        }
      }

      // update distances for neighbors
      let neighbors = node.neighbors();
      while (neighbors.hasNext()) {
        let neighbor = neighbors.next();
        // neighborIndex: index in the distance matrix
        let neighborIndex = neighbor.value().charCodeAt(0) - "A".charCodeAt(0);
        // nodeIndex: index in the distance matrix
        let nodeIndex = node.value().charCodeAt(0) - "A".charCodeAt(0);
        let d = getDistance(neighborIndex);
        let dThroughNode = getDistance(nodeIndex) +
              node.edgeTo(neighbor).weight();
        if (debug) {
          console.log("Neighbor: " + neighbor.value() + " distance: " + d);
        }
        // Shorter route found?
        if (!distances.hasClass(neighborIndex, true, "unused") && d > dThroughNode) {
          // update the distance of the neighbour in the distance matrix
          distances.value(neighborIndex, 1, dThroughNode);
          // update the label previous node of the neighbour in the distance
          // matrix
          distances.value(neighborIndex, 2, node.value());
        }
      }
      av.umsg(interpret("av_ms_update_distances"), {fill: {node: node.value()}});
      av.step();

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
  * console.log()s the distance matrix values.
  */
  function logDistanceMatrix(distances) {
    console.log("Distance matrix");
    console.log("Label distance previous unused");
    for (let i = 0; i < distances._arrays.length; i++) {
      let row = [...distances._arrays[i]._values];
      row.push(distances.hasClass(i, true, "unused"))
      console.log(row.join("  "));
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

  function findColByNode (nodeLabel) {
    for (var i = 1; i < 25; i++) {
      if (nodeLabel === table.value(0, i)) {
        return i;
      }
    }
  }

  /**
   * Edge click listeners are bound to the graph itself, 
   * so each time the graph is destroyed with reset, it needs
   * to be added again. Therefore they are in a wrapper function.
   */
  function addEdgeClickListeners() {
    $(".jsavgraph").on("click", ".jsavedge", function () {
      var edge = $(this).data("edge");
      const that = $(this);
      const node1id = that[0].getAttribute("data-startnode");
      const node2id = that[0].getAttribute("data-endnode");
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
      const pathWeight = edge._weight;
      const newDist = getUpdatedDistance();
      const label = newDist + dstLabel;

      const options = {
        "title": "Edge " + ((srcLabel < dstLabel) ? (srcLabel + dstLabel) 
                                                  : (dstLabel + srcLabel)),
        "width": "200px",
        "dialongRootElement": $(this)
      }

      const html = "<button type='button' id='enqueueButton'>Enqueue: " +
                   label + "</button> <br> <button type='button'" +
                   "id='updateButton'>Update: " + label +"</button>"; 
      const popup = JSAV.utils.dialog(html, options);
      
      // Helper functions for the popup 

      //Returns if the node has the class "marked"
      function isMarked (node) {
        return node.element[0].classList.contains("marked")
      }

      //Calculate the new distance for the node
      //This is the source distance if there's none yet
      //Else it's the distance from the source node to A 
      //plus the pathweight from src node to dst node. 
      function getUpdatedDistance () {
        const srcIndex = findColByNode(srcLabel);
        const srcDist = Number(table.value(1, srcIndex))
        return isNaN(srcDist) ? pathWeight : (pathWeight + srcDist)
      }

      //Update the distance and parent node in the table.
      function updateTable () {
        const dstIndex = findColByNode(dstLabel);
        table.value(1, dstIndex, newDist)
        table.value(2, dstIndex, srcLabel)
      }

      //Preorder traversal to get node list of the tree
      //Since there is no function for this in the JSAV library
      function getTreeNodeList (node, arr) {
        var nodeArr = arr || [];

        if (node) {
          nodeArr.push(node);
          nodeArr = getTreeNodeList(node.left(), nodeArr);
          nodeArr = getTreeNodeList(node.right(), nodeArr);
        }
        return nodeArr;
      }

      //Shift up an updated node if it is smaller than its parent.
      function moveUp (node) {
        parent = node.parent();
        if (!parent) {
          return;
        }
        if (extractDistance(node) < extractDistance(parent)) {
          const temp = node.parent().value();
          node.parent().value(node.value());
          node.value(temp);
          moveUp(node.parent());
        }
      }

      $("#enqueueButton").click(function() {
        updateTable();
        insertMinheap(dstLabel, newDist);
        popup.close();
      })

      $("#updateButton").click(function() {
        const nodeArr = getTreeNodeList(minheap.root())
        //Grab first node with the correct destination.
        const updatedNode = nodeArr.filter(node => 
                node.value().charAt(node.value().length - 1) === dstLabel)[0];
        
        //If no node with the correct label exists, do nothing.
        if (!updatedNode) { 
          popup.close();
          return;
        }

        updateTable();
        const oldDist = updatedNode.value().match(/\d+/)[0];
        updatedNode.value(newDist + dstLabel);

        (newDist < oldDist) ? moveUp(updatedNode) : minHeapify(updatedNode);
        popup.close();
      })
    });
  }

  $(".jsavcontainer").on("click", ".jsavnode", function () {
    window.alert("Please, click on the edges, not the nodes.");
  });

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
    return Math.floor(Math.random() * (b - a + 1)) + 1
  }

  function determineWeights() {
    function rnd(x) {
      // Returns a random integer between 1 and x (both inclusive)
      return Math.floor(Math.random() * x) + 1;
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
    console.log("Vertex labels: " + g.vertexLabels);
    for (let i = 0; i < g.edges.length; i++) {
      let s = [g.vertexLabels[i], " : "];
      for (let e of g.edges[i]) {
        s.push(g.vertexLabels[e[0]], " ", e[1], ", ");
      }
      console.log(s.join(""));
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
      k = Math.floor((j + 1) * Math.random());
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
  * Remaps the edges of the graph.
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
  * left: a boolean to indicate whether the core component is in the 
  * left or not (right). 
  *
  * Returns: a transformed graph instance
  */

  function remapEdges(graph, vertexMap, left) {
    console.log(graph)
    console.log(vertexMap)
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

    let paddedGraph = {
      vertexLabels: [...graph.vertexLabels, 
                      "Q", "R", "S", "T", "U", "V", "W", "X"],
      edges: new Array(24)
    }
    for (let i = 0; i < paddedGraph.edges.length; i++) {
      paddedGraph.edges[i] = [];
    }

    //Remap the 4 by 4 component to 6 by 4
    //For left: add 2 empty node columns at the right side
    //for right: add 2 empty node columns at the left side
    if (left) {
      for (let i = 0; i < newGraph.edges.length; i++) {
        //offset of new index compared to old. This is for the source.
        let offset = 2 * Math.floor(i/4);
        for (let e of newGraph.edges[i]) {
          //new destination index.
          let newIndex = e[0] + (2 * Math.floor(e[0]/4));
          paddedGraph.edges[i + offset].push([newIndex, e[1]])
        }
      }
    } else {
      for (let i = 0; i < newGraph.edges.length; i++) {
        //Offset for the new source index.
        // + 1 for the cases where i = 0, 4, 8, 12
        let offset = (i%4) ? 2 * (Math.ceil(i/4)) : 2 * (Math.ceil(i/4) + 1);
        for (let e of newGraph.edges[i]) {
          //Offset and new index of the destination index.
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

  const edgeNodeMap = {
    0: [0, 1], //QR
    1: [0, 6], //QS
    2: [1, 7], //RT
    3: [6, 7], //ST
    4: [6, 12], //SU
    5: [7, 13], //TV
    6: [12, 13], //UV
    7: [12, 18], //UW
    8: [13, 19], //VX
    9: [18, 19], //WX
    10: [0, 7], //QT
    11: [1, 6], //RS
    12: [6, 13], //SV
    13: [7, 12], //TU
    14: [12, 19], //VX
    15: [13, 18], //UX
  }

  let untakenEdges = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 
                      [10,11], [12,13], [14,15]];
  
  if (leftSide) {
    if (lastLinearTransform === 1) {
      edgeNodeMap[16] = [16, 21] //PV
      edgeNodeMap[17] = [21, 22] //OP
      untakenEdges.push(16, 17)
    }
    if (lastLinearTransform === 4) {
      edgeNodeMap[16] = [10, 15] //LS
      edgeNodeMap[17] = [15, 16] //LV
      edgeNodeMap[18] = [15, 22] //LW
      edgeNodeMap[19] = [16, 21] //PV
      edgeNodeMap[20] = [21, 22] //PW
      untakenEdges.push(16, 17, [18, 19], 20);
    }
    if (lastLinearTransform === 0) {
      edgeNodeMap[16] = [3, 4] //DQ
      edgeNodeMap[17] = [3, 10] //DS
      edgeNodeMap[18] = [4, 9] //HQ
      edgeNodeMap[19] = [9, 10] //HS
      edgeNodeMap[20] = [9, 16] //HU
      untakenEdges.push(16, [17, 18], 19, 20);
    }
    if (lastLinearTransform === 7) {
      edgeNodeMap[16] = [3, 4] //DQ
      edgeNodeMap[17] = [3, 10] //DS
      untakenEdges.push(16, 17)
    }
  } else {
    if (lastLinearTransform === 3) {
      edgeNodeMap[16] = [1, 2] //AR
      edgeNodeMap[17] = [2, 7] //AT
      untakenEdges.push(16, 17)
    }
    if (lastLinearTransform === 5) {
      edgeNodeMap[16] = [1, 2] //AR
      edgeNodeMap[17] = [1, 8] //ER
      edgeNodeMap[18] = [2, 7] //AT
      edgeNodeMap[19] = [7, 8] //ET
      edgeNodeMap[20] = [8, 13] //EV
      untakenEdges.push(16, [17, 18], 19, 20);
    }
    if (lastLinearTransform === 2) {
      edgeNodeMap[16] = [7, 14] //IT
      edgeNodeMap[17] = [13, 14] //IV
      edgeNodeMap[18] = [13, 20] //MV
      edgeNodeMap[19] = [14, 19] //IX
      edgeNodeMap[20] = [19, 20] //MX
      untakenEdges.push(16, 17, [18, 19], 20);
    }
    if (lastLinearTransform === 6) {
      edgeNodeMap[16] = [13, 20] //MV
      edgeNodeMap[17] = [19, 20] //MX
      untakenEdges.push(16, 17)
    }
  }

  //Replace cross points with one of the two edges, randomly selected
  for (let i = 0; i < untakenEdges.length; i++) {
    if (Array.isArray(untakenEdges[i])) {
      untakenEdges[i] = untakenEdges[i][Math.round(Math.random())]
    }
  }

  //Add half the number of edges that can be added to it. 
  //This is so that it doesn't look too empty or too full, as the total 
  //number of edges can be between 13 and 17, depending on how edge DH is. 
  const numEdges = Math.ceil(untakenEdges.length / 2);
  const takenEdges = shuffle(untakenEdges).slice(0, numEdges);

  for (i = 0; i < takenEdges.length; i++) {
    const nodes = edgeNodeMap[takenEdges[i]];
    const weight = Math.round(Math.random()*8) + 1;
    //offset for the 16 "core" edges
    const offset = (takenEdges[i] < 16 && leftSide) ? 4 : 0; 
    const src = nodes[0] + offset; 
    const dst = nodes[1] + offset;

    graph.edges[src].push([dst, weight]);
    graph.edges[dst].push([src, weight]);
  }

  return graph
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
      transform = Math.floor(8 * Math.random());
    }
    lastLinearTransform = transform;
    let linearMap = linearTransform(transform, vertexLayout);


    // 3. remap edges.
    // Get a random permutation of *indices*.
    // Randomly decide to place the core component on the left 
    // or the right, 50% chance for each.
    let left = Math.random() < 0.5;
    let newGraph = remapEdges(g, linearMap, left);
    let roleMap = inverseMap(linearMap);
    // Now newGraph has still the alphabetical vertex labeling:
    // A B C D
    // E F G H
    // I J K L
    // M N O P
    // However, the *roles* of the vertices have been changed.
    //The two possible layouts now are this: 
    //with core component (0...15) either on the left or right
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
    
    console.log("Role map:\n", packedRoleMap)

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
      return Math.floor(Math.random() * (2 * x + 1)) //- x;
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
    const labelArr = ["Node", ...(riGraph.vertexLabels.sort())];
    const distanceArr = Array.from('∞'.repeat(riGraph.vertexLabels.length - 1));
    distanceArr.unshift("Distance", 0);
    const parentArr = Array.from('-'.repeat(riGraph.vertexLabels.length));
    parentArr.unshift("Parent");
    const width = String((riGraph.vertexLabels.length) * 30 + 90) + "px";
    table = jsav.ds.matrix([labelArr, distanceArr, parentArr], 
                           {style: "table", 
                           width: width, 
                           relativeTo: $(".jsavbinarytree"), 
                           myAnchor: "center top", 
                           top: "150px"});

    //Assert that width is properly set for each row. 
    //Increase the width of the label column
    for (var i = 0; i < 3; i++) {
      table.css(i, {width: width})
      table.css(i, 0, {width: "60px"})
    }
  }

  /**
   * Add the minheap to the JSAV instance. 
   * The function adds a dummy div with class 'bintree' to center the minheap.
   * 
   */
  function addMinheap () {
    if (minheap) {
      minheap.clear();
      $(".bintree").remove();
    }
    heapsize = 0;
    $(".jsavcanvas").append("<div class='bintree'></div>");
    minheap = jsav.ds.binarytree({relativeTo: $(".bintree"), 
                                  myAnchor: "center top"});
    minheap.layout()
    const html = "<button type='button' id='removeButton'>Remove</button>";
    $(".jsavtree").append(html)
    $("#removeButton").css({"float": "right", 
                            "position": "relative", 
                            "margin": "1em"});
    
    //Add remove button
    $("#removeButton").click(function() {
      const deleted = minheapDelete(0);
      const nodeLabel = deleted.charAt(deleted.length - 1);
      const node = graph.nodes().filter(node => 
          node.element[0].getAttribute("data-value") === nodeLabel)[0];
      const srcLabel = table.value(2, findColByNode(nodeLabel));
      const srcNode = graph.nodes().filter(node => 
          node.element[0].getAttribute("data-value") === srcLabel)[0];
      const edge = graph.getEdge(node, srcNode) ?? graph.getEdge(srcNode, node);
      
      if (!edge.hasClass("marked")) {
        markEdge(edge);
      }
    })
  }

  /**
   * Insert the new node into the minheap according to the 
   * insertMinheap algorithm. 
   * @param {*} label nodeLabel for the node to be inserted.
   * @param {*} distance distance to be inserted.
   */
  function insertMinheap (label, distance) {
    var i = heapsize;
    heapsize += 1;

    const newNode = minheap.newNode(distance + label);
    if (i === 0) {
      minheap.root(newNode);
    } else {
      const parent = findParent(i);
      (i % 2 === 1) ? parent.left(newNode) : parent.right(newNode);
    }

    var node = newNode;
    
    while (i > 0 && extractDistance(node.parent()) > distance) {
      node.value(node.parent().value());
      i = Math.floor((i-1)/2);
      node.parent().value(distance + label);
      node = node.parent();
    }

    minheap.layout();
  }

  /**
   * Return the parent node of node at index. 
   * @param {*} index the index of the node whose parent we want.
   * @returns parent of node at index. 
   */
  function findParent (index) {
    const chain = [];
    while (index > 0) {
      index = Math.floor((index - 1) / 2);
      chain.unshift(index);
    } 
    var parent_node = minheap.root();
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
    if (heapsize === 0) {
      return
    }

    heapsize -= 1

    //PLACEHOLDER: be able to remove other than min
    const ret = (index === 0) ? minheap.root().value() : minheap.root().value();

    const parentLast = findParent(heapsize);
    const lastNode = ((heapsize)%2 === 1) ? parentLast.left() : parentLast.right(); 

    if (lastNode) {
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
    minheap.layout();
  }

  /**
   * Helper function to extract the distance from the minheap tree.
   * @param {*} node node whose distance is being extracted
   * @returns the distance.
   */
  function extractDistance (node) {
    return Number(node.value().match(/\d+/)[0])
  }


}(jQuery));
