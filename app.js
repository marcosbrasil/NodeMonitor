var os = require('os');
var connect = require('connect');
var WebSocketServer = require('ws').Server;
var socket = new WebSocketServer({port: 8001});
var arrClients = new Array(), 
	prev_total = new Array(), 
	prev_use = new Array(),
	jsonObject = new Object();

var server = connect.createServer(
  connect.favicon(),
  connect.logger(),
  connect.static(__dirname + '/public')
);

socket.on('connection', function(ws) {
	arrClients.push(ws);
	console.log('CONNECTED')
});

socket.on('close', function() {
	console.log("Client Closed Connection...")
});

//Create and initialize arrys for each cpu
function initProcData(){
	for(var i = 0, len = os.cpus().length; i < len; i++) {
		prev_total[i] = 0;
		prev_use[i] = 0;
	}
	return null;
}
initProcData();

function memStat(){
	var percent = (((os.totalmem() - os.freemem())*100) / os.totalmem());
	percent = percent.toFixed(2);
	jsonObject.data.push(['Memory', Math.round(percent)]);
	return 'Total used memory: ' + percent + '%';
}

function procStat(){
	var cpus = os.cpus();
	var log = '';

	for(var i = 0, len = cpus.length; i < len; i++) {
		var cpu = cpus[i], total = 0, total_use = 0, idle = 0;
		
		for(type in cpu.times){
			total += cpu.times[type];
			if(type == 'idle') idle = cpu.times[type];
		}
		total_use = total - idle;

		var delta_total = total - prev_total[i];
		var delta_use = total_use - prev_use[i];
		var percent = 100 * (delta_use / delta_total);
		percent = percent.toFixed(2);
		jsonObject.data.push(['CPU '+i, Math.round(percent)]);

		log += "CPU "+i+": "+percent+"%<br />";
		log += 'user: '+cpu.times.user+'|nice: '+cpu.times.nice+'|sys: '+cpu.times.sys+'|idle: '+cpu.times.idle+'|irq: '+cpu.times.irq+'<br />';

		prev_total[i] = total;
		prev_use[i] = total_use;
	}
	
	return log;
}

function parseToSend(){
	jsonObject.data = new Array(['Label', 'Value']);
	var htmlProc = procStat();
	var htmlMemo = memStat();
	jsonObject.html = htmlProc + htmlMemo;

	return JSON.stringify(jsonObject); 
}

function main(){

	if(arrClients.length>0){
		for(client in arrClients){
			arrClients[client].send(parseToSend());
		}
	}else{
		console.log('No Client, waiting...');
	}
}

var interval = setInterval(main, 1000);

setTimeout(function(){
	clearInterval(interval);
},1000000); 

server.listen(8000);