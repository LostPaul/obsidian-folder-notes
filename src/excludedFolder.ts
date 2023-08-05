import { Setting } from 'obsidian';
import FolderNotesPlugin from './main';
import ExcludedFolderSettings from './modals/excludeFolderSettings';
import { FolderSuggest } from './suggesters/FolderSuggester';
import { SettingsTab } from './settings';
import PatternSettings from './modals/patternSettings';

export class ExcludedFolder {
	type: string;
	path: string;
	string: string;
	subFolders: boolean;
	disableSync: boolean;
	disableAutoCreate: boolean;
	disableFolderNote: boolean;
	enableCollapsing: boolean;
	position: number;
	constructor(path: string, position: number) {
		this.type = 'folder';
		this.path = path;
		this.subFolders = true;
		this.disableSync = true;
		this.disableAutoCreate = true;
		this.disableFolderNote = false;
		this.enableCollapsing = false;
		this.position = position;
		this.string = '';
	}
}

export class ExcludePattern {
	type: string;
	string: string;
	path: string;
	position: number;
	subFolders: boolean;
	disableSync: boolean;
	disableAutoCreate: boolean;
	disableFolderNote: boolean;
	enableCollapsing: boolean;
	constructor(pattern: string, position: number) {
		this.type = 'pattern';
		this.string = pattern;
		this.position = position;
		this.subFolders = false;
		this.disableSync = true;
		this.disableAutoCreate = true;
		this.disableFolderNote = false;
		this.enableCollapsing = false;
		this.path = '';
	}
}

export function getExcludedFolder(plugin: FolderNotesPlugin, path: string) {
	const folderName = plugin.getFolderNameFromPathString(path);
	const matchedPattern = getExcludedFolderByPattern(plugin, folderName);
	console.log(matchedPattern);
	if (matchedPattern) { return matchedPattern; }
	const excludedFolder = getExcludedFolderByPath(plugin, path);
	if (excludedFolder?.path === '') { return; }
	return excludedFolder;
}

export function getExcludedFolderByPattern(plugin: FolderNotesPlugin, folderName: string) {
	return plugin.settings.excludeFolders.filter((s) => s.path === '').find((pattern) => {
		if (!pattern.string) { return false; }
		if (pattern.string.toLocaleLowerCase().startsWith('{regex}') && pattern.string.slice(7).trim() !== '') {
			const match = new RegExp(pattern.string.slice(7).trim()).exec(folderName);
			if (match) {
				return true;
			}
		} else if (pattern.string.startsWith('*') && pattern.string.endsWith('*')) {
			if (folderName.includes(pattern.string.slice(1, -1))) {
				return true;
			}
		} else if (pattern.string.startsWith('*')) {
			if (folderName.endsWith(pattern.string.slice(1))) {
				return true;
			}
		} else if (pattern.string.endsWith('*')) {
			if (folderName.startsWith(pattern.string.slice(0, -1))) {
				return true;
			}
		}
	});
}

export function getExcludedFolderByPath(plugin: FolderNotesPlugin, path: string) {
	return plugin.settings.excludeFolders.find((excludedFolder) => {
		if (excludedFolder.path === path) { return true; }
		if (!excludedFolder.subFolders) { return false; }
		return plugin.getFolderPathFromString(path).startsWith(excludedFolder.path);
	});
}

export function addExcludedFolder(plugin: FolderNotesPlugin, excludedFolder: ExcludedFolder) {
	plugin.settings.excludeFolders.push(excludedFolder);
	plugin.saveSettings();
}

export function deleteExcludedFolder(plugin: FolderNotesPlugin, excludedFolder: ExcludedFolder) {
	plugin.settings.excludeFolders = plugin.settings.excludeFolders.filter((folder) => folder.path !== excludedFolder.path || folder.type === 'pattern');
	plugin.saveSettings();
	resyncArray(plugin);
}

export function deletePattern(plugin: FolderNotesPlugin, pattern: ExcludePattern) {
	plugin.settings.excludeFolders = plugin.settings.excludeFolders.filter((folder) => folder.string !== pattern.string || folder.type === 'folder');
	plugin.saveSettings();
	resyncArray(plugin);
}

export function updateExcludedFolder(plugin: FolderNotesPlugin, excludedFolder: ExcludePattern, newExcludeFolder: ExcludePattern) {
	plugin.settings.excludeFolders = plugin.settings.excludeFolders.filter((folder) => folder.path !== excludedFolder.path);
	addExcludedFolder(plugin, newExcludeFolder);
}

export function updatePattern(plugin: FolderNotesPlugin, pattern: ExcludePattern, newPattern: ExcludePattern) {
	plugin.settings.excludeFolders = plugin.settings.excludeFolders.filter((folder) => folder.string !== pattern.string);
	addExcludedFolder(plugin, newPattern);
}

function resyncArray(plugin: FolderNotesPlugin) {
	plugin.settings.excludeFolders = plugin.settings.excludeFolders.sort((a, b) => a.position - b.position);
	plugin.settings.excludeFolders.forEach((folder, index) => {
		folder.position = index;
	});
	plugin.saveSettings();
}

export function addExcludePatternListItem(settings: SettingsTab, containerEl: HTMLElement, pattern: ExcludePattern) {
	const plugin: FolderNotesPlugin = settings.plugin;
	const setting = new Setting(containerEl);
	setting.setClass('fn-exclude-folder-list');
	setting.addSearch((cb) => {
		// @ts-ignore
		cb.containerEl.addClass('fn-exclude-folder-path');
		cb.setPlaceholder('Pattern');
		cb.setValue(pattern.string);
		cb.onChange((value) => {
			if (plugin.settings.excludeFolders.find((folder) => folder.string === value)) { return; }
			pattern.string = value;
			updatePattern(plugin, pattern, pattern);
		});
	});
	setting.addButton((cb) => {
		cb.setIcon('edit');
		cb.setTooltip('Edit pattern');
		cb.onClick(() => {
			new PatternSettings(plugin.app, plugin, pattern).open();
		});
	});

	setting.addButton((cb) => {
		cb.setIcon('up-chevron-glyph');
		cb.setTooltip('Move up');
		cb.onClick(() => {
			if (pattern.position === 0) { return; }
			pattern.position -= 1;
			updatePattern(plugin, pattern, pattern);
			const oldPattern = plugin.settings.excludeFolders.find((folder) => folder.position === pattern.position);
			if (oldPattern) {
				oldPattern.position += 1;
				if (oldPattern.type === 'pattern') {
					updatePattern(plugin, oldPattern, oldPattern);
				} else {
					updateExcludedFolder(plugin, oldPattern, oldPattern);
				}
			}
			settings.display();
		});
	});
	setting.addButton((cb) => {
		cb.setIcon('down-chevron-glyph');
		cb.setTooltip('Move down');
		cb.onClick(() => {
			if (pattern.position === plugin.settings.excludeFolders.length - 1) {
				return;
			}
			pattern.position += 1;

			updatePattern(plugin, pattern, pattern);
			const oldPattern = plugin.settings.excludeFolders.find((folder) => folder.position === pattern.position);
			if (oldPattern) {
				oldPattern.position -= 1;
				if (oldPattern.type === 'pattern') {
					updatePattern(plugin, oldPattern, oldPattern);
				} else {
					updateExcludedFolder(plugin, oldPattern, oldPattern);
				}
			}
			settings.display();
		});
	});
	setting.addButton((cb) => {
		cb.setIcon('trash-2');
		cb.setTooltip('Delete pattern');
		cb.onClick(() => {
			deletePattern(plugin, pattern);
			setting.clear();
			setting.settingEl.remove();
		});
	});
}

export function addExcludeFolderListItem(settings: SettingsTab, containerEl: HTMLElement, excludedFolder: ExcludedFolder) {
	const plugin: FolderNotesPlugin = settings.plugin;
	const setting = new Setting(containerEl);
	setting.setClass('fn-exclude-folder-list');
	setting.addSearch((cb) => {
		new FolderSuggest(
			cb.inputEl,
			plugin
		);
		// @ts-ignore
		cb.containerEl.addClass('fn-exclude-folder-path');
		cb.setPlaceholder('Folder path');
		cb.setValue(excludedFolder.path);
		cb.onChange((value) => {
			if (value.startsWith('{regex}') || value.includes('*')) {
				deleteExcludedFolder(plugin, excludedFolder);
				const pattern = new ExcludePattern(value, plugin.settings.excludeFolders.length);
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
