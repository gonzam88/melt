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
var mmPerRev, stepsPerRev;
var stepMultiplier;
var downPos, upPos;
var mmPerStep, stepsPerMM;
var pageWidth, pageHeight;
var machineWidthMM, machineHeightMM;
var leftMotorPositionSteps, rightMotorPositionSteps;
var isMachineReady = false;
var isQueueActive = true;

var machineQueue = [];

var mmToPxFactor = 0.25;
var pxToMMFactor = 4;
var pxPerStep, stepPerPx;

var leftDistRevs = 0, rightDistRevs = 0, leftDistMM = 0, rightDistMM = 0;

var syncedLeft, syncedRight;


var statusErrorIcon = '<i class="statuserror small exclamation circle icon"></i>';
var statusSuccessIcon = '<i class="statusok small check circle icon"></i>';
var statusWorkingIcon = '<i class="statusworking notched circle loading icon"></i>';
var statusElement = $("#statusAlert");

var canvas,lineaMotorDer, lineaMotorIzq, motorDer, motorIzq, machineSquare;
var mouseVector = new Victor(0,0);
var isSettingGondolaPos = false;
var isSettingNewPenPosition = false;
var gondolaPositionPixels = new Victor(0,0);
var nextPenPosition = new Victor(0,0);
var gondolaPoint;

var leftMotorPositionPixels = new Victor(0,0);
var rightMotorPositionPixels = new Victor(0,0);

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
	  canvas.freeDrawingBrush.color = "purple";
    canvas.freeDrawingBrush.width = .5;
	  canvas.isDrawingMode = false;

    window.addEventListener('resize', resizeCanvas, false);
    // resize on init
    resizeCanvas();


    lineaMotorDer = new fabric.Line([rightMotorPositionPixels.x, rightMotorPositionPixels.y, 0, 0], {
        left: 0, top: 0, stroke: 'grey', selectable:false
    });
    lineaMotorIzq = new fabric.Line([leftMotorPositionPixels.x, leftMotorPositionPixels.y, 0, 0], {
        left: 0, top: 0, stroke: 'grey', selectable:false
    });
    canvas.add(lineaMotorDer);
    canvas.add(lineaMotorIzq);

    motorDer = new fabric.Circle({
        radius: 6, fill: 'white', left: rightMotorPositionPixels.x, top: rightMotorPositionPixels.y, hasControls: false, originX: 'center', originY: 'center',
		lockRotation: true,
		lockMovementX: true,
		lockMovementY: true,
		lockScalingX: true,
		lockScalingY: true,
		lockUniScaling: true,
        hasControls: false
    });
    motorIzq = new fabric.Circle({
        radius: 6, fill: 'white', left: leftMotorPositionPixels.x, top: rightMotorPositionPixels.y, hasControls: false, originX: 'center', originY: 'center',
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

	newPenPositionArrow = new fabric.Line([leftMotorPositionPixels.x, leftMotorPositionPixels.y, 0, 0], {
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


	// SetMachineDimensionsSteps(7500, 6250);

	CheckQueue();

;

})();

// Mousewheel Zoom
canvas.on('mouse:wheel', function(opt) {
  var delta = opt.e.deltaY;
  let pointer = canvas.getPointer(opt.e);
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
      SetGondolaPositionPixels(mouseVector.x, mouseVector.y);
		  isSettingGondolaPos = false; // SHould this go here or inside the function SetGondolaPositionPixels ?

	  }else if( isSettingNewPenPosition ){
		  SetNextPenPositionPixels(mouseVector.x, mouseVector.y);
		  isSettingNewPenPosition = false;
	  }
  }
});

function SetMachineDimensionsMM(_w, _h){
  machineWidthMM = _w;
  machineHeightMM = _h;

	machineWidthSteps = machineWidthMM * stepsPerMM;
	machineHeightMMSteps = machineHeightMM * stepsPerMM;

	leftMotorPositionSteps = new Victor(0,0);
	rightMotorPositionSteps = new Victor(0, machineWidthSteps);

	rightMotorPositionPixels.x = machineWidthMM * mmToPxFactor;

  motorDer.left = rightMotorPositionPixels.x;
  lineaMotorDer.set({'x1': motorDer.left, 'y1': 0})

  machineSquare.set({'width': motorDer.left, 'height': machineHeightMM * mmToPxFactor});
  canvas.renderAll();

	pxPerStep = machineWidthSteps / rightMotorPositionPixels.x;
  stepPerPx = rightMotorPositionPixels.x / machineWidthSteps;
}

// function SetMachineDimensionsSteps(_w, _h){
// 	machineWidthSteps = _w;
// 	machineHeightSteps = _h;
// 	 pxPerStep = pxToMMFactor * stepsPerMM;
// }

function SetGondolaPositionPixels(_x, _y){
  gondolaPositionPixels.x = _x;
  gondolaPositionPixels.y = _y;
  gondolaPoint.left = _x;
  gondolaPoint.top = _y;
  UpdatePositionMetadata(gondolaPositionPixels);
  // console.log("New Gondola Position: " + gondolaPositionPixels);

	let leftMotorDist = gondolaPositionPixels.distance(leftMotorPositionPixels) *  pxPerStep;
	let rightMotorDist = gondolaPositionPixels.distance(rightMotorPositionPixels) *  pxPerStep;

	let cmd = "C09,"+ Math.round(leftMotorDist) +","+ Math.round(rightMotorDist) +",END";
	SerialSend(cmd);
	// WriteConsole(cmd);
	console.log("New Pos: " + cmd);
}

function SyncGondolaPosition(_x, _y){
  gondolaPositionPixels.x = _x;
  gondolaPositionPixels.y = _y;
  gondolaPoint.left = _x;
  gondolaPoint.top = _y;
  UpdatePositionMetadata(gondolaPositionPixels);
  // console.log("New Gondola Position: " + gondolaPositionPixels);
}

function  NativeToCartesian(_left, _right){
	// Math from original polarcontroller :)  https://github.com/euphy/polargraphcontroller/blob/master/Machine.pde#L339
 	let calcX = (Math.pow(machineWidthSteps, 2) - Math.pow(_right, 2) + Math.pow(_left, 2)) / (machineWidthSteps * 2);
	let calcY = Math.sqrt( Math.pow(_left, 2) - Math.pow(calcX, 2) );

	let pos = new Victor(calcX, calcY);
	return pos;
}

function SetNextPenPositionPixels(_x, _y){
	nextPenPosition.x = _x;
	nextPenPosition.y = _y;
	newPenPositionCircle.left = _x;
	newPenPositionCircle.top = _y;
	canvas.renderAll();

	console.log("Next Position: " + nextPenPosition);

	let rightMotorDist = nextPenPosition.distance(rightMotorPositionPixels) *  pxPerStep;
	let leftMotorDist = nextPenPosition.distance(leftMotorPositionPixels) *  pxPerStep;
	let cmd = "C17,"+ Math.round(leftMotorDist) +","+ Math.round(rightMotorDist) +",2,END";
	AddToQueue(cmd);
	// WriteConsole(cmd);
	console.log("New Pos: " + cmd);
}


canvas.on('mouse:move', function(opt) {

  if (this.isDragging) {
    var e = opt.e;
    this.viewportTransform[4] += e.clientX - this.lastPosX;
    this.viewportTransform[5] += e.clientY - this.lastPosY;
    this.requestRenderAll();
    this.lastPosX = e.clientX;
    this.lastPosY = e.clientY;
  }

  let pointer = canvas.getPointer(options.e);
  mouseVector.x = pointer.x;
  mouseVector.y = pointer.y;

  UpdatePositionMetadata(mouseVector);

}); // mouse move

canvas.on('mouse:up', function(opt) {
  this.isDragging = false;
  this.selection = true;
});

canvas.on('mouse:up', function(opt) {
  this.isDragging = false;
  this.selection = true;
});

var isMouseOverCanvas;
$( "canvas" ).hover(
  function() {
    isMouseOverCanvas = true;
  }, function() {
    isMouseOverCanvas = false;
    UpdatePositionMetadata(gondolaPositionPixels);
  }
);

function UpdatePositionMetadata(vec){
  // Linea Motor
  lineaMotorDer.set({'x2': vec.x, 'y2': vec.y });
  lineaMotorIzq.set({'x2': vec.x, 'y2': vec.y});

  $("#canvasMetaData .x").html( Math.round(vec.x) );
  $("#canvasMetaData .y").html( Math.round(vec.y) );

  $("#canvasMetaData .xmm").html( (vec.x * pxToMMFactor).toFixed(1) );
  $("#canvasMetaData .ymm").html( (vec.y * pxToMMFactor).toFixed(1) );

  let disToLMotor = vec.distance(leftMotorPositionPixels);
  $("#canvasMetaData .lmotomm").html( (disToLMotor * pxToMMFactor).toFixed(1) );
  $("#canvasMetaData .lmotosteps").html( (disToLMotor *  pxPerStep).toFixed(1));

  let disToRMotor = vec.distance(rightMotorPositionPixels);
  $("#canvasMetaData .rmotomm").html( (disToRMotor * pxToMMFactor).toFixed(1) );
  $("#canvasMetaData .rmotosteps").html( (disToRMotor *  pxPerStep).toFixed(1));

  canvas.renderAll(); // update
}

canvas.on('path:created', function(e){
  canvas.isDrawingMode = false;
  var myPath = e.path;
    // console.log(myPath);
	let points = myPath.path;

	for(let i = 0; i <  points.length; i++){
		if(i == 0){
			// Es el primer punto
			AddToQueue("C14,UP,END") // pen lift
			AddPixelCoordToQueue(points[i][2], points[i][1]);
			AddToQueue("C13,DOWN,END"); // pen down

		}else if(i == points.length-1){
			// es el ultimo punto
			AddPixelCoordToQueue(points[i][2], points[i][1]);
      AddToQueue("C14,UP,END") // pen lift
		}else{
			// Es un punto normal
			AddPixelCoordToQueue(points[i][2], points[i][1]);
		}
	}
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



$('#tools-free-draw').click(function(){
	if(canvas.isDrawingMode){
		canvas.isDrawingMode = false;
	}else{
		canvas.isDrawingMode = true;
	}
});


$('#pause-queue').click(function(){
	if(isQueueActive){
		isQueueActive = false;
		$('#pause-queue').html( '<i class="play icon"></i>Play' );
	}else{
		isQueueActive = true;
		$('#pause-queue').html( '<i class="pause icon"></i>Pause' );
	}
});

$('#clear-queue').click(function(){
	machineQueue = [];
	$('#queue').html('');
});




// We are connected and ready to go
function serverConnected() {
    console.log("We are connected!");
}

// Got the list of ports
function gotList(thelist) {
  $('.ui.basic.modal').modal('show');
  // theList is an array of their names
  $("#serial_connections").html("");
  let serialConnectionsContent = "";
  for (var i = 0; i < thelist.length; i++) {
    // Display in the console
    var icon = "microchip";
    if(thelist[i].includes("Bluetooth")){
      icon = "bluetooth";
    }
    serialConnectionsContent += '<div class="ui green basic cancel inverted button" data-connectto="'+ thelist[i] +'"><i class="'+icon+' icon"></i> '+thelist[i]+'</div>';
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

function SerialSend(cmd){
  serial.write(cmd + '\n');
  statusElement.html(statusWorkingIcon);
  isMachineReady = false;
  WriteConsole(cmd)
}

// There is data available to work with from the serial port
function gotData() {
  var currentString = serial.readStringUntil("\r\n");
  // var currentString = serial.readString();
  // console.log(currentString);
  if(currentString == "") return;

  // Parse response in cases where data is space separated
  var responseWords = currentString.split(" ");
  switch(responseWords[0]){
		case 'READY':
	  		statusElement.html(statusSuccessIcon);
			isMachineReady = true;
	  		break;

		case 'Loaded':
			if(responseWords[1].startsWith("width")){
				machineWidthMM = parseInt( responseWords[1].split(":")[1] );
				$("#inputMachineWidth").val(machineWidthMM);


			}else if(responseWords[1].startsWith("height")){
				machineHeightMM = parseInt( responseWords[1].split(":")[1] );
				$("#inputMachineHeight").val(machineHeightMM);

      }else if(responseWords[1].startsWith("mmPerRev")){
        mmPerRev = parseInt( responseWords[1].split(":")[1] );
        $("#inputMmPerRev").val(mmPerRev);

			}else if(responseWords[1] == "steps" && responseWords[2] == "per" ){
				stepsPerRev = parseInt( responseWords[3].split(":")[1] );
				$("#inputStepsPerRev").val(stepsPerRev);

			}else if(responseWords[1] =="step"  && responseWords[2].startsWith("multiplier")){
				stepMultiplier = parseInt( responseWords[2].split(":")[1] );
				$("#inputStepMultiplier").val(stepMultiplier);

			}else if(responseWords[1] == "down"){
				downPos = parseInt( responseWords[2].split(":")[1] );
				$("#inputDownPos").val(downPos);

			}else if(responseWords[1] == "up"){
				upPos = parseInt( responseWords[2].split(":")[1] );
				$("#inputUpPos").val(upPos);
			}
			break;

		case 'Recalc':
			if(responseWords[1] == "mmPerStep"){
				mmPerStep = parseFloat(responseWords[2].slice(0,-2).substring(1))
				stepsPerMM = parseFloat(responseWords[4].slice(0,-1).substring(1))

				$("#inputMmPerStep").val(mmPerStep);
				$("#inputStepsPerMM").val(stepsPerMM);

			}else if(responseWords[1] == "pageWidth"){
				pageWidth = parseInt( responseWords[4].slice(0,-1).substring(1) );
				$("#inputPageWidthSteps").val(pageWidth);

			}else if(responseWords[1] == "pageHeight"){
				pageHeight = parseInt( responseWords[4].slice(0,-1).substring(1) );
				$("#inputPageHeightSteps").val(pageHeight);

				// This is the last received data, so now I recalculate
				SetMachineDimensionsMM(machineWidthMM, machineHeightMM);
			}
		break;
  }

	// Now check for cases where data is comma separated
	responseWords = currentString.split(",");
	switch(responseWords[0]){
		case "SYNC":
			syncedLeft = responseWords[1];
			syncedRight = responseWords[2];

			let gondolaPos = NativeToCartesian(syncedLeft, syncedRight);
			SyncGondolaPosition(gondolaPos.x *  stepPerPx, gondolaPos.y * stepPerPx);
			// TODO Revisar que pxPerStep este bien!
		break;
	}
  // end parse response

  if(currentString == lastReceivedString){
    let lastLog = $(".log:last-child");
    let repetitions = lastLog.data("repeated");
    repetitions++;
    lastLog.data("repeated", repetitions);
    $(".log:last-child .content").html( "(" + repetitions + ") " + currentString);
    return;
  }
  WriteConsole(currentString, true);
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
      // WriteConsole(msg, false);
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
  } else { // event not supported:
      var storedHash = window.location.hash;
      window.setInterval(function () {
          if (window.location.hash != storedHash) {
              storedHash = window.location.hash;
              hashChanged(storedHash);
          }
      }, 100);
  }


  $('.ui.menu')
  .on('click', '.item', function() {
    if(!$(this).hasClass('dropdown')) {
      $(this)
        .addClass('active')
        .siblings('.item')
          .removeClass('active');
    }
  });


    $("#serial_connections").on("click", ".button", function(){
      // serial.close();
      portName = $(this).data("connectto");
      console.log("Connectando a ", portName);
      serial.open(portName, serialOptions);
      $("#connected_to").html(portName);
    })

    $("#serial_reconnect").click(function(){
      serial.close();
      gotList(serial.list());
    })

    $('.mypopup').popup();


}); // doc ready

function WriteConsole(txt, received = false){
  let icon, clase = "log";
  if(received){
     icon = '<i class="caret down icon receivedCmd"></i>';
  }else{
    icon = '<i class="caret up icon sentCmd"></i>';
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

function CheckQueue(){
	// console.log("checking queue");
	if(isQueueActive && isMachineReady && machineQueue.length > 0){
		SerialSend( machineQueue.shift() );
		$('#queue .item').first().remove()
	}
	setTimeout(CheckQueue, 800);
}

function AddToQueue(cmd){
	$("#queue").append("<div class='queue item'><span class='cmd'>"+cmd+"</span><div class='ui divider'></div></div>");
	machineQueue.push(cmd);
}

function AddPixelCoordToQueue(x,y){
	let pos = new Victor(x *  pxPerStep, y *  pxPerStep);
	let leftMotorDist = pos.distance(leftMotorPositionSteps);
	let rightMotorDist = pos.distance(rightMotorPositionSteps);

	let cmd = "C17,"+ Math.round(leftMotorDist) +","+ Math.round(rightMotorDist) +",2,END";
	AddToQueue(cmd);
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


// TODO SVG path points to canvas pixel points
// http://fabricjs.com/using-transformations
// get SVG object transformation matrix fabric.Object.prototype.calcTransformMatrix();
// loop each svg path. loop each path's points.
// transform each point using the SVG object transfo matrix:
// fabric.util.transformPoint(point, matrix);
//
