import { Modal, Setting, type App } from 'obsidian';
import type { SettingsTab } from 'src/settings/SettingsTab';
import type FolderNotesPlugin from '../../main';
import { WhitelistedFolder } from '../WhitelistFolder';
import {
	addWhitelistFolderListItem,
	addWhitelistedFolder,
} from '../functions/whitelistFolderFunctions';
import { addWhitelistedPatternListItem } from '../functions/whitelistPatternFunctions';

export default class WhitelistedFoldersSettings extends Modal {
	plugin: FolderNotesPlugin;
	app: App;
	settingsTab: SettingsTab;
	constructor(settingsTab: SettingsTab) {
		super(settingsTab.app);
		this.plugin = settingsTab.plugin;
		this.settingsTab = settingsTab;
		this.app = settingsTab.app;
	}

	onOpen(): void {

		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Manage whitelisted folders' });

		new Setting(contentEl)
			.setName('Add whitelisted folder')
			.setClass('add-exclude-folder-item')
			.addButton((cb) => {
				cb.setIcon('plus');
				cb.setClass('add-exclude-folder');
				cb.setTooltip('Add whitelisted folder');
				cb.onClick(() => {
					const whitelistedFolder = new WhitelistedFolder(
						'', this.plugin.settings.whitelistFolders.length,
						undefined, this.plugin,
					);
					addWhitelistFolderListItem(
						this.plugin.settingsTab, contentEl, whitelistedFolder,
					);
					addWhitelistedFolder(this.plugin, whitelistedFolder);
					this.settingsTab.renderSettingsPage(this.settingsTab.plugin.settings.settingsTab);
				});
			});

		this.plugin.settings.whitelistFolders
			.sort((a, b) => a.position - b.position)
			.forEach((whitelistedFolder) => {
				if (whitelistedFolder.string?.trim() !== '' &&
					whitelistedFolder.path?.trim() === '') {
					addWhitelistedPatternListItem(this.settingsTab, contentEl, whitelistedFolder);
				} else {
					addWhitelistFolderListItem(this.settingsTab, contentEl, whitelistedFolder);
				}
			});
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
