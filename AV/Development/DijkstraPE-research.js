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
      width: 500,      // pixels
      height: 400,     // pixels
      layout: "manual",
      directed: false
    }
    graph = jsav.ds.graph(layoutSettings);

    exerciseInstance = generateInstance();
    researchInstanceToJsav(exerciseInstance.graph, graph, layoutSettings);
    // window.JSAVrecorder.addMetadata('roleMap', exerciseInstance['roleMap']);

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
      width: 500,
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
      debugPrint("Dijkstra: select node " + node.value());

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
        debugPrint("Add edge: " + prevNode.value() + "-" + node.value());
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
        debugPrint("Neighbor: " + neighbor.value() + " distance: " + d);

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
    *
    * Returns: a transformed graph instance
    */

   function remapEdges(graph, vertexMap) {
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
     return newGraph;
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
     let newGraph = remapEdges(g, linearMap);
     let roleMap = inverseMap(linearMap);
     // Now newGraph has still the alphabetical vertex labeling:
     // A B C D
     // E F G H
     // I J K L
     // M N O P
     // However, the *roles* of the vertices have been changed.
     const startIndex = roleMap.indexOf(0); // new index of start node

     // printGraph(newGraph);

     // 4. randomize vertex labels except A, which is always the start node.
     let randomMap = shuffle(vertexLayout);
     let indexOfA = randomMap.indexOf(0);
     swapIndices(randomMap, startIndex, indexOfA);

     relabelVertices(newGraph, randomMap);

     // printGraph(newGraph);
     let packedRoleMap = {};
     for (let i = 0; i < newGraph.vertexLabels.length; i++) {
       packedRoleMap[newGraph.vertexLabels[i]] = roleMap[i];
     }

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
     const gridStepX = Math.floor(layoutSettings.width / 4);
     const gridStepY = Math.floor(layoutSettings.height / 4);
     function rnd(x) {
       // Returns a random integer between -x and x (both inclusive)
       return Math.floor(Math.random() * (2 * x + 1)) - x;
     }

     let vertexCoordinates = [];
     for (let y = 0; y < 4; y++) {
       for (let x = 0; x < 4; x++) {
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
   }

   function debugPrint(x) {
     if (debug) {
       debugPrint(x);
     }
   }

}(jQuery));
