/**
 * Represents a min-heap. 
 * Encapsulates jsav binary tree and jsav variable that holds the current heap size.
 * Provides methods to insert, remove, and update nodes in the min-heap and 
 * takes care of restoring the min-heap property after each operation.
 * Also updates the visualization of the binary tree after each operation.
 * Assumes that nodes in the binary tree have labels of the form "x<br>D (S)",
 * where x is the distance, D is the destination node label, and S is the source node label.
 * Compares nodes based on the distance and optionally the destination label.
 * @class
 */
class MinHeapInterface {
  /**
   * @constructor
   * @param {JSAV_object} jsav - The jsav instance that this min-heap will belong to.
   * @param {Object} jsavProps - The parameters that are passed to jsav binary tree when creating it.
  */
  constructor(jsav, jsavProps) {
    this._btree = jsav.ds.binarytree(jsavProps);
    this._heapSizeJsav = jsav.variable(0); // is JSAV object!
    // Function that returns true if node1 should be above node2 in the min-heap.
    this._compFunc = (node1, node2) => {
      const dist1 = this.extractDistFromNode(node1);
      const dist2 = this.extractDistFromNode(node2);
      if (dist1 < dist2) {
        return true;
      }
      return false;
    };
  }

  /**
   * @returns {JSAV_binary_tree} The jsav binary tree object.
  */
  get btree() {
    return this._btree;
  }
  
  /**
   * @returns {JSAV_binary_tree_node} The current root node of the binary tree.
  */
  get _rootNode() {
    return this._btree.root();
  }

  /**
   * @param {JSAV_binary_tree_node} newRootNode - The new root node of the binary tree.
   */
  set _rootNode(newRootNode) {
    this._btree.root(newRootNode);
  }

  /**
   * @returns {number} The current heap size.
   */
  get heapSize() {
    return this._heapSizeJsav.value();
  }

  /**
   * Increments the heap size by 1.
   */
  _incrementHeapSize() {
    this._heapSizeJsav.value(this._heapSizeJsav.value() + 1);
  }

  /**
   * Decrements the heap size by 1.
   */
  _decrementHeapSize() {
    this._heapSizeJsav.value(this._heapSizeJsav.value() - 1);
  }

  /**
   * Swaps the values of two binary tree nodes.
   * @param {JSAV_tree_node} node1 
   * @param {JSAV_tree_node} node2 
   */
  _swapNodeValues(node1, node2) {
    const val1 = node1.value();
    const val2 = node2.value();
    node1.value(val2); // Calling value with argument will replace old value.
    node2.value(val1);
  }

  /**
   * Clears the binary tree and sets the heap size to 0. 
   * Should only be called when the current min-heap is no longer needed.
   */
  clearHeap() {
    this._btree.clear();
    this._heapSizeJsav.value(0);
    this._btree.layout();
  }

  /**
   * Helper function to extract the distance from a binary tree node that has label 
   * of format: "x<br>D (S)", where x is the distance, D is the destination node label 
   * and S is the source node label
   * @param {JSAV_binary_tree_node} node - node whose distance is being extracted
   * @returns {Number} the distance
  */
  extractDistFromNode(node) {
    return this.extractDistFromLabel(node.value());
  }

  /**
   * Helper function to extract the distance from a string of format: "x<br>D (S)", 
   * where x is the distance, D is the destination node label and S is the source node label
   * @param {String} nodeLabel 
   * @returns {Number}
   */
  extractDistFromLabel(nodeLabel) {
    const integerMatches = nodeLabel.match(/\d+/);
    const firstMatch = integerMatches[0];
    return Number(firstMatch);
  }

  /**
   * Helper function to extract the destination from a binary tree node that has label 
   * of format: "x<br>D (S)", where x is the distance, D is the destination node label 
   * and S is the source node label
   * @param {JSAV_binary_tree_node} node - node whose destination is being extracted
   * @returns {String} the destination, a single character
  */
  extractDestFromNode(node) {
    return this.extractDestFromLabel(node.value());
  }

  /**
   * Helper function to extract the destination from a string of format: "x<br>D (S)", 
   * where x is the distance, D is the destination node label and S is the source node label
   * @param {String} nodeLabel 
   * @returns {String} the destination, a single character
   */
  extractDestFromLabel(nodeLabel) {
    const charMatches = nodeLabel.match(/[A-Z]/);
    const destination = charMatches[0];
    return destination;
  }

  /**
   * Restores min-heap property after node insert or update. Calls itself recursively.
   * @param {JSAV_binary_tree_node} currentNode - The node that is being compared to its parent.
   * @param {Number} distance - The distance of the current node, 
   *  which corresponds to the inserted/updated distance before applying upheap.
   * @param {String} destination - The destination of the current node (single character describing graph node),
   *  which corresponds to the inserted/updated destination before applying upheap.
  */
  _upheap(currentNode) { 
    const currentParent = currentNode.parent();
    if (!currentParent) {
      return; // reached root
    }
    if (this._compFunc(currentNode, currentParent)) {
      this._swapNodeValues(currentNode, currentParent);
      // Upheap again so that parent is the currentNode.
      this._upheap(currentParent);
    }
  }

  /**
   * Restores min-heap property after node removal or update. Calls itself recursively.
   * @param {JSAV_binary_tree_node} subtreeRootNode - The node that is being compared to its children.
   */
  _downheap(subtreeRootNode) {
    if (!subtreeRootNode) {
      return; // reached leaf
    }
    const leftChild = subtreeRootNode.left();
    const rightChild = subtreeRootNode.right();

    let smallest = subtreeRootNode;

    if (leftChild && this._compFunc(leftChild, smallest)) {
      smallest = leftChild;
    }
    if (rightChild && this._compFunc(rightChild, smallest)) {
      smallest = rightChild;
    }
    if (smallest !== subtreeRootNode) {
      this._swapNodeValues(smallest, subtreeRootNode);
      // Make recursive call.
      this._downheap(smallest);
    }
  }

  /**
   * Finds the parent node of the node at the given index.
   * Traverses the binary tree up and down to find the parent node as 
   * JSAV does not allow accessing nodes by index.
   * (If nodes could be accessed by index, result would be node at index (nodeIdx - 1) / 2.)
   * @param {Number} nodeIdx - index of the node whose parent will be found 
   * @returns {JSAV_binary_tree_node} the parent node of the node at the given index or null if nodeIdx is 0 (root)
   */
  _findParent(nodeIdx) {
    if (nodeIdx === 0) {
      return null;
    }
    // Will be filled with indices of parameter node's ancestors excluding root node.
    const ancestorChain = []; 
    let i = nodeIdx;
    while (i > 0) {
      i = Math.floor((i - 1) / 2);
      ancestorChain.unshift(i);
    }

    let parentNode = this._rootNode;
    for (let j = 1; j < ancestorChain.length; j++) {
      const parentIdx = ancestorChain[j - 1];
      const childIdx = ancestorChain[j];
      // Make child the new parent for next iteration.
      if (parentIdx * 2 + 1 === childIdx) {
        parentNode = parentNode.left();
      } else {
        parentNode = parentNode.right();
      }
    }
    return parentNode;
  }

  /**
   * 
   * @returns {JSAV_binary_tree_node} the last node in the binary tree (bottom rightmost node)
   */
  _getLastNode() {
    const lastNodeIdx = this.heapSize - 1;
    if (lastNodeIdx < 0) {
      return null;
    }
    if (lastNodeIdx === 0) {
      return this._rootNode;
    }
    const lastNodeParent = this._findParent(lastNodeIdx);
    return (lastNodeIdx % 2 === 1)
      ? lastNodeParent.left() : lastNodeParent.right();
  }

  /**
   * Insert the new node into the min-heap and restore the min-heap property.
   * Parameters are used to create the label of the new node.
   * @param srcLabel label of the source node
   * @param dstLabel label of the destination node
   * @param distance distance to be inserted.
   */
  insert(srcLabel, dstLabel, distance) {
    const newNodeIdx = this.heapSize;
    this._incrementHeapSize();

    const nodeLabel = `${distance}<br>${dstLabel} (${srcLabel})`;
    const newNode = this._btree.newNode(nodeLabel);

    if (newNodeIdx === 0) {
      this._rootNode = newNode;
    } else {
      const parent = this._findParent(newNodeIdx);
      if (newNodeIdx % 2 === 1) {
        parent.left(newNode);
        newNode.parent(parent);
      } else {
        parent.right(newNode);
        newNode.parent(parent);
      }
    }
    // Restore min-heap property.
    this._upheap(newNode);
  
    this._btree.layout();
  }

  /**
   * Remove the minimum node from the min-heap and restore the min-heap property.
   * @returns the label of the minimum node that was removed or null if the heap is empty.
   */
  removeMin() {
    if (this.heapSize === 0) { // empty heap
      return null;
    }
    const minNode = this._rootNode; // to be removed
    const minLabel = minNode.value(); // to be returned

    const lastNode = this._getLastNode();

    this._swapNodeValues(minNode, lastNode);

    lastNode.remove();
    this._decrementHeapSize();

    // Restore min-heap property.
    if (this.heapSize > 1) {
      this._downheap(this._rootNode); // last node is now root
    }

    this._btree.layout();

    return minLabel;
  }

  /**
   * Preorder traversal the JSAV binary tree to get an array of JSAV binary tree nodes.
   * There is no function for this in the JSAV library.
   * @returns {Array} an array containing the nodes of the JSAV binary tree
   */
  _getTreeNodeArr() {

    // Inner recursive function to get all children of a node.
    const getChildren = (node) => {
      if (!node) {
        return []; // No more children.
      }
      const leftChildren = getChildren(node.left());
      const rightChildren = getChildren(node.right());
      const nodeAndChildren = [node, ...leftChildren, ...rightChildren];

      return nodeAndChildren;
    };
    // Start with the root node.
    const treeNodes = getChildren(this._rootNode, []);
    return treeNodes;
  }

  /**
   * Updates the label of a node with the given destination label and restores the min-heap property.
   * @param {String} dest - the destination label of the node that will be updated 
   * @param {String} newLabel - the new label for the node
   * @returns the old label of the node that was updated.
   */
  updateNodeWithDest(dest, newLabel) {
    const nodeToUpdate = this.getNodeByDest(dest);
    if (!nodeToUpdate) {
      return;
    }
    const oldDist = this.extractDistFromNode(nodeToUpdate);
    const oldLabel = nodeToUpdate.value();
    const newDist = this.extractDistFromLabel(newLabel);
    
    nodeToUpdate.value(newLabel);

    if (newDist > oldDist) {
      this._downheap(nodeToUpdate);
    } else {
      this._upheap(nodeToUpdate);
    }
    this.btree.layout();
    return oldLabel;
  }

  /**
   * 
   * @param {String} dest - the destination label of the node that will be returned
   * @returns {JSAV_binary_tree_node} the node with the given destination label
   */
  getNodeByDest(dest) {
    const allNodesArr = this._getTreeNodeArr();
    // Grab first node with the correct destination.
    const node = allNodesArr.find(node => 
      node.value().charAt(node.value().length - 5) === dest);
    
    return node;
  }

  /**
   * Adds a css class to the node with the given destination label if it exists.
   * @param {String} dest - the destination label of the node that will be given the css class 
   * @param {String} className - the css class that will be added to the node  
   */
  addCssClassToNodeWitDest(dest, className) {
    const node = this.getNodeByDest(dest);
    if (node) {
      node.addClass(className);
    }
  }

  /**
   * Removes a css class from the node with the given destination label if it exists.
   * @param {String} dest - the destination label of the node that will have the css class removed 
   * @param {String} className - the css class that will be removed from the node  
   */
  removeCssClassFromNodeWithDest(dest, className) {
    const node = this.getNodeByDest(dest);
    if (node) {
      node.removeClass(className);
    }
  }
}


