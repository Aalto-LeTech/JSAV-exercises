(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const submission = require('../submission/submission');
const arrayAnimation = require('./array/array-animation');
const nodeAnimation = require('./node/node-animation');
const edgeAnimation = require('./edge/edge-animation');
const modelAnswerAnimation = require('./model-answer/model-answer-animation');
const helpers = require('../utils/helperFunctions');
const dataStructures = require('../dataStructures/dataStructures');


function handleGradableStep(exercise, eventData) {
  const exerciseHTML = helpers.getExerciseHTML(exercise)
  // const dataStructuresState = getDataStructuresState(submissionDataStructures(), exercise);
  const dataStructuresState = dataStructures.getDataStructuresFromExercise(exercise)
  if(dataStructuresState.length) addStepToSubmission(eventData, dataStructuresState, exerciseHTML);
}

// Returns an empthy array if there is not state change
function getDataStructuresState(dataStructures, exercise) {
  return dataStructures.map((ds, i) => {
    switch(ds.type) {
      case 'array':
        // TODO: make a function for this
        const arrayInExercise = Array.isArray(exercise.initialStructures) ?
        exercise.initialStructures.find(s => s.element['0'].id === ds.id) :
        exercise.initialStructures;
        return { id: ds.id, values: [ ...arrayInExercise._values ] };
        break;
      default:
        return `unknown ds type ${ds.type}`;
    }
  });
}

// TODO: support for other data structures
function submissionDataStructures() {
  const dataStructures = submission.state().initialState.dataStructures.map( ds => {
    return {
      type: ds.type,
      id: ds.id,
      values: ds.values
    };
  });
  return dataStructures;
}

function addStepToSubmission(eventData, dataStructuresState, exerciseHTML) {
  const type = eventData.type === 'jsav-exercise-undo' ? 'undo' : 'gradeable-step';
  const animation = submission.state().animation;
  const currentStep = eventData.currentStep || animation[animation.length - 1].currentStep +1;
  const newState = {
    type,
    tstamp: eventData.tstamp || new Date(),
    currentStep,
    dataStructuresState,
    animationHTML: exerciseHTML
  };
  try {
    submission.addAnimationStepSuccesfully.gradableStep(newState);
  } catch (error) {
    console.warn(`Could not add state change to animatio: ${error}`)
  }
}

function handleGradeButtonClick(eventData) {
  try {
    submission.addAnimationStepSuccesfully.gradeButtonClick({
      type: "grade",
      tstamp: eventData.tstamp,
      currentStep: eventData.currentStep,
      score: { ...eventData.score },

    });
  } catch (error) {
    console.warn(`Could not add grade button click to animation: ${error}`)
  }
}

module.exports = {
  handleArrayEvents: arrayAnimation.handleArrayEvents,
  handleNodeEvents: nodeAnimation.handleNodeEvents,
  handleEdgeEvents: edgeAnimation.handleEdgeEvents,
  handleGradableStep,
  handleGradeButtonClick,
  handleModelAnswer: modelAnswerAnimation.handleModelAnswer
}

},{"../dataStructures/dataStructures":7,"../submission/submission":19,"../utils/helperFunctions":21,"./array/array-animation":2,"./edge/edge-animation":3,"./model-answer/model-answer-animation":4,"./node/node-animation":5}],2:[function(require,module,exports){
const submission = require('../../submission/submission');
const helpers = require('../../utils/helperFunctions');
const dataStructures = require('../../dataStructures/dataStructures');

function handleArrayEvents(exercise, eventData, exerciseHTML) {
  const dataStructuresState = dataStructures.getDataStructuresFromExercise(exercise);
  const clickDataSource = {
    tstamp: eventData.tstamp,
    currentStep: eventData.currentStep,
    dataStructuresState,
    animationHTML: helpers.getExerciseHTML(exercise)
    }
  switch(eventData.type) {
    case 'jsav-array-click':
    const clickDataTarget = {
      type: 'array-click',
      index: eventData.index,
    };
    if(eventData.arrayid) clickDataTarget.arrayid = eventData.arrayid;
    if(eventData.binaryHeapId) clickDataTarget.binaryHeapId = eventData.binaryHeapId;
      try {
        submission.addAnimationStepSuccesfully.dsClick(Object.assign(clickDataTarget, clickDataSource));
      } catch (error) {
        console.warn(`Could not set array click in animation: ${error}`);
      }
  }
}

module.exports = {
  handleArrayEvents
}

},{"../../dataStructures/dataStructures":7,"../../submission/submission":19,"../../utils/helperFunctions":21}],3:[function(require,module,exports){
const submission = require('../../submission/submission');
const helpers = require('../../utils/helperFunctions');
const dataStructures = require('../../dataStructures/dataStructures');

function handleEdgeEvents(exercise, eventData) {
  const dataStructuresState = dataStructures.getDataStructuresFromExercise(exercise);
  const clickDataSource = {
    tstamp: eventData.tstamp,
    currentStep: eventData.currentStep,
    dataStructuresState,
    animationHTML: helpers.getExerciseHTML(exercise)
    }
  switch(eventData.type) {
    case 'jsav-edge-click':
      const clickDataTarget = {
        type: 'edge-click',
        startId:  eventData.startid,
        endId:  eventData.endid,
        startValue: eventData.startvalue,
        endValue: eventData.endvalue,
        }
      try {
        submission.addAnimationStepSuccesfully.dsClick(Object.assign(clickDataTarget, clickDataSource));
      } catch (error) {
        console.warn(`Could not set node click in animation: ${error}`);
      }
  }
}

module.exports = {
  handleEdgeEvents
}

},{"../../dataStructures/dataStructures":7,"../../submission/submission":19,"../../utils/helperFunctions":21}],4:[function(require,module,exports){
const submission = require('../../submission/submission');
const modelAnswerDefinitions = require("../../definitions/model-answer/model-answer-definitions.js");

function handleModelAnswer(exercise, eventData) {
  const type = String(eventData.type.match(/model.*/))
  const currentStep = eventData.currentStep;
  switch(type) {
    case 'model-init':
      break;
    case 'model-recorded':
      break;
    default:
      if(exercise.modelDialog) {
        const newStep = {
          type,
          tstamp: eventData.tstamp || new Date(),
          currentStep,
          modelAnswerHTML: exercise.modelDialog[0].innerHTML
        };
        try {
          submission.addAnimationStepSuccesfully.modelAnswer(newStep);
        } catch (error) {
          console.warn(`Could not add model answer step to animation: ${error}`)
        }
      }
      break;
  }
}


module.exports = {
  handleModelAnswer,
}

},{"../../definitions/model-answer/model-answer-definitions.js":14,"../../submission/submission":19}],5:[function(require,module,exports){
const submission = require('../../submission/submission');
const helpers = require('../../utils/helperFunctions');
const dataStructures = require('../../dataStructures/dataStructures');

function handleNodeEvents(exercise, eventData) {
  const dataStructuresState = dataStructures.getDataStructuresFromExercise(exercise);
  const clickDataSource = {
    tstamp: eventData.tstamp,
    currentStep: eventData.currentStep,
    nodeId:  eventData.objid,
    dataStructuresState,
    animationHTML: helpers.getExerciseHTML(exercise)
    }
  switch(eventData.type) {
    case 'jsav-node-click':
      const clickDataTarget = {
        type: 'node-click',
        nodeValue: eventData.objvalue
        }
      try {
        submission.addAnimationStepSuccesfully.dsClick(Object.assign(clickDataTarget, clickDataSource));
      } catch (error) {
        console.warn(`Could not set node click in animation: ${error}`);
      }
  }
}

module.exports = {
  handleNodeEvents
}

},{"../../dataStructures/dataStructures":7,"../../submission/submission":19,"../../utils/helperFunctions":21}],6:[function(require,module,exports){
function isBinaryHeap(initialStructure) {
  return Object.keys(initialStructure).includes('_tree' && '_treenodes');
}

function getBinaryHeap(binaryHeap) {
  return {
    type: 'binaryHeap',
    id: binaryHeap.element[0].id,
    values: [ ...binaryHeap._values ],
    tree: getBinaryTree(binaryHeap),
  }
}

function getBinaryTree(binaryHeap) {
  const jsavRoot = binaryHeap._tree.rootnode;
  const rootNode = {
    id: jsavRoot.element[0].id,
    value: jsavRoot.element[0].dataset.value,
    childRole: jsavRoot.element[0].dataset.childRole,
    heapIndex: jsavRoot.element[0].dataset.jsavHeapIndex,
    valueType: jsavRoot.element[0].dataset.valueType,
    childNodes: getChildNodes(jsavRoot)
  }
  return {
    rootNode,
    id: binaryHeap._tree.element[0].id,
    root: binaryHeap._tree.element[0].dataset.root,
    values: binaryHeap._tree.element[0].innerText
  }
}

function getChildNodes(node) {
  if(!node.childnodes || node.childnodes.length == 0) {
    return;
  }
  return node.childnodes.map(node => {
    return {
      id: node.element[0].id,
      value: node.element[0].dataset.value,
      valueType: node.element[0].dataset.valueType,
      heapIndex: node.element[0].dataset.jsavHeapIndex,
      childRole: node.element[0].dataset.binchildrole,
      childPos: node.element[0].dataset.childPos,
      parent: node.element[0].dataset.parent,
      edgeToParent: getEdge(node._edgetoparent),
      childNodes: getChildNodes(node)
    }
  });
}

function getEdge(edge) {
  return {
    startNode: getNode(edge.startnode),
    endNode: getNode(edge.endnode)
  }
}

function getNode(node) {
  return {
    value: node.element[0].dataset.value,
    valueType: node.element[0].dataset.valueType,
    heapIndex: node.element[0].dataset.jsavHeapIndex,
    childRole: node.element[0].dataset.binchildrole,
    childPos: node.element[0].dataset.childPos,
    parent: node.element[0].dataset.parent,
    id: node.element[0].id
  }
}

module.exports = {
  isBinaryHeap,
  getBinaryHeap
}

},{}],7:[function(require,module,exports){
//
// dataStructures.js
//
// Support for visualizable data structures of JSAV and OpenDSA.

const binaryHeap = require('./binaryHeap/binaryHeap');
const graph = require('./graph/graph');
const list = require('./list/list');
const stack = require('./stack/stack');
const binaryTree = require('./tree/binaryTree');
const tree = require('./tree/tree');

function getDataStructuresFromExercise(exercise, passEvent) {
  const initialStructures = exercise.initialStructures;
  const dataStructures = [];
  // If initialDataStructures is an Array, it means there is more than one data structure
  if(Array.isArray(initialStructures)) {
    return initialStructures.map(ds => {
      if(passEvent) return getSingleDataStructure(ds, passEvent);
      else return getSingleDataStructure(ds);
    })
  }
  if(passEvent) return [getSingleDataStructure(initialStructures, passEvent)];
  else return [getSingleDataStructure(initialStructures)];
}

function getSingleDataStructure(initialStructure, passEvent) {
  const htmlElement = initialStructure.element[0];
  const id = (!htmlElement.id && passEvent)?
  handleMissingId(htmlElement, passEvent): htmlElement.id;
  let type =  getDataStructureType(htmlElement.className);
  if(type === 'array' && binaryHeap.isBinaryHeap(initialStructure)) {
    return binaryHeap.getBinaryHeap(initialStructure);
  }
  else if (type === 'array') {
    return {
      type,
      id,
      values: [ ...initialStructure._values ],
    }
  }
  else if (type === 'graph') {
    return graph.getGraph(initialStructure)
  }
  else if (type === 'list') {
    return list.getList(initialStructure);
  }
  else if (type === 'stack') {
    return stack.getStack(initialStructure);
  }
  else if (type === 'binarytree') {
    return binaryTree.getBinaryTree(initialStructure);
  }
  else if (type === 'tree') {
    return tree.getTree(initialStructure);
  }
  return {
    type: type,
    id
  };
}

function getDataStructureType(className) {
  const rootClassNames =
  [
    'jsavarray',
    'jsavtree',
    'jsavgraph',
    'jsavlist',
    'jsavmatrix',
    'jsavstack'
  ];
  const type = rootClassNames.find(name =>
    className.includes(name)
  )
  if(!type) {
    console.warn(
      `Data structure should have exactly one of the following class names: \n
      ${rootClassNames}\n
      Instead found:\n ${className}`
    );
    return;
  }
  // TODO: check subclasses of trees
  if(type === 'jsavtree' && className.includes('jsavbinarytree')) {
     return 'binarytree';
  }
  return type.replace('jsav','');
}

function handleMissingId(htmlElement, passEvent) {
  const tempId = `tempid-${Math.random().toString().substr(2)}`;
  htmlElement.onclick = ((clickData) => {
    passEvent({
    type: 'recorder-set-id',
    tempId: tempId,
    newId: htmlElement.id
    })
    htmlElement.onclick = null;
  });
  return tempId;
}

module.exports = {
  getDataStructuresFromExercise
}

},{"./binaryHeap/binaryHeap":6,"./graph/graph":8,"./list/list":9,"./stack/stack":10,"./tree/binaryTree":11,"./tree/tree":12}],8:[function(require,module,exports){
function getGraph(graph) {
  return {
    type: "graph",
    id: graph.element[0].id,
    nodes: getAllNodes(graph),
    edges: getAllEdges(graph)
  }
}

function getAllNodes(graph) {
  return graph._nodes.map(node => getNode(node));
}

function getAllEdges(graph) {
  return graph._alledges.map(edge => getEdge(edge));
}

function getEdge(edge) {
  return {
    startNode: getNode(edge.startnode),
    endNode: getNode(edge.endnode)
  }
}

function getNode(node) {
  return {
    value: node.element[0].dataset.value,
    valueType: node.element[0].dataset.valueType,
    id: node.element[0].id,
  }
}

module.exports = {
  getGraph,
  nodes: getAllNodes,
  edges: getAllEdges
}

},{}],9:[function(require,module,exports){
function getList(list) {
  return {
    first: getAllNodes(list._first),
    id: list.element[0].id,
    innerText: list.element[0].innerText,
    type: "list"
  }
}

function getAllNodes(node) {
  const id = node.element[0].id;
  const value = node._value || node.element[0].innerText;
  const next = node._next;
  if(!node._next) {
    return;
  }
  return {
    id,
    value,
    next: getAllNodes(node._next),
    edgeToNext: getEdge(node._edgetonext)
  }
}

function getNode(node) {
  return {
    id: node.element[0].id,
    value: node._value || node.element[0].innerText,
  }
}

function getEdge(edge) {
  return {
    startNode: getNode(edge.startnode),
    endNode: getNode(edge.endnode)
  }
}

module.exports = {
  getList
}

},{}],10:[function(require,module,exports){
function getStack(stack) {
  return {
    first: getAllNodes(stack._first),
    id: stack.element[0].id,
    innerText: stack.element[0].innerText,
    type: "stack"
  }
}

function getAllNodes(node) {
  const id = node.element[0].id;
  const value = node._value || node.element[0].innerText;
  const next = node._next;
  if(!node._next) {
    return;
  }
  return {
    id,
    value,
    next: getAllNodes(node._next),
  }
}

function getNode(node) {
  return {
    id: node.element[0].id,
    value: node._value || node.element[0].innerText,
  }
}


module.exports = {
  getStack
}

},{}],11:[function(require,module,exports){
function getBinaryTree(tree) {
  const jsavRoot = tree.rootnode;
  const rootNode = {
    id: jsavRoot.element[0].id,
    value: jsavRoot.element[0].dataset.value,
    childRole: jsavRoot.element[0].dataset.childRole,
    valueType: jsavRoot.element[0].dataset.valueType,
    childNodes: getChildNodes(jsavRoot)
  }
  return {
    rootNode,
    id: tree.element[0].id,
    root: tree.element[0].dataset.root,
    values: tree.element[0].innerText,
    type: 'binarytree'
  }
}

function getChildNodes(node) {
  if(!node.childnodes || node.childnodes.length == 0) {
    return;
  }
  return node.childnodes.map(node => {
    return {
      id: node.element[0].id,
      value: node.element[0].dataset.value,
      childRole: node.element[0].dataset.binchildrole,
      valueType: node.element[0].dataset.valueType,
      childPos: node.element[0].dataset.childPos,
      childNodes: getChildNodes(node)
    }
  });
}

module.exports = {
  getBinaryTree
}

},{}],12:[function(require,module,exports){
function getTree(tree) {
  const jsavRoot = tree.rootnode;
  const rootNode = {
    id: jsavRoot.element[0].id,
    value: jsavRoot.element[0].dataset.value,
    childRole: jsavRoot.element[0].dataset.childRole,
    valueType: jsavRoot.element[0].dataset.valueType,
    childNodes: getChildNodes(jsavRoot)
  }
  return {
    rootNode,
    id: tree.element[0].id,
    root: tree.element[0].dataset.root,
    values: tree.element[0].innerText,
    type: 'tree'
  }
}

function getChildNodes(node) {
  if(!node.childnodes || node.childnodes.length == 0) {
    return;
  }
  return node.childnodes.map(node => {
    return {
      id: node.element[0].id,
      value: node.element[0].innerText,
      childRole: node.element[0].dataset.childRole,
      valueType: node.element[0].dataset.valueType,
      edgeToParent: getEdge(node._edgetoparent),
      childNodes: getChildNodes(node)
    }
  });
}

function getEdge(edge) {
  return {
    startNode: getNode(edge.startnode),
    endNode: getNode(edge.endnode)
  }
}

function getNode(node) {
  return {
    value: node.element[0].dataset.value,
    valueType: node.element[0].dataset.valueType,
    id: node.element[0].id
  }
}

module.exports = {
  getTree
}

},{}],13:[function(require,module,exports){
const helpers = require('../utils/helperFunctions');
const submission = require('../submission/submission');
const modelAnswer = require('./model-answer/model-answer-definitions.js');

// JAAL: definitions.options
function setExerciseOptions(eventData) {
  submission.addDefinitionSuccesfully.options({
    'title': getExerciseTitle(eventData.initialHTML),
    'instructions': getExerciseInstructions(eventData.initialHTML),
  });
}

// JAAL: definitions.modelAnswer.function
function setDefinitions(exercise) {
  try {
    modelAnswer.recordModelAnswerFunction(exercise.options.model.toString());
  } catch (error) {
    console.warn(`Could not set model answer when recording animation: ${error.message}`);
    return false;
  }
  return true
}

function setFinalGrade(eventData) {
  return submission.addDefinitionSuccesfully.score({ ...eventData.score });
}

function getExerciseTitle(initialHTML) {
  let title;
  try {
    title = helpers.extractTextByTagName(initialHTML, 'h1');
  } catch (err) {
    console.warn('Could not get exercise title, was it set within the jsavcontainer div?'
    + '\nReturning empty string: ' + err);
    title = ''
  }
  return title;
}

function getExerciseInstructions(initialHTML) {
  let instructions;
  try {
    instructions = helpers.extractTextByClassName(initialHTML, 'instructions');
  } catch (err) {
    console.warn('Could not get exercise instruction, was it set within the jsavcontainer div?'
    + '\nReturning empty string: ' + err)
    instructions = '';
  }
  return instructions;
}


module.exports = {
  setExerciseOptions,
  setDefinitions,
  setFinalGrade,
  modelAnswer: {
    recordFunction: modelAnswer.recordModelAnswerFunction,
    recordStep: modelAnswer.recordModelAnswerStep,
    progress: modelAnswer.modelAnswerProgress
  }
}

},{"../submission/submission":19,"../utils/helperFunctions":21,"./model-answer/model-answer-definitions.js":14}],14:[function(require,module,exports){
//
// model-answer-definitions.js
//
// Model answer recording functionality

const submission = require('../../submission/submission');

// Adds the model answer JavaScript function as a string.
// JAAL: definitions.modelAnswer.function
function recordModelAnswerFunction(modelAnswerFunction) {
  try {
    submission.addDefinitionSuccesfully.modelAnswerFunction(modelAnswerFunction);
  } catch (error) {
    throw error;
  }
  return true;
}

// Records the current step of the model answer.
// JAAL: definitions.modelAnswer.steps[i]
// Parameters:
//     exercise: a JSAV exercise
// Returns:
//     true if the model answer step was recorded successfully, false otherwise
function recordModelAnswerStep(exercise) {
  const redoArray = exercise.modelav._redo;
  if (redoArray.length >= 0) {
    const dataStructures = dataStructuresNode(exercise);
    const operations = operationsNode(redoArray);
    const html = getModelAnswerStepHTML();
    const modelAnswerStep = {
      dataStructures,
      operations,
      html
    };
    submission.addDefinitionSuccesfully.modelAnswerStep(modelAnswerStep);
    return (redoArray.length !== 0);
  }
  return false;
}

// Records the values of the data structures
// in the current step of the model answer.
// JAAL: definitions.modelAnswer.steps[i].dataStructures
function dataStructuresNode(exercise) {
  const modelStructures = exercise.modelStructures;
  const stepDSvalues = [];
  if (Array.isArray(modelStructures)) {
    modelStructures.forEach((item) => {
      stepDSvalues.push([ ...item._values || 'undefined' ]);
    });
  } else {
    stepDSvalues.push([ ...modelStructures._values || 'undefined' ]);
  }
  return stepDSvalues;
}

// JAAL: definitions.modelAnswer.steps[i].operations
function operationsNode(redoArray) {
  if (redoArray.length === 0) {
    return []
  }
  const operations = redoArray[0].operations;
  let stepOperations = [];
  for (const op in operations) {
    stepOperations.push({
      args: getFormattedOperationArgs(operations[op].args),
      effect: operations[op].effect.toString(),
    })
  }
  return stepOperations;
}

// JAAL: definitions.modelAnswer.steps[i].operations[j].args
function getFormattedOperationArgs(args) {
  const formattedArgs = {};
  for (const arg in args) {
    formattedArgs[arg] =
      (typeof(args[arg]) !== 'object' || Array.isArray(args[arg])) ?
      args[arg] :
      `Converted to string when recording to avoid cyclic object value: ${args[arg].toString()}`
  }
  return formattedArgs;
}

// JAAL: definitions.modelAnswer.steps[i].html
function getModelAnswerStepHTML() {
  let counterHTML = $('.jsavmodelanswer .jsavcounter').html();
  let outputHTML = $('.jsavmodelanswer .jsavoutput').html();
  let canvasHTML = $('.jsavmodelanswer .jsavcanvas').html();
  return { counterHTML,  outputHTML, canvasHTML };
}

// Returns the number of the current step in the model answer slideshow
function modelAnswerProgress() {
  return submission.state().definitions.modelAnswer.steps
                   .slice(-1)[0].html.counterHTML;
}


module.exports = {
  recordModelAnswerFunction,
  recordModelAnswerStep,
  modelAnswerProgress,
}

},{"../../submission/submission":19}],15:[function(require,module,exports){
(function (global){
//
// exerciseRecorder.js
//
// This is the main module of the JSAV Exercise Recorder.

// Submodules of the JSAV Exercise Recorder.
// The program code of these modules will be included in the JSAV Exercise
// Recorder bundle file.
const submission = require('./submission/submission');
const metad_func = require('./metadata/metadata');
const def_func = require('./definitions/definitions');
const init_state_func = require('./initialState/initialState');
const anim_func = require('./animation/animation');

// Services module is not needed, because OpenDSA code will handle the
// communication to A+ LMS through mooc-grader.
//
// const services = require('./rest-service/services');

const helpers = require('./utils/helperFunctions');

//
// Starter code.
//
// This will be run when the JSAV Exercise Recorder bundle file is referred
// by a <script> tag in a HTML document.

// Global namespace. This is accessible in browser as window.JSAVrecorder.
global.JSAVrecorder = {

  // Prototype for a sendSubmission() function. This is a callback function
  // which should perform a HTTP POST request to a grader service of an LMS.
  // It must be set before the JSAV event "jsav-exercise-grade-button" is
  // triggered.
  //
  // Parameters:
  //     recording: JAAL data of the exercise
  sendSubmission: function(recording) {
    console.log("You must set JSAVrecorder.sendSubmission()!")
  }
}

let jsav = {};
let exercise = {};
let exerciseHTML = "";

// Unique address for asynchronously creating a new graded submission.
// This is defined by the A+ LMS. It is used if grading asynchronously.
// https://github.com/apluslms/a-plus/blob/master/doc/GRADERS.md
let submission_url;

// A+ LMS defines: where to post the submission.
// https://github.com/apluslms/a-plus/blob/master/doc/GRADERS.md
let post_url;

const modelAnswer = {
  opened: false,
  ready: false,
  recordingSpeed: 20,
}
Object.seal(modelAnswer);

initialize();

// End of starter code

// Initializer function.
// Binds events of type "jsav-log-event" to function passEvent() (see below).
function initialize() {
  setSubmissionAndPostUrl();
  submission.reset();
  metad_func.setExerciseMetadata(getMetadataFromURLparams())
  try {
    $(document).off("jsav-log-event");
    $(document).on("jsav-log-event",  function (event, eventData) {
      setTimeout( () => passEvent(eventData), 50);
    });
  } catch (error) {
    console.warn(error)
  }
}

// According to https://github.com/apluslms/a-plus/blob/master/doc/GRADERS.md
function setSubmissionAndPostUrl() {
  // LMS defines: used if grading asynchronously
  submission_url = new URL(location.href).searchParams.get('submission_url');
  // LMS defines: where to post the submission
  post_url = new URL(location.href).searchParams.get('post_url');
}

// According to https://github.com/apluslms/a-plus/blob/master/doc/GRADERS.md
function getMetadataFromURLparams() {
  // set in LMS
  const max_points = new URL(location.href).searchParams.get('max_points');

  // User identifier.
  // Note: when the exercise is fetched from mooc-grader instead of A+, this
  // feature is not supported.
  //const uid = new URL(location.href).searchParams.get('uid');
  const uid = 0;

  // Ordinal number of the submission which has not yet been done
  // Note: when the exercise is fetched from mooc-grader instead of A+, this
  // feature is not supported.
  //const ordinal_number = new URL(location.href).searchParams.get('ordinal_number');
  const ordinal_number = 0;

  return { max_points, uid, ordinal_number };
}

// Event handler for JSAV events.
//
// Parameters:
// eventData: { type: string,
//              exercise: JSAV exercise, ...}
function passEvent(eventData) {
  console.log('EVENT DATA', eventData);
  switch(eventData.type){
    case 'jsav-init':
      // Set exercise title and instructions
      def_func.setExerciseOptions(eventData);
      break;
    case 'jsav-recorded':
      // All steps of a JSAV slideshow have been created.
      // In practise, this means that the slideshow of the model answer has
      // been created.
      break;
    case 'jsav-exercise-init':
      // A JSAV exercise object was created.
      exercise = eventData.exercise;
      jsav = exercise.jsav;
      def_func.setDefinitions(exercise);
      // init_state_func.fixMissingIds(exercise, passEvent);
      // if(init_state_func.someIdMissing(exercise)) {
      //   init_state_func.fixMissingIds(exercise, passEvent);
      // }
      init_state_func.setInitialDataStructures(exercise, passEvent);
      init_state_func.setAnimationHTML(exercise);
      break;
    case String(eventData.type.match(/^jsav-array-.*/)):
      // JSAV Array data structure events.
      // http://jsav.io/datastructures/array/
      anim_func.handleArrayEvents(exercise, eventData);
      break;
    case String(eventData.type.match(/^jsav-node-.*/)):
      // JSAV Node data structure events
      // http://jsav.io/datastructures/common/
      anim_func.handleNodeEvents(exercise, eventData);
      break;
    case String(eventData.type.match(/^jsav-edge-.*/)):
      // JSAV Edge data structure events
      // http://jsav.io/datastructures/common/
      anim_func.handleEdgeEvents(exercise, eventData);
      break;
    case 'recorder-set-id':
      // This is fired by the initialState.js if the DS ID is set only on first click
      init_state_func.setNewId(eventData);
      break;
    case 'jsav-exercise-undo':
      // User clicks the Undo button
      setTimeout(() => anim_func.handleGradableStep(exercise, eventData), 100);
      break;
    case 'jsav-exercise-gradeable-step':
      anim_func.handleGradableStep(exercise, eventData);
      break;
    case 'jsav-exercise-model-open':
      // User clicks the Model answer button
      modelAnswer.opened = true;
      modelAnswer.ready = true;
      break;
    case 'jsav-exercise-model-init':
      if (!modelAnswer.opened) {
        exercise.modelav.SPEED = modelAnswer.recordingSpeed + 10;
        modelAnswer.ready = !def_func.modelAnswer.recordStep(exercise);
        $('.jsavmodelanswer .jsavforward').click();
        break;
      }
      break;
    case 'jsav-exercise-model-forward':
      // The Forward button of the model answer animation was clicked.
      if (!modelAnswer.opened && !modelAnswer.ready) {
        // The user had clicked Grade button. Now the model answer recording
        // is in progress.
        setTimeout(() => {
          // Record current step of model answer
          modelAnswer.ready = !def_func.modelAnswer.recordStep(exercise);
          // Trigger this click event again
          $('.jsavmodelanswer .jsavforward').click();
        }, modelAnswer.recordingSpeed);
      }
      else {
        // The user clicked Forward button in the model answer
      }
      break;
    case String(eventData.type.match(/^jsav-exercise-model-.*/)):
      // All user actions with the model answer animation
      if (modelAnswer.opened) {
        anim_func.handleModelAnswer(exercise, eventData);
      }
      break;
    case 'jsav-exercise-grade-button':
      // User clicks the Grade button
      break;
    case 'jsav-exercise-grade':
      // Automatic grading of the exercise has finished
      if(!modelAnswer.opened) {
        const popUpText = `Recording model answer steps\n ${def_func.modelAnswer.progress()}`;
        const popUp = helpers.getPopUp(popUpText);
        $('body').append(popUp);
      }
      finish(eventData);
      break;
    case 'jsav-exercise-reset':
      // User clicks the Reset button
      console.warn('Resetting submission');
      submission.reset();
      break;
    default:
      console.warn('UNKNOWN EVENT', eventData);
  }
}

// Finishes the recording: forwards model answer and records its steps.
// Note: recursive, asynchronous; uses setTimeout() to call itself.
function finish(eventData) {
  if (modelAnswer.ready) {
    anim_func.handleGradeButtonClick(eventData);
    //def_func.setFinalGrade(eventData) && services.sendSubmission(submission.state(), post_url);
    def_func.setFinalGrade(eventData);
    JSAVrecorder.sendSubmission(submission.state())

    submission.reset();
    if (!modelAnswer.opened) {
      $('#popUpDiv').remove();
    }

    // Is this really needed?
    //$(document).off("jsav-log-event");

  } else {
    $('#popUpContent').text(`Recording model answer steps\n ${def_func.modelAnswer.progress()}`);
    setTimeout(() => finish(eventData), modelAnswer.recordingSpeed);
  }
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./animation/animation":1,"./definitions/definitions":13,"./initialState/initialState":16,"./metadata/metadata":17,"./submission/submission":19,"./utils/helperFunctions":21}],16:[function(require,module,exports){
const recorder = require('../exerciseRecorder');
const submission = require('../submission/submission');
const helpers = require('../utils/helperFunctions');
const dataStructures = require('../dataStructures/dataStructures');

function setInitialDataStructures(exercise, passEvent) {
  const initialStructures = exercise.initialStructures;
  dataStructures.getDataStructuresFromExercise(exercise,passEvent).forEach(ds => {
    submission.addInitialStateSuccesfully.dataStructure(ds);
  });
}

function moreThanOneDs(initialStructures) {
  return Array.isArray(initialStructures);
}

// function someIdMissing(exercise) {
//   const initialStructures = exercise.initialStructures;
//   // If initialDataStructures is an Array, it means there is more than one data structure
//   if(Array.isArray(initialStructures)) {
//     initialStructures.forEach(ds => {
//       const htmlElement = ds.element['0'];
//       if(!htmlElement.id) return true;
//     })
//     return false;
//   }
//   return !!initialStructures.element['0'].id;
// }

// function fixMissingIds(exercise, passEvent) {
//   const initialStructures = exercise.initialStructures;
//   if(Array.isArray(initialStructures)) {
//     initialStructures.map(ds => {
//       const htmlElement = ds.element['0'];
//       if(!htmlElement.id) handleMissingId(htmlElement, passEvent);
//     })
//   } else {
//     const htmlElement = initialStructures.element['0'];
//     if(!htmlElement.id) handleMissingId(htmlElement, passEvent);
//   }
// }

function handleMissingId(htmlElement, passEvent) {
  tempId = `tempid-${Math.random().toString().substr(2)}`;
  htmlElement.onclick = ((clickData) => {
    passEvent({
    type: 'recorder-set-id',
    tempId: tempId,
    newId: htmlElement.id
    })
    htmlElement.onclick = null;
  });
  return tempId;
}

function getDataStructureOptions(options) {
  const filteredOptions = {};
  for(const key in options) {
    const option = options[key];
    if(typeof(option) === 'function') {
      filteredOptions[key] = option.name;
    } else if (typeof(option) !== 'object') {
      filteredOptions[key] = option;
    }
  }
  return filteredOptions;
}

function setNewId(eventData) {
  const initialState = submission.state().initialState;
  const dsIndex = initialState.dataStructures.findIndex(ds => ds.id === eventData.tempId);
  if(dsIndex >= 0) {
    submission.addInitialStateSuccesfully.setDsId(dsIndex, eventData.newId);
  }
}

function setAnimationHTML(exercise) {
  const html = helpers.getExerciseHTML(exercise);
  submission.addInitialStateSuccesfully.animationHTML(html);
}

module.exports = {
  // fixMissingIds,
  setInitialDataStructures,
  setNewId,
  setAnimationHTML,
  // someIdMissing,
}

},{"../dataStructures/dataStructures":7,"../exerciseRecorder":15,"../submission/submission":19,"../utils/helperFunctions":21}],17:[function(require,module,exports){
const submission = require('../submission/submission');

function setExerciseMetadata(metadata) {
  return submission.addMetadataSuccesfully(metadata);
  }


module.exports = {
  setExerciseMetadata
}

},{"../submission/submission":19}],18:[function(require,module,exports){
//
// helpers.js
//
// Helper functions for

// TODO: add check to avoid endless loop
function copyObject(obj) {
  const copy = {};
  for(let k in obj) {
    if(Array.isArray(obj[k])) {
      copy[k] = [ ...obj[k] ];
      continue;
    }
    if(typeof(k) === "object") {
      copyObject(obj[k]);
      continue;
    }
    copy[k] = obj[k];
  }
  return copy;
}

// TODO: break objectIsNotEmpthy method down
function objectIsNotEmpthy(object) {
  if (typeof(object) !== "object") {
    throw new Error(`Given parameter should be of type \"object\": ${JSON.stringify(object)}`);
  }
  if (Object.keys(object).length === 0) {
    throw new Error(`Object can not be empthy: ${JSON.stringify(object)}`);
  }
  if(object === undefined) {
    throw new Error(`value is undefined: ${JSON.stringify(object)}`);
  }
  if(object === null) {
    throw new Error(`value is null: ${JSON.stringify(object)}`);
  }
  return true;
}

function objectIsNotArray(object) {
  if (Array.isArray(object)) {
    throw new Error(`Object can not be an array: ${JSON.stringify(object)}`);
  }
  if (typeof(object) !== "object") {
    throw new Error(`Given parameter should be of type \"object\": ${JSON.stringify(object)}`);
  }
  return true;
}

function doesNotContainObjects(object) {
  for(let k in object) {
    if (typeof(object[k]) === "object" && object[k] !== null) {
      throw new Error(`Object can not contain other objects: ${JSON.stringify(object)}`);
    }
    else if(object[k] === null) console.warn(`Object ${k} is null`);
  }
  return true;
}

function isValidString(string) {
  if(typeof(string) !== 'string') {
    throw new Error(`value should be a string: ${string}`);
  }
  if(string === undefined) {
    throw new Error(`value is undefined: ${string}`);
  }
  if(string === null) {
    throw new Error(`value is null: ${string}`);
  }
  return true;
}

function isNumber(num) {
  if(isNaN(num)) {
    throw new Error(`value should be a number: ${num}`);
  }
  return true;
}

module.exports = {
  copyObject,
  objectIsNotEmpthy,
  objectIsNotArray,
  doesNotContainObjects,
  isValidString,
  isNumber
}

},{}],19:[function(require,module,exports){
//
// submission.js
//
// This module contains data structures and functions for the exercise
// recording in JAAL format.
//
const helpers = require('./helpers');
const valid = require('./validate');

// TODO: set all try catch statements

//
// Basic structure of the exercise recording.
// Format: JAAL (JSON Algorithm Animation Language).
//
const submission =  {
  metadata: {},
  definitions: {
    style: {},
    score: {},
    options: {},
    modelAnswer: {
      function: "",
      steps: []
    },
  },
  initialState: {
    dataStructures: [],
    animationHTML: ""
  },
  animation: []
};

Object.seal(submission);
Object.seal(submission.definitions);

function reset() {
  submission.metadata = {};
  submission.definitions = {
    style: {},
    score: {},
    options: {},
    modelAnswer: {
      function: "",
      steps: []
    },
  };
  submission.initialState = {
    dataStructures: [],
    animationHTML: ""
  };
  submission.animation = [];
}

function state() {
  const metadata = helpers.copyObject(submission.metadata);
  const definitions = helpers.copyObject(submission.definitions);

  // TODO: change to support new DSs
  const initialState = {
    dataStructures: submission.initialState.dataStructures.map(ds => helpers.copyObject(ds)),
    animationHTML: submission.initialState.animationHTML
  }
  const animation = submission.animation.map(a => helpers.copyObject(a));
  return {
    metadata,
    definitions,
    initialState,
    animation
  };
}

function stateAsJSON() {
  return JSON.stringify(submission);
}

function addMetadataSuccesfully(metadata) {
  if(valid.metadata(metadata)) {
    submission.metadata = { ...metadata };
    return true;
  }
  return false;
}

function addStyle(style) {
  if (valid.style(style)) {
    submission.definitions.style = { ...style };
    return true;
  }
  return false;
}

function addScore(score) {
  if (valid.score(score) && exerciseIsInitialized()) {
    submission.definitions.score = { ...score };
    return true;
  }
  return false;
};

function addOptions(options) {
  if(valid.options(options)) {
    submission.definitions.options = { ...options };
    return true;
  }
  return false;
}

function addModelAnswerFunction(modelAnswerFunction) {
  if (valid.modelAnswerFunction(modelAnswerFunction)) {
    submission.definitions.modelAnswer.function = modelAnswerFunction;
    return true;
  }
  return false;
}

function addModelAnswerStep(step) {
  if(valid.modelAnswerStep(step)) {
    submission.definitions.modelAnswer.steps.push(step);
    return true;
  }
  return false;
}


function addDataStructure(ds) {
  if(valid.dataStructure(ds)) {
    submission.initialState.dataStructures.push(ds);
    return true;
  }
  return false;
}

function addAnimationHTML(html) {
  if(valid.animationHTML(html)) {
    submission.initialState.animationHTML = html;
    return true;
  }
  return false;
}

function setDsId(dsIndex, dsId) {
  if(valid.dsId(dsId)) {
    submission.initialState.dataStructures[dsIndex].id = dsId;
    return true;
  }
  return false;
}

function addDsClick(data) {
  if(valid.dsClick(data) && exerciseIsInitialized()) {
    submission.animation.push(data);
    return true;
  }
  return false;
}

function addGradableStep(data) {
  if (valid.gradableStep(data) && exerciseIsInitialized()) {
    submission.animation.push(data);
    return true;
  }
  return false;
}

function addGradeButtonClick(data) {
  if(valid.gradeButtonClick(data) && exerciseIsInitialized()) {
    submission.animation.push(data);
    return true;
  }
  return false;
}

function addWatchedModelAnswerStep(data) {
  if(valid.watchedModelAnswerStep(data) && exerciseIsInitialized()) {
    submission.animation.push(data);
    return true;
  }
  return false;
}

function checkAndFixLastAnimationStep() {
  try {
    let animation = submission.animation
    let lastIndex = animation.length -1
    let lastStep = animation[lastIndex]
    if(lastStep.type === 'model-recorded') {
      submission.animation.pop();
    }
  } catch (error) {
    console.warn(`Could not remove model answer from last animation step: ${error}`)
    return false;
  }
  return true;
}

function exerciseIsInitialized() {
  if(submission.initialState.animationHTML.length === 0){
    let message = 'Animation initialization data is missing.\n'
    + 'Exercise is not being recorded for animation: '
    + 'did the exercise emit javas-exercise-init event?'
    + '\nIf you are submitting again the same exercise, try first reloading the page'
    console.warn(message);
    return false;
  }
  return true;
}

const addDefinitionSuccesfully = {
  style: addStyle,
  score: addScore,
  options: addOptions,
  modelAnswerFunction: addModelAnswerFunction,
  modelAnswerStep: addModelAnswerStep,
};

const addInitialStateSuccesfully = {
  dataStructure: addDataStructure,
  setDsId,
  animationHTML: addAnimationHTML,
};

const addAnimationStepSuccesfully = {
  dsClick: addDsClick,
  gradableStep: addGradableStep,
  gradeButtonClick: addGradeButtonClick,
  modelAnswer: addWatchedModelAnswerStep
};


module.exports = {
  reset,
  state,
  stateAsJSON,
  addMetadataSuccesfully,
  addDefinitionSuccesfully,
  addInitialStateSuccesfully,
  addAnimationStepSuccesfully,
  checkAndFixLastAnimationStep
}

},{"./helpers":18,"./validate":20}],20:[function(require,module,exports){
//TODO: set all try catch statements

const helpers = require('./helpers.js');

function validateOptions(option) {
  try {
    const notEmpthy = helpers.objectIsNotEmpthy(option);
    const notArray = helpers.objectIsNotArray(option);
    const noInnerObjects = helpers.doesNotContainObjects(option);
  } catch (err) {
    console.warn('Exercise Recorder, validating options', err);
    return false;
  }
  return true;
}

function validateMetadata(metadata) {
  try {
    const notEmpthy = helpers.objectIsNotEmpthy(metadata);
    const notArray = helpers.objectIsNotArray(metadata);
    const noInnerObjects = helpers.doesNotContainObjects(metadata);
  } catch (err) {
    console.warn('Exercise Recorder, validating metadata', err);
    return false;
  }
  return true;
}

function validateStyle(style) {
  // TODO: implement validateStyle
  return true;
}

function validateScore(score) {
  try {
    const notEmpthy = helpers.objectIsNotEmpthy(score);
    const notArray = helpers.objectIsNotArray(score);
    const noInnerObjects = helpers.doesNotContainObjects(score);
  } catch (err) {
    console.warn('Exercise Recorder, validating score', err);
    return false;
  }
  return true;
}

function validateModelAnswerFunction(modelAnswer) {
  try {
    helpers.isValidString(modelAnswer);
  } catch (err) {
    console.warn('Exercise Recorder, validating model answer function as string', err);
    return false
  }
  return true;
}

function validateModelAnswerStep(step) {
  const validDataStructures = step.dataStructures.every( ds => validateDataStructure(ds));
  const validOperations = validateModelAnswerStepOperations(step.operations);
  const validHTML = validateModelAnswerStepHTML(step.html);
  return validDataStructures && validOperations && validHTML;
}

function validateDataStructure(ds) {
  try {
    helpers.objectIsNotEmpthy(ds);
  } catch (err) {
    console.warn('Exercise Recorder, validating data structure', err);
    return false;
  }
  return true;
}

function validateModelAnswerStepHTML(data) {
  try {
    helpers.isValidString(data.counterHTML);
    helpers.isValidString(data.outputHTML);
    helpers.isValidString(data.canvasHTML);
  } catch (err) {
    console.warn(`Exercise Recorder, validating model answer HTML`, err);
    return false;
  }
  return true;
}

function validateModelAnswerStepOperations(stepOperations) {
  if (Array.isArray(stepOperations)){
    return true;
  }
  console.warn('Exercise Recorder, validating model answer step operations. It must be an array.');
  return false;
}

function validateDsId(dsId) {
  try {
    helpers.isValidString(dsId);
  } catch (err) {
    console.warn('Exercise Recorder, validating data structure id', err);
    return false;
  }
  return true;
}

function validateAnimationHTML(html) {
  try {
    helpers.isValidString(html);
  } catch (err) {
    console.warn('Exercise Recorder, validating animation HTML', err);
    return false
  }
  return true;
}

function validateDsClick(click) {
  try {
    helpers.objectIsNotEmpthy(click);
  } catch (err) {
    console.warn('Exercise Recorder, validating data structure click', err);
    return false;
  }
  return true;
}

function validateGradableStep(data) {
  try {
    helpers.objectIsNotEmpthy(data);
  } catch (err) {
    console.warn('Exercise Recorder, validating gradable step', err);
    return false;
  }
  return true;
}

function validateWatchedModelAnswerStep(data) {
  try {
    helpers.isValidString(data.type);
    helpers.isValidString(data.tstamp);
    helpers.isValidString(data.modelAnswerHTML);
    helpers.isNumber(data.currentStep);
  } catch (err) {
    console.warn(`Exercise Recorder, validating watched model answer step`, err);
    return false;
  }
  return true;
}

function validateGradeButtonClick(data) {
  // TODO: validateGradeButtonClick
  return true;
}

module.exports = {
  metadata: validateMetadata,
  style: validateStyle,
  score: validateScore,
  options: validateOptions,
  modelAnswerFunction: validateModelAnswerFunction,
  modelAnswerStep: validateModelAnswerStep,
  dataStructure: validateDataStructure,
  dsClick: validateDsClick,
  animationHTML: validateAnimationHTML,
  gradableStep: validateGradableStep,
  gradeButtonClick: validateGradeButtonClick,
  watchedModelAnswerStep: validateWatchedModelAnswerStep,
  dsId: validateDsId,
}

},{"./helpers.js":18}],21:[function(require,module,exports){
// Takes a string containing an html element
function extractTextByClassName(html, className){
  let text;
  try {
    let doc = (new DOMParser()).parseFromString(removeTrimLineBreaks(html), 'text/html');
    text = doc.getElementsByClassName('instructions')[0].innerHTML;
  } catch (err) {
    throw new Error('Failed to extract text: ' + err)
  }
  return text;
}

// Takes a string containing an html element
function extractTextByTagName(html, tagName){
  let text;
  try {
    let doc = (new DOMParser()).parseFromString(removeTrimLineBreaks(html), 'text/html');
    text = doc.getElementsByTagName(tagName)[0].innerHTML;
  } catch (err) {
    throw new Error('Failed to extract text: ' + err)
  }
  return text;
}

function removeTrimLineBreaks(string){
  return string.split(/\r?\n|\r/g).map(e => e.trim()).join('');
}

function getExerciseHTML(exercise) {
  return exercise.jsav.container[0].innerHTML;
}

function getPopUp(text) {
  const modalDivStyle = {
    width: "100%",
    height: "100%",
    zIndex: 1,
    display: 'block',
    position: 'fixed',
    left: 0,
    top: 0,
    overflow: 'auto',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingTop: '100px',
  }
  const modalContentStyle = {
    textAlign: 'center',
    backgroundColor: '#fefefe',
    margin: 'auto',
    padding: '20px',
    border: '1px solid #888',
    width: '80%'
  }
  const popUpDiv = document.createElement('div');
  popUpDiv.id = "popUpDiv";
  const contentDiv = document.createElement('div');
  contentDiv.id = 'popUpContent';
  popUpDiv.appendChild(contentDiv);
  contentDiv.innerText = text;
  for(key in modalDivStyle) {
    popUpDiv.style[key] = modalDivStyle[key];
  }
  for(key in modalContentStyle) {
    contentDiv.style[key] = modalContentStyle[key];
  }
  return popUpDiv;
}


const helpers = {
  extractTextByClassName,
  extractTextByTagName,
  getExerciseHTML,
  getPopUp
}

module.exports = helpers;

},{}]},{},[15]);
