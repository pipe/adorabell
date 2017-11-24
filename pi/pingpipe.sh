#!/bin/sh
gpio mode 3 out 
while true 
do
  gpio write 3 1
  ping -q -w 1 pi.pe 
  gpio write 3 $? 
  sleep 5
done
