import { Modal, Setting, type App } from 'obsidian';
import type FolderNotesPlugin from '../../main';
import type { WhitelistedFolder } from '../WhitelistFolder';
export default class WhitelistFolderSettings extends Modal {
	plugin: FolderNotesPlugin;
	app: App;
	whitelistedFolder: WhitelistedFolder;
	constructor(app: App, plugin: FolderNotesPlugin, whitelistedFolder: WhitelistedFolder) {
		super(app);
		this.plugin = plugin;
		this.app = app;
		this.whitelistedFolder = whitelistedFolder;
	}

	onOpen(): void {
		this.display();
	}

	display(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: 'Whitelisted folder settings' });
		new Setting(contentEl)
			.setName('Include subfolders')
			.setDesc('Choose if the subfolders of the folder should also be whitelisted')
			.addToggle((toggle) =>
				toggle
					.setValue(this.whitelistedFolder.subFolders)
					.onChange(async (value) => {
						this.whitelistedFolder.subFolders = value;
						await this.plugin.saveSettings(true);
					}),
			);

		new Setting(contentEl)
			.setName('Enable folder name sync')
			// eslint-disable-next-line max-len
			.setDesc('Choose if the name of a folder note should be renamed when the folder name is changed')
			.addToggle((toggle) =>
				toggle
					.setValue(this.whitelistedFolder.enableSync)
					.onChange(async (value) => {
						this.whitelistedFolder.enableSync = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(contentEl)
			.setName('Show folder in folder overview')
			.setDesc('Choose if the folder should be shown in the folder overview')
			.addToggle((toggle) =>
				toggle
					.setValue(this.whitelistedFolder.showInFolderOverview)
					.onChange(async (value) => {
						this.whitelistedFolder.showInFolderOverview = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(contentEl)
			.setName('Hide folder note in file explorer')
			.setDesc('Choose if the folder note should be hidden in the file explorer')
			.addToggle((toggle) =>
				toggle
					.setValue(this.whitelistedFolder.hideInFileExplorer)
					.onChange(async (value) => {
						this.whitelistedFolder.hideInFileExplorer = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(contentEl)
			.setName('Allow auto creation of folder notes in this folder')
			.addToggle((toggle) =>
				toggle
					.setValue(this.whitelistedFolder.enableAutoCreate)
					.onChange(async (value) => {
						this.whitelistedFolder.enableAutoCreate = value;
						await this.plugin.saveSettings();
					}),
			);


		new Setting(contentEl)
			.setName('Open folder note when clicking on the folder')
			.setDesc('Choose if the folder note should be opened when the folder is opened')
			.addToggle((toggle) =>
				toggle
					.setValue(this.whitelistedFolder.enableFolderNote)
					.onChange(async (value) => {
						this.whitelistedFolder.enableFolderNote = value;
						await this.plugin.saveSettings(true);
						this.display();
					}),
			);

		if (this.whitelistedFolder.enableFolderNote) {
			new Setting(contentEl)
				.setName('Don\'t collapse folder when opening folder note')
				.setDesc('Choose if the folder should be collapsed when the folder note is opened')
				.addToggle((toggle) =>
					toggle
						.setValue(this.whitelistedFolder.disableCollapsing)
						.onChange(async (value) => {
							this.whitelistedFolder.disableCollapsing = value;
							await this.plugin.saveSettings();
						}),
				);
		}

	}
	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
