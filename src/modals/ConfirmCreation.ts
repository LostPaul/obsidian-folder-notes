import { App, ButtonComponent, Modal, Setting, TFolder, Notice } from 'obsidian';
import FolderNotesPlugin from '../main';
import { createFolderNote, getFolderNote } from 'src/functions/folderNoteFunctions';
import { getTemplatePlugins } from 'src/template';
import { getExcludedFolder } from 'src/ExcludeFolders/functions/folderFunctions';
export default class ConfirmationModal extends Modal {
	plugin: FolderNotesPlugin;
	app: App;
	folder: TFolder;
	extension: string;
	constructor(app: App, plugin: FolderNotesPlugin) {
		super(app);
		this.plugin = plugin;
		this.app = app;
		this.extension = plugin.settings.folderNoteType;
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
		if (!this.plugin.settings.templatePath || this.plugin.settings.templatePath?.trim() === '') {
			new Setting(contentEl)
				.setName('Folder note file extension')
				.setDesc('Choose the file extension for the folder notes.')
				.addDropdown((cb) => {
					this.plugin.settings.supportedFileTypes.forEach((extension) => {
						cb.addOption('.' + extension, extension);
					});
					cb.setValue(this.extension);
					cb.onChange(async (value) => {
						this.extension = value;
					});
				}
				);
		}
		new Setting(contentEl)
			.addButton((cb: ButtonComponent) => {
				cb.setButtonText('Create');
				cb.setCta();
				cb.buttonEl.focus();
				cb.onClick(async () => {
					if (this.plugin.settings.templatePath && this.plugin.settings.templatePath.trim() !== '') {
						this.extension = '.' + this.plugin.settings.templatePath.split('.').pop();
					}
					if (this.extension === '.ask') {
						return new Notice('Please choose a file extension');
					}
					this.close();
					const folders = this.app.vault.getAllLoadedFiles().filter((file) => file.parent instanceof TFolder);
					for (const folder of folders) {
						if (folder instanceof TFolder) {
							const excludedFolder = await getExcludedFolder(this.plugin, folder.path, true);
							if (excludedFolder) continue;
							if (folder.path === templateFolderPath) continue;
							const folderNote = getFolderNote(this.plugin, folder.path);
							if (folderNote) continue;
							await createFolderNote(this.plugin, folder.path, false, this.extension);
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
