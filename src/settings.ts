import { App, PluginSettingTab, Setting } from "obsidian";
import FolderNotesPlugin from "./main";
export interface FolderNotesSettings {
    syncFolderName: boolean;
    ctrlKey: boolean;
    altKey: boolean;
    hideFolderNote: boolean;
    templatePath: string;
    autoCreate: boolean;
    excludeFolders: string[];
}
export interface ExcludeFolder {
    path: string;
    subFolders: boolean;
    exludeSync: boolean;
    excludeAutoCreate: boolean;
    disableFolderNote: boolean;
    position: number;
}
export const DEFAULT_SETTINGS: FolderNotesSettings = {
    syncFolderName: true,
    ctrlKey: true,
    altKey: false,
    hideFolderNote: true,
    templatePath: '',
    autoCreate: false,
    excludeFolders: [],
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
        new Setting(containerEl)
            .setName('Sync folder name')
            .setDesc('Automatically rename the folder note when the folder name is changed')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.syncFolderName)
                    .onChange(async (value) => {
                        this.plugin.settings.syncFolderName = value;
                        await this.plugin.saveSettings();
                        this.display();
                    })
            );
        new Setting(containerEl)
            .setName('Auto create folder note')
            .setDesc('Automatically create a folder note when a new folder is created')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.autoCreate)
                    .onChange(async (value) => {
                        this.plugin.settings.autoCreate = value;
                        await this.plugin.saveSettings();
                        this.display();
                    })
            );
        new Setting(containerEl)
            .setName('Key for creating folder note')
            .setDesc('The key combination to create a folder note')
            .addDropdown((dropdown) => {
                dropdown
                    .addOption('ctrl', 'Ctrl + Click')
                    .addOption('alt', 'Alt + Click')
                    .setValue(this.plugin.settings.ctrlKey ? 'ctrl' : 'alt')
                    .onChange(async (value) => {
                        this.plugin.settings.ctrlKey = value === 'ctrl';
                        this.plugin.settings.altKey = value === 'alt';
                        await this.plugin.saveSettings();
                        this.display();
                    });
            });

        new Setting(containerEl)
            .setHeading()
            .setName('Manage excluded folders')
        new Setting(containerEl)
            .setName('Add excluded folder')
            .addButton(cb => {
                cb.setIcon('plus');
                cb.setClass('add-exclude-folder');
                cb.setTooltip('Add excluded folder');
                cb.onClick(() => {
                })
            })
    }
    addExcludeFolderListItem(excludeFolder: ExcludeFolder) {
        const { containerEl } = this;
        new Setting(containerEl)
    }
    addExcludeFolder(excludeFolder: ExcludeFolder) {
    }
}