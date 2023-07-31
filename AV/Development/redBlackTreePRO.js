/* global ODSA, ClickHandler */
(function ($) {
  "use strict";
  // AV variables
  var insertValues = [],
      tree,
      stack,
      insertSize = 10,
      clickHandler,
      highlighted,

      // Load the configurations created by odsaAV.js
      config = ODSA.UTILS.loadConfig({av_container: "jsavcontainer"}),
      interpret = config.interpreter,
      code = config.code,
      codeOptions = {after: {element: $(".code")}, visible: true, lineNumbers: false},

      // Create a JSAV instance
      av = new JSAV($("#jsavcontainer"));

  av.recorded(); // we are not recording an AV with an algorithm

  av.code(code, codeOptions);

  function initialize() {

    av.container.find(".jsavcanvas").css("min-height", 475);

    if (typeof clickHandler === "undefined") {
      clickHandler = new ClickHandler(av, exercise, {selectedClass: "selected", effect: "move"});
    }
    clickHandler.reset();
    
    // generate values
    insertValues = generateValues(insertSize, 10, 100); //No duplicates!
    if (stack) {
      clickHandler.remove(stack);
      stack.clear();
    }
    stack = av.ds.stack(insertValues, {center: true, element: $("#stackcontainer").append("<div></div>").find("div")});
    stack.layout();
    clickHandler.addList(stack, {
      select: "first",
      drop: "first",
      onSelect: function () {
        if (clickHandler.selNode) {
          clickHandler.selNode.removeClass("selected");
        }
      }
    });

    //clear old binary tree
    if (tree) {
      clickHandler.remove(tree);
      tree.clear();
    }
    //create binary tree
    tree = av.ds.rbtree({center: true, visible: true, nodegap: 5});
    tree.root().addClass("emptynode");
    tree.layout();
    clickHandler.addTree(tree, {
      onDrop: function () {
        this.removeClass("emptynode");
        this.addEmptyNodes();
        tree.layout();
      },
      onSelect: function () {
        //fake select the node
        if (clickHandler.selNode) {
          clickHandler.selNode.removeClass("selected");
          if (clickHandler.selNode === this) {
            //deselect
            clickHandler.selNode = null;
            return false;
          }
        }
        this.addClass("selected");
        clickHandler.selNode = this;
        return false;
      }
    });

    return tree;
  }

  function modelSolution(jsav) {
    var modelTree = jsav.ds.rbtree({center: true, visible: true, nodegap: 5});
    modelTree.root().addClass("emptynode");
    modelTree.layout();

    jsav._undo = [];

    for (var i = 0; i < insertSize; i++) {
      //find emptynode where the value will be inserted
      var node = modelTree.insert(insertValues[i]).removeClass("emptynode");
      node.addClass("highlighted");
      modelTree.addEmptyNodes();
      modelTree.layout();
      jsav.umsg(interpret("av_insert"));
      jsav.gradeableStep();
      // fix the tree by recoloring nodes and performing rotations
      if (repair(jsav, node, modelTree) !== false) {
        modelTree.layout();
        if (i === insertSize - 1) {
          jsav.gradeableStep();
        } else {
          jsav.step();
        }
        highlighted.removeClass("highlighted");
      }
      node.removeClass("highlighted");
    }

    return modelTree;
  }

  /**
   * This solution of RB-tree insertion is based on the solution in 
   * OpenDSA/DataStructures/redblacktree.js by Kasper Hellström
   * @param jsav the model answer jsav instance, needed to call step()
   * and umsg() on the model answer instance
   * @param node the node which needs to be repaired to maintain the 
   * RB-tree property
   * @param modelTree the model answer rb-tree jsav object. This is 
   * needed to call an update to the tree lay-out in insert_case5().
   * @returns true or false
   */
  function repair(jsav, node, modelTree) {
    return insert_case1(jsav, node, modelTree);
  };

  //Insert cases from Wikipedia:
  //http://en.wikipedia.org/wiki/Red-black_tree
  function insert_case1(jsav, node, modelTree) {
    highlighted = node;
    node.addClass("highlighted");
    if (!node.parent()) {
      jsav.umsg(interpret("av_root_black"));
      node.colorBlack();
    } else {
      return insert_case2(jsav, node, modelTree);
    }
  }

  function insert_case2(jsav, node, modelTree) {
    if (node.parent().isBlack()) {
      jsav.umsg(interpret("av_parent_black"));
      return false; //did nothing
    } else {
      insert_case3(jsav, node, modelTree);
    }
  }

  function insert_case3(jsav, node, modelTree) {
    var u = node.uncle();
    if (u && !u.hasClass("emptynode") && u.isRed()) {
      node.parent().colorBlack();
      u.colorBlack();
      var g = node.grandparent();
      g.colorRed();
      jsav.umsg(interpret("av_change_colours"));
      jsav.step();
      node.removeClass("highlighted");
      insert_case1(jsav, g, modelTree);
    } else {
      insert_case4(jsav, node, modelTree);
    }
  }

  function insert_case4(jsav, node, modelTree) {
    var g = node.grandparent();
    jsav.umsg(interpret("av_rotation_1"));
    jsav.step();
    if (node === node.parent().right() && node.parent() === g.left()) {
      node.parent().rotateLeft();
      insert_case5(jsav, node.left(), modelTree, true);
    } else if (node === node.parent().left() && node.parent() === g.right()) {
      node.parent().rotateRight();
      insert_case5(jsav, node.right(), modelTree, true);
    } else {
      insert_case5(jsav, node, modelTree);
    }
  }

  /**
   * Case 5 has an extra parameter: double. Double is true if we need to 
   * perform double rotation. Default is false. This is because double
   * rotation is two single rotation, one that happens in Case 4, and
   * one in case 5. 
   * @param double Boolean indicating wether it is a double rotation or not. 
   * Default is false. 
   */
  function insert_case5(jsav, node, modelTree, double = false) {
    highlighted.removeClass("highlighted");
    var g = node.grandparent();
    g.addClass("highlighted");
    jsav.umsg(interpret("av_rotation_2"));
    jsav.step();

    if (node === node.parent().left()) {
      var message = double ? interpret("av_lr_rotation") 
                           : interpret("av_r_rotation");
      jsav.umsg(message);
      jsav.step();
      g.rotateRight();
    } else {
      var message = double ? interpret("av_rl_rotation") 
                           : interpret("av_l_rotation");
      jsav.umsg(message);
      jsav.step();
      g.rotateLeft();
    }
    
    modelTree.layout();
    jsav.step();
    g.parent().colorBlack();
    g.colorRed();
    g.removeClass("highlighted");
    jsav.umsg(interpret("av_colour_after_rotation"));
  }

  // create buttoncontainer if it doesn't exist
  if ($("#buttoncontainer").length === 0) {
    $("#jsavcontainer .jsavcanvas").prepend(
      '<div id="buttoncontainer" style="margin: auto; text-align: center; padding: 15px">' +
      '  <button id="buttonL">Single Rotation Left</button>' +
      '  <button id="buttonLR">Double Rotation LR</button>' +
      '  <button id="buttonRL">Double Rotation RL</button>' +
      '  <button id="buttonR">Single Rotation Right</button>' +
      '<br>' +
      '<button id="buttonColor">Toggle Color</button>' +
      '</div>');
  }

  // create stackcontainer if it doesn't exist
  if ($("#stackcontainer").length === 0) {
    $("#jsavcontainer .jsavcanvas").prepend('<div id="stackcontainer" style="margin: auto; padding: 15px"></div>');
  }

  //generate values without duplicates
  function generateValues(n, min, max) {
    var arr = [];
    var val;
    for (var i = 0; i < n; i++) {
      do {
        val = Math.floor(min + Math.random() * (max - min));
      } while ($.inArray(val, arr) !== -1);
      arr.push(val);
    }
    return arr;
  }

  var exercise = av.exercise(modelSolution, initialize,
                             { compare: {css: "background-color"},
                               feedback: "atend", grader: "finder"});
  exercise.reset();

  function clickAction(node, rotateFunction) {
    if (!node || node.container !== tree) {
      window.alert("Please, select a node first!");
      return;
    }
    if (rotateFunction.call(node) === false) {
      window.alert("Unable to perform this rotation on the selected node!");
      return;
    }
    clickHandler.selNode = null;
    node.removeClass("selected");
    tree.layout();
    exercise.gradeableStep();
  }

  var btn = JSAV._types.ds.BinaryTreeNode.prototype;
  $("#buttonL").click(function () {
    clickAction(clickHandler.selNode, btn.rotateLeft);
  });
  $("#buttonLR").click(function () {
    clickAction(clickHandler.selNode, btn.rotateLR);
  });
  $("#buttonRL").click(function () {
    clickAction(clickHandler.selNode, btn.rotateRL);
  });
  $("#buttonR").click(function () {
    clickAction(clickHandler.selNode, btn.rotateRight);
  });
  $("#buttonColor").click(function () {
    if (!clickHandler.selNode) {
      window.alert("Select a node first!");
      return;
    }
    clickHandler.selNode.toggleColor();
    exercise.gradeableStep();
  });
  av.container.find(".jsavexercisecontrols input[name='undo']").click(function () {
    clickHandler.selNode = null;
  });

}(jQuery));