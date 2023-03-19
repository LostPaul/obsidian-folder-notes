import { App, Modal, Setting, TFolder } from 'obsidian';
import FolderNotesPlugin from '../main';
export default class FolderNameModal extends Modal {
    plugin: FolderNotesPlugin;
    app: App;
    folder: TFolder;
    constructor(app: App, plugin: FolderNotesPlugin, folder: TFolder) {
        super(app);
        this.plugin = plugin;
        this.app = app;
        this.folder = folder;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Folder name' });
        new Setting(contentEl)
            .setName('Enter the name of the folder')
            .addText((text) =>
                text
                    .setValue(this.folder.name.replace('.md', ''))
                    .onChange(async (value) => {
                        if (value.trim() !== "") {
                            this.app.vault.rename(this.folder, this.folder.path.slice(0, this.folder.path.lastIndexOf('/') + 1) + value);
                        }
                    })
            );
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}