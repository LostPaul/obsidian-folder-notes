import { App, Modal, Setting, TFile, Platform } from 'obsidian';
import FolderNotesPlugin from '../main';
import { getFolder } from 'src/functions/folderNoteFunctions';
import { removeCSSClassFromEL } from 'src/functions/styleFunctions';
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
		setting.infoEl.createEl('p', { text: 'It will be moved to your system trash.' });

		setting.infoEl.parentElement?.classList.add('fn-delete-confirmation-modal');

		// Create a container for the buttons and the checkbox
		const buttonContainer = setting.infoEl.createEl('div', { cls: 'fn-delete-confirmation-modal-buttons' });
		if (Platform.isMobileApp) {
			const confirmButton = buttonContainer.createEl('button', { text: 'Delete and don\'t ask again' });
			confirmButton.classList.add('mod-warning', 'fn-confirmation-modal-button');
			confirmButton.addEventListener('click', async () => {
				this.plugin.settings.showDeleteConfirmation = false;
				this.plugin.saveSettings();
				this.close();
				const folder = getFolder(this.plugin, this.file);
				if (!folder) return;
				removeCSSClassFromEL(folder?.path, 'has-folder-note');
				this.app.vault.delete(this.file);
			});
		} else {
			const checkbox = buttonContainer.createEl('input', { type: 'checkbox' });
			checkbox.addEventListener('change', (e) => {
				const target = e.target as HTMLInputElement;
				if (target.checked) {
					this.plugin.settings.showDeleteConfirmation = false;
				} else {
					this.plugin.settings.showDeleteConfirmation = true;
				}
				this.plugin.saveSettings();
			});
			const checkBoxText = buttonContainer.createEl('span', { text: 'Don\'t ask again' });
			checkBoxText.addEventListener('click', () => {
				checkbox.click();
			});
		}
		const button = buttonContainer.createEl('button', { text: 'Delete' });
		button.classList.add('mod-warning', 'fn-confirmation-modal-button');
		button.addEventListener('click', async () => {
			this.close();
			const folder = getFolder(this.plugin, this.file);
			if (!folder) return;
			removeCSSClassFromEL(folder.path, 'has-folder-note');
			this.app.vault.delete(this.file);
		});
		button.focus();
		const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', async () => {
			this.close();
		});

	}
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
