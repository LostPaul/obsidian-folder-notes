import FolderNotesPlugin from '../../main';
import { getFolderNameFromPathString, getFolderPathFromString } from '../../functions/utils';
import { WhitelistedFolder } from '../WhitelistFolder';
import { WhitelistedPattern } from '../WhitelistPattern';
import { Setting, Platform, ButtonComponent } from 'obsidian';
import { FolderSuggest } from '../../suggesters/FolderSuggester';
import { SettingsTab } from '../../settings/SettingsTab';
import WhitelistededFoldersSettings from '../modals/WhitelistedFoldersSettings';
import WhitelistFolderSettings from '../modals/WhitelistFolderSettings';
import { updateWhitelistedPattern, getWhitelistedFoldersByPattern, addWhitelistedPatternListItem } from './whitelistPatternFunctions';
Platform.isMobileApp

export function getWhitelistedFolder(plugin: FolderNotesPlugin, path: string) {
	let whitelistedFolder = {} as WhitelistedFolder | WhitelistedPattern | undefined;
	const folderName = getFolderNameFromPathString(path);
	const matchedPatterns = getWhitelistedFoldersByPattern(plugin, folderName);
	const whitelistedFolders = getWhitelistedFoldersByPath(plugin, path);
	const combinedWhitelistedFolders = [...matchedPatterns, ...whitelistedFolders];
	const propertiesToCopy: (keyof WhitelistedFolder)[] = [
		'enableAutoCreate',
		'enableFolderNote',
		'enableSync',
		'showInFolderOverview'
	];

	if (combinedWhitelistedFolders.length > 0) {
		for (const matchedFolder of combinedWhitelistedFolders) {
			propertiesToCopy.forEach(property => {
				if (matchedFolder[property] === true) {
					(whitelistedFolder as any)[property] = true;
				} else if (!matchedFolder[property]) {
					(whitelistedFolder as any)[property] = false;
				}
			});
		}
	}

	if ((whitelistedFolder instanceof Object) && Object.keys(whitelistedFolder).length === 0) { whitelistedFolder = undefined; }

	return whitelistedFolder;
}

export function getWhitelistedFolderByPath(plugin: FolderNotesPlugin, path: string) {
	return plugin.settings.whitelistFolders.find((whitelistedFolder) => {
		if (whitelistedFolder.path === path) { return true; }
		if (!whitelistedFolder.subFolders) { return false; }
		return getFolderPathFromString(path).startsWith(whitelistedFolder.path);
	});
}

export function getWhitelistedFoldersByPath(plugin: FolderNotesPlugin, path: string) {
	return plugin.settings.whitelistFolders.filter((whitelistedFolder) => {
		if (whitelistedFolder.path === path) { return true; }
		if (!whitelistedFolder.subFolders) { return false; }
		return getFolderPathFromString(path).startsWith(whitelistedFolder.path);
	});
}

export function addWhitelistedFolder(plugin: FolderNotesPlugin, whitelistedFolder: WhitelistedFolder) {
	plugin.settings.whitelistFolders.push(whitelistedFolder);
	plugin.saveSettings(true);
}

export function deleteWhitelistedFolder(plugin: FolderNotesPlugin, whitelistedFolder: WhitelistedFolder) {
	plugin.settings.whitelistFolders = plugin.settings.whitelistFolders.filter((folder) => folder.id !== whitelistedFolder.id || folder.type === 'pattern');
	plugin.saveSettings(true);
	resyncArray(plugin);
}

export function updateWhitelistedFolder(plugin: FolderNotesPlugin, whitelistedFolder: WhitelistedFolder, newWhitelistFolder: WhitelistedFolder) {
	plugin.settings.whitelistFolders = plugin.settings.whitelistFolders.filter((folder) => folder.id !== whitelistedFolder.id);
	addWhitelistedFolder(plugin, newWhitelistFolder);
}

export function resyncArray(plugin: FolderNotesPlugin) {
	plugin.settings.whitelistFolders = plugin.settings.whitelistFolders.sort((a, b) => a.position - b.position);
	plugin.settings.whitelistFolders.forEach((folder, index) => {
		folder.position = index;
	});
	plugin.saveSettings();
}


export function addWhitelistFolderListItem(settings: SettingsTab, containerEl: HTMLElement, whitelistedFolder: WhitelistedFolder) {
	const plugin: FolderNotesPlugin = settings.plugin;
	const setting = new Setting(containerEl);
	setting.setClass('fn-exclude-folder-list');

	const inputContainer = setting.settingEl.createDiv({ cls: 'fn-whitelist-folder-input-container' });
	const SearchComponent = new Setting(inputContainer)
	SearchComponent.addSearch((cb) => {
		new FolderSuggest(
			cb.inputEl,
			plugin,
			true
		);
		// @ts-ignore
		cb.containerEl.addClass('fn-exclude-folder-path');
		cb.setPlaceholder('Folder path');
		cb.setValue(whitelistedFolder.path);
		cb.onChange((value) => {
			if (value.startsWith('{regex}') || value.includes('*')) {
				deleteWhitelistedFolder(plugin, whitelistedFolder);
				const pattern = new WhitelistedPattern(value, plugin.settings.whitelistFolders.length, undefined, plugin);
				addWhitelistedFolder(plugin, pattern);
				addWhitelistedPatternListItem(settings, containerEl, pattern);
				setting.clear();
				setting.settingEl.remove();
			}
			if (!plugin.app.vault.getAbstractFileByPath(value)) return;
			whitelistedFolder.path = value;
			updateWhitelistedFolder(plugin, whitelistedFolder, whitelistedFolder);
		});
	});
	const buttonContainer = setting.settingEl.createDiv({ cls: 'fn-whitelist-folder-buttons' });

	new ButtonComponent(buttonContainer)
		.setIcon('edit')
		.setTooltip('Edit folder note')
		.onClick(() => {
			new WhitelistFolderSettings(plugin.app, plugin, whitelistedFolder).open();
		});

	new ButtonComponent(buttonContainer)
		.setIcon('up-chevron-glyph')
		.setTooltip('Move up')
		.onClick(() => {
			if (whitelistedFolder.position === 0) { return; }
			whitelistedFolder.position -= 1;
			updateWhitelistedFolder(plugin, whitelistedFolder, whitelistedFolder);
			const oldWhitelistedFolder = plugin.settings.whitelistFolders.find((folder) => folder.position === whitelistedFolder.position);
			if (oldWhitelistedFolder) {
				oldWhitelistedFolder.position += 1;
				if (oldWhitelistedFolder.type === 'pattern') {
					updateWhitelistedPattern(plugin, oldWhitelistedFolder, oldWhitelistedFolder);
				} else {
					updateWhitelistedFolder(plugin, oldWhitelistedFolder, oldWhitelistedFolder);
				}
			}
			settings.display();
		});

	new ButtonComponent(buttonContainer)
		.setIcon('down-chevron-glyph')
		.setTooltip('Move down')
		.onClick(() => {
			if (whitelistedFolder.position === plugin.settings.whitelistFolders.length - 1) {
				return;
			}
			whitelistedFolder.position += 1;

			updateWhitelistedFolder(plugin, whitelistedFolder, whitelistedFolder);
			const oldWhitelistedFolder = plugin.settings.whitelistFolders.find((folder) => folder.position === whitelistedFolder.position);
			if (oldWhitelistedFolder) {
				oldWhitelistedFolder.position -= 1;
				if (oldWhitelistedFolder.type === 'pattern') {
					updateWhitelistedPattern(plugin, oldWhitelistedFolder, oldWhitelistedFolder);
				} else {
					updateWhitelistedFolder(plugin, oldWhitelistedFolder, oldWhitelistedFolder);
				}
			}

			settings.display();
		});

	new ButtonComponent(buttonContainer)
		.setIcon('trash-2')
		.setTooltip('Delete excluded folder')
		.onClick(() => {
			deleteWhitelistedFolder(plugin, whitelistedFolder);
			setting.clear();
			setting.settingEl.remove();
		});
}
