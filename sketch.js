/*
  Test this with the Arduino sketch echo.ino, in the p5.serialport
  examples/echo directory.

  Try at varying baudrates, up to 115200 (make sure to change
  Arduino to matching baud rate)
*/

var serial; // variable to hold an instance of the serialport library
var portName = '/dev/cu.usbmodem614'; // fill in your serial port name here
var inData; // for incoming serial data
var inByte;
var byteCount = 0;
var output = 0;
var options = {
  baudrate: 57600
};

//var machineWidthRevs = 1500; machineHeightRevs = 1200;
var mmToPxFactor;
var mmToRevsFactor;

var leftDistRevs = 0, rightDistRevs = 0, leftDistMM = 0, rightDistMM = 0;

var leftLength, leftMotor, rightMotor, rightLength, mousePos, machineSq;
var page;


var statusErrorIcon = '<i class="statuserror small exclamation circle icon"></i>';
var statusSuccessIcon = '<i class="statusok small check circle icon"></i>';
var statusWorkingIcon = '<i class="statusworking notched circle loading icon"></i>';
var statusElement = $("#statusAlert");

var canvas,lineaMotorDer;

(function(){
    // SERIAL Start
    // Instantiate our SerialPort object
    serial = new p5.SerialPort();
    // Let's list the ports available
    var portlist = serial.list();
    // Assuming our Arduino is connected, let's open the connection to it
    // Change this to the name of your arduino's serial port
    serial.open(portName, options);
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

      function resizeCanvas() {
        canvas.setHeight( $('#canvasSizer').height() );
        canvas.setWidth(  $('#canvasSizer').width() );
        canvas.renderAll();
      }




      lineaMotorDer = new fabric.Line([0, 0, 100, 200], {
              left: 0,
              top: 0,
              stroke: 'grey'
      });
      canvas.add(lineaMotorDer);

      var motorDer = new fabric.Circle({
        radius: 6, fill: 'white', left: -6, top: -6, hasControls: false
      });
      var motorIzq = new fabric.Circle({
        radius: 6, fill: 'white', left: 400, top: 0, hasControls: false
      });
      canvas.add(motorDer);
      canvas.add(motorIzq);

      // canvas.isDrawingMode= 1;
      //     canvas.freeDrawingBrush.color = "purple";
      //     canvas.freeDrawingBrush.width = 10;
      //     canvas.renderAll();

    // resize on init
    resizeCanvas();
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
  if (evt.altKey === true) {
    this.isDragging = true;
    this.selection = false;
    this.lastPosX = evt.clientX;
    this.lastPosY = evt.clientY;
  }
});
canvas.on('mouse:move', function(opt) {
  if (this.isDragging) {
    var e = opt.e;
    this.viewportTransform[4] += e.clientX - this.lastPosX;
    this.viewportTransform[5] += e.clientY - this.lastPosY;
    this.requestRenderAll();
    this.lastPosX = e.clientX;
    this.lastPosY = e.clientY;
  }


});
canvas.on('mouse:up', function(opt) {
  this.isDragging = false;
  this.selection = true;
});

var mouseX, mouseY;

canvas.on('mouse:move', function(options) {
    mouseX = options.e.layerX;
    mouseY = options.e.layerY;

    // Linea Motor
    lineaMotorDer.set({'x2': mouseX, 'y2': mouseY });
    canvas.renderAll(); // update
});

canvas.on('path:created', function(e){
    var your_path = e.path;
    console.log(your_path);
    // ... do something with your path
});


// var padre = $("#p5container");
//
// function setup() {
//   var cnv = createCanvas(padre.width(), wToHRatio(padre.width()));
//   cnv.parent('p5container');
//   // Instantiate our SerialPort object
//   serial = new p5.SerialPort();
//
//   // Let's list the ports available
//   var portlist = serial.list();
//
//   // Assuming our Arduino is connected, let's open the connection to it
//   // Change this to the name of your arduino's serial port
//   serial.open(portName, options);
//   // Register some callbacks
//   // When we connect to the underlying server
//   serial.on('connected', serverConnected);
//   // When we get a list of serial ports that are available
//   serial.on('list', gotList);
//   // When we some data from the serial port
//   serial.on('data', gotData);
//   // When or if we get an error
//   serial.on('error', gotError);
//   // When our serial port is opened and ready for read/write
//   serial.on('open', gotOpen);
//
//
//   // mousePos = createVector(0, 0);
//   mousePos = new Point();
//   leftMotor = new Point(0, 0);
//   rightMotor = new Point(1, 0);
//
//   page = new RealWorldSquare(1000, 800); // New page that 800mm x 600mm
//   machine = new RealWorldSquare(1200, 1000) // My machine is 1200mm x 1000mm
//
//   CalculateSizes();
// }
//
//
//
// function draw() {
//   // black background, white text:
//   // background("#523A3A");
//   background("#3C523A");
//
//   // Set colors
//   fill("#81A2C1");
//   stroke("#81A2C1");
//
//
//   if(mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height){
//     // El mouse está adentro del area
//
//
//
//     // mousePos = createVector(mouseX, mouseY);
//     // leftMotor = createVector(0,0);
//     // rightMotor = createVector(width,0);
//     //
//     // leftLength = leftMotor.dist(mousePos) / width;
//     // rightLength = rightMotor.dist(mousePos) / width;
//
//     fill("red");
//
//   }
//
// // rect(0,0,100,100);
//
//   // noFill();
//   // strokeWeight(1);
//   // ellipse(0,0,leftLength * width *2,leftLength * width *2);
//   // ellipse(width,0,rightLength * width *2,rightLength * width *2);
//   //
//   // strokeWeight(5);
//   // line(0,0, mousePos.x, mousePos.y);
//   // line(width,0, mousePos.x, mousePos.y);
//
// ellipse(100,100,100,100);
//   // p("left len: " + leftLength + " _ right len: " + rightLength);
//   fill(255);
//   noStroke();
//   text("X: " + mouseX, (mouseX + 10) , mouseY);
//   text("Y: " + mouseY, (mouseX + 10) , mouseY +20);
//   page.draw()
//
//
// }

function CalculateSizes(){

    mmToPxFactor = width / machine.width ;
    console.log(mmToPxFactor);


}

function Point(_x, _y){ // x, y son coordenadas de espacio de canvas
  "use strict"; // constructor
  this.pos = createVector(_x / width, _y / height) // pero aca X e Y se guardan como coordenadas normalizadas (de 0 a 1);

  this.posCartesian = createVector(this.x, this.y);

  this.posMM = function(){
    return createVector(this.pos.x * machineWidthMM, this.pos.y * machineHeightMM);
  }
  this.posRevs = function(){
    return createVector(this.pos.x * machineWidthRevs, this.pos.y * machineWidthRevs);
  }

  this.leftDist = function(){
    return this.pos.dist(leftMotor.pos);
  }
  this.rightDist = function(){
    return this.pos.dist(rightMotor.pos);
  }

}

function RealWorldSquare(_w, _h){

  // this.pos = createVector(_x / width, _y / height);
  this.width = _w;
  this.height = _h;

  this.isVertical = function(){
    if(this.width > this.height){
      return false;
    }else{
      return true;
    } // TODO Excepcion para cuando es cuadrado. No es grave
  }

  this.pixelPosition = function(){
    return createVector(this.pos.x * width, this.pos.y * height);
  }
  this.pixelHeight = function(){
    return this.height * mmToPxFactor;
  }
  this.pixelWidth = function(){
    return this.width * mmToPxFactor;
  }

  this.draw = function(){

    let w = this.width * mmToPxFactor;
    let h = this.height * mmToPxFactor;

    let xpos = (width/2) - (w / 2);
    let ypos = 0;
    // xpos -= w/2;
    // // Alineacion vertical = top
    // // Alineacion horizontal = middle
    rect(xpos, ypos, w, h);
    // console.log(xpos, ypos, w, h);
  }

}






// function wToHRatio(w){
//   return w / 3 * 2;
// }

// function windowResized() {
//   AjustarTamanno();
// }
// function AjustarTamanno(){
//   let w = padre.width();
//   let h = wToHRatio(padre.width());
//   if(h > padre.height()-20){
//     h = padre.height()-10;
//     w = h / 2 * 3;
//   }
//   resizeCanvas(w, h);
// }



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
      // console.log("sd");
      portName = $(this).data("connectto");
      console.log("Connectando a ", portName);
      serial.open(portName, options);
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
