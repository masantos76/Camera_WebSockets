var os = require('os');

var networkInterfaces = os.networkInterfaces();

const IP_LOCAL=networkInterfaces.wlan0[0].address;
const fs = require('fs');
const https = require('https');
const path = require('path');
var express = require('express');
var app = express();

const WebSocket = require('ws');
require('dotenv').config();

//Comienzo servidor Web una sola entrada para ver si estás misma red


//Comienzo servidor Web una sola entrada para ver si estás misma red
const httpsServer=https.createServer({
  key: fs.readFileSync('my_cert.key'),
  cert: fs.readFileSync('my_cert.crt')
}, app).listen(8083, function(){
  console.log("My HTTPS server listening on port " + 8083 + "...");
});

app.get('/', function(request,response){
  let filePath = request.url;

  if (filePath === '/') {
    filePath = 'index.html';
  }
  filePath = `html/${filePath}`;

  const extname = path.extname(filePath);
  let contentType;

  switch (extname) {
    case '.css':
      contentType = 'text/css';
      break;
    case '.html':
      contentType = 'text/html';
    break;
  }

  response.writeHead(200, { 'Content-Type': `${contentType}; charset=UTF-8` });

  fs.readFile(filePath,(err,content)=>{
    if (err) {
      return console.log('Error: ', err);
    }

    response.write(content);
    response.end();
});
app.get('/camera', function(req, res){
  res.send("Si quieres usar la cámara de manera local, debes acceptar el certificado local");
});



// Comienzo el servidor Web Sockets
//const webSocketServer = new WebSocket.Server({ port: process.env.PORT  });
const webSocketServer = new WebSocket.Server({server: httpsServer });

let  spawn = require("child_process").spawn;
let process_py=null;
let recibido=false;
let user_web=null;


webSocketServer.on('connection',  function(ws)
{

    ws.on('message', toEvent)
    .on('instr',function(data)
      {
            data1 =JSON.parse(data);

            if(data1.message=="SYNC")
            {
                broadcast(JSON.stringify({ type: 'ip', message: IP_LOCAL}));
                user_web=ws;
            }
            else
           {
                // console.log("recibido")
                recibido=true;
           }

      })
    .on('python',function(data){
         data1 =JSON.parse(data);
        if(process_py!=null)
                process_py.kill();
        recibido=true;



        process_py = spawn('python3',["main.py",IP_LOCAL,data1.message] );


    })
    .on('close',function(data){
        let cont=0;
        webSocketServer.clients.forEach((client) => {
          cont++
        });
       if(cont<=1 && process_py!=null)
              process_py.kill()
  });
});

function toEvent (message) {

try {
  let {type, payload} = JSON.parse(message)

  this.emit(type, payload || message)
} catch (ignore) {
  //Se manda imagen
  if(recibido && user_web!=null)
  {
     //broadcast(message.toString('utf-8'));
     user_web.send(message);
     recibido=false;
  }
}
}

function broadcast(data) {
    webSocketServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {

            client.send(data);

    }
    });
}
