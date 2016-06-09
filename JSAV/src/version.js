/**
* Version support
* Depends on core.js
*/
(function() {
  if (typeof JSAV === "undefined") { return; }
  var theVERSION = "v1.0.1-18-g172c52d";

  JSAV.version = function() {
    return theVERSION;
  };
})();
