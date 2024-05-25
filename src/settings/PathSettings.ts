import { Setting } from "obsidian";
import { SettingsTab } from "./SettingsTab";
export async function renderPath(settingsTab: SettingsTab) {
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

    new Setting(containerEl)
        .setName('Open sidebar when opening a folder note through path (Mobile only)')
        .setDesc('Open the sidebar when opening a folder note through the path on mobile')
        .addToggle((toggle) =>
            toggle
                .setValue(settingsTab.plugin.settings.openSidebarWhenClickingOnPath)
                .onChange(async (value) => {
                    settingsTab.plugin.settings.openSidebarWhenClickingOnPath = value;
                    await settingsTab.plugin.saveSettings();
                })
        );

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

    settingsTab.settingsPage.createEl('h3', { text: 'Style settings' });

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

    new Setting(containerEl)
        .setName('Bold folders in the path')
        .setDesc('Make the folder name bold in the path above a note')
        .addToggle((toggle) =>
            toggle
                .setValue(settingsTab.plugin.settings.boldNameInPath)
                .onChange(async (value) => {
                    settingsTab.plugin.settings.boldNameInPath = value;
                    if (value) {
                        document.body.classList.add('folder-note-bold-path');
                    } else {
                        document.body.classList.remove('folder-note-bold-path');
                    }
                    await settingsTab.plugin.saveSettings();
                })
        );

    new Setting(containerEl)
        .setName('Cursive the name of folder notes in the path')
        .setDesc('Make the folder name cursive in the path above a note')
        .addToggle((toggle) =>
            toggle
                .setValue(settingsTab.plugin.settings.cursiveNameInPath)
                .onChange(async (value) => {
                    settingsTab.plugin.settings.cursiveNameInPath = value;
                    if (value) {
                        document.body.classList.add('folder-note-cursive-path');
                    } else {
                        document.body.classList.remove('folder-note-cursive-path');
                    }
                    await settingsTab.plugin.saveSettings();
                })
        );
}