import { App, Notice, PluginSettingTab, TFile, TFolder } from 'obsidian';
import FolderNotesPlugin from '../main';
import { ExcludePattern } from 'src/ExcludeFolders/ExcludePattern';
import { ExcludedFolder } from 'src/ExcludeFolders/ExcludeFolder';
import { getFolderNote } from '../functions/folderNoteFunctions';
import { yamlSettings } from '../folderOverview/FolderOverview';
import { renderGeneral } from './GeneralSettings';
import { renderFileExplorer } from './FileExplorerSettings';
import { renderPath } from './PathSettings';
import { renderFolderOverview } from './FolderOverviewSettings';
import { renderExcludeFolders } from './ExcludedFoldersSettings';
import { getFolderPathFromString } from '../functions/utils';
import { WhitelistedFolder } from 'src/ExcludeFolders/WhitelistFolder';
import { WhitelistedPattern } from 'src/ExcludeFolders/WhitelistPattern';

export interface FolderNotesSettings {
	syncFolderName: boolean;
	ctrlKey: boolean;
	altKey: boolean;
	hideFolderNote: boolean;
	templatePath: string;
	autoCreate: boolean;
	autoCreateForAttachmentFolder: boolean;
	autoCreateFocusFiles: boolean;
	enableCollapsing: boolean;
	excludeFolders: (ExcludePattern | ExcludedFolder)[];
	whitelistFolders: (WhitelistedFolder | WhitelistedPattern)[];
	showDeleteConfirmation: boolean;
	showRenameConfirmation: boolean;
	underlineFolder: boolean;
	stopWhitespaceCollapsing: boolean;
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
	disableOpenFolderNoteOnClick: boolean;
	openByClick: boolean;
	openWithCtrl: boolean;
	openWithAlt: boolean;
	excludeFolderDefaultSettings: ExcludedFolder;
	excludePatternDefaultSettings: ExcludePattern;
	hideCollapsingIcon: boolean;
	ignoreAttachmentFolder: boolean;
	tabManagerEnabled: boolean;
	openSidebar: {
		mobile: boolean;
		desktop: boolean;
	}
	highlightFolder: boolean;
}

export const DEFAULT_SETTINGS: FolderNotesSettings = {
	syncFolderName: true,
	ctrlKey: true,
	altKey: false,
	hideFolderNote: true,
	templatePath: '',
	autoCreate: false,
	autoCreateFocusFiles: true,
	autoCreateForAttachmentFolder: false,
	enableCollapsing: false,
	excludeFolders: [],
	whitelistFolders: [],
	showDeleteConfirmation: true,
	underlineFolder: true,
	stopWhitespaceCollapsing: true,
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
		disableCollapseIcon: true,
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
	disableOpenFolderNoteOnClick: false,
	openByClick: true,
	openWithCtrl: false,
	openWithAlt: false,
	excludeFolderDefaultSettings: {
		type: 'folder',
		path: '',
		id: crypto.randomUUID(),
		subFolders: true,
		disableSync: true,
		disableAutoCreate: true,
		disableFolderNote: false,
		enableCollapsing: false,
		position: 0,
		excludeFromFolderOverview: false,
		string: '',
		hideInSettings: false,
	},
	excludePatternDefaultSettings: {
		type: 'pattern',
		path: '',
		id: crypto.randomUUID(),
		subFolders: true,
		disableSync: true,
		disableAutoCreate: true,
		disableFolderNote: false,
		enableCollapsing: false,
		position: 0,
		excludeFromFolderOverview: false,
		string: '',
		hideInSettings: false,
	},
	hideCollapsingIcon: false,
	tabManagerEnabled: true,
	ignoreAttachmentFolder: true,
	openSidebar: {
		mobile: false,
		desktop: true,
	},
	highlightFolder: true,
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
		this.plugin.settingsOpened = true;
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

	updateFolderNotes(newTemplate: string) {
		new Notice('Starting to update folder notes...');
		for (const folder of this.app.vault.getAllLoadedFiles()) {
			if (folder instanceof TFolder) {
				const folderNote = getFolderNote(this.plugin, folder.path);
				if (!(folderNote instanceof TFile)) { continue }
				const folderNoteName = newTemplate.replace('{{folder_name}}', folder.name)
				const newPath = `${folder.path}/${folderNoteName}.${folderNote.extension}`;
				if (this.plugin.app.vault.getAbstractFileByPath(newPath)) { continue }
				this.plugin.app.fileManager.renameFile(folderNote, newPath);
			}
		}
		this.plugin.settings.folderNoteName = newTemplate;
		this.plugin.saveSettings();
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
						if (getFolderPathFromString(file.path).trim() === '') {
							newPath = `${folderNote.name}`;
						} else {
							newPath = `${getFolderPathFromString(file.path)}/${folderNote.name}`;
						}
						this.plugin.app.fileManager.renameFile(folderNote, newPath);
					} else if (this.plugin.settings.storageLocation === 'insideFolder') {
						if (getFolderPathFromString(folderNote.path) === file.path) {
							return;
						} else {
							const newPath = `${file.path}/${folderNote.name}`;
							this.plugin.app.fileManager.renameFile(folderNote, newPath);
						}
					}
				}
			}
		});
		new Notice('Finished switching storage location');
	}

	onClose(): void {
		this.plugin.settingsOpened = false;
	}
}
