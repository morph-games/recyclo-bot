import zzfx from './libs/ZzFXMicro.min.esm.js';

let soundOn = true;

function playSound(p) {
	if (!soundOn) return;
	if (p instanceof Array) {
		zzfx(...p);
		return;
	}
	const SOUNDS = {
		/* eslint-disable */
		walk: [.2,,146.8324,,.01,.001,,0,5,,,,,1.9,,.5,,.91,.05,,-2446],
		// Cancel/blocked - [1.2,,31,.03,.1,.03,2,3.2,,6,,,.08,2,,.1,.14,.84,.08,.28,-2439]
		// blocked - [1.3,,139,.03,.01,.22,4,3.8,,,,,,.5,,.1,.02,.69,.04,.48,-2443]
		// Robospeak - [2.3,,195,.03,.09,.26,2,3.5,,,,,,.3,,.1,.11,.43,.05]
		gameGo: [0.6,,343,.09,.26,.35,,.8,,-24,-174,.09,.06,,,.1,,.69,.14],
		zip: [1,,376,,.01,.02,2,4.6,,-3,4,.21,,.1,8.9,,.32,.6,.03,,101],
		dud: [1,,376,.03,.05,.05,3,.7,10,17,,,.03,.4,.6,.2,.1,.96,.1,.06,-1315],
		jets: [.2,,271,.02,.02,.06,4,.2,,-18,,,,,,.1,,.53,.07],
		thrust: [.04,,110,.07,.08,.43,4,1.7,,,,,,.8,,1.7,.16,0,.25,,1953],
		// beat: [1.08,,99,.05,.21,.21,,.97,-0.1,5,,,.04,-0.1,1,.1,,.42,.25,.32],
		zup: [1.7,,674,.04,.26,.07,,2.1,-6,,-149,.05,.06,,,.1,.17,.56,.23,,-517],
		jump: [4.8,,58,.04,.01,.07,1,.6,,-46,,,,,,,,.99,.09,,418],
		success: [.8,,403,.05,.15,.31,,2.5,-1,,259,.07,.04,,,,,.9,.17,.2,-1174],
		fireTowLine: [1.5,,128,,.08,.09,1,3.3,,4,,.01,.07,1.7,.4,.1,.02,.57,.07,.21],
		breakTowLine: [.3,,53,.05,.02,.66,,.2,,,,,,1.4,,.1,,.44,.13],
		attachTowLine: [2.4,,128,,.08,.09,1,3.4,,4,,,.07,1.7,1.4,.1,.02,.57,.07,.2],
		drive: [.3,,101,.02,.02,.45,4,3.6,2,16,348,.08,.08,.1,,.1,,.55,.03,,203],
		bump: [.2,.1,225,.01,.07,.07,4,3.7,-4,-6,,,.01,1.4,,.4,,.54,.07,.5,1434],
		collect: [,,563,.01,.18,.32,1,3.1,-1,-198,-184,.07,.08,,,.2,,.75,.14,.28,895],
		/* eslint-enable */
	};
	if (SOUNDS[p]) zzfx(...SOUNDS[p]);
}

function switchSound(on) {
	soundOn = (on !== undefined) ? Boolean(on) : !soundOn;
}

export { playSound, switchSound };
