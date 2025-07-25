import FolderNotesPlugin from '../../main';
import { getFolderNameFromPathString, getFolderPathFromString } from '../../functions/utils';
import { ExcludedFolder } from '../ExcludeFolder';
import { ExcludePattern } from '../ExcludePattern';
import { Platform, Setting } from 'obsidian';
import { FolderSuggest } from '../../suggesters/FolderSuggester';
import { SettingsTab } from '../../settings/SettingsTab';
import ExcludedFolderSettings from '../modals/ExcludeFolderSettings';
import { updatePattern, getExcludedFoldersByPattern, addExcludePatternListItem } from './patternFunctions';
import { getWhitelistedFolder } from './whitelistFolderFunctions';
import { WhitelistedFolder } from '../WhitelistFolder';
import { WhitelistedPattern } from '../WhitelistPattern';

export function getExcludedFolder(plugin: FolderNotesPlugin, path: string, includeDetached: boolean, pathOnly?: boolean, ignoreWhitelist?: boolean) {
	let excludedFolder = {} as ExcludedFolder | ExcludePattern | undefined;
	const whitelistedFolder = getWhitelistedFolder(plugin, path) as WhitelistedFolder | WhitelistedPattern | undefined;
	const folderName = getFolderNameFromPathString(path);
	let matchedPatterns = getExcludedFoldersByPattern(plugin, folderName);
	const excludedFolders = getExcludedFoldersByPath(plugin, path);
	if (pathOnly) { matchedPatterns = []; }
	let combinedExcludedFolders = [...matchedPatterns, ...excludedFolders];

	if (!includeDetached) {
		combinedExcludedFolders = combinedExcludedFolders.filter((f) => !f.detached);
	}

	const propertiesToCopy: (keyof ExcludedFolder)[] = [
		'disableAutoCreate',
		'disableFolderNote',
		'disableSync',
		'enableCollapsing',
		'excludeFromFolderOverview',
		'detached',
		'hideInSettings',
		'id',
		'showFolderNote',
	];

	if (combinedExcludedFolders.length > 0) {
		for (const matchedFolder of combinedExcludedFolders) {
			propertiesToCopy.forEach((property) => {
				if (matchedFolder[property] === true) {
					(excludedFolder as any)[property] = true;
				} else if (!matchedFolder[property]) {
					(excludedFolder as any)[property] = false;
				}
			});
		}
	} else {
		excludedFolder = undefined;
	}

	if (excludedFolder?.detached) { ignoreWhitelist = true; }

	if (whitelistedFolder && excludedFolder && !ignoreWhitelist) {
		excludedFolder.disableAutoCreate ? excludedFolder.disableAutoCreate = !whitelistedFolder.enableAutoCreate : '';
		excludedFolder.disableFolderNote ? excludedFolder.disableFolderNote = !whitelistedFolder.enableFolderNote : '';
		excludedFolder.disableSync ? excludedFolder.disableSync = !whitelistedFolder.enableSync : '';
		excludedFolder.enableCollapsing = !whitelistedFolder.disableCollapsing;
		excludedFolder.excludeFromFolderOverview ? excludedFolder.excludeFromFolderOverview = !whitelistedFolder.showInFolderOverview : '';
		excludedFolder.showFolderNote = !whitelistedFolder.hideInFileExplorer;
	} else if (excludedFolder && Object.keys(excludedFolder).length === 0) {
		excludedFolder = {
			type: 'folder',
			id: '',
			path: '',
			string: '',
			subFolders: false,
			disableSync: false,
			disableAutoCreate: false,
			disableFolderNote: false,
			enableCollapsing: false,
			position: 0,
			excludeFromFolderOverview: false,
			hideInSettings: false,
			detached: false,
			showFolderNote: false,
		};
	}

	return excludedFolder;
}

export function getDetachedFolder(plugin: FolderNotesPlugin, path: string) {
	return plugin.settings.excludeFolders.find((f) => f.path === path && f.detached);
}


export function getExcludedFolderByPath(plugin: FolderNotesPlugin, path: string) {
	return plugin.settings.excludeFolders.find((excludedFolder) => {
		if (path.trim() === '' || !excludedFolder.path) { return false; }
		if (excludedFolder.path === path) { return true; }
		if (!excludedFolder.subFolders) { return false; }
		const excludedFolderPath = excludedFolder.path.includes('/') ? excludedFolder.path : excludedFolder.path + '/';
		let folderPath = getFolderPathFromString(path);
		folderPath = folderPath.includes('/') ? folderPath : folderPath + '/';

		if (folderPath.includes('/') || folderPath.includes('\\')) {
			return folderPath.startsWith(excludedFolderPath) || folderPath === excludedFolderPath;
		} else {
			return folderPath === excludedFolderPath;
		}
	});
}

export function getExcludedFoldersByPath(plugin: FolderNotesPlugin, path: string) {
	return plugin.settings.excludeFolders.filter((excludedFolder) => {
		if (path.trim() === '' || !excludedFolder.path) { return false; }
		if (excludedFolder.path === path) { return true; }
		if (!excludedFolder.subFolders) { return false; }
		const excludedFolderPath = excludedFolder.path.includes('/') ? excludedFolder.path : excludedFolder.path + '/';
		let folderPath = getFolderPathFromString(path);
		folderPath = folderPath.includes('/') ? folderPath : folderPath + '/';

		if (folderPath.includes('/') || folderPath.includes('\\')) {
			return folderPath.startsWith(excludedFolderPath) || folderPath === excludedFolderPath;
		} else {
			return folderPath === excludedFolderPath;
		}
	});
}

export function addExcludedFolder(plugin: FolderNotesPlugin, excludedFolder: ExcludedFolder, reloadStyles = true) {
	plugin.settings.excludeFolders.push(excludedFolder);
	plugin.saveSettings(reloadStyles);
}

export async function deleteExcludedFolder(plugin: FolderNotesPlugin, excludedFolder: ExcludedFolder) {
	plugin.settings.excludeFolders = plugin.settings.excludeFolders.filter((folder) => folder.id !== excludedFolder.id || folder.type === 'pattern');
	plugin.saveSettings(true);
	resyncArray(plugin);
}

export function updateExcludedFolder(plugin: FolderNotesPlugin, excludedFolder: ExcludePattern, newExcludeFolder: ExcludePattern) {
	plugin.settings.excludeFolders = plugin.settings.excludeFolders.filter((folder) => folder.id !== excludedFolder.id);
	addExcludedFolder(plugin, newExcludeFolder);
}

export function resyncArray(plugin: FolderNotesPlugin) {
	plugin.settings.excludeFolders = plugin.settings.excludeFolders.sort((a, b) => a.position - b.position);
	plugin.settings.excludeFolders.forEach((folder, index) => {
		folder.position = index;
	});
	plugin.saveSettings();
}


export function addExcludeFolderListItem(settings: SettingsTab, containerEl: HTMLElement, excludedFolder: ExcludedFolder) {
	const plugin: FolderNotesPlugin = settings.plugin;
	const setting = new Setting(containerEl);
	setting.setClass('fn-exclude-folder-list');
	setting.addSearch((cb) => {
		new FolderSuggest(
			cb.inputEl,
			plugin,
			false
		);
		// @ts-ignore
		cb.containerEl.addClass('fn-exclude-folder-path');
		cb.setPlaceholder('Folder path');
		cb.setValue(excludedFolder.path || '');
		cb.onChange((value) => {
			if (value.startsWith('{regex}') || value.includes('*')) {
				deleteExcludedFolder(plugin, excludedFolder);
				const pattern = new ExcludePattern(value, plugin.settings.excludeFolders.length, undefined, plugin);
				addExcludedFolder(plugin, pattern);
				addExcludePatternListItem(settings, containerEl, pattern);
				setting.clear();
				setting.settingEl.remove();
			}
			if (!plugin.app.vault.getAbstractFileByPath(value)) return;
			excludedFolder.path = value;
			updateExcludedFolder(plugin, excludedFolder, excludedFolder);
		});
	});

	setting.addButton((cb) => {
		cb.setIcon('edit');
		cb.setTooltip('Edit folder note');
		cb.onClick(() => {
			new ExcludedFolderSettings(plugin.app, plugin, excludedFolder).open();
		});
	});

	if (Platform.isDesktop || Platform.isTablet) {
		setting.addButton((cb) => {
			cb.setIcon('up-chevron-glyph');
			cb.setTooltip('Move up');
			cb.onClick(() => {
				if (excludedFolder.position === 0) { return; }
				excludedFolder.position -= 1;
				updateExcludedFolder(plugin, excludedFolder, excludedFolder);
				const oldExcludedFolder = plugin.settings.excludeFolders.find((folder) => folder.position === excludedFolder.position);
				if (oldExcludedFolder) {
					oldExcludedFolder.position += 1;
					if (oldExcludedFolder.type === 'pattern') {
						updatePattern(plugin, oldExcludedFolder, oldExcludedFolder);
					} else {
						updateExcludedFolder(plugin, oldExcludedFolder, oldExcludedFolder);
					}
				}
				settings.display();
			});
		});

		setting.addButton((cb) => {
			cb.setIcon('down-chevron-glyph');
			cb.setTooltip('Move down');
			cb.onClick(() => {
				if (excludedFolder.position === plugin.settings.excludeFolders.length - 1) {
					return;
				}
				excludedFolder.position += 1;

				updateExcludedFolder(plugin, excludedFolder, excludedFolder);
				const oldExcludedFolder = plugin.settings.excludeFolders.find((folder) => folder.position === excludedFolder.position);
				if (oldExcludedFolder) {
					oldExcludedFolder.position -= 1;
					if (oldExcludedFolder.type === 'pattern') {
						updatePattern(plugin, oldExcludedFolder, oldExcludedFolder);
					} else {
						updateExcludedFolder(plugin, oldExcludedFolder, oldExcludedFolder);
					}
				}

				settings.display();
			});
		});
	}

	setting.addButton((cb) => {
		cb.setIcon('trash-2');
		cb.setTooltip('Delete excluded folder');
		cb.onClick(() => {
			deleteExcludedFolder(plugin, excludedFolder);
			setting.clear();
			setting.settingEl.remove();
		});
	});
}
