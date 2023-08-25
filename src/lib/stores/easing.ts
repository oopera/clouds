const x1 = 0.215;
const y1 = 0.61;
const x2 = 0.355;
const y2 = 1;

// Cubic Bezier easing function
export function cubicBezier(t: number): number {
	function A(a1: number, a2: number) {
		return 1 - 3 * a2 + 3 * a1;
	}
	function B(a1: number, a2: number) {
		return 3 * a2 - 6 * a1;
	}
	function C(a1: number) {
		return 3 * a1;
	}

	// Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
	function calcBezier(aT: number, a1: number, a2: number): number {
		return ((A(a1, a2) * aT + B(a1, a2)) * aT + C(a1)) * aT;
	}

	// Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
	function getSlope(aT: number, a1: number, a2: number): number {
		return 3 * A(a1, a2) * aT * aT + 2 * B(a1, a2) * aT + C(a1);
	}

	function getTForX(aX: number): number {
		let aGuessT = aX;
		for (let i = 0; i < 4; ++i) {
			const currentSlope = getSlope(aGuessT, x1, x2);
			if (currentSlope === 0) return aGuessT;
			const currentX = calcBezier(aGuessT, x1, x2) - aX;
			aGuessT -= currentX / currentSlope;
		}
		return aGuessT;
	}

	return calcBezier(getTForX(t), y1, y2);
}
