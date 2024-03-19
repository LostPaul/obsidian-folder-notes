// import FolderNotesPlugin from '../../main';
// import { getFolderNameFromPathString, getFolderPathFromString } from '../../functions/utils';
// import { WhitelistedFolder } from '../WhitelistFolder';
// import { WhitelistedPattern } from '../WhitelistPattern';
// import { Setting } from 'obsidian';
// import { FolderSuggest } from '../../suggesters/FolderSuggester';
// import { SettingsTab } from '../../settings/SettingsTab';
// import WhitelistedFolderSettings from '../modals/WhitelistFolderSettings';
// import { updatePattern, getWhitelistedFolderByPattern, addWhitelistPatternListItem } from './patternFunctions';

// export function getWhitelistedFolder(plugin: FolderNotesPlugin, path: string) {
// 	const folderName = getFolderNameFromPathString(path);
// 	const matchedPattern = getWhitelistedFolderByPattern(plugin, folderName);
// 	if (matchedPattern) { return matchedPattern; }
// 	const whitelistedFolder = getWhitelistedFolderByPath(plugin, path);
// 	if (whitelistedFolder?.path === '') { return; }
// 	return whitelistedFolder;
// }

// export function getWhitelistedFolderByPath(plugin: FolderNotesPlugin, path: string) {
// 	return plugin.settings.whitelistFolders.find((whitelistedFolder) => {
// 		if (whitelistedFolder.path === path) { return true; }
// 		if (!whitelistedFolder.subFolders) { return false; }
// 		return getFolderPathFromString(path).startsWith(whitelistedFolder.path);
// 	});
// }

// export function addWhitelistedFolder(plugin: FolderNotesPlugin, whitelistedFolder: WhitelistedFolder) {
// 	plugin.settings.whitelistFolders.push(whitelistedFolder);
// 	plugin.saveSettings();
// }

// export function deleteWhitelistedFolder(plugin: FolderNotesPlugin, whitelistedFolder: WhitelistedFolder) {
// 	plugin.settings.whitelistFolders = plugin.settings.whitelistFolders.filter((folder) => folder.path !== whitelistedFolder.path || folder.type === 'pattern');
// 	plugin.saveSettings();
// 	resyncArray(plugin);
// }

// export function updateWhitelistedFolder(plugin: FolderNotesPlugin, whitelistedFolder: WhitelistPattern, newWhitelistFolder: WhitelistPattern) {
// 	plugin.settings.whitelistFolders = plugin.settings.whitelistFolders.filter((folder) => folder.path !== whitelistedFolder.path);
// 	addWhitelistedFolder(plugin, newWhitelistFolder);
// }

// export function resyncArray(plugin: FolderNotesPlugin) {
// 	plugin.settings.whitelistFolders = plugin.settings.whitelistFolders.sort((a, b) => a.position - b.position);
// 	plugin.settings.whitelistFolders.forEach((folder, index) => {
// 		folder.position = index;
// 	});
// 	plugin.saveSettings();
// }


// export function addWhitelistFolderListItem(settings: SettingsTab, containerEl: HTMLElement, whitelistedFolder: WhitelistedFolder) {
// 	const plugin: FolderNotesPlugin = settings.plugin;
// 	const setting = new Setting(containerEl);
// 	setting.setClass('fn-exclude-folder-list');
// 	setting.addSearch((cb) => {
// 		new FolderSuggest(
// 			cb.inputEl,
// 			plugin
// 		);
// 		// @ts-ignore
// 		cb.containerEl.addClass('fn-exclude-folder-path');
// 		cb.setPlaceholder('Folder path');
// 		cb.setValue(whitelistedFolder.path);
// 		cb.onChange((value) => {
// 			if (value.startsWith('{regex}') || value.includes('*')) {
// 				deleteWhitelistedFolder(plugin, whitelistedFolder);
// 				const pattern = new WhitelistPattern(value, plugin.settings.whitelistFolders.length, plugin);
// 				addWhitelistedFolder(plugin, pattern);
// 				addWhitelistPatternListItem(settings, containerEl, pattern);
// 				setting.clear();
// 				setting.settingEl.remove();
// 			}
// 			if (!plugin.app.vault.getAbstractFileByPath(value)) return;
// 			whitelistedFolder.path = value;
// 			updateWhitelistedFolder(plugin, whitelistedFolder, whitelistedFolder);
// 		});
// 	});

// 	setting.addButton((cb) => {
// 		cb.setIcon('edit');
// 		cb.setTooltip('Edit folder note');
// 		cb.onClick(() => {
// 			new WhitelistedFolderSettings(plugin.app, plugin, whitelistedFolder).open();
// 		});
// 	});

// 	setting.addButton((cb) => {
// 		cb.setIcon('up-chevron-glyph');
// 		cb.setTooltip('Move up');
// 		cb.onClick(() => {
// 			if (whitelistedFolder.position === 0) { return; }
// 			whitelistedFolder.position -= 1;
// 			updateWhitelistedFolder(plugin, whitelistedFolder, whitelistedFolder);
// 			const oldWhitelistedFolder = plugin.settings.whitelistFolders.find((folder) => folder.position === whitelistedFolder.position);
// 			if (oldWhitelistedFolder) {
// 				oldWhitelistedFolder.position += 1;
// 				if (oldWhitelistedFolder.type === 'pattern') {
// 					updatePattern(plugin, oldWhitelistedFolder, oldWhitelistedFolder);
// 				} else {
// 					updateWhitelistedFolder(plugin, oldWhitelistedFolder, oldWhitelistedFolder);
// 				}
// 			}
// 			settings.display();
// 		});
// 	});

// 	setting.addButton((cb) => {
// 		cb.setIcon('down-chevron-glyph');
// 		cb.setTooltip('Move down');
// 		cb.onClick(() => {
// 			if (whitelistedFolder.position === plugin.settings.whitelistFolders.length - 1) {
// 				return;
// 			}
// 			whitelistedFolder.position += 1;

// 			updateWhitelistedFolder(plugin, whitelistedFolder, whitelistedFolder);
// 			const oldWhitelistedFolder = plugin.settings.whitelistFolders.find((folder) => folder.position === whitelistedFolder.position);
// 			if (oldWhitelistedFolder) {
// 				oldWhitelistedFolder.position -= 1;
// 				if (oldWhitelistedFolder.type === 'pattern') {
// 					updatePattern(plugin, oldWhitelistedFolder, oldWhitelistedFolder);
// 				} else {
// 					updateWhitelistedFolder(plugin, oldWhitelistedFolder, oldWhitelistedFolder);
// 				}
// 			}

// 			settings.display();
// 		});
// 	});

// 	setting.addButton((cb) => {
// 		cb.setIcon('trash-2');
// 		cb.setTooltip('Delete excluded folder');
// 		cb.onClick(() => {
// 			deleteWhitelistedFolder(plugin, whitelistedFolder);
// 			setting.clear();
// 			setting.settingEl.remove();
// 		});
// 	});
// }
