import { App, Modal, Setting } from 'obsidian';
import FolderNotesPlugin from '../main';
import { ExcludePattern } from 'src/excludedFolder';
export default class PatternSettings extends Modal {
	plugin: FolderNotesPlugin;
	app: App;
	pattern: ExcludePattern;
	constructor(app: App, plugin: FolderNotesPlugin, pattern: ExcludePattern) {
		super(app);
		this.plugin = plugin;
		this.app = app;
		this.pattern = pattern;
	}
	onOpen() {
		this.display();
	}
	display() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: 'Pattern settings' });
		new Setting(contentEl)
			.setName('Disable folder name sync')
			.setDesc('Choose if the folder name should be renamed when the file name has been changed')
			.addToggle((toggle) =>
				toggle
					.setValue(this.pattern.disableSync)
					.onChange(async (value) => {
						this.pattern.disableSync = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(contentEl)
			.setName('Disable auto creation of folder notes in this folder')
			.setDesc('Choose if a folder note should be created when a new folder is created that matches this pattern')
			.addToggle((toggle) =>
				toggle
					.setValue(this.pattern.disableAutoCreate)
					.onChange(async (value) => {
						this.pattern.disableAutoCreate = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(contentEl)
			.setName('Don\'t show folder in folder overview')
			.setDesc('Choose if the folder should be shown in the folder overview')
			.addToggle((toggle) =>
				toggle
					.setValue(this.pattern.excludeFromFolderOverview)
					.onChange(async (value) => {
						this.pattern.excludeFromFolderOverview = value;
						await this.plugin.saveSettings();
					})
			);


		new Setting(contentEl)
			.setName('Disable open folder note')
			.setDesc('Choose if the folder note should be opened when the folder is opened')
			.addToggle((toggle) =>
				toggle
					.setValue(this.pattern.disableFolderNote)
					.onChange(async (value) => {
						this.pattern.disableFolderNote = value;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (!this.pattern.disableFolderNote) {
			new Setting(contentEl)
				.setName('Collapse folder when opening folder note')
				.setDesc('Choose if the folder should be collapsed when the folder note is opened')
				.addToggle((toggle) =>
					toggle
						.setValue(this.pattern.enableCollapsing)
						.onChange(async (value) => {
							this.pattern.enableCollapsing = value;
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
