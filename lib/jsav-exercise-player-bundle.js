(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const { DOMAnimation } = require('./animation.js');
const { DOMSlideShow } = require('./slideShow.js');

function initializeSlideShow(initialStateHTML, animationSteps, canvas) {
  try {
    $('#to-beginning').off('click');
    $('#step-backward').off('click');
    $('#step-forward').off('click');
    $('#to-end').off('click');
  } catch (err) {
    console.warn(`Error when setting listeners for slideshow: ${err}`);
  }
  try {
    var slideShow = new DOMSlideShow(initialStateHTML, animationSteps, canvas);
  } catch (err) {
    console.warn(`Error when initializing slideshow: ${err}`);
  }
  try {
    $('#to-beginning').on('click', () => slideShow.reset());
    $('#step-backward').on('click', () => slideShow.backward());
    $('#step-forward').on('click', () => slideShow.forward());
    $('#to-end').on('click', () => slideShow.toEnd());
  } catch (err) {
    console.warn(`Error when setting listeners for slideshow: ${err}`);
  }
}

function initializeAnimation(initialStateHTML, animationSteps, canvas) {
  const $playPauseButton = $("#play-pause-button");
  const $stopButton = $("#stop-button");
  const $speedInput = $('#speed');
  $playPauseButton.off('click');
  $stopButton.off('click');
  $speedInput.off('click');
  try {
    var animation = new DOMAnimation(initialStateHTML, animationSteps, canvas);
  } catch (err) {
    console.warn(`Error when initializing animation: ${err}`);
  }
  try {
    $playPauseButton.on('click', () => {
      if(animation.isPaused()) animation.play($speedInput);
      else animation.pause();
      $playPauseButton.toggleClass("pause");
    });
    $stopButton.on('click', () => {
      animation.stop();
      $playPauseButton.removeClass("pause");
      $('#to-beginning').click();
    });
  } catch (err) {
    console.warn(`Error when setting listeners for animation: ${err}`);
  }
}

module.exports = {
  initializeSlideShow,
  initializeAnimation
}

},{"./animation.js":2,"./slideShow.js":4}],2:[function(require,module,exports){
class DOMAnimation {
  stepCount = 0;
  paused = true;
  constructor(initialStateHTML, animationSteps, canvas) {
    this.initialStateHTML = initialStateHTML;
    this.animationSteps = animationSteps;
    this.canvas = canvas;
  }

  isPaused() {
    return this.paused;
  }

  play($speedInput) {
    if(!this.paused) this.stop();
    this.paused = false;
    this.interval = setInterval(() => this.stepForward(), $speedInput.val()*-1)
  }

  stepForward() {
    if (this.stepCount < this.animationSteps.length) {
      this.setCanvas()
      this.stepCount++;
    } else {
      clearInterval(this.interval);
      this.canvas.animationCanvas.innerHTML = '<h3>Ended</h3>';
    }
  }

  pause() {
    clearInterval(this.interval);
    this.paused = true;
  }

  stop() {
    clearInterval(this.interval);
    this.paused = true;
    this.stepCount = 0;
    this.canvas.animationCanvas.innerHTML = this.initialStateHTML;
  }

  setCanvas() {
    if(this.animationSteps[this.stepCount].type.includes('model')) {
      this.canvas.modelAnswerCanvas.innerHTML = this.animationSteps[this.stepCount].modelAnswerHTML;
    } else {
      this.canvas.animationCanvas.innerHTML = this.animationSteps[this.stepCount].animationHTML;
    }
  }

}

module.exports = {
  DOMAnimation
}

},{}],3:[function(require,module,exports){
const { DOMAnimation } = require('./animation.js');
const { DOMSlideShow } = require('./slideShow.js');

function initializeSlideShow(initialStateHTML, animationSteps, canvas) {
  try {
    var slideShow = new DOMSlideShow(initialStateHTML, animationSteps, canvas);
  } catch (err) {
    console.warn(`Error when initializing slideshow: ${err}`);
  }
  try {
    $('#model-answer-to-beginning').on('click', () => slideShow.reset());
    $('#model-answer-step-backward').on('click', () => slideShow.backward());
    $('#model-answer-step-forward').on('click', () => slideShow.forward());
    $('#model-answer-to-end').on('click', () => slideShow.toEnd());
  } catch (err) {
    console.warn(`Error when setting listeners for slideshow: ${err}`);
  }
}

function initializeAnimation(initialStateHTML, animationSteps, canvas) {
  const $playPauseButton = $("#model-answer-play-pause-button");
  const $stopButton = $("#model-answer-stop-button");
  const $speedInput = $('#speed');
  try {
    var animation = new DOMAnimation(initialStateHTML, animationSteps, canvas);
  } catch (err) {
    console.warn(`Error when initializing animation: ${err}`);
  }
  try {
    $playPauseButton.on('click', () => {
      if(animation.isPaused()) animation.play($speedInput);
      else animation.pause();
      $playPauseButton.toggleClass("pause");
    });
    $stopButton.on('click', () => {
      animation.stop();
      $playPauseButton.removeClass("pause");
      $('#model-answer-to-beginning').click();
    });
  } catch (err) {
    console.warn(`Error when setting listeners for animation: ${err}`);
  }
}

module.exports = {
  initializeSlideShow,
  initializeAnimation
}

},{"./animation.js":2,"./slideShow.js":4}],4:[function(require,module,exports){
class DOMSlideShow {
  stepCount = -1;
  constructor(initialStateHTML, animationSteps, canvas) {
    this.initialStateHTML = initialStateHTML;
    this.animationSteps = animationSteps;
    this.canvas = canvas;
  }

  backward() {
    if (this.stepCount > 0 && this.animationSteps.length > 0) {
      this.stepCount--;
      this.setCanvas();
    } else {
      this.reset();
    }
  }

  forward() {
    if (this.stepCount < this.animationSteps.length -1) {
      this.stepCount++;
      this.setCanvas();
    } else {
      this.canvas.animationCanvas.innerHTML = '<h3>Ended</h3>';
    }
  }

  toEnd() {
    if (this.animationSteps.length > 0) {
      this.stepCount = this.animationSteps.length -1;
      this.setCanvas();
    } else {
      this.reset();
    }
  }

  reset() {
    this.stepCount = -1;
    this.canvas.animationCanvas.innerHTML = this.initialStateHTML;
  }

  setCanvas() {
    if(this.animationSteps[this.stepCount].type.includes('model')) {
      this.canvas.modelAnswerCanvas.innerHTML = this.animationSteps[this.stepCount].modelAnswerHTML;
    } else {
      this.canvas.animationCanvas.innerHTML = this.animationSteps[this.stepCount].animationHTML;
    }
  }

}

module.exports = { DOMSlideShow }

},{}],5:[function(require,module,exports){
function jsonToHTML(input) {
  return (show) => {
    return (htmlToString) => {
      const json = parseInput(input);
      const display = show ? 'block' : 'none';
      const repSm = /</gi;
      const repGt = />/gi;
      const htmlArray = [`<ul style="display:${display}">`];
      for( let [key, value] of Object.entries(json)) {
        if(typeof(value) === 'object' && Object.keys(value).length > 0) {
          htmlArray.push(`<li>${key}:<span class="clickable" style="cursor: pointer">+</span>`)
          htmlArray.push(jsonToHTML(value)(false)(htmlToString));
        } else {
          let content;
          if(Array.isArray(value)) {
            content = '[]'
          } else if(typeof(value) === 'object') {
            content = '{}'
          } else {
            const formattedContent = (typeof(value) === 'string' && htmlToString) ? value.replace(repSm, '&lt;').replace(repGt, '&gt;') : value;
            content = getFinalContent(formattedContent);
          }
          htmlArray.push(`<li>${key}: ${content}</li>`)
        }
      }
      htmlArray.push('</ul>')
      return htmlArray.flat().join('');
    }
  }
}

function getFinalContent(formattedContent) {
  if(formattedContent.length < 50 || typeof(formattedContent) == 'number') {
    return `<span>${formattedContent}</span>`;
  }
  return `<span class="clickable" style="cursor: pointer">+</span><pre style="display:none">${formattedContent}</pre>`;
}

function parseInput(input) {
  try {
    var json = typeof(input) === 'string' ? JSON.parse(input) : input
  } catch (err) {
    console.log(input);
    throw err;
  }
  return json;
}

function setClickListeners() {
  const clickableElements = document.getElementsByClassName('clickable');
  Array.from(clickableElements).forEach( el => {
    el.onclick = () => {
      const node = el.nextSibling;
      if(node.style && node.style.display == 'none') {
        node.style.display = 'block';
        el.innerText = ' -'
      } else if(node.style && node.style.display == 'block') {
        node.style.display = 'none';
        el.innerText = '+'
      }
    };
  })
}

if(typeof(module) !== undefined) {
  module.exports = {
    jsonToHTML,
    setClickListeners
  }
}

},{}],6:[function(require,module,exports){
const { DOMAnimation } = require('./animation/animation.js');
const { DOMSlideShow } = require('./animation/slideShow.js');
const animationView = require('./animation/animation-view.js');
const modelAnswerView = require('./animation/model-answer-view.js');
const jsonViewer = require('./json-viewer/index');

initialize();

async function initialize() {
  try {
  } catch (err) {
    console.warn(`Failed setting button images: ${err}`);
  }
  try {
    // let submission = await getSubmission();
    if (submission && Object.keys(submission).length > 0) {
      initializeAnimationView(submission, false);
      initializeModelAnswerView(submission);
      setClickHandlers(submission)
    } else {
      console.warn('No animation data received')
    }
  } catch (err) {
    console.warn(err)
  }
}

async function getSubmission() {
  try {
    const parsedUrl = new URL(window.location.href);
    const submissionUrl = parsedUrl.searchParams.get("submission");
    const response = await fetch(submissionUrl)
    const submission = response.json();
    return submission;
  } catch (err) {
    throw new Error(`Failed getting submission from address ${submissionUrl}: ${err}`)
  }
}

function initializeAnimationView(submission, detailed) {
  const initialStateHTML = submission.initialState.animationHTML;
  const animationSteps = getAnimationSteps(submission,detailed);
  const canvas = {
    animationCanvas: $('#animation-container')[0],
    modelAnswerCanvas: $('#model-answer-container')[0]
  }
  canvas.animationCanvas.innerHTML = initialStateHTML;
  animationView.initializeSlideShow(initialStateHTML, animationSteps, canvas);
  animationView.initializeAnimation(initialStateHTML, animationSteps, canvas);
}

function initializeModelAnswerView(submission) {
  const modelAnswer = submission.definitions.modelAnswer;
  if (modelAnswer.steps.length > 0) {
      var initialStateHTML = getModelAnserInitialHTML(modelAnswer);
  } else {
    $('#model-answer-container').html('<h3>No model answer data</h3>');
    return;
  }
  const animationSteps = getModelAnswerSteps(modelAnswer);
  const canvas = {
    animationCanvas: $('#model-answer-container')[0],
    modelAnswerCanvas: {}
  }
  canvas.animationCanvas.innerHTML = initialStateHTML;
  modelAnswerView.initializeSlideShow(initialStateHTML, animationSteps, canvas);
  modelAnswerView.initializeAnimation(initialStateHTML, animationSteps, canvas);
}

function getAnimationSteps(submission, detailed) {
  try {
    var gradableSteps = submission.animation.filter(step => step.type === 'gradeable-step');
    var allSteps = submission.animation.filter(step => !step.type.includes('grad'));;
  } catch (err) {
    console.warn(`Failed getting animation steps: ${err}`);
  }
  return detailed? allSteps : gradableSteps;
}

function getModelAnserInitialHTML(modelAnswer) {
  const counterHTML = modelAnswer.steps[0].html.counterHTML;
  const outputHTML = modelAnswer.steps[0].html.outputHTML;
  const canvasHTML = modelAnswer.steps[0].html.canvasHTML;
  return counterHTML + outputHTML + canvasHTML;
}

function getModelAnswerSteps(modelAnswer) {
  const animationSteps = modelAnswer.steps.map((step, i) => {
    animationHTML = step.html.counterHTML + step.html.outputHTML + step.html.canvasHTML;
    return { type: '', animationHTML };
  });
  animationSteps.shift();
  return animationSteps;
}

function setClickHandlers(submission) {
  $('#compare-view-button').on('click', (event) => {
    event.target.toggleAttribute('disabled');
    $('#detailed-view-button').attr({'disabled': false});
    $('.detailed-view').toggle();
    $('.compare-view').toggle();
    $('.model-answer-view > .view-control').toggle();
    $('#animation-container').html('');
    initializeAnimationView(submission,false);
    initializeModelAnswerView(submission);
  });

  $('#detailed-view-button').on('click', (event) => {
    event.target.toggleAttribute('disabled');
    $('.detailed-view').toggle();
    $('.compare-view').toggle();
    $('.model-answer-view > .view-control').toggle();
    $('#compare-view-button').attr({'disabled': false});
    $('#model-answer-container').html('<h3>Model answer steps visulized during the exercise</h3>');
    $('#animation-container').html('');
    initializeAnimationView(submission,true);
  });

  $('#compare-view-to-beginning').on('click', () => {
    $('#to-beginning').click();
    $('#model-answer-to-beginning').click();
  });
  $('#compare-view-step-backward').on('click', () => {
    $('#step-backward').click();
    $('#model-answer-step-backward').click();
  });
  $('#compare-view-step-forward').on('click', () => {
    $('#step-forward').click();
    $('#model-answer-step-forward').click();
  });
  $('#compare-view-to-end').on('click', () => {
    $('#to-end').click();
    $('#model-answer-to-end').click();
  });

  $('#compare-view-play-pause-button').on('click', () => {
    $('#play-pause-button').click();
    $('#model-answer-play-pause-button').click();
  });
  $('#compare-view-stop-button').on('click', () => {
    $('#stop-button').click();
    $('#model-answer-stop-button').click();
  });

  $('#jaal').on('click', () => showJaal(submission));
  $('#export').on('click', () => exportAnimation());
}

function exportAnimation() {
  const iframe = `<iframe src=${window.location.href}</iframe>`
  const modalContent = `Add this iframe to an HTML document to import the animation: \n${iframe}`;
  useModal(modalContent);
}

function showJaal(submission) {
  const modal = $('#myModal');
  modal.css('display', 'block');
  $('#show-jaal').on('click', () => {
    const htmlToString = $('#html-to-string').prop('checked');
    const modalContent = jsonViewer.jsonToHTML(submission)(true)(htmlToString);
    $("#modal-content").html(modalContent);
    jsonViewer.setClickListeners();
  })
  const close = $('.close');
  close.on('click', () => modal.css('display', 'none'));
}

module.exports = {
  initialize
}

},{"./animation/animation-view.js":1,"./animation/animation.js":2,"./animation/model-answer-view.js":3,"./animation/slideShow.js":4,"./json-viewer/index":5}]},{},[6]);
