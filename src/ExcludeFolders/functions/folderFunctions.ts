import type FolderNotesPlugin from '../../main';
import { getFolderNameFromPathString, getFolderPathFromString } from '../../functions/utils';
import type { ExcludedFolder } from '../ExcludeFolder';
import { ExcludePattern } from '../ExcludePattern';
import { Platform, Setting } from 'obsidian';
import { FolderSuggest } from '../../suggesters/FolderSuggester';
import type { SettingsTab } from '../../settings/SettingsTab';
import ExcludedFolderSettings from '../modals/ExcludeFolderSettings';
import {
	updatePattern,
	getExcludedFoldersByPattern,
	addExcludePatternListItem,
} from './patternFunctions';
import { getWhitelistedFolder } from './whitelistFolderFunctions';
import type { WhitelistedFolder } from '../WhitelistFolder';
import type { WhitelistedPattern } from '../WhitelistPattern';

function combineExcluded(
	plugin: FolderNotesPlugin,
	path: string,
	includeDetached: boolean,
	pathOnly?: boolean,
): Array<ExcludedFolder | ExcludePattern> {
	const folderName = getFolderNameFromPathString(path);
	const matchedPatterns = pathOnly ? [] : getExcludedFoldersByPattern(plugin, folderName);
	const excludedByPath = getExcludedFoldersByPath(plugin, path);
	let combined = [...matchedPatterns, ...excludedByPath];
	if (!includeDetached) combined = combined.filter((f) => !f.detached);
	return combined;
}

function aggregateFlags(
	combinedExcludedFolders: Array<ExcludedFolder | ExcludePattern>,
): Partial<ExcludedFolder> | undefined {
	if (combinedExcludedFolders.length === 0) return undefined;
	const result: Partial<ExcludedFolder> = {};
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
	for (const matchedFolder of combinedExcludedFolders) {
		for (const property of propertiesToCopy) {
			const value = (matchedFolder as Partial<ExcludedFolder>)[property];
			if (value === true) {
				(result as Partial<ExcludedFolder>)[property] = true as never;
			} else if (!value) {
				(result as Partial<ExcludedFolder>)[property] = false as never;
			}
		}
	}
	return result;
}

function applyWhitelistOverrides(
	excluded: Partial<ExcludedFolder>,
	whitelisted: WhitelistedFolder | WhitelistedPattern,
): Partial<ExcludedFolder> {
	const out: Partial<ExcludedFolder> = { ...excluded };
	if (out.disableAutoCreate !== undefined) {
		out.disableAutoCreate = !whitelisted.enableAutoCreate;
	}
	if (out.disableFolderNote !== undefined) {
		out.disableFolderNote = !whitelisted.enableFolderNote;
	}
	if (out.disableSync !== undefined) {
		out.disableSync = !whitelisted.enableSync;
	}
	out.enableCollapsing = !whitelisted.disableCollapsing;
	if (out.excludeFromFolderOverview !== undefined) {
		out.excludeFromFolderOverview = !whitelisted.showInFolderOverview;
	}
	out.showFolderNote = !whitelisted.hideInFileExplorer;
	return out;
}

function defaultExcludedIfEmpty(
	value: Partial<ExcludedFolder> | undefined,
): ExcludedFolder | undefined {
	if (value && Object.keys(value).length === 0) {
		return {
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
	return value as ExcludedFolder | undefined;
}

export function getExcludedFolder(
	plugin: FolderNotesPlugin,
	path: string,
	includeDetached: boolean,
	pathOnly?: boolean,
	ignoreWhitelist?: boolean,
): ExcludedFolder | ExcludePattern | undefined {
	const combined = combineExcluded(plugin, path, includeDetached, pathOnly);
	let excluded = aggregateFlags(combined);

	const whitelist = getWhitelistedFolder(
		plugin,
		path,
	) as WhitelistedFolder | WhitelistedPattern | undefined;

	let skipWhitelist = ignoreWhitelist ?? false;
	if (excluded?.detached) skipWhitelist = true;

	if (whitelist && excluded && !skipWhitelist) {
		excluded = applyWhitelistOverrides(excluded, whitelist);
	}

	return defaultExcludedIfEmpty(excluded) as ExcludedFolder | ExcludePattern | undefined;
}

export function getDetachedFolder(
	plugin: FolderNotesPlugin,
	path: string,
): ExcludedFolder | undefined {
	return plugin.settings.excludeFolders.find((f) => f.path === path && f.detached);
}

export function getExcludedFolderByPath(
	plugin: FolderNotesPlugin,
	path: string,
): ExcludedFolder | undefined {
	return plugin.settings.excludeFolders.find((excludedFolder) => {
		if (path.trim() === '' || !excludedFolder.path) { return false; }
		if (excludedFolder.path === path) { return true; }
		if (!excludedFolder.subFolders) { return false; }
		const excludedFolderPath = excludedFolder.path.includes('/')
			? excludedFolder.path
			: `${excludedFolder.path}/`;
		let folderPath = getFolderPathFromString(path);
		folderPath = folderPath.includes('/') ? folderPath : `${folderPath}/`;

		if (folderPath.includes('/') || folderPath.includes('\\')) {
			return folderPath.startsWith(excludedFolderPath) || folderPath === excludedFolderPath;
		}
		return folderPath === excludedFolderPath;

	});
}

export function getExcludedFoldersByPath(
	plugin: FolderNotesPlugin,
	path: string,
): ExcludedFolder[] {
	return plugin.settings.excludeFolders.filter((excludedFolder) => {
		if (path.trim() === '' || !excludedFolder.path) { return false; }
		if (excludedFolder.path === path) { return true; }
		if (!excludedFolder.subFolders) { return false; }
		const excludedFolderPath = excludedFolder.path.includes('/')
			? excludedFolder.path
			: `${excludedFolder.path}/`;
		let folderPath = getFolderPathFromString(path);
		folderPath = folderPath.includes('/') ? folderPath : `${folderPath}/`;

		if (folderPath.includes('/') || folderPath.includes('\\')) {
			return folderPath.startsWith(excludedFolderPath) || folderPath === excludedFolderPath;
		}
		return folderPath === excludedFolderPath;

	});
}

export function addExcludedFolder(
	plugin: FolderNotesPlugin,
	excludedFolder: ExcludedFolder,
	reloadStyles = true,
): void {
	plugin.settings.excludeFolders.push(excludedFolder);
	void plugin.saveSettings(reloadStyles);
}

export async function deleteExcludedFolder(
	plugin: FolderNotesPlugin,
	excludedFolder: ExcludedFolder,
): Promise<void> {
	plugin.settings.excludeFolders = plugin.settings.excludeFolders.filter(
		(folder) => folder.id !== excludedFolder.id || folder.type === 'pattern',
	);
	await plugin.saveSettings(true);
	resyncArray(plugin);
}

export function updateExcludedFolder(
	plugin: FolderNotesPlugin,
	excludedFolder: ExcludePattern,
	newExcludeFolder: ExcludePattern,
): void {
	plugin.settings.excludeFolders = plugin.settings.excludeFolders.filter(
		(folder) => folder.id !== excludedFolder.id,
	);
	addExcludedFolder(plugin, newExcludeFolder);
}

export function resyncArray(plugin: FolderNotesPlugin): void {
	plugin.settings.excludeFolders = plugin.settings.excludeFolders.sort(
		(a, b) => a.position - b.position,
	);
	plugin.settings.excludeFolders.forEach((folder, index) => {
		folder.position = index;
	});
	void plugin.saveSettings();
}

export function addExcludeFolderListItem(
	settings: SettingsTab,
	containerEl: HTMLElement,
	excludedFolder: ExcludedFolder,
): void {
	const { plugin } = settings;
	const setting = new Setting(containerEl);
	setting.setClass('fn-exclude-folder-list');
	setting.addSearch((cb) => {
		new FolderSuggest(
			cb.inputEl,
			plugin,
			false,
		);
		// @ts-expect-error Obsidian's public types don't include this property
		cb.containerEl.addClass('fn-exclude-folder-path');
		cb.setPlaceholder('Folder path');
		cb.setValue(excludedFolder.path || '');
		cb.onChange((value) => {
			if (value.startsWith('{regex}') || value.includes('*')) {
				deleteExcludedFolder(plugin, excludedFolder);
				const pattern = new ExcludePattern(
					value,
					plugin.settings.excludeFolders.length,
					undefined,
					plugin,
				);
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
				const oldExcludedFolder = plugin.settings.excludeFolders.find(
					(folder) => folder.position === excludedFolder.position,
				);
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
				const oldExcludedFolder = plugin.settings.excludeFolders.find(
					(folder) => folder.position === excludedFolder.position,
				);
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
