"use strict";

var engine = Matter.Engine.create();
var render = Matter.Render.create({
    element: document.getElementById('xmap'),
    engine: engine,
    options: {
	    width:  1200,
	    height: 900,
	    pixelRatio: 0.5,
	    wireframes : false
    }
});

engine.world.gravity.x = 0;
engine.world.gravity.y = 0;

var map = {
    'rects' : [],
    'size'  : [1200, 900]
};

// Стеночки
map.rects.push([map.size[0]/2, 3,             map.size[0], 5, 0]);
map.rects.push([map.size[0]/2, map.size[1]-3, map.size[0], 5, 0]);
map.rects.push([3,             map.size[1]/2, 5, map.size[1], 0]);
map.rects.push([map.size[0]-3, map.size[1]/2, 5, map.size[1], 0]);

// Отрисовка непроницаемых мест карты: 
Matter.World.add(engine.world, map.rects.map(function(e){
    var box = Matter.Bodies.rectangle(e[0], e[1], e[2], e[3], { isStatic: true });
    Matter.Body.setAngle(box, e[4]);
    return box;
}));


Matter.Engine.run(engine);
Matter.Render.run(render);
