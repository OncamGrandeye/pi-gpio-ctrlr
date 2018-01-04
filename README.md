Input/Output/Motion Test Tool
=========================

- [Overview](#overview)
- [Requirements](#requirements)
 - [Hardware](#hardware)
 - [Software](#software)
- [Getting Started](#getting-started)
 - [Dependencies](#dependencies)
 - [Basic Installation Steps](#basic-installation-steps)

## Overview
The Input/Output/Motion Test Tool is used to generate motion and input on demand to external devices and monitor outputs from those same devices, which uses the Raspberry Pi platform. It’s purpose is to aid in the testing of devices by facilitating automated and manual tests. It does this by enabling you to generate input data to simulate the following devices:

* Digital input/Switches
* Visual motion when present within a camera's field of view.

And providing feedback for output pins, namely:

* Digital output/Relays

Two interfaces are provided for controlling input and reading output; HTTP and WebSockets. Additionally, a Web GUI (which uses the WebSockets interface and resides on the Raspberry Pi itself) is provided.

## Requirements

### Hardware

* Raspberry Pi
* SD Card (Class 10 with 16GB or higher)
* WiFi/Ethernet Cable connection for the Raspberry Pi
* Mouse/Keyboard/HDMI Cable & Monitor (to initially setup the Raspberry Pi)
* Flat cable (or other cabling preference), for connecting the Raspberry Pi to the device. How the actual physical cabling is performed is left for the user to decide. 
* Micro USB cable for powering the Raspberry Pi (2.5A or greater).

### Software

* Raspbian
* NodeJS
* pigpio
* To use the web GUI, a browser which supports both WebSockets RFC6455 and AngularJS is needed (Chrome version 30+ should work fine).

## Getting Started

The Test Tool is developed using NodeJS for the Raspberry Pi. (See https://www.w3schools.com/nodejs/nodejs_raspberrypi.asp for setting up the environment)

Installing Node.js on Raspberry Pi


