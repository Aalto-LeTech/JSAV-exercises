(function ($) {
  "use strict";
  var graph;
  var table;
  var minheap;
  var config = ODSA.UTILS.loadConfig(),
      interpret = config.interpreter,
      settings = config.getSettings();
  var jsav = new JSAV($('.avcontainer'), {settings: settings});
  var exerciseInstance;
  var heapsize = jsav.variable(0);
  var lastLinearTransform = -1;
  var debug = false;
  jsav.recorded();
  var exercise = jsav.exercise(model, init, {
    compare: [{ class: ["marked", "queued"] }],
    controls: $('.jsavexercisecontrols'),
    modelDialog: {width: "960px"},
    fix: fixState
  });
  exercise.reset();
  function init() {
    if (graph) {
      graph.clear();
    }
    const layoutSettings = {
      width: 700,
      height: 400,
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
    graph.nodes()[exerciseInstance.startIndex].addClass("marked");
    jsav.displayInit();
    return [graph, minheap];
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
      width: 700,
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
    const mintree = modeljsav.ds.binarytree();
    mintree.layout();
    modeljsav.displayInit();
    let indexOfLabel = {};
    for (let l of labelsAndIndices) {
      indexOfLabel[l[0]] = l[1];
    }
    dijkstra(modelNodes, distances, modeljsav, indexOfLabel, mintree);
    modeljsav.umsg(interpret("av_ms_shortest"));
    var modelEdges = modelGraph.edges();
    for (i = 0; i < modelGraph.edges().length; i++) {
      if (!modelEdges[i].hasClass("marked")) {
        modelEdges[i].hide();
      }
    }
    modeljsav.step();
    return [modelGraph, mintree];
  }
  function markEdge(edge, av) {
    edge.addClass("marked");
    edge.start().addClass("marked");
    edge.end().addClass("marked");
    if (av) {
      debugPrint("Model solution gradeable step: mark edge " +
       edge.start().value() + "-" + edge.end().value());
      av.gradeableStep();
    } else {
      debugPrint("Exercise gradeable step: mark edge " +
       edge.start().value() + "-" + edge.end().value());
      exercise.gradeableStep();
    }
  }
  function dijkstra(nodes, distances, av, indexOfLabel, mintree) {
    var modelheapsize = 0;
    const aNode = nodes[indexOfLabel["A"]];
    av.umsg(interpret("av_ms_select_a"));
    av.step();
    aNode.neighbors().forEach(node => visitNeighbour(aNode, node, 0));
    while (modelheapsize > 0) {
      const rootVal = deleteRoot();
      const dist = Number(rootVal.match(/\d+/)[0])
      const label = rootVal.charAt(rootVal.length - 5);
      const dstNode = nodes[indexOfLabel[label]];
      const dstIndex = dstNode.value().charCodeAt(0) - "A".charCodeAt(0);
      const srcNode = nodes[indexOfLabel[distances.value(dstIndex, 2)]]
      const edge = dstNode.edgeFrom(srcNode) ?? dstNode.edgeTo(srcNode);
      av.umsg(interpret("av_ms_add_edge"),
              {fill: {from: srcNode.value(), to: dstNode.value()}});
      edge.removeClass("queued");
      if (!edge.hasClass("marked")) {
        markEdge(edge, av);
      }
      const neighbours = dstNode.neighbors().filter(node =>
        !node.hasClass("marked"));
      debugPrint("Neighbours of " + dstNode.value() + " before sorting");
      sortNeighbours(neighbours);
      neighbours.forEach(node => visitNeighbour(dstNode, node, dist))
    }
    av.umsg(interpret("av_ms_unreachable"));
    av.step();
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
      edge.addClass("highlighted");
      node.addClass("highlighted");
      distances.addClass(node.value().charCodeAt(0) - "A".charCodeAt(0),
                         true, "highlighted");
      const treeNodeList = getTreeNodeList(mintree.root());
      const treeNode = treeNodeList.filter(treeNode =>
          treeNode.value().charAt(treeNode.value().length - 5)
          === node.value())[0];
      if (treeNode) {
        treeNode.addClass("highlighted")
      }
    }
    function removeHighlight(edge, node) {
      edge.removeClass("highlighted");
      node.removeClass("highlighted");
      distances.removeClass(node.value().charCodeAt(0) - "A".charCodeAt(0),
                         true, "highlighted")
      const treeNodeList = getTreeNodeList(mintree.root());
      const treeNode = treeNodeList.filter(treeNode =>
        treeNode.value().charAt(treeNode.value().length - 5)
        === node.value())[0];
      if (treeNode) {
        treeNode.removeClass("highlighted")
      }
    }
    function getDistance(index) {
      var dist = parseInt(distances.value(index, 1), 10);
      if (isNaN(dist)) {
        dist = Infinity;
      }
      return dist;
    }
    function deleteRoot () {
      if (!mintree.root() || modelheapsize <= 0) {
        return;
      }
      modelheapsize -= 1;
      const ret = mintree.root().value();
      const nodeLabel = ret.charAt(ret.length - 5)
      distances.addClass(nodeLabel.charCodeAt(0) - "A".charCodeAt(0), true, "unused")
      av.umsg(interpret("av_ms_select_node"),
              {fill: {node: nodeLabel}});
      av.step();
      const parentLast = findParent(modelheapsize, mintree);
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
    function initialNode(src, dst) {
      const edge = src.edgeTo(dst) ?? src.edgeFrom(dst);
      edge.addClass("queued")
      const dstIndex = dst.value().charCodeAt(0) - "A".charCodeAt(0);
      distances.value(dstIndex, 1, edge._weight);
      distances.value(dstIndex, 2, src.value());
      modelheapsize += 1;
      const label = edge._weight + "<br>" + dst.value() + " (" + src.value() + ")";
      mintree.root(label)
      av.umsg(interpret("av_ms_update_distances"), {fill: {node: src.value()}})
      av.step()
    }
    function updateTable (dst, src, distance) {
      const dstIndex = dst.value().charCodeAt(0) - "A".charCodeAt(0);
      debugPrint("ADD:", dst.value(), distance, src.value())
      distances.value(dstIndex, 1, distance)
      distances.value(dstIndex, 2, src.value())
    }
    function visitNeighbour (src, neighbour, srcDist) {
      debugPrint("visitNeighbour: src = " + src.value() + ", neighbour = " +
        neighbour.value());
      const edge = src.edgeTo(neighbour) ?? src.edgeFrom(neighbour);
      const neighbourIndex = neighbour.value().charCodeAt(0) - "A".charCodeAt(0);
      const currNeighbourDist = getDistance(neighbourIndex);
      const distViaSrc = srcDist + edge._weight;
      if (currNeighbourDist === Infinity) {
        addNode(src.value(), neighbour.value(), distViaSrc);
        updateTable(neighbour, src, distViaSrc);
        debugPrint("Model solution gradeable step: ADD ROUTE WITH DIST:",
          distViaSrc + neighbour.value());
        av.umsg(interpret("av_ms_visit_neighbor_add"),
                {fill: {node: src.value(), neighbor: neighbour.value()}});
        highlight(edge, neighbour);
        av.gradeableStep();
      } else if (distViaSrc < currNeighbourDist) {
        updateNode(src.value(), neighbour.value(), distViaSrc);
        updateTable(neighbour, src, distViaSrc);
        debugPrint("Model solution gradeable step:  UPDATE DISTANCE TO:",
         distViaSrc + neighbour.value());
        av.umsg(interpret("av_ms_visit_neighbor_update"),
                {fill: {node: src.value(), neighbor: neighbour.value()}});
        highlight(edge, neighbour);
        av.gradeableStep();
      } else {
        debugPrint("KEEP DISTANCE THE SAME:",
                        currNeighbourDist + neighbour.value())
        av.umsg(interpret("av_ms_visit_neighbor_no_action"),
                {fill: {node: src.value(), neighbor: neighbour.value()}});
                highlight(edge, neighbour);
        av.step();
      }
      removeHighlight(edge, neighbour);
    }
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
      const srcNode = nodes.filter(node =>
          node.element[0].getAttribute("data-value") === srcLabel)[0];
      const dstNode = nodes.filter(node =>
          node.element[0].getAttribute("data-value") === dstLabel)[0];
      const edge = dstNode.edgeFrom(srcNode) ?? dstNode.edgeTo(srcNode);
      edge.addClass("queued")
      mintree.layout();
    }
    function updateNode(srcLabel, dstLabel, distance) {
      const label = distance + "<br>" + dstLabel + " (" + srcLabel + ")"
      const nodeArr = getTreeNodeList(mintree.root())
      const updatedNode = nodeArr.filter(node =>
              node.value().charAt(node.value().length - 5) === dstLabel)[0];
      if (!updatedNode) {
        return;
      }
      debugPrint("UPDATE:", updatedNode.value(), "TO:", distance + label);
      const srcNode = nodes.filter(node =>
          node.element[0].getAttribute("data-value") === srcLabel)[0];
      const dstNode = nodes.filter(node =>
          node.element[0].getAttribute("data-value") === dstLabel)[0];
      const edge = dstNode.edgeFrom(srcNode) ?? dstNode.edgeTo(srcNode)
      edge.addClass("queued")
      const oldLabel = updatedNode.value();
      const oldSrcLabel = oldLabel.charAt(oldLabel.length - 2);
      const oldSrcNode = nodes.filter(node =>
          node.element[0].getAttribute("data-value") === oldSrcLabel)[0];
      const oldEdge = dstNode.edgeFrom(oldSrcNode) ?? dstNode.edgeTo(oldSrcNode)
      oldEdge.removeClass("queued");
      updatedNode.value(label);
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
  function findColByNode (nodeLabel) {
    for (var i = 1; i < 25; i++) {
      if (nodeLabel === table.value(0, i)) {
        return i;
      }
    }
  }
  function isMarked (node) {
    return node.element[0].classList.contains("marked")
  }
  function getTreeNodeList (node, arr) {
    var nodeArr = arr || [];
    if (node) {
      nodeArr.push(node);
      nodeArr = getTreeNodeList(node.left(), nodeArr);
      nodeArr = getTreeNodeList(node.right(), nodeArr);
    }
    return nodeArr;
  }
  function getUpdatedDistance (srcLabel, pathWeight) {
    const srcIndex = findColByNode(srcLabel);
    const srcDist = Number(table.value(1, srcIndex))
    return isNaN(srcDist) ? pathWeight : (pathWeight + srcDist)
  }
  function updateTable (srcLabel, dstLabel, newDist) {
    const dstIndex = findColByNode(dstLabel);
    table.value(1, dstIndex, newDist)
    table.value(2, dstIndex, srcLabel)
  }
  function enqueueClicked (event) {
    const srcLabel = event.data.srcLabel;
    const dstLabel = event.data.dstLabel;
    const newDist = event.data.newDist;
    const popup = event.data.popup;
    debugPrint(event.data.edge)
    event.data.edge.addClass("queued");
    window.JSAVrecorder.appendAnimationEventFields(
      {
        "pqOperation": "enqueue",
        "pqIn": window.JSAVrecorder.jsavObjectToJaalID(event.data.edge, "Edge")
      });
    updateTable(srcLabel, dstLabel, newDist);
    insertMinheap(srcLabel, dstLabel, newDist);
    debugPrint("Exercise gradeable step: enqueue edge " + srcLabel + "-" +
      dstLabel + " distance " + newDist);
    exercise.gradeableStep();
    popup.close();
  }
  function updateClicked (event) {
    const srcLabel = event.data.srcLabel;
    const dstLabel = event.data.dstLabel;
    const newDist = event.data.newDist;
    const popup = event.data.popup;
    const nodeArr = getTreeNodeList(minheap.root())
    const updatedNode = nodeArr.filter(node =>
            node.value().charAt(node.value().length - 5) === dstLabel)[0];
    if (!updatedNode) {
      popup.close();
      return;
    }
    updateTable(srcLabel, dstLabel, newDist);
    event.data.edge.addClass("queued")
    const oldLabel = updatedNode.value();
    const oldSrcLabel = oldLabel.charAt(oldLabel.length - 2);
    const oldNode = graph.nodes().filter(node =>
        node.element[0].getAttribute("data-value") === oldSrcLabel)[0];
    const dstNode = graph.nodes().filter(node =>
        node.element[0].getAttribute("data-value") === dstLabel)[0];
    const oldEdge = graph.getEdge(oldNode, dstNode)
              ?? graph.getEdge(dstNode, oldNode);
    oldEdge.removeClass("queued")
    window.JSAVrecorder.appendAnimationEventFields(
      {
        "pqOperation": "update",
        "pqIn": window.JSAVrecorder.jsavObjectToJaalID(event.data.edge, "Edge"),
        "pqOut": window.JSAVrecorder.jsavObjectToJaalID(oldEdge, "Edge")
      });
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
    exercise.gradeableStep();
    popup.close();
  }
  function edgeClicked () {
    const edge = $(this).data("edge");
    const that = $(this);
    const node1id = that[0].getAttribute("data-startnode");
    const node2id = that[0].getAttribute("data-endnode");
    const node1 = $("#" + node1id).data("node");
    const node2 = $("#" + node2id).data("node");
    const src = isMarked(node1) ? node1 : node2;
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
    const label = newDist + dstLabel;
    const options = {
      "title": interpret("edge") + " " + ((srcLabel < dstLabel)
                                          ? (srcLabel + dstLabel)
                                          : (dstLabel + srcLabel)),
      "width": "200px",
      "dialongRootElement": $(this)
    }
    const html = "<button type='button' id='enqueueButton'>"
                 + interpret("#enqueue") + ": " + label
                 + "</button> <br> <button type='button'"
                 + "id='updateButton'>" + interpret("#update") + ": "
                 + label +"</button>";
    const popup = JSAV.utils.dialog(html, options);
    $("#enqueueButton").click({srcLabel, dstLabel, newDist, popup, edge},
                              enqueueClicked);
    $("#updateButton").click({srcLabel, dstLabel, newDist, popup, edge},
                              updateClicked);
  }
  function addEdgeClickListeners() {
    $(".jsavgraph").on("click", ".jsavedge", edgeClicked);
  }
  $(".jsavcontainer").on("click", ".jsavnode", function () {
    window.alert("Please, click on the edges, not the nodes.");
  });
  $("input[name='answer']").on("click", function () {
    debugPrint("Answer button clicked");
    $(".jsavbinarytree").css("margin-top", "34px");
    $(".jsavmatrix").css("margin-top", "34px");
    $(".jsavcanvas").css("min-height", "910px");
    $(".jsavmodelanswer .jsavcanvas").css("min-height", "770px");
  })
  $("#about").click(about);
  function randomInt(a, b) {
    return Math.floor(JSAV.utils.rand.random() * (b - a + 1)) + 1
  }
  function determineWeights() {
    function rnd(x) {
      return Math.floor(JSAV.utils.rand.random() * x) + 1;
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
      k = Math.floor((j + 1) * JSAV.utils.rand.random());
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
    if (left) {
      for (let i = 0; i < newGraph.edges.length; i++) {
        let offset = 2 * Math.floor(i/4);
        for (let e of newGraph.edges[i]) {
          let newIndex = e[0] + (2 * Math.floor(e[0]/4));
          paddedGraph.edges[i + offset].push([newIndex, e[1]])
        }
      }
    } else {
      for (let i = 0; i < newGraph.edges.length; i++) {
        let offset = (i%4) ? 2 * (Math.ceil(i/4)) : 2 * (Math.ceil(i/4) + 1);
        for (let e of newGraph.edges[i]) {
          let off = (e[0]%4) ? Math.ceil(e[0]/4) : Math.ceil(e[0]/4) + 1;
          let newIndex = e[0] + 2 * off;
          paddedGraph.edges[i + offset].push([newIndex, e[1]])
        }
      }
    }
    return paddedGraph;
  }
  function relabelVertices(graph, vertexMap) {
    let a = [];
    for (let i = 0; i < graph.vertexLabels.length; i++) {
      a.push(graph.vertexLabels[vertexMap[i]]);
    }
    graph.vertexLabels = a;
  }
  function addDisconnectedEdges(graph, leftSide) {
    const edgeNodeMap = {
      0: [0, 1],
      1: [0, 6],
      2: [1, 7],
      3: [6, 7],
      4: [6, 12],
      5: [7, 13],
      6: [12, 13],
      7: [12, 18],
      8: [13, 19],
      9: [18, 19],
      10: [0, 7],
      11: [1, 6],
      12: [6, 13],
      13: [7, 12],
      14: [12, 19],
      15: [13, 18],
    }
    let untakenEdges = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
                        [10,11], [12,13], [14,15]];
    if (leftSide) {
      if (lastLinearTransform === 1) {
        edgeNodeMap[16] = [16, 21]
        edgeNodeMap[17] = [21, 22]
        untakenEdges.push(16, 17)
      }
      if (lastLinearTransform === 4) {
        edgeNodeMap[16] = [10, 15]
        edgeNodeMap[17] = [15, 16]
        edgeNodeMap[18] = [15, 22]
        edgeNodeMap[19] = [16, 21]
        edgeNodeMap[20] = [21, 22]
        untakenEdges.push(16, 17, [18, 19], 20);
      }
      if (lastLinearTransform === 0) {
        edgeNodeMap[16] = [3, 4]
        edgeNodeMap[17] = [3, 10]
        edgeNodeMap[18] = [4, 9]
        edgeNodeMap[19] = [9, 10]
        edgeNodeMap[20] = [9, 16]
        untakenEdges.push(16, [17, 18], 19, 20);
      }
      if (lastLinearTransform === 7) {
        edgeNodeMap[16] = [3, 4]
        edgeNodeMap[17] = [3, 10]
        untakenEdges.push(16, 17)
      }
    } else {
      if (lastLinearTransform === 3) {
        edgeNodeMap[16] = [1, 2]
        edgeNodeMap[17] = [2, 7]
        untakenEdges.push(16, 17)
      }
      if (lastLinearTransform === 5) {
        edgeNodeMap[16] = [1, 2]
        edgeNodeMap[17] = [1, 8]
        edgeNodeMap[18] = [2, 7]
        edgeNodeMap[19] = [7, 8]
        edgeNodeMap[20] = [8, 13]
        untakenEdges.push(16, [17, 18], 19, 20);
      }
      if (lastLinearTransform === 2) {
        edgeNodeMap[16] = [7, 14]
        edgeNodeMap[17] = [13, 14]
        edgeNodeMap[18] = [13, 20]
        edgeNodeMap[19] = [14, 19]
        edgeNodeMap[20] = [19, 20]
        untakenEdges.push(16, 17, [18, 19], 20);
      }
      if (lastLinearTransform === 6) {
        edgeNodeMap[16] = [13, 20]
        edgeNodeMap[17] = [19, 20]
        untakenEdges.push(16, 17)
      }
    }
    for (let i = 0; i < untakenEdges.length; i++) {
      if (Array.isArray(untakenEdges[i])) {
        untakenEdges[i] = untakenEdges[i][Math.round(JSAV.utils.rand.random())]
      }
    }
    const numEdges = Math.ceil(untakenEdges.length / 2);
    const takenEdges = shuffle(untakenEdges).slice(0, numEdges);
    for (i = 0; i < takenEdges.length; i++) {
      const nodes = edgeNodeMap[takenEdges[i]];
      const weight = Math.round(JSAV.utils.rand.random()*8) + 1;
      const offset = (takenEdges[i] < 16 && leftSide) ? 4 : 0;
      const src = nodes[0] + offset;
      const dst = nodes[1] + offset;
      graph.edges[src].push([dst, weight]);
      graph.edges[dst].push([src, weight]);
    }
    return graph;
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
      transform = Math.floor(8 * JSAV.utils.rand.random());
    }
    lastLinearTransform = transform;
    let linearMap = linearTransform(transform, vertexLayout);
    let left = JSAV.utils.rand.random() < 0.5;
    let newGraph = remapEdges(g, linearMap, left);
    let roleMap = inverseMap(linearMap);
    const leftLayout = [0, 1, 2, 3, 16, 17,
                        4, 5, 6, 7, 18, 19,
                        8, 9, 10, 11, 20, 21,
                        12, 13, 14, 15, 22, 23]
    const rightLayout = [16, 17, 0, 1, 2, 3,
                        18, 19, 4, 5, 6, 7,
                        20, 21, 8, 9, 10, 11,
                        22, 23, 12, 13, 14, 15]
    const startIndex = (left) ? leftLayout.indexOf(roleMap.indexOf(0))
                              : rightLayout.indexOf(roleMap.indexOf(0))
    let randomMap = shuffle((left) ? leftLayout : rightLayout);
    let indexOfA = randomMap.indexOf(0);
    swapIndices(randomMap, startIndex, indexOfA);
    relabelVertices(newGraph, randomMap);
    newGraph = addDisconnectedEdges(newGraph, left);
    let packedRoleMap = {};
    for (let i = 0; i < newGraph.vertexLabels.length; i++) {
      packedRoleMap[newGraph.vertexLabels[i]] = roleMap[i];
    }
    debugPrint("Role map:\n", packedRoleMap)
    return { 'graph': newGraph,
            'roleMap': packedRoleMap,
            'startIndex': startIndex }
  }
  function researchInstanceToJsav(riGraph, jsavGraph, layoutSettings) {
    const gridStepX = Math.floor(layoutSettings.width / 6);
    const gridStepY = Math.floor(layoutSettings.height / 4);
    function rnd(x) {
      return Math.floor(JSAV.utils.rand.random() * (2 * x + 1))
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
    addEdgeClickListeners();
  }
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
                           relativeTo: $(".jsavbinarytree"),
                           myAnchor: "center top",
                           top: "150px"});
  }
  function addMinheap () {
    if (minheap) {
      minheap.clear();
      $(".prioqueue").remove();
      $(".bintree").remove();
    }
    heapsize = heapsize.value(0);
    $(".jsavcanvas").append("<div class='prioqueue'><strong>"
        + interpret("priority_queue")
        + "</strong></div><div class='bintree'></div>");
    minheap = jsav.ds.binarytree({relativeTo: $(".bintree"),
                                  myAnchor: "center center"});
    minheap.layout()
    const html = "<button type='button' id='removeButton'>"+ interpret("#dequeue") +"</button>";
    $(".jsavtree").append(html)
    $("#removeButton").css({"float": "right",
                            "position": "relative",
                            "margin": "1em"});
    $("#removeButton").click(function() {
      const deleted = minheapDelete(0);
      if (!deleted) {
        return;
      }
      const nodeLabel = deleted.charAt(deleted.length - 5);
      const node = graph.nodes().filter(node =>
          node.element[0].getAttribute("data-value") === nodeLabel)[0];
      const srcLabel = deleted.charAt(deleted.length - 2);
      const srcNode = graph.nodes().filter(node =>
          node.element[0].getAttribute("data-value") === srcLabel)[0];
      const edge = graph.getEdge(node, srcNode) ?? graph.getEdge(srcNode, node);
      edge.removeClass("queued")
      window.JSAVrecorder.appendAnimationEventFields(
        {
          "pqOperation": "dequeue",
          "pqOut": window.JSAVrecorder.jsavObjectToJaalID(edge, "Edge")
        });
      if (!edge.hasClass("marked")) {
        markEdge(edge);
      }
      minheap.layout();
    })
  }
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
    var node = newNode;
    while (i > 0 && extractDistance(node.parent()) > distance) {
      node.value(node.parent().value());
      i = Math.floor((i-1)/2);
      node.parent().value(label);
      node = node.parent();
    }
    minheap.layout();
  }
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
  function minheapDelete(index) {
    if (heapsize.value() === 0) {
      return
    }
    heapsize.value(heapsize.value() - 1);
    const ret = (index === 0) ? minheap.root().value() : minheap.root().value();
    const parentLast = findParent(heapsize.value(), minheap);
    const lastNode = (heapsize.value() % 2 === 1) ? parentLast.left()
                                                  : parentLast.right();
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
  function extractDistance (node) {
    return Number(node.value().match(/\d+/)[0])
  }
  function debugPrint(x) {
    if (debug) {
      console.log(x);
    }
  }
}(jQuery));
