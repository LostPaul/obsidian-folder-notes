import { App, PluginSettingTab, Setting } from "obsidian";
import FolderNotesPlugin from "./main";
import { FolderSuggest } from "./suggesters/FolderSuggester";
import ExcludedFolderSettings from "./modals/exludeFolderSettings";
export interface FolderNotesSettings {
    syncFolderName: boolean;
    ctrlKey: boolean;
    altKey: boolean;
    hideFolderNote: boolean;
    templatePath: string;
    autoCreate: boolean;
    excludeFolders: ExcludedFolder[];
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
    excludeFolders: ExcludedFolder[];
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
                    const excludedFolder = new ExcludedFolder('', true, true, true, false, this.plugin.settings.excludeFolders.length);
                    this.addExcludeFolderListItem(containerEl, excludedFolder);
                    this.addExcludedFolder(excludedFolder);
                    this.display();
                })
            })
        this.plugin.settings.excludeFolders.sort((a, b) => a.position - b.position).forEach((excludedFolder) => {
            this.addExcludeFolderListItem(containerEl, excludedFolder);
        })
    }
    addExcludeFolderListItem(containerEl: HTMLElement, excludedFolder: ExcludedFolder) {
        const setting = new Setting(containerEl)
        setting.addSearch(cb => {
            new FolderSuggest(
                cb.inputEl,
                this.plugin
            );
            cb.setPlaceholder('Folder path');
            cb.setValue(excludedFolder.path);
            cb.onChange((value) => {
                if (!this.app.vault.getAbstractFileByPath(value)) return;
                excludedFolder.path = value;
                this.updateExcludedFolder(excludedFolder, excludedFolder);
            })
        })
        setting.addButton(cb => {
            cb.setIcon('edit');
            cb.setTooltip('Edit folder note');
            cb.onClick(() => {
                new ExcludedFolderSettings(this.app, this.plugin, excludedFolder).open();
            })
        })

        setting.addButton(cb => {
            cb.setIcon('up-chevron-glyph');
            cb.setTooltip('Move up');
            cb.onClick(() => {
                if (excludedFolder.position === 0) return;
                excludedFolder.position = excludedFolder.position - 1;
                console.log(excludedFolder.position);
                this.updateExcludedFolder(excludedFolder, excludedFolder);
                const oldExcludedFolder = this.plugin.settings.excludeFolders.find(folder => folder.position == excludedFolder.position)
                if (oldExcludedFolder) {

                    oldExcludedFolder.position = oldExcludedFolder.position + 1;
                    this.updateExcludedFolder(oldExcludedFolder, oldExcludedFolder);
                }
                this.display();
            })
        })
        setting.addButton(cb => {
            cb.setIcon('down-chevron-glyph');
            cb.setTooltip('Move down');
            cb.onClick(() => {
                if (excludedFolder.position === this.plugin.settings.excludeFolders.length - 1) return;
                excludedFolder.position = excludedFolder.position + 1;
                this.updateExcludedFolder(excludedFolder, excludedFolder);
                const oldExcludedFolder = this.plugin.settings.excludeFolders.find(folder => folder.position == excludedFolder.position)
                if (oldExcludedFolder) {
                    oldExcludedFolder.position = oldExcludedFolder.position - 1;
                    this.updateExcludedFolder(oldExcludedFolder, oldExcludedFolder);
                }
                this.display();
            })
        })
        setting.addButton(cb => {
            cb.setIcon('trash-2');
            cb.setTooltip('Delete excluded folder');
            cb.onClick(() => {
                this.deleteExcludedFolder(excludedFolder);
                setting.clear();
                setting.settingEl.remove();
            })
        })
    }
    addExcludedFolder(excludedFolder: ExcludedFolder) {
        this.plugin.settings.excludeFolders.push(excludedFolder);
        this.plugin.saveSettings();
    }
    deleteExcludedFolder(excludedFolder: ExcludedFolder) {
        this.plugin.settings.excludeFolders = this.plugin.settings.excludeFolders.filter((folder) => folder.path !== excludedFolder.path);
        this.plugin.saveSettings();
    }
    updateExcludedFolder(excludedFolder: ExcludedFolder, newExcludeFolder: ExcludedFolder) {
        this.plugin.settings.excludeFolders = this.plugin.settings.excludeFolders.filter((folder) => folder.path !== excludedFolder.path);
        this.addExcludedFolder(newExcludeFolder);
    }

}
export class ExcludedFolder {
    path: string;
    subFolders: boolean;
    exludeSync: boolean;
    excludeAutoCreate: boolean;
    disableFolderNote: boolean;
    position: number;
    constructor(path: string, subFolders: boolean, exludeSync: boolean, excludeAutoCreate: boolean, disableFolderNote: boolean, position: number) {
        this.path = path;
        this.subFolders = subFolders;
        this.exludeSync = exludeSync;
        this.excludeAutoCreate = excludeAutoCreate;
        this.disableFolderNote = disableFolderNote;
        this.position = position;
    }
}