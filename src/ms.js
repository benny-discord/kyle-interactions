module.exports = function (str) {
	if (typeof str == 'number') return format(str);
	str = String(str);
	if (str.length > 50) return 0;

	const matches = str.match(/(-?(?:\d+)?.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|months?|mon|years?|yrs?|y)/gi);
	if (!matches) return 0;

	return matches.map(m => parse1(m.trim())).reduce((p, v) => p + v, 0);
};

function parse1(str) {
	const match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|months?|mon|years?|yrs?|y)?$/i.exec(str.replace(/([^a-z0-9.])/gi, ''));
	if (!match) return 0;
	const n = parseFloat(match[1]);
	const type = (match[2] || 's').toLowerCase();
	if (['years', 'year', 'yrs', 'yr', 'y'].includes(type)) return n * 31557600000;
	if (['months', 'month', 'mon'].includes(type)) return n * 2419200000;
	if (['weeks', 'week', 'w'].includes(type)) return n * 604800000;
	if (['days', 'day', 'd'].includes(type)) return n * 86400000;
	if (['hours', 'hour', 'hrs', 'hr', 'h'].includes(type)) return n * 3600000;
	if (['minutes', 'minute', 'mins', 'min', 'm'].includes(type)) return n * 60000;
	if (['seconds', 'second', 'secs', 'sec', 's'].includes(type)) return n * 1000;
	return n;
}

function format(ms) {
	ms = Math.abs(ms);
	if (!ms || !Number.isInteger(ms) || ms < 1) throw new Error('Valid Integer must be provided');

	const roundTowardsZero = ms > 0 ? Math.floor : Math.ceil;
	if (ms < 1000) ms = 1000;
	const years = roundTowardsZero(ms / 31557600000),
		days = roundTowardsZero(ms / 86400000) % 365,
		hours = roundTowardsZero(ms / 3600000) % 24,
		minutes = roundTowardsZero(ms / 60000) % 60,
		seconds = roundTowardsZero(ms / 1000) % 60;

	return `${years ? years + 'y ' : ''}${days ? days + 'd ' : ''}${hours ? hours + 'h ' : ''}${minutes ? minutes + 'min ' : ''}${seconds ? seconds + 's' : ''}`.trim();
}