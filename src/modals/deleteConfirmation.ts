import { App, Modal, Setting, TFile } from 'obsidian';
import FolderNotesPlugin from '../main';
export default class DeleteConfirmationModal extends Modal {
	plugin: FolderNotesPlugin;
	app: App;
	file: TFile;
	constructor(app: App, plugin: FolderNotesPlugin, file: TFile) {
		super(app);
		this.plugin = plugin;
		this.app = app;
        this.file = file;
	}
	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Delete folder note' });
		const setting = new Setting(contentEl);
        setting.infoEl.createEl('p', { text: `Are you sure you want to delete the folder note "${this.file.name}" ?` });
        setting.infoEl.createEl('p', { text: 'lt will be moved to your system trash.' });

		setting.infoEl.parentElement?.classList.add('fn-delete-confirmation-modal');
		const button = setting.infoEl.createEl('button', { text: 'Delete' });
		button.classList.add('mod-warning', 'fn-confirmation-modal-button');
		button.addEventListener('click', async () => {
			this.close();
            this.app.vault.delete(this.file);
		});
		button.focus();
		const cancelButton = setting.infoEl.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', async () => {
			this.close();
		});
	}
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
