# Melt
A polargraph controller

Melt is my response to the awesome and complete [Polargraph Controller](https://github.com/euphy/polargraphcontroller) made by Sandy Noble. It's a way to interact with the [Polargraph Server](https://github.com/euphy/polargraph_server_a1) in a more modern and flexible way.

![Custom JS Code](https://imgur.com/1YWHNgT.png "Melt Code")
![Queue with progress bar](https://imgur.com/xBnWbj4.png "Melt Queue")
![Configuration tab showing command and description](https://imgur.com/uJybIep.png "Melt Configuration")

## About
My main goal when making Melt was to create a way to write creative code as if it were p5.js or Processing, being able to import a sketch and make minimum changes for the plotter to make the drawing. It's also the best possible way for a slow, relaxed debugging.
The controller UI is a basic web page that runs on your computer. The file containing all the logic is *melt.js*, where the controller and several libraries are managed.
Because a web page can't communicate through the serial port I use the p5.serialport library on Node, in between. p5.serialport opens a socket which the web page connects to, like this:

`*Melt* << socket >> *p5.serialport* << serial >> *polargraph server on arduino*`

## Install

1. [Clone / Download p5.serialport](https://github.com/vanevery/p5.serialport) (we need to run this in Node.js)
2. Open p5.serialserver.js. Change line 22 to the following:
`var SERVER_PORT = 57600;`
(This is the polargraph serial port baud rate)
3. [Download and install node.js](https://nodejs.org/en/download/)
4. There are many ways to install, described on their docs site. This is the simplest. in Terminal / Command Line:
```cd path/to/p5.serialport
npm install
node startserver.js
```
Last step is required everytime you want to use melt.
5. Either a) Drag and drop index.html to your browser, or b) Run a local server like Mamp/Wamp and enter through localhost/melt. Option b has a few benefits from using web workers, but both are supported.

## Awesome Libraries used in this project
- [polargraph_server_a1](https://github.com/euphy/polargraph_server_a1)
- [semantic-ui](https://semantic-ui.com/)
- [p5.serialport](https://github.com/vanevery/p5.serialport)
- [fabric.js](http://fabricjs.com)
- [Ace code editor](https://ace.c9.io/)
- [Victor](http://victorjs.org)
- [jquery](https://jquery.com/)

## Use

This software is not even Alpha. There's no warranty, but also it's harmless. My idea in the future is to have this wrapped into an electron app or similar, so there's no need to have Node or local server environment running.
Feel free to suggest improvements, submit issues or pull request new features/fixes

You are most invited to open the developer console, poke around, break things and hack your way.
