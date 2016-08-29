// Поиск точки первой коллизии (пересечение луча и любого объекта)
function find_collision_end(A, B, bodies, iteration){
	if (iteration > 10) return B;
	var mean = {x : (A.x + B.x)/2, y : (A.y + B.y)/2};
	var C = Matter.Query.ray(bodies, A, mean);
	if (C.length == 0) A = mean; else B = mean;
	return find_collision_end(A, B, bodies, iteration + 1);
}

// Евклидова метрика
function dist(A, B){
	if (!A || !B) return Infinity;
	return Math.sqrt( Math.pow(A.x - B.x, 2) + Math.pow(A.y - B.y, 2) );
}

// Спрайт взоывов:
function exp64(point){
	var file   = './img/exp.64.png';
	var size   = 64;
	var steps  = 40;

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

// Угасающая линия в канвасе
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

function random_int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function window_calc(pos, side, win, frame, prop){
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

function log(msg){
	console.log('LOG: ');
	console.log(msg);
}

var unit_models = {
	'white' : {
		'body'  : './img/model-w.png',
		'tower' : './img/model-w-tower.png',
	},
	'black' : {
		'body'  : './img/model-b.png',
		'tower' : './img/model-b-tower.png',
	}
};

var map_info = {
	'size'   : [1600, 900],
	'ground' : './maps/ground.jpg',
	'top'    : './maps/top.png',
	'rects'  : [
		[20,   50,  280,  20],
		[120,  150, 280,  20],
		[320,  250, 280,  20],
		[400,  200, 80,   80],
		[420,  450, 980,  20],
		[420,  550, 1080, 20],
		[1200, 400, 80,   80],
		[1450, 820, 980,  20],
		[1550, 120, 300,  40],
		[1550, 180, 300,  40]
	]
}

// Стеночки
map_info.rects.push([map_info.size[0]/2, 5,                        map_info.size[0], 10]);
map_info.rects.push([map_info.size[0]/2,   map_info.size[1] - 5,   map_info.size[0], 10]);
map_info.rects.push([5,                    map_info.size[1]/2, 10, map_info.size[1]]);
map_info.rects.push([map_info.size[0] - 5, map_info.size[1]/2, 10, map_info.size[1]]);

// Отрисорвка мини-карты
var minimapHeight = 120 * map_info.size[1] / map_info.size[0];
var w_offsets = { left : 0, top : 0};
$('#mini-map').css({ height : minimapHeight, display : 'none' });
$('#xmap').css({ width : map_info.size[0], height : map_info.size[1] })







