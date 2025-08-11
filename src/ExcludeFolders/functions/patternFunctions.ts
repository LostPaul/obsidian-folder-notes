import type FolderNotesPlugin from '../../main';
import type { ExcludePattern } from '../ExcludePattern';
import { Setting, Platform } from 'obsidian';
import type { SettingsTab } from '../../settings/SettingsTab';
import { addExcludedFolder, resyncArray, updateExcludedFolder } from './folderFunctions';
import PatternSettings from '../modals/PatternSettings';

const REGEX_PREFIX = '{regex}';
const STAR = '*';
const INDEX_START = 0;
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
		const prefix = string.slice(INDEX_START, SLICE_EXCLUDE_LAST);
		return folderName.startsWith(prefix);
	}
	return false;
}

export function updatePattern(
	plugin: FolderNotesPlugin,
	pattern: ExcludePattern,
	newPattern: ExcludePattern,
): void {
	plugin.settings.excludeFolders = plugin.settings.excludeFolders.filter(
		(folder) => folder.id !== pattern.id,
	);
	addExcludedFolder(plugin, newPattern);
}

export async function deletePattern(
	plugin: FolderNotesPlugin,
	pattern: ExcludePattern,
): Promise<void> {
	plugin.settings.excludeFolders = plugin.settings.excludeFolders.filter(
		(folder) => folder.id !== pattern.id || folder.type === 'folder',
	);
	await plugin.saveSettings(true);
	resyncArray(plugin);
}

export function getExcludedFoldersByPattern(
	plugin: FolderNotesPlugin,
	folderName: string,
): ExcludePattern[] {
	return plugin.settings.excludeFolders
		.filter((s) => s.type === 'pattern')
		.filter((pattern) => matchesPatternSpec(pattern.string, folderName)) as ExcludePattern[];
}

export function getExcludedFolderByPattern(
	plugin: FolderNotesPlugin,
	folderName: string,
): ExcludePattern | undefined {
	return (
		plugin.settings.excludeFolders
			.filter((s) => s.type === 'pattern')
			.find((pattern) => matchesPatternSpec(pattern.string, folderName))
	) as ExcludePattern | undefined;
}

export function addExcludePatternListItem(
	settings: SettingsTab,
	containerEl: HTMLElement,
	pattern: ExcludePattern,
): void {
	const { plugin } = settings;
	const setting = new Setting(containerEl);
	setting.setClass('fn-exclude-folder-list');
	setting.addSearch((cb) => {
		// @ts-expect-error Obsidian's public types don't include containerEl on this control
		cb.containerEl.addClass('fn-exclude-folder-path');
		cb.setPlaceholder('Pattern');
		cb.setValue(pattern.string);
		cb.onChange((value) => {
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

	if (Platform.isDesktop || Platform.isTablet) {
		setting.addButton((cb) => {
			cb.setIcon('up-chevron-glyph');
			cb.setTooltip('Move up');
			cb.onClick(() => {
				if (pattern.position === 0) { return; }
				pattern.position -= 1;
				updatePattern(plugin, pattern, pattern);
				const oldPattern = plugin.settings.excludeFolders.find(
					(folder) => folder.position === pattern.position,
				);
				if (oldPattern) {
					oldPattern.position += 1;
					if (oldPattern.type === 'pattern') {
						const pat = oldPattern as ExcludePattern;
						updatePattern(
							plugin,
							pat,
							pat,
						);
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
				const oldPattern = plugin.settings.excludeFolders.find(
					(folder) => folder.position === pattern.position,
				);
				if (oldPattern) {
					oldPattern.position -= 1;
					if (oldPattern.type === 'pattern') {
						const pat = oldPattern as ExcludePattern;
						updatePattern(
							plugin,
							pat,
							pat,
						);
					} else {
						updateExcludedFolder(plugin, oldPattern, oldPattern);
					}
				}
				settings.display();
			});
		});
	}

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
