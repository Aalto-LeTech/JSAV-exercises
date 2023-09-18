 /**
   * A class for a priority queue operation.
   * operation: one of: 'enqueue', 'dequeue', 'update'
   * edge: a string of two uppercase letters A-Z
   */
 class PqOperation {
    constructor(operation, edge) {
      let valid = true;
      if (operation !== 'enqueue' && operation !== 'dequeue' && operation !== 'update') {
        valid = false;
        console.error('PqOperation: invalid operation: ' + operation);
      }
      if (typeof(edge) !== 'string' || /^[A-Z]{2}$/.test(edge) === false) {
        valid = false;
        console.error('PqOperation: invalid edge: ' + edge);
      }
      if (valid) {
        this.operation = operation;
        if (edge[0] <= edge[1]) {
          this.edge = edge;
        }
        else {
          this.edge = edge[1] + edge[0];
        }        
      }
    }
    equals(x) {
      return this.operation === x.operation && this.edge === x.edge;
    }
}

/**
 * A sequence of priority queue operations.
 * Different instances of this class can be used to store the model
 * answer operations and student's solution.
 */
class PqOperationSequence {
    constructor() {
        this.operations = [];
    }
    /**
     * Clears the sequence.
     * This should be used when the user clicks the Reset button.
     */
    clear() {
        this.operations = [];
    }

    /**
     * Removes the last operation from the sequence.
     * This should be used when the user clicks the Undo button.
     */
    undo() {
        this.operations.pop();
    }

    /**
     * Adds new operation to the sequence.
     * 
     * @Param {PqOperation} operation
     */
    push(operation) {
        this.operations.push(operation);
    }

    /**
     * Union of two Sets.
     * 
     * @param {Set} setA 
     * @param {Set} setB 
     * @returns 
     */
    union(setA, setB) {
        const _union = new Set(setA);
        for (const elem of setB) {
          _union.add(elem);
        }
        return _union;
    }
    /**
     * 
     * @param {PqOperation} modelAnswer 
     */
    gradeAgainst(modelAnswer) {
        const modelLength = modelAnswer.operations.length;
        const ownLength = this.operations.length;
        return 0;
    }
}
