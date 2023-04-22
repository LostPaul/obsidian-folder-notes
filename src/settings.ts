import { App, Platform, PluginSettingTab, Setting } from 'obsidian';
import FolderNotesPlugin from './main';
import { FolderSuggest } from './suggesters/FolderSuggester';
import ExcludedFolderSettings from './modals/exludeFolderSettings';
import { TemplateSuggest } from './suggesters/templateSuggester';
// import ConfirmationModal from "./modals/confirmCreation";
export interface FolderNotesSettings {
	syncFolderName: boolean;
	ctrlKey: boolean;
	altKey: boolean;
	hideFolderNote: boolean;
	templatePath: string;
	autoCreate: boolean;
	enableCollapsing: boolean;
	excludeFolders: ExcludedFolder[];
	showDeleteConfirmation: boolean;
	underlineFolder: boolean;
	allowWhitespaceCollapsing: boolean;
	underlineFolderInPath: boolean;
	openFolderNoteOnClickInPath: boolean;
}

export const DEFAULT_SETTINGS: FolderNotesSettings = {
	syncFolderName: true,
	ctrlKey: true,
	altKey: false,
	hideFolderNote: false,
	templatePath: '',
	autoCreate: false,
	enableCollapsing: false,
	excludeFolders: [],
	showDeleteConfirmation: true,
	underlineFolder: true,
	allowWhitespaceCollapsing: false,
	underlineFolderInPath: true,
	openFolderNoteOnClickInPath: true,
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

		new Setting(containerEl)
			.setName('Disable folder collapsing')
			.setDesc('Disable the ability to collapse folders by clicking on the folder name')
			.addToggle((toggle) =>
				toggle
					.setValue(!this.plugin.settings.enableCollapsing)
					.onChange(async (value) => {
						this.plugin.settings.enableCollapsing = !value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Don\'t collapse folder when clicking on the whitespace around the folder name')
			.setDesc('Disable the ability to collapse folders by clicking on the whitespace around the folder name.')
			.addToggle((toggle) =>
				toggle
					.setValue(!this.plugin.settings.allowWhitespaceCollapsing)
					.onChange(async (value) => {
						if (value) {
							document.body.classList.add('fn-whitespace-stop-collapsing');
						} else {
							document.body.classList.remove('fn-whitespace-stop-collapsing');
						}
						this.plugin.settings.allowWhitespaceCollapsing = !value;
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
		new Setting(containerEl)
			.setName('Auto create folder note')
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
			.setName('Underline folders with folder notes in the path')
			.setDesc('Add an underline to folders that have a folder note in the path')
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

		new Setting(containerEl)
			.setName('Open folder note through path')
			.setDesc('Open the folder note when clicking on a folder name in the path')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.openFolderNoteOnClickInPath)
					.onChange(async (value) => {
						this.plugin.settings.openFolderNoteOnClickInPath = value;
						await this.plugin.saveSettings();
					})
			);


		new Setting(containerEl)
			.setName('Template path')
			.setDesc('The path to the template file')
			.addSearch((cb) => {
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

		// Due to issue with templater it'll be disabled for now
		// If you want to try it yourself make a pr
		// The issue was that it only used the first folder for all of the other folder notes
		/*
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
		*/


		new Setting(containerEl)
			.setHeading()
			.setName('Manage excluded folders');
		new Setting(containerEl)
			.setName('Add excluded folder')
			.addButton((cb) => {
				cb.setIcon('plus');
				cb.setClass('add-exclude-folder');
				cb.setTooltip('Add excluded folder');
				cb.onClick(() => {
					const excludedFolder = new ExcludedFolder('', this.plugin.settings.excludeFolders.length);
					this.addExcludeFolderListItem(containerEl, excludedFolder);
					this.addExcludedFolder(excludedFolder);
					this.display();
				});
			});
		this.plugin.settings.excludeFolders.sort((a, b) => a.position - b.position).forEach((excludedFolder) => {
			this.addExcludeFolderListItem(containerEl, excludedFolder);
		});
	}
	addExcludeFolderListItem(containerEl: HTMLElement, excludedFolder: ExcludedFolder) {
		const setting = new Setting(containerEl);
		setting.setClass('fn-exclude-folder-list-item');
		setting.addSearch((cb) => {
			new FolderSuggest(
				cb.inputEl,
				this.plugin
			);
			// @ts-ignore
			cb.containerEl.addClass('fn-exclude-folder-path');
			cb.setPlaceholder('Folder path');
			cb.setValue(excludedFolder.path);
			cb.onChange((value) => {
				if (!this.app.vault.getAbstractFileByPath(value)) return;
				excludedFolder.path = value;
				this.updateExcludedFolder(excludedFolder, excludedFolder);
			});
		});
		setting.addButton((cb) => {
			cb.setIcon('edit');
			cb.setTooltip('Edit folder note');
			cb.onClick(() => {
				new ExcludedFolderSettings(this.app, this.plugin, excludedFolder).open();
			});
		});

		setting.addButton((cb) => {
			cb.setIcon('up-chevron-glyph');
			cb.setTooltip('Move up');
			cb.onClick(() => {
				if (excludedFolder.position === 0) return;
				excludedFolder.position -= 1;
				this.updateExcludedFolder(excludedFolder, excludedFolder);
				const oldExcludedFolder = this.plugin.settings.excludeFolders.find((folder) => folder.position === excludedFolder.position);
				if (oldExcludedFolder) {

					oldExcludedFolder.position += 1;
					this.updateExcludedFolder(oldExcludedFolder, oldExcludedFolder);
				}
				this.display();
			});
		});
		setting.addButton((cb) => {
			cb.setIcon('down-chevron-glyph');
			cb.setTooltip('Move down');
			cb.onClick(() => {
				if (excludedFolder.position === this.plugin.settings.excludeFolders.length - 1) return;
				excludedFolder.position += 1;
				this.updateExcludedFolder(excludedFolder, excludedFolder);
				const oldExcludedFolder = this.plugin.settings.excludeFolders.find((folder) => folder.position === excludedFolder.position);
				if (oldExcludedFolder) {
					oldExcludedFolder.position -= 1;
					this.updateExcludedFolder(oldExcludedFolder, oldExcludedFolder);
				}
				this.display();
			});
		});
		setting.addButton((cb) => {
			cb.setIcon('trash-2');
			cb.setTooltip('Delete excluded folder');
			cb.onClick(() => {
				this.deleteExcludedFolder(excludedFolder);
				setting.clear();
				setting.settingEl.remove();
			});
		});
	}
	addExcludedFolder(excludedFolder: ExcludedFolder) {
		this.plugin.settings.excludeFolders.push(excludedFolder);
		this.plugin.saveSettings();
	}
	deleteExcludedFolder(excludedFolder: ExcludedFolder) {
		this.plugin.settings.excludeFolders = this.plugin.settings.excludeFolders.filter((folder) => folder.path !== excludedFolder.path);
		this.plugin.saveSettings();
	}
	updateExcludedFolder(excludedFolder: ExcludedFolder, newExcludeFolder: ExcludedFolder) {
		this.plugin.settings.excludeFolders = this.plugin.settings.excludeFolders.filter((folder) => folder.path !== excludedFolder.path);
		this.addExcludedFolder(newExcludeFolder);
	}

}
export class ExcludedFolder {
	path: string;
	subFolders: boolean;
	disableSync: boolean;
	disableAutoCreate: boolean;
	disableFolderNote: boolean;
	enableCollapsing: boolean;
	position: number;
	constructor(path: string, position: number) {
		this.path = path;
		this.subFolders = true;
		this.disableSync = true;
		this.disableAutoCreate = true;
		this.disableFolderNote = false;
		this.enableCollapsing = false;
		this.position = position;
	}
}
