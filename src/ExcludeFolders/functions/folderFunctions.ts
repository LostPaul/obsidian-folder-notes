import FolderNotesPlugin from '../../main';
import { getFolderNameFromPathString, getFolderPathFromString } from '../../functions/utils';
import { ExcludedFolder } from '../ExcludeFolder';
import { ExcludePattern } from '../ExcludePattern';
import { Setting } from 'obsidian';
import { FolderSuggest } from '../../suggesters/FolderSuggester';
import { SettingsTab } from '../../settings/SettingsTab';
import ExcludedFolderSettings from '../modals/ExcludeFolderSettings';
import { updatePattern, getExcludedFolderByPattern, addExcludePatternListItem } from './patternFunctions';

export function getExcludedFolder(plugin: FolderNotesPlugin, path: string) {
	console.log('get excluded folder', path);
	const folderName = getFolderNameFromPathString(path);
	const matchedPattern = getExcludedFolderByPattern(plugin, folderName);
	if (matchedPattern) { return matchedPattern; }
	console.log('test 3', path);
	console.log('test 4', folderName)
	const excludedFolder = getExcludedFolderByPath(plugin, path);
	if (excludedFolder?.path === '') { return; }
	return excludedFolder;
}

export function getExcludedFolderByPath(plugin: FolderNotesPlugin, path: string) {
	return plugin.settings.excludeFolders.find((excludedFolder) => {
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

export function addExcludedFolder(plugin: FolderNotesPlugin, excludedFolder: ExcludedFolder) {
	plugin.settings.excludeFolders.push(excludedFolder);
	plugin.saveSettings(true);
}

export function deleteExcludedFolder(plugin: FolderNotesPlugin, excludedFolder: ExcludedFolder) {
	plugin.settings.excludeFolders = plugin.settings.excludeFolders.filter((folder) => folder.path !== excludedFolder.path || folder.type === 'pattern');
	plugin.saveSettings(true);
	resyncArray(plugin);
}

export function updateExcludedFolder(plugin: FolderNotesPlugin, excludedFolder: ExcludePattern, newExcludeFolder: ExcludePattern) {
	plugin.settings.excludeFolders = plugin.settings.excludeFolders.filter((folder) => folder.path !== excludedFolder.path);
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
			plugin
		);
		// @ts-ignore
		cb.containerEl.addClass('fn-exclude-folder-path');
		cb.setPlaceholder('Folder path');
		cb.setValue(excludedFolder.path);
		cb.onChange((value) => {
			if (value.startsWith('{regex}') || value.includes('*')) {
				deleteExcludedFolder(plugin, excludedFolder);
				const pattern = new ExcludePattern(value, plugin.settings.excludeFolders.length, plugin);
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