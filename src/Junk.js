import Matter from 'matter-js';

const {
	Body,
	Bodies,
	Composite,
	// Constraint,
} = Matter;

const JUNK_LABEL = 'Junk';
const JUMP_COMPOSITE_LABEL = 'Junk Composite';
const MAX_JUNK_SIZE = 130;

const randInt = (n) => Math.ceil(Math.random() * n);
const BASE_DENSITY = 0.001;

export default class Junk {
	constructor(xx, yy) {
		const group = Body.nextGroup(true);
		const junk = Composite.create({ label: JUMP_COMPOSITE_LABEL });
		const width = 20 + randInt(MAX_JUNK_SIZE - 20);
		const height = 20 + randInt(MAX_JUNK_SIZE - 20);
		const friction = 0.5;
		const options = {
			collisionFilter: { group },
			// isStatic: true,
			// chamfer: { radius: height * 0.5 },
			// density: 0.0002,
			friction,
			angle: Math.random() * Math.PI * 2,
			render: {
				fillStyle: `rgb(${100 + randInt(60)}, ${100 + randInt(50)}, ${100 + randInt(50)})`,
				opacity: 1,
				strokeStyle: '#333',
				lineWidth: 2,
			},
			label: JUNK_LABEL,
		};
		const body = Junk.makeRandomBody(xx, yy, width, height, options);
		const parts = [body];

		// Pipe on some junk
		if (Math.random() < 0.3) {
			const pipeOptions = { ...options, density: BASE_DENSITY / 10 };
			if (Math.random() < 0.5) {
				pipeOptions.angle = Math.random() * Math.PI * 2;
			}
			const pipe = Bodies.rectangle(xx + width / 3, yy, width, width / 4, pipeOptions);
			parts.push(pipe);
		}

		// Inner Shape Part
		{
			const minDim = (width + height) / 4.5;
			const innerOptions = {
				...options,
				density: BASE_DENSITY / 1000,
			};
			const x = xx + (Math.random() * minDim) - (Math.random() * minDim);
			const y = yy + (Math.random() * minDim) - (Math.random() * minDim);
			const innerPart = Junk.makeRandomBody(x, y, minDim, minDim, innerOptions);
			parts.push(innerPart);
		}

		const compoundBody = Body.create({
			parts,
			angularDamping: 0.01,
			collisionFilter: { group },
			label: 'Junk Compound',
		});

		Composite.addBody(junk, compoundBody);
		// Reference to parent needed for collisions and removal of composite
		compoundBody.parentComposite = junk;
		parts.forEach((p) => {
			p.parentComposite = junk; // eslint-disable-line no-param-reassign
			p.compoundBody = compoundBody; // eslint-disable-line no-param-reassign
		});
		this.composite = junk;
	}

	static makeRandomBody(x, y, width, height, options) {
		const roll = Math.random();
		if (roll < 0.3) {
			// Sprites don't work correct -- they don't rotate
			// const sX = width / 64;
			// const sY = height / 64;
			// options.render.sprite = { texture: './images/Junk-0001.png',
			// xScale: sX, yScale: sY };
			return Bodies.rectangle(x, y, width, height, options);
		}
		const r = (width + height) / 4;
		if (roll < 0.6) {
			return Bodies.polygon(x, y, 3, r, options, 20);
		}
		if (roll < 0.7) {
			return Bodies.circle(x, y, r, options, 20);
		}
		const sides = 2 + randInt(9);
		return Bodies.polygon(x, y, sides, r, options);
	}
}

const createJunk = (...args) => (new Junk(...args));

export { Junk, createJunk, JUNK_LABEL, MAX_JUNK_SIZE };
