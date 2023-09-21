/**
 * A class for a priority queue operation.
 * operation: one of: 'enq', 'deq', 'upd'
 * edge: a string of two uppercase letters A-Z
 */
class PqOperation {
  constructor(operation, edge) {
    this.operation = operation;
    if (edge[0] <= edge[1]) {
      this.edge = edge;
    }
    else {
      this.edge = edge[1] + edge[0];
    }    
  }

  /**
   * Tests equality to another PqOperation.
   * 
   * @param {PqOperation} x a PqOperation
   * @returns Boolean value
   */
  equals(x) {
    return this.operation === x.operation && this.edge === x.edge;
  }

  /**
   * Produces a string representation of the object.
   * 
   * @return a String 
   */
  toString() {
    return this.operation + this.edge;
  }
}

/**
 * A set theory set which has union and intersection operations,
 * based on the builtin data type Set which is hashable.
 */
class OperableSet {
  constructor(x) {
    this.set = new Set(x);
  }

  /**
   * Adds an object into the set.
   * 
   * @param {object} x Any hashable object
   */
  add(x) {
    this.set.add(x);
  }

  /**
   * Union with another OperableSet.
   * 
   * @param {OperableSet} x another set
   * @returns {OperableSet}
   */
  union(x) {
    const _union = new OperableSet(this.set);
    for (const elem of x.set) {
      _union.add(elem);
    }
    return _union;
  }

  /**
   * Intersection of two Sets.
   * 
   * @param {Set} setA 
   * @param {Set} setB 
   * @returns {OperableSet}
   */
  intersection(x) {
    const intersection = new OperableSet();
    for (const elem of this.set) {
      if (x.set.has(elem)) {
        intersection.add(elem);      
      }
    }
    return intersection;
  }

  /**
   * Number of the elements in the set.
   * 
   * @returns {Integer}
   */
  size() {
    return this.set.size;
  }

  /**
   * Returns the set as a string.
   * 
   * @returns {List}
   */
  toString() {
    let _list = [];
    for (const elem of this.set) {
      _list.push(elem);
    }
    return JSON.stringify(_list);
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
   * Grades the sequence against another sequence.
   * Assumes that this sequence is the student's solution and the
   * another sequence is the model solution.
   * 
   * @param {PqOperation} modelAnswer Model solution
   * @returns {studentGrade: x, maxGrade: y}
   *       Grade of x / y, x and y are integers.
   */
  gradeAgainst(modelAnswer) {
    let studentGrade = 0;
    const modelLength = modelAnswer.operations.length;
    
    // Student's sequence
    let student = this.operations;

    // Model solution's sequence
    let model = modelAnswer.operations;
        
    let i = 0; // index of student
    let j = 0; // index of model

    while (j < maxGrade) {
      if (model[j].operation === 'deq') {
        if (student[i].equals(model[j])) {
            i++, j++;
        }
        else {
            studentGrade = i;
            break;
        }
      }
      else {
        let studentOps = Set();
        for (; i < student.length && student[i].operation !== 'deq'; i++) {
          studentOps.add(student[i].toString())
        }
        let modelOps = Set();
        for (; j < model.length && model[j].operation !== 'deq'; j++) {
          modelOps.add(model[j].toString());
        }
        let r = this.gradeEnqueueUpdate(student, model, i, j);
        // TODO
      }
    }
    
    return { 'studentGrade': studentGrade, 'maxGrade': modelLength };
  }


  

}
