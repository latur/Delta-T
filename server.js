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
	players[cn] = { x:0, y:0, r:0, t:0, keys:0 };

	// При получении положения разослать его тут же всем
	// Присобачив CN автора сообщения
	socket.on('me', function (s) {
		socket.broadcast.emit('user', cn + ':' + s);
	});

	socket.on('disconnect', function () {
		delete players[cn];
		console.log('> Disconnect. cn:%s, id:%s', cn, id);
	});

	return ;

	socket.emit('init', id);
	
	
	
	var t = process.hrtime();
	

	players[id] = { x: -50, y: -50, r: 0, t: 0, dead : 5, k : [], ping : 999 };
	


	socket.on('me', function (data) {
		players[id].x = parseInt(data.p.x);
		players[id].y = parseInt(data.p.y);
		players[id].r = parseFloat(data.r) || 0;
		players[id].t = parseFloat(data.t) || 0;
	});
	socket.on('echo', function (timer) {
		players[id].ping = now() - timer;
	});

	// Рассылка информации о игроках:
	setInterval(function(){
		socket.emit('players', players);
	}, 200);
	// Эхо-запрос: получать пинг клиента
	setInterval(function(){
		socket.emit('echo', now());
	}, 1013);
	
	
});

setInterval(function(){
	console.log('> Status:');
	for (var id in players) {
		console.log('  ID: %s\tPing:%s\t[%s %s]', id, players[id].ping, players[id].x, players[id].y);
	}
}, 5000);


// -------------------------------------------------------------------------- //
function random_int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function now() {
    return new Date().getTime();
}


