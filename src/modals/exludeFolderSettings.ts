import { App, Modal, Setting } from 'obsidian';
import FolderNotesPlugin from '../main';
import { ExcludedFolder } from '../settings';
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
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Exluded folder settings' });
        new Setting(contentEl)
            .setName('Include subfolders')
            .setDesc('Choose if subfolders of the folder should also be excluded')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.excludedFolder.subFolders)
                    .onChange(async (value) => {
                        this.excludedFolder.subFolders = value;
                        await this.plugin.saveSettings();
                    })
            );

    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}