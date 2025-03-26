import Matter from 'matter-js';
import { playSound, switchSound } from './playSound.js';
import {
	focus, planetWrap, planet, addToWorld, removeFromWorld, setCollisionEvent,
	// getDebugInfo,
	scaleViewPort,
	// setChunkerOptions,
	makeWorld,
} from './world.js';
import { createCar } from './Car.js';
import { JUNK_LABEL } from './Junk.js';
import { BaseShip, HQ_LABEL } from './BaseShip.js';

const {
	Body,
	// Vector,
	Bodies,
	Constraint,
	// Composite,
	// Events,
} = Matter;

const MAX_CONFETTI = 1200;
const BASE_DENSITY = 0.001; // Based on matter.js default
const TOW_CONNECTOR_LABEL = 'Tow Connector';
const confetti = [];
const towLines = [];
window.towLines = towLines;

let scoringOn = false;
let scale = 1;
let junkCollected = 0;
const junkGoal = 30; // TODO: base this on the side of the planet

const $id = (id) => document.getElementById(id);
const $idText = (id, text) => { $id(id).innerText = text; };

function displayProgress() {
	let progressText = '';
	if (scoringOn) {
		const goalText = (junkCollected < junkGoal) ? `/ ${junkGoal}` : 'YOU WIN!';
		progressText = `Collect Junk: ${junkCollected} ${goalText}`;
	}
	$idText('progress-text', progressText);
}
function displaySpeed(car) {
	// $idText('speed-text', car.getAngularVelocity());
	$idText('car-controls-text', `Jump: ${car.jumpCooldown > 0 ? 'recharging...' : 'Ready'} `);
	// TODO: Remove - debugging
	// const di = getDebugInfo();
	// const text = Object.keys(di).map((key) => `${key}: ${Math.round(di[key])}`).join(' | ');
	// $idText('debug-text', text);
}

function addCars(x) {
	let carScale = 0.9;
	const cars = [createCar(x, 0, 150 * carScale, 30 * carScale, 30 * carScale)];
	// Put the other car by the planet-wrap point
	carScale = 0.8;
	cars.push(createCar(300, -300, 150 * carScale, 30 * carScale, 30 * carScale));
	cars.forEach((car) => addToWorld(car.composite));
	return cars;
}

function addBase(x) {
	const base = new BaseShip(x, 300);
	addToWorld(base.composite);
}

function addTowLine(car) {
	if (towLines.length >= 140) return false;
	const carPos = car.mainBody.position;
	const options = { density: BASE_DENSITY / 2 };
	const towLinks = [
		Bodies.polygon(carPos.x, carPos.y - 100, 5, 9, options),
		Bodies.polygon(carPos.x, carPos.y - 150, 5, 9, options),
		Bodies.polygon(carPos.x, carPos.y - 200, 5, 12, { ...options, label: TOW_CONNECTOR_LABEL }),
	];
	const stiffness = 0.4;
	const connectionOffset = 3;
	const towConstraints = [
		Constraint.create({
			bodyA: car.mainBody,
			pointA: { x: 0, y: connectionOffset },
			bodyB: towLinks[0],
			pointB: { x: 0, y: -connectionOffset },
			stiffness,
			render: { type: 'line' },
		}),
		Constraint.create({
			bodyA: towLinks[0],
			pointA: { x: 0, y: connectionOffset },
			bodyB: towLinks[1],
			pointB: { x: 0, y: -connectionOffset },
			stiffness,
			render: { type: 'spring' },
		}),
		Constraint.create({
			bodyA: towLinks[1],
			pointA: { x: 0, y: 0 },
			bodyB: towLinks[2],
			pointB: { x: 0, y: 0 },
			stiffness,
		}),
	];
	const towConnector = towLinks[towLinks.length - 1];
	addToWorld([...towLinks, ...towConstraints]);
	towLines.push({ towLinks, towConstraints, towConnector, connection: null });
	return true;
}

function removeTowLine(i = 0) {
	if (!towLines.length) return false;
	if (!towLines[i]) return false;
	const { towLinks, towConstraints, connection } = towLines[i];
	towLines.splice(i, 1);
	removeFromWorld(towConstraints);
	if (connection) removeFromWorld(connection);
	// fun to remove these a litte afterwards
	setTimeout(() => removeFromWorld(towLinks), 1200 + (Math.random() * 4000));
	return true;
}

function connectTowLine(towConnectorBody, body) {
	if (body.label !== JUNK_LABEL) return; // Only connects to junk
	const towLine = towLines.find((tLine) => tLine.towConnector.id === towConnectorBody.id);
	if (!towLine) {
		// console.warn('No tow line for', towConnectorBody);
		return;
	}
	if (towLine.connection) return; // Only one connection at a time
	// Body B needs to be the junk composite in order for it to be disconnected properly
	if (!body.compoundBody) return;
	towLine.connection = Constraint.create({
		bodyA: towConnectorBody,
		pointA: { x: 0, y: 0 },
		bodyB: body.compoundBody || body,
		pointB: { x: 0, y: 0 },
		stiffness: 0.6,
		render: { type: 'line' },
	});
	addToWorld(towLine.connection);
	playSound('attachTowLine');
}

function disconnectTowLinesFrom(junkBody) {
	// See if there's a tow line (or many)
	let towLineIndex;
	while (towLineIndex !== -1) {
		towLineIndex = towLines.findIndex((tLine) => {
			const id = tLine.connection?.bodyB.id;
			return id === junkBody.id || id === junkBody?.compoundBody.id;
		});
		removeTowLine(towLineIndex);
	}
}

function removeConfetti(body) {
	removeFromWorld(body);
	const i = confetti.findIndex((c) => c.id === body.id);
	if (i !== -1) confetti.splice(i, 1);
}

function makeConfetti(n, x, y, velYMult = -1) { // aka. Debris
	const randInt = (z) => Math.floor(Math.random() * z);
	for (let i = 0; i < n; i += 1) {
		const randColor = [
			50 + randInt(100),
			50 + randInt(100),
			50 + randInt(100),
		];
		const body = Bodies.polygon(x, y, 6, 8, {
			render: {
				fillStyle: `rgb(${randColor.join(',')})`,
			},
			label: 'Confetti',
			density: BASE_DENSITY / 10,
		});
		confetti.push(body);
		if (confetti.length > MAX_CONFETTI) removeConfetti(confetti.shift());
		Body.setVelocity(body, { x: randInt(20) - 10, y: (1 + randInt(20)) * velYMult });
		addToWorld(body);
		setTimeout(() => removeConfetti(body), 2000 + (Math.random() * 8000));
	}
}

function collectJunk(junkBody) {
	disconnectTowLinesFrom(junkBody);
	// Body.set(junkBody?.compoundBody || junkBody, 'isStatic', true);
	if (!junkBody.parentComposite) console.error('Junk body is missing parentComposite', junkBody);
	if (junkBody.collectedAlready) return;
	// console.log('Collecting junk', junkBody);
	junkBody.collectedAlready = true; // eslint-disable-line no-param-reassign
	if (!scoringOn) {
		removeFromWorld(junkBody.parentComposite);
		return;
	}
	junkCollected += 1;
	// playSound('success');
	playSound('collect');
	displayProgress();
	// Composite.allBodies(junkBody.parentComposite).forEach((body) => {
	// 	Body.scale(body, 0.9, 0.3);
	// });
	makeConfetti(20, junkBody.position.x, junkBody.position.y);
	setTimeout(() => removeFromWorld(junkBody.parentComposite), 0);
	displayProgress();
}

function handleCollisionPair(pair) {
	const { bodyA, bodyB } = pair;
	if (bodyA.label === HQ_LABEL && bodyB.label === JUNK_LABEL) collectJunk(bodyB);
	else if (bodyA.label === JUNK_LABEL && bodyB.label === HQ_LABEL) collectJunk(bodyA);
	else if (bodyA.label === TOW_CONNECTOR_LABEL) {
		connectTowLine(bodyA, bodyB);
	} else if (bodyB.label === TOW_CONNECTOR_LABEL) {
		connectTowLine(bodyB, bodyA);
	} else {
		// playSound('bump');
	}
}

function setup() {
	const xStart = planet.planetMiddleX;
	makeWorld({
		flattenNearX: xStart,
		flattenChunkRange: 1,
	});
	setCollisionEvent((event) => {
		if (!event.pairs.length) return;
		event.pairs.forEach(handleCollisionPair);
	});
	addBase(xStart);
	const cars = addCars(xStart);
	const driveCar = cars[0];
	document.addEventListener('keydown', (e) => {
		// Body.applyForce(cars[0], { x: 0, y: 0 }, Vector.create(0, 100));
		if (e.key === 'a' || e.key === 'ArrowLeft') {
			driveCar.pedalDown = -1;
		} else if (e.key === 'd' || e.key === 'ArrowRight') {
			driveCar.pedalDown = 1;
		} else if (e.key === 'w' || e.key === 'ArrowUp' || e.key === ' ') {
			if (driveCar.jump()) playSound('jump');
		} else if (e.key === 's' || e.key === 'ArrowDown') {
			// playSound('zup');
		} else if (e.key === 'v') {
			Body.setSpeed(driveCar.mainBody, 40);
		} else if (e.key === 'e') {
			if (addTowLine(driveCar)) playSound('fireTowLine');
		} else if (e.key === 'q') {
			if (removeTowLine()) playSound('breakTowLine');
		} else if (e.key === 'f') {
			if (driveCar.flip()) playSound('zup');
		} else if (e.key === 'm') {
			switchSound();
		} else if (e.key === 'c') {
			const { x, y } = driveCar.mainBody.position;
			makeConfetti(10, x, y - 20, -1);
			playSound('zip');
		} else if (e.key === 'x') {
			const { x, y } = driveCar.mainBody.position;
			makeConfetti(10, x, y + 20, 1);
			playSound('zip');
		} else if (e.key === 'Shift') {
			driveCar.sprint = 1;
		} else {
			console.log(e);
			// Body.setVelocity(driveCar.mainBody, Vector.create(0, -50));
		}
	});
	document.addEventListener('keyup', (e) => {
		if (e.key === 'a' || e.key === 'ArrowLeft' || e.key === 'd' || e.key === 'ArrowRight') {
			driveCar.pedalDown = 0;
		} else if (e.key === 'Shift') {
			driveCar.sprint = 0;
		}
	});
	document.addEventListener('wheel', (e) => {
		scale -= (e.wheelDelta / 300);
		scale = scaleViewPort(scale);
	});
	setInterval(() => {
		driveCar.update();
		const { x, y } = driveCar.mainBody.position;
		focus({ x, y: y - 30 });
		planetWrap(cars.map((car) => car.composite));
		displaySpeed(driveCar);
		if (driveCar.pedalDown !== 0) playSound('thrust');
	}, 2);
	setTimeout(() => { junkCollected = 0; scoringOn = true; displayProgress(); }, 4000);
}

document.addEventListener('DOMContentLoaded', setup);
