import { App, TFolder, Menu, TAbstractFile, Notice, TFile } from 'obsidian';
import FolderNotesPlugin from './main';
import { ExcludedFolder } from './settings';
export class Commands {
	plugin: FolderNotesPlugin;
	app: App;
	constructor(app: App, plugin: FolderNotesPlugin) {
		this.plugin = plugin;
		this.app = app;
	}
	registerCommands() {
		this.plugin.registerEvent(this.app.workspace.on('file-menu', (menu: Menu, file: TAbstractFile) => {
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
			const path = file.path + '/' + this.plugin.settings.folderNoteName.replace('{{folder_name}}', file.name) + '.md';
			const folderNote = this.plugin.app.vault.getAbstractFileByPath(path);
			if (folderNote && folderNote instanceof TFile) {
				menu.addItem((item) => {
					item.setTitle('Delete folder note')
						.setIcon('trash')
						.onClick(() => {
							this.plugin.deleteFolderNote(folderNote);
						});
				});
			} else {
				menu.addItem((item) => {
					item.setTitle('Create folder note')
						.setIcon('edit')
						.onClick(() => {
							this.plugin.createFolderNote(path, true);
						});
				});
			}
		}));
	}
}
