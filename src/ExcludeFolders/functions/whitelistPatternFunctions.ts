export {}
// import FolderNotesPlugin from '../../main';
// import { ExcludePattern } from '../ExcludePattern';
// import { Setting } from 'obsidian';
// import { SettingsTab } from '../../settings/SettingsTab';
// import { addExcludedFolder, resyncArray, updateExcludedFolder } from './folderFunctions';
// import PatternSettings from '../modals/PatternSettings';
// import { WhitelistedPattern } from '../WhitelistPattern';

// export function updatePattern(plugin: FolderNotesPlugin, pattern: ExcludePattern, newPattern: ExcludePattern) {
//     plugin.settings.excludeFolders = plugin.settings.excludeFolders.filter((folder) => folder.string !== pattern.string);
//     addExcludedFolder(plugin, newPattern);
// }

// export function deletePattern(plugin: FolderNotesPlugin, pattern: ExcludePattern) {
//     plugin.settings.excludeFolders = plugin.settings.excludeFolders.filter((folder) => folder.string !== pattern.string || folder.type === 'folder');
//     plugin.saveSettings();
//     resyncArray(plugin);
// }

// export function getExcludedFolderByPattern(plugin: FolderNotesPlugin, folderName: string) {
//     return plugin.settings.excludeFolders.filter((s) => s.type == 'pattern').find((pattern) => {
//         if (!pattern.string) { return false; }
//         const string = pattern.string.trim();
//         if (!string.startsWith('{regex}') && !(string.startsWith('*') || string.endsWith('*'))) { return false; }
//         const regex = string.replace('{regex}', '').trim();
//         if (string.startsWith('{regex}') && regex === '') { return false; }
//         if (regex !== undefined && string.startsWith('{regex}')) {
//             const match = new RegExp(regex).exec(folderName);
//             if (match) {
//                 return true;
//             }
//         } else if (string.startsWith('*') && string.endsWith('*')) {
//             if (folderName.includes(string.slice(1, -1))) {
//                 return true;
//             }
//         } else if (string.startsWith('*')) {
//             if (folderName.endsWith(string.slice(1))) {
//                 return true;
//             }
//         } else if (string.endsWith('*')) {
//             if (folderName.startsWith(string.slice(0, -1))) {
//                 return true;
//             }
//         }
//     });
// }

// export function addExcludePatternListItem(settings: SettingsTab, containerEl: HTMLElement, pattern: WhitelistedPattern) {
//     const plugin: FolderNotesPlugin = settings.plugin;
//     const setting = new Setting(containerEl);
//     setting.setClass('fn-exclude-folder-list');
//     setting.addSearch((cb) => {
//         // @ts-ignore
//         cb.containerEl.addClass('fn-exclude-folder-path');
//         cb.setPlaceholder('Pattern');
//         cb.setValue(pattern.string);
//         cb.onChange((value) => {
//             if (plugin.settings.excludeFolders.find((folder) => folder.string === value)) { return; }
//             pattern.string = value;
//             updatePattern(plugin, pattern, pattern);
//         });
//     });
//     setting.addButton((cb) => {
//         cb.setIcon('edit');
//         cb.setTooltip('Edit pattern');
//         cb.onClick(() => {
//             new PatternSettings(plugin.app, plugin, pattern).open();
//         });
//     });

//     setting.addButton((cb) => {
//         cb.setIcon('up-chevron-glyph');
//         cb.setTooltip('Move up');
//         cb.onClick(() => {
//             if (pattern.position === 0) { return; }
//             pattern.position -= 1;
//             updatePattern(plugin, pattern, pattern);
//             const oldPattern = plugin.settings.excludeFolders.find((folder) => folder.position === pattern.position);
//             if (oldPattern) {
//                 oldPattern.position += 1;
//                 if (oldPattern.type === 'pattern') {
//                     updatePattern(plugin, oldPattern, oldPattern);
//                 } else {
//                     updateExcludedFolder(plugin, oldPattern, oldPattern);
//                 }
//             }
//             settings.display();
//         });
//     });

//     setting.addButton((cb) => {
//         cb.setIcon('down-chevron-glyph');
//         cb.setTooltip('Move down');
//         cb.onClick(() => {
//             if (pattern.position === plugin.settings.excludeFolders.length - 1) {
//                 return;
//             }
//             pattern.position += 1;

//             updatePattern(plugin, pattern, pattern);
//             const oldPattern = plugin.settings.excludeFolders.find((folder) => folder.position === pattern.position);
//             if (oldPattern) {
//                 oldPattern.position -= 1;
//                 if (oldPattern.type === 'pattern') {
//                     updatePattern(plugin, oldPattern, oldPattern);
//                 } else {
//                     updateExcludedFolder(plugin, oldPattern, oldPattern);
//                 }
//             }
//             settings.display();
//         });
//     });

//     setting.addButton((cb) => {
//         cb.setIcon('trash-2');
//         cb.setTooltip('Delete pattern');
//         cb.onClick(() => {
//             deletePattern(plugin, pattern);
//             setting.clear();
//             setting.settingEl.remove();
//         });
//     });
// }