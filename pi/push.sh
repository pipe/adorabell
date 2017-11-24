#!/bin/sh
gpio mode 2 up
while true 
do
  gpio wfi 2 falling 
  #espeak "ding dong"
  mpg123 -q audio/en/14.mp3
  raspistill -w 320 -h 240 -q 50 -t 1 -dt -o test.jpg
  ./notify.sh
done
