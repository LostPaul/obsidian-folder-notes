import { App, PluginSettingTab, Setting } from "obsidian";
import FolderNotesPlugin from "./main";
export interface FolderNotesSettings {
    syncFolderName: boolean;
    ctrlKey: boolean;
    altKey: boolean;
    autoRename: boolean;
    hideFolderNote: boolean;
    templatePath: string;
    autoCreate: boolean;
}
export const DEFAULT_SETTINGS: FolderNotesSettings = {
    syncFolderName: true,
    ctrlKey: true,
    altKey: false,
    autoRename: true,
    hideFolderNote: true,
    templatePath: '',
    autoCreate: true,
};
export class SettingsTab extends PluginSettingTab {
    plugin: FolderNotesPlugin;
    app: App;
    constructor(app: App, plugin: FolderNotesPlugin) {
        super(app, plugin);
    }
    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Folder notes settings' });

        new Setting(containerEl)
            .setName('Hide folder note')
            .setDesc('Hide the folder note in the file explorer')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.hideFolderNote)
                    .onChange(async (value) => {
                        this.plugin.settings.hideFolderNote = value;
                        await this.plugin.saveSettings();
                        if (value) {
                            document.body.classList.add('hide-folder-note');
                        } else {
                            document.body.classList.remove('hide-folder-note');
                        }
                        this.display();
                    })
            );
    }
}