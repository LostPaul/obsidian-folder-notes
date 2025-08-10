import type FolderNotesPlugin from '../../main';
import { Setting } from 'obsidian';
import type { SettingsTab } from '../../settings/SettingsTab';
import { resyncArray } from './folderFunctions';
import WhitelistPatternSettings from '../modals/WhitelistPatternSettings';
import type { WhitelistedPattern } from '../WhitelistPattern';
import { addWhitelistedFolder, updateWhitelistedFolder } from './whitelistFolderFunctions';

const REGEX_PREFIX = '{regex}';
const STAR = '*';
const SLICE_START_ONE = 1;
const SLICE_EXCLUDE_LAST = -1;

function matchesPatternSpec(raw: string | undefined, folderName: string): boolean {
	if (!raw) return false;
	const string = raw.trim();
	const isRegex = string.startsWith(REGEX_PREFIX);
	const hasStartStar = string.startsWith(STAR);
	const hasEndStar = string.endsWith(STAR);
	if (!isRegex && !(hasStartStar || hasEndStar)) return false;

	if (isRegex) {
		const body = string.replace(REGEX_PREFIX, '').trim();
		if (body === '') return false;
		try {
			return new RegExp(body).test(folderName);
		} catch {
			return false;
		}
	}

	if (hasStartStar && hasEndStar) {
		const inner = string.slice(SLICE_START_ONE, SLICE_EXCLUDE_LAST);
		return folderName.includes(inner);
	}
	if (hasStartStar) {
		const suffix = string.slice(SLICE_START_ONE);
		return folderName.endsWith(suffix);
	}
	if (hasEndStar) {
		const prefix = string.slice(0, SLICE_EXCLUDE_LAST);
		return folderName.startsWith(prefix);
	}
	return false;
}

export function updateWhitelistedPattern(
	plugin: FolderNotesPlugin,
	pattern: WhitelistedPattern,
	newPattern: WhitelistedPattern,
): void {
	plugin.settings.whitelistFolders = plugin.settings.whitelistFolders.filter(
		(folder) => folder.id !== pattern.id,
	);
	addWhitelistedFolder(plugin, newPattern);
}

export async function deletePattern(
	plugin: FolderNotesPlugin,
	pattern: WhitelistedPattern,
): Promise<void> {
	plugin.settings.whitelistFolders = plugin.settings.whitelistFolders.filter(
		(folder) => folder.id !== pattern.id || folder.type === 'folder',
	);
	await plugin.saveSettings(true);
	resyncArray(plugin);
}

export function getWhitelistedFolderByPattern(
	plugin: FolderNotesPlugin,
	folderName: string,
): WhitelistedPattern | undefined {
	return (
		plugin.settings.whitelistFolders
			.filter((s) => s.type === 'pattern')
			.find((pattern) => matchesPatternSpec(pattern.string, folderName))
	) as WhitelistedPattern | undefined;
}

export function getWhitelistedFoldersByPattern(
	plugin: FolderNotesPlugin,
	folderName: string,
): WhitelistedPattern[] {
	return (
		plugin.settings.whitelistFolders
			.filter((s) => s.type === 'pattern')
			.filter((pattern) => matchesPatternSpec(pattern.string, folderName))
	) as WhitelistedPattern[];
}

export function addWhitelistedPatternListItem(
	settings: SettingsTab,
	containerEl: HTMLElement,
	pattern: WhitelistedPattern,
): void {
	const { plugin } = settings;
	const setting = new Setting(containerEl);
	setting.setClass('fn-exclude-folder-list');
	setting.addSearch((cb) => {
		// @ts-expect-error Obsidian's public types don't expose containerEl on this control
		cb.containerEl.addClass('fn-exclude-folder-path');
		cb.setPlaceholder('Pattern');
		cb.setValue(pattern.string);
		cb.onChange((value) => {
			const exists = plugin.settings.whitelistFolders.some(
				(folder) => folder.string === value,
			);
			if (exists) { return; }
			pattern.string = value;
			updateWhitelistedPattern(plugin, pattern, pattern);
		});
	});
	setting.addButton((cb) => {
		cb.setIcon('edit');
		cb.setTooltip('Edit pattern');
		cb.onClick(() => {
			new WhitelistPatternSettings(plugin.app, plugin, pattern).open();
		});
	});

	setting.addButton((cb) => {
		cb.setIcon('up-chevron-glyph');
		cb.setTooltip('Move up');
		cb.onClick(() => {
			if (pattern.position === 0) { return; }
			pattern.position -= 1;
			updateWhitelistedPattern(plugin, pattern, pattern);
			const oldPattern = plugin.settings.whitelistFolders.find(
				(folder) => folder.position === pattern.position,
			);
			if (oldPattern) {
				oldPattern.position += 1;
				if (oldPattern.type === 'pattern') {
					updateWhitelistedPattern(
						plugin,
						oldPattern as WhitelistedPattern,
						oldPattern as WhitelistedPattern,
					);
				} else {
					updateWhitelistedFolder(plugin, oldPattern, oldPattern);
				}
			}
			settings.display();
		});
	});

	setting.addButton((cb) => {
		cb.setIcon('down-chevron-glyph');
		cb.setTooltip('Move down');
		cb.onClick(() => {
			if (pattern.position === plugin.settings.whitelistFolders.length - 1) {
				return;
			}
			pattern.position += 1;

			updateWhitelistedPattern(plugin, pattern, pattern);
			const oldPattern = plugin.settings.whitelistFolders.find(
				(folder) => folder.position === pattern.position,
			);
			if (oldPattern) {
				oldPattern.position -= 1;
				if (oldPattern.type === 'pattern') {
					updateWhitelistedPattern(
						plugin,
						oldPattern as WhitelistedPattern,
						oldPattern as WhitelistedPattern,
					);
				} else {
					updateWhitelistedFolder(plugin, oldPattern, oldPattern);
				}
			}
			settings.display();
		});
	});

	setting.addButton((cb) => {
		cb.setIcon('trash-2');
		cb.setTooltip('Delete pattern');
		cb.onClick(() => {
			void deletePattern(plugin, pattern);
			setting.clear();
			setting.settingEl.remove();
		});
	});
}
