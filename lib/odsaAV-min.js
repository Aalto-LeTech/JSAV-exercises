"use strict";
/*global alert: true, console: true, ODSA, PARAMS, JSAV_OPTIONS, JSAV_EXERCISE_OPTIONS, MathJax */

/**
 * This file constitutes the AV and exercise component of the OpenDSA framework
 * It is responsible for:
 *
 *   1) Initializing certain global variables such as ODSA.SETTINGS.AV_NAME
 *
 *   2) Defining generalized utility functions used by multiple AVs / exercises
 *
 *   3) Automatically handling some common AV behavior
 *        - Displays a message that user's can no longer receive credit for an
 *          exercise after viewing the model answer
 *
 *   4) Automatically logging most actions taken within an AV
 *        - Sends log information to the parent page or submits its own logging
 *          data (unless overridden by a URL configuration parameter)
 *
 * This file should only be referenced by AVs and non-Khan Academy exercises (not modules)
 *
 * DEPENDENCIES:
 *   - odsaUtils.js must be included before this file
 *     - Ensures the proper namespaces exist (i.e. window.console, ODSA, ODSA.SETTINGS, ODSA.UTILS)
 *     - Parses URL parameters, initializes the PARAMS object, and automatically sets some specific global variables
 *
 * Author: Dan Breakiron
 * Last Modified: 2014-09-19
 */

(function($) {
  // Provide a warning that behavior is undefined if odsaUtils.js is not included
  if (typeof ODSA === "undefined" || typeof ODSA.SETTINGS === "undefined") {
    console.warn("odsaUtils.js must be included before odsaAV.js to ensure proper functionality");
  }

  //*****************************************************************************
  //*************                  GLOBAL VARIBALES                 *************
  //*****************************************************************************

  var seed = PARAMS.seed || Math.floor(Math.random() * 99999999999999).toString();

  /**
   * Local settings object that makes it easier to access ODSA.SETTINGS and
   * allows better minification
   */
  var settings = ODSA.SETTINGS;
  ODSA.SETTINGS.MODULE_ORIGIN = "*";

  /**
   * Local odsaUtils object that makes it easier to access ODSA.UTILS and
   * allows better minification
   */
  var odsaUtils = ODSA.UTILS;

  /**
   * A timestamp when the user started looking at the page
   */
  var focusTime = +new Date();

  /**
   * The total amount of time the user has spent on the current exercise instance
   */
  var totalTime = 0;

  /**
   * Stores the empty contents of the avcontainer, used for reset
   */
  var emptyContent = '';

  /**
   * A flag used to indicate that the user cannot receive credit for the
   * current exercise instance after viewing the model answer
   */
  var allowCredit = true;

  /**
   * A unique instance identifier, used to group interaction events from a single instance
   */
  var uiid = +new Date();

  /**
   * Controls whether the AV submits its own event data or allows its parent page to handle event data
   */
  var selfLoggingEnabled = PARAMS.selfLoggingEnabled === 'false' ? false : true;

  //*****************************************************************************
  //*************                    AV FUNCTIONS                   *************
  //*****************************************************************************

  /**
   * Facilitates dynamic iFrame resizing by sending the size of the page to the parent page
   */
  function sendResizeMsg() {
    // wait a while in case the exercise is rendering
    setTimeout(function() {
      // try to find the container for the whole exercise
      var $jsavContainer = $("#container");

      if ($jsavContainer.length === 0) {
        $jsavContainer = $("#jsavcontainer");
      }

      if ($jsavContainer.length === 0) {
        return; // give up
      }

      var $body = $("body"),
        bodyXMargin = $body.outerWidth(true) - $body.outerWidth(),
        bodyYMargin = $body.outerHeight(true) - $body.outerHeight(),
        width = $jsavContainer.outerWidth(true) + bodyXMargin,
        height = $jsavContainer.outerHeight(true) + bodyYMargin;

      // If height or width is 0, an error occurred
      // IMPORTANT: Do not report zero dimensions to module page as it
      // will effectively make the AV permanently hidden
      if (height === 0 || width === 0) {
        console.warn('Unable to determine dimensions of ' + ODSA.SETTING.AV_NAME);
        return;
      }

      // IMPORTANT: Replace settings.MODULE_ORIGIN with '*' (including
      // quotes) in order to perform local testing
      parent.postMessage({
        type: "resize-iframe",
        exerName: ODSA.SETTINGS.AV_NAME,
        width: width,
        height: height
      }, settings.MODULE_ORIGIN);
    }, 100);
  }

  /**
   * Generates a JSAV event to log the initial state of an AV or exercise
   *   - initData - A JSON object that contains the initial state of an exercise
   *     Conventions:
   *       - The key for automatically generated data should have a prefix 'gen_'
   *         - Ex: an automatically generated array would be 'gen_array'
   *       - The key for user generated data should have a prefix 'user_'
   *         - Ex: Array data the user enters in the textbox should have a key 'user_array'
   */
  function logExerciseInit(initData) {
    // Reset the uiid (unique instance identifier)
    uiid = +new Date();
    totalTime = 0;

    var data = {
      av: settings.AV_NAME,
      type: 'odsa-exercise-init',
      desc: JSON.stringify(initData)
    };
    $("body").trigger("jsav-log-event", [data]);
  }

  /**
   * Generates a JSAV event that triggers the code to give a user credit for an exercise
   */
  function awardCompletionCredit() {
    var data = {
      av: settings.AV_NAME,
      type: 'odsa-award-credit'
    };
    postGradeToLMS(settings.AV_NAME);
    $("body").trigger("jsav-log-event", [data]);
  }

  /**
   * Resets the AV to its initial state
   */
  function reset(flag) {
    // Replace the contents of the avcontainer with the save initial state
    $('.avcontainer').unbind().html(emptyContent);

    // Clear the array values field, when no params given and reset button hit
    if (flag !== true && !$('#arrayValues').prop("disabled")) {
      $('#arrayValues').val("");
    }

    sendResizeMsg();
  }

  // show proficiency indicator (green check mark)
  function showProfCheckMark() {
    // show the greem check_mark
    var check_mark = $("<span id='prof_check_mark'><img src='../../khan-exercises/images/green_check.png'></span>");
    $('body #container').prepend(check_mark);
    $('#prof_check_mark').show();
  }

  // Initialize the arraysize drop down list
  function initArraySize(min, max, selected) {
    // Use the midpoint between the min and max as a default, if a selected value isn't provided
    selected = (selected) ? selected : Math.round((max + min) / 2);

    var html = "";
    for (var i = min; i <= max; i++) {
      html += '<option ';
      if (i === selected) {
        html += 'selected="selected" ';
      }
      html += 'value="' + i + '">' + i + '</option>';
    }

    $('#arraysize').html(html);

    // Save the min and max values as data attributes so
    // they can be used by processArrayValues()
    $('#arraysize').data('min', min);
    $('#arraysize').data('max', max);
  }

  // Validate the array values a user enters or generate an array of random numbers if none are provided
  function processArrayValues(upperLimit) {
    upperLimit = (upperLimit) ? upperLimit : 999;

    var i,
      initData = {},
      minSize = $('#arraysize').data('min'),
      maxSize = $('#arraysize').data('max'),
      msg = "Please enter " + minSize + " to " + maxSize + " positive integers between 0 and " + upperLimit;

    if (!minSize || !maxSize) {
      console.warn('processArrayValues() called without calling initArraySize()');
    }

    // Convert user's values to an array,
    // assuming values are space separated
    var arrValues = $('#arrayValues').val().match(/[0-9]+/g) || [];

    if (arrValues.length === 0) { // Empty field
      // Generate (appropriate length) array of random numbers between 0 and the given upper limit
      for (i = 0; i < $('#arraysize').val(); i++) {
        arrValues[i] = Math.floor(Math.random() * (upperLimit + 1));
      }
      initData.gen_array = arrValues;
    } else {
      // Ensure user provided array is in correct range
      if (arrValues.length < minSize || arrValues.length > maxSize) {
        alert(msg);
        return null;
      }

      // Ensure all user entered values are positive integers
      for (i = 0; i < arrValues.length; i++) {
        arrValues[i] = Number(arrValues[i]);
        if (isNaN(arrValues[i]) || arrValues[i] < 0 || arrValues[i] > upperLimit) {
          alert(msg);
          return null;
        }
      }

      initData.user_array = arrValues;

      // Update the arraysize dropdown to match the length of the user entered array
      $('#arraysize').val(arrValues.length);
    }

    // Dynamically log initial state of text boxes
    $('input[type=text]').each(function(index, item) {
      var id = $(item).attr('id');

      if (id !== 'arrayValues') {
        initData['user_' + id] = $(item).val();
      }
    });

    // Dynamically log initial state of dropdown lists
    $('select').each(function(index, item) {
      var id = $(item).attr('id');
      initData['user_' + id] = $(item).val();
    });

    // Log initial state of exercise
    ODSA.AV.logExerciseInit(initData);

    return arrValues;
  }

  // Return a standard phrasing to be used in the "about" alert box
  function aboutstring(title, authors) {
    return title + "\nWritten by " + authors + "\nCreated as part of the OpenDSA hypertextbook project\nFor more information, see http://algoviz.org/OpenDSA\nSource and development history available at\nhttps://github.com/OpenDSA/OpenDSA\nCompiled with JSAV library version " + JSAV.version();
  }

  //*****************************************************************************
  //*************            AV INFRASTRUCTURE FUNCTIONS            *************
  //*****************************************************************************

  function processEventData(data) {
    var flush = false;

    // Filter out events we aren't interested in
    if (odsaUtils.discardEvents.indexOf(data.type) > -1) {
      return;
    }

    // Overwrite the av attribute with the correct AV name, append the
    // uiid, then calculate the amount of time spent on the exercise
    data.av = settings.AV_NAME;
    data.uiid = uiid;
    data.seed = seed;
    data.totalTime = totalTime + (+new Date()) - focusTime;

    // If data.desc doesn't exist or is empty, initialize it
    if (!data.desc || data.desc === '') {
      data.desc = {};
    } else {
      // If it already exists, make sure its a JSON object
      data.desc = odsaUtils.getJSON(data.desc);
    }

    var score,
      complete;

    if (odsaUtils.ssEvents.indexOf(data.type) > -1) {
      data.desc.currentStep = data.currentStep;
      data.desc.currentStep = data.totalSteps;

      // TODO: Add startTime and highestStep from odsaMOD.js

      // Flush event data when the end of a slideshow is reached
      if (data.currentStep === data.totalSteps) {
        flush = true;
      }
    } else if (data.type === "jsav-array-click") {
      data.desc.index = data.index;
      data.desc.arrayID = data.arrayid;
    } else if (data.type === "jsav-exercise-grade-change" || data.type === "jsav-exercise-grade" || data.type === "jsav-exercise-step-fixed") {
      // On grade change events, log the user's score and submit it
      score = odsaUtils.roundPercent(data.score.correct / data.score.total);
      // TODO: Verify with Ville how to properly calculate this
      complete = odsaUtils.roundPercent((data.score.correct + data.score.undo + data.score.fix) / data.score.total);
      data.desc.score = score;
      data.desc.complete = complete;

      // Prevent event data from being transmitted on every step
      // This makes better use of the buffering mechanism and overall reduces
      // the network traffic (removed overhead of individual requests), but it
      // takes a while to complete and while its sending the log data isn't
      // saved in local storage, if the user closes the page before the request
      // completes and it fails the data will be lost
      if (complete === 1) {
        // Set the score into score form field and submit.
        postGradeToLMS(data.av, score);
      }

      flush = true;
    } else if (data.type === "jsav-exercise-model-open") {
      // TODO: See https://github.com/OpenDSA/OpenDSA/issues/249

      // If user looks at the model answer before they are done and
      // they haven't already lost credit, warn them they can no longer
      // receive credit and prevent them from getting credit for the exercise
      if (allowCredit && $('span.jsavamidone').html() !== "DONE") {
        allowCredit = false;

        alert("You can no longer receive credit for the current instance of this exercise.\nClick 'Reset' or refresh the page to get a new problem instance.");

        // Hide the score widget and display and appropriate message in its place
        $('span.jsavscore').hide();
        $('span.jsavscore').parent().append('<span id="credit_disabled_msg">Credit not given for this instance</span>');
      }
    } else if (data.type === "jsav-exercise-reset") {
      flush = true;

      // If the student looked at the model answer for the previous
      // attempt, allow them to get credit for the new instance
      if (!allowCredit) {
        allowCredit = true;

        $('span.jsavscore').show();
        $('#credit_disabled_msg').remove();
      }
    }

    // Appends a flag to the data, indicating that the AV itself will
    // submit the data to the logging server
    if (selfLoggingEnabled) {
      data.logged = true;
    }

    if (settings.MODULE_ORIGIN) {
      parent.postMessage(data, settings.MODULE_ORIGIN);
    }

    // Save the event in localStorage
    if (!!settings.LOGGING_SERVER && selfLoggingEnabled) {
      odsaUtils.logEvent(data);

      if (flush) {
        odsaUtils.sendEventData();
      }
    }
  }

  function postGradeToLMS(exerciseName, score) {
    // JSAV Exercise Recorder passes jsav-exercise-grade events which causes
    // postGradeToLMS() be called. However, we are then likely using A+ LMS,
    // not an OpenDSA-compatible tool provider. Then the OpenDSA tool
    // provider is not defined, therefore we should do nothing here.
    if (typeof ODSA.TP === 'undefined') {
      return;
    }

    var score = score || "noScore";
    if (ODSA.TP.ODSAParams.gradeable_exercise === exerciseName) {

      // Send the score data to the canvas server if score greater than threshold
      if ((score !== "noScore" && (score >= odsaUtils.params.threshold)) || score === "noScore") {
        toolProviderData.toParams.score = 1;
        jQuery.ajax({
          url: "/assessment",
          type: "POST",
          dataType: 'json',
          contentType: "application/json; charset=utf-8",
          data: JSON.stringify(toolProviderData.toParams),
          datatype: "json",
          success: function(data) {
            // alert("YES!");
          },
          error: function(data) {
            // alert("WHAT HAPPENED!");
          }
        });
        showProfCheckMark();
      }
    }

  }

  //*****************************************************************************
  //*************            Creates global ODSA.AV object           ************
  //*****************************************************************************

  // Create a global AV namespace and make the necessary AV variables
  // and utility functions public by adding them to it
  window.ODSA.AV = {};
  ODSA.AV.aboutstring = aboutstring;
  ODSA.AV.awardCompletionCredit = awardCompletionCredit;
  ODSA.AV.initArraySize = initArraySize;
  ODSA.AV.logExerciseInit = logExerciseInit;
  ODSA.AV.processArrayValues = processArrayValues;
  ODSA.AV.reset = reset;
  ODSA.AV.sendResizeMsg = sendResizeMsg;

  //*****************************************************************************
  //*************                   INITIALIZATION                  *************
  //*****************************************************************************

  /**
   * Parses the name of the page from the URL
   */
  function getNameFromURL(url) {
    // If no URL is specified, uses the pathname of the current page
    url = (url) ? url : location.pathname;
    var start = url.lastIndexOf("/") + 1,
      end = url.lastIndexOf(".htm");

    // URL is a directory, redirecting to an index page
    if (start === url.length && end === -1) {
      return 'index';
    }

    return url.slice(start, end);
  }

  // Initialize ODSA.SETTINGS.AV_NAME
  ODSA.SETTINGS.AV_NAME = getNameFromURL();

  // Create event handler to listen for messages from module, used mainly to send tool provider data object
  var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent",
    eventer = window[eventMethod],
    messageEvent = (eventMethod === "attachEvent") ? "onmessage" : "message",
    toolProviderData = {};

  eventer(messageEvent, function(e) {
    // Only accept post messages from the module page
    // console.dir(e);
    // if (e.origin !== settings.MODULE_ORIGIN) {
    //   return;
    // }
    var data = odsaUtils.getJSON(e.data);
    if (data.hasOwnProperty('proficient')) {
      if (data.proficient) {
        showProfCheckMark();
      }
    }

    if (data.hasOwnProperty('outcomeService')) {
      toolProviderData = data;
      ODSA.TP = toolProviderData;

      if (!!settings.LOGGING_SERVER) {
        // Log the browser ready event
        odsaUtils.logUserAction('document-ready', 'User loaded the ' + settings.AV_NAME + ' AV');

        if (selfLoggingEnabled) {
          // Send any stored event data when the page loads
          odsaUtils.sendEventData();
        }
      }
    }
  });

  $(document).ready(function() {
    // Initialize ODSA.SETTINGS.AV_NAME
    // ODSA.SETTINGS.AV_NAME = TP.ODSAParams.short_name;

    // If MathJax is loaded, attach an event handler to the avcontainer that
    // will apply MathJax processing to each JSAV message
    if (typeof MathJax !== 'undefined') {
      MathJax.Hub.Config({
        tex2jax: {
          inlineMath: [
            ['$', '$'],
            ['\\(', '\\)']
          ],
          displayMath: [
            ['$$', '$$'],
            ["\\[", "\\]"]
          ],
          processEscapes: true
        },
        "HTML-CSS": {
          scale: "80"
        }
      });
      $('.avcontainer').on("jsav-message", function() {
        // invoke MathJax to do conversion again
        MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
      });
      $(".avcontainer").on("jsav-updatecounter", function() {
        // invoke MathJax to do conversion again
        MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
      });
    }

    // Record the HTML of the avcontainer in the "empty" state
    emptyContent = $('.avcontainer').html();

    // Send the size of the page to the parent page to allow for iframe resizing
    sendResizeMsg();

    // Listen for JSAV events and forward them to the parent page
    $("body").on("jsav-log-event", function(e, data) {
      processEventData(data);
    });

    // Attach logging handlers to window events
    if (!!settings.LOGGING_SERVER) {
      $(window).focus(function(e) {
        odsaUtils.logUserAction('window-focus', 'User looking at ' + settings.AV_NAME + ' window');
        focusTime = +new Date();
      });

      $(window).blur(function(e) {
        odsaUtils.logUserAction('window-blur', 'User is no longer looking at ' + settings.AV_NAME + ' window');
        totalTime += (+new Date() - focusTime);
      });

      $(window).on('beforeunload', function() {
        // Log the browser unload event
        odsaUtils.logUserAction('window-unload', 'User closed or refreshed ' + settings.AV_NAME + ' window');
      });
    }
  });

}(jQuery));


/* -------------------------------------------------------------------------
 * Explanation of the following code is at the CS-A1141 course repository at
 * exercises/jsav/ajax/README.md.
 * ------------------------------------------------------------------------- */
//
// This part submits the exercise to mooc-grader
// Based on work of authors: Ville Karavirta, Samuel Marisa, Kasper Hellström,
// Teemu Lehtinen.
//

(function($) {
  // Explanations on obscure parameters.
  // e = jQuery
  // n = JSAV._types.Exercise.prototype

  // Submission related translations. There are translations for English (en) and
  // Finnish (fi). One of these are shown to the user when the browser gets a
  // response from mooc-grader.
  var submissionMessages = {
    en: {
      ajaxSuccess: "Your score was successfully recorded.",
      ajaxError: "Error while submitting your solution: ",
      ajaxFailed: "Unfortunately recording your solution failed.",
      compareButton: "Compare answers",
      compareNote: "You can view the differences between your answer and the model answer\n" +
        "by clicking the \"Compare answers\" button."
    },
    fi: {
      ajaxSuccess: "Pisteesi tallennettiin onnistuneesti.",
      ajaxError: "Ratkaisuasi lähettäessä tapahtui virhe: ",
      ajaxFailed: "Valitettavasti ratkaisuasi ei pystytty tallentamaan.",
      compareButton: "Vertaile vastauksia",
      compareNote: "Voit katsoa oman vastauksesi ja mallivastauksen eron\n" +
        "\"Vertaile vastauksia\" -napista."
    }
  };

  // Set random number generator
  var t = PARAMS.seed || Math.floor(Math.random() * 99999999999999).toString();
  JSAV.utils.rand.seedrandom(t);
  Math.random = JSAV.utils.rand.random;

  ODSA.SETTINGS.MODULE_ORIGIN = "*";

  // Modify JSAV exercise creator function so that it will add field
  // `feedback: "atend"` to parameter `options`.
  // Later versions of JSAV might already do this.
  var s = JSAV.ext.exercise;
  JSAV.ext.exercise = function(model, reset, options) {
    options = $.extend(options, {
      feedback: "atend"
    });
    return s.call(this, model, reset, options)
  };

  $("#help").remove();
  $("#about").remove();
  $.extend(true, JSAV._translations, submissionMessages);


  // Gives JSON dump of the recording of the exercise.
  //
  // Parameters:
  //     exercise: a JSAV exercise
  // Returns:
  //     (i) by default, the JSON dump of the exercise.
  //     (ii) if JSAV Exercise Recorder is in use, the JAAL recording of the
  //          exercise.
  function getExerciseRecording(exercise, callback) {
    // Exercise recording. This is the JSON data that will be shown in A+
    // in the `grading_data` field of the exercise submission.
    // By default, the whole exercise is treated as the recording.
    try {
      var recording = JSAVrecorder.getRecording();
      return "Placeholder for JAAL data."
    }
    catch (ReferenceError) {
      return exercise._jsondump().replace(/[^\x00-\x7F]/g, "");
    }
  }

  // Redefine some functions of JSAV exercise prototype
  var exerciseProto = JSAV._types.Exercise.prototype;

  // First save original functions with different names
  exerciseProto.originalModel = exerciseProto.showModelanswer;
  exerciseProto.originalReset = exerciseProto.reset;

  // Click handler for "Model answer" button
  exerciseProto.showModelanswer = function() {
    this.modelSeenFlag = true;
    $('.jsavexercisecontrols input[name="grade"]').attr("disabled", "disabled");
    $('.jsavexercisecontrols input[name="player"]').attr("disabled", "disabled");
    this.originalModel()
  };

  // Click handler for "Reset" button
  exerciseProto.reset = function() {
    this.originalReset();
    delete this.modelSeenFlag;
    $('.jsavexercisecontrols input[name="grade"]').removeAttr("disabled");
    $('.jsavexercisecontrols input[name="player"]').attr("disabled", "disabled");
  };

  // JSAV message translator function (shows messages to user with selected
  // language)
  var translator = null;

  // Stores the text that will be shown to user after the grading process has
  // been finished.l
  var messageToUser = "";

  // Current JSAV exercise.
  // NOTE! This is not thread safe; it is assumed that each JSAV exercise is
  // displayed in its own iframe, and therefore there will not be a race
  // condition on this variable.
  var exercise = null;

  // Click handler for "Grade" button
  //
  // Parameters:
  // this: a JSAV exercise; see  http://jsav.io/exercises/exercise/
  exerciseProto.showGrade = function() {

    exercise = this;

    // If the student has viewed the model answer, this function does nothing.
    if (exercise.modelSeenFlag) {
      console.warn("Exercise had modelSeenFlag set, but showGrade() was " +
        "called! This should not happen.")
      return;
    }

    // Save the translator function of this exercise.
    translator = exercise.jsav._translate;

    $(".jsavexercisecontrols").addClass("active");
    $('.jsavexercisecontrols input[name="grade"]').attr("disabled", "disabled");
    exercise.grade();
    messageToUser = gradeText(exercise.score.correct, exercise.score.total)

    // If JSAV Exercise Recorder is in use, set a callback to sendSubmission()
    // below and trigger the "jsav-exercise-grade-button" JSAV event.
    try {
      JSAVrecorder.sendSubmission = sendSubmission;
      exercise.jsav.logEvent({
        type: "jsav-exercise-grade-button",
        score: $.extend({}, this.score)
      });
    }
    // Otherwise trigger "jsav-exercise-grade-button", use a JSON dump of the
    // exercise as recording and continue to sendSubmission().
    catch (ReferenceError) {
      exercise.jsav.logEvent({
        type: "jsav-exercise-grade-button",
        score: $.extend({}, this.score)
      });
      // exercise._jsondump() creates an object which represents the state of
      // the exercise. This is converted into a string with JSON.stringify().
      // Finally, .replace(/[^\x00-\x7F]/g, "") strips out all characters which
      // are not in the ASCII character set (everything Unicode).
      var recording = exercise._jsondump().replace(/[^\x00-\x7F]/g, "");
      sendSubmission(recording);
    }
  }

  // Generates HTTP POST request to mooc-grader.
  //
  // Parameters:
  // exerciseRecording:
  function sendSubmission(exerciseRecording) {
    // PARAMS is a global variable which contains settings for the current
    // exercise.
    //
    // PARAMS.submit_url is the location of mooc-grader and the exercise.
    // It is already set and of the form:
    // http://mooc-grader.address:port/ajax/<course_key>/<exercise_key>
    // Example: http://127.0.0.1:8080/ajax/default/insertion_sort
    // This will be handled in mooc-grader at
    // https://github.com/apluslms/mooc-grader/blob/master/access/types/ajax.py.
    //
    // PARAMS.submission_url is the location this particular exercise
    // submission in the A+ LMS. It has the form:
    // http://aplus.addressw:port/api/v2/exercises/<number>/grader/?token=<token>
    // Example: http://plus:8000/api/v2/exercises/8/grader/?token=
    //          eXtn2IQQUk_VZV7xq9DmwdLBSEJMkQJlqfByQh7FvxTLKGTFvIUnOhxAxLjg%3D
    // The A+ LMS will use the data in the URL to store the submission.

    var sendableRecording = "";
    if (typeof(exerciseRecording) !== "string") {

      // Assume that JSAV Exercise Recorder is in use.
      // Encode the data in base64. The data will be rendered in a Django
      // template on the server side. During template rendering, the characters
      // in the data are escaped as HTML entities to prevent cross site
      // scripting. Now, when the JAAL (JSON) data produced by the exercise
      // recorder is base64 encoded, it does not contain characters that would
      // be escaped as HTML entities.

      try {
        sendableRecording = window.JSAVrecorder.escapeRecording(exerciseRecording);
      }
      catch (exception) {
        console.error("sendSubmission(): got an exception: " + exception);
      }
    }
    else {
      // Assume stringified JSON
      // Strip out all characters which are not in the ASCII character set
      // (everything Unicode).

      sendableRecording = exerciseRecording.replace(/[^\x00-\x7F]/g, "")
    }

    var hashData = [PARAMS.submission_url,
            sendableRecording,
            exercise.score.correct,
            exercise.score.total].join(":");

    console.log("Now I would send the data to A+.", exerciseRecording);
    $("body").trigger("jsav-exercise-recorder-test-submit",
      exerciseRecording)


    // $.ajax(PARAMS.submit_url, {
    //     type: "POST",
    //     data: {
    //       checksum: md5(PARAMS.ajax_key + hashData),
    //       submission_url: PARAMS.submission_url,
    //       answer: sendableRecording,
    //       points: exercise.score.correct,
    //       max_points: exercise.score.total,
    //       ajax_key: PARAMS.ajax_key
    //     }
    //   }).done(ajaxReceived)
    //     .fail(ajaxFailed);

    ajaxReceived({success: true});
    $(".jsavexercisecontrols").removeClass("active")
  }

  // Generates grade text that can be displayed to the user.
  // Example: "Your score: 25 / 100"
  // Parameters:
  //     correct: number of correct steps
  //     total:   number of total steps
  function gradeText(correct, total) {
    var dispCorrect = 0;
    var dispTotal = 0;

    // The exercise in A+ might have a max_points setting where the value is
    // different than what JSAV grader might give. Therefore scale the points
    // accordingly.
    if (PARAMS['max_points']) {
      var scale = parseInt(PARAMS['max_points'], 10) / total;
      dispCorrect = Math.floor(correct * scale);
      dispTotal = Math.floor(total * scale);
    }
    else {
      dispCorrect = correct;
      dispTotal = total;
    }
    var msg = translator("yourScore") + " " + dispCorrect + " / " + dispTotal +
      "\n";
    return msg + "\n";
  }

  // Callback: mooc-grader responds with HTTP 200
  // Likely: "return HttpResponse(json.dumps({'success':True})"
  // https://github.com/apluslms/mooc-grader/blob/master/access/types/ajax.py
  function ajaxReceived(response) {
    if (response.success) {
      messageToUser += translator("ajaxSuccess");
    } else {
      messageToUser += translator("ajaxError") + response.message;
    }
    alertBox(messageToUser);
  }

  // Callback: mooc-grader responds with HTTP 403
  // This happens if the checksum fails.
  // "return HttpResponseForbidden()"
  // https://github.com/apluslms/mooc-grader/blob/master/access/types/ajax.py
  function ajaxFailed() {
    alertBox(translator("ajaxFailed"))
  }

  // Creates a "Compare answers" button in <div> .jsavexercisecontrols
  // if JSAV Exercise Recorder is in use
  // and if the button is not already created.
  function enableShowPlayerButton() {
    if (typeof(JSAVrecorder) === "undefined") {
      // JSAV Exercise recorder not in use, return.
      return;
    }
    if ($('.jsavexercisecontrols > input[name="player"]').length > 0) {
      // Button already exists. Enable it.
      $('.jsavexercisecontrols input[name="player"]').removeAttr("disabled");
    }
    else {
      // Button does not exist. Create it and set a click handler.
      var buttonHtml = '<input type="button" name="player" ' +
        'id="show-player" value="' + translator("compareButton") + '">';
      var button = $('.jsavexercisecontrols').append(buttonHtml);
      button.click(function() {
        alertBox("JAAL Player should activate")
        })
    }
  }

  // Creates a small notification box with an OK button similar to the
  // built-in browser alert() call. This is used to display notification to
  // the user that their submission has [not] been saved. This is used instead
  // of alert(), because JSAV exercises work inside an <iframe>, and Google
  // Chrome blocks alert() inside an <iframe>.
  function alertBox(message) {

    var boxHtml = "<div id=\"jsavalertbox\"><p>" +
      message.replace('\n', '<br>') +
      "</p><input type=\"button\" name=\"ok\" value=\"OK\"></div>";

    var canvas = $('.jsavcontainer');
    canvas.append(boxHtml);
    var box = $('#jsavalertbox');
    var button = $('#jsavalertbox > :button');
    box.css("width", "400px");
    box.css("padding", "1ex");
    box.css("border", "1px solid black");
    box.css("border-radius", "5px");
    box.css("background", "#eee");
    box.css("position", "absolute");
    button.css("display", "block");
    button.css("margin-left", "auto");
    button.css("margin-right", "auto");
    $('#jsavalertbox > p').css("margin-top", "0px")

    var jsavWidth = canvas.prop('clientWidth');
    var jsavHeight = canvas.prop('clientHeight');
    var boxWidth = box.prop('clientWidth');
    var boxHeight = box.prop('clientHeight');
    var offsetX = Math.floor(0.5 * (jsavWidth - boxWidth));
    var offsetY = Math.floor(0.5 * jsavHeight - boxHeight);

    // The highest known z-index of JSAV elements is z-index 700 of
    // .jsavedgelabel w 700. We must go top of that.
    box.css("z-index", "1000");
    box.css("left", offsetX);
    box.css("top", offsetY);

    button.click(function() {
      $('#jsavalertbox').remove();
    })
  }

})(jQuery);
