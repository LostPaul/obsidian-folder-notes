export {}
// import { App, ButtonComponent, Modal, Setting, TFolder, Notice } from 'obsidian';
// import { SettingsTab } from 'src/settings/SettingsTab';
// import FolderNotesPlugin from '../../main';
// import { WhitelistedFolder } from '../WhitelistFolder';
// export default class ExcludedFoldersWhitelist extends Modal {
// 	plugin: FolderNotesPlugin;
// 	app: App;
// 	settingsTab: SettingsTab;
// 	constructor(app: App, plugin: FolderNotesPlugin) {
// 		super(app);
// 		this.plugin = plugin;
// 		this.settingsTab = plugin.settingsTab
// 	}
// 	onOpen() {

// 		const { contentEl } = this;
// 		contentEl.createEl('h2', { text: 'Manage whitelisted folders' });

// 		new Setting(contentEl)
// 			.setName('Add excluded folder')
// 			.setClass('add-exclude-folder-item')
// 			.addButton((cb) => {
// 				cb.setIcon('plus');
// 				cb.setClass('add-exclude-folder');
// 				cb.setTooltip('Add whitelisted folder');
// 				cb.onClick(() => {
// 					const whitelistedFolder = new WhitelistedFolder('', this.plugin.settings.whitelistFolders.length, this.plugin);
// 					addWhitelistFolderListItem(this.plugin.settingsTab, contentEl, whitelistedFolder);
// 					addWhitelistedFolder(this.plugin, whitelistedFolder);
// 					this.settingsTab.display();
// 				});
// 			});
// 		this.plugin.settings.whitelistFolders.sort((a, b) => a.position - b.position).forEach((whitelistedFolder) => {
// 			if (whitelistedFolder.string?.trim() !== '' && whitelistedFolder.path?.trim() === '') {
// 				addWhitelistPatternListItem(this.settingsTab, contentEl, whitelistedFolder);
// 			} else {
// 				addExcludeFolderListItem(this.settingsTab, contentEl, whitelistedFolder);
// 			}
// 		});
// 	}

// 	onClose() {
// 		const { contentEl } = this;
// 		contentEl.empty();
// 	}
// }