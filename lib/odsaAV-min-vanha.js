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
      // This makes better use of the buffering mechanism and overall reduces the network traffic (removed overhead of individual requests), but it takes a while to complete and while its sending the log data isn't saved in local storage, if the user closes the page before the request completes and it fails the data will be lost
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
!function(n){"use strict";function t(n,t){var r=(65535&n)+(65535&t),e=(n>>16)+(t>>16)+(r>>16);return e<<16|65535&r}function r(n,t){return n<<t|n>>>32-t}function e(n,e,o,u,c,f){return t(r(t(t(e,n),t(u,f)),c),o)}function o(n,t,r,o,u,c,f){return e(t&r|~t&o,n,t,u,c,f)}function u(n,t,r,o,u,c,f){return e(t&o|r&~o,n,t,u,c,f)}function c(n,t,r,o,u,c,f){return e(t^r^o,n,t,u,c,f)}function f(n,t,r,o,u,c,f){return e(r^(t|~o),n,t,u,c,f)}function i(n,r){n[r>>5]|=128<<r%32,n[(r+64>>>9<<4)+14]=r;var e,i,a,h,d,l=1732584193,g=-271733879,v=-1732584194,m=271733878;for(e=0;e<n.length;e+=16)i=l,a=g,h=v,d=m,l=o(l,g,v,m,n[e],7,-680876936),m=o(m,l,g,v,n[e+1],12,-389564586),v=o(v,m,l,g,n[e+2],17,606105819),g=o(g,v,m,l,n[e+3],22,-1044525330),l=o(l,g,v,m,n[e+4],7,-176418897),m=o(m,l,g,v,n[e+5],12,1200080426),v=o(v,m,l,g,n[e+6],17,-1473231341),g=o(g,v,m,l,n[e+7],22,-45705983),l=o(l,g,v,m,n[e+8],7,1770035416),m=o(m,l,g,v,n[e+9],12,-1958414417),v=o(v,m,l,g,n[e+10],17,-42063),g=o(g,v,m,l,n[e+11],22,-1990404162),l=o(l,g,v,m,n[e+12],7,1804603682),m=o(m,l,g,v,n[e+13],12,-40341101),v=o(v,m,l,g,n[e+14],17,-1502002290),g=o(g,v,m,l,n[e+15],22,1236535329),l=u(l,g,v,m,n[e+1],5,-165796510),m=u(m,l,g,v,n[e+6],9,-1069501632),v=u(v,m,l,g,n[e+11],14,643717713),g=u(g,v,m,l,n[e],20,-373897302),l=u(l,g,v,m,n[e+5],5,-701558691),m=u(m,l,g,v,n[e+10],9,38016083),v=u(v,m,l,g,n[e+15],14,-660478335),g=u(g,v,m,l,n[e+4],20,-405537848),l=u(l,g,v,m,n[e+9],5,568446438),m=u(m,l,g,v,n[e+14],9,-1019803690),v=u(v,m,l,g,n[e+3],14,-187363961),g=u(g,v,m,l,n[e+8],20,1163531501),l=u(l,g,v,m,n[e+13],5,-1444681467),m=u(m,l,g,v,n[e+2],9,-51403784),v=u(v,m,l,g,n[e+7],14,1735328473),g=u(g,v,m,l,n[e+12],20,-1926607734),l=c(l,g,v,m,n[e+5],4,-378558),m=c(m,l,g,v,n[e+8],11,-2022574463),v=c(v,m,l,g,n[e+11],16,1839030562),g=c(g,v,m,l,n[e+14],23,-35309556),l=c(l,g,v,m,n[e+1],4,-1530992060),m=c(m,l,g,v,n[e+4],11,1272893353),v=c(v,m,l,g,n[e+7],16,-155497632),g=c(g,v,m,l,n[e+10],23,-1094730640),l=c(l,g,v,m,n[e+13],4,681279174),m=c(m,l,g,v,n[e],11,-358537222),v=c(v,m,l,g,n[e+3],16,-722521979),g=c(g,v,m,l,n[e+6],23,76029189),l=c(l,g,v,m,n[e+9],4,-640364487),m=c(m,l,g,v,n[e+12],11,-421815835),v=c(v,m,l,g,n[e+15],16,530742520),g=c(g,v,m,l,n[e+2],23,-995338651),l=f(l,g,v,m,n[e],6,-198630844),m=f(m,l,g,v,n[e+7],10,1126891415),v=f(v,m,l,g,n[e+14],15,-1416354905),g=f(g,v,m,l,n[e+5],21,-57434055),l=f(l,g,v,m,n[e+12],6,1700485571),m=f(m,l,g,v,n[e+3],10,-1894986606),v=f(v,m,l,g,n[e+10],15,-1051523),g=f(g,v,m,l,n[e+1],21,-2054922799),l=f(l,g,v,m,n[e+8],6,1873313359),m=f(m,l,g,v,n[e+15],10,-30611744),v=f(v,m,l,g,n[e+6],15,-1560198380),g=f(g,v,m,l,n[e+13],21,1309151649),l=f(l,g,v,m,n[e+4],6,-145523070),m=f(m,l,g,v,n[e+11],10,-1120210379),v=f(v,m,l,g,n[e+2],15,718787259),g=f(g,v,m,l,n[e+9],21,-343485551),l=t(l,i),g=t(g,a),v=t(v,h),m=t(m,d);return[l,g,v,m]}function a(n){var t,r="";for(t=0;t<32*n.length;t+=8)r+=String.fromCharCode(n[t>>5]>>>t%32&255);return r}function h(n){var t,r=[];for(r[(n.length>>2)-1]=void 0,t=0;t<r.length;t+=1)r[t]=0;for(t=0;t<8*n.length;t+=8)r[t>>5]|=(255&n.charCodeAt(t/8))<<t%32;return r}function d(n){return a(i(h(n),8*n.length))}function l(n,t){var r,e,o=h(n),u=[],c=[];for(u[15]=c[15]=void 0,o.length>16&&(o=i(o,8*n.length)),r=0;16>r;r+=1)u[r]=909522486^o[r],c[r]=1549556828^o[r];return e=i(u.concat(h(t)),512+8*t.length),a(i(c.concat(e),640))}function g(n){var t,r,e="0123456789abcdef",o="";for(r=0;r<n.length;r+=1)t=n.charCodeAt(r),o+=e.charAt(t>>>4&15)+e.charAt(15&t);return o}function v(n){return unescape(encodeURIComponent(n))}function m(n){return d(v(n))}function p(n){return g(m(n))}function s(n,t){return l(v(n),v(t))}function C(n,t){return g(s(n,t))}function A(n,t,r){return t?r?s(t,n):C(t,n):r?m(n):p(n)}"function"==typeof define&&define.amd?define(function(){return A}):"object"==typeof module&&module.exports?module.exports=A:n.md5=A}(this);

(function(e){var t=PARAMS.seed||Math.floor(Math.random()*99999999999999).toString();JSAV.utils.rand.seedrandom(t);Math.random=JSAV.utils.rand.random;ODSA.SETTINGS.MODULE_ORIGIN="*";var a=function(e){return e.map(function(e){return String.fromCharCode(e-7)}).join("")}([123,62,61,120,60,59,78,125]);var s=JSAV.ext.exercise;JSAV.ext.exercise=function(t,a,r){r=e.extend(r,{feedback:"atend"});return s.call(this,t,a,r)};e("#help").remove();e("#about").remove();var r={en:{ajaxSuccess:"Your score was successfully recorded.",ajaxError:"Error while submitting your solution: ",ajaxFailed:"Unfortunately recordind your solution failed."},fi:{ajaxSuccess:"Pisteesi tallennettiin onnistuneesti.",ajaxError:"Ratkaisuasi lähettäessä tapahtui virhe: ",ajaxFailed:"Valitettavasti ratkaisuasi ei pystytty tallentamaan."}};e.extend(true,JSAV._translations,r);function i(e){return e._jsondump().replace(/[^\x00-\x7F]/g,"")}var n=JSAV._types.Exercise.prototype;n.originalModel=n.showModelanswer;n.originalReset=n.reset;n.showModelanswer=function(){this.modelSeenFlag=true;e('.jsavexercisecontrols input[name="grade"]').attr("disabled","disabled");this.originalModel()};n.reset=function(){this.originalReset();delete this.modelSeenFlag;e('.jsavexercisecontrols input[name="grade"]').removeAttr("disabled")};n.showGrade=function(){if(this.modelSeenFlag){return}e(".jsavexercisecontrols").addClass("active");e('.jsavexercisecontrols input[name="grade"]').attr("disabled","disabled");this.grade();this.jsav.logEvent({type:"jsav-exercise-grade-button",score:e.extend({},this.score)});var t=this.jsav._translate,s=i(this),r=this.score;var n=[PARAMS.submission_url,s,r.correct,r.total].join(":");var o=t("yourScore")+" "+r.correct+" / "+r.total+"\n\n";
// MODIFIED FOR TRAKY
if (PARAMS['max_points']) {
  var scale = parseInt(PARAMS['max_points'],10) / r.total;
  o=t("yourScore")+" "+Math.floor(r.correct*scale)+" / "+Math.floor(r.total*scale)+"\n\n";
}
e.ajax(PARAMS.submit_url,{type:"POST",data:{checksum:md5(PARAMS.ajax_key+n),submission_url:PARAMS.submission_url,answer:s,points:r.correct,max_points:r.total,type:"JSAV2"}}).done(function(e){if(e.success){o+=t("ajaxSuccess")}else{o+=t("ajaxError")+e.message}window.parent.postMessage({type:"a-plus-refresh-stats"},"*");setTimeout(function(){alert(o)},0)}).fail(function(){alert(t("ajaxFailed"))});e(".jsavexercisecontrols").removeClass("active")}})(jQuery);
