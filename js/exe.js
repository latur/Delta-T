"use strict";

var World = Matter.World;

var cn = 0;
var owners = {}, players = {};
var keys = [], fire = 0;
var xmap  = document.getElementById('xmap');

// -------------------------------------------------------------------------- //

var engine = Matter.Engine.create();
var render = Matter.Render.create({
    element: xmap,
    engine: engine,
    options: {
	    width:  map_info.size[0], 
	    height: map_info.size[1], 
	    pixelRatio: 0.5, 
	    wireframes : false
    }
});

engine.world.gravity.x = 0;
engine.world.gravity.y = 0;

// Поиск точки перерождения:
// Для каждой считаем ближайщего врага и выбираем безопаснейшую
var most_distant_point = function(){
	var index = 0, max = 0;
	map_info.spawn.map(function(point, k){
		var min = 999;
		for (var kcn in owners) min = Math.min(dist(owners[kcn].box.position, point), min);
		if (min > max) max = min, index = k
	});
	return map_info.spawn[index];
}

var unit_create = function(x, y, model, is_static){
	var m = unit_models[model] || unit_models['white'];
	var box = Matter.Bodies.rectangle(x, y, 40, 24, {});

	var is_static = is_static || false;
	if (is_static) Matter.Body.setStatic(box, true);

	World.add(engine.world, [ box ]);
	Matter.Body.setAngle(box, -80 * Math.PI / 180);

	var tower = {
		element : $('<div class="tower" style="background-image: url('+m.tower+')"></div>').css({ top: y, left : x}).appendTo('#xmap'),
		angle : 0
	};
	var body = {
		element : $('<div class="body"><div style="background-image: url('+m.body+')"></div></div>').css({ top: y, left : x}).appendTo('#xmap'),
		angle : 0
	};
	var remove = function(cn){
		World.remove(engine.world, [ box ]);
		tower.element.remove();
		body.element.remove();
		delete owners[cn];
	};
	var draw = function(position, b, t){
		tower.angle = t % 360;
		body.angle = b % 360;
		tower.element.css({
			transform: 'rotate(' + (tower.angle + body.angle) + 'deg)'
		});
		body.element.css({
			transform: 'rotate(' + (body.angle) + 'deg)'
		});
		tower.element.css({ top: position.y, left : position.x });
		body.element.css({ top: position.y, left : position.x });
		Matter.Body.setPosition(box, position);
	};
	var set = function(x){
		if (isNaN(x[0])) return ;
		draw({x : x[0], y : x[1]}, x[2], x[3])
		Matter.Body.setAngle(box, x[2] * Math.PI / 180);
	};
	var kill = function(){
		setTimeout(function(){
			$('#xmap').append(Explode(e_tank, box.position));
			set([-999, -999, 0, 0]);
		}, 300);
	}
	
	return {
		box    : box,
		set    : set,
		draw   : draw,
		tower  : tower,
		remove : remove,
		kill   : kill,
		dead   : is_static ? false : 0,
		state  : [],
		speed  : [0, 0]
	}
};

// -------------------------------------------------------------------------- //

var socket = io.connect(location.origin + ':8913');
var unit = unit_create(-999, -999);

// Отрисовка непроницаемых мест карты: 
World.add(engine.world, map_info.rects.map(function(e){
	var box = Matter.Bodies.rectangle(e[0], e[1], e[2], e[3], { isStatic: true });
	Matter.Body.setAngle(box, e[4]);
	return box;
}));
World.add(engine.world, map_info.circles.map(function(e){
	return Matter.Bodies.circle(e[0], e[1], e[2], { isStatic: true });
}));

var draw_shot = function(from, to){
	$('#xmap').append(Explode(e_fire, to));
	$('#xmap').append(line(from, to));
};

var make_shot = function(){
	fire = 6;
	var bodies = Matter.Composite.allBodies(engine.world).slice(1);
	var from = unit.box.position; 

	// Точка первой коллизии
	var to = find_collision_end(from, {
		x : from.x + map_info.size[0] * Math.cos(unit.tower.angle * Math.PI / 180 + unit.box.angle),
		y : from.y + map_info.size[0] * Math.sin(unit.tower.angle * Math.PI / 180 + unit.box.angle)
	}, bodies, 0);

	// Задело ли кого-то взрывом?
	var kills = [];
	for (var cn in owners) {
		if (dist(owners[cn].box.position, to) < 30) kills.push([cn, owners[cn].coda.length]);
	}

	socket.emit('shot', [from, to, kills]);
	draw_shot(from, to);
};

// Кто-то выстрелил
socket.on('shot', function (info) {
	console.log('----');
	console.log('Shot by: ' + info[0]);
	console.log(unit.box.position);

	var kills = {x : 0, y : 0};
	for (var i in info[3]){
		var kcn = info[3][i];
		if (kcn == cn) {
			if (info[0] == cn) {
				log('Вы подорвали себя. Не стоит стрелять в упор');
			} else {
				log('Вас убил cn('+info[0]+')');
			}
			unit.dead = 5 * 5;
			unit.kill();
			kills.x += unit.box.position.x;
			kills.y += unit.box.position.y;
		} else {
			log('cn('+info[0]+') убил cn('+kcn+')');
			if (owners[kcn]) {
				kills.x += owners[kcn].box.position.x;
				kills.y += owners[kcn].box.position.y;
				owners[kcn].coda = [];
				owners[kcn].kill();
			}
		}
	}
	// Если стрелял не я
	if (cn != info[0]){
		// Определить точку результата
		var to = info[2];
		if (info[3].length > 0) to = {x : kills.x/info[3].length, y : kills.y/info[3].length}
		draw_shot(info[1], to);
	}
});

// Ping
socket.on('echo', function (e) {
	socket.emit('echo', true);
	players = e[1];
	if (cn != 0) return ;
	log("Соединение с сервером установлено");
	log("Ваш cn: " + e[0]);
	cn = e[0]
});

// Прилетела информация про одного пользователя
socket.on('user', function (cns) {
	var cns = cns.split(':');
	var cn  = cns[0];
	// Если видим впервые, создаём юнита на карте
	if (!owners[cn]) owners[cn] = unit_create(-999, -999, 'black', 'static');
	// Закидываем очередь состояний:
	owners[cn].coda = cns[1].split('!').map(function(pix){
		var xy = pix.split(',');
		return [parseInt(xy[0]), parseInt(xy[1]), parseInt(xy[2]), parseInt(xy[3])];
	});
	// Обновляем позицию из очереди
	if (owners[cn].coda.length == 0) return owners[cn].set(-999,-999,0,0);
	owners[cn].set(owners[cn].coda[0]);
});

// Нас кто-то покинул
socket.on('remove', function (cn) {
	if (owners[cn]) owners[cn].remove();
});

// Рендер
Matter.Events.on(render, 'afterRender', function() {
	// Положения врагов
	for (var cn in owners) {
		if (owners[cn].coda.length == 0) continue ;
		owners[cn].set(owners[cn].coda[0]);
		owners[cn].coda = owners[cn].coda.splice(1);
	}

	if (unit.dead !== false) return unit.coda = [];

	// - Сброс скорости
	unit.speed = [unit.speed[0] * 0.9, unit.speed[1] * 0.9];

	// - Синус, косинус поворота корпуса
	var ct = Math.cos(unit.box.angle);
	var st = Math.sin(unit.box.angle);

	// - Движение корпуса
	if (keys[38] || keys[87]) unit.speed[0] += 0.3 * ct, unit.speed[1] += 0.3 * st;
	if (keys[40] || keys[83]) unit.speed[0] -= 0.2 * ct, unit.speed[1] -= 0.2 * st;
	unit.speed[0] = Math.min(unit.speed[0], 6);
	unit.speed[1] = Math.min(unit.speed[1], 6);
	Matter.Body.setVelocity(unit.box, { x: unit.speed[0], y: unit.speed[1] });

	// - Поворот корпуса
	Matter.Body.setAngularVelocity(unit.box, 0);
	if (keys[37] || keys[65]) Matter.Body.setAngularVelocity(unit.box, -0.04);
	if (keys[39] || keys[68]) Matter.Body.setAngularVelocity(unit.box,  0.04);

	// - Поворот башни
	if (keys[81]) unit.tower.angle -= 2;
	if (keys[69]) unit.tower.angle += 2;

	unit.draw(unit.box.position, unit.box.angle * 180 / Math.PI, unit.tower.angle);

	// - Выстрел
	if (keys[32] && fire == 0) make_shot();
	
	// Запись моих действий
	var nx = [parseInt(unit.box.position.x), parseInt(unit.box.position.y)];
	// Угол корпуса 3
	nx.push(parseInt(((unit.box.angle * 180 / Math.PI) % 360 + 360) % 360));
	// Угол башни 4
	nx.push(parseInt(((unit.tower.angle) % 360 + 360) % 360));
	// В стрек
	unit.state.push(nx.join(','));

	// Отрисовка карты и миникарты
	w_offsets.left =  window_calc(unit.box.position.x, w_offsets.left,  window.innerWidth,  map_info.size[0], 0.7);
	w_offsets.top  =  window_calc(unit.box.position.y, w_offsets.top, window.innerHeight, map_info.size[1], 0.7);
	$('#xmap').css(w_offsets);
});

// -------------------------------------------------------------------------- //
window.onkeydown = function(e){ keys[e.which] = true; };
window.onkeyup = function(e){ keys[e.which] = undefined; };
window.onkeypress = function(e) {
	// Воскрешение при пробеле
	if (e.which == 32 && unit.dead === 0 && cn > 0) {
		Matter.Body.setPosition(unit.box, most_distant_point());
		Matter.Body.setAngle(unit.box, -80 * Math.PI / 180);

		$('#xmap').animate({ opacity : 1 }, 700);
		keys[e.which] = undefined;
		unit.dead = false, unit.state = [];
	}
}

// -------------------------------------------------------------------------- //
setInterval(function(){
	// Перезарядка
	if (fire) fire -= 1;
	// Перерождение при смерти 5сек.:
	if (unit.dead > 0) unit.dead -= 1;
	if (unit.dead !== false) return ;
	// Сообщаем о себе
	console.log('>>>>')
	socket.emit('me', unit.state.join('!'));
	unit.state = [];
}, 200);

// -------------------------------------------------------------------------- //
Matter.Engine.run(engine);
Matter.Render.run(render);
