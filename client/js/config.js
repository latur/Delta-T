"use strict";

var unit_config = {
	'skin' : [
		{
			'body'  : '../client/img/model-w.png',
			'tower' : '../client/img/model-w-tower.png',
		}, {
			'body'  : '../client/img/model-b.png',
			'tower' : '../client/img/model-b-tower.png',
		}
	],
	'sprite' : {
		'fire' : ['../client/img/explosion_fire.png', 64, 40],
		'dead' : ['../client/img/explosion_tank.png', 128, 48]
	}
};

var map_config = {
	'size'   : [1600, 900],
	'ground' : '../client/img/map.BG.jpg',
	'top'    : '../client/img/map.top.png',
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
};

var sounds = {
	'run' : new Audio('../client/sounds/run.wav'),
	'get' : new Audio('../client/sounds/get.wav'),
	'smk' : new Audio('../client/sounds/smk.wav'),
	'fre' : new Audio('../client/sounds/fre.wav'),
	'bom' : new Audio('../client/sounds/bom.wav')
};

