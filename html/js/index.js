var IP_SERV_LOCAL='';
var cambio_rel="-1";
var websocket=null;




var segunda_vez=true;
var primera_vez=true; 
var local=true;

var WSUIR = "";
var WSUIR_ext="";


var obj_esp=null;

const INACTIVIDAD=2//tiempo en segundos sin que responda el ROVER
var fecha_inicio=null;


var mediaqueryList = window.matchMedia("(max-width: 576px)");


var linea_log=1;
var sincronizado=false;

///Funciones WebSockets

function cerrar_socket()
{
    if(websocket!=null)
        websocket.close();
}

function conectar_socket()
{
    if(primera_vez||segunda_vez)
    {
        WSUIR="wss://"+IP_SERV_LOCAL+":8083";
        comprobar_local("https://"+IP_SERV_LOCAL+":8083/camera");
    }   
    else
    {        
        websocket = new WebSocket(WSUIR);
        websocket.binaryType = "arraybuffer";
        
        websocket.onopen = function(ev) { // connection is open 
            
            escribir_log("Conectado al servidor WS");
            escribir_log("Esperando al Rover......");
            sincronizar();
            sincronizado=false;
        }
            
        //#### Message received from server?
        websocket.onmessage = function(ev) {
           
            if(isJson(ev.data))
            {
                
                var msg = JSON.parse(ev.data); //Server sends Json data

                var type = msg.type; //message type
                var umsg= msg.message; //message text


                if(type == 'arduino')
                {
                    
                    if(umsg=="Connected")
                    {
                        mostrar_botones(true);
                        escribir_log("Rover: "+umsg);
                        if(!sincronizado)
                        {
                            sincronizar();
                        }
                        
                    }
                    else if(umsg=="Reconnected")
                    {
                        cerrar_socket();
                    
                        
                        conectar_socket();
                        
                        /*mostrar_botones(false);
                        escribir_log("Rover: "+umsg);*/
                        
                    
                    }
                    else if(umsg=="ALIVE" || umsg=="TM1"|| umsg=="TM2"|| umsg=="TM3")
                    {
                        if(umsg!="ALIVE")
                        {
                            sincronizado=true;
                            escribir_log("Rover ha recibido: "+umsg);
                        }
                        else
                        {
                            fecha_inicio=new Date;
                        }
                        mandar_instruccion_simple(umsg);
                    }
                    else
                    {
                        escribir_log("Rover ha recibido: "+umsg); 
                    }
                }
                else if(type == 'desconexion')
                {
                /* mostrar_botones(false);
                    escribir_log("Se ha perdido la conexión con el Rover");
                    sincronizar();*/
                    escribir_log("Se ha perdido la conexión con el Rover");
                    cerrar_socket();
                    
                    conectar_socket();
                    
                }
            }
            else
            {
                msg = {
                    type: 'instr',    
                    message:'IMG'
                    };
                
                websocket.send(JSON.stringify(msg));

                var data = new Uint8Array(ev.data);
                var base64 = bufferToBase64(data);
                var imagen=atob(base64);
                var video_img=document.getElementById('image1');
                video_img.src="data:image/jpeg;base64,"+imagen;

                var video_img2=document.getElementById('image2');
                video_img2.src="data:image/jpeg;base64,"+imagen;

                
            }         

            
        };
        websocket.onerror	= function(ev){
            mostrar_botones(false);
            escribir_log("Error Occurred on your connection");
        }; 
        websocket.onclose 	= function(ev){
            mostrar_botones(false);
            escribir_log("Connection Closed");
        };
    }
}

/*function saltar_a_inicio(url)
{
    window.location.href=url;
}
*/
function sincronizar()
{
    var msg = {
        type: 'instr',    
        message: 'SYNC'
    };

    
    websocket.send(JSON.stringify(msg));
    //escribir_log("Se manda mensaje para syncronizar");
}


function mandar_velocidad()
{
    var msg = {
        type: 'instr',    
        message: 'SPD'+document.getElementById("speed").value
    };


    websocket.send(JSON.stringify(msg));
    //escribir_log("Se manda mensaje para syncronizar");
}

function mandar_instruccion_simple(instr)
{
    var msg = {
        type: 'instr',    
        message: instr
    };


    websocket.send(JSON.stringify(msg));
    //escribir_log("Se manda mensaje para syncronizar");
}

function mandar_instruccion_apagado(obj)
{
    if(obj!=null)
    {
        if(obj.id=="fow")
            mandar_instruccion(obj,'FW','NOFW');
        else if(obj.id=="lef")
            mandar_instruccion(obj,"LT","NOLT");
        else if(obj.id=="rig")
            mandar_instruccion(obj,"RT","NORT");
        else if(obj.id=="rea")
            mandar_instruccion(obj,"RE","NORE");;
        obj_esp=null;
    }
}

function mostrar_botones(mostrar)
{
    document.getElementById("syn").disabled=mostrar;
    

    var obj=document.getElementById("speed");
    obj.disabled=!mostrar;
    obj.value="100";
    document.getElementById("fow").disabled=!mostrar;
    document.getElementById("fow").classList.remove('pulsado');
    document.getElementById("rea").disabled=!mostrar;
    document.getElementById("rea").classList.remove('pulsado');
    document.getElementById("arm").disabled=!mostrar;
    document.getElementById("arm").classList.remove('pulsado');
    document.getElementById("lef").disabled=!mostrar;
    document.getElementById("lef").classList.remove('pulsado');
    document.getElementById("rig").disabled=!mostrar;
    document.getElementById("rig").classList.remove('pulsado');

    document.getElementById("cam1").disabled=!mostrar;
    document.getElementById("cam2").disabled=!mostrar;
    document.getElementById("cam3").disabled=!mostrar;
    document.getElementById("cam4").disabled=!mostrar;

    document.getElementById("open_crc").disabled=!mostrar;
    document.getElementById("open_vid").disabled=!mostrar;
    document.getElementById("resol").disabled=!mostrar;

    if(!mostrar)
    {
        cerrar_crc()
        cerrar_video()
    }

}




function mandar_instruccion(obj,inst,no_inst)
{
    
    var msg;
    if(obj.id!="arm")
    {
        obj_esp=obj;
    }

    if(obj.classList.contains('pulsado'))
    {
        msg = {
            type: 'instr',    
            message: no_inst
        };
    
        obj.classList.remove('pulsado');
        
    }
    else
    {
        if(obj.id!="arm")
        {
            var objs = document.querySelectorAll('.pulsado');
            for (var i=0; i<objs.length; i++) {
                if(objs[i].id!="arm")
                objs[i].classList.remove('pulsado');
            }
        }
            
        msg = {
            type: 'instr',    
            message: inst
        };
    
        obj.classList.add('pulsado')
    }
   
    // Antes de mandar compruebo si hay conexión con el ROVER
    
    var fecha_fin=new Date;

 
   
    

    if(fecha_fin.getTime()-fecha_inicio.getTime()>INACTIVIDAD*1000)
    {
        mostrar_botones(false);
        escribir_log("Se ha perdido la conexión con el Rover");
        cerrar_socket();
    
        conectar_socket();
       
    }
    else
    {
        
        websocket.send(JSON.stringify(msg));
        escribir_log("Se envía la instrucción: "+msg.message);
    }
}

function escribir_log(mensaje)
{
    //console.log(mensaje);
    mensaje=linea_log+". "+mensaje;
    linea_log++;
    var obj=document.getElementById("log");
    var actual=obj.innerHTML;

    
    if(linea_log!=2)
        mensaje=actual+"<br/>"+mensaje;
    else
        mensaje=actual+mensaje;
    
    obj.innerHTML=mensaje;
    obj.scrollTop = obj.scrollHeight;
}

function borrar_log()
{
    var obj=document.getElementById("log");
    obj.innerHTML="<h4>Log Remote Control<button onpointerdown='cerrar_log()'>X</button></h4>";
    obj.scrollTop = obj.scrollHeight;
}

function abrir_log(obj)
{
    
    obj.classList.add("oculta");
    var obj2= document.getElementById("log");
    obj2.classList.remove("oculta");
    
    if(es_movil() || pantalla_peq())//En la App quitar pregunta
        if(document.getElementById("open_vid").classList.contains('oculta'))
            cerrar_video();    
        else if(document.getElementById("open_crc").classList.contains('oculta'))
            cerrar_crc(); 
}

function cerrar_log()
{
    var obj2= document.getElementById("open_log");
    obj2.classList.remove("oculta");
    obj2= document.getElementById("log");
    obj2.classList.add("oculta");
}

function abrir_video(obj)
{
   
        //WSUIR2=WSUIR2_ext;
    iniciar_camera();
    

    obj.classList.add("oculta");
    var obj2= document.getElementById("vid");
    obj2.classList.remove("oculta");

    if(es_movil() || pantalla_peq())//En la App quitar pregunta
        if(document.getElementById("open_log").classList.contains('oculta'))
            cerrar_log();  
        else if(document.getElementById("open_crc").classList.contains('oculta'))
            cerrar_crc(); 
}

function cerrar_video()
{
    if(!document.getElementById("open_crc").classList.contains('oculta'))
    {
        parar_camera();

    }
  
    var obj2= document.getElementById("open_vid");
    obj2.classList.remove("oculta");
    obj2= document.getElementById("vid");
    obj2.classList.add("oculta");
}

function abrir_crc(obj)
{
    
        //WSUIR2=WSUIR2_ext;
        iniciar_camera();
    
    obj.classList.add("oculta");
    var obj2= document.getElementById("crc");
    obj2.classList.remove("oculta");

    if(es_movil() || pantalla_peq())//En la App quitar pregunta
        if(document.getElementById("open_log").classList.contains('oculta'))
            cerrar_log();
        else if(document.getElementById("open_vid").classList.contains('oculta'))
            cerrar_video();    
    
}

function cerrar_crc()
{
    if(!document.getElementById("open_vid").classList.contains('oculta'))
    {
        parar_camera();
       
    }
    var obj2= document.getElementById("open_crc");
    obj2.classList.remove("oculta");
    obj2= document.getElementById("crc");
    obj2.classList.add("oculta");
}


function volver_principal(url)
{
   
    cerrar_socket();
    window.location.href=url;
}


function iniciar_interface_rover(rover)
{
   
   
    if(rover==1)
    {
        WSUIR='wss://spain.thematiclearning.eu';
        WSUIR_ext='wss://spain.thematiclearning.eu';
   
        document.getElementById("titulo").innerHTML="<span id='tr"+rover+"'>ROVER "+rover+"</span>";
    
    }
    else if(rover==2)
    {
        WSUIR='wss://servidor-rover2.herokuapp.com';
        WSUIR_ext='wss://france.thematiclearning.eu';
     
        document.getElementById("titulo").innerHTML="<span id='tr"+rover+"'>ROVER "+rover+"</span>";

    }
    else if(rover==3)
    {
        WSUIR='wss://servidor-rover3.herokuapp.com';
        WSUIR_ext='wss://sweden.thematiclearning.eu';
     
        document.getElementById("titulo").innerHTML="<span id='tr"+rover+"'>ROVER "+rover+"</span>";
  
    }
    else if(rover==4)
    {
        WSUIR='wss://servidor-rover4.herokuapp.com';
        WSUIR_ext='wss://croatia.thematiclearning.eu';
       
        document.getElementById("titulo").innerHTML="<span id='tr"+rover+"'>ROVER "+rover+"</span>";
     
    }
    else
    {
        WSUIR='wss://servidor-rover5.herokuapp.com';
        WSUIR_ext='wss://europe.thematiclearning.eu';
        
        document.getElementById("titulo").innerHTML="<span id='tr"+rover+"'>ROVER "+rover+"</span>";
      
    }



    obtener_ip();

 
   
}

async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 1000 } = options;
    
    const abortController = new AbortController();
    const id = setTimeout(() => abortController.abort(), timeout);
    const response = await fetch(resource, {
        ...options,
        signal: abortController.signal  
    });
    clearTimeout(id);
    return response;
}

async function comprobar_local(url) {
    try {
        const response = await fetchWithTimeout(url, { mode: 'no-cors',timeout: 1000});
        const data = await response;
        primera_vez=false;
        segunda_vez=false;
        local=true;
        
        conectar_socket();
        
    } catch (error) {
        if(primera_vez)
        {
            primera_vez=false;
            local=true;
            var output="<h1>Mejoras en las comunicaciones del Rover</h1>";
            output+="<p>Si se encuentra conectado a la misma red que el Rover podrás mejorar la velocidad y resolución de la cámara.</p>";
            output+="<p>Para ello deberás confiar en este sitio y Aceptar el certificado de Seguridad.</p>";
            output+="<p>Si sabes que estás conectado a otra red o no quieres la mejora, simplemente cierre esta ventana.</p>";
            output+="<p class='boton'><button  onclick='openDialog(\"https://"+IP_SERV_LOCAL+":8083/camera\" ,\"_blank\");this.disabled=true;'>Aceptar</button></p>";
         
            abrir_modal(output);

            console.log("Entro primera vez");

        }
        else
        {
            console.log("Entro segunda vez");
            local=false;
            WSUIR=WSUIR_ext;
            segunda_vez=false;
            conectar_socket();
            
            
        }
        
    }
}

var win=null;
var openDialog = function(uri,  options) {
    win = window.open(uri,  options);
    var interval = window.setInterval(function() {
        try {
            if (win == null || win.closed) {
                window.clearInterval(interval);
                cerrar_modal();
            }
        }
        catch (e) {
        }
    }, 500);
    return win;
};


function cerrar_vent_cert()
{
        try{
            win.close();
        }
        catch(e){
        }

        conectar_socket();
    
}

function isJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function ejecutar_py(resol)
{
    
    msg = {
        type: 'python',    
        message:resol
        };
    document.getElementById("resol").value=resol;
    websocket.send(JSON.stringify(msg));
   
}

function bufferToBase64(buf) 
{
    var binstr = Array.prototype.map.call(buf, function (ch) {
        return String.fromCharCode(ch);
    }).join('');
    return btoa(binstr);
}





function obtener_ip()
{
    
    var websocket3 = new WebSocket(WSUIR);
    websocket3.onopen = function(ev) { // connection is open 
        
        console.log("Conectado al servidor Camera WS");
        msg = {
        type: 'instr',    
        message:'GET_IP'
        };
        websocket3.send(JSON.stringify(msg));
    }

    websocket3.onmessage = function(ev) {

        
            var msg = JSON.parse(ev.data); //Server sends Json data

            var type = msg.type; //message type
           


            if(type == 'ip')
            {
                IP_SERV_LOCAL = msg.message;
                console.log(IP_SERV_LOCAL);
                websocket3.close();
                conectar_socket();
            }
            
            
    };
    websocket3.onerror	= function(ev){
        
       
        console.log("Error Occurred on your camera connection ");
        
    }; 
    websocket3.onclose 	= function(ev){
        
       
        console.log("Camera connection Closed");
        
    };

}





function iniciar_camera()
{
    var video_img=document.getElementById('image1');
    video_img.src="img/loader.gif";

    var video_img2=document.getElementById('image2');
    video_img2.src="img/loader.gif";

    if(local)
    {
        console.log("Ejecuto Local");
        if(cambio_rel=="-1")
            cambio_rel=100;
        ejecutar_py(cambio_rel);
    }
    else
    {
        console.log("Ejecuto Externo")
        if(cambio_rel=="-1")
            cambio_rel=50;
        ejecutar_py(cambio_rel);
    }
}

function parar_camera()
{
    if(websocket!=null && websocket.readyState === WebSocket.OPEN)
    {
        msg = {
            type: 'no_python',    
            message:'parar'
            };

        websocket.send(JSON.stringify(msg));
    }
    
}

function cambiar_resolucion()
{

    console.log(cambio_rel)
    cambio_rel=document.getElementById("resol").value;
    console.log(cambio_rel)
    iniciar_camera();

    
}


function pantalla_peq()
{
    return  mediaqueryList.matches;
}

function es_movil()
{
    return  navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i) || navigator.userAgent.match(/iPhone/i)   || navigator.userAgent.match(/iPad/i)   || navigator.userAgent.match(/iPod/i)    || navigator.userAgent.match(/BlackBerry/i)    || navigator.userAgent.match(/Windows Phone/i);
}
