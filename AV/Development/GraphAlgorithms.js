/* Common code for graph algorithms exercises */

/**
 * Creates a legend box which explains the edge colors.
 * This is used for both the student's view and the model answer.
 *
 * @param {JSAV} av A JSAV algorithm visualization template
 * @param {number} x Location: pixels from left in *av*
 * @param {number} y Location: pixels from top in *av*
 * @param {function(string)} interpret A JSAV interpreter function
 *
 * Note: This function uses the JSAV graphics API to produce a legend.
 * It seems the correct way to be able to draw a legend also a model answer.
 * However, JSAV graphics API uses the Raphaël library to produce SVG, which
 * means that all JSAV graphics API calls will end up in a single SVG element
 * over the .jsavcanvas <div>. This means that if one wants to position the
 * legend relative to some other element in the JSAV exercise, they need to
 * compute the absolute coordinates for the legend. That, in other hand, can
 * be done by calling the .bounds() method for an already created JSAV element.
 *
 * Example from PrimAVPE-scaffolded-v2.js:
 *
 * const minheap = jsav.ds.binarytree({relativeTo: $(".flexcontainer"),
 *                 left: -180, top: 140});
 * const minheapBox = minheap.bounds();
 * createLegend(jsav, minheapBox.left + minheapBox.width + 20,
 *                    minheapBox.top + 1, interpret);
 */
function createLegend(av, x, y, interpret) {
  // Center on a pixel to produce crisp edges
  const xAdjusted = Math.floor(x) + 0.5;
  const yAdjusted = Math.floor(y) + 0.5;
  const width = 250; // pixels
  const height = 250; // pixels
  av.g.rect(xAdjusted, yAdjusted, width, height, {
    "stroke-width": 1,
    fill: "white"
  }).addClass("legendbox");
  av.label(interpret("legend"), {left: xAdjusted + 100, top: yAdjusted - 35});

  const hpos = [26, 76, 90]; // line start, line end, text start (pixels)
  const vpos = [30, 80, 130]; // vertical position for each three edge types
  const edgeClass = ["legend-edge", "legend-fringe", "legend-spanning"];
  const edgeText = ["legend_unvisited", "legend_fringe",
                    "legend_spanning_tree"];
  const textvadjust = -22;
  for (let i = 0; i < 3; i++) {
    av.g.line(xAdjusted + hpos[0], yAdjusted + vpos[i],
              xAdjusted + hpos[1], yAdjusted + vpos[i]).addClass(edgeClass[i]);
    av.label(interpret(edgeText[i]), {left: xAdjusted + hpos[2],
                                      top: yAdjusted + vpos[i] + textvadjust,
                                      "text-align": "center"})
      .addClass("legendtext");
  }
  av.g.circle(xAdjusted + 51, yAdjusted + 201, 22);
  av.label("5<br>C (B)", {left: xAdjusted + 35, top: yAdjusted + 166})
    .addClass("legendtext")
    .addClass("textcentering");
  av.label(interpret("node_explanation"),
           {left: xAdjusted + hpos[2], top: yAdjusted + 166})
    .addClass("legendtext");
}

/**
 * Function to create and display an adjacency list representation of a graph.
 * Uses JSAV pseudocode API.
 * @param {Object} nlGraph - neighbour list representation of a graph as returned by
 * function generatePlanarGraphNl from file graphUtils.js
 * @param {JSAV_object} jsav - the JSAV instance to which the neighbour list will be added
 * @param {Object} options - options that will be passed to JSAV method code that displays
 * the adjacency list as pseudo code, defaults to blank
 *
 *@returns {JSAV_pseudocode_object} the created pseudo code object displaying the neighbour list
 */
function createAdjacencyList(nlGraph, jsav, options = {}) {
  const neighbourLists = nlGraph.edges;

  function idxToLetter(idx) {
    return String.fromCharCode("A".charCodeAt(0) + idx);
  }

  const codeLinesArr = neighbourLists.map((nlList, idx) => {
    const vertexLetter = idxToLetter(idx);

    // Neighbours in the list are in the form { v, weight },
    // where v is index of neighbour.
    const neighbours = nlList.map(neighbour => idxToLetter(neighbour.v));

    // Pseudo code line to represent neigbours of one vertex
    const codeLine = `${vertexLetter}: ${neighbours.join(" ")}`;
    return codeLine;
  });

  return jsav.code(codeLinesArr, options);
}
