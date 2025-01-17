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
