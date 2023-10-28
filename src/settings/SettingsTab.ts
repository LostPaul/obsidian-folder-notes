import { App, Notice, PluginSettingTab, TFile, TFolder } from 'obsidian';
import FolderNotesPlugin from '../main';
import { ExcludedFolder, ExcludePattern } from '../excludedFolder';
import { extractFolderName, getFolderNote } from '../functions/folderNoteFunctions';
import { yamlSettings } from '../folderOverview/FolderOverview';
import { renderGeneral } from './GeneralSettings';
import { renderFileExplorer } from './FileExplorerSettings';
import { renderPath } from './PathSettings';
import { renderFolderOverview } from './FolderOverviewSettings';
import { renderExcludeFolders } from './ExcludedFoldersSettings';

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
	folderNoteType: string;
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
	},
	settingsTab: string;
	supportedFileTypes: string[];
	boldName: boolean;
	boldNameInPath: boolean;
	cursiveName: boolean;
	cursiveNameInPath: boolean;
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
		id: '',
		folderPath: '',
		title: '{{folderName}} overview',
		showTitle: false,
		depth: 3,
		includeTypes: ['folder', 'markdown'],
		style: 'list',
		disableFileTag: false,
		sortBy: 'name',
		sortByAsc: true,
		showEmptyFolders: false,
		onlyIncludeSubfolders: false,
		storeFolderCondition: true,
		showFolderNotes: false,
	},
	useSubmenus: true,
	syncMove: true,
	frontMatterTitle: {
		enabled: false,
		explorer: true,
		path: true,
	},
	settingsTab: 'general',
	supportedFileTypes: ['md', 'canvas'],
	boldName: false,
	boldNameInPath: false,
	cursiveName: false,
	cursiveNameInPath: false,
};

export class SettingsTab extends PluginSettingTab {
	plugin: FolderNotesPlugin;
	app: App;
	excludeFolders: ExcludedFolder[];
	settingsPage!: HTMLElement;
	constructor(app: App, plugin: FolderNotesPlugin) {
		super(app, plugin);
	}
	TABS = {
		GENERAL: {
			name: 'General',
			id: 'general'
		},
		FOLDER_OVERVIEW: {
			name: 'Folder overview',
			id: 'folder_overview'
		},
		EXCLUDE_FOLDERS: {
			name: 'Exclude folders',
			id: 'exclude_folders'
		},
		FILE_EXPLORER: {
			name: 'File explorer',
			id: 'file_explorer',
		},
		PATH: {
			name: 'Path',
			id: 'path'
		}
	}
	renderSettingsPage(tabId: string) {
		this.settingsPage.empty();
		switch (tabId.toLocaleLowerCase()) {
			case this.TABS.GENERAL.id:
				renderGeneral(this);
				break;
			case this.TABS.FOLDER_OVERVIEW.id:
				renderFolderOverview(this);
				break;
			case this.TABS.EXCLUDE_FOLDERS.id:
				renderExcludeFolders(this);
				break;
			case this.TABS.FILE_EXPLORER.id:
				renderFileExplorer(this);
				break;
			case this.TABS.PATH.id:
				renderPath(this);
				break;
		}

	}
	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		const tabBar = containerEl.createEl('nav', { cls: 'fn-settings-tab-bar' });
		for (const [tabId, tabInfo] of Object.entries(this.TABS)) {
			const tabEl = tabBar.createEl('div', { cls: 'fn-settings-tab' });
			const tabName = tabEl.createEl('div', { cls: 'fn-settings-tab-name', text: tabInfo.name });
			if (this.plugin.settings.settingsTab.toLocaleLowerCase() === tabId.toLocaleLowerCase()) {
				tabEl.addClass('fn-settings-tab-active');
			}
			tabEl.addEventListener('click', () => {
				// @ts-ignore
				for (const tabEl of tabBar.children) {
					tabEl.removeClass('fn-settings-tab-active');
					this.plugin.settings.settingsTab = tabId.toLocaleLowerCase();
					this.plugin.saveSettings();
				}
				tabEl.addClass('fn-settings-tab-active');
				this.renderSettingsPage(tabId);
			});
		}
		this.settingsPage = containerEl.createDiv({ cls: 'fn-settings-page' });
		this.renderSettingsPage(this.plugin.settings.settingsTab);
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
