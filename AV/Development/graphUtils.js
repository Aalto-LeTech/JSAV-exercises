(function() {
  "use strict";

  function generateRandomEdges(nNodes, nEdges, weighted) {
    var edges = new Array(nEdges),
        adjacencyMatrix,
        index1,
        index2,
        i, j;

    // Utility funciton to check whether the edge already exists
    function isEligibleEdge(startIndex, endIndex) {
      if ((startIndex === endIndex) ||
          (adjacencyMatrix[startIndex][endIndex] === 1) ||
          (adjacencyMatrix[endIndex][startIndex] === 1)) {
        return false;
      }
      return true;
    }

    //Create the adjacencyMatrix
    adjacencyMatrix = new Array(nNodes);
    for (i = 0; i < nNodes; i++) {
      adjacencyMatrix[i] = new Array(nNodes);
    }
    //Initialize the adjacency matrix
    for (i = 0; i < nNodes; i++) {
      for (j = 0; j < nNodes; j++) {
        adjacencyMatrix[i][j] = 0;
      }
    }
    for (i = 0; i < nEdges; i++) {
      do {
        index1 = Math.floor((Math.random() * nNodes));
        index2 = Math.floor((Math.random() * nNodes));
      } while (!isEligibleEdge(index1, index2));
      edges[i] = {
        startIndex: index1,
        endIndex: index2
      };
      if (weighted) {
        edges[i].weight = 1 + Math.floor((Math.random() * 9));
      }
      // add the edge to the matrix
      adjacencyMatrix[index1][index2] = 1;
      // adjacencyMatrix[index2][index1] = 1;
    }

    return edges;
  }

  /*
   * Generates a graph to an empty JSAV graph instance (graph).
   *
   * Arguments:
   *    - graph:    an empty JSAV graph instance
   *
   * Options:
   *    - nodes:    number of nodes, default is 7
   *    - edges:    number of edges, default is 10
   *    - weighted: should the graph be weighted, default is false
   */
  function generateGraph(graph, options) {
    var defaultOptions = {
      weighted: false,
      nodes: 7,          // number of nodes
      edges: 10          // number of edges
    };
    var opts = $.extend(defaultOptions, options),
        weighted = opts.weighted,
        nNodes = opts.nodes,
        nEdges = opts.edges,
        nodes = new Array(nNodes),
        edges,
        i;

    // Generate the node values
    for (i = 0; i < nNodes; i++) {
      nodes[i] = String.fromCharCode(i + 65);
    }
    // Generate edges
    edges = generateRandomEdges(nNodes, nEdges, weighted);
    // Add the nodes to the graph
    for (i = 0; i < nNodes; i++) {
      graph.addNode(nodes[i]);
    }
    // Add the edges to the graph
    for (i = 0; i < nEdges; i++) {
      var gNodes  = graph.nodes(),
          start   = gNodes[edges[i].startIndex],
          end     = gNodes[edges[i].endIndex],
          eOpts   = edges[i].weight ? {weight: edges[i].weight} : {};

      graph.addEdge(start, end, eOpts);
    }
  }

  /*
   * Generates a random planar graph to an empty JSAV graph instance (graph).
   *
   * Arguments:
   *    - graph:    an empty JSAV graph instance
   *
   * Options:
   *    - nodes:    number of nodes, default is 15
   *    - edges:    number of edges, default is 20
   *    - weighted: should the graph be weighted, default is false
   */
  function generatePlanarGraph(graph, options) {
    var defaultOptions = {
      weighted: false,
      nodes: 7, // number of nodes
      edges: 10 // number of edges
    };
    var opts = $.extend(defaultOptions, options),
      weighted = opts.weighted,
      nNodes = parseInt(opts.nodes),
      nEdges = parseInt(opts.edges),
      nodes = [],
      edges,
      i;

    // Validate input
    const minNodes = 2, maxNodes = 100, minEdges = 1, maxEdges = maxNodes * 3;
    if (nNodes < minNodes || nNodes > maxNodes || isNaN(nNodes)) {
      console.warn("The number of nodes is " + nNodes +
        ", but it should be within range (" + minNodes + ", " + maxNodes +
        ").");
      return;
    }
    if (nEdges < minEdges || nEdges > maxEdges || isNaN(nEdges)) {
      console.warn("The number of edges is " + nEdges +
        ", but it should be within range (" + minEdges + ", " + maxEdges +
        ").");
      return;
    }

    nodes = new Array(nNodes);

    // Place nodes in a square grid:
    //   A---B---C---D
    //   |   |   |   |
    //   E---F---G---H
    //   |   |
    //   I---J
    //
    const gridWidth = Math.ceil(Math.sqrt(nNodes));
    const gridHeight = Math.ceil(nNodes / gridWidth);
    const gridStepX = Math.floor(graph.options.width / gridWidth);
    const gridStepY = Math.floor(graph.options.height / gridHeight);

    // Generate node labels and nodes
    for (var y = 0, i = 0; y < gridHeight; y++) {
      for (var x = 0; x < gridWidth; x++) {
        if (i < nNodes) {
          nodes[i] = String.fromCharCode(i + 65);
          var left = Math.floor((x + 0.5) * gridStepX);
          var top  = Math.floor((y + 0.5) * gridStepY);
          graph.addNode(nodes[i], {"left": left, "top": top});
          i++;
        }
      }
    }

    // Generate set of candidate edges
    var candEdges = candidateEdges(nNodes, gridWidth, gridHeight);
    if (nEdges > candEdges.length) {
      console.warn("A graph with " + nNodes + " nodes can have at most " +
        candEdges.length + " edges, " + "but " + nEdges + " was requested. " +
        "Limiting the number of edges to the maximum amount.")
      nEdges = candEdges.length;
    }

    // First choose at least one edge that has the first vertex
    var selectedEdges = [];
    var firstEdges = [];
    for (var i = 0; i < candEdges.length; i++) {
      if (candEdges[i][0] === 0 || candEdges[i][1] === 0) {
        firstEdges.push(i);
      }
    }
    var firstEdgeI = Math.floor(Math.random() * firstEdges.length);
    firstEdgeI = firstEdges[firstEdgeI];
    selectedEdges.push(candEdges[firstEdgeI]);
    candEdges[firstEdgeI] = undefined;

    // Choose nEdges from candEdges

    while (selectedEdges.length < nEdges) {
      var i = Math.floor(Math.random() * candEdges.length);
      if (candEdges[i] !== undefined) {
        selectedEdges.push(candEdges[i]);
        candEdges[i] = undefined;
      }
    }

    // Add the edges to the graph
    // Note: graph.addEdge() requires references to nodes as JSAV graph node
    // instances. Variable gNodes does the conversion from integer index to
    // the node instance.
    const gNodes  = graph.nodes();
    for (i = 0; i < nEdges; i++) {
      var v1 = selectedEdges[i][0];
      var v2 = selectedEdges[i][1];
      var edgeOptions = {};
      if (weighted) {
        edgeOptions.weight = 1 + Math.floor((Math.random() * 9));
      }
      graph.addEdge(gNodes[v1], gNodes[v2], edgeOptions);
    }
  }

  function candidateEdges(nNodes, gridWidth, gridHeight) {
    /*  A----B----C    Create the set of candidate edges: a square grid with
     *  |\   |   /|    a diagonal inside each square. Choose one of two
     *  | \  |  / |    diagonals for each square: either right-down or
     *  |  \ | /  |    left-down. In the figure left, there is a right-down
     *  |   \|/   |    diagonal AE and left-down diagonal CE.
     *  D----E----F
     *                 Idea: Ari Korhonen @ Aalto University
     *
     * Parameters:
     * nNodes (integer): number of nodes in the graph
     * gridWidth: width of the grid in nodes
     * gridHeight: height of the frid in nodes
     */

    var candidateEdges = [];
    var x, y, xLimit, yLimit, v1, v2, v3, v4;

    // Horizontal edge (right)
    for (y = 0, yLimit = gridHeight; y < yLimit; y++) {
      for (x = 0, xLimit = gridWidth - 1; x < xLimit; x++) {
        v1 = y * gridWidth + x;
        v2 = v1 + 1;
        if (v1 < nNodes && v2 < nNodes) {
          candidateEdges.push([v1, v2]);
        }
      }
    }
    // Vertical edge (down)
    for (y = 0, yLimit = gridHeight - 1; y < yLimit; y++) {
      for (x = 0, xLimit = gridWidth; x < xLimit; x++) {
        v1 = y * gridWidth + x;
        v2 = v1 + gridWidth;
        if (v1 < nNodes && v2 < nNodes) {
          candidateEdges.push([v1, v2]);
        }
      }
    }
    // Diagonal edges (right-down; move v1 right, then edge left-down)
    var v3, v4;
    for (y = 0, yLimit = gridHeight - 1; y < yLimit; y++) {
      for (x = 0, xLimit = gridWidth - 1; x < xLimit; x++) {
        // v1--v3
        // | \  |
        // |  \ |
        // v4--v2
        v1 = y * gridWidth + x;
        v2 = v1 + gridWidth + 1; // right-down
        v3 = v1 + 1; // right
        v4 = v1 + gridWidth; // down
        var diag1valid = (v1 < nNodes && v2 < nNodes);
        var diag2valid = (v3 < nNodes && v4 < nNodes);
        if (diag1valid) {
          if (diag2valid) {
            if (Math.random() < 0.5) {
              candidateEdges.push([v1, v2]);
            } else {
              candidateEdges.push([v3, v4]);
            }
          } else {
            candidateEdges.push([v1, v2]);
          }
        } else if (diag2valid) {
          candidateEdges.push([v3, v4]);
        }
      }
    }
    return candidateEdges;
  }

  /*
   * Generates a grid-based random planar graph in a neighbour list format.
   * Computes a layout for each vertex in pixel coordinates: origo at left-top
   * corner, x grows to right, y grows to down.
   *
   * Parameters:
   * nVertices (int):    number of vertices (2..100)
   * nEdges   (int):     number of edges (1..300)
   * weighted (boolean): should the graph be weighted
   * directed (boolean): should the graph be directed
   * width (int):        width of the graph layout in pixels
   * height (int):       height of the graph layout in pixels
   *
   * Returns:
   * { vertices: v, edges: e}:
   *   v[i]   : list of vertices (0 <= i < nVertices)
   *   v[i].x
   *   v[i].y : pixel coordinates of the vertex.
   *   e[i]   : neighbour list for vertex 0 <= i < nodes.
   *   e[i][j].v: index of end vertex (0 <= j < neighbour count of i)
   *   e[i][j].weight: the weight of the edge; an integer from range [1,9] if
   *                  parameter weighted === true.
   *
   * If parameter directed === true, for each pair of (i, j)
   * e[i][j] === e[j][i].
   */
  function generatePlanarGraphNl(nVertices, nEdges, weighted, directed, width,
    height)
  {
    // Place nodes in a square grid:
    //   A---B---C---D
    //   |   |   |   |
    //   E---F---G---H
    //   |   |
    //   I---J
    //
    const gridWidth = Math.ceil(Math.sqrt(nVertices));
    const gridHeight = Math.ceil(nVertices / gridWidth);
    const gridStepX = Math.floor(width / gridWidth);
    const gridStepY = Math.floor(height / gridHeight);

    // Generate graph and vertices.
    let g = nlGraph(nVertices, nEdges, weighted, directed, width, height);
    for (let y = 0, i = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth && i < nVertices; x++, i++) {
        g.vertices[i] = { x: Math.floor((x + 0.5) * gridStepX),
                          y: Math.floor((y + 0.5) * gridStepY) };
      }
    }

    // Generate set of candidate edges.
    let candEdges = candidateEdges(nVertices, gridWidth, gridHeight);

    // Select nEdges from candEdges.
    let selectedEdges = [];
    if (nEdges > candEdges.length) {
      console.warn("A graph with " + nVertices + " nodes can have at most " +
        candEdges.length + " edges, " + "but " + nEdges + " was requested. " +
        "Limiting the number of edges to the maximum amount.")
      nEdges = candEdges.length;
    }

    // First choose randombly one edge that begins from or ends to the first
    // vertex.
    let firstEdges = [];
    for (let i = 0; i < candEdges.length; i++) {
      if (candEdges[i][0] === 0 || candEdges[i][1] === 0) {
        firstEdges.push(i);
      }
    }
    let i = Math.floor(Math.random() * firstEdges.length);
    i = firstEdges[i];
    selectedEdges.push(candEdges[i]);
    candEdges[i] = undefined;

    // Choose nEdges-1 from candEdges
    while (selectedEdges.length < nEdges) {
      let i = Math.floor(Math.random() * candEdges.length);
      if (candEdges[i] !== undefined) {
        selectedEdges.push(candEdges[i]);
        candEdges[i] = undefined;
      }
    }

    // Add the edges to the graph
    // Note: graph.addEdge() requires references to nodes as JSAV graph node
    // instances. Variable gNodes does the conversion from integer index to
    // the node instance.
    let weight = 0;
    for (i = 0; i < nEdges; i++) {
      let v1 = selectedEdges[i][0];
      let v2 = selectedEdges[i][1];
      if (weighted) {
        weight = 1 + Math.floor((Math.random() * 9));
      }
      g.edges[v1].push({v: v2, weight: weight});
      if (!directed) {
        g.edges[v2].push({v: v1, weight: weight});
      }
    }
    // Sort edges by start vertex, end vertex.
    for (let n of g.edges) {
      n.sort(function(e1, e2) { return e1.v - e2.v });
    }
    return g;
  }

  /*
   * Constructs a neighbour list graph instance.
   *
   * This graph format is used for generating random graphs and validating
   * their properties for an algorithm simulation (proficiency) exercise.
   * It refers to vertices as integers and edges as pair of integers.
   * Creating a neighbour list graph does not utilise JSAV, and thus it does
   * not affect DOM (the web page) which is faster. It is meant that an
   * exercise will finally convert a graphUtils.nlGraph type object into a
   * JSAV graph (jsav.dl.graph()), compute its final layout and display it in
   * the visualisation.
   *
   * Parameters:
   * nVertices (int):    number of vertices
   * nEdges   (int):     number of edges
   * weighted (boolean): should the graph be weighted
   * directed (boolean): should the graph be directed
   * width (int):        width of the graph layout in pixels
   * height (int):       height of the graph layout in pixels
   */
  function nlGraph(nVertices, nEdges, weighted, directed, width, height) {
    let g = {
      vertices: new Array(nVertices),
      edges: new Array(nVertices),
      weighted: weighted,
      directed: directed,
      width: width,
      height: height
    };
    for (let i = 0; i < nVertices; i++) {
      g.edges[i] = [];
    }
    return g;
  }

  /*
   * Copies edge and vertex data from a neighbour list graph into a JSAV graph.
   *
   * Parameters:
   * nlGraph: a neighbour list graph, such as one created with
   *          generatePlanarGraphNl().
   *
   * Returns:
   * an object created with jsav.dl.graph()
   */
  function nlToJsav(nlGraph, jsavGraph) {
    for (let i = 0; i < nlGraph.vertices.length; i++) {
      let label = String.fromCharCode(i + 65); // A, B, C, ...
      jsavGraph.addNode(label,
        { left: nlGraph.vertices[i].x,
          top: nlGraph.vertices[i].y } );
    }
    const gNodes  = jsavGraph.nodes();
    let options = {};
    for (let i = 0; i < nlGraph.vertices.length; i++) {
      for (let e of nlGraph.edges[i]) {
        if (nlGraph.weighted) {
          options.weight = e.weight
        }
        jsavGraph.addEdge(gNodes[i], gNodes[e.v], options);
      }
    }
  }

  /*
   * Creates a copy of a JSAV graph instance
   */
  function copyGraph(source, destination, options) {
    var sourceNodes = source.nodes(),
        sourceEdges = source.edges(),
        opts = options || {weights: false};
    // copy nodes from graph
    sourceNodes.forEach(function(node) {
      destination.addNode(node.value());
    });

    // copy source node positions
    var destinationNodes = destination.nodes();
    destinationNodes.forEach(function(node, i) {
      var pos = sourceNodes[i].position();
      node.moveTo(pos.left, pos.top);
    });

    // copy edges from graph
    sourceEdges.forEach(function(edge) {
      var startIndex = sourceNodes.indexOf(edge.start()),
          endIndex   = sourceNodes.indexOf(edge.end()),
          startNode  = destinationNodes[startIndex],
          endNode    = destinationNodes[endIndex],
          eOpts      = opts.weights ? {weight: edge.weight()} : {};
      destination.addEdge(startNode, endNode, eOpts);
    });

    // call the layout function for each edge
    var destinationEdges = destination.edges();
    destinationEdges.forEach(function(edge) {
      edge.layout();
    });

    return destination;
  }

  // Map public functions to graphUtils object with the following public names
  window.graphUtils = {
    generate: generateGraph,
    generatePlanarNl: generatePlanarGraphNl,
    nlToJsav: nlToJsav,
    copy: copyGraph,
  };
})();
