import { Modal, App, ButtonComponent, Setting } from 'obsidian';
import FolderNotesPlugin from 'src/main';

export default class BackupWarningModal extends Modal {
	plugin: FolderNotesPlugin;
	title: string;
	desc: string;
	callback: (...args: any[]) => void;
	args: any[];

	constructor(plugin: FolderNotesPlugin, title: string, description: string, callback: (...args: any[]) => void, args: any[] = []) {
		super(plugin.app);
		this.plugin = plugin;
		this.title = title;
		this.callback = callback;
		this.args = args;
		this.desc = description;
	}

	onOpen() {
		this.modalEl.addClass('fn-backup-warning-modal');
		const { contentEl } = this;

		contentEl.createEl('h2', { text: this.title });

		contentEl.createEl('p', { text: this.desc });

		this.insertCustomHtml();

		contentEl.createEl('p', { text: 'Make sure to backup your vault before using this feature.' }).style.color = '#fb464c';

		const buttonContainer = contentEl.createDiv({ cls: 'fn-modal-button-container' });
		const confirmButton = new ButtonComponent(buttonContainer);
		confirmButton.setButtonText('Confirm')
			.setCta()
			.onClick(() => {
				this.callback(...this.args);
				this.close();
			});

		const cancelButton = new ButtonComponent(buttonContainer);
		cancelButton.setButtonText('Cancel')
			.onClick(() => {
				this.close();
			});
	}

	insertCustomHtml(): void {

	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
