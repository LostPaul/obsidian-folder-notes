import { App, Notice, Platform, PluginSettingTab, Setting, TFile, TFolder } from 'obsidian';
import FolderNotesPlugin from './main';
import { TemplateSuggest } from './suggesters/templateSuggester';
import { extractFolderName, getFolderNote } from './functions/folderNoteFunctions';
import { addExcludeFolderListItem, ExcludedFolder, addExcludedFolder, ExcludePattern, addExcludePatternListItem } from './excludedFolder';
import { FrontMatterTitlePluginHandler } from './events/frontMatterTitle';
import ConfirmationModal from "./modals/confirmCreation";
import { yamlSettings } from './folderOverview/FolderOverview';
import { FolderOverviewSettings } from './folderOverview/modalSettings';
export interface FolderNotesSettings {
	syncFolderName: boolean;
	ctrlKey: boolean;
	altKey: boolean;
	hideFolderNote: boolean;
	templatePath: string;
	autoCreate: boolean;
	enableCollapsing: boolean;
	excludeFolders: (ExcludePattern | ExcludedFolder)[];
	showDeleteConfirmation: boolean;
	showRenameConfirmation: boolean;
	underlineFolder: boolean;
	allowWhitespaceCollapsing: boolean;
	underlineFolderInPath: boolean;
	openFolderNoteOnClickInPath: boolean;
	openInNewTab: boolean;
	folderNoteName: string;
	newFolderNoteName: string;
	folderNoteType: '.md' | '.canvas';
	disableFolderHighlighting: boolean;
	storageLocation: 'insideFolder' | 'parentFolder' | 'vaultFolder';
	syncDelete: boolean;
	defaultOverview: yamlSettings;
	useSubmenus: boolean;
	syncMove: boolean;
	frontMatterTitle: {
		enabled: boolean;
		explorer: boolean;
		path: boolean;
	}
}

export const DEFAULT_SETTINGS: FolderNotesSettings = {
	syncFolderName: true,
	ctrlKey: true,
	altKey: false,
	hideFolderNote: true,
	templatePath: '',
	autoCreate: false,
	enableCollapsing: false,
	excludeFolders: [],
	showDeleteConfirmation: true,
	underlineFolder: true,
	allowWhitespaceCollapsing: false,
	underlineFolderInPath: true,
	openFolderNoteOnClickInPath: true,
	openInNewTab: false,
	folderNoteName: '{{folder_name}}',
	folderNoteType: '.md',
	disableFolderHighlighting: false,
	newFolderNoteName: '{{folder_name}}',
	storageLocation: 'insideFolder',
	syncDelete: false,
	showRenameConfirmation: true,
	defaultOverview: {
		folderPath: '',
		title: '{{folderName}} overview',
		disableTitle: false,
		depth: 3,
		includeTypes: ['folder', 'markdown'],
		style: 'list',
		disableFileTag: false,
		sortBy: 'name',
		sortByAsc: true,
		showEmptyFolders: false,
		onlyIncludeSubfolders: false,
		storeFolderCondition: true,
	},
	useSubmenus: true,
	syncMove: true,
	frontMatterTitle: {
		enabled: false,
		explorer: true,
		path: true,
	}
};
export class SettingsTab extends PluginSettingTab {
	plugin: FolderNotesPlugin;
	app: App;
	excludeFolders: ExcludedFolder[];
	constructor(app: App, plugin: FolderNotesPlugin) {
		super(app, plugin);
	}
	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Folder notes settings' });

		const nameSetting = new Setting(containerEl)
			.setName('Folder note name')
			.setDesc('{{folder_name}} will be replaced with the name of the folder')
			.addText((text) =>
				text
					.setValue(this.plugin.settings.newFolderNoteName)
					.onChange(async (value) => {
						if (value.trim() === '') { return; }
						this.plugin.settings.newFolderNoteName = value;
						await this.plugin.saveSettings();
					})
			)
			.addButton((button) =>
				button
					.setButtonText('Rename existing folder notes')
					.setCta()
					.onClick(async () => {
						this.updateFolderNotes(this.plugin.settings.folderNoteName, this.plugin.settings.newFolderNoteName);
					})
			);
		nameSetting.infoEl.appendText('Make sure to back up your vault before renaming all folder notes and restart Obsidian after renaming them');
		nameSetting.infoEl.style.color = this.app.vault.getConfig('accentColor') as string || '#7d5bed';

		new Setting(containerEl)
			.setName('Folder note type')
			.setDesc('Choose the file type for creating new folder notes (markdown or canvas) old folder notes will not be changed and you can also create canvas/markdown files and change the name manually to the custom folder note name or to the name of the folder.')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('.md', 'markdown')
					.addOption('.canvas', 'canvas')
					.setValue(this.plugin.settings.folderNoteType)
					.onChange(async (value: '.md' | '.canvas') => {
						this.plugin.settings.folderNoteType = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Manage folder overview defaults')
			.setDesc('Manage the default settings for the folder overview plugin')
			.addButton((button) =>
				button
					.setButtonText('Manage')
					.setCta()
					.onClick(async () => {
						new FolderOverviewSettings(this.plugin.app, this.plugin, this.plugin.settings.defaultOverview, null, null, true).open();
					})
			);

		const setting = new Setting(containerEl);
		const desc = document.createDocumentFragment();
		desc.append(
			'After setting the template path, restart Obsidian if the template folder path (from templater/templates) had been changed beforehand.',
			desc.createEl('br'),
			'Obsidian should also be restarted if the template path was removed.'
		);
		setting.setName('Template path');
		setting.setDesc(desc).descEl.style.color = this.app.vault.getConfig('accentColor') as string || '#7d5bed';
		setting.addSearch((cb) => {
			new TemplateSuggest(cb.inputEl, this.plugin);
			cb.setPlaceholder('Template path');
			cb.setValue(this.plugin.app.vault.getAbstractFileByPath(this.plugin.settings.templatePath)?.name.replace('.md', '') || '');
			cb.onChange(async (value) => {
				if (value.trim() === '') {
					this.plugin.settings.templatePath = '';
					await this.plugin.saveSettings();
					this.display();
					return;
				}
			});
		});

		const storageLocation = new Setting(containerEl)
			.setName('Storage location')
			.setDesc('Choose where to store the folder notes')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('insideFolder', 'Inside the folder')
					.addOption('parentFolder', 'In the parent folder')
					.setValue(this.plugin.settings.storageLocation)
					.onChange(async (value: 'insideFolder' | 'parentFolder' | 'vaultFolder') => {
						this.plugin.settings.storageLocation = value;
						await this.plugin.saveSettings();
						this.display();
						this.plugin.loadFileClasses();
					})
			);
		storageLocation.infoEl.appendText('Requires a restart to take effect');
		storageLocation.infoEl.style.color = this.app.vault.getConfig('accentColor') as string || '#7d5bed';

		const switchLocation = new Setting(containerEl)
			.setName('Switch to new storage location')
			.setDesc('Move all folder notes to the new storage location')
			.addButton((button) =>
				button
					.setButtonText('Switch')
					.setCta()
					.onClick(async () => {
						let oldStorageLocation = this.plugin.settings.storageLocation;
						if (this.plugin.settings.storageLocation === 'parentFolder') {
							oldStorageLocation = 'insideFolder';
						} else if (this.plugin.settings.storageLocation === 'insideFolder') {
							oldStorageLocation = 'parentFolder';
						}
						this.switchStorageLocation(oldStorageLocation);
					})
			);
		switchLocation.infoEl.appendText('Requires a restart to take effect');
		switchLocation.infoEl.style.color = this.app.vault.getConfig('accentColor') as string || '#7d5bed';

		if (this.plugin.settings.storageLocation === 'parentFolder') {
			new Setting(containerEl)
				.setName('Delete folder notes when deleting the folder')
				.setDesc('Delete the folder note when deleting the folder')
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.syncDelete)
						.onChange(async (value) => {
							this.plugin.settings.syncDelete = value;
							await this.plugin.saveSettings();
						}
						)
				);
			new Setting(containerEl)
				.setName('Move folder notes when moving the folder')
				.setDesc('Move the folder note when moving the folder')
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.syncMove)
						.onChange(async (value) => {
							this.plugin.settings.syncMove = value;
							await this.plugin.saveSettings();
						})
				);
		}
		const disableSetting = new Setting(containerEl);
		disableSetting.setName('Disable folder collapsing');
		disableSetting.setDesc('Disable the ability to collapse folders by clicking exactly on the folder name');
		disableSetting.addToggle((toggle) =>
			toggle
				.setValue(!this.plugin.settings.enableCollapsing)
				.onChange(async (value) => {
					this.plugin.settings.enableCollapsing = !value;
					await this.plugin.saveSettings();
				})
		);
		disableSetting.infoEl.appendText('Requires a restart to take effect');
		disableSetting.infoEl.style.color = this.app.vault.getConfig('accentColor') as string || '#7d5bed';

		if (Platform.isDesktopApp) {
			new Setting(containerEl)
				.setName('Key for creating folder note')
				.setDesc('The key combination to create a folder note')
				.addDropdown((dropdown) => {
					if (!Platform.isMacOS) {
						dropdown.addOption('ctrl', 'Ctrl + Click');
					} else {
						dropdown.addOption('ctrl', 'Cmd + Click');
					}
					dropdown.addOption('alt', 'Alt + Click');
					dropdown.setValue(this.plugin.settings.ctrlKey ? 'ctrl' : 'alt');
					dropdown.onChange(async (value) => {
						this.plugin.settings.ctrlKey = value === 'ctrl';
						this.plugin.settings.altKey = value === 'alt';
						await this.plugin.saveSettings();
						this.display();
					});
				});
		}

		new Setting(containerEl)
			.setName('Only open folder notes through the name')
			.setDesc('Only open folder notes in the file explorer by clicking on the folder name')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.allowWhitespaceCollapsing)
					.onChange(async (value) => {
						if (!value) {
							document.body.classList.add('fn-whitespace-stop-collapsing');
						} else {
							document.body.classList.remove('fn-whitespace-stop-collapsing');
						}
						this.plugin.settings.allowWhitespaceCollapsing = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Hide folder note')
			.setDesc('Hide the folder note in the file explorer')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.hideFolderNote)
					.onChange(async (value) => {
						this.plugin.settings.hideFolderNote = value;
						await this.plugin.saveSettings();
						if (value) {
							document.body.classList.add('hide-folder-note');
						} else {
							document.body.classList.remove('hide-folder-note');
						}
						this.display();
					})
			);
		new Setting(containerEl)
			.setName('Sync folder name')
			.setDesc('Automatically rename the folder note when the folder name is changed')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.syncFolderName)
					.onChange(async (value) => {
						this.plugin.settings.syncFolderName = value;
						await this.plugin.saveSettings();
						this.display();
					})
			);
		if (Platform.isDesktop) {
			const setting3 = new Setting(containerEl);
			setting3.setName('Open folder note in a new tab by default');
			setting3.setDesc('Always open folder notes in a new tab (except when you try to open the same note) instead of having to use ctrl/cmd + click to open in a new tab');
			setting3.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.openInNewTab)
					.onChange(async (value) => {
						this.plugin.settings.openInNewTab = value;
						await this.plugin.saveSettings();
						this.display();
					})
			);
			setting3.infoEl.appendText('Requires a restart to take effect');
			setting3.infoEl.style.color = this.app.vault.getConfig('accentColor') as string || '#7d5bed';
		}
		new Setting(containerEl)
			.setName('Automatically create folder notes')
			.setDesc('Automatically create a folder note when a new folder is created')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoCreate)
					.onChange(async (value) => {
						this.plugin.settings.autoCreate = value;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		new Setting(containerEl)
			.setName('Use submenus')
			.setDesc('Use submenus for file/folder commands')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.useSubmenus)
					.onChange(async (value) => {
						this.plugin.settings.useSubmenus = value;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		new Setting(containerEl)
			.setName('Add underline to folders with folder notes')
			.setDesc('Add an underline to folders that have a folder note in the file explorer')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.underlineFolder)
					.onChange(async (value) => {
						this.plugin.settings.underlineFolder = value;
						if (value) {
							document.body.classList.add('folder-note-underline');
						} else {
							document.body.classList.remove('folder-note-underline');
						}
						await this.plugin.saveSettings();
					})
			);


		new Setting(containerEl)
			.setName('Open folder note through path')
			.setDesc('Open a folder note when clicking on a folder name in the path if it is a folder note')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.openFolderNoteOnClickInPath)
					.onChange(async (value) => {
						this.plugin.settings.openFolderNoteOnClickInPath = value;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (this.plugin.settings.openFolderNoteOnClickInPath) {
			new Setting(containerEl)
				.setName('Underline folders in the path')
				.setDesc('Add an underline to folders that have a folder note in the path above a note')
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.underlineFolderInPath)
						.onChange(async (value) => {
							this.plugin.settings.underlineFolderInPath = value;
							if (value) {
								document.body.classList.add('folder-note-underline-path');
							} else {
								document.body.classList.remove('folder-note-underline-path');
							}
							await this.plugin.saveSettings();
						})
				);
		}

		new Setting(containerEl)
			.setName('Enable front matter title plugin integration')
			.setDesc('Automatically rename a folder name when the folder note is renamed')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.frontMatterTitle.enabled)
					.onChange(async (value) => {
						this.plugin.settings.frontMatterTitle.enabled = value;
						await this.plugin.saveSettings();
						if (value) {
							this.plugin.fmtpHandler = new FrontMatterTitlePluginHandler(this.plugin);
						} else {
							if (this.plugin.fmtpHandler) {
								this.plugin.updateBreadcrumbs(true);
							}
							this.plugin.app.vault.getFiles().forEach((file) => {
								this.plugin.fmtpHandler?.handleRename({ id: '', result: false, path: file.path }, false);
							});
							this.plugin.fmtpHandler?.deleteEvent();
							this.plugin.fmtpHandler = null;
						}
						this.display();
					})
			);

		if (this.plugin.settings.frontMatterTitle.enabled) {
			new Setting(containerEl)
				.setName('Include file explorer')
				.setDesc('Automatically rename a folder name in the file explorer when the folder note is renamed')
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.frontMatterTitle.explorer)
						.onChange(async (value) => {
							this.plugin.settings.frontMatterTitle.explorer = value;
							await this.plugin.saveSettings();
							this.plugin.app.vault.getFiles().forEach((file) => {
								this.plugin.fmtpHandler?.handleRename({ id: '', result: false, path: file.path }, false);
							});
						})
				);

			new Setting(containerEl)
				.setName('Include path above note')
				.setDesc('Automatically rename a folder name in the path above a note when the folder note is renamed')
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.frontMatterTitle.path)
						.onChange(async (value) => {
							this.plugin.settings.frontMatterTitle.path = value;
							await this.plugin.saveSettings();
							if (value) {
								this.plugin.updateBreadcrumbs();
							} else {
								this.plugin.updateBreadcrumbs(true);
							}
						})
				);
		}


		new Setting(containerEl)
			.setName('Create folder note for every folder')
			.setDesc('Create a folder note for every folder in the vault')
			.addButton((cb) => {
				cb.setIcon('plus');
				cb.setTooltip('Create folder notes');
				cb.onClick(async () => {

					new ConfirmationModal(this.app, this.plugin).open();
				});
			});


		const manageExcluded = new Setting(containerEl)
			.setHeading()
			.setClass('fn-excluded-folder-heading')
			.setName('Manage excluded folders');
		const desc3 = document.createDocumentFragment();
		desc3.append(
			'Add {regex} at the beginning of the folder name to use a regex pattern.',
			desc.createEl('br'),
			'Use * before and after to exclude folders that include the name between the *s.',
			desc.createEl('br'),
			'Use * before the folder name to exclude folders that end with the folder name.',
			desc.createEl('br'),
			'Use * after the folder name to exclude folders that start with the folder name.',
		);
		manageExcluded.setDesc(desc3);
		manageExcluded.infoEl.appendText('The regexes and wildcards are only for the folder name, not the path.');
		manageExcluded.infoEl.createEl('br');
		manageExcluded.infoEl.appendText('If you want to switch to a folder path delete the pattern first.');
		manageExcluded.infoEl.style.color = this.app.vault.getConfig('accentColor') as string || '#7d5bed';

		new Setting(containerEl)
			.setName('Add excluded folder')
			.setClass('add-exclude-folder-item')
			.addButton((cb) => {
				cb.setIcon('plus');
				cb.setClass('add-exclude-folder');
				cb.setTooltip('Add excluded folder');
				cb.onClick(() => {
					const excludedFolder = new ExcludedFolder('', this.plugin.settings.excludeFolders.length);
					addExcludeFolderListItem(this, containerEl, excludedFolder);
					addExcludedFolder(this.plugin, excludedFolder);
					this.display();
				});
			});
		this.plugin.settings.excludeFolders.sort((a, b) => a.position - b.position).forEach((excludedFolder) => {
			if (excludedFolder.string?.trim() !== '' && excludedFolder.path?.trim() === '') {
				addExcludePatternListItem(this, containerEl, excludedFolder);
			} else {
				addExcludeFolderListItem(this, containerEl, excludedFolder);
			}
		});
	}

	updateFolderNotes(oldTemplate: string, newTemplate: string) {
		this.plugin.settings.folderNoteName = newTemplate;
		this.plugin.saveSettings();
		new Notice('Starting to update folder notes...');
		this.app.vault.getFiles().forEach((file) => {
			if (file instanceof TFile) {
				const folderPath = this.plugin.getFolderPathFromString(file.path);
				let folder = this.app.vault.getAbstractFileByPath(folderPath);
				let folderName = file.name.slice(0, -file.extension.length - 1);
				folderName = extractFolderName(oldTemplate, folderName) || '';
				if (!(folder instanceof TFolder) || folderName !== folder?.name) {
					if (folderPath.trim() === '') {
						folder = this.app.vault.getAbstractFileByPath(folderName);
					} else {
						folder = this.app.vault.getAbstractFileByPath(folderPath + '/' + folderName);
					}
				}
				if (!(folder instanceof TFolder)) { return; }
				if (folderName === folder?.name) {
					const newPath = `${folder?.path}/${this.plugin.settings.folderNoteName.replace('{{folder_name}}', folderName)}.${file.extension}`;
					this.app.vault.rename(file, newPath);
				} else if (folder?.name === file.name.slice(0, -file.extension.length - 1) || '') {
					const newPath = `${folder?.path}/${this.plugin.settings.folderNoteName.replace('{{folder_name}}', file.name.slice(0, -file.extension.length - 1) || '')}.${file.extension}`;
					this.app.vault.rename(file, newPath);
				}
			}
		});
		new Notice('Finished updating folder notes');
	}

	switchStorageLocation(oldMethod: string) {
		new Notice('Starting to switch storage location...');
		this.app.vault.getAllLoadedFiles().forEach((file) => {
			if (file instanceof TFolder) {
				const folderNote = getFolderNote(this.plugin, file.path, oldMethod);
				if (folderNote instanceof TFile) {
					if (this.plugin.settings.storageLocation === 'parentFolder') {
						let newPath = '';
						if (this.plugin.getFolderPathFromString(file.path).trim() === '') {
							newPath = `${folderNote.name}`;
						} else {
							newPath = `${this.plugin.getFolderPathFromString(file.path)}/${folderNote.name}`;
						}
						this.app.vault.rename(folderNote, newPath);
					} else if (this.plugin.settings.storageLocation === 'insideFolder') {
						if (this.plugin.getFolderPathFromString(folderNote.path) === file.path) {
							return;
						} else {
							const newPath = `${file.path}/${folderNote.name}`;
							this.app.vault.rename(folderNote, newPath);
						}
					}
				}
			}
		});
		new Notice('Finished switching storage location');
	}

}
