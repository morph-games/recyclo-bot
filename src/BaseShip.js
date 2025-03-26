import Matter from 'matter-js';

const {
	Body,
	Bodies,
	Composite,
	Constraint,
} = Matter;

const HQ_LABEL = 'HQ';

export default class BaseShip {
	constructor(x) {
		const group = Body.nextGroup(true);
		const floorFriction = 0.8;
		const opt = {
			isStatic: true,
			render: { fillStyle: 'rgba(135, 160, 140, 1)' },
			strokeStyle: '#222222',
			lineWidth: 3,
			label: HQ_LABEL,
		};
		const y = 300;
		const noCollideOptions = { ...opt, collisionFilter: { mask: 0 } };
		this.composite = Composite.create({ label: 'Base Ship Composite' });
		const bottom = Bodies.trapezoid(x, y - 90, 250, 200, -0.15, opt);
		const rocket = Bodies.trapezoid(x, y + 90, 140, 140, 0.5, opt);
		const floor = Bodies.rectangle(x, y - 200, 300, 20, {
			...opt,
			friction: floorFriction,
			collisionFilter: { group },
		});
		const mid = Bodies.rectangle(x, y - 300, 280, 180, {
			...noCollideOptions,
			render: {
				fillStyle: 'rgba(50, 60, 55, 1)',
				sprite: {
					texture: './images/Ship-BG-1.png',
					xScale: 1,
					yScale: 1,
				},
				opacity: 0.9,
			},
		});
		const top = Bodies.fromVertices(x, y - 500, [
			{ x: -150, y: 300 },
			{ x: -150, y: 200 },
			{ x: 0, y: 0 },
			{ x: 150, y: 200 },
			{ x: 150, y: 300 },
		], { ...opt });

		const doorOptions = {
			...opt,
			isStatic: false,
			collisionFilter: { group },
			chamfer: { radius: 10 },
			friction: floorFriction,
			label: 'HQ Door',
		};
		const doorLeft = Bodies.rectangle(x - 100, y - 200, 20, 340, structuredClone(doorOptions));
		const doorRight = Bodies.rectangle(x + 100, y - 200, 20, 340, structuredClone(doorOptions));
		const hingeOptions = {
			bodyA: doorLeft,
			pointA: { x: 0, y: 160 },
			bodyB: floor,
			pointB: { x: -150, y: 0 },
			length: 0,
		};
		const hingeLeft = Constraint.create(hingeOptions);
		const hingeRight = Constraint.create({
			...structuredClone(hingeOptions),
			bodyA: doorRight,
			bodyB: floor,
			pointB: { x: 150, y: 0 },
		});
		Composite.addConstraint(this.composite, hingeLeft);
		Composite.addConstraint(this.composite, hingeRight);

		Composite.addBody(this.composite, mid);
		Composite.addBody(this.composite, bottom);
		Composite.addBody(this.composite, rocket);
		Composite.addBody(this.composite, top);
		Composite.addBody(this.composite, floor);
		Composite.addBody(this.composite, doorLeft);
		Composite.addBody(this.composite, doorRight);
	}
}

export { BaseShip, HQ_LABEL };
