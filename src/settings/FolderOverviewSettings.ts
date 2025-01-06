import { PluginSettingTab, Setting, TFolder } from "obsidian";
import { SettingsTab } from "./SettingsTab";
import { ListComponent } from 'src/functions/ListComponent';
import { includeTypes } from 'src/folderOverview/src/FolderOverview';
import { FolderSuggest } from "src/suggesters/FolderSuggester";
import { createOverviewSettings } from "src/folderOverview/src/settings";

export async function renderFolderOverview(settingsTab: SettingsTab) {
    const { plugin } = settingsTab;
    let overviewSettings = plugin.settings.defaultOverview;
    const containerEl = settingsTab.settingsPage;
    containerEl.createEl('p', { text: 'Change the default settings for folder overviews', cls: 'setting-item-description' });

    createOverviewSettings(containerEl, overviewSettings, plugin, plugin.settings.defaultOverview, settingsTab.display, undefined, undefined, undefined, settingsTab );
}
