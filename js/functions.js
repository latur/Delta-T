"use strict";

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
var e_fire = ['./img/explosion_fire.png', 64, 40];
var e_tank = ['./img/explosion_tank.png', 128, 48];

function Explode(e, point){
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
	var m = $('<p>').html(msg).appendTo('#screen');
	console.log('LOG: ' + msg);
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
	'ground' : './img/map.BG.jpg',
	'top'    : './img/map.top.png',
	'spawn'  : [
			{x: 259, y: 610},
			{x: 445, y: 720},
			{x: 812, y: 788},
			{x: 958, y: 625},
			{x: 958, y: 625}
		],
	'rects'  : [
		[1078, 119, 318, 38, -6.284624147518159],
		[1204, 699, 258, 36, 0],
		[436, 115, 635, 37, 0.0033199516810196172],
		[210, 362, 124, 337, 0.17707124272724117],
		[979, 85, 38, 48, 0],
		[1398, 187, 213, 36, 0.7810119556578599],
		[1396, 624, 217, 37, 2.343729070293972],
		[859, 192, 217, 36, 5.45286370728862],
		[861, 622, 217, 37, 0.8442934156353976],
		[793, 289, 41, 57, 0],
		[796, 499, 40, 108, 0],
		[1317, 119, 38, 38, 0],
		[1470, 304, 35, 106, 0],
		[1469, 513, 34, 97, 0],
		[956, 698, 70, 37, 0],
		[1238, 410, 111, 206, 0],
		[252, 711, 310, 125, 0.16873532689381232],
		[633, 724, 279, 118, 0.14008025346416453],
		[1057, 798, 195, 35, 0],
		[337, 648, 82, 68, 0.18237975349130164],
		[159, 310, 155, 68, 0.18943913481459473]
	],
	'circles' : [
		[982, 287, 60.5],
		[1239, 509, 56]
	]
}

// Стеночки
map_info.rects.push([map_info.size[0]/2, 3,                        map_info.size[0], 5, 0]);
map_info.rects.push([map_info.size[0]/2,   map_info.size[1] - 3,   map_info.size[0], 5, 0]);
map_info.rects.push([3,                    map_info.size[1]/2, 5, map_info.size[1], 0]);
map_info.rects.push([map_info.size[0] - 3, map_info.size[1]/2, 5, map_info.size[1], 0]);

// Отрисорвка мини-карты
var w_offsets = { left : 0, top : 0};
$('#xmap').css({
	width  : map_info.size[0], 
	height : map_info.size[1]
});

log('Загрузка карты');
$('<img class="full ground">')
	.attr('src', map_info.ground).appendTo('#xmap')[0]
	.onload = function(){ log('Карта загружена'); }
$('<img class="full top">')
	.attr('src', map_info.top).appendTo('#xmap')[0]
	.onload = function(){ log('Местность загружена'); }
