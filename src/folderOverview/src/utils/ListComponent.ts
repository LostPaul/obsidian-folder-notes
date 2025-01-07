import { CustomEventEmitter } from './EventEmitter';

export class ListComponent {
	emitter: CustomEventEmitter;
	containerEl: HTMLElement;
	controlEl: HTMLElement;
	emptyStateEl: HTMLElement;
	listEl: HTMLElement;
	values: string[];
	defaultValues: string[];
	constructor(containerEl: HTMLElement, values: string[] = [], defaultValues: string[] = []) {
		this.emitter = new CustomEventEmitter();
		this.containerEl = containerEl;
		this.controlEl = containerEl.querySelector('.setting-item-control') || containerEl;
		this.listEl = this.controlEl.createDiv('setting-command-hotkeys');
		this.addResetButton();
		this.setValues(values);
		this.defaultValues = defaultValues;
	}

	on(event: string, listener: (data?: any) => void) {
		this.emitter.on(event, listener);
	}

	off(event: string, listener: (data?: any) => void) {
		this.emitter.off(event, listener);
	}

	private emit(event: string, data?: any) {
		this.emitter.emit(event, data);
	}

	setValues(values: string[]) {
		this.removeElements();
		this.values = values;
		if (values.length !== 0) {
			values.forEach((value) => {
				this.addElement(value);
			});
		}
		this.emit('update', this.values);
	}

	removeElements() {
		this.listEl.empty();
	}

	addElement(value: string) {
		this.listEl.createSpan('setting-hotkey', (span) => {
			if (value.toLocaleLowerCase() === 'md') {
				span.innerText = 'markdown';
			} else {
				span.innerText = value;
			}
			span.setAttribute('extension', value);
			const removeSpan = span.createEl('span', { cls: 'ofn-list-item-remove setting-hotkey-icon' });
			const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
			const svgElement = removeSpan.createEl('span', { cls: 'ofn-list-item-remove-icon' });
			svgElement.innerHTML = svg;
			removeSpan.onClickEvent((e) => {
				this.removeValue(value);
				span.remove();
			});
		});
	}

	async addValue(value: string) {
		this.values.push(value);
		this.addElement(value);
		this.emit('add', value);
		this.emit('update', this.values);
	}

	addResetButton() {
		const resetButton = this.controlEl.createEl('span', { cls: 'clickable-icon setting-restore-hotkey-button' });
		const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-rotate-ccw"><path d="M3 2v6h6"></path><path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path></svg>';
		resetButton.innerHTML = svg;
		resetButton.onClickEvent((e) => {
				this.setValues(this.defaultValues);
		});
		return this;
	}

	removeValue(value: string) {
		this.values = this.values.filter((v) => v !== value);
		this.listEl.find(`[extension='${value}']`).remove();
		this.emit('remove', value);
		this.emit('update', this.values);
	}
}