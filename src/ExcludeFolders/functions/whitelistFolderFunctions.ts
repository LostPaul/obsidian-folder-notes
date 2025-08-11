import type FolderNotesPlugin from '../../main';
import { getFolderNameFromPathString, getFolderPathFromString } from '../../functions/utils';
import type { WhitelistedFolder } from '../WhitelistFolder';
import { WhitelistedPattern } from '../WhitelistPattern';
import { Setting, ButtonComponent } from 'obsidian';
import { FolderSuggest } from '../../suggesters/FolderSuggester';
import type { SettingsTab } from '../../settings/SettingsTab';
import WhitelistFolderSettings from '../modals/WhitelistFolderSettings';
import {
	updateWhitelistedPattern,
	getWhitelistedFoldersByPattern,
	addWhitelistedPatternListItem,
} from './whitelistPatternFunctions';

export function getWhitelistedFolder(
	plugin: FolderNotesPlugin,
	path: string,
): WhitelistedFolder | WhitelistedPattern | undefined {
	let whitelistedFolder: Partial<WhitelistedFolder> | undefined = {};
	const folderName = getFolderNameFromPathString(path);
	const matchedPatterns = getWhitelistedFoldersByPattern(plugin, folderName);
	const whitelistedFolders = getWhitelistedFoldersByPath(plugin, path);
	const combinedWhitelistedFolders = [...matchedPatterns, ...whitelistedFolders];
	const propertiesToCopy: (keyof WhitelistedFolder)[] = [
		'enableAutoCreate',
		'enableFolderNote',
		'enableSync',
		'showInFolderOverview',
	];

	if (combinedWhitelistedFolders.length > 0) {
		for (const matchedFolder of combinedWhitelistedFolders) {
			propertiesToCopy.forEach((property) => {
				const value = (matchedFolder as Partial<WhitelistedFolder>)[property];
				if (value === true) {
					(whitelistedFolder as Partial<WhitelistedFolder>)[property] = true as never;
				} else if (!value) {
					(whitelistedFolder as Partial<WhitelistedFolder>)[property] = false as never;
				}
			});
		}
	}

	if (
		whitelistedFolder
		&& Object.keys(whitelistedFolder).length === 0
	) {
		whitelistedFolder = undefined;
	}

	return whitelistedFolder as WhitelistedFolder | WhitelistedPattern | undefined;
}

export function getWhitelistedFolderByPath(
	plugin: FolderNotesPlugin,
	path: string,
): WhitelistedFolder | WhitelistedPattern | undefined {
	return plugin.settings.whitelistFolders.find((whitelistedFolder) => {
		if (whitelistedFolder.path === path) { return true; }
		if (!whitelistedFolder.subFolders) { return false; }
		return getFolderPathFromString(path).startsWith(whitelistedFolder.path);
	});
}

export function getWhitelistedFoldersByPath(
	plugin: FolderNotesPlugin,
	path: string,
): Array<WhitelistedFolder | WhitelistedPattern> {
	return plugin.settings.whitelistFolders.filter((whitelistedFolder) => {
		if (whitelistedFolder.path === path) { return true; }
		if (!whitelistedFolder.subFolders) { return false; }
		return getFolderPathFromString(path).startsWith(whitelistedFolder.path);
	});
}

export function addWhitelistedFolder(
	plugin: FolderNotesPlugin,
	whitelistedFolder: WhitelistedFolder | WhitelistedPattern,
): void {
	plugin.settings.whitelistFolders.push(whitelistedFolder);
	void plugin.saveSettings(true);
}

export async function deleteWhitelistedFolder(
	plugin: FolderNotesPlugin,
	whitelistedFolder: WhitelistedFolder | WhitelistedPattern,
): Promise<void> {
	plugin.settings.whitelistFolders = plugin.settings.whitelistFolders.filter(
		(folder) => folder.id !== whitelistedFolder.id || folder.type === 'pattern',
	);
	await plugin.saveSettings(true);
	resyncArray(plugin);
}

export function updateWhitelistedFolder(
	plugin: FolderNotesPlugin,
	whitelistedFolder: WhitelistedFolder,
	newWhitelistFolder: WhitelistedFolder,
): void {
	plugin.settings.whitelistFolders = plugin.settings.whitelistFolders.filter(
		(folder) => folder.id !== whitelistedFolder.id,
	);
	addWhitelistedFolder(plugin, newWhitelistFolder);
}

export function resyncArray(plugin: FolderNotesPlugin): void {
	plugin.settings.whitelistFolders = plugin.settings.whitelistFolders.sort(
		(a, b) => a.position - b.position,
	);
	plugin.settings.whitelistFolders.forEach((folder, index) => {
		folder.position = index;
	});
	void plugin.saveSettings();
}

export function addWhitelistFolderListItem(
	settings: SettingsTab,
	containerEl: HTMLElement,
	whitelistedFolder: WhitelistedFolder,
): void {
	const { plugin } = settings;
	const setting = new Setting(containerEl);
	setting.setClass('fn-exclude-folder-list');

	const inputContainer = setting.settingEl.createDiv({
		cls: 'fn-whitelist-folder-input-container',
	});
	const SearchComponent = new Setting(inputContainer);
	SearchComponent.addSearch((cb) => {
		new FolderSuggest(
			cb.inputEl,
			plugin,
			true,
		);
		// @ts-expect-error Obsidian's public types don't include this property
		cb.containerEl.addClass('fn-exclude-folder-path');
		cb.setPlaceholder('Folder path');
		cb.setValue(whitelistedFolder.path);
		cb.onChange((value) => {
			if (value.startsWith('{regex}') || value.includes('*')) {
				void deleteWhitelistedFolder(plugin, whitelistedFolder);
				const pattern = new WhitelistedPattern(
					value,
					plugin.settings.whitelistFolders.length,
					undefined,
					plugin,
				);
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
			const oldWhitelistedFolder = plugin.settings.whitelistFolders.find(
				(folder) => folder.position === whitelistedFolder.position,
			);
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
			const oldWhitelistedFolder = plugin.settings.whitelistFolders.find(
				(folder) => folder.position === whitelistedFolder.position,
			);
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
			void deleteWhitelistedFolder(plugin, whitelistedFolder);
			setting.clear();
			setting.settingEl.remove();
		});
}
