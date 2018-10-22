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


var statusErrorIcon = '<i class="statuserror small exclamation circle icon"></i>';
var statusSuccessIcon = '<i class="statusok small check circle icon"></i>';
var statusWorkingIcon = '<i class="statusworking notched circle loading icon"></i>';
var statusElement = $("#statusAlert");


var padre = $("#p5container");

function setup() {
  var cnv = createCanvas(padre.width(), wToHRatio(padre.width()));
  cnv.parent('p5container');
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
}

function wToHRatio(w){
  return w / 3 * 2;
}

function windowResized() {
  AjustarTamanno();
}
function AjustarTamanno(){
  let w = padre.width();
  let h = wToHRatio(padre.width());
  if(h > padre.height()-20){
    h = padre.height()-10;
    w = h / 2 * 3;
  }
  resizeCanvas(w, h);
}

var leftLength, leftMotor, rightMotor, rightLength, mousePos;

function draw() {
  // black background, white text:
  background("#3A4251");

  // Set colors
  fill("#81A2C1");
  stroke("#81A2C1");


  strokeWeight(5);
  line(0,0, mouseX, mouseY);
  line(width,0, mouseX, mouseY);

  mousePos = createVector(mouseX, mouseY);
  leftMotor = createVector(0,0);
  rightMotor = createVector(width,0);

  leftLength = leftMotor.dist(mousePos);
  rightLength = rightMotor.dist(mousePos);

  noFill();
  strokeWeight(1);
  ellipse(0,0,leftLength*2,leftLength*2);
  ellipse(width,0,rightLength*2,rightLength*2);


}
// We are connected and ready to go
function serverConnected() {
    print("We are connected!");
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
  print("Serial Port is open!");
  statusElement.html(statusSuccessIcon);
}

// Ut oh, here is an error, let's log it
function gotError(theerror) {
  print(theerror);
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
  AjustarTamanno();

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
