import { Setting } from "obsidian";
import { SettingsTab } from "./SettingsTab";
export async function renderFileExplorer(settingsTab: SettingsTab) {
    const containerEl = settingsTab.settingsPage;
    settingsTab.settingsPage.createEl('h1', { text: 'File explorer settings' });
    new Setting(containerEl)
        .setName('Add underline to folders with folder notes')
        .setDesc('Add an underline to folders that have a folder note in the file explorer')
        .addToggle((toggle) =>
            toggle
                .setValue(settingsTab.plugin.settings.underlineFolder)
                .onChange(async (value) => {
                    settingsTab.plugin.settings.underlineFolder = value;
                    if (value) {
                        document.body.classList.add('folder-note-underline');
                    } else {
                        document.body.classList.remove('folder-note-underline');
                    }
                    await settingsTab.plugin.saveSettings();
                })
        );

    new Setting(containerEl)
        .setName('Hide folder note')
        .setDesc('Hide the folder note in the file explorer')
        .addToggle((toggle) =>
            toggle
                .setValue(settingsTab.plugin.settings.hideFolderNote)
                .onChange(async (value) => {
                    settingsTab.plugin.settings.hideFolderNote = value;
                    await settingsTab.plugin.saveSettings();
                    if (value) {
                        document.body.classList.add('hide-folder-note');
                    } else {
                        document.body.classList.remove('hide-folder-note');
                    }
                    settingsTab.display();
                })
        );

    new Setting(containerEl)
        .setName('Only open folder notes through the name')
        .setDesc('Only open folder notes in the file explorer by clicking on the folder name')
        .addToggle((toggle) =>
            toggle
                .setValue(settingsTab.plugin.settings.allowWhitespaceCollapsing)
                .onChange(async (value) => {
                    if (!value) {
                        document.body.classList.add('fn-whitespace-stop-collapsing');
                    } else {
                        document.body.classList.remove('fn-whitespace-stop-collapsing');
                    }
                    settingsTab.plugin.settings.allowWhitespaceCollapsing = value;
                    await settingsTab.plugin.saveSettings();
                })
        );
    const disableSetting = new Setting(containerEl);
    disableSetting.setName('Disable folder collapsing');
    disableSetting.setDesc('Disable the ability to collapse folders by clicking exactly on the folder name');
    disableSetting.addToggle((toggle) =>
        toggle
            .setValue(!settingsTab.plugin.settings.enableCollapsing)
            .onChange(async (value) => {
                settingsTab.plugin.settings.enableCollapsing = !value;
                await settingsTab.plugin.saveSettings();
            })
    );
    disableSetting.infoEl.appendText('Requires a restart to take effect');
    disableSetting.infoEl.style.color = settingsTab.app.vault.getConfig('accentColor') as string || '#7d5bed';

    new Setting(containerEl)
        .setName('Use submenus')
        .setDesc('Use submenus for file/folder commands')
        .addToggle((toggle) =>
            toggle
                .setValue(settingsTab.plugin.settings.useSubmenus)
                .onChange(async (value) => {
                    settingsTab.plugin.settings.useSubmenus = value;
                    await settingsTab.plugin.saveSettings();
                    settingsTab.display();
                })
        );

    if (settingsTab.plugin.settings.frontMatterTitle.enabled) {
        new Setting(containerEl)
            .setName('Change folder name in the file explorer')
            .setDesc('Automatically rename a folder name in the file explorer when the folder note is renamed')
            .addToggle((toggle) =>
                toggle
                    .setValue(settingsTab.plugin.settings.frontMatterTitle.explorer)
                    .onChange(async (value) => {
                        settingsTab.plugin.settings.frontMatterTitle.explorer = value;
                        await settingsTab.plugin.saveSettings();
                        settingsTab.plugin.app.vault.getFiles().forEach((file) => {
                            settingsTab.plugin.fmtpHandler?.handleRename({ id: '', result: false, path: file.path }, false);
                        });
                    })
            );
    }
}