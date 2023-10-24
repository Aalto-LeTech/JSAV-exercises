  /*
   * Scaffolded Dijkstra's algorithm exercise
   *
   * Preconfigured template for research
   */

  class DijkstraInstanceGenerator {

    /**
     * Constructor.
     * 
     * @param {boolean} debug If true, produces debug prints to console.
     */
    constructor(debug) {
        this.debug = debug;
        this.lastLinearTransform = -1; // for generateInstance()
    }

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

    randomInt(a, b) {
      // Returns a random integer between a and b (both inclusive).
      return Math.floor(JSAV.utils.rand.random() * (b - a + 1)) + 1
    }

    determineWeights() {
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
    graphFromWeights(w) {

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
    printGraph(g) {
      this.debugPrint("Vertex labels: " + g.vertexLabels);
      for (let i = 0; i < g.edges.length; i++) {
        let s = [g.vertexLabels[i], " : "];
        for (let e of g.edges[i]) {
          s.push(g.vertexLabels[e[0]], " ", e[1], ", ");
        }
        this.debugPrint(s.join(""));
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

    linearTransform(t, sourceArray) {
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
    swapIndices(A, i, j) {
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
    shuffle(sourceArray) {
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
        this.swapIndices(shuffled, j, k);
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
    permuteArray(a, mapping) {
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
    inverseMap(mapping) {
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
    remapEdges(graph, vertexMap, left) {
      this.debugPrint(graph);
      this.debugPrint(vertexMap);
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
    relabelVertices(graph, vertexMap) {
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
    addDisconnectedEdges(graph, leftSide) {
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
        if (this.lastLinearTransform === 1) {
          edgeNodeMap[16] = [16, 21] // PV
          edgeNodeMap[17] = [21, 22] // OP
          untakenEdges.push(16, 17)
        }
        if (this.lastLinearTransform === 4) {
          edgeNodeMap[16] = [10, 15] // LS
          edgeNodeMap[17] = [15, 16] // LV
          edgeNodeMap[18] = [15, 22] // LW
          edgeNodeMap[19] = [16, 21] // PV
          edgeNodeMap[20] = [21, 22] // PW
          untakenEdges.push(16, 17, [18, 19], 20);
        }
        if (this.lastLinearTransform === 0) {
          edgeNodeMap[16] = [3, 4] // DQ
          edgeNodeMap[17] = [3, 10] // DS
          edgeNodeMap[18] = [4, 9] // HQ
          edgeNodeMap[19] = [9, 10] // HS
          edgeNodeMap[20] = [9, 16] // HU
          untakenEdges.push(16, [17, 18], 19, 20);
        }
        if (this.lastLinearTransform === 7) {
          edgeNodeMap[16] = [3, 4] // DQ
          edgeNodeMap[17] = [3, 10] // DS
          untakenEdges.push(16, 17)
        }
      } else {
        if (this.lastLinearTransform === 3) {
          edgeNodeMap[16] = [1, 2] // AR
          edgeNodeMap[17] = [2, 7] // AT
          untakenEdges.push(16, 17)
        }
        if (this.lastLinearTransform === 5) {
          edgeNodeMap[16] = [1, 2] // AR
          edgeNodeMap[17] = [1, 8] // ER
          edgeNodeMap[18] = [2, 7] // AT
          edgeNodeMap[19] = [7, 8] // ET
          edgeNodeMap[20] = [8, 13] // EV
          untakenEdges.push(16, [17, 18], 19, 20);
        }
        if (this.lastLinearTransform === 2) {
          edgeNodeMap[16] = [7, 14] // IT
          edgeNodeMap[17] = [13, 14] // IV
          edgeNodeMap[18] = [13, 20] // MV
          edgeNodeMap[19] = [14, 19] // IX
          edgeNodeMap[20] = [19, 20] // MX
          untakenEdges.push(16, 17, [18, 19], 20);
        }
        if (this.lastLinearTransform === 6) {
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
      const takenEdges = this.shuffle(untakenEdges).slice(0, numEdges);

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
    generateInstance() {
      // 1. generate graph from the preconfigured template
      const attempts = 100;
      let g = undefined;
      for (let i = 0; i < attempts; i++) {
        let w = this.determineWeights();
        if (w !== undefined) {
          g = this.graphFromWeights(w);
          // this.printGraph(g);
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
      let transform = this.lastLinearTransform;
      while (transform === this.lastLinearTransform) {
        transform = Math.floor(8 * JSAV.utils.rand.random());
      }
      this.lastLinearTransform = transform;
      let linearMap = this.linearTransform(transform, vertexLayout);


      // 3. remap edges.
      // Get a random permutation of *indices*.
      // Randomly decide to place the core component on the left
      // or the right, 50% chance for each.
      let left = JSAV.utils.rand.random() < 0.5;
      let newGraph = this.remapEdges(g, linearMap, left);
      let roleMap = this.inverseMap(linearMap);
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

      // this.printGraph(newGraph);

      // 4. randomize vertex labels except A, which is always the start node.
      let randomMap = this.shuffle((left) ? leftLayout : rightLayout);
      let indexOfA = randomMap.indexOf(0);
      this.swapIndices(randomMap, startIndex, indexOfA);

      this.relabelVertices(newGraph, randomMap);

      newGraph = this.addDisconnectedEdges(newGraph, left);
      // this.printGraph(newGraph);
      let packedRoleMap = {};
      for (let i = 0; i < newGraph.vertexLabels.length; i++) {
        packedRoleMap[newGraph.vertexLabels[i]] = roleMap[i];
      }

      this.debugPrint("Role map:\n", packedRoleMap);

      return { 'graph': newGraph,
              'roleMap': packedRoleMap,
              'startIndex': startIndex }
    }

    debugPrint(x) {
      if (this.debug) {
        console.log(x);
      }
    }

  } // class DijkstraInstanceGenerator
