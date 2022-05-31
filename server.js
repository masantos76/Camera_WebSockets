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
const httpsServer=https.createServer({
  key: fs.readFileSync('my_cert.key'),
  cert: fs.readFileSync('my_cert.crt')
}, app).listen(8083, function(){
  console.log("My HTTPS server listening on port " + 8083 + "...");
});


// obtiene la ruta del directorio publico donde se encuentran los elementos estaticos (css, js).
var publicPath = path.resolve(__dirname, 'html');

// Para que los archivos estaticos queden disponibles.
app.use(express.static(publicPath));

app.get('/Rover_RC', function(req,res){
   res.sendFile(__dirname + '/html/index.html');
});
app.get('/camera', function(req, res){
  res.send("<h1>¡¡ Enhorabuena, si estás leyendo este mensaje es que has aceptado el certificado de seguridad para la aplicación Rover_RC !!</h1><script>window.close()</script>");
});



// Comienzo el servidor Web Sockets
//const webSocketServer = new WebSocket.Server({ port: process.env.PORT  });
const webSocketServer = new WebSocket.Server({server: httpsServer });

let  spawn = require("child_process").spawn;
let process_py=null;
let recibido=false;
let foto_ini=null;



let user_nodemcu=null;
let user_web=null;
//let id=false;//Para que no se duerma al desplegarlo en Heroku

webSocketServer.on('connection',  function(ws)
{
    ws.on('message', toEvent)


      .on('instr',function(data)
      {


            data1 =JSON.parse(data);

            if(data1.message=="SYNC")
            {
              if(user_web != null)
              {
                let usuario_ant=user_web;
                usuario_ant.close();//genera un código de 1005
              }
              user_web=ws;
              broadcast(JSON.stringify({type:data1.type,message:data1.message}));
            }
            else if(data1.message=="GET_IP")
            {
                broadcast(JSON.stringify({ type: 'ip', message: IP_LOCAL}));

            }
            else if(data1.message=="IMG")
            {
                let foto_fin=new Date;
                let tiempo=foto_fin.getTime()-foto_ini.getTime();
                user_nodemcu.send(JSON.stringify({type:"FOTO",message:tiempo}));
                recibido=true;
            }
            else
            {
                //Se manda la instrucción a todos los conectados (NODEMECU y unico cliente web cómo máx) pero solo es tratada en NODEMECU
                broadcast(JSON.stringify({type:data1.type,message:data1.message}));
            }



      })
      .on('python',function(data){
            data1 =JSON.parse(data);
            if(process_py!=null)
                    process_py.kill();
            recibido=true;



            process_py = spawn('python3',["main.py",IP_LOCAL,data1.message] );


        })
 .on('no_python',function(data){

            if(process_py!=null)
                    process_py.kill();
            recibido=false;

        })
      .on('arduino',function(data)
      {
                data1 =JSON.parse(data);

            if(user_nodemcu == null)
               user_nodemcu=ws;
            //solo se manda la información proveniente del NODEMCU al único cliente web que esté conectado
            user_web.send(JSON.stringify({type:data1.type,message:data1.message}));


      })
      .on('close',  function(data)
      {
        if(data==1006 && (ws==user_web || ws==user_nodemcu))//solo se manda la información al único cliente web que esté conectado y cuando se pierde la conexión con el NODEMECU(1006 y con el cliente Web)
         {
           if (ws!=user_web && user_web!= null  && user_web.readyState === WebSocket.OPEN)
            {
                user_web.send(JSON.stringify({ type: 'desconexion', message: data}));
                if(process_py!=null)
                    process_py.kill();

            }

           else if (ws!=user_nodemcu && user_nodemcu!= null  && user_nodemcu.readyState === WebSocket.OPEN)
              user_nodemcu.send(JSON.stringify({ type: 'instr', message: 'SYNC'}));
         }
      })


  // Esto es para que Heroku no se  duerma y mantenga las conexiones abiertas aunque no se manden mensajes,
  // Cada 15 segundos y mientras tenga al menos un cliente, mando a cada cliente conectado un mensaje "vano"

  /*  if(!id)
    {
        let cont=0;
        id=setInterval(() => {

          webSocketServer.clients.forEach((client) => {
            cont++

            client.send(JSON.stringify({ type: 'no_sleep', message: new Date().toTimeString()}));
          });

          if(cont==0)
          {
            clearInterval(id);
            id=false;
          }
          cont=0;
        }, 15000);// 15 segundos
    }*/
});

function toEvent (message) {

    try {
      let {type, payload} = JSON.parse(message)

      this.emit(type, payload || message)
    } catch (ignore) {
      //Se manda imagen
      if(recibido && user_web!=null)
      {
        recibido=false;
        foto_ini=new Date;
        user_web.send(message);

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
