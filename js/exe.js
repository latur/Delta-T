"use strict";

var World = Matter.World;

var cn = 0;
var owners = {};
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
	    pixelRatio: 2, 
	    wireframes : false
    }
});

engine.world.gravity.x = 0;
engine.world.gravity.y = 0;

var unit_create = function(x, y, model, is_static){
	var m = unit_models[model] || unit_models['white'];
	var sprite = { texture: m.body, xScale: 0.5, yScale: 0.5 };
	var box = Matter.Bodies.rectangle(x, y, 40, 24, { render: { sprite: sprite } });

	var is_static = is_static || false;
	if (is_static) Matter.Body.setStatic(box, true);

	World.add(engine.world, [ box ]);

	var tower = {
		angle   : 0,
		element : $('<div class="tower" style="background-image: url('+m.tower+')"></div>').css({ top: y, left : x}).appendTo('#xmap')
	};
	tower.setAngle = function(e){ 
		tower.angle = e % 360;
		tower.element.css({ transform: 'rotate(' + (tower.angle + box.angle * 180 / Math.PI) + 'deg)'});
	};
	tower.setPoint = function(position){
		tower.element.css({ top: position.y, left : position.x });
	};
	var remove = function(cn){
		World.remove(engine.world, [ box ]);
		tower.element.remove();
		delete owners[cn];
	};
	var set = function(x){
		if (isNaN(x[0])) return ;
		tower.setAngle(x[3]);
		Matter.Body.setPosition(box, {x : x[0], y : x[1]});
		Matter.Body.setAngle(box, x[2] * Math.PI / 180);
	};
	
	return {
		box    : box, 
		set    : set,
		tower  : tower, 
		speed  : [0, 0], 
		dead   : is_static ? 0 : 5,
		remove : remove,
		state  : [],
	}
};

// -------------------------------------------------------------------------- //

var socket = io.connect(location.origin + ':8913');
var unit = unit_create(-999, -999);

// Отрисовка непроницаемых мест карты: 
World.add(engine.world, map_info.rects.map(function(e){
	return Matter.Bodies.rectangle(e[0], e[1], e[2], e[3], { isStatic: true })
}));

var draw_shot = function(from, to){
	$('#xmap').append(exp64(to));
	$('#xmap').append(line(from, to));
};

var make_shot = function(){
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
	console.log('My CN:   ' + cn);
	console.log('Shot by: ' + info[0]);
	console.log(info);
	
	var kills = {x : 0, y : 0};
	for (var i in info[3]){
		var kcn = info[3][i];
		if (kcn == cn) {
			log('Вас убили');
			kills.x += unit.box.position.x;
			kills.y += unit.box.position.y;
		} else {
			log(info[0] + ' убил ' + kcn);
			kills.x += owners[kcn].box.position.x;
			kills.y += owners[kcn].box.position.y;
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
socket.on('echo', function (t) {
	socket.emit('echo', t);
	cn = t;
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
	if (owners[cn].coda.length == 0) return ;
	owners[cn].set(owners[cn].coda[0]);
	owners[cn].coda = owners[cn].coda.splice(1);
});

// Нас кто-то покинул
socket.on('remove', function (cn) {
	owners[cn].remove();
});

Matter.Events.on(render, 'afterRender', function() {
	// Положения врагов
	for (var cn in owners) {
		if (owners[cn].coda.length == 0) continue ;
		owners[cn].set(owners[cn].coda[0]);
		owners[cn].coda = owners[cn].coda.splice(1);
	    // Рендерим башни наших коллег-соперников ;)
		owners[cn].tower.setPoint(owners[cn].box.position);
		owners[cn].tower.setAngle(owners[cn].tower.angle);
	}
	
	if (unit.dead) return ;

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

	unit.tower.setPoint(unit.box.position);
	unit.tower.setAngle(unit.tower.angle);

	// - Выстрел
	if (keys[32] && fire == 0) {
		make_shot();
		fire = 2;
	}
	
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
	$('#mini-window').css({
		width  : 120 * window.innerWidth / map_info.size[0],
		height : minimapHeight * window.innerHeight / map_info.size[1],
		left   : - w_offsets.left * 120 / map_info.size[0],
		top    : - w_offsets.top * minimapHeight / map_info.size[1]
	});
});

// -------------------------------------------------------------------------- //
window.onkeydown = function(e){ keys[e.which] = true; };
window.onkeyup = function(e){ keys[e.which] = undefined; };
window.onkeypress = function(e) {
	// Воскрешение при пробеле
	if (e.which == 32 && unit.dead === 0 && cn > 0) {
		unit.dead = false;
		Matter.Body.setPosition(unit.box, {x : 500, y : 200});
	}
}

// -------------------------------------------------------------------------- //
setInterval(function(){
	socket.emit('me', unit.state.join('!'));
	unit.state = [];
	// Перезарядка
	if (fire) fire--;
	// Перерождение при смерти 5сек.:
	if (unit.dead) {
		return unit.dead -= 1;
	}
}, 200);




Matter.Engine.run(engine);
Matter.Render.run(render);
