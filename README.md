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

* Raspberry Pi 3 Model B or a Raspberry Pi Zero W
* SD Card suitable for loading Raspbian image
* Ethernet TP cable, for connecting the Arduino to a switch/router (for Raspberry Pi 3 Model B)
* Mouse/Keyboard/HDMI Cable & Monitor (to initially setup the Raspberry Pi)
* Flat cable (or other cabling preference), for connecting the Arduino to the PACS device. How the actual physical cabling is performed is left for the user to decide. 
* USB cable, (Type?) for powering the Raspberry Pi.

### Software

* NodeJS
* pigpio
* To use the web GUI, a browser which supports both WebSockets RFC6455 and AngularJS is needed (Chrome version 30+ should work fine).
* There are dependencies to other Arduino libraries, see "Quick Start" for further details.

## Getting Started
