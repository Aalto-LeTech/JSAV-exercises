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
   * Generates a grid-based random planar graph in a neighbour list format.
   * Computes a layout for each vertex in pixel coordinates: origo at left-top
   * corner, x grows to right, y grows to down.
   *
   * Parameters:
   * nVertices [V1, V2, ...]: number of vertices for each connected component
   * nEdges    [E1, E2, ...]: number of edges for each connected component
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
    let totalVertices = 0;
    for (let v of nVertices)
      totalVertices += v;

    const gridWidth = Math.ceil(Math.sqrt(totalVertices));
    const gridHeight = Math.ceil(totalVertices / gridWidth);
    const gridStepX = Math.floor(width / gridWidth);
    const gridStepY = Math.floor(height / gridHeight);

    // Generate graph and vertices.
    let g = nlGraph(nVertices, nEdges, weighted, directed, width, height);

    for (let y = 0, i = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth && i < totalVertices; x++, i++) {
        g.vertices[i] = { x: Math.floor((x + 0.5) * gridStepX),
          y: Math.floor((y + 0.5) * gridStepY) };
      }
    }
    const nConnectedComponents = nVertices.length;

    // Create set of candidate edges
    let candEdges = candidateEdges(nVertices, gridWidth, gridHeight);

    let component = verticesToComponents(nVertices, gridWidth, gridHeight,
      candEdges);

    // Select nEdges[i] from candEdges for each component i.
    candEdges = edgesToComponents(candEdges, component, nEdges);
    let selectedEdges = [];
    let edgesPerComponent = Array(nConnectedComponents);
    for (let i = 0; i < nConnectedComponents; i++) {
      edgesPerComponent[i] = 0;
    }

    // Choose the edges for each component c
    for (let c = 0; c < nEdges.length; c++) {
      shuffle(candEdges[c]);
      for (let i = 0; edgesPerComponent[c] < nEdges[c] &&
           i < candEdges[c].length; i++) {
        selectedEdges.push(candEdges[c][i]);
        edgesPerComponent[c]++;
      }
    }

    // Add the edges to the graph
    // Note: graph.addEdge() requires references to nodes as JSAV graph node
    // instances. Variable gNodes does the conversion from integer index to
    // the node instance.
    let weight = 0;
    for (let e of selectedEdges) {
      let v1 = e[0];
      let v2 = e[1];
      if (weighted) {
        weight = 1 + Math.floor((Math.random() * 9));
      }
      // JSAV implementation
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

  /*  A----B----C    Create the set of undirected candidate edges: a square grid
   *  |\   |   /|     with a diagonal inside each square. Choose one of two
   *  | \  |  / |    diagonals for each square: either right-down or
   *  |  \ | /  |    left-down. In the figure left, there is a right-down
   *  |   \|/   |    diagonal AE and left-down diagonal CE.
   *  D----E----F
   *                 Idea: Ari Korhonen @ Aalto University
   *
   * Parameters:
   * nVertices [V1, V2, ...]: number of vertices for each connected component
   * gridWidth: width of the grid in nodes
   * gridHeight: height of the frid in nodes
   *
   * Returns:
   * [e1, e2, ..., eN], where each entry is of form [u, v], where u < v.
   * It means that each entry [u, v] also indicates an edge [v, u], although the
   * latter is not listed explicitly.
   */
  function candidateEdges(nVertices, gridWidth, gridHeight) {
    let totalVertices = 0;
    for (let v of nVertices) {
      totalVertices += v;
    }

    var candidateEdges = [];
    var x, y, xLimit, yLimit, v1, v2, v3, v4;

    // Horizontal edge (right)
    for (y = 0, yLimit = gridHeight; y < yLimit; y++) {
      for (x = 0, xLimit = gridWidth - 1; x < xLimit; x++) {
        v1 = y * gridWidth + x;
        v2 = v1 + 1;
        if (v1 < totalVertices && v2 < totalVertices) {
          candidateEdges.push([v1, v2]);
        }
      }
    }
    // Vertical edge (down)
    for (y = 0, yLimit = gridHeight - 1; y < yLimit; y++) {
      for (x = 0, xLimit = gridWidth; x < xLimit; x++) {
        v1 = y * gridWidth + x;
        v2 = v1 + gridWidth;
        if (v1 < totalVertices && v2 < totalVertices) {
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
        var diag1valid = (v1 < totalVertices && v2 < totalVertices);
        var diag2valid = (v3 < totalVertices && v4 < totalVertices);
        if (diag1valid) {
          if (diag2valid) {
            candidateEdges.push(randomChoice([[v1, v2], [v3, v4]]));
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

  /* Assigns each vertex into a connected component
   *
   * Parameters:
   * nVertices [V1, V2, ...]: number of vertices for each connected component
   * gridWidth: width of the grid in nodes
   * gridHeight: height of the frid in nodes
   */
  function verticesToComponents_old(nVertices, gridWidth, gridHeight) {
    let totalVertices = 0;
    for (let v of nVertices) {
      totalVertices += v;
    }

    let components = new Array(totalVertices);

    let c = nVertices.length - 1;
    let assigned = 0;
    for (let x = gridWidth - 1; x >= 0; x--) {
      for (let y = 0; y < gridHeight; y++) {
        let i = y * gridWidth3 + x;
        if (i < totalVertices) {
          components[i] = c;
          assigned++;
          if (assigned === nVertices[c] && assigned < totalVertices) {
            assigned = 0;
            c--;
          }
        }
      }
    }
    return components;
  }

  /*
   * Filters edges by component
   *
   * Parameters:
   * candEdges: [e1, e2, ..., eN], where each entry is of form [u, v],
   *            indicating a bidirectional edge betveen vertices u and v.
   * component: index of connected component for each vertex
   * nEdges    [E1, E2, ...]: number of edges for each connected component
   */
  function edgesToComponents(candEdges, component, nEdges) {
    let edgesByComponent = new Array(nEdges.length);
    for (let i = 0; i < nEdges.length; i++) {
      edgesByComponent[i] = [];
    }
    for (let e of candEdges) {
      let v1 = e[0];
      let v2 = e[1];
      if (component[v1] === component[v2]) {
        let c = component[v1];
        edgesByComponent[component[v1]].push(e);
      }
    }
    for (let i = 0; i < nEdges.length; i++) {
      if (edgesByComponent[i].length < nEdges[i]) {
        console.warn("Connected component " + i + " has only " +
          edgesByComponent[i].length + " edges, but " + nEdges[i] +
          " edges was requested.");
      }
    }
    return edgesByComponent;
  }

  /* Assigns each vertex into a connected component
   *
   * Parameters:
   * nVertices [V1, V2, ...]: number of vertices for each connected component
   * gridWidth: width of the grid in nodes
   * gridHeight: height of the frid in nodes
   */
  function verticesToComponents(nVertices, gridWidth, gridHeight, candEdges) {
    let totalVertices = 0;
    for (let v of nVertices)
      totalVertices += v;

    let component = new Array(nVertices); // Component of each vertex

    // Initialise all vertices to component 0
    let neighbours = new Array(nVertices);
    for (let i = 0; i < totalVertices; i++) {
      component[i] = 0;
      neighbours[i] = [];
    }
    if (nVertices.length === 1) {
      return component;
    }

    // Create a neighbour list of undirected edges from candEdges
    for (let e of candEdges) {
      neighbours[e[0]].push(e[1]);
      neighbours[e[1]].push(e[0]);
    }

    // assign vVertices[1] vertices to component 1
    let assigned = 0; // number of assigned vertices

    // Begin assigning vertices to component 1 from the last vertex, which is
    // at the right border of the vertex grid.
    let rightBorder = [];
    for (let i = gridWidth - 1; i < totalVertices; i += gridWidth) {
      rightBorder.push(i);
    }
    let startVertex = randomChoice(rightBorder),
          depth = 0,
          maxDepth = 2;
    randomDFS(startVertex, neighbours, assigned, nVertices, component, depth,
      maxDepth);
    // randomDFS(totalVertices - 1, neighbours, assigned, nVertices, component, depth,
    //    maxDepth);

    return component;
  }

  /*
   * Randomised depth-first search which assigns vertices to connected
   * component 1. It is assumed that all vertices belong initially to component
   * 0.
   *
   * Parameters:
   * v: index of the vertex to begin with
   * neighbours: neighbour list of the graph
   * assigned: number of vertices assigned to component 1
   * nVertices: desired number of vertices in different components
   * component: index of connected component for each vertex.
   */
  function randomDFS(v, neighbours, assigned, nVertices, component, depth,
    maxDepth) {
    if (component[v] === 1 || assigned === nVertices[1] || depth > maxDepth) {
      return assigned;
    }
    component[v] = 1;
    assigned++;
    shuffle(neighbours[v]);

    let i = 0;
    for (let i = 0; i < neighbours[v].length && assigned < nVertices[1]; i++) {
      assigned = randomDFS(neighbours[v][i], neighbours, assigned, nVertices,
        component, depth + 1, maxDepth);
    }
    return assigned;
  }

  /*
   * Randomises the order of array by Fisher-Yates shuffle algorithm.
   * https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
   *
   * Parameters:
   * a: array
   */
  function shuffle(a, firstN) {
    if (a === undefined) {
      console.warn("shuffle(undefined)!")
      return;
    }
    const end_i = a.length - 1;
    let i, j, k, tmp;
    // Iterate from beginning to end.
    // Indices 0...(i-1) contain processed portion of the array.
    // Indices i...(n.1) contain unprocessed portion of the array.
    // Choose random element from the unprocessed portion and swap it to the
    // beginning of the portion. Then that element belongs to the processed
    // portiion.
    for (i = 0; i < end_i; i++) {
      // j = Random choice from range [i, end_i]
      j = i + Math.floor(Math.random() * (end_i - i));
      // swap elements at j and i
      tmp = a[j];
      a[j] = a[i];
      a[i] = tmp;
    }
  }

  /*
   * Swaps elements at indices i and j in array a.
   */
  function swap(a, i, j) {
    let tmp = a[j];
    a[j] = a[i];
    a[i] = tmp;
  }

  /*
   * Chooses randomly an element from array a and returns the element.
   */
  function randomChoice(a) {
    let i = Math.floor(Math.random() * a.length);
    return a[i];
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
   * nVertices [V1, V2, ...]: number of vertices for each connected component
   * nEdges    [E1, E2, ...]: number of edges for each connected component
   * weighted (boolean): should the graph be weighted
   * directed (boolean): should the graph be directed
   * width (int):        width of the graph layout in pixels
   * height (int):       height of the graph layout in pixels
   */
  function nlGraph(nVertices, nEdges, weighted, directed, width, height) {
    let totalVertices = 0, totalEdges = 0;
    for (let v of nVertices)
      totalVertices += v;
    for (let e of nEdges)
      totalEdges += e;

    let g = {
      vertices: new Array(totalVertices),
      edges: new Array(totalVertices),
      weighted: weighted,
      directed: directed,
      width: width,
      height: height
    };
    for (let i = 0; i < totalVertices; i++) {
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
