import Matter from 'matter-js';

import { createJunk, JUNK_LABEL, MAX_JUNK_SIZE } from './Junk.js';
// To use:
// import { setup } from './car-demo.js';
// document.addEventListener('DOMContentLoaded', setup);

const {
	Engine,
	Render,
	Runner,
	MouseConstraint,
	Mouse,
	Bodies,
	Body,
	Composite,
	// Bounds,
	Events,
} = Matter;

// const TERRAIN_COLOR = 'rgba(150, 150, 150, 0.4)';
// const TERRAIN_COLOR = '#443344';

// create engine
const engine = Engine.create();
window.world = engine.world;

function addToWorld(what) {
	Composite.add(engine.world, what);
}

function removeFromWorld(what) {
	if (what.label === JUNK_LABEL) {
		console.log('want to remove junk');
	}
	Composite.remove(engine.world, what);
}

// create renderer
const render = Render.create({
	element: document.body,
	engine,
	options: {
		width: window.innerWidth - 12,
		height: window.innerHeight - 12,
		// showAngleIndicator: true,
		// showCollisions: true,
		// showIds: true,
		// showAxes: true,
		// showPositions: true,
		// showSeparations: true,
		// showDebug: true,
		wireframes: false,
	},
	renderer: { element: document.getElementById('world') },
});

render.context.imageSmmothingEnabled = false;
render.context.mozImageSmoothingEnabled = false;
render.context.webkitImageSmoothingEnabled = false;

Render.run(render);

// create runner
const runner = Runner.create();
Runner.run(runner, engine);

function stop() {
	Render.stop(render);
	Runner.stop(runner);
}

const floorY = 600;
const planetR = 10000;

// add bodies
addToWorld([
	// walls
	// Bodies.rectangle(400, 0, 800, 50, { isStatic: true }),
	// Bodies.rectangle(startX, floorY, 800, 50, { isStatic: true }),
	// Bodies.rectangle(800, 300, 50, 600, { isStatic: true }),
	// Bodies.rectangle(0, 300, 50, 600, { isStatic: true }),
	// Bodies.rectangle(-400, floorY, 800, 50, { isStatic: true }),
	// Bodies.rectangle(1200, floorY, 800, 50, { isStatic: true }),
	Bodies.circle(400, floorY + planetR, planetR, { isStatic: true }, 100),
]);

/*
addToWorld([
	Bodies.rectangle(200, 150, 400, 20, { isStatic: true, angle: Math.PI * 0.06,
		render: { fillStyle: '#060a19' } }),
	Bodies.rectangle(500, 350, 650, 20, { isStatic: true, angle: -Math.PI * 0.06,
		render: { fillStyle: '#060a19' } }),
	Bodies.rectangle(300, 560, 600, 20, { isStatic: true, angle: Math.PI * 0.04,
		render: { fillStyle: '#060a19' } }),
]);
*/

// add mouse control
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
	mouse,
	constraint: {
		stiffness: 0.2,
		render: {
			visible: false,
		},
	},
});

addToWorld(mouseConstraint);

// keep the mouse in sync with rendering
render.mouse = mouse;

// ------ Handle Planet Chunking

let checkingChunkNum = 0;
let chunkerOptions = {};

const planetRadius = planetR;
const planetCircumference = 2 * Math.PI * planetRadius;
const planetMinY = -3000;
const planetMaxY = 3000;
const planetMaxX = planetCircumference;
const planetMinX = 0;
const planetMiddleX = (planetMaxX - planetMinX) / 2;
const chunksCount = 100;
const xPerChunk = planetCircumference / chunksCount;
const halfXPerChunk = xPerChunk / 2;
const quarterXPerChunk = xPerChunk / 4;
const chunks = {};
const minTerrainHeight = 20;
const maxTerrainHeight = 500;
const terrainHeightVariation = maxTerrainHeight - minTerrainHeight;
const getChunkId = (chunkNum) => `C${chunkNum}`;
// TODO: base height on chunkNum so we can have procedural rolling hills
const getRandomHeight = (/* chunkNum */) => (
	minTerrainHeight + (Math.random() * terrainHeightVariation)
);
const getChunk = (chunkNum) => chunks[getChunkId(chunkNum)];
const getChunkX = (chunkNum) => (chunkNum * xPerChunk);
const getChunkNumAtX = (x) => Math.floor(x / xPerChunk);
const getNextChunkNum = (chunkNum) => ((chunkNum > chunksCount - 1) ? 0 : chunkNum + 1);
// const getHeightY = (h) => floorY - h;
const setChunkerOptions = (obj) => { chunkerOptions = { ...obj }; };

function makeChunk(chunkNum) {
	// Chunks have two heights: the height at the left and the height in the middle
	// The height at the right is determined by the next chunk's left
	const c = { h1: getRandomHeight(chunkNum), h2: getRandomHeight(chunkNum) };
	const { flattenNearX = null, flattenChunkRange = 1 } = chunkerOptions;
	if (typeof flattenNearX === 'number') {
		const flatNum = getChunkNumAtX(flattenNearX);
		if (Math.abs(flatNum - chunkNum) <= flattenChunkRange) {
			c.h1 /= 2;
			c.h2 /= 2;
		}
	}
	chunks[getChunkId(chunkNum)] = c;
	return c;
}

function makeChunks() {
	for (let i = 0; i < chunksCount; i += 1) { makeChunk(i); }
}

function getTerrainColor() {
	const colorArray = [68, 51, 69, 1]; // #443344
	// const i = Math.floor(Math.random() * 3);
	// colorArray[i] += Math.floor((Math.random() * 10) - (Math.random() * 10));
	return `rgba(${colorArray.join(',')})`;
}

function makeVertexShape(x, y, verts, options) {
	const body = Bodies.fromVertices(0, 0, verts, options);
	const { min, max } = body.bounds;
	const boundingBoxCenterX = (min.x + max.x) / 2;
	const boundingBoxCenterY = max.y; // (min.y + max.y) / 2;
	const offsetX = boundingBoxCenterX - body.position.x;
	const offsetY = boundingBoxCenterY - body.position.y;
	Body.translate(body, { x: -offsetX, y: -offsetY }); // Translate to origin of the bounding box
	Body.setCentre(body, { x: 0, y: 0 });
	Body.translate(body, { x, y }); // Translate to desired location
	// Body.setCentre(body, { x: offsetX, y: offsetY }, true);
	return body;
}

function makeTerrain(chunkNum, chunkHeights = []) {
	const x = getChunkX(chunkNum);
	// Adding new floor
	const terrain = Composite.create({ label: 'terrain' });
	const [h1 = 0, h2 = 0, h3 = 0] = chunkHeights;
	const opt = {
		isStatic: true,
		render: {
			fillStyle: getTerrainColor(),
			opacity: 1,
			lineWidth: 0,
		},
	};
	const rectHeight = 400;
	const triangleFloorY = floorY - (rectHeight / 2);
	const buffer = 2;
	const floorRect = Bodies.rectangle(x, floorY, xPerChunk + buffer, rectHeight + buffer, opt);
	const triangleWidth = halfXPerChunk + buffer;
	const verts1 = [
		{ x: 0, y: 0 },
		{ x: 0, y: -h1 },
		{ x: triangleWidth, y: -h2 },
		{ x: triangleWidth, y: 0 },
	];
	const verts2 = [
		{ x: 0, y: 0 },
		{ x: 0, y: -h2 },
		{ x: triangleWidth, y: -h3 },
		{ x: triangleWidth, y: 0 },
	];
	const triangle1 = makeVertexShape(x - quarterXPerChunk, triangleFloorY, verts1, opt);
	const triangle2 = makeVertexShape(x + quarterXPerChunk, triangleFloorY, verts2, opt);

	Composite.addBody(terrain, floorRect);
	Composite.addBody(terrain, triangle1);
	Composite.addBody(terrain, triangle2);
	addToWorld(terrain);
	return terrain;
}

function getChunkHeightYAtX(x, chunkHeights) {
	const [h1, h2, h3] = chunkHeights;
	// TODO: Make this a better calculation. Right now it just defaults to zero and the junk
	// falls into place
	return Math.min(0, (h1 + h2 + h3) / 3);
}

function makeJunk(chunkNum, chunkHeights) {
	// Don't make for out-of-bounds
	if (chunkNum < 0 || chunkNum >= chunksCount) return [];
	const x = getChunkX(chunkNum);
	const arr = [1, 2, 3].forEach(() => {
		const junkX = x + (Math.random() * halfXPerChunk) - (Math.random() * halfXPerChunk);
		const y = getChunkHeightYAtX(junkX, chunkHeights) - MAX_JUNK_SIZE;
		const junk = createJunk(junkX, y);
		addToWorld(junk.composite);
	});
	return arr;
}

function getChunkHeights(chunkNum) {
	const chunk = getChunk(chunkNum);
	const { h1 = 0, h2 = 0 } = chunk;
	const nextChunkNum = getNextChunkNum(chunkNum);
	const nextChunk = getChunk(nextChunkNum) || makeChunk(nextChunkNum);
	const h3 = nextChunk.h1 || 0;
	return [h1, h2, h3];
}

function addChunkFloor(chunkNum) {
	const c = getChunk(chunkNum) || makeChunk(chunkNum);
	if (c.terrain) {
		// already has one
	} else {
		const chunkHeights = getChunkHeights(chunkNum);
		c.terrain = makeTerrain(chunkNum, chunkHeights);
		// c.junk = makeJunk(chunkNum, chunkHeights);
		makeJunk(chunkNum, chunkHeights);
	}
}

function checkChunkTerrain() {
	checkingChunkNum = (checkingChunkNum + 1) % chunksCount;
	// const c = getChunk(checkingChunkNum);
	// if (!c.terrain) return;
	// TODO: Check distance between focus and this chunk
	// TODO: If far, then freeze all items on it, and then remove
}

function chunker() {
	const chunkNum = getChunkNumAtX(focusPoint.x);
	addChunkFloor(chunkNum);
	addChunkFloor(chunkNum + 1);
	addChunkFloor(chunkNum + 2);
	addChunkFloor(chunkNum + 3);
	addChunkFloor(chunkNum - 1);
	addChunkFloor(chunkNum - 2);
	checkChunkTerrain();
}

function getCompositePositionArray(composite) {
	const { min, max } = Matter.Composite.bounds(composite);
	return [(min.x + max.x) / 2, (min.y + max.y) / 2];
}

function setCompositePosition(composite, x, y) {
	const [centerX, centerY] = getCompositePositionArray(composite);
	const deltaX = x - centerX;
	const deltaY = y - centerY;
	Composite.translate(composite, { x: deltaX, y: deltaY });
}

function planetWrap(composites = []) {
	composites.forEach((c) => {
		const [x, y] = getCompositePositionArray(c);
		if (x < planetMinX) {
			console.log('Beyond min - sending to max');
			setCompositePosition(c, planetMaxX + (planetMinX - x) - 10, y + 10);
		} else if (x > planetMaxX) {
			console.log('Beyond max - sending to min');
			setCompositePosition(c, planetMinX + (x - planetMaxX) + 10, y + 10);
		}
		if (y < planetMinY) {
			setCompositePosition(c, x, planetMinY + 10);
		} else if (y > planetMaxY) {
			setCompositePosition(c, x, planetMinY + 10);
		}
	});
}

// function getAllJunk() {
// 	let allJunk = [];
// 	Object.values(chunks).forEach((chunk) => {
// 		if (chunk.junk) allJunk = allJunk.concat(chunk.junk);
// 	});
// 	return allJunk;
// }

// ------ Viewport and Focus

let viewPortScale = 1;
const viewPortSize = { x: 800, y: 600 }; // fit the render viewport to the scene
const viewPortHalfSize = {};

function setViewPortSize() {
	viewPortSize.x = 800 * viewPortScale;
	viewPortSize.y = 600 * viewPortScale;
	viewPortHalfSize.x = viewPortSize.x / 2;
	viewPortHalfSize.y = viewPortSize.y / 2;
}

function scaleViewPort(scale) {
	viewPortScale = Math.max(Math.min(scale, 1000), 0.2);
	setViewPortSize();
	return viewPortScale;
}

setViewPortSize();

const focusPoint = { x: viewPortHalfSize.x, y: viewPortHalfSize.y };
Render.lookAt(render, { min: { x: 0, y: 0 }, max: { x: 800, y: 600 } });

function lookAt(obj) {
	Render.lookAt(render, {
		min: { x: obj.x - viewPortHalfSize.x, y: obj.y - viewPortHalfSize.y },
		max: { x: obj.x + viewPortHalfSize.x, y: obj.y + viewPortHalfSize.y },
	});
}

function focus(xyObj) {
	focusPoint.x = xyObj.x;
	focusPoint.y = xyObj.y;
	lookAt(focusPoint);
	chunker();
}

const planet = {
	planetMiddleX,
	xPerChunk,
};

// ------ Set Events

function setCollisionEvent(callback = (event) => { console.log(event); }) {
	Events.off(engine, 'collisionStart');
	Events.on(engine, 'collisionStart', callback);
}

// ------ Debug info

function getDebugInfo() {
	return {
		focusPointX: focusPoint.x,
		chunkNum: getChunkNumAtX(focusPoint.x),
	};
}

// ------ Start it up

function makeWorld(options) {
	setChunkerOptions(options);
	makeChunks();
}

export {
	// cars,
	engine,
	runner,
	render,
	// canvas: render.canvas,
	makeWorld,
	stop,
	lookAt,
	focus,
	planet,
	addToWorld,
	removeFromWorld,
	planetWrap,
	setCollisionEvent,
	scaleViewPort,
	setChunkerOptions,
	getDebugInfo,
};
