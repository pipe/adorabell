#!/bin/sh -v
echo '{
  "notification": {
    "title": "Someone at the door (' `date` ')",
    "body": "click to see who or speak with them.",
    "icon": "/img/pipe.png",
    "click_action": "https://pi.pe/iot/adorabell.html"
  },
  "to": ' `cat firebasetoken` ' }' | \
curl -X POST -H "Authorization: key=${FIREBASEKEY}" \
  -H "Content-Type: application/json" -d @- \
  "https://fcm.googleapis.com/fcm/send"
