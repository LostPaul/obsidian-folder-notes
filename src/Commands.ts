import {
	TFolder,
	Notice,
	TFile,
	Platform,
	type App,
	type Menu,
	type TAbstractFile,
	type Editor,
	type MarkdownView,
} from 'obsidian';
import type FolderNotesPlugin from './main';
import {
	getFolderNote,
	createFolderNote,
	deleteFolderNote,
	turnIntoFolderNote,
	openFolderNote,
	extractFolderName,
	detachFolderNote,
} from './functions/folderNoteFunctions';
import { ExcludedFolder } from './ExcludeFolders/ExcludeFolder';
import { getFolderPathFromString, getFileExplorerActiveFolder } from './functions/utils';
import {
	deleteExcludedFolder,
	getDetachedFolder,
	getExcludedFolder,
} from './ExcludeFolders/functions/folderFunctions';
import {
	hideFolderNoteInFileExplorer,
	showFolderNoteInFileExplorer,
} from './functions/styleFunctions';



export class Commands {
	plugin: FolderNotesPlugin;
	app: App;
	constructor(app: App, plugin: FolderNotesPlugin) {
		this.plugin = plugin;
		this.app = app;
	}
	registerCommands(): void {
		this.editorCommands();
		this.fileCommands();
		this.regularCommands();
	}

	regularCommands(): void {
		this.plugin.addCommand({
			id: 'turn-into-folder-note',
			name: 'Use this file as the folder note for its parent folder',
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!(file instanceof TFile)) return false;
				const folder = file.parent;
				if (!folder || !(folder instanceof TFolder)) return false;
				// Only show if file is NOT in the root folder
				if (folder.path === '' || folder.path === '/') return false;
				const folderNote = getFolderNote(this.plugin, folder.path);
				if (folderNote instanceof TFile && folderNote === file) return false;
				if (checking) return true;
				turnIntoFolderNote(this.plugin, file, folder, folderNote);
			},
		});

		this.plugin.addCommand({
			id: 'create-folder-note',
			name: 'Make a folder with this file as its folder note',
			callback: async () => {
				const file = this.app.workspace.getActiveFile();
				if (!(file instanceof TFile)) return;
				let newPath = file.parent?.path + '/' + file.basename;
				if (file.parent?.path === '' || file.parent?.path === '/') {
					newPath = file.basename;
				}
				if (this.plugin.app.vault.getAbstractFileByPath(newPath)) {
					return new Notice('Folder already exists');
				}
				const automaticallyCreateFolderNote =
					this.plugin.settings.autoCreate;
				this.plugin.settings.autoCreate = false;
				this.plugin.saveSettings();
				await this.plugin.app.vault.createFolder(newPath);
				const folder = this.plugin.app.vault.getAbstractFileByPath(newPath);
				if (!(folder instanceof TFolder)) return;
				createFolderNote(this.plugin, folder.path, true, '.' + file.extension, false, file);
				this.plugin.settings.autoCreate = automaticallyCreateFolderNote;
				this.plugin.saveSettings();
			},
		});

		this.plugin.addCommand({
			id: 'create-folder-note-for-current-folder',
			name: 'Create markdown folder note for this folder',
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!(file instanceof TFile)) return false;
				const folder = file.parent;
				if (!(folder instanceof TFolder)) return false;
				if (folder.path === '' || folder.path === '/') return false;
				if (checking) return true;
				createFolderNote(this.plugin, folder.path, true, '.md', false);
			},
		});

		this.plugin.settings.supportedFileTypes.forEach((fileType) => {
			if (fileType === 'md') return;
			this.plugin.addCommand({
				id: `create-${fileType}-folder-note-for-current-folder`,
				name: `Create ${fileType} folder note for this folder`,
				checkCallback: (checking) => {
					const file = this.app.workspace.getActiveFile();
					if (!(file instanceof TFile)) return false;
					const folder = file.parent;
					if (!(folder instanceof TFolder)) return false;
					if (folder.path === '' || folder.path === '/') return false;
					if (checking) return true;
					createFolderNote(this.plugin, folder.path, true, '.' + fileType, false);
				},
			});
		});
		this.plugin.settings.supportedFileTypes.forEach((fileType) => {
			const type = fileType === 'md' ? 'markdown' : fileType;
			this.plugin.addCommand({
				id: `create-${type}-folder-note-for-active-file-explorer-folder`,
				name: `Create ${type} folder note for current active folder in file explorer`,
				checkCallback: (checking: boolean) => {
					const folder = getFileExplorerActiveFolder();
					if (!folder) return false;
					// Is there already a folder note for the active folder?
					const folderNote = getFolderNote(this.plugin, folder.path);
					if (folderNote instanceof TFile) return false;
					if (checking) return true;

					// Everything is fine and not checking, let's create the folder note.
					const ext = '.' + fileType;
					const { path } = folder;
					createFolderNote(this.plugin, path, true, ext, false);
				},
			});
		});

		this.plugin.addCommand({
			id: 'delete-folder-note-for-current-folder',
			name: 'Delete this folder\'s linked note',
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!(file instanceof TFile)) return false;
				const folder = file.parent;
				if (!(folder instanceof TFolder)) return false;
				const folderNote = getFolderNote(this.plugin, folder.path);
				if (!(folderNote instanceof TFile)) return false;
				if (checking) return true;
				deleteFolderNote(this.plugin, folderNote, true);
			},
		});

		this.plugin.addCommand({
			id: 'delete-folder-note-of-active-file-explorer-folder',
			name: 'Delete folder note of current active folder in file explorer',
			checkCallback: (checking: boolean) => {
				const folder = getFileExplorerActiveFolder();
				if (!folder) return false;
				// Is there any folder note for the active folder?
				const folderNote = getFolderNote(this.plugin, folder.path);
				if (!(folderNote instanceof TFile)) return false;
				if (checking) return true;

				// Everything is fine and not checking, let's delete the folder note.
				deleteFolderNote(this.plugin, folderNote, true);
			},
		});
		this.plugin.addCommand({
			id: 'open-folder-note-for-current-folder',
			name: 'Open this folder\'s linked note',
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!(file instanceof TFile)) return false;
				const folder = file.parent;
				if (!(folder instanceof TFolder)) return false;
				const folderNote = getFolderNote(this.plugin, folder.path);
				if (!(folderNote instanceof TFile)) return false;
				if (checking) return true;
				openFolderNote(this.plugin, folderNote);
			},
		});
		this.plugin.addCommand({
			id: 'open-folder-note-of-active-file-explorer-folder',
			name: 'Open folder note of current active folder in file explorer',
			checkCallback: (checking: boolean) => {
				const folder = getFileExplorerActiveFolder();
				if (!folder) return false;
				// Is there any folder note for the active folder?
				const folderNote = getFolderNote(this.plugin, folder.path);
				if (!(folderNote instanceof TFile)) return false;
				if (checking) return true;

				// Everything is fine and not checking, let's open the folder note.
				openFolderNote(this.plugin, folderNote);
			},
		});

		this.plugin.addCommand({
			id: 'create-folder-note-from-selected-text',
			name: 'Create folder note from selection',
			editorCheckCallback: (checking: boolean, editor: Editor, view: MarkdownView) => {
				const text = editor.getSelection().trim();
				const { file } = view;
				if (!(file instanceof TFile)) return false;
				if (text && text.trim() !== '') {
					if (checking) { return true; }
					const blacklist = ['*', '\\', '"', '/', '<', '>', '?', '|', ':'];
					for (const char of blacklist) {
						if (text.includes(char)) {
							// eslint-disable-next-line max-len
							new Notice('File name cannot contain any of the following characters: * " \\ / < > : | ?');
							return false;
						}
					}
					if (text.endsWith('.')) {
						new Notice('File name cannot end with a dot');
						return;
					}
					let folder: TAbstractFile | null;
					const folderPath = getFolderPathFromString(file.path);
					if (folderPath === '') {
						folder = this.plugin.app.vault.getAbstractFileByPath(text);
						if (folder instanceof TFolder) {
							new Notice('Folder note already exists');
							return false;
						}
						this.plugin.app.vault.createFolder(text);
						createFolderNote(this.plugin, text, false);

					} else {
						const folderFullPath = folderPath + '/' + text;
						folder = this.plugin.app.vault.getAbstractFileByPath(folderFullPath);
						if (folder instanceof TFolder) {
							new Notice('Folder note already exists');
							return false;
						}
						if (this.plugin.settings.storageLocation === 'parentFolder') {
							if (
								this.app.vault.getAbstractFileByPath(
									folderPath + '/' + text + this.plugin.settings.folderNoteType,
								)
							) {
								new Notice('File already exists');
								return false;
							}
						}
						this.plugin.app.vault.createFolder(folderPath + '/' + text);
						createFolderNote(this.plugin, folderPath + '/' + text, false);
					}

					const { folderNoteName } = this.plugin.settings;
					const fileName = folderNoteName.replace('{{folder_name}}', text);
					if (fileName !== text) {
						editor.replaceSelection(`[[${fileName}]]`);
					} else {
						editor.replaceSelection(`[[${fileName}|${text}]]`);
					}
					return true;
				}
				return false;
			},
		});
	}

	fileCommands(): void {
		this.plugin.registerEvent(
			// eslint-disable-next-line complexity
			this.app.workspace.on('file-menu', (menu: Menu, file: TAbstractFile) => {
				let folder: TAbstractFile | TFolder | null = file.parent;
				if (file instanceof TFile) {
					if (this.plugin.settings.storageLocation === 'insideFolder') {
						folder = file.parent;
					} else {
						const { folderNoteName } = this.plugin.settings;
						const fileName = extractFolderName(folderNoteName, file.basename);
						if (fileName) {
							if (file.parent?.path === '' || file.parent?.path === '/') {
								folder = this.plugin.app.vault.getAbstractFileByPath(fileName);
							} else {
								folder = this.plugin.app.vault.getAbstractFileByPath(
									file.parent?.path + '/' + fileName,
								);
							}
						}
					}

					if (folder instanceof TFolder) {
						const folderNote = getFolderNote(this.plugin, folder.path);
						const excludedFolder = getExcludedFolder(this.plugin, folder.path, true);
						if (folderNote?.path === file.path && !excludedFolder?.detached) { return; }
					} else if (file.parent instanceof TFolder) {
						folder = file.parent;
					}
				}

				// eslint-disable-next-line complexity
				const addFolderNoteActions = (folderMenu: Menu): void => {
					if (file instanceof TFile) {
						folderMenu.addItem((item) => {
							item.setTitle('Create folder note');
							item.setIcon('edit');
							item.onClick(async () => {
								if (!folder) return;
								let newPath = folder.path + '/' + file.basename;
								if (folder.path === '' || folder.path === '/') {
									newPath = file.basename;
								}
								if (this.plugin.app.vault.getAbstractFileByPath(newPath)) {
									return new Notice('Folder already exists');
								}
								const automaticallyCreateFolderNote =
									this.plugin.settings.autoCreate;
								this.plugin.settings.autoCreate = false;
								this.plugin.saveSettings();
								await this.plugin.app.vault.createFolder(newPath);
								const newFolder = this.plugin.app.vault
									.getAbstractFileByPath(newPath);
								if (!(newFolder instanceof TFolder)) return;
								await createFolderNote(
									this.plugin,
									newFolder.path,
									true,
									'.' + file.extension,
									false,
									file,
								);
								this.plugin.settings.autoCreate = automaticallyCreateFolderNote;
								this.plugin.saveSettings();
							});
						});

						if (getFolderPathFromString(file.path) === '') return;

						if (!(folder instanceof TFolder)) return;

						if (folder.path === '' || folder.path === '/') return;

						folderMenu.addItem((item) => {
							item.setTitle(`Turn into folder note for ${folder?.name}`);
							item.setIcon('edit');
							item.onClick(() => {
								if (!folder || !(folder instanceof TFolder)) return;
								const folderNote = getFolderNote(this.plugin, folder.path);
								turnIntoFolderNote(this.plugin, file, folder, folderNote);
							});
						});
					}

					if (!(file instanceof TFolder)) return;

					const excludedFolder = getExcludedFolder(this.plugin, file.path, false);
					const detachedExcludedFolder = getDetachedFolder(this.plugin, file.path);

					if (excludedFolder && !excludedFolder.hideInSettings) {
						// I'm not sure if I'm ever going to add this because of the possibility that a folder got more than one excluded
						// menu.addItem((item) => {
						// 	item.setTitle('Manage excluded folder');
						// 	item.setIcon('settings-2');
						// 	item.onClick(() => {
						//     if (excludedFolder instanceof ExcludedFolder) {
						//       new ExcludedFolderSettings(this.plugin.app, this.plugin, excludedFolder).open();
						//     } else if (excludedFolder instanceof ExcludePattern) {
						//       new PatternSettings(this.plugin.app, this.plugin, excludedFolder).open();
						//     }
						//   });
						// });

						folderMenu.addItem((item) => {
							item.setTitle('Remove folder from excluded folders');
							item.setIcon('trash');
							item.onClick(() => {
								this.plugin.settings.excludeFolders =
									this.plugin.settings.excludeFolders.filter(
										(excluded) =>
											(excluded.path !== file.path) || excluded.detached,
									);
								this.plugin.saveSettings(true);
								new Notice('Successfully removed folder from excluded folders');
							});
						});

						return;
					}

					if (detachedExcludedFolder) {
						folderMenu.addItem((item) => {
							item.setTitle('Remove folder from detached folders');
							item.setIcon('trash');
							item.onClick(() => {
								deleteExcludedFolder(this.plugin, detachedExcludedFolder);
							});
						});
					}

					if (detachedExcludedFolder) { return; }

					folderMenu.addItem((item) => {
						item.setTitle('Exclude folder from folder notes');
						item.setIcon('x-circle');
						item.onClick(() => {
							const newExcludedFolder = new ExcludedFolder(
								file.path,
								this.plugin.settings.excludeFolders.length,
								undefined,
								this.plugin,
							);
							this.plugin.settings.excludeFolders.push(newExcludedFolder);
							this.plugin.saveSettings(true);
							new Notice('Successfully excluded folder from folder notes');
						});
					});

					if (!(file instanceof TFolder)) return;

					const folderNote = getFolderNote(this.plugin, file.path);

					if (folderNote instanceof TFile && !detachedExcludedFolder) {
						folderMenu.addItem((item) => {
							item.setTitle('Delete folder note');
							item.setIcon('trash');
							item.onClick(() => {
								deleteFolderNote(this.plugin, folderNote, true);
							});
						});

						folderMenu.addItem((item) => {
							item.setTitle('Open folder note');
							item.setIcon('chevron-right-square');
							item.onClick(() => {
								openFolderNote(this.plugin, folderNote);
							});
						});

						folderMenu.addItem((item) => {
							item.setTitle('Detach folder note');
							item.setIcon('unlink');
							item.onClick(() => {
								detachFolderNote(this.plugin, folderNote);
							});
						});

						folderMenu.addItem((item) => {
							item.setTitle('Copy Obsidian URL');
							item.setIcon('link');
							item.onClick(() => {
								this.app.copyObsidianUrl(folderNote);
							});
						});

						if (this.plugin.settings.hideFolderNote) {
							if (excludedFolder?.showFolderNote) {
								folderMenu.addItem((item) => {
									item.setTitle('Hide folder note in explorer');
									item.setIcon('eye-off');
									item.onClick(() => {
										hideFolderNoteInFileExplorer(file.path, this.plugin);
									});
								});
							} else {
								folderMenu.addItem((item) => {
									item.setTitle('Show folder note in explorer');
									item.setIcon('eye');
									item.onClick(() => {
										showFolderNoteInFileExplorer(file.path, this.plugin);
									});
								});
							}
						}
					} else {
						folderMenu.addItem((item) => {
							item.setTitle('Create markdown folder note');
							item.setIcon('edit');
							item.onClick(() => {
								createFolderNote(this.plugin, file.path, true, '.md');
							});
						});

						this.plugin.settings.supportedFileTypes.forEach((fileType) => {
							if (fileType === 'md') return;
							folderMenu.addItem((item) => {
								item.setTitle(`Create ${fileType} folder note`);
								item.setIcon('edit');
								item.onClick(() => {
									createFolderNote(this.plugin, file.path, true, '.' + fileType);
								});
							});
						});
					}
				};

				if (
					Platform.isDesktop &&
					!Platform.isTablet &&
					this.plugin.settings.useSubmenus
				) {
					menu.addItem(async (item) => {
						item.setTitle('Folder Note Commands').setIcon('folder-edit');
						let subMenu: Menu = item.setSubmenu() as Menu;
						addFolderNoteActions(subMenu);
					});
				} else {
					addFolderNoteActions(menu);
				}
			}));
	}

	editorCommands(): void {
		// eslint-disable-next-line max-len
		this.plugin.registerEvent(this.plugin.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
			const text = editor.getSelection().trim();
			if (!text || text.trim() === '') return;
			menu.addItem((item) => {
				item.setTitle('Create folder note')
					.setIcon('edit')
					.onClick(() => {
						const { file } = view;
						if (!(file instanceof TFile)) return;
						const blacklist = ['*', '\\', '"', '/', '<', '>', '?', '|', ':'];
						for (const char of blacklist) {
							if (text.includes(char)) {
								// eslint-disable-next-line max-len
								new Notice('File name cannot contain any of the following characters: * " \\ / < > : | ?');
								return;
							}
						}
						if (text.endsWith('.')) {
							new Notice('File name cannot end with a dot');
							return;
						}

						let folder: TAbstractFile | null;
						const folderPath = getFolderPathFromString(file.path);
						const { folderNoteName } = this.plugin.settings;
						const fileName = folderNoteName.replace('{{folder_name}}', text);
						if (folderPath === '') {
							folder = this.plugin.app.vault.getAbstractFileByPath(text);
							if (folder instanceof TFolder) {
								return new Notice('Folder note already exists');
							}
							this.plugin.app.vault.createFolder(text);
							createFolderNote(this.plugin, text, false);

						} else {
							folder = this.plugin.app.vault.getAbstractFileByPath(
								folderPath + '/' + text,
							);
							if (folder instanceof TFolder) {
								return new Notice('Folder note already exists');
							}
							if (this.plugin.settings.storageLocation === 'parentFolder') {
								if (
									this.app.vault.getAbstractFileByPath(
										folderPath +
										'/' +
										fileName +
										this.plugin.settings.folderNoteType,
									)
								) {
									return new Notice('File already exists');
								}
							}
							this.plugin.app.vault.createFolder(folderPath + '/' + text);
							createFolderNote(this.plugin, folderPath + '/' + text, false);
						}
						if (fileName !== text) {
							editor.replaceSelection(`[[${fileName}]]`);
						} else {
							editor.replaceSelection(`[[${fileName}|${text}]]`);
						}
					});
			});
		}));
	}
}
