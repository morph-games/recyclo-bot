import Matter from 'matter-js';
// To use:
// import { setup } from './car-demo.js';
// document.addEventListener('DOMContentLoaded', setup);

const {
	Engine,
	Render,
	Runner,
	MouseConstraint,
	Mouse,
	Body,
	Bodies,
	Composite,
	Constraint,
	Vector,
} = Matter;

function makeCarScene() {
	// create engine
	const engine = Engine.create();
	const world = engine.world;

	const addToWorld = (what) => Composite.add(world, what);

	// create renderer
	const render = Render.create({
		element: document.body,
		engine,
		options: {
			width: 800,
			height: 600,
			showAngleIndicator: true,
			showCollisions: true,
		},
	});

	Render.run(render);

	// create runner
	const runner = Runner.create();
	Runner.run(runner, engine);

	// add bodies
	addToWorld([
		// walls
		Bodies.rectangle(400, 0, 800, 50, { isStatic: true }),
		Bodies.rectangle(400, 600, 800, 50, { isStatic: true }),
		Bodies.rectangle(800, 300, 50, 600, { isStatic: true }),
		Bodies.rectangle(0, 300, 50, 600, { isStatic: true }),
	]);

	// see car function defined later in this file
	let scale = 0.9;
	const cars = [makeCar(150, 100, 150 * scale, 30 * scale, 30 * scale)];
	scale = 0.8;
	cars.push(makeCar(350, 300, 150 * scale, 30 * scale, 30 * scale));

	cars.forEach((car) => addToWorld(car));

	addToWorld([
		Bodies.rectangle(200, 150, 400, 20, { isStatic: true, angle: Math.PI * 0.06, render: { fillStyle: '#060a19' } }),
		Bodies.rectangle(500, 350, 650, 20, { isStatic: true, angle: -Math.PI * 0.06, render: { fillStyle: '#060a19' } }),
		Bodies.rectangle(300, 560, 600, 20, { isStatic: true, angle: Math.PI * 0.04, render: { fillStyle: '#060a19' } }),
	]);

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

	// fit the render viewport to the scene
	const viewPortSize = { x: 800, y: 600 };
	const viewPortHalfSize = { x: viewPortSize.x / 2, y: viewPortSize.y / 2 };
	Render.lookAt(render, {
		min: { x: 0, y: 0 },
		max: { x: 800, y: 600 },
	});

	// context for MatterTools.Demo
	return {
		cars,
		engine,
		runner,
		render,
		canvas: render.canvas,
		stop: () => {
			Matter.Render.stop(render);
			Matter.Runner.stop(runner);
		},
		lookAt: (obj) => Render.lookAt(render, {
			min: { x: obj.x - viewPortHalfSize.x, y: obj.y - viewPortHalfSize.y },
			max: { x: obj.x + viewPortHalfSize.x, y: obj.y + viewPortHalfSize.y },
		}),
	};
}

/**
* Creates a composite with simple car setup of bodies and constraints.
* @method car
* @param {number} xx
* @param {number} yy
* @param {number} width
* @param {number} height
* @param {number} wheelSize
* @return {composite} A new composite car body
*/
function makeCar(xx, yy, width, height, wheelSize) {
	let group = Body.nextGroup(true),
		wheelBase = 20,
		wheelAOffset = -width * 0.5 + wheelBase,
		wheelBOffset = width * 0.5 - wheelBase,
		wheelYOffset = 0;

	let car = Composite.create({ label: 'Car' }),
		body = Bodies.rectangle(xx, yy, width, height, { 
			collisionFilter: {
				group: group
			},
			chamfer: {
				radius: height * 0.5
			},
			density: 0.0002
		});

	let wheelA = Bodies.circle(xx + wheelAOffset, yy + wheelYOffset, wheelSize, {
		collisionFilter: {
			group: group
		},
		friction: 0.8
	});

	let wheelB = Bodies.circle(xx + wheelBOffset, yy + wheelYOffset, wheelSize, {
		collisionFilter: {
			group: group
		},
		friction: 0.8,
	});

	let axelA = Constraint.create({
		bodyB: body,
		pointB: { x: wheelAOffset, y: wheelYOffset },
		bodyA: wheelA,
		stiffness: 1,
		length: 0,
	});

	let axelB = Constraint.create({
		bodyB: body,
		pointB: { x: wheelBOffset, y: wheelYOffset },
		bodyA: wheelB,
		stiffness: 1,
		length: 0,
	});

	Composite.addBody(car, body);
	Composite.addBody(car, wheelA);
	Composite.addBody(car, wheelB);
	Composite.addConstraint(car, axelA);
	Composite.addConstraint(car, axelB);

	car.mainBody = body;
	car.wheelA = wheelA;
	car.wheelB = wheelB;

	return car;
}

function setup() {
	const { cars, lookAt } = makeCarScene();
	const driveCar = cars[0];
	const driveAmount = 0.5;
	document.addEventListener('keydown', (e) => {
		// Body.applyForce(cars[0], { x: 0, y: 0 }, Vector.create(0, 100));
		if (e.key === 'a' || e.key === 'ArrowLeft') {
			Body.setAngularVelocity(driveCar.wheelA, -driveAmount);
		} else if (e.key === 'd' || e.key === 'ArrowRight') {
			Body.setAngularVelocity(driveCar.wheelA, driveAmount);
		} else if (e.key === 's' || e.key === 'ArrowDown') {
			Body.setVelocity(driveCar.mainBody, Vector.create(0, -50));
		} else {
			console.log(e.key);
		}
	});
	window.setInterval(() => {
		// console.log(driveCar.mainBody.position);
		lookAt(driveCar.mainBody.position);
	}, 2);
}

export { makeCar, makeCarScene, setup };
