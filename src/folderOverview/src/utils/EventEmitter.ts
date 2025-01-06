export class CustomEventEmitter {
    private events: { [key: string]: Array<(data?: any) => void> } = {};

    on(event: string, listener: (data?: any) => void) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    off(event: string, listener: (data?: any) => void) {
        if (!this.events[event]) return;

        this.events[event] = this.events[event].filter((l) => l !== listener);
    }

    emit(event: string, data?: any) {
        if (!this.events[event]) return;

        this.events[event].forEach((listener) => listener(data));
    }
}