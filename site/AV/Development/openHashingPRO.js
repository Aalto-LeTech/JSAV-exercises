/* global ODSA, PARAMS */
(function($) {
  "use strict";
  const KEY_LOWER_BOUND = 100; // inclusive
  const KEY_UPPER_BOUND = 900; // exclusive

  // AV variables
  var hashSize = PARAMS.size || 11,
      opSize = 20,
      hashArray,
      list = new Array(hashSize),
      opStack,
      clickedIndex,
      initialOps,
      $hashLabel,
      $stackLabel,
      pseudo,
      // get the configurations from the configuration file
      config = ODSA.UTILS.loadConfig({av_container: "jsavcontainer"}),
      interpret = config.interpreter,
      code = config.code,
      // Create a JSAV instance
      av = new JSAV($("#jsavcontainer"));

  av.recorded(); // we are not recording an AV with an algorithm

  if (code) {
    pseudo = av.code($.extend({after: {element: $(".instructions")}}, code));
    pseudo.show();
  }

  // create probeMessage and show it on the page
  $("#probingMessage").html("h(k) = k mod " + hashSize);


  function initialize() {
    var i;

    // clear old structures
    if (hashArray) {
      hashArray.clear();
    }
    for (i = 0; i < hashSize; i++) {
      if (list[i]) {
        list[i].clear();
      }
    }
    if (opStack) {
      opStack.clear();
    }
    if (clickedIndex) {
      clickedIndex.clear();
    }

    // remove all old labels
    av.container.find(".exerciseLabel").remove();

    $(".jsavcanvas").css("min-height", 500);

    // generate (pseudo) random input
    initialOps = generateHashOperations(opSize);

    // create operation stack
    opStack = av.ds.stack(initialOps.values, {
      center: true,
      ytransition: -9,
      xtransition: 7
    });
    opStack.css("min-height", 130);
    for (i = 0; i < opSize; i++) {
      opStack.get(i).addClass(initialOps.operations[i]);
    }
    opStack.layout();

    // create array
    hashArray = av.ds.array(new Array(hashSize), {
      indexed: true,
      center: true,
      autoresize: false
    });
    hashArray.layout();
    // hashArray.click(arrayClickHandler);

    // create new labels
    $hashLabel = $("<p class='exerciseLabel'>" + interpret("av_hash") + "</p>");
    $stackLabel = $("<p class='exerciseLabel'>" + interpret("av_operations") + "</p>");

    // insert the labels
    $hashLabel.insertBefore(hashArray.element);
    $stackLabel.insertBefore(opStack.element);

    for (i = 0; i < hashSize; i++) {
      list[i] = av.ds.list({layout: "vertical", center: false, nodegap: 10});
      list[i].element.css("position", "absolute");
      list[i].addFirst("");
      list[i].layout();
      list[i].element.position({
        my: "top",
        at: "top",
        of: hashArray.element.find("li:eq(" + i + ")"),
        collision: "none",
        within: $(".jsavcanvas")
      });
      list[i].click(clickHandler);
    }

    // create clickedIndex JSAV variable
    clickedIndex = av.variable(-1);

    // show hash function for the first element
    showModulusOfKey();

    var gradeableStructures = list.slice(0);
    gradeableStructures.push(clickedIndex);
    return gradeableStructures;
  }


  function modelSolution(jsav) {
    var i, ind;
    // initialize stack
    var msStack = jsav.ds.stack(initialOps.values, {
      center: true,
      ytransition: -9,
      xtransition: 7
    });
    msStack.css("min-height", 100);
    msStack.layout();
    for (i = 0; i < opSize; i++) {
      msStack.get(i).addClass(initialOps.operations[i]);
    }

    // initialize infix array
    var msHash = jsav.ds.array(new Array(hashSize), {
      indexed: true,
      center: true,
      autoresize: false
    });
    msHash.layout();

    var msList = new Array(hashSize);
    for (i = 0; i < hashSize; i++) {
      msList[i] = jsav.ds.list({layout: "vertical", center: false, nodegap: 10});
      msList[i].element.css({
        position: "absolute",
        backgroundColor: "transparent"
      });
      msList[i].addFirst("");
      msList[i].layout();
      msList[i].element.position({
        my: "top",
        at: "top",
        of: msHash.element.find("li:eq(" + i + ")"),
        collision: "none",
        within: $(".jsavcanvas")
      });
    }

    var msClickedIndex = jsav.variable(-1);

    jsav.displayInit();

    // Helper function that searches for a key in the linked list,
    // highlights the nodes that are being checked and registers
    // the states as gradeable steps. The last step (finding the key
    // or reaching the end of the list) is not registered as a gradeable step.
    function findListIdx(key) {
      jsav.umsg(interpret("av_ms_looking_for"), {fill: {
        key: key
      }});
      let currentNode = msList[key % hashSize].first(),
          currentIdx = 0;

      while (currentNode) {
        currentNode.highlight();

        if (currentNode.value() === key) {
          // Found the key.
          // Actual gradeable step is done when advancing to the next operation.
          return currentIdx;
        }
        // Move to the next node.
        currentNode = currentNode.next();
        currentIdx++;
        if (currentNode) {
          // Only register a gradeable step if we are not at the end of the list,
          // because gradeable step is registered when advancing to the next operation.
          jsav.gradeableStep();
        }
      }
      // Did not find the key.
      return null;
    }

    function nextOperation() {
      // unhighlight all nodes
      for (i = 0; i < hashSize; i++) {
        var node = msList[i].first();
        while (node) {
          node.unhighlight();
          node = node.next();
        }
      }
      // show the next node in the stack
      if (msStack.size()) {
        msStack.removeFirst();
        msStack.layout();
      }
      jsav.gradeableStep();
    }

    function printHashFunction(key) {
      jsav.umsg("<br>" + key + " mod " + hashSize + " = " + key % hashSize, {
        preserve: true
      });
    }

    // insert the values in the stack to the new hash table
    while (msStack.size()) {
      var first = msStack.first(),
          firstValue = first.value(),
          operation = getOperationType(first),
          nodeInd;

      ind = firstValue % hashSize;
      msClickedIndex.value(ind);

      jsav.umsg(interpret("av_ms_calculate_index"), {fill: {key: firstValue}});
      printHashFunction(firstValue);
      jsav.step();

      switch (operation) {
      case "insert":
        // Add a new node after the first sentinel node.
        // Highlight the sentinel node.
        msList[ind].first().highlight();
        msList[ind].add(1).layout();
        // Move the value from the stack to the new node.
        jsav.effects.moveValue(first, msList[ind].get(1));
        jsav.umsg(interpret("av_ms_insert"), {fill: {
          index: ind
        }});
        break;
      case "remove":
        nodeInd = findListIdx(firstValue);
        if (nodeInd) {
          msList[ind].remove(nodeInd);
          msList[ind].layout();
          jsav.umsg(interpret("av_ms_remove"), {fill: {
            index: ind
          }});
        } else {
          jsav.umsg(interpret("av_ms_remove_failed"), {fill: {
            key: firstValue
          }});
        }
        break;
      case "search":
        nodeInd = findListIdx(firstValue);
        if (nodeInd) {
          jsav.umsg(interpret("av_ms_search"), {fill: {
            index: ind
          }});
        } else {
          jsav.umsg(interpret("av_ms_search_failed"), {fill: {
            key: firstValue
          }});
        }
        break;
      default:
        // nothing
      }
      nextOperation();
    }

    var gradeableModelStructures = msList.slice(0);
    gradeableModelStructures.push(msClickedIndex);
    return gradeableModelStructures;
  }

  // Helper functions to handle the click event on the list nodes.

  /**
   * Process the click event when the top-most element of the stack is an update operation.
   * @param {Object} clickedNode The node that was clicked.
   * @param {*} valueToRemove The value that should be removed.
   * @returns {boolean} True if the operation was finished (i.e., the key was found or the operation was completed),
   *          false if the operation is still in progress.
   */
  function processRemove(clickedNode, valueToRemove) {
    const nodeList = clickedNode.container;
    clickedNode.highlight();

    if (clickedNode.value() === valueToRemove) {
      // User clicked the node, which contains the key
      // that we want to remove.
      // -> remove the node
      for (let idx = 0; idx < nodeList.size(); idx++) {
        if (nodeList.get(idx) === clickedNode) {
          nodeList.remove(idx);
          // Indicate that operation is complete and we should continue with the next operation.
          return true;
        }
      }
    }
    if (clickedNode === nodeList.last()) {
      // The clicked node is the last node in the list.
      // Indicate that we should continue with the next operation
      // as the key was not found in the list.
      return true;
    }
    return false;
  }

  /**
   * Process the click event when the top-most element of the stack is a search operation.
   * @param {Object} clickedNode The node that was clicked.
   * @param {*} valueToSearch The value that should be searched.
   * @returns {boolean} True if the operation was finished (i.e., the key was found or the operation was completed),
   *         false if the operation is still in progress.
   */
  function processSearch(clickedNode, valueToSearch) {
    const nodeList = clickedNode.container;
    clickedNode.highlight();

    if (clickedNode.value() === valueToSearch) {
      // Search is complete.
      return true;
    }
    // User clicked some other node in the list.
    // Check if we are at the end of the list.
    if (clickedNode === nodeList.last()) {
      return true;
    }
    return false;
  }

  /**
   * Process the click event when the top-most element of the stack is an insert operation.
   * NOTE: The return value has different meaning than in the process functions of remove and search.
   * @param {object} clickedNode The node that was clicked.
   * @param {object} topElement The top element of the stack.
   * @returns {boolean} true if the click was valid and insert was performed,
   *        false if the click was not valid and insert was not performed
   */
  function processInsert(clickedNode, topElement) {
    const clickedList = clickedNode.container;
    if (clickedNode !== clickedList.first()) {
      window.alert("Click on the hash table to insert a value.");
      return false;
    }
    clickedNode.highlight();
    clickedList.add(1); // Add new node after the invisible first node.
    // Move the value from the stack to the new node.
    av.effects.moveValue(topElement, clickedList.get(1));
    return true;
  }

  const OperationResult = Object.freeze({
    FINISHED: "finished",
    IN_PROGRESS: "in_progress",
    INVALID: "invalid"
  });

  /**
   * Apply the operation that is on top of the stack to the clicked node.
   * @param {object} clickedNode The node that was clicked.
   * @param {object} topElement The top element of the stack.
   * @returns {string} One of the OperationResult values.
   */
  function applyOperationToClickedNode(clickedNode, topElement) {
    const operation = getOperationType(topElement);
    switch (operation) {
    case "insert": {
      const validClick = processInsert(clickedNode, topElement, clickedIndex);
      if (validClick) {
        // Insert is always finished if the click is valid.
        return OperationResult.FINISHED;
      }
      return OperationResult.INVALID;
    }
    case "remove": {
      const finished = processRemove(clickedNode, topElement.value());
      if (finished) {
        return OperationResult.FINISHED;
      }
      return OperationResult.IN_PROGRESS;
    }
    case "search": {
      const finished = processSearch(clickedNode, topElement.value());
      if (finished) {
        return OperationResult.FINISHED;
      }
      return OperationResult.IN_PROGRESS;
    }
    default:
      console.warn("Unknown operation: " + operation);
      return OperationResult.FINISHED;
    }
  }

  // Linked list click handler.
  function clickHandler() {
    // Helpers to advance the exercise.
    function popNonEmptyOperationStack() {
      if (opStack.size() > 0) {
        opStack.removeFirst();
        opStack.layout();
        showModulusOfKey();
      }
    }
    function unhighlightAllLists() {
      for (let idx = 0; idx < hashSize; idx++) {
        let node = list[idx].first();
        while (node) {
          node.unhighlight();
          node = node.next();
        }
      }
    }
    // Click handling starts.
    // this refers to the clicked node if the linked list.
    if (!opStack.size()) {
      return;
    }
    const clickedList = this.container;
    // Find the index of the clicked list.
    for (let i = 0; i < hashSize; i++) {
      if (clickedList === list[i]) {
        clickedIndex.value(i);
        break;
      }
    }

    const topElement = opStack.first(); // top element of the stack
    const operationResult = applyOperationToClickedNode(this, topElement, clickedIndex.value());

    if (operationResult === OperationResult.INVALID) {
      // Operation was not valid, do not update the state of the exercise.
      return;
    }
    // Operation was valid, update the state of the exercise.
    clickedList.layout();
    if (operationResult === OperationResult.FINISHED) {
      // Operation is finished, continue with the next operation.
      popNonEmptyOperationStack();
      unhighlightAllLists();
    }
    // Register gradeable step after each valid click.
    exercise.gradeableStep();
  }

  function getOperationType(node) {
    if (node.hasClass("insert")) {
      return "insert";
    } else if (node.hasClass("remove")) {
      return "remove";
    } else if (node.hasClass("search")) {
      return "search";
    }
    // unknown operation
    return null;
  }


  function showModulusOfKey() {
    if (!opStack.size()) {
      return;
    }
    var val = opStack.first().value();
    av.umsg("<strong>{key} mod {size} = {result}</strong>", {fill: {
      key: val,
      size: hashSize,
      result: val % hashSize
    }});
  }

  function generateNewUniqueValue(currentValues) {
    let newVal = JSAV.utils.rand.numKey(KEY_LOWER_BOUND, KEY_UPPER_BOUND);
    // Randomize new value again if it is already in the array.
    while (currentValues.includes(newVal)) {
      newVal = JSAV.utils.rand.numKey(KEY_LOWER_BOUND, KEY_UPPER_BOUND);
    }
    return newVal;
  }

  // generate hash operations
  function generateHashOperations(size) {
    var values = new Array(size),
        operations = new Array(size),
        result = {values: values, operations: operations},
        i, start, end, ind1, ind2, ind3, ind4, colInd;

    // the first quarter contains insert operations
    // collissions at ind1 and ind2
    start = 0;
    end = Math.floor(size / 4);
    ind1 = Math.random() < 0.5 ? 1 : 2;
    ind2 = ind1 + Math.floor(Math.random() * (end - ind1));
    for (i = start; i < end; i++) {
      operations[i] = "insert";
      if (i === ind1 || i === ind2) {
        continue;
      }
      values[i] = generateNewUniqueValue(values);
    }
    // collision index
    colInd = values[0] % hashSize;
    // generate colliding values
    values[ind1] = Math.floor(generateNewUniqueValue(values) / hashSize) * hashSize + colInd;
    values[ind2] = Math.floor(generateNewUniqueValue(values) / hashSize) * hashSize + colInd;

    // the second quarter contains remove operations
    // attempt to remove non-existing key at ind1
    // attempt to remove already removed key at ind2
    start = end;
    end = Math.floor(size / 2);
    ind1 = start + Math.floor(Math.random() * (end - 1 - start));
    ind2 = end - 1;
    for (i = start; i < end; i++) {
      operations[i] = "remove";
      if (i === ind1 || i === ind2) {
        continue;
      }
      values[i] = values[Math.floor(Math.random() * start)];
    }
    // new key
    values[ind1] = generateNewUniqueValue(values);
    // already removed key
    values[ind2] = values[(ind1 === start ? start + 1 : start)];

    //the third quarter contains more insert operations
    start = end;
    end += Math.floor(size / 4);
    for (i = start; i < end; i++) {
      operations[i] = "insert";
      values[i] = generateNewUniqueValue(values);
    }


    // the fourth quarter contains search operations
    // attempt to search for a non-existing key at ind3
    // attempt to search for an already removed key at ind4
    start = end;
    end = size;
    ind3 = start + Math.floor(Math.random() * (end - 1 - start));
    ind4 = end - 1;
    for (i = start; i < end; i++) {
      operations[i] = "search";
      if (i === ind3 || i === ind4) {
        continue;
      }
      while (typeof values[i] === "undefined" ||
              values[i] === values[ind1] ||
              values[i] === values[ind2]
      ) {
        values[i] = values[Math.floor(Math.random() * start)];
      }
    }
    values[ind3] = values[ind1];
    values[ind4] = values[ind2];


    return result;
  }


  var exercise = av.exercise(modelSolution, initialize, {
    feedback: "atend",
    modelDialog: {width: 760}
  });
  exercise.reset();
}(jQuery));
