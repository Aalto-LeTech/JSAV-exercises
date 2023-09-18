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
    let studentGrade = 0;
    const modelLength = modelAnswer.operations.length;
    
    // Student's sequence
    let studSeq = this.operations;

    // Model solution's sequence
    let modelSeq = modelAnswer.operations;
        
    let i = 0; // points to studSet
    let j = 0; // poinst to modelSeq

    while (j < maxGrade) {
      let modelOp = modelSeq[j];
      if (modelOp.operation === 'dequeue') {
        if (studSeq[i].operation === 'dequeue' &&
            studSeq[i].edge === modelOp.edge) {
            i++, j++;
        }
        else {
            studentGrade = i;
            break;
        }
      }
      else {
        let r = this.gradeEnqueueUpdate(studSeq, modelSeq, i, j);
        // TODO
      }
    }
    
    return { 'studentGrade': studentGrade, 'maxGrade': modelLength };
  }

  gradeEnqueueUpdate(studSeq, modelSeq, i, j) {
    let shouldBreak = false;
    // TODO
    return {'i': i, 'j': j, 'break': shouldBreak}
  }
}
