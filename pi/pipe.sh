#!/bin/sh
#espeak "Hello, I am your pipe connected doorbell"&
gpio mode 2 up
gpio mode 3 out 
gpio write 3 0
gpio mode 0 out 
gpio write 0 1
gpio mode 4 out
gpio write 4 0
if [ ! -f /sys/class/gpio/gpio17/value ]
then 
   echo 17 >/sys/class/gpio/export
fi
ln -f -s /sys/class/gpio/gpio17/value owned
res=`gpio read 2`
if [ $res -eq "0" ]
then
   ./reset
fi
mpg123 -q audio/en/1.mp3 >/dev/null 
nohup ./push.sh > push.out &
if [ ! -f ipsecert.ks ]; then
    (sleep 5; mpg123 -q audio/en/2.mp3 audio/en/3.mp3) &
fi
LD_LIBRARY_PATH=`pwd`/phono_opus export LD_LIBRARY_PATH
nohup java -Xmx128m -Djava.net.preferIPv4Stack=true -Dpe.pi.client.small.defaultPage=adorabell.html -Dpi.pe.client.debug=3 -jar pipe-java-client-1.0-SNAPSHOT.jar> pipe.out &

