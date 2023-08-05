import { App, ButtonComponent, Modal, Setting, TFolder } from 'obsidian';
import FolderNotesPlugin from '../main';
import { createFolderNote } from 'src/functions/folderNoteFunctions';
import { getTemplatePlugins } from 'src/template';
import { getExcludedFolder } from 'src/excludedFolder';
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
		this.modalEl.addClass('fn-confirmation-modal');
		let templateFolderPath: string;
		const { templateFolder, templaterPlugin } = getTemplatePlugins(this.plugin.app);
		if ((!templateFolder || templateFolder?.trim() === '') && !templaterPlugin) {
			templateFolderPath = '';
		}
		if (templaterPlugin) {
			templateFolderPath = templaterPlugin.plugin?.settings?.templates_folder as string;
		} else {
			templateFolderPath = templateFolder;
		}

		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Create folder note for every folder' });
		const setting = new Setting(contentEl);
		setting.infoEl.createEl('p', { text: 'Make sure to backup your vault before using this feature.' }).style.color = '#fb464c';
		setting.infoEl.createEl('p', { text: 'This feature will create a folder note for every folder in your vault.' });
		setting.infoEl.createEl('p', { text: 'Every folder that already has a folder note will be ignored.' });
		setting.infoEl.createEl('p', { text: 'Every excluded folder will be ignored.' });
		new Setting(contentEl)
			.addButton((cb: ButtonComponent) => {
				cb.setButtonText('Create');
				cb.setCta();
				cb.buttonEl.focus();
				cb.onClick(async () => {
					this.close();
					const folders = this.app.vault.getAllLoadedFiles().filter((file) => file.parent instanceof TFolder);
					for (const folder of folders) {
						if (folder instanceof TFolder) {
							const excludedFolder = getExcludedFolder(this.plugin, folder.path);
							if (excludedFolder) continue;
							if (folder.path === templateFolderPath) continue;
							const path = folder.path + '/' + this.plugin.settings.folderNoteName.replace('{{folder_name}}', folder.name) + '.md';
							if (this.app.vault.getAbstractFileByPath(path)) continue;
							await createFolderNote(this.plugin, folder.path, true);
						}
					}
				});
			})
			.addButton((cb: ButtonComponent) => {
				cb.setButtonText('Cancel');
				cb.onClick(async () => {
					this.close();
				});
			});
	}
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
