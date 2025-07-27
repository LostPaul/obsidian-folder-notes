import type { App, TFolder } from 'obsidian';
import { Modal } from 'obsidian';
import type FolderNotesPlugin from '../main';
export default class NewFolderNameModal extends Modal {
	plugin: FolderNotesPlugin;
	app: App;
	folder: TFolder;
	constructor(app: App, plugin: FolderNotesPlugin, folder: TFolder) {
		super(app);
		this.plugin = plugin;
		this.app = app;
		this.folder = folder;
	}
	onOpen() {
		const { contentEl } = this;

		contentEl.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				this.saveFolderName();
				this.close();
			}
		});

		this.modalEl.classList.add('mod-file-rename');
		const modalTitle = this.modalEl.querySelector('div.modal-title');
		if (modalTitle) {
			modalTitle.textContent = 'Folder title';
		}

		const textarea = contentEl.createEl('textarea', {
			text: this.folder.name.replace(this.plugin.settings.folderNoteType, ''),
			attr: {
				placeholder: 'Enter the name of the folder',
				rows: '1',
				spellcheck: 'false',
				class: 'rename-textarea',
			},
		});

		textarea.addEventListener('focus', function() {
			this.select();
		});

		textarea.focus();

		const buttonContainer = this.modalEl.createDiv({ cls: 'modal-button-container' });
		const saveButton = buttonContainer.createEl('button', { text: 'Save', cls: 'mod-cta' });
		saveButton.addEventListener('click', async () => {
			this.saveFolderName();
			this.close();
		});

		const cancelButton = buttonContainer.createEl('button', { text: 'Cancel', cls: 'mod-cancel' });
		cancelButton.addEventListener('click', () => {
			this.close();
		});
	}
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	saveFolderName() {
		const textarea = this.contentEl.querySelector('textarea');
		if (textarea) {
			const newName = textarea.value.trim();
			if (newName.trim() !== '') {
				if (!this.app.vault.getAbstractFileByPath(this.folder.path.slice(0, this.folder.path.lastIndexOf('/') + 1) + newName.trim())) {
					this.plugin.app.fileManager.renameFile(this.folder, this.folder.path.slice(0, this.folder.path.lastIndexOf('/') + 1) + newName.trim());
				}
			}
		}
	}
}
