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
	return Math.sqrt( Math.pow(A.x - B.x, 2) + Math.pow(A.y - B.y, 2) );
}

// Спрайт взывов:
function explosion(point, name){
	var ex = {
		'main' : {
			file   : './img/ex.png', 
			size   : 128, 
			offset : 128 * random_int(0, 3) + 'px ',
			steps  : 44
		}
	};
	var sprite = $('<div class="sprite" />')
		.css({ left : point.x - ex[name].size/2, top : point.y - ex[name].size/2 })
		.css({ width : ex[name].size, height : ex[name].size, backgroundImage : 'url('+ex[name].file+')' })
	var index = 0;
	var timer = setInterval(function(){
		if (ex[name].steps == index) return [clearInterval(timer), sprite.remove()];
		sprite.css({ backgroundPosition : ex[name].offset + (-ex[name].size * index) + 'px'});
		index++;
	}, 25);
	return sprite;
}

function random_int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
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




