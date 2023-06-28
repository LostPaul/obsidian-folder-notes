import { App, TFolder, Menu, TAbstractFile, Notice, TFile, Editor, MarkdownView } from 'obsidian';
import FolderNotesPlugin from './main';
import { getFolderNote, createFolderNote, deleteFolderNote, turnIntoFolderNote, openFolderNote } from './functions/folderNoteFunctions';
import { ExcludedFolder } from './excludedFolder';
export class Commands {
	plugin: FolderNotesPlugin;
	app: App;
	constructor(app: App, plugin: FolderNotesPlugin) {
		this.plugin = plugin;
		this.app = app;
	}
	registerCommands() {
		this.plugin.registerEvent(this.plugin.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
			const text = editor.getSelection().trim();
			if (!text || text.trim() === '') return;
			menu.addItem((item) => {
				item.setTitle('Create folder note')
					.setIcon('edit')
					.onClick(() => {
						const file = view.file;
						if (!(file instanceof TFile)) return;
						const blacklist = ['*', '\\', '"', '/', '<', '>', '?', '|', ':'];
						for (const char of blacklist) {
							if (text.includes(char)) {
								new Notice('File name cannot contain any of the following characters: * " \\ / < > : | ?');
								return;
							}
						}
						if (text.endsWith('.')) {
							new Notice('File name cannot end with a dot');
							return;
						}
						let folder: TAbstractFile | null;
						const folderPath = this.plugin.getFolderPathFromString(file.path);
						if (folderPath === '') {
							folder = this.plugin.app.vault.getAbstractFileByPath(text);
							if (folder instanceof TFolder) {
								return new Notice('Folder note already exists');
							} else {
								this.plugin.app.vault.createFolder(text);
								createFolderNote(this.plugin, text, false);
							}
						} else {
							folder = this.plugin.app.vault.getAbstractFileByPath(folderPath + '/' + text);
							if (folder instanceof TFolder) {
								return new Notice('Folder note already exists');
							}
							if (this.plugin.settings.storageLocation === 'parentFolder') {
								if (this.app.vault.getAbstractFileByPath(folderPath + '/' + text + this.plugin.settings.folderNoteType)) {
									return new Notice('File already exists');
								}
							}
							this.plugin.app.vault.createFolder(folderPath + '/' + text);
							createFolderNote(this.plugin, folderPath + '/' + text, false);
						}
						const fileName = this.plugin.settings.folderNoteName.replace('{{folder_name}}', text);
						if (fileName === text) {
							editor.replaceSelection(`[[${fileName}]]`);
						} else {
							editor.replaceSelection(`[[${fileName}|${text}]]`);
						}
					});
			});
		}));
		this.plugin.registerEvent(this.app.workspace.on('file-menu', (menu: Menu, file: TAbstractFile) => {
			if (file instanceof TFile) {
				const folder = file.parent;
				if (folder === null) return;
				const folderNote = getFolderNote(this.plugin, folder.path);
				if (folderNote?.path === file.path) { return; }
				menu.addItem((item) => {
					item.setTitle('Create folder note')
						.setIcon('edit')
						.onClick(async () => {
							let newPath = file.parent?.path + '/' + file.basename;
							if (!(file.parent instanceof TFolder) || file.parent.path === '' || file.parent.path === '/') {
								newPath = file.basename;
							}
							if (this.plugin.app.vault.getAbstractFileByPath(newPath)) {
								return new Notice('Folder already exists');
							}
							await this.plugin.app.vault.createFolder(newPath);
							const newFolder = this.plugin.app.vault.getAbstractFileByPath(newPath);
							if (!(newFolder instanceof TFolder)) return;
							createFolderNote(this.plugin, newFolder.path, true, false, file);
						});
				});
				if (this.plugin.getFolderPathFromString(file.path) === '') return;
				if (!(folder instanceof TFolder)) return;
				menu.addItem((item) => {
					item.setTitle('Turn into folder note')
						.setIcon('edit')
						.onClick(() => {
							turnIntoFolderNote(this.plugin, file, folder, folderNote);
						});
				});
			}
			if (!(file instanceof TFolder)) return;
			if (this.plugin.settings.excludeFolders.find((folder) => folder.path === file.path)) {
				menu.addItem((item) => {
					item.setTitle('Remove folder from excluded folders')
						.setIcon('trash')
						.onClick(() => {
							this.plugin.settings.excludeFolders = this.plugin.settings.excludeFolders.filter(
								(folder) => folder.path !== file.path);
							this.plugin.saveSettings();
							new Notice('Successfully removed folder from excluded folders');
						});
				});
				return;
			}
			menu.addItem((item) => {
				item.setTitle('Exclude folder from folder notes')
					.setIcon('x-circle')
					.onClick(() => {
						const excludedFolder = new ExcludedFolder(file.path, this.plugin.settings.excludeFolders.length);
						this.plugin.settings.excludeFolders.push(excludedFolder);
						this.plugin.saveSettings();
						new Notice('Successfully excluded folder from folder notes');
					});
			});
			if (!(file instanceof TFolder)) return;
			const folderNote = getFolderNote(this.plugin, file.path);
			if (folderNote instanceof TFile) {
				menu.addItem((item) => {
					item.setTitle('Delete folder note')
						.setIcon('trash')
						.onClick(() => {
							deleteFolderNote(this.plugin, folderNote);
						});
				});
				menu.addItem((item) => {
					item.setTitle('Open folder note')
						.setIcon('chevron-right-square')
						.onClick(() => {
							openFolderNote(this.plugin, folderNote);
						});
				});
			} else {
				menu.addItem((item) => {
					item.setTitle('Create folder note')
						.setIcon('edit')
						.onClick(() => {
							createFolderNote(this.plugin, file.path, true);
						});
				});
			}
		}));
	}
}
