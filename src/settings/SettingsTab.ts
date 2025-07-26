import { App, Notice, PluginSettingTab, TFile, TFolder, MarkdownPostProcessorContext } from 'obsidian';
import FolderNotesPlugin from '../main';
import { ExcludePattern } from 'src/ExcludeFolders/ExcludePattern';
import { ExcludedFolder } from 'src/ExcludeFolders/ExcludeFolder';
import { extractFolderName, getFolderNote } from '../functions/folderNoteFunctions';
import { defaultOverviewSettings } from '../obsidian-folder-overview/src/FolderOverview';
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
	autoCreateForFiles: boolean;
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
	focusExistingTab: boolean;
	oldFolderNoteName: string | undefined;
	folderNoteName: string;
	newFolderNoteName: string;
	folderNoteType: string;
	disableFolderHighlighting: boolean;
	storageLocation: 'insideFolder' | 'parentFolder' | 'vaultFolder';
	syncDelete: boolean;
	defaultOverview: defaultOverviewSettings;
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
	hideCollapsingIconForEmptyFolders: boolean;
	ignoreAttachmentFolder: boolean;
	tabManagerEnabled: boolean;
	deleteFilesAction: 'delete' | 'trash' | 'obsidianTrash';
	openSidebar: {
		mobile: boolean;
		desktop: boolean;
	}
	highlightFolder: boolean;
	persistentSettingsTab: {
		afterRestart: boolean;
		afterChangingTab: boolean;
	},
	firstTimeInsertOverview: boolean;
	fvGlobalSettings: {
		autoUpdateLinks: boolean;
	}
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
	autoCreateForFiles: false,
	enableCollapsing: false,
	excludeFolders: [],
	whitelistFolders: [],
	showDeleteConfirmation: true,
	underlineFolder: true,
	stopWhitespaceCollapsing: true,
	underlineFolderInPath: true,
	openFolderNoteOnClickInPath: true,
	openInNewTab: false,
	focusExistingTab: false,
	oldFolderNoteName: undefined,
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
		alwaysCollapse: false,
		autoSync: true,
		allowDragAndDrop: true,
		hideLinkList: true,
		hideFolderOverview: false,
		useActualLinks: false,
		fmtpIntegration: false,
		titleSize: 1,
		isInCallout: false,
	},
	useSubmenus: true,
	syncMove: true,
	frontMatterTitle: {
		enabled: false,
		explorer: true,
		path: true,
	},
	settingsTab: 'general',
	supportedFileTypes: ['md', 'canvas', 'base'],
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
		detached: false,
		showFolderNote: false,
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
		detached: false,
		showFolderNote: false,
	},
	hideCollapsingIcon: false,
	hideCollapsingIconForEmptyFolders: false,
	tabManagerEnabled: true,
	ignoreAttachmentFolder: true,
	deleteFilesAction: 'trash',
	openSidebar: {
		mobile: false,
		desktop: true,
	},
	highlightFolder: true,
	persistentSettingsTab: {
		afterRestart: true,
		afterChangingTab: true,
	},
	firstTimeInsertOverview: true,
	fvGlobalSettings: {
		autoUpdateLinks: false,
	},
};

export class SettingsTab extends PluginSettingTab {
	plugin: FolderNotesPlugin;
	app: App;
	excludeFolders: ExcludedFolder[];
	settingsPage!: HTMLElement;
	showFolderNameInTabTitleSetting: boolean;
	constructor(app: App, plugin: FolderNotesPlugin) {
		super(app, plugin);
	}
	TABS = {
		GENERAL: {
			name: 'General',
			id: 'general',
		},
		FOLDER_OVERVIEW: {
			name: 'Folder overview',
			id: 'folder_overview',
		},
		EXCLUDE_FOLDERS: {
			name: 'Exclude folders',
			id: 'exclude_folders',
		},
		FILE_EXPLORER: {
			name: 'File explorer',
			id: 'file_explorer',
		},
		PATH: {
			name: 'Path',
			id: 'path',
		},
	};
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

	display(contentEl?: HTMLElement, yaml?: defaultOverviewSettings, plugin?: FolderNotesPlugin, defaultSettings?: boolean, display?: CallableFunction, el?: HTMLElement, ctx?: MarkdownPostProcessorContext, file?: TFile | null, settingsTab?: this) {
		plugin = this?.plugin ?? plugin;
		if (plugin) {
			plugin.settingsOpened = true;
		}
		settingsTab = this ?? settingsTab;
		const { containerEl } = settingsTab;
		if (plugin && !plugin.settings.persistentSettingsTab.afterChangingTab) {
			plugin.settings.settingsTab = this.TABS.GENERAL.id;
		}

		containerEl.empty();

		const tabBar = containerEl.createEl('nav', { cls: 'fn-settings-tab-bar' });
		for (const [tabId, tabInfo] of Object.entries(settingsTab.TABS)) {
			const tabEl = tabBar.createEl('div', { cls: 'fn-settings-tab' });
			tabEl.createEl('div', { cls: 'fn-settings-tab-name', text: tabInfo.name });
			if (plugin && plugin.settings.settingsTab.toLocaleLowerCase() === tabId.toLocaleLowerCase()) {
				tabEl.addClass('fn-settings-tab-active');
			}
			tabEl.addEventListener('click', () => {
				// @ts-ignore
				for (const tabEl of tabBar.children) {
					tabEl.removeClass('fn-settings-tab-active');
					if (!plugin) { return; }
					plugin.settings.settingsTab = tabId.toLocaleLowerCase();
					plugin.saveSettings();
				}
				tabEl.addClass('fn-settings-tab-active');
				if (!settingsTab) { return; }
				settingsTab.renderSettingsPage(tabId);
			});
		}
		settingsTab.settingsPage = containerEl.createDiv({ cls: 'fn-settings-page' });
		if (plugin) {
			if (plugin.settings.persistentSettingsTab) {
				settingsTab.renderSettingsPage(plugin.settings.settingsTab);
			} else {
				settingsTab.renderSettingsPage(this.TABS.GENERAL.id);
			}
		}
	}

	renameFolderNotes() {
		new Notice('Starting to update folder notes...');
		const oldTemplate = this.plugin.settings.oldFolderNoteName ?? '{{folder_name}}';

		for (const folder of this.app.vault.getAllLoadedFiles()) {
			if (folder instanceof TFolder) {
				const folderNote = getFolderNote(this.plugin, folder.path, undefined, undefined, oldTemplate);
				if (!(folderNote instanceof TFile)) { continue; }

				const folderName = extractFolderName(oldTemplate, folderNote.basename) ?? '';
				const newFolderNoteName = this.plugin.settings.folderNoteName.replace('{{folder_name}}', folderName);
				let newPath = '';

				if (this.plugin.settings.storageLocation === 'parentFolder') {
					if (getFolderPathFromString(folder.path).trim() === '/') {
						newPath = `${newFolderNoteName}.${folderNote.extension}`;
					} else {
						newPath = `${folderNote.parent?.path}/${newFolderNoteName}.${folderNote.extension}`;
					}
				} else if (this.plugin.settings.storageLocation === 'insideFolder') {
					newPath = `${folder.path}/${newFolderNoteName}.${folderNote.extension}`;
				}

				this.app.fileManager.renameFile(folderNote, newPath);
			}
		}

		this.plugin.settings.oldFolderNoteName = this.plugin.settings.folderNoteName;
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
