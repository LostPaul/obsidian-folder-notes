import { App, Modal, Setting, TFolder } from 'obsidian';
import FolderNotesPlugin from '../main';
export default class ConfirmationModal extends Modal {
	plugin: FolderNotesPlugin;
	app: App;
	folder: TFolder;
	constructor(app: App, plugin: FolderNotesPlugin) {
		super(app);
		this.plugin = plugin;
		this.app = app;
	}
	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Create folder note for every folder' });
		const setting = new Setting(contentEl);
		setting.infoEl.createEl('p', { text: 'Make sure to backup your vault before using this feature.' }).style.color = '#fb464c';
		setting.infoEl.createEl('p', { text: 'This feature will create a folder note for every folder in your vault.' });
		setting.infoEl.createEl('p', { text: 'Every folder that already has a folder note will be ignored.' });
		setting.infoEl.createEl('p', { text: 'Every excluded folder will be ignored.' });
		setting.infoEl.parentElement?.classList.add('fn-confirmation-modal');
		const button = setting.infoEl.createEl('button', { text: 'Create' });
		button.classList.add('mod-warning', 'fn-confirmation-modal-button');
		button.addEventListener('click', async () => {
			this.close();
			this.app.vault.getAllLoadedFiles().forEach(async (folder) => {
				if (folder instanceof TFolder) {
					const excludedFolder = this.plugin.settings.excludeFolders.find(
						(excludedFolder) => (excludedFolder.path === folder.path) ||
                            (excludedFolder.path === folder.path?.slice(0, folder?.path.lastIndexOf('/') >= 0 ? folder.path?.lastIndexOf('/') : folder.path.length)
                                && excludedFolder.subFolders));
					if (excludedFolder) return;
					if (this.app.vault.getAbstractFileByPath(folder.path + '/' + folder.name + '.md')) return;
					await this.plugin.createFolderNote(folder.path + '/' + folder.name + '.md', true);
				}
			});
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
