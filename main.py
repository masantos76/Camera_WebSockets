#import time
import cv2
import websockets
#import json
import base64
import asyncio
import sys

IP= sys.argv[1]
resol = int(sys.argv[2])



capture = cv2.VideoCapture(0)
if not capture.isOpened():
    raise IOError("Cannot open webcam")

capture.set(cv2.CAP_PROP_BUFFERSIZE,4)
capture.set(cv2.CAP_PROP_FRAME_WIDTH,15)
capture.set(cv2.CAP_PROP_FRAME_HEIGHT,15)
capture.set(cv2.CAP_PROP_FPS,1)


async def hello():
    #async with websockets.connect("wss://servidor-rover5.herokuapp.com") as ws:
    async with websockets.connect("ws://"+IP+":8083") as ws:
        try:
           j=0
           while True:
               ret, frame = capture.read()
               #print(frame.shape)
               #cv2.GaussianBlur(frame, (15,15), 0)

               frame = cv2.resize(frame, (int(frame.shape[1]*resol/100),int(frame.shape[0]*resol/100)), interpolation=cv2.INTER_AREA)
               #print(frame.shape)
               res, frame = cv2.imencode('.jpg', frame)
               data=base64.b64encode(frame)
               j=j+1
               print(j)
               #info={'type':'image','message':data.decode('utf-8')}
               await ws.send(data)
               #time.sleep(0.3)
        except KeyboardInterrupt:
            capture.release()
asyncio.get_event_loop().run_until_complete(hello())
