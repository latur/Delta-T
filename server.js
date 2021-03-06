var PORT = 8913;

var fs = require( 'fs' );
var app = require('express')();
var https = require('https');

var server = https.createServer({
    key:  fs.readFileSync('cert.key'),
    cert: fs.readFileSync('cert.crt'),
    ca:   fs.readFileSync('cert.crt'),
    requestCert: false,
    rejectUnauthorized: false
}, app);

server.listen(PORT);

var io = require('socket.io')(server);

// -------------------------------------------------------------------------- //
var players = {}, cnc = 0;
var objects = {}, deadpoints = [{x: 500, y: 500}];

app.get('/', function (req, res) {
	console.log('INDEX');
});

io.on('connection', function (socket) {
	cnc++;
	var tx = now();
	var cn = cnc;
	var id = socket.client.id;
	var ip = socket.handshake.address;
	if (ip.substr(0, 7) == '::ffff:') ip = ip.substr(7);

	players[cn] = { ping:0, hist:[], ip : ip, dead : false, kills: 0, deads: 0, obj: {} };

	// При получении положения разослать его тут же всем
	// Присобачив CN автора сообщения
	socket.on('me', function (s) {
		if (players[cn].dead && now() - players[cn].dead > 5 * 1000) {
			players[cn].dead = false;
		}
		socket.broadcast.emit('user', cn + ':' + s);
		players[cn].hist.push([now(), s]);
		if (players[cn].hist.length > 20) {
			players[cn].hist = players[cn].hist.slice(1)
		}
	});	
	
	// Ушёл кто-то
	socket.on('disconnect', function () {
		delete players[cn];
		console.log('> Disconnect. cn:%s, id:%s', cn, id);
		socket.broadcast.emit('remove', cn);
		if (Object.keys(players).length == 0) cnc = 0;
	});
	
	// Клиент говорит, что на что-то напоролся
	socket.on('getting', function (info) {
		try {
			var i = info[0];
			if (dist(objects[i].place, info[1]) < objects[i].radius + 2) {
				players[cn].obj[objects[i].type] = true;
				socket.emit('getting', objects[i]);
				delete objects[i];
				socket.broadcast.emit('objects', objects);
			}
		} catch(err) {
		    console.log('Error:');
		    console.log(err);
		}
	});

	// Клиент бахнул гранату дымовую
	socket.on('smoke', function (px) {
		if (!px.x || !px.y) return ;
		if (!players[cn].obj['smoke']) return ;
		socket.broadcast.emit('smoke', px);
		players[cn].obj['smoke'] = false;
	});
	
	// Клиент говорит, что кого-то завалил. Надо проверить
	socket.on('shot', function (info) {
		try {
			var kills_true = [];
			var owner_treshold = now() - players[cn].ping - 200 * 2;
			var from = info[0], to = info[1];

			// Был выстрел. Проверить, убил ли стрелявший сам себя?
			var px = players[cn].hist[players[cn].hist.length - 1][1].split('!');
			var pt = (px[px.length - 1] || px[0]).split(',');
			if (dist(to, {x : pt[0], y : pt[1]}) < 45) {
				kills_true.push(cn);
			}

			// Проверить тех, кто заявлен как убитый
			for (var i in info[2]) {
				if (vrification(owner_treshold, info[2][i], to)) {
					var pkn = parseInt(info[2][i][0]);
					kills_true.push(pkn);
				}
			}
			
			// Обновить статус
			for (var i in kills_true) {
				if (!players[kills_true[i]]) continue ;
				players[kills_true[i]].deads += 1;
				players[kills_true[i]].dead = now();
				if (kills_true[i] != cn) {
					players[cn].kills += 1;
					deadpoints.push(to);
				}
			} 

			socket.broadcast.emit('shot', [cn, from, to, kills_true]);
			socket.emit('shot', [cn, from, to, kills_true]);
		} catch(err) {
		    console.log('Error:');
		    console.log(err);
		}
	});
	
	// Клиент ответил на пинг
	socket.on('echo', function (){
		if (!players[cn]) return ;
		var ping = now() - tx;
		if (players[cn].ping == 0) players[cn].ping = ping;
		players[cn].ping = parseInt(players[cn].ping/2 + ping/2);
	});

	// Время от времени мониторим пинг клиентов
	setInterval(function(){
		tx = now();
		socket.emit('echo', [cn, players]);
	}, 3455);

	socket.emit('echo', [cn, players]);
});

setInterval(function(){
	io.sockets.emit('objects', objects);
	if (deadpoints.length == 0) return ;
	var oid = Math.random();
	// Условие спавна?
	// if (oid < 0.5) return ;
	objects[oid] = {'type' : 'smoke', 'place' : deadpoints[0], 'radius': 25};
	deadpoints = deadpoints.splice(1);
}, 10 * 1000);


// -------------------------------------------------------------------------- //
function vrification(time_treshold, info, to) {
	var history = players[info[0]].hist;
	for (var i in history) {
		if (history[i][0] < time_treshold) continue ;
		var px = history[i][1].split('!');
		var pt = (px[px.length - info[1]] || px[0]).split(',');
		return dist(to, {x : pt[0], y : pt[1]}) < 75;
	}
	return false;
}
function random_int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function now() {
    return new Date().getTime();
}
function dist(A, B){
	if (!A || !B) return Infinity;
	return Math.sqrt( Math.pow(A.x - B.x, 2) + Math.pow(A.y - B.y, 2) );
}


