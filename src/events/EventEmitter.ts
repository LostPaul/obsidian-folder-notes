export class CustomEventEmitter {
	private events: { [key: string]: Array<(data?: unknown) => void> } = {};

	on(event: string, listener: (data?: unknown) => void): void {
		if (!this.events[event]) {
			this.events[event] = [];
		}
		this.events[event].push(listener);
	}

	off(event: string, listener: (data?: unknown) => void): void {
		if (!this.events[event]) return;

		this.events[event] = this.events[event].filter((l) => l !== listener);
	}

	emit(event: string, data?: unknown): void {
		if (!this.events[event]) return;

		this.events[event].forEach((listener) => listener(data));
	}
}
