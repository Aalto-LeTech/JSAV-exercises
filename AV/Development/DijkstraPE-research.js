(function ($) {
  "use strict";
  var exercise,
      graph,
      config = ODSA.UTILS.loadConfig(),
      interpret = config.interpreter,
      settings = config.getSettings(),
      jsav = new JSAV($('.avcontainer'), {settings: settings}),
      exerciseInstance,
      lastLinearTransform = -1,
      debug = false;
  jsav.recorded();
  function init() {
    if (graph) {
      graph.clear();
    }
    const layoutSettings = {
      width: 500,
      height: 400,
      layout: "manual",
      directed: false
    }
    graph = jsav.ds.graph(layoutSettings);
    exerciseInstance = generateInstance();
    researchInstanceToJsav(exerciseInstance.graph, graph, layoutSettings);
    graph.layout();
    graph.nodes()[exerciseInstance.startIndex].addClass("marked");
    jsav.displayInit();
    return graph;
  }
  function fixState(modelGraph) {
    var graphEdges = graph.edges(),
        modelEdges = modelGraph.edges();
    for (var i = 0; i < graphEdges.length; i++) {
      var edge = graphEdges[i],
          modelEdge = modelEdges[i];
      if (modelEdge.hasClass("marked") && !edge.hasClass("marked")) {
        markEdge(edge);
        break;
      }
    }
  }
  function model(modeljsav) {
    var i,
        graphNodes = graph.nodes();
    var modelGraph = modeljsav.ds.graph({
      width: 500,
      height: 400,
      layout: "automatic",
      directed: false
    });
    graphUtils.copy(graph, modelGraph, {weights: true});
    var modelNodes = modelGraph.nodes();
    let labelsAndIndices = [];
    for (i = 0; i < graphNodes.length; i++) {
      labelsAndIndices.push([graphNodes[i].value(), i]);
    }
    labelsAndIndices.sort();
    var distanceMatrixValues = [];
    for (i = 0; i < graphNodes.length; i++) {
      distanceMatrixValues.push([labelsAndIndices[i][0], "∞", "-"]);
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
    modelNodes[exerciseInstance.startIndex].addClass("marked");
    modeljsav.displayInit();
    let indexOfLabel = {};
    for (let l of labelsAndIndices) {
      indexOfLabel[l[0]] = l[1];
    }
    dijkstra(modelNodes, distances, modeljsav, indexOfLabel);
    modeljsav.umsg(interpret("av_ms_shortest"));
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
  function dijkstra(nodes, distances, av, indexOfLabel) {
    function getDistance(index) {
      var dist = parseInt(distances.value(index, 1), 10);
      if (isNaN(dist)) {
        dist = Infinity;
      }
      return dist;
    }
    for (let counter = 0; counter < 30; counter++) {
      var min = Infinity,
          nodeIndex = -1;
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
        av.umsg(interpret("av_ms_unreachable"));
        av.step();
        break;
      }
      let node = nodes[indexOfLabel[String.fromCharCode(65 + nodeIndex)]];
      if (!node) { break; }
      distances.addClass(nodeIndex, true, "unused");
      debugPrint("Dijkstra: select node " + node.value());
      if (nodeIndex === 0) {
        av.umsg(interpret("av_ms_select_a"));
      } else {
        av.umsg(interpret("av_ms_select_node"), {fill: {node: node.value()}});
      }
      av.step();
      let prevLabel = distances.value(nodeIndex, 2);
      if (prevLabel !== "-") {
        let prevNode = nodes[indexOfLabel[prevLabel]]
        av.umsg(interpret("av_ms_add_edge"),
          { fill: {from: prevNode.value(), to: node.value()}});
        markEdge(prevNode.edgeTo(node), av);
        debugPrint("Add edge: " + prevNode.value() + "-" + node.value());
      }
      let neighbors = node.neighbors();
      while (neighbors.hasNext()) {
        let neighbor = neighbors.next();
        let neighborIndex = neighbor.value().charCodeAt(0) - "A".charCodeAt(0);
        let nodeIndex = node.value().charCodeAt(0) - "A".charCodeAt(0);
        let d = getDistance(neighborIndex);
        let dThroughNode = getDistance(nodeIndex) +
              node.edgeTo(neighbor).weight();
        debugPrint("Neighbor: " + neighbor.value() + " distance: " + d);
        if (!distances.hasClass(neighborIndex, true, "unused") && d > dThroughNode) {
          distances.value(neighborIndex, 1, dThroughNode);
          distances.value(neighborIndex, 2, node.value());
        }
      }
      av.umsg(interpret("av_ms_update_distances"), {fill: {node: node.value()}});
      av.step();
    }
  }
  function logDistanceMatrix(distances) {
    debugPrint("Distance matrix");
    debugPrint("Label distance previous unused");
    for (let i = 0; i < distances._arrays.length; i++) {
      let row = [...distances._arrays[i]._values];
      row.push(distances.hasClass(i, true, "unused"))
      debugPrint(row.join("  "));
    }
  }
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
   function randomInt(a, b) {
     return Math.floor(Math.random() * (b - a + 1)) + 1
   }
   function determineWeights() {
     function rnd(x) {
       return Math.floor(Math.random() * x) + 1;
     }
     let a = rnd(6);
     let b = rnd(6);
     let c = b + rnd(5);
     let d = c + rnd(5);
     let e = d - c + rnd(5);
     let f = e + rnd(5);
     let g = c + f - d + rnd(5);
     let h = g + rnd(5);
     let o = d + h - (c + f) + rnd(5);
     let m = c + f + o - (d + h) + rnd(5);
     let q = d + h + m - (c + f + o) + rnd(5);
     let p = c + f + o + q - (d + h) + rnd(5);
     let r = rnd(9);
     let k = f - e + rnd(5);
     let l = d + h - (c + f) + rnd(5);
     let n = f + o - e + rnd(5);
     let i = h - g + rnd(5);
     let j = h + m - g + rnd(5);
     let s = rnd(9);
     let path_weights = [
       a,
       a + b,
       a + c,
       a + d,
       a + c + e,
       a + c + f,
       a + d + g,
       a + d + h,
       a + c + f + o,
       a + d + h + m,
       a + c + f + o + q,
       a + d + h + p,
       a + d + h + p + r,
     ]
     for (let ind = 1; ind < path_weights.length; ind++) {
       if (path_weights[ind - 1] >= path_weights[ind]) {
         return undefined;
       }
     }
     let pass = (
       (f < e + k) &&
       (d + h < c + f + l) &&
       (f + o < e + n) &&
       (h < g + i) &&
       (n + m < g + j)
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
   function graphFromWeights(w) {
     const vertexCount = 16;
     const vertexLabels = ['A', 'B', 'C', 'D',
                           'E', 'F', 'G', 'H',
                           'I', 'J', 'K', 'L',
                           'M', 'N', 'O', 'P'];
     let g = {
       vertexLabels: vertexLabels,
       edges: new Array(vertexCount)
     }
     for (let i = 0; i < vertexCount; i++) {
       g.edges[i] = [];
     }
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
   function linearTransform(t, sourceArray) {
     if (sourceArray.length != 16) {
       throw "Length of sourceArray must be 16."
     }
     const transformation = [
       [ 0, 1 , 2 , 3,
         4, 5, 6, 7,
         8, 9, 10, 11,
        12, 13, 14, 15],
       [ 3, 7, 11, 15,
         2, 6, 10, 14,
         1, 5, 9, 13,
         0, 4, 8, 12],
       [15, 14, 13, 12,
        11, 10, 9, 8,
         7, 6, 5, 4,
         3, 2, 1, 0],
       [12, 8 , 4 , 0,
        13, 9, 5, 1,
        14, 10, 6, 2,
        15, 11, 7, 3],
       [12, 13, 14, 15,
         8, 9, 10, 11,
         4, 5, 6, 7,
         0, 1, 2, 3],
       [ 3, 2 , 1 , 0,
         7, 6, 5, 4,
        11, 10, 9, 8,
        15, 14, 13, 12],
       [ 0, 4, 8, 12,
         1, 5, 9, 13,
         2, 6, 10, 14,
         3, 7, 11, 15],
       [15, 11, 7, 3,
        14, 10, 6, 2,
        13, 9, 5, 1,
        12, 8, 4, 0]
     ]
     let transformedArray = new Array(sourceArray.length);
     for (let i = 0; i < sourceArray.length; i++) {
       transformedArray[i] = sourceArray[transformation[t][i]];
     }
     return transformedArray;
   }
   function swapIndices(A, i, j) {
     let tmp = A[i];
     A[i] = A[j];
     A[j] = tmp;
   }
   function shuffle(sourceArray) {
     if (sourceArray === undefined) {
       console.warn("shuffle(undefined)!")
       return;
     }
     let shuffled = [...sourceArray];
     let j, k, tmp;
     for (j = shuffled.length - 1; j > 0; j--) {
       k = Math.floor((j + 1) * Math.random());
       swapIndices(shuffled, j, k);
     }
     return shuffled;
   }
   function mockShuffle(sourceArray) {
     let shuffled = [...sourceArray];
     for (j = 1; j < shuffled.length; j += 2) {
       swapIndices(shuffled, j, j - 1);
     }
     return shuffled;
   }
   function permuteArray(a, mapping) {
     let newA = new Array(a.length);
     for (let i = 0; i < a.length; i++) {
       newA[i] = a[mapping[i]];
     }
     return newA;
   }
   function inverseMap(mapping) {
     let inverse = new Array(mapping.length);
     for (let i = 0; i < mapping.length; i++) {
       inverse[mapping[i]] = i;
     }
     return inverse;
   }
   function remapEdges(graph, vertexMap) {
     let newGraph = {
       vertexLabels: [...graph.vertexLabels],
       edges: new Array(vertexMap.length)
     }
     for (let i = 0; i < vertexMap.length; i++) {
       newGraph.edges[i] = [];
     }
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
   function relabelVertices(graph, vertexMap) {
     let a = [];
     for (let i = 0; i < graph.vertexLabels.length; i++) {
       a.push(graph.vertexLabels[vertexMap[i]]);
     }
     graph.vertexLabels = a;
   }
   function generateInstance() {
     const attempts = 100;
     let g = undefined;
     for (let i = 0; i < attempts; i++) {
       let w = determineWeights();
       if (w !== undefined) {
         g = graphFromWeights(w);
         break;
       }
     }
     const vertexLayout = [ 0, 1, 2, 3,
                            4, 5, 6, 7,
                            8, 9, 10, 11,
                           12, 13, 14, 15];
     let transform = lastLinearTransform;
     while (transform === lastLinearTransform) {
       transform = Math.floor(8 * Math.random());
     }
     lastLinearTransform = transform;
     let linearMap = linearTransform(transform, vertexLayout);
     let newGraph = remapEdges(g, linearMap);
     let roleMap = inverseMap(linearMap);
     const startIndex = roleMap.indexOf(0);
     let randomMap = shuffle(vertexLayout);
     let indexOfA = randomMap.indexOf(0);
     swapIndices(randomMap, startIndex, indexOfA);
     relabelVertices(newGraph, randomMap);
     let packedRoleMap = {};
     for (let i = 0; i < newGraph.vertexLabels.length; i++) {
       packedRoleMap[newGraph.vertexLabels[i]] = roleMap[i];
     }
     return { 'graph': newGraph,
              'roleMap': packedRoleMap,
              'startIndex': startIndex }
   }
   function researchInstanceToJsav(riGraph, jsavGraph, layoutSettings) {
     const gridStepX = Math.floor(layoutSettings.width / 4);
     const gridStepY = Math.floor(layoutSettings.height / 4);
     function rnd(x) {
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
     for (let i = 0; i < riGraph.edges.length; i++) {
       let label = riGraph.vertexLabels[i];
       jsavGraph.addNode(riGraph.vertexLabels[i], vertexCoordinates[i]);
     }
     const gNodes = jsavGraph.nodes();
     let options = {};
     for (let i = 0; i < riGraph.edges.length; i++) {
       for (let e of riGraph.edges[i]) {
         options.weight = e[1];
         jsavGraph.addEdge(gNodes[i], gNodes[e[0]], options);
       }
     }
   }
   function debugPrint(x) {
     if (debug) {
       console.log(x);
     }
   }
}(jQuery));
