/*
	https://github.com/euphy/polargraph/wiki/Polargraph-machine-commands-and-responses
*/

var serial; // variable to hold an instance of the serialport library
var portName = '/dev/cu.usbmodem641'; // fill in your serial port name here
var inData; // for incoming serial data
var inByte;
var byteCount = 0;
var output = 0;
var serialOptions = {
  baudrate: 57600
};

//var machineWidthRevs = 1500; machineHeightRevs = 1200;
var machineWidthSteps, machineHeightSteps;
var machineWidthMM, machineHeightMM;

var mmToPxFactor = 0.25;
var pxToMMFactor = 4;
var pxToStepsFactor; // TODO

var leftDistRevs = 0, rightDistRevs = 0, leftDistMM = 0, rightDistMM = 0;



var statusErrorIcon = '<i class="statuserror small exclamation circle icon"></i>';
var statusSuccessIcon = '<i class="statusok small check circle icon"></i>';
var statusWorkingIcon = '<i class="statusworking notched circle loading icon"></i>';
var statusElement = $("#statusAlert");

var canvas,lineaMotorDer, lineaMotorIzq, motorDer, motorIzq, machineSquare;
var mouseVector = new Victor(0,0);
var isSettingGondolaPos = false;
var isSettingNewPenPosition = false;
var gondolaPosition = new Victor(0,0);
var nextPenPosition = new Victor(0,0);
var gondolaPoint;

var leftMotorPosition = new Victor(0,0);
var rightMotorPosition = new Victor(0,0);

var newPenPositionArrow;

var newPenPositionCircle;

(function(){
    // SERIAL Start
    // Instantiate our SerialPort object
    serial = new p5.SerialPort();
    // Let's list the ports available
    var portlist = serial.list();
    // Assuming our Arduino is connected, let's open the connection to it
    // Change this to the name of your arduino's serial port
    // serial.open(portName, serialOptions);
    // Register some callbacks
    // When we connect to the underlying server
    serial.on('connected', serverConnected);
    // When we get a list of serial ports that are available
    serial.on('list', gotList);
    // When we some data from the serial port
    serial.on('data', gotData);
    // When or if we get an error
    serial.on('error', gotError);
    // When our serial port is opened and ready for read/write
    serial.on('open', gotOpen);

    canvas = new fabric.Canvas('myCanvas');

    window.addEventListener('resize', resizeCanvas, false);
    // resize on init
    resizeCanvas();


    lineaMotorDer = new fabric.Line([rightMotorPosition.x, rightMotorPosition.y, 0, 0], {
        left: 0, top: 0, stroke: 'grey', selectable:false
    });
    lineaMotorIzq = new fabric.Line([leftMotorPosition.x, leftMotorPosition.y, 0, 0], {
        left: 0, top: 0, stroke: 'grey', selectable:false
    });
    canvas.add(lineaMotorDer);
    canvas.add(lineaMotorIzq);

    motorDer = new fabric.Circle({
        radius: 6, fill: 'white', left: rightMotorPosition.x, top: rightMotorPosition.y, hasControls: false, originX: 'center', originY: 'center',
		lockRotation: true,
		lockMovementX: true,
		lockMovementY: true,
		lockScalingX: true,
		lockScalingY: true,
		lockUniScaling: true,
        hasControls: false
    });
    motorIzq = new fabric.Circle({
        radius: 6, fill: 'white', left: leftMotorPosition.x, top: rightMotorPosition.y, hasControls: false, originX: 'center', originY: 'center',
		lockRotation: true,
		lockMovementX: true,
		lockMovementY: true,
		lockScalingX: true,
		lockScalingY: true,
		lockUniScaling: true,
        hasControls: false
    });
    canvas.add(motorDer);
    canvas.add(motorIzq);



    gondolaPoint = new fabric.Circle({
        radius: 3, fill: '#a4bd8e', left: 0, top: 0, hasControls: false, originX: 'center', originY: 'center',
		lockRotation: true,
		lockMovementX: true,
		lockMovementY: true,
		lockScalingX: true,
		lockScalingY: true,
		lockUniScaling: true,
        hasControls: false
    });
    canvas.add(gondolaPoint);

    machineSquare = new fabric.Rect({
        width: 0, height: 0,
        left: 0, top: 0,
        fill: 'rgba(0,0,0,0)',
        stroke: "white",
		lockRotation: true,
		lockMovementX: true,
		lockMovementY: true,
		lockScalingX: true,
		lockScalingY: true,
		lockUniScaling: true,
        hasControls: false
    })
    canvas.add(machineSquare);

	newPenPositionArrow = new fabric.Line([leftMotorPosition.x, leftMotorPosition.y, 0, 0], {
        left: 0, top: 0, stroke: 'grey', selectable:false});
	canvas.add(newPenPositionArrow);

	newPenPositionCircle = new fabric.Circle({
		   radius: 3, fill: '#B38FAC', left: 0, top: 0, hasControls: false, originX: 'center', originY: 'center',
		   lockRotation: true,
		   lockMovementX: true,
		   lockMovementY: true,
		   lockScalingX: true,
		   lockScalingY: true,
		   lockUniScaling: true,
		   hasControls: false
	});
	canvas.add(newPenPositionCircle);

	/* *********** */

    SetMachineDimensionsMM(1200, 800);
	  SetMachineDimensionsSteps(7500, 6250);

})();

// Mousewheel Zoom
canvas.on('mouse:wheel', function(opt) {
  var delta = opt.e.deltaY;
  var pointer = canvas.getPointer(opt.e);
  var zoom = canvas.getZoom();
  zoom = zoom + delta/200;
  if (zoom > 10) zoom = 10;
  if (zoom < 0.6) zoom = 0.6;
  canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
  opt.e.preventDefault();
  opt.e.stopPropagation();
});

// Pan
canvas.on('mouse:down', function(opt) {
  var evt = opt.e;
  if (evt.altKey === true || opt.which == 2) {
      this.isDragging = true;
      this.selection = false;
      this.lastPosX = evt.clientX;
      this.lastPosY = evt.clientY;
  }else{
      if( isSettingGondolaPos){
          SetGondolaPosition(mouseX, mouseY);
		  isSettingGondolaPos = false; // SHould this go here or inside the function SetGondolaPosition ?

	  }else if( isSettingNewPenPosition ){
		  SetNextPenPosition(mouseX, mouseY);
		  // isSettingNewPenPosition = false;
	  }
  }
});

function SetMachineDimensionsMM(_w, _h){
    machineWidthMM = _w;
    machineHeightMM = _h;
	rightMotorPosition.x = machineWidthMM * mmToPxFactor;

    motorDer.left = rightMotorPosition.x;
    lineaMotorDer.set({'x1': motorDer.left, 'y1': 0})

    machineSquare.set({'width': motorDer.left, 'height': machineHeightMM * mmToPxFactor});

    canvas.renderAll();
}

function SetMachineDimensionsSteps(_w, _h){
	machineWidthSteps = _w;
	machineHeightSteps = _h;
	pxToStepsFactor = pxToMMFactor * (machineWidthSteps / machineWidthMM );
}

function SetGondolaPosition(_x, _y){
    gondolaPosition.x = _x;
    gondolaPosition.y = _y;
    gondolaPoint.left = _x;
    gondolaPoint.top = _y;
	canvas.renderAll();
    console.log("New Gondola Position: " + gondolaPosition);

	let rightMotorDist = gondolaPosition.distance(rightMotorPosition) * pxToStepsFactor;
	let leftMotorDist = gondolaPosition.distance(leftMotorPosition) * pxToStepsFactor;
	let cmd = "C09,"+ Math.round(leftMotorDist) +","+ Math.round(rightMotorDist) +",END";
	SerialSend(cmd);
	console.log("New Pos: " + cmd);
}

function SetNextPenPosition(_x, _y){
	nextPenPosition.x = _x;
	nextPenPosition.y = _y;
	newPenPositionCircle.left = _x;
	newPenPositionCircle.top = _y;
	canvas.renderAll();

	console.log("Next Position: " + nextPenPosition);

	let rightMotorDist = nextPenPosition.distance(rightMotorPosition) * pxToStepsFactor;
	let leftMotorDist = nextPenPosition.distance(leftMotorPosition) * pxToStepsFactor;
	let cmd = "C17,"+ Math.round(leftMotorDist) +","+ Math.round(rightMotorDist) +",2,END";
	SerialSend(cmd);
	console.log("New Pos: " + cmd);
}

var mouseX, mouseY;
var pointer;

canvas.on('mouse:move', function(opt) {
  if (this.isDragging) {
    var e = opt.e;
    this.viewportTransform[4] += e.clientX - this.lastPosX;
    this.viewportTransform[5] += e.clientY - this.lastPosY;
    this.requestRenderAll();
    this.lastPosX = e.clientX;
    this.lastPosY = e.clientY;
  }

  pointer = canvas.getPointer(options.e);
  mouseX = pointer.x;
  mouseY = pointer.y;
  // Linea Motor
  lineaMotorDer.set({'x2': mouseX, 'y2': mouseY });
  lineaMotorIzq.set({'x2': mouseX, 'y2': mouseY});
  canvas.renderAll(); // update

  $("#canvasMetaData .x").html( Math.round(mouseX) );
  $("#canvasMetaData .y").html( Math.round(mouseY) );
  $("#canvasMetaData .xmm").html( (mouseX * pxToMMFactor).toFixed(1) );
  $("#canvasMetaData .ymm").html( (mouseY * pxToMMFactor).toFixed(1) );

  mouseVector.x = mouseX;
  mouseVector.y = mouseY;

  let disToLMotor = mouseVector.distance(leftMotorPosition);
  $("#canvasMetaData .lmotomm").html( (disToLMotor * pxToMMFactor).toFixed(1) );
  $("#canvasMetaData .lmotosteps").html( (disToLMotor * pxToStepsFactor).toFixed(1));

  let disToRMotor = mouseVector.distance(rightMotorPosition);
  $("#canvasMetaData .rmotomm").html( (disToRMotor * pxToMMFactor).toFixed(1) );
  $("#canvasMetaData .rmotosteps").html( (disToRMotor * pxToStepsFactor).toFixed(1));

}); // mouse move

canvas.on('mouse:up', function(opt) {
  this.isDragging = false;
  this.selection = true;
});


canvas.on('path:created', function(e){
    var your_path = e.path;
    console.log(your_path);
    // ... do something with your path
});


$("#set-custom-postion").click(function(){
	isSettingGondolaPos = true;
})



$("#control-pen-position").click(function(){
	// dif = new Victor();
	isSettingNewPenPosition = true;

})

$("#pen-lift").click(function(){
	SerialSend("C14,UP,END");
})

$("#pen-drop").click(function(){
	SerialSend("C13,DOWN,END");
})


// We are connected and ready to go
function serverConnected() {
    console.log("We are connected!");
}

// Got the list of ports
function gotList(thelist) {
  // theList is an array of their names
  $("#serial_connections").html("");
  let serialConnectionsContent = "";
  for (var i = 0; i < thelist.length; i++) {
    // Display in the console
    serialConnectionsContent += '<button class="ui button newconnection" data-connectto="'+ thelist[i] +'">'+thelist[i]+'</button>';
  }
  $("#serial_connections").html(serialConnectionsContent);
}


// Connected to our serial device
function gotOpen() {
  console.log("Serial Port is open!");
  statusElement.html(statusSuccessIcon);
}

// Ut oh, here is an error, let's log it
function gotError(theerror) {
  console.log(theerror);
  statusElement.html(statusErrorIcon);
  WriteConsole(theerror);
}


function p(txt){
  console.log(txt);
}

//
// console
//

var lastReceivedString = "";
var lastSentCmd = ""; // TODO hacer de esto un array

function SerialSend(d){
  serial.write(d + '\n');
  WriteConsole(d)
}

// There is data available to work with from the serial port
function gotData() {
  var currentString = serial.readStringUntil("\r\n");
  // var currentString = serial.readString();
  // console.log(currentString);
  if(currentString == "") return;

  if(currentString == lastReceivedString){
    let lastLog = $(".log:last-child");
    let repetitions = lastLog.data("repeated");
    repetitions++;
    lastLog.data("repeated", repetitions);
    $(".log:last-child .content").html( "(" + repetitions + ") " + currentString);
    return;
  }
  WriteConsole(currentString);
  lastReceivedString = currentString;
}




$("document").ready(function(){

  $("#consoleInput").focus();
  // AjustarTamanno();

  // Input console
  $("#consoleInput").keyup(function(e){
    let code = e.which; // recommended to use e.which, it's normalized across browsers
    if(code==13||code==176){
      // 13 es el Enter comun. 176 es el enter del keypad
      e.preventDefault();
      let msg = $("#consoleInput").val();
      if( msg == "") return;
      msg = msg.toUpperCase();
      SerialSend(msg);
      WriteConsole(msg, false);
      $("#consoleInput").val(""); // Vacío el input
      lastSentCmd = msg;

    }else if (code==38||code==104) {
      // Up arrow
      e.preventDefault();
      if(lastSentCmd != ""){
        $("#consoleInput").val( lastSentCmd );
      }

    }
  });


  if ("onhashchange" in window) { // event supported?
    window.onhashchange = function () {
        hashChanged(window.location.hash);
    }
  }
  else { // event not supported:
      var storedHash = window.location.hash;
      window.setInterval(function () {
          if (window.location.hash != storedHash) {
              storedHash = window.location.hash;
              hashChanged(storedHash);
          }
      }, 100);
  }



  $("#content-tools").hide();
  $("#content-console").hide();
  $("#content-settings").hide();


  $('.ui.menu')
  .on('click', '.item', function() {
    if(!$(this).hasClass('dropdown')) {
      $(this)
        .addClass('active')
        .siblings('.item')
          .removeClass('active');
    }
  });


    $("#serial_connections").on("click", "button", function(){
      // serial.close();
      console.log("sd");
      portName = $(this).data("connectto");
      console.log("Connectando a ", portName);
      serial.open(portName, serialOptions);
    })


    $('.mypopup').popup();



}); // doc ready

function WriteConsole(txt, received = true){
  let icon, clase = "log";
  if(received){
     icon = '<i class="caret down icon"></i>';
  }else{
    icon = '<i class="caret up icon"></i>';
  }
  txt = '<span class="content">' + txt + '</span>';

  let msg = "<div data-repeated='0' class='" + clase + "'>" + icon + txt  + "</div>";
  $("#console").append(msg);
  $("#console").scrollTop($("#console")[0].scrollHeight); // Scroleo para abajo de todo
}

var currContent = $("#content-control");

function hashChanged(h){
  h = h.substr(1);
  let newContent = $("#content-"+h);
  // if( currContent != newContent ){
    currContent.hide();
    newContent.show();
    currContent = newContent;
  // }

}


function resizeCanvas() {
  canvas.setHeight( $('#canvasSizer').height() );
  canvas.setWidth(  $('#canvasSizer').width() );
  /*
  * Grid
  */
  let offset = -200;
  options = {
     distance: 20,
     width: canvas.width,
     height: canvas.height,
     param: {
       stroke: '#4c5669',
       strokeWidth: 1,
       selectable: false
     }
  },
  gridLen = options.width / options.distance;


  for (var i = 0; i < gridLen; i++) {
      var distance   = (i * options.distance) + offset,
        horizontal = new fabric.Line([ distance, + offset, distance, options.width + offset], options.param),
        vertical   = new fabric.Line([ + offset, distance, options.width  + offset, distance], options.param);
        canvas.add(horizontal);
        canvas.add(vertical);
        if(i%5 === 0){
            horizontal.set({stroke: '#7a7d82'});
            vertical.set({stroke: '#7a7d82'});
        };
    };
    // End grid

  canvas.renderAll();
}
