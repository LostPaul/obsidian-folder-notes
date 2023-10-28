import { Setting } from "obsidian";
import { SettingsTab } from "./SettingsTab";
export async function renderPath(settingsTab: SettingsTab) {
    settingsTab.settingsPage.createEl('h1', { text: 'Path settings' });
    const containerEl = settingsTab.settingsPage;
    new Setting(containerEl)
        .setName('Open folder note through path')
        .setDesc('Open a folder note when clicking on a folder name in the path if it is a folder note')
        .addToggle((toggle) =>
            toggle
                .setValue(settingsTab.plugin.settings.openFolderNoteOnClickInPath)
                .onChange(async (value) => {
                    settingsTab.plugin.settings.openFolderNoteOnClickInPath = value;
                    await settingsTab.plugin.saveSettings();
                    settingsTab.display();
                })
        );

    if (settingsTab.plugin.settings.openFolderNoteOnClickInPath) {
        new Setting(containerEl)
            .setName('Underline folders in the path')
            .setDesc('Add an underline to folders that have a folder note in the path above a note')
            .addToggle((toggle) =>
                toggle
                    .setValue(settingsTab.plugin.settings.underlineFolderInPath)
                    .onChange(async (value) => {
                        settingsTab.plugin.settings.underlineFolderInPath = value;
                        if (value) {
                            document.body.classList.add('folder-note-underline-path');
                        } else {
                            document.body.classList.remove('folder-note-underline-path');
                        }
                        await settingsTab.plugin.saveSettings();
                    })
            );
    }

    new Setting(containerEl)
        .setName('Change folder name in the path')
        .setDesc('Automatically rename a folder name in the path above a note when the folder note is renamed')
        .addToggle((toggle) =>
            toggle
                .setValue(settingsTab.plugin.settings.frontMatterTitle.path)
                .onChange(async (value) => {
                    settingsTab.plugin.settings.frontMatterTitle.path = value;
                    await settingsTab.plugin.saveSettings();
                    if (value) {
                        settingsTab.plugin.updateBreadcrumbs();
                    } else {
                        settingsTab.plugin.updateBreadcrumbs(true);
                    }
                })
        );
}