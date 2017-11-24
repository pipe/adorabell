#!/bin/sh -v
gpio write 3 1
echo $1 $2 $3
mpg123 -q audio/en/5.mp3
cd pair;
#espeak "To set this doorbell up please use the Nearby app on your android phone."
#espeak "Or alternatively browse to pipe.com and click on the button marked 'setup your doorbell' and follow the instructions."&
node btwan.js $1 $2 $3
#espeak "Great, your doorbell is now connected to the internet !"&
cd ..
mpg123 -q audio/en/9.mp3
ping -q -w 1 pi.pe 
gpio write 3 $? 
