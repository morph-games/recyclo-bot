import Matter from 'matter-js';

const {
	Body,
	Bodies,
	Composite,
	Constraint,
	Vector,
} = Matter;

function getRotatedRelativePosition(body, relativePosition) {
	const cos = Math.cos(body.angle);
	const sin = Math.sin(body.angle);
	const x = 0;
	const y = 0;
	// Apply rotation transformation
	const absoluteX = x + relativePosition.x * cos - relativePosition.y * sin;
	const absoluteY = y + relativePosition.x * sin + relativePosition.y * cos;
	return { x: absoluteX, y: absoluteY };
}

class Car {
	constructor(xx, yy, width = 150, height = 30, wheelRadius = 30) {
		const group = Body.nextGroup(true);
		const wheelBase = 20;
		const wheelAOffset = ((width * 0.5) - wheelBase);
		const wheelBOffset = -wheelAOffset;
		const wheelYOffset = 0;

		const car = Composite.create({ label: 'Car' });
		const bodyRender = { fillStyle: 'rgb(80, 210, 200)', lineWidth: 1, strokeStyle: '#446666' };
		const baseDensity = 0.0013; // in original example: 0.0002,

		const roverBase = Bodies.rectangle(xx, yy, width, height, {
			collisionFilter: { group },
			chamfer: { radius: height * 0.35 },
			density: baseDensity * 1.5,
			render: bodyRender,
			// render: { sprite: { texture: './images/printer-16x16.png', xScale: 9, yScale: 1 } },
		});
		const bodyPartOptions = {
			density: baseDensity / 1000,
			render: bodyRender,
		};
		const torsoHeight = height;
		const torsoY = yy - (torsoHeight / 2);
		const torso = Bodies.trapezoid(xx, torsoY, width / 5, torsoHeight, -0.5, bodyPartOptions);
		// { ...bodyPartOptions, render: { sprite: { texture: './images/printer-16x16.png',
		// xScale: 2, yScale: 2 } } });
		const neckSize = height / 4;
		const neckY = torsoY - (torsoHeight / 2) - (neckSize / 2);
		const neck = Bodies.rectangle(xx, neckY, neckSize * 2, neckSize, bodyPartOptions);
		const headSize = height + (width / 10);
		const headVertices = [
			{ x: -headSize / 4, y: 0 },
			{ x: -headSize / 2, y: -headSize / 3 },
			{ x: 0, y: -headSize / 2 },
			{ x: headSize / 2, y: -headSize / 3 },
			{ x: headSize / 4, y: 0 },
		];
		const head = Bodies.fromVertices(xx, neckY - (headSize / 4), headVertices, bodyPartOptions);

		// Body is a "compound body"
		const body = Body.create({
			parts: [torso, neck, head],
			angularDamping: 0.01,
			collisionFilter: { group },
		});
		// Originally the body was just the base
		// const body = roverBase;

		this.roboBody = body;
		this.roverBase = roverBase;
		this.composite = car;
		this.mainBody = roverBase;
		this.flipDirection = 1;

		this.addBodyJoints();

		// ------ Eyes

		const eyeLeft = Constraint.create({
			bodyA: body,
			pointA: { x: -headSize / 4, y: -(headSize / 2.2) },
			bodyB: body,
			pointB: { x: headSize / 4, y: -(headSize / 2.2) },
			stiffness: 0.1,
			length: 2,
			render: { type: 'line', lineWidth: 0, strokeStyle: '#000000' },
		});

		Composite.addConstraint(car, eyeLeft);
		// Composite.addConstraint(car, eyeRight);

		// ------ Wheels

		const wheelImageScale = (wheelRadius + wheelRadius) / 64;
		const wheelConfig = {
			collisionFilter: { group },
			friction: 0.85,
			// render: { fillStyle: 'rgba(40,40,40,0.8)', lineWidth: 5, strokeStyle: '#eeeeee' },
			render: {
				lineWidth: 5,
				strokeStyle: '#eeeeee',
				sprite: { texture: './images/Wheel-0001.png', xScale: wheelImageScale, yScale: wheelImageScale },
			},
		};
		const wheelA = Bodies.circle(xx + wheelAOffset, yy + wheelYOffset, wheelRadius, wheelConfig);
		const wheelB = Bodies.circle(xx + wheelBOffset, yy + wheelYOffset, wheelRadius, wheelConfig);

		const axelConfig = {
			stiffness: 0.3,
			length: 2,
			render: { anchors: false, type: 'spring', lineWidth: 0, strokeColor: '#000000' },
		};
		const axelA = Constraint.create({
			...axelConfig,
			bodyB: roverBase,
			pointB: { x: wheelAOffset, y: wheelYOffset },
			bodyA: wheelA,
		});
		const axelB = Constraint.create({
			...axelConfig,
			bodyB: roverBase,
			pointB: { x: wheelBOffset, y: wheelYOffset },
			bodyA: wheelB,
		});

		Composite.addBody(car, roverBase);
		Composite.addConstraint(car, axelA);
		Composite.addConstraint(car, axelB);
		Composite.addBody(car, body);
		// Composite.addConstraint(car, bodyPivotJoint);

		Composite.addBody(car, wheelA);
		Composite.addBody(car, wheelB);

		// this.robotBody =
		this.wheelA = wheelA;
		this.wheelB = wheelB;

		// Controls
		this.pedalDown = 0;
		this.driveAmount = 0.35;
		this.sprintAmount = 1;
		this.sprint = 0; // on or off
		// Cooldowns
		this.jumpCooldown = 0;
	}

	static create(...args) {
		return new Car(...args);
	}

	addBodyJoints(
		leftPointA = { x: -10, y: 20 },
		leftPointB = { x: -10 * this.flipDirection, y: 0 },
		rightPointA = { x: 10, y: 20 },
		rightPointB = { x: 10 * this.flipDirection, y: 0 },
	) {
		const bodyStiffness = 0.1;
		// const bodyPivotJoint = Constraint.create({
		// 	bodyA: body,
		// 	pointA: { x: 0, y: 15 },
		// 	bodyB: roverBase,
		// 	stiffness: 1,
		// 	length: 0,
		// });
		const bodyJointsRender = {
			anchors: false,
			strokeStyle: 'rgba(0,0,0,0.1)',
			lineWidth: 0,
			type: 'spring',
		};
		const jointConfig = {
			bodyA: this.roboBody,
			bodyB: this.roverBase,
			stiffness: bodyStiffness,
			length: 0,
			render: bodyJointsRender,
		};
		this.bodyLeftJoint = Constraint.create({
			...jointConfig,
			pointA: getRotatedRelativePosition(this.roboBody, leftPointA),
			pointB: getRotatedRelativePosition(this.roverBase, leftPointB),
		});
		this.bodyRightJoint = Constraint.create({
			...jointConfig,
			pointA: getRotatedRelativePosition(this.roboBody, rightPointA),
			pointB: getRotatedRelativePosition(this.roverBase, rightPointB),
		});
		Composite.addConstraint(this.composite, this.bodyLeftJoint);
		Composite.addConstraint(this.composite, this.bodyRightJoint);
	}

	removeBodyJoints() {
		Composite.remove(this.composite, this.bodyLeftJoint);
		Composite.remove(this.composite, this.bodyRightJoint);
	}

	flip() {
		// const leftPointA = Constraint.pointAWorld(this.bodyLeftJoint
		this.removeBodyJoints();
		this.flipDirection *= -1;
		this.addBodyJoints();
		return true;
	}

	getAngularVelocity() {
		return (
			this.driveAmount + (this.sprint ? this.sprintAmount : 0)
		) * this.pedalDown;
	}

	update() {
		if (this.pedalDown === 1 || this.pedalDown === -1) {
			// const angVel =  (this.driveAmount * this.pedalDown)  this.sprint ? 0.5 : 0;
			const angVel = this.getAngularVelocity();
			Body.setAngularVelocity(this.wheelA, angVel);
			Body.setAngularVelocity(this.wheelB, angVel);
		}
		if (this.jumpCooldown > 0) this.jumpCooldown -= 0.18;
	}

	jump() {
		if (this.jumpCooldown > 0) {
			// console.log('Cannot jump. Waiting to cooldown', this.jumpCooldown);
			return false;
		}
		const vel = Body.getVelocity(this.mainBody);
		const newVelX = vel.x + (10 * this.pedalDown);
		Body.setVelocity(this.mainBody, Vector.create(newVelX, vel.y - 22));
		this.jumpCooldown = 100;
		return true;
	}
}

const createCar = (...args) => (new Car(...args));

export default Car;
export { createCar, Car };
