import { SettingsTab } from './SettingsTab';
import { createOverviewSettings } from 'src/obsidian-folder-overview/src/settings';

export async function renderFolderOverview(settingsTab: SettingsTab) {
	const { plugin } = settingsTab;
	const overviewSettings = plugin.settings.defaultOverview;
	const containerEl = settingsTab.settingsPage;
	containerEl.createEl('p', { text: 'Edit the default settings for folder overviews', cls: 'setting-item-description' });

	createOverviewSettings(containerEl, overviewSettings, plugin, plugin.settings.defaultOverview, settingsTab.display, undefined, undefined, undefined, settingsTab);
}
