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
      nNodes = opts.nodes,
      nEdges = opts.edges,
      nodes = new Array(nNodes),
      edges,
      i;

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
          console.log("Node " + nodes[i] + " left: " + left + " top: " + top);
          i++;
        }
      }
    }

    // Generate set of candidate edges
    var candEdges = candidateEdges(nNodes, gridWidth, gridHeight);

    // Choose nEdges from candEdges
    var selectedEdges = []
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

  window.graphUtils = {
    generate: generateGraph,
    generatePlanar: generatePlanarGraph,
    copy: copyGraph
  };
})();
