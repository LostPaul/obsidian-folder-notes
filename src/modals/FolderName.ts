import { Modal, Setting, type App, type TFolder } from 'obsidian';
import type FolderNotesPlugin from '../main';
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

	onOpen(): void {
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
							const parentPath = this.folder.path.slice(
								0,
								this.folder.path.lastIndexOf('/') + 1,
							);
							const newFolderPath = parentPath + value.trim();
							if (
								!this.app.vault.getAbstractFileByPath(newFolderPath)
							) {
								this.plugin.app.fileManager.renameFile(
									this.folder,
									newFolderPath,
								);
							}
						}
					}),
			);
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
