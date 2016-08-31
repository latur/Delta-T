"use strict";

var socket = io.connect(location.origin + ':8913');
var engine = Matter.Engine.create();
var render = Matter.Render.create({
    element: document.getElementById('xmap'),
    engine: engine,
    options: {
	    width:  map_config.size[0], 
	    height: map_config.size[1], 
	    pixelRatio: 0.5, 
	    wireframes : false
    }
});
engine.world.gravity.x = 0;
engine.world.gravity.y = 0;

function dist(a, b){
	if (!a || !b) return Infinity;
	return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function sprite(e, point){
	var file = e[0], size = e[1], steps = e[2];
	var sprite = $('<div class="sprite" />')
		.css({ left : point.x - size/2, top : point.y - size/2 })
		.css({ width : size, height : size, backgroundImage : 'url('+file+')' })
	var index = 0;
	var timer = setInterval(function(){
		if (steps == index) return [clearInterval(timer), sprite.remove()];
		sprite.css({ backgroundPosition : (-size * index) + 'px'});
		index++;
	}, 25);
	return sprite;
}

function line(from, to){
	var w = dist(from, to);
	var degree = 90 - Math.atan((from.x - to.x)/(from.y - to.y)) * 180 / Math.PI;
	var xline = $('<div class="line" />')
		.css({ left: (from.x + to.x)/2 - w/2, top: (from.y + to.y)/2 - 1, width: w })
		.css({
			'-webkit-transform': 'rotate(' + degree + 'deg)',
			'-moz-transform': 'rotate(' + degree + 'deg)',
			'-ms-transform': 'rotate(' + degree + 'deg)',
			'-o-transform': 'rotate(' + degree + 'deg)',
			'transform': 'rotate(' + degree + 'deg)'
		});
	var steps = 4;
	var index = 0;
	var timer = setInterval(function(){
		if (steps == index) return [clearInterval(timer), xline.remove()];
		xline.css({ opacity : (steps - index)/(steps * 1.5) });
		index++;
	}, 25);
	return xline;
}

// -------------------------------------------------------------------------- //
var keys = [], ready = 0;
var log = function(msg){
	var m = $('<p>').html(msg).appendTo('#screen');
	if ($('#screen p').length > 20) $('#screen p:first').remove();
	setTimeout(function(){ m.remove(); }, 15000);
};
var loader = function(media, callback){
	var total = media.length;
	media.map(function(src){
		var m = new Image();
		m.src = src;
		if (m.complete) {
			total--;
			if (!total && callback) callback();
		} else {
			m.onload = function(){
				total--;
				if (!total && callback) callback();
			}
		}
	});
};

// -------------------------------------------------------------------------- //
var map = (function(cfg, e){
	log('Загрузка карты');

	// Стеночки
	cfg.rects.push([cfg.size[0]/2, 3,             cfg.size[0], 5, 0]);
	cfg.rects.push([cfg.size[0]/2, cfg.size[1]-3, cfg.size[0], 5, 0]);
	cfg.rects.push([3,             cfg.size[1]/2, 5, cfg.size[1], 0]);
	cfg.rects.push([cfg.size[0]-3, cfg.size[1]/2, 5, cfg.size[1], 0]);

	// Отрисовка непроницаемых мест карты: 
	Matter.World.add(engine.world, cfg.rects.map(function(e){
		var box = Matter.Bodies.rectangle(e[0], e[1], e[2], e[3], { isStatic: true });
		Matter.Body.setAngle(box, e[4]);
		return box;
	}));
	Matter.World.add(engine.world, cfg.circles.map(function(e){
		return Matter.Bodies.circle(e[0], e[1], e[2], { isStatic: true });
	}));
	
	// Размеры (+ миникарта ?)
	var offsets = { left : 0, top : 0};
	e.css({width: cfg.size[0], height: cfg.size[1]});

	// Медиаконтент: графика карты
	loader([cfg.ground, cfg.top], function(){
		$('<img class="full ground">').attr('src', cfg.ground).appendTo(e);
		$('<img class="full top">').attr('src', cfg.top).appendTo(e);
		log('Карта загружена');
		ready++;
	});

	// Поиск точки первой коллизии 
	// Для выстрела из заданной точки под заданным углом
	function collision(from, angle){
		function finder(A, B, bodies, iteration){
			if (iteration > 10) return B;
			var mean = {x : (A.x + B.x)/2, y : (A.y + B.y)/2};
			var C = Matter.Query.ray(bodies, A, mean);
			if (C.length == 0) A = mean; else B = mean;
			return finder(A, B, bodies, iteration + 1);
		}
		return finder(from, {
			x : from.x + cfg.size[0] * Math.cos(angle),
			y : from.y + cfg.size[0] * Math.sin(angle)
		}, Matter.Composite.allBodies(engine.world).filter(function(b){
			return b.position != from;
		}), 0);
	}

	// Поиск точки перерождения
	// Для каждой считаем ближайщего врага и выбираем безопаснейшую
	function respawn_point(owners){
		var index = 0, max = 0;
		cfg.spawn.map(function(point, k){
			var min = 999;
			for (var kcn in owners) min = Math.min(dist(owners[kcn].box.position, point), min);
			if (min > max) max = min, index = k
		});
		return cfg.spawn[index];
	}

	// Слежение за игроком
	function offset(pos, side, win, frame, prop){
		if (win > frame) return win/2 - frame/2;
		var tmp;
		tmp = pos + side - win * prop;
		if (tmp > 0) side -= tmp;
		tmp = - pos - side + win * (1 - prop);
		if (tmp > 0) side += tmp;
		if (side > 0) side = 0;
		if (side < win - frame) side = win - frame;
		return side;
	}
	function position(p){
		offsets.left = offset(p.x, offsets.left,  window.innerWidth,  cfg.size[0], 0.7);
		offsets.top  = offset(p.y, offsets.top,   window.innerHeight, cfg.size[1], 0.7);
		e.css(offsets);
	}

	return { 'collision' : collision, 'respawn_point' : respawn_point, 'position' : position }
})(map_config, $('#xmap'));

// -------------------------------------------------------------------------- //
var units = (function(cfg, e){
	var me = add(-999,-999), cn = 0;
	var owners = {}, players = {}, fire = 0, dead = 0;

	// Медиаконтент: Спрайты взрывов
	loader([cfg.sprite.fire[0], cfg.sprite.dead[0]], function(){
		log('Модели загружены');
		ready++;
	});
	
	// Пинг
	function echo(e){
		socket.emit('echo', true);
		if (cn != 0) {
			players = e[1] || {};
			var table = '';
			for (var id in players) {
				console.log(players[id]);
				table += '<tr><td>';
				table += ['#' + id, players[id].deads, players[id].kills, players[id].ip, players[id].ping].join('</td><td>');
				table += '</td></tr>';
			}
			$('#scores tbody').html(table);
			return ;
		}
		cn = e[0];
		log("Соединение с сервером установлено, id: #" + e[0]);
		ready++;
	}

	// Игрок покинул поле боя
	function leave(cn){
		if (!owners[cn]) return ;
		log('Игрок <b>#' + cn + '</b> покинул поле боя');
		owners[cn].remove();
	}

	// Отриосовка линии и взрыва
	function draw_shot(from, to){
		e.append(line(from, to));
		e.append(sprite(cfg.sprite.fire, to));
	}

	// Рассчёт и отправка взрыва
	function make_shot(){
		var from = me.box.position; 
		var to = map.collision(from, me.tower.angle * Math.PI / 180 + me.box.angle);
		// Задело ли кого-то взрывом?
		var kills = [];
		for (var cn in owners) {
			if (dist(owners[cn].box.position, to) < 30) kills.push([cn, owners[cn].coda.length]);
		}
		socket.emit('shot', [from, to, kills]);
		fire = 6;
		draw_shot(from, to);
	}

	// Пришла достоверная информация про выстрел
	function shot(info){
		var by = info[0], from = info[1], to = info[2];
		var dead_unit = info[3][0] || false;
		// Отрисовка убитых
		info[3].map(function(i){
			// Это не меня так
			if (i != cn) {
				owners[i].coda = [];
				owners[i].kill();
				if (!dead_unit) dead_unit = owners[i].position;
				// Это я так
				if (i == by) return log('Игрок <b>#' + i + '</b> подорвал себя');
				by = by == cn ? 'вами' : ('игроком <b>#' + by + '</b>');
				return log('Игрок <b>#' + i + '</b> убит ' + by);
			}
			// Я убит
			me.kill();
			dead = 5 * 5, me.speed = [0, 0];
			dead_unit = me.box.position;
			$('#scores').removeClass('hidden')
			if (by == cn) {
				log('Вы подорвали себя. Не стоит стрелять в упор');
			} else {
				log('Вас убил #' + by);
			}
		});
		// Не я стрелял : отрисовка выстрела
		// Важно куда отрисовывать выстрел
		// Если цель успела уехать, нужно сдвинуть точку результата выстрела
		// Отрисовывать прямо в точку убитого не хорошо ибо он почти всегда успевает уже уехать
		// Для точки истинного попадания находим максимально близкую точку на убитом 
		if (cn != info[0]){
			if (!dead_unit) return draw_shot(from, to);
			// Если точки достаточно близки, просто отрисовка:
			var d = dist(dead_unit, to);
			if (d > 20) {
				var fixed = {
					x : dead_unit.x + 10 * (to.x - dead_unit.x)/d, 
					y : dead_unit.y + 10 * (to.y - dead_unit.y)/d 
				};
				return draw_shot(from, fixed);
			}
			draw_shot(from, to);
		}
	}

	// Добавить объект — игрока
	function add(x, y, model, is_static){
		var mdl = cfg.skin[model] || cfg.skin[0];
		var box = Matter.Bodies.rectangle(x, y, 40, 24, {});

		Matter.World.add(engine.world, [ box ]);
		Matter.Body.setAngle(box, -80 * Math.PI / 180);
		if (is_static) Matter.Body.setStatic(box, true);

		var tower = {
			angle   : 0,
			element : $('<div class="tower" />')
				.css({ top: y, left : x, backgroundImage : 'url('+mdl.tower+')'})
				.appendTo('#xmap')
		};
		var body = {
			angle   : 0,
			element : $('<div class="body" />')
				.html('<div style="background-image: url('+mdl.body+')"></div>')
				.css({ top: y, left : x})
				.appendTo('#xmap')
		};
		var remove = function(cn){
			Matter.World.remove(engine.world, [ box ]);
			tower.element.remove(), body.element.remove();
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
			if (!x || isNaN(x[0]) || x.length < 3) return ;
			draw({x : x[0], y : x[1]}, x[2], x[3]);
			Matter.Body.setAngle(box, x[2] * Math.PI / 180);
		};
		var kill = function(){
			var dp = $('<div class="dead-place" />')
				.css({ left: box.position.x, top : box.position.y })
				.css({ transform: 'rotate(' + parseInt(Math.random() * 350) + 'deg)' })
				.appendTo(e);
			var t = 1;
			var i = setInterval(function(){
				t -= 0.01, dp.css({ opacity : t });
				if (t <= 0) clearInterval(i), dp.remove();
			}, 800);

			e.append(sprite(cfg.sprite.dead, box.position));
			setTimeout(function(){
				set([-999, -999, 0, 0]);
			}, 200);
		};
		
		return {
			box    : box,
			set    : set,
			draw   : draw,
			tower  : tower,
			remove : remove,
			kill   : kill,
			state  : [],
			speed  : [0, 0]
		}
	}

	// Шаг анимации. Срабатывает перед отрисовкой карты
	function step(){
		// Сдвиг всех врагов на один шаг из их «анимационного ряда»
		for (var cn in owners){
			if (owners[cn].coda.length == 0) continue ;
			owners[cn].set(owners[cn].coda[0]);
			owners[cn].coda = owners[cn].coda.splice(1);
		}
		if (dead !== false) return me.coda = [];

		// - Сброс скорости
		me.speed = [ me.speed[0] * 0.9, me.speed[1] * 0.9 ];

		// - Синус, косинус поворота корпуса
		var ct = Math.cos(me.box.angle);
		var st = Math.sin(me.box.angle);

		// - Движение корпуса
		if (keys[38] || keys[87]) me.speed[0] += 0.3 * ct, me.speed[1] += 0.3 * st;
		if (keys[40] || keys[83]) me.speed[0] -= 0.2 * ct, me.speed[1] -= 0.2 * st;
		me.speed[0] = Math.min(me.speed[0], 6);
		me.speed[1] = Math.min(me.speed[1], 6);
		Matter.Body.setVelocity(me.box, { x: me.speed[0], y: me.speed[1] });
		
		// - Поворот корпуса
		Matter.Body.setAngularVelocity(me.box, 0);
		if (keys[37] || keys[65]) Matter.Body.setAngularVelocity(me.box, -0.04);
		if (keys[39] || keys[68]) Matter.Body.setAngularVelocity(me.box,  0.04);
		
		// - Поворот башни
		if (keys[81]) me.tower.angle -= 2;
		if (keys[69]) me.tower.angle += 2;
		
		me.draw(me.box.position, me.box.angle * 180 / Math.PI, me.tower.angle);
		
		// - Выстрел
		if (keys[32] && fire == 0) make_shot();
		
		// Запись моих действий
		var nx = [parseInt(me.box.position.x), parseInt(me.box.position.y)];
		// Угол корпуса 3
		nx.push(parseInt(((me.box.angle * 180 / Math.PI) % 360 + 360) % 360));
		// Угол башни 4
		nx.push(parseInt(((me.tower.angle) % 360 + 360) % 360));
		// В стрек
		me.state.push(nx.join(','));

		// Отрисовка карты и миникарты
		map.position(me.box.position);
	}

	// Пробел: переродиться
	function spawn(){
		if (dead !== 0 || !cn) return ;
		dead = false, me.state = [], keys[32] = undefined;
		var place = map.respawn_point(owners);

		Matter.Body.setPosition(me.box, place);
		Matter.Body.setAngle(me.box, -80 * Math.PI / 180);
		keys = [];

		$('#scores').addClass('hidden');
		$('<div class="you-are-here" />').css({ left: place.x, top: place.y }).appendTo(e)
		e.animate({ opacity : 1 }, 700);
	}

	// Обновить информацию по игроку
	function update(cns){
		var cns = cns.split(':'), id = cns[0] || 0;
		// Если видим впервые, создаём юнита на карте
		if (!owners[id]) owners[id] = add(-999, -999, 1, 'static');
		// Закидываем в очередь состояний:
		owners[id].coda = cns[1] ? cns[1].split('!').map(function(pix){
			var xy = pix.split(',');
			return [parseInt(xy[0]), parseInt(xy[1]), parseInt(xy[2]), parseInt(xy[3])];
		}) : [];
		// Обновляем позицию из очереди
		if (owners[id].coda.length == 0) return owners[id].set(-999,-999,0,0);
		owners[id].set(owners[id].coda[0]);
	}

	setInterval(function(){
		// Перезарядка. Таймер:
		if (fire) fire -= 1;
		// Возможность перерождения. Таймер:
		if (dead > 0) dead -= 1;
		// false = я живой
		if (dead !== false) {
			if (dead % 5 == 1) log('Ожидайте: ' + (dead-1)/5);
			if (dead == 1) log('<strong>Для восстановления нажмите пробел</strong>');
			return ;
		}
		// Сообщаем о себе
		socket.emit('me', me.state.join('!'));
		me.state = [];
	}, 200);

	return { 'step' : step, 'spawn' : spawn, 'update' : update, 'leave' : leave, 'shot' : shot, 'echo' : echo }
})(unit_config, $('#xmap'));

// -------------------------------------------------------------------------- //
// Информация по игрокам
socket.on('echo', units.echo);
// Прилетела информация про одного пользователя
socket.on('user', units.update);
// Кто-то выстрелил
socket.on('shot', units.shot);
// Кто-то покинул нас
socket.on('remove', units.leave);

// -------------------------------------------------------------------------- //
Matter.Events.on(render, 'afterRender', units.step);
Matter.Engine.run(engine);
Matter.Render.run(render);

// -------------------------------------------------------------------------- //
window.onkeydown = function(e){
	keys[e.which] = true;
	$('.you-are-here').fadeOut(300, function(){ $(this).remove(); })
};
window.onkeyup = function(e){
	keys[e.which] = undefined;
};
window.onkeypress = function(e) {
	if (e.which == 32 && ready >= 3) units.spawn();
}

var loading = setInterval(function(){
	if (ready < 3) return ;
	clearInterval(loading);
	log('<strong>Для начала игры нажмите пробел</strong>');
}, 10);
