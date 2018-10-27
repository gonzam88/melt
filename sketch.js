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
var wsConnected = false;

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
var motorMaxSpeed, motorAcceleration;

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

var canvas;
var motorLineRight, motorLineLeft, motorRightCircle, motorLeftCircle, machineSquare;
var mouseVector = new Victor(0,0);
var isSettingGondolaPos = false;
var isSettingNewPenPosition = false;
var gondolaPositionPixels = new Victor(0,0);
var nextPenPosition = new Victor(0,0);
var gondolaCircle;

var leftMotorPositionPixels = new Victor(0,0);
var rightMotorPositionPixels = new Victor(0,0);
var newPenPositionArrow, newPenPositionCircle;

var melt;

$("document").ready(function(){
  if( window.location.hash != ""){
		window.location.href = location.href.replace(location.hash,"") ;
	}else{
    MeltInit();
    FabricInit();
    UiInit();

  }




}); // doc ready

function MeltInit(){
    // SERIAL Start
    serial = new p5.SerialPort();
    // Let's list the ports available
    var portlist = serial.list();
    serial.on('connected', serverConnected);
    serial.on('list', gotList);
    serial.on('data', gotData);
    serial.on('error', gotError);
    serial.on('open', gotOpen);

    setTimeout(CheckWsConnection, 1000); // 1 second after we start, we check wether a connection has been established to WebSocket. otherwise we show an alert
    CheckQueue();

    // Define the Melt Object
    melt = new Melt();
} // Melt Init

function FabricInit(){
  canvas = new fabric.Canvas('myCanvas');
  canvas.freeDrawingBrush.color = "purple";
  canvas.freeDrawingBrush.width = .5;
  canvas.isDrawingMode = false;

  window.addEventListener('resize', resizeCanvas, false);
  // resize on init
  // resizeCanvas();
  // DrawGrid();

  // Define some fabric.js elements
  motorLineRight = new fabric.Line([rightMotorPositionPixels.x, rightMotorPositionPixels.y, 0, 0], {
      left: 0, top: 0, stroke: 'grey', selectable:false
  });
  motorLineLeft = new fabric.Line([leftMotorPositionPixels.x, leftMotorPositionPixels.y, 0, 0], {
      left: 0, top: 0, stroke: 'grey', selectable:false
  });
  canvas.add(motorLineRight);
  canvas.add(motorLineLeft);

  motorRightCircle = new fabric.Circle({
      radius: 6, fill: 'white', left: rightMotorPositionPixels.x, top: rightMotorPositionPixels.y, hasControls: false, originX: 'center', originY: 'center',
  lockRotation: true,
  lockMovementX: true,
  lockMovementY: true,
  lockScalingX: true,
  lockScalingY: true,
  lockUniScaling: true,
      hasControls: false
  });
  motorLeftCircle = new fabric.Circle({
      radius: 6, fill: 'white', left: leftMotorPositionPixels.x, top: rightMotorPositionPixels.y, hasControls: false, originX: 'center', originY: 'center',
  lockRotation: true,
  lockMovementX: true,
  lockMovementY: true,
  lockScalingX: true,
  lockScalingY: true,
  lockUniScaling: true,
      hasControls: false
  });
  canvas.add(motorRightCircle);
  canvas.add(motorLeftCircle);

  gondolaCircle = new fabric.Circle({
      radius: 3, fill: '#a4bd8e', left: 0, top: 0, hasControls: false, originX: 'center', originY: 'center',
  lockRotation: true,
  lockMovementX: true,
  lockMovementY: true,
  lockScalingX: true,
  lockScalingY: true,
  lockUniScaling: true,
      hasControls: false
  });
  canvas.add(gondolaCircle);

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

    let objs = canvas.getObjects();
    for(let i=0; i < objs.length; i++ ){
      if( !objs[i].isGrid){
        objs[i].setCoords();
      }
    }
  });

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

  // canvas mouse move
  canvas.on('mouse:move', function(opt) {
  	if (this.isDragging) {
  		var e = opt.e;
      // Pan
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

  var isMouseOverCanvas;
  $( "canvas" ).hover(
    function() {
      isMouseOverCanvas = true;
    }, function() {
      isMouseOverCanvas = false;
      UpdatePositionMetadata(gondolaPositionPixels);
    }
  );

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

} // fabric init

function UiInit(){
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
    if(serial.isConnected()){
      serial.close();
    }
    DisableWorkspace();
    statusElement.html(statusErrorIcon);

    portName = $(this).data("connectto");
    console.log("Connectando a ", portName);
    serial.open(portName, serialOptions);
    $("#connected_to").html(portName);
  })

  $(".serial_reconnect").click(function(){
    gotList(serial.list());
  })

  $('.mypopup').popup();

  $("#set-custom-postion").click(function(){
  	isSettingGondolaPos = true;
  })

  $("#control-pen-position").click(function(){
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


} // ui elements init


// Machine functions

function SetMachineDimensionsMM(_w, _h){
	machineWidthMM = _w;
	machineHeightMM = _h;

	machineWidthSteps = machineWidthMM * stepsPerMM;
	machineHeightMMSteps = machineHeightMM * stepsPerMM;

	leftMotorPositionSteps = new Victor(0,0);
	rightMotorPositionSteps = new Victor(0, machineWidthSteps);

	rightMotorPositionPixels.x = machineWidthMM * mmToPxFactor;

	motorRightCircle.left = rightMotorPositionPixels.x;
	motorLineRight.set({'x1': motorRightCircle.left, 'y1': 0})

	machineSquare.set({'width': motorRightCircle.left, 'height': machineHeightMM * mmToPxFactor});
	canvas.renderAll();

	pxPerStep = machineWidthSteps / rightMotorPositionPixels.x;
	stepPerPx = rightMotorPositionPixels.x / machineWidthSteps;

  resizeCanvas();
  DrawGrid();
}

function SetGondolaPositionPixels(_x, _y){
	gondolaPositionPixels.x = _x;
	gondolaPositionPixels.y = _y;
	gondolaCircle.left = _x;
	gondolaCircle.top = _y;
	UpdatePositionMetadata(gondolaPositionPixels);

	let leftMotorDist = gondolaPositionPixels.distance(leftMotorPositionPixels) *  pxPerStep;
	let rightMotorDist = gondolaPositionPixels.distance(rightMotorPositionPixels) *  pxPerStep;

	let cmd = "C09,"+ Math.round(leftMotorDist) +","+ Math.round(rightMotorDist) +",END";
	SerialSend(cmd);
	console.log("New Pos: " + cmd);
}

function SyncGondolaPosition(_x, _y){
	gondolaPositionPixels.x = _x;
	gondolaPositionPixels.y = _y;
	gondolaCircle.left = _x;
	gondolaCircle.top = _y;
	UpdatePositionMetadata(gondolaPositionPixels);
}

function  NativeToCartesian(_left, _right){
	// Math borrowed from original polarcontroller :)  https://github.com/euphy/polargraphcontroller/blob/master/Machine.pde#L339
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

function UpdatePositionMetadata(vec){
  // Linea Motor
  motorLineRight.set({'x2': vec.x, 'y2': vec.y });
  motorLineLeft.set({'x2': vec.x, 'y2': vec.y});

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


// We are connected and ready to go
function serverConnected() {
    console.log("We are connected!");
	wsConnected = true;
	$("#ws-alert").hide();
}
function CheckWsConnection(){
	if(!wsConnected){
		$("#ws-alert").slideDown();
	}
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
}

// Ut oh, here is an error, let's log it
function gotError(theerror) {
	console.log(theerror);
	statusElement.html(statusErrorIcon);
}

function p(txt){
  console.log(txt);
}

var lastReceivedString = "";
var lastSentCmd = ""; // TODO hacer de esto un array

function SerialSend(cmd){
  serial.write(cmd + '\n');
  statusElement.html(statusWorkingIcon);
  isMachineReady = false;
  WriteConsole(cmd)
}

function EnableWorkspace(){
  $("#dimmerEl").removeClass("active");
}
function DisableWorkspace(){
  $("#dimmerEl").addClass("active");
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
    case 'POLARGRAPH':
      // Serial connection worked
      statusElement.html(statusSuccessIcon);
      EnableWorkspace();
      SerialSend("C26,END");
    break;

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

    case 'PGSPEED':
      motorMaxSpeed = parseInt( responseWords[1] );
      motorAcceleration = parseInt( responseWords[2] );

      $("#inputMaxSpeed").val(motorMaxSpeed);
      $("#inputAcceleration").val(motorAcceleration);

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
  // $("#console").scrollTop($("#console")[0].scrollHeight); // Scroleo para abajo de todo

  if($("#console").children().length > 500){
    // Limit the amount of console history
    $("#console").children().first().remove();
  }
}

var currContent = $("#content-control");

function hashChanged(h){
  h = h.substr(1);
  let newContent = $("#content-"+h);
  // if( currContent != newContent ){
  currContent.hide();
  newContent.show();
  if(h == "console"){
    $("#console").scrollTop($("#console")[0].scrollHeight); // Scroleo para abajo de todo
  }
  currContent = newContent;
  // }

}

var externalQueueLength = 0;
function CheckQueue(){
	// console.log("checking queue");
	if(isQueueActive && isMachineReady && machineQueue.length > 0){
		SerialSend( machineQueue.shift() );
		$('#queue .item').first().remove()
	}
	setTimeout(CheckQueue, 200);
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

function AddMMCoordToQueue(x,y){
	let pos = new Victor(x *  mmPerStep, y *  mmPerStep);
	let leftMotorDist = pos.distance(leftMotorPositionSteps);
	let rightMotorDist = pos.distance(rightMotorPositionSteps);

	let cmd = "C17,"+ Math.round(leftMotorDist) +","+ Math.round(rightMotorDist) +",2,END";
	AddToQueue(cmd);
}

function DrawGrid(){
  let offset = -200;
  options = {
    isGrid: true,
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

function resizeCanvas() {
  canvas.setHeight( $('#canvasSizer').height() );
  canvas.setWidth(  $('#canvasSizer').width() );

  let offX = (canvas.width - machineSquare.width) / 2;
  let offY = (canvas.height - machineSquare.height) / 2;

  canvas.viewportTransform[4] = offX;
  canvas.viewportTransform[5] = offY;
  canvas.requestRenderAll();
}


function map(x, in_min, in_max, out_min, out_max)
{
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

const Polargraph = class{
	// TODO Put plotter functions here
}

const Melt = class{
	// Drawing Functions
	//
	// They try to mimic the p5.js reference
	//
	constructor(){
		this.isDrawingPath = false;
		// if set to true it wont move the pen up and down after each shape
	}
	BeginShape(){
		this.isDrawingPath = true;
	}
	EndShape(){
		this.isDrawingPath = false;
	}
	PenUp(){
		AddToQueue("C14,UP,END") // pen lift
	}
	PenDown(){
		AddToQueue("C13,DOWN,END"); // pen down
	}

	line(x1, y1, x2, y2){
		/// <summary>Draws a line from (x1, y1) to (x2, y2). Positions should be set in millimetres. Warning! If called between StartPath() and EndPath(), pen will not be raised when moving to starting coordinate</summary>
		if( !this.isDrawingPath ){
			this.PenUp();
		}

		AddMMCoordToQueue(x1,y1);

		if( !this.isDrawingPath ){
			this.PenDown();
		}

		AddMMCoordToQueue(x2,y2);

		if( !this.isDrawingPath ){
			this.PenDown();
		}
	}

	ellipse(x, y, r, res = 100){
		// First I generete an array of points that create the circle
		this.circleVectors = [];
	    for (let i = 0; i < res; i++) {
	        let angle = map(i, 0, res, 0, 2 * Math.PI);
	        let posX = (r * Math.cos(angle) + x);
	        let posY = (r * Math.sin(angle) + y);
			this.temp = new Victor(posX, posY);
	        this.circleVectors.push(this.temp);
	    }

		this.PenUp();

		for(let i = 0; i < this.circleVectors.length; i++){
			AddMMCoordToQueue(this.circleVectors[i].x, this.circleVectors[i].y);
		}

		this.PenDown();
	}
}

// const melt = new Melt();
