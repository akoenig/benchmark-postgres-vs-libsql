export function duration(duration: number) {
	return duration >= 1000
		? `${(duration / 1000).toFixed(0)}ms`
		: `${duration.toFixed(0)}us`;
}
