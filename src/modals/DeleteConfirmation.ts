import { Modal, Platform, type App, type TFile } from 'obsidian';
import type FolderNotesPlugin from '../main';
import { deleteFolderNote } from 'src/functions/folderNoteFunctions';
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
	onOpen(): void {
		const { contentEl, plugin } = this;
		const modalTitle = contentEl.createDiv({ cls: 'fn-modal-title' });
		const modalContent = contentEl.createDiv({ cls: 'fn-modal-content' });
		modalTitle.createEl('h2', { text: 'Delete folder note' });
		// eslint-disable-next-line max-len
		modalContent.createEl('p', { text: `Are you sure you want to delete the folder note '${this.file.name}' ?` });
		switch (plugin.settings.deleteFilesAction) {
			case 'trash':
				modalContent.createEl('p', { text: 'It will be moved to your system trash.' });
				break;
			case 'obsidianTrash':
				// eslint-disable-next-line max-len
				modalContent.createEl('p', { text: 'It will be moved to your Obsidian trash, which is located in the ".trash" hidden folder in your vault.' });
				break;
			case 'delete':
				modalContent
					.createEl('p', { text: 'It will be permanently deleted.' })
					.setCssStyles({ color: 'red' });
				break;
		}

		const buttonContainer = contentEl.createEl('div', { cls: 'modal-button-container' });

		if (!Platform.isMobile) {
			const checkbox = buttonContainer.createEl('label', { cls: 'mod-checkbox' });
			checkbox.tabIndex = -1;
			const input = checkbox.createEl('input', { type: 'checkbox' });
			checkbox.appendText('Don\'t ask again');
			input.addEventListener('change', (e) => {
				const target = e.target as HTMLInputElement;
				if (target.checked) {
					plugin.settings.showDeleteConfirmation = false;
				} else {
					plugin.settings.showDeleteConfirmation = true;
				}
				plugin.saveSettings();
			});
		} else {
			const confirmButton = buttonContainer.createEl('button', {
				text: 'Delete and don\'t ask again',
				cls: 'mod-destructive',
			});
			confirmButton.addEventListener('click', async () => {
				plugin.settings.showDeleteConfirmation = false;
				plugin.saveSettings();
				this.close();
				deleteFolderNote(plugin, this.file, false);
			});
		}

		const deleteButton = buttonContainer.createEl('button', {
			text: 'Delete',
			cls: 'mod-warning',
		});
		deleteButton.addEventListener('click', async () => {
			this.close();
			deleteFolderNote(plugin, this.file, false);
		});
		deleteButton.focus();

		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel',
			cls: 'mod-cancel',
		});
		cancelButton.addEventListener('click', async () => {
			this.close();
		});
	}
	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
