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
    return this.operation + ' ' + this.edge;
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
   * The length of the sequence.
   */
  length() {
    return this.operations.length;
  }

  /**
   * Returns the sequence as a string.
   * 
   * @returns {String}
   */
  toString() {
    let s = ""
    if (this.length() > 0) {
      s = this.operations[0].toString();
    }
    for (let i = 1; i < this.operations.length; i++) {
      s += ' ' + this.operations[i].toString();
    }
    return s;
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
    const modelLength = modelAnswer.length();
    const studentLength = this.length();
    
    // Student's sequence
    let student = this.operations;

    // Model solution's sequence
    let model = modelAnswer.operations;
        
    let i = 0; // index of student
    let j = 0; // index of model

    while (i < studentLength && j < modelLength) {
      if (model[j].operation === 'deq') {
        if (student[i].equals(model[j])) {
            i++, j++;
        }
        else {
            break;
        }
      }
      else {
        let studentOps = new OperableSet();
        for (let k = i; k < studentLength && student[k].operation !== 'deq';
            k++) {
          studentOps.add(student[k].toString())
        }
        let modelOps = new OperableSet();
        for (let k = j; k < modelLength && model[k].operation !== 'deq'; k++) {
          modelOps.add(model[k].toString());
        }
        let opIntersection = studentOps.intersection(modelOps);
        let opUnion = studentOps.union(modelOps);
        i += opIntersection.size();
        j += opIntersection.size();
        if (opUnion.size() > opIntersection.size()) {
          break;
        }
      }
    }
    
    return { studentGrade: i, maxGrade: modelLength };
  }

  /**
   * Constructs a PqOperationSequence from a string in format
   * "opr ee opr ee opr ee ... " where each
   *    opr is one of {'enq', 'deq', 'upd'}
   *  and each ee is a pair of uppercase alphabets.
   * This is helper function for generating test data in unit tests.
   *
   * E.g. x = "enq AB deq BC deq EF"
   * PqOperationSequence:
   *  [ { operation: 'enq', edge: 'AB'},
   *    { operation: 'deq', }]
   */
  fromString(x) {
    this.clear();
    for (let i = 0; i < x.length; i += 7) {
      const operation = x.substring(i, i + 3);
      const edge = x.substring(i + 4, i + 6);
      this.operations.push(new PqOperation(operation, edge));
    }    
  }

  

}
