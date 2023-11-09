import { App, Modal, Setting, TFolder } from 'obsidian';
import FolderNotesPlugin from '../main';
export default class FolderNameModal extends Modal {
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
		// close when user presses enter
		contentEl.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				this.close();
			}
		});
		contentEl.createEl('h2', { text: 'Folder name' });
		new Setting(contentEl)
			.setName('Enter the name of the folder')
			.addText((text) =>
				text
					.setValue(this.folder.name.replace(this.plugin.settings.folderNoteType, ''))
					.onChange(async (value) => {
						if (value.trim() !== '') {
							if (!this.app.vault.getAbstractFileByPath(this.folder.path.slice(0, this.folder.path.lastIndexOf('/') + 1) + value.trim())) {
								this.plugin.app.fileManager.renameFile(this.folder, this.folder.path.slice(0, this.folder.path.lastIndexOf('/') + 1) + value.trim());
							}
						}
					})
			);
	}
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
