import { Setting } from 'obsidian';
import { FolderOverviewSettings } from '../folderOverview/ModalSettings';
import { includeTypes } from 'src/folderOverview/FolderOverview';
import { updateYaml } from 'src/folderOverview/FolderOverview';
export default class ListComponent {
	containerEl: HTMLElement;
	controlEl: HTMLElement;
	emptyStateEl: HTMLElement;
	listEl: HTMLElement;
	values: string[];
	modal: FolderOverviewSettings;
	constructor(containerEl: HTMLElement) {
		this.containerEl = containerEl;
		this.controlEl = containerEl.querySelector('.setting-item-control') || containerEl;
		this.listEl = this.controlEl.createDiv('setting-command-hotkeys');
	}
	addModal(modal: FolderOverviewSettings) {
		this.modal = modal;
		this.values = modal.yaml.includeTypes || [];
		return this;
	}
	setValues(values: string[]) {
		this.listEl.empty();
		this.values = values;
		this.modal.yaml.includeTypes = values as includeTypes[];
		if (values.length !== 0) {
			values.forEach((value) => {
				this.addElement(value);
			});
		}
		if (this.modal.defaultSettings) {
			this.modal.plugin.saveSettings();
			return this;
		}
		updateYaml(this.modal.plugin, this.modal.ctx, this.modal.el, this.modal.yaml);
		return this;
	}
	addElement(value: string) {
		this.listEl.createSpan('setting-hotkey', (span) => {
			span.innerText = value;
			const removeSpan = span.createEl('span', { cls: 'ofn-list-item-remove setting-hotkey-icon' });
			// add svg icon
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
		this.modal.yaml.includeTypes = this.values as includeTypes[];
		return this;
	}
	addResetButton() {
		const resetButton = this.controlEl.createEl('span', { cls: 'clickable-icon setting-restore-hotkey-button' });
		const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-rotate-ccw"><path d="M3 2v6h6"></path><path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path></svg>';
		resetButton.innerHTML = svg;
		resetButton.onClickEvent((e) => {
			this.modal.plugin.loadSettings();
			this.setValues(this.modal.plugin.settings.defaultOverview.includeTypes || []);
			this.modal.display();
		});
		return this;
	}
	removeValue(value: string) {
		this.values = this.values.filter((v) => v !== value);
		this.setValues(this.values);
		this.modal.display();
	}
}

function createList(this: Setting, cb: (list: ListComponent) => ListComponent) {
	const list = new ListComponent(this.settingEl);
	cb(list);
	return list;
}

// ListComponent.prototype.setValues = setValues;
(Setting as any).prototype.createList = createList;
