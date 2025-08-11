import { Modal, ButtonComponent } from 'obsidian';
import type FolderNotesPlugin from 'src/main';

export default class BackupWarningModal extends Modal {
	plugin: FolderNotesPlugin;
	title: string;
	desc: string;
	callback: (...args: unknown[]) => void;
	args: unknown[];

	constructor(
		plugin: FolderNotesPlugin,
		title: string,
		description: string,
		callback: (...args: unknown[]) => void,
		args: unknown[] = [],
	) {
		super(plugin.app);
		this.plugin = plugin;
		this.title = title;
		this.callback = callback;
		this.args = args;
		this.desc = description;
	}

	onOpen(): void {
		this.modalEl.addClass('fn-backup-warning-modal');
		const { contentEl } = this;

		contentEl.createEl('h2', { text: this.title });

		contentEl.createEl('p', { text: this.desc });

		// eslint-disable-next-line max-len
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

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
