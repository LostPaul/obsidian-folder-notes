import { App, Modal, Setting } from 'obsidian';
import FolderNotesPlugin from '../../main';
import { ExcludedFolder } from 'src/ExcludeFolders/ExcludeFolder';
export default class ExcludedFolderSettings extends Modal {
	plugin: FolderNotesPlugin;
	app: App;
	excludedFolder: ExcludedFolder;
	constructor(app: App, plugin: FolderNotesPlugin, excludedFolder: ExcludedFolder) {
		super(app);
		this.plugin = plugin;
		this.app = app;
		this.excludedFolder = excludedFolder;
	}
	onOpen() {
		this.display();
	}
	display() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: 'Excluded folder settings' });
		new Setting(contentEl)
			.setName('Include subfolders')
			.setDesc('Choose if the subfolders of the folder should also be excluded')
			.addToggle((toggle) =>
				toggle
					.setValue(this.excludedFolder.subFolders)
					.onChange(async (value) => {
						this.excludedFolder.subFolders = value;
						await this.plugin.saveSettings(true);
					})
			);

		new Setting(contentEl)
			.setName('Disable folder name sync')
			.setDesc('Choose if the folder note should be renamed when the folder name is changed')
			.addToggle((toggle) =>
				toggle
					.setValue(this.excludedFolder.disableSync)
					.onChange(async (value) => {
						this.excludedFolder.disableSync = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(contentEl)
			.setName('Don\'t show folder in folder overview')
			.setDesc('Choose if the folder should be shown in the folder overview')
			.addToggle((toggle) =>
				toggle
					.setValue(this.excludedFolder.excludeFromFolderOverview)
					.onChange(async (value) => {
						this.excludedFolder.excludeFromFolderOverview = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(contentEl)
			.setName('Disable auto creation of folder notes in this folder')
			.setDesc('Choose if a folder note should be created when a new folder is created')
			.addToggle((toggle) =>
				toggle
					.setValue(this.excludedFolder.disableAutoCreate)
					.onChange(async (value) => {
						this.excludedFolder.disableAutoCreate = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(contentEl)
			.setName('Disable open folder note')
			.setDesc('Choose if the folder note should be opened when the folder is opened')
			.addToggle((toggle) =>
				toggle
					.setValue(this.excludedFolder.disableFolderNote)
					.onChange(async (value) => {
						this.excludedFolder.disableFolderNote = value;
						await this.plugin.saveSettings(true);
						this.display();
					})
			);

		if (!this.excludedFolder.disableFolderNote) {
			new Setting(contentEl)
				.setName('Collapse folder when opening folder note')
				.setDesc('Choose if the folder should be collapsed when the folder note is opened')
				.addToggle((toggle) =>
					toggle
						.setValue(this.excludedFolder.enableCollapsing)
						.onChange(async (value) => {
							this.excludedFolder.enableCollapsing = value;
							await this.plugin.saveSettings();
						})
				);
		}

	}
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
