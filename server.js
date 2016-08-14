/*
cd /home/mathilde/node
npm install express
npm install socket.io
node tanks/server.js
*/ 

var PORT = 8913;

var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(PORT);

// -------------------------------------------------------------------------- //
var players = {}, cn = [];

app.get('/', function (req, res) {
	console.log('INDEX');
});

io.on('connection', function (socket) {
	var id = socket.client.id;
	var cn = Object.keys(players).length + 1;

	console.log('> New connection. cn:%s, id:%s', cn, id);
	players[cn] = { x:0, y:0, r:0, t:0, keys:0, ping:0 };

	// При получении положения разослать его тут же всем
	// Присобачив CN автора сообщения
	socket.on('me', function (s) {
		console.log(s)
		socket.broadcast.emit('user', cn + ':' + s);
	});	
	
	// 
	socket.on('disconnect', function () {
		delete players[cn];
		console.log('> Disconnect. cn:%s, id:%s', cn, id);
	});
	
	// Время от времени мониторим пинг клиентов
	var tx = 0;
	socket.on('echo', function (){
		if (!players[cn]) return ;
		var ping = now() - tx;
		if (players[cn].ping == 0) players[cn].ping = ping;
		players[cn].ping = parseInt(players[cn].ping/2 + ping/2)
	});
	setInterval(function(){
		tx = now();
		socket.emit('echo', cn);
	}, 3333);

	return ;
});

setInterval(function(){
	console.log('Players:');
	for (cn in players) console.log('CN: %s, Ping: %s', cn, players[cn].ping);
}, 5000);


// -------------------------------------------------------------------------- //
function random_int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function now() {
    return new Date().getTime();
}


