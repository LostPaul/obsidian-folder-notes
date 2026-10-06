/* eslint-disable no-magic-numbers */

export function generateId(): string {
	const cryptoApi = typeof crypto === 'undefined' ? undefined : crypto;
	if (typeof cryptoApi?.randomUUID === 'function') {
		try {
			return cryptoApi.randomUUID();
		} catch {
			// Fall through for WebViews that expose randomUUID but cannot use it.
		}
	}

	const bytes = new Uint8Array(16);
	if (typeof cryptoApi?.getRandomValues === 'function') {
		cryptoApi.getRandomValues(bytes);
	} else {
		for (let index = 0; index < bytes.length; index++) {
			bytes[index] = Math.floor(Math.random() * 256);
		}
	}

	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;

	const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0'));
	return [
		hex.slice(0, 4).join(''),
		hex.slice(4, 6).join(''),
		hex.slice(6, 8).join(''),
		hex.slice(8, 10).join(''),
		hex.slice(10, 16).join(''),
	].join('-');
}
