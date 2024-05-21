import FolderNotesPlugin from '../../main';
import { Setting } from 'obsidian';
import { SettingsTab } from '../../settings/SettingsTab';
import { addExcludedFolder, resyncArray, updateExcludedFolder } from './folderFunctions';
import WhitelistPatternSettings from '../modals/WhitelistPatternSettings';
import { WhitelistedPattern } from '../WhitelistPattern';
import { addWhitelistedFolder, updateWhitelistedFolder } from './whitelistFolderFunctions';

export function updateWhitelistedPattern(plugin: FolderNotesPlugin, pattern: WhitelistedPattern, newPattern: WhitelistedPattern) {
    plugin.settings.excludeFolders = plugin.settings.excludeFolders.filter((folder) => folder.id !== pattern.id);
    addWhitelistedFolder(plugin, newPattern);
}

export function deletePattern(plugin: FolderNotesPlugin, pattern: WhitelistedPattern) {
    plugin.settings.excludeFolders = plugin.settings.excludeFolders.filter((folder) => folder.id !== pattern.id || folder.type === 'folder');
    plugin.saveSettings();
    resyncArray(plugin);
}

export function getWhitelistedFolderByPattern(plugin: FolderNotesPlugin, folderName: string) {
    return plugin.settings.whitelistFolders.filter((s) => s.type == 'pattern').find((pattern) => {
        if (!pattern.string) { return false; }
        const string = pattern.string.trim();
        if (!string.startsWith('{regex}') && !(string.startsWith('*') || string.endsWith('*'))) { return false; }
        const regex = string.replace('{regex}', '').trim();
        if (string.startsWith('{regex}') && regex === '') { return false; }
        if (regex !== undefined && string.startsWith('{regex}')) {
            const match = new RegExp(regex).exec(folderName);
            if (match) {
                return true;
            }
        } else if (string.startsWith('*') && string.endsWith('*')) {
            if (folderName.includes(string.slice(1, -1))) {
                return true;
            }
        } else if (string.startsWith('*')) {
            if (folderName.endsWith(string.slice(1))) {
                return true;
            }
        } else if (string.endsWith('*')) {
            if (folderName.startsWith(string.slice(0, -1))) {
                return true;
            }
        }
    });
}

export function addWhitelistedPatternListItem(settings: SettingsTab, containerEl: HTMLElement, pattern: WhitelistedPattern) {
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
            const oldPattern = plugin.settings.whitelistFolders.find((folder) => folder.position === pattern.position);
            if (oldPattern) {
                oldPattern.position += 1;
                if (oldPattern.type === 'pattern') {
                    updateWhitelistedPattern(plugin, oldPattern, oldPattern);
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
            if (pattern.position === plugin.settings.excludeFolders.length - 1) {
                return;
            }
            pattern.position += 1;

            updateWhitelistedPattern(plugin, pattern, pattern);
            const oldPattern = plugin.settings.whitelistFolders.find((folder) => folder.position === pattern.position);
            if (oldPattern) {
                oldPattern.position -= 1;
                if (oldPattern.type === 'pattern') {
                    updateWhitelistedPattern(plugin, oldPattern, oldPattern);
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
            deletePattern(plugin, pattern);
            setting.clear();
            setting.settingEl.remove();
        });
    });
}