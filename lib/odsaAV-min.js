"use strict";(function($){var settings={},odsaUtils={};if(typeof ODSA==="undefined"){settings.MODULE_ORIGIN=location.protocol+"//"+location.host;if(!(window.console&&console.log)){console={log:function(){},debug:function(){},info:function(){},warn:function(){},error:function(){}}}odsaUtils.serverEnabled=function(){return false};odsaUtils.roundPercent=function(number){return Math.round(number*100)/100};odsaUtils.sendEventData=function(){};odsaUtils.logUserAction=function(type,desc,exerName,eventUiid){};odsaUtils.logEvent=function(data){};window.ODSA={};window.ODSA.SETTINGS=settings;window.ODSA.UTILS=odsaUtils;console.warn("odsaUtils.js was not included, using fallback function definitions")}else{settings=ODSA.SETTINGS;odsaUtils=ODSA.UTILS}var focusTime=+new Date();var totalTime=0;var emptyContent="";var allowCredit=true;var uiid=+new Date();function logExerciseInit(initData){uiid=+new Date();totalTime=0;var data={av:settings.AV_NAME,type:"odsa-exercise-init",desc:JSON.stringify(initData)};$("body").trigger("jsav-log-event",[data])}function awardCompletionCredit(){var data={av:settings.AV_NAME,type:"odsa-award-credit"};$("body").trigger("jsav-log-event",[data])}function initArraySize(min,max,selected){selected=(selected)?selected:Math.round((max+min)/2);var html="";for(var i=min;i<=max;i++){html+="<option ";if(i===selected){html+='selected="selected" '}html+='value="'+i+'">'+i+"</option>"}$("#arraysize").html(html);$("#arraysize").data("min",min);$("#arraysize").data("max",max)}function reset(flag){$(".avcontainer").unbind().html(emptyContent);if(flag!==true&&!$("#arrayValues").prop("disabled")){$("#arrayValues").val("")}}function processArrayValues(upperLimit){upperLimit=(upperLimit)?upperLimit:999;var i,initData={},minSize=$("#arraysize").data("min"),maxSize=$("#arraysize").data("max"),msg="Please enter "+minSize+" to "+maxSize+" positive integers between 0 and "+upperLimit;if(!minSize||!maxSize){console.warn("processArrayValues() called without calling initArraySize()")}var arrValues=$("#arrayValues").val().match(/[0-9]+/g)||[];if(arrValues.length===0){for(i=0;i<$("#arraysize").val();i++){arrValues[i]=Math.floor(Math.random()*(upperLimit+1))}initData.gen_array=arrValues}else{if(arrValues.length<minSize||arrValues.length>maxSize){alert(msg);return null}for(i=0;i<arrValues.length;i++){arrValues[i]=Number(arrValues[i]);if(isNaN(arrValues[i])||arrValues[i]<0||arrValues[i]>upperLimit){alert(msg);return null}}initData.user_array=arrValues;$("#arraysize").val(arrValues.length)}$("input[type=text]").each(function(index,item){var id=$(item).attr("id");if(id!=="arrayValues"){initData["user_"+id]=$(item).val()}});$("select").each(function(index,item){var id=$(item).attr("id");initData["user_"+id]=$(item).val()});logExerciseInit(initData);return arrValues}var av={};av.logExerciseInit=logExerciseInit;av.awardCompletionCredit=awardCompletionCredit;av.initArraySize=initArraySize;av.reset=reset;av.processArrayValues=processArrayValues;window.ODSA.AV=av;JSAV._types.ds.AVArray.prototype.slice=function(start,end){var array=[];for(var i=0;i<(end-start);i++){array[i]=this.value(start+i)}return array};JSAV._types.ds.AVArray.prototype.highlightBlue=function(index){this.addClass(index,"processing")};JSAV._types.ds.AVArray.prototype.unhighlightBlue=function(index){this.removeClass(index,"processing")};JSAV._types.ds.AVArray.prototype.markSorted=function(index){this.css(index,{"background-color":"#ffffcc"})};JSAV._types.ds.AVArray.prototype.toString=function(){var size=this.size();var str="[";for(var i=0;i<size;i++){str+=this.value(i);if(i<size-1){str+=", "}}str+="]";return str};function getNameFromURL(url){url=(url)?url:location.pathname;var start=url.lastIndexOf("/")+1,end=url.lastIndexOf(".htm");if(start===url.length&&end===-1){return"index"}return url.slice(start,end)}$(document).ready(function(){settings.AV_NAME=getNameFromURL();emptyContent=$(".avcontainer").html();$("body").on("jsav-log-event",function(e,data){var flush=false,discardEvents=["jsav-init","jsav-recorded","jsav-exercise-model-init","jsav-exercise-model-recorded"],ssEvents=["jsav-forward","jsav-backward","jsav-begin","jsav-end","jsav-exercise-model-forward","jsav-exercise-model-backward","jsav-exercise-model-begin","jsav-exercise-model-end"];if(discardEvents.indexOf(data.type)>-1){return}data.av=settings.AV_NAME;data.uiid=uiid;if(!data.desc||data.desc===""){data.desc=data.type}if(ssEvents.indexOf(data.type)>-1){data.desc=data.currentStep+" / "+data.totalSteps;if(data.currentStep===data.totalSteps){flush=true}}else{if(data.type==="jsav-array-click"){data.desc=JSON.stringify({index:data.index,arrayid:data.arrayid})}else{if(data.type==="jsav-exercise-grade-change"){var score=odsaUtils.roundPercent((data.score.student-data.score.fix)/data.score.total);var complete=odsaUtils.roundPercent(data.score.student/data.score.total);data.desc=JSON.stringify({score:score,complete:complete});flush=true}else{if(data.type==="jsav-exercise-model-open"){if(allowCredit&&$("span.jsavamidone").html()!=="DONE"){allowCredit=false;alert("You can no longer receive credit for the current instance of this exercise.\nClick 'Reset' or refresh the page to get a new problem instance.");$("span.jsavscore").hide();$("span.jsavscore").parent().append('<span id="credit_disabled_msg">Credit not given for this instance</span>')}}else{if(data.type==="jsav-exercise-reset"){flush=true;if(!allowCredit){allowCredit=true;$("span.jsavscore").show();$("#credit_disabled_msg").remove()}}}}}}data.totalTime=totalTime+(+new Date())-focusTime;data.logged=true;parent.postMessage(data,settings.MODULE_ORIGIN);if(odsaUtils.serverEnabled()){odsaUtils.logEvent(data);if(flush){odsaUtils.sendEventData()}}});if(odsaUtils.serverEnabled()){odsaUtils.logUserAction("document-ready","User loaded the "+settings.AV_NAME+" AV");odsaUtils.sendEventData();$(window).focus(function(e){odsaUtils.logUserAction("window-focus","User looking at "+settings.AV_NAME+" window");focusTime=+new Date()});$(window).blur(function(e){odsaUtils.logUserAction("window-blur","User is no longer looking at "+settings.AV_NAME+" window");totalTime+=(+new Date()-focusTime)});$(window).on("beforeunload",function(){odsaUtils.logUserAction("window-unload","User closed or refreshed "+settings.AV_NAME+" window")})}})}(jQuery));