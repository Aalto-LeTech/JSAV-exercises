/* Common code for graph algorithms exercises */


/**
 * Creates a legend box which explains the edge colors.
 * This is used for both the student's view and the model answer.
 * 
 * @param {JSAV} av A JSAV algorithm visualization template
 * @param {number} x Location: pixels from left in *av*
 * @param {number} y Location: pixels from top in *av*
 * @param {function(string)} interpret A JSAV interpreter function
 */
function createLegend(av, x, y, interpret) {
    // Center on a pixel to produce crisp edges
    x = Math.floor(x) + 0.5;
    y = Math.floor(y) + 0.5;
    const width = 250; // pixels
    const height = 250; // pixels
    av.g.rect(x, y, width, height, {
        "stroke-width": 1,
        fill: "white",
    }).addClass("legendbox");
    av.label(interpret("legend"), {left: x + 100, top: y - 35});

    const hpos = [26, 76, 90]; // line start, line end, text start (pixels)
    const vpos = [30, 80, 130]; // vertical position for each three edge types
    const edgeClass = ["legend-edge", "legend-fringe", "legend-spanning"];
    const edgeText = ["legend_unvisited", "legend_fringe", 
        "legend_spanning_tree"];
    const textvadjust = -22;
    for (let i = 0; i < 3; i++) {
        av.g.line(x + hpos[0], y + vpos[i],
                x + hpos[1], y + vpos[i]).addClass(edgeClass[i]);
        av.label(interpret(edgeText[i]), {left: x + hpos[2],
                top: y + vpos[i] + textvadjust,
                "text-align": "center"})
            .addClass("legendtext")            
    }
    av.g.circle(x + 51, y + 201, 22);    
    av.label("5<br>C (B)", {left: x + 35, top: y + 166})
        .addClass("legendtext")
        .addClass("textcentering");
    av.label(interpret("node_explanation"),
            {left: x + hpos[2], top: y + 166})
        .addClass("legendtext");
}