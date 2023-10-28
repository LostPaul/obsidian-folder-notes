import { Setting } from "obsidian";
import { SettingsTab } from "./SettingsTab";
import { FolderOverviewSettings } from '../folderOverview/ModalSettings';

export async function renderFolderOverview(settingsTab: SettingsTab) {
    settingsTab.settingsPage.createEl('h1', { text: 'Folder overview settings' });
    const containerEl = settingsTab.settingsPage;
    new Setting(containerEl)
        .setName('Manage folder overview defaults')
        .setDesc('Manage the default settings for the folder overview plugin')
        .addButton((button) =>
            button
                .setButtonText('Manage')
                .setCta()
                .onClick(async () => {
                    new FolderOverviewSettings(settingsTab.plugin.app, settingsTab.plugin, settingsTab.plugin.settings.defaultOverview, null, null, true).open();
                })
        );
}
