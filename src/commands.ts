import { App, TFolder, Menu, TAbstractFile, Notice, TFile } from 'obsidian';
import FolderNotesPlugin from './main';
import { getFolderNote, createFolderNote, deleteFolderNote } from './folderNoteFunctions';
import { ExcludedFolder } from './excludedFolder';
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
