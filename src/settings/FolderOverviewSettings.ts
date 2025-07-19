import { Setting } from 'obsidian';
import { SettingsTab } from './SettingsTab';
import { createOverviewSettings } from 'src/obsidian-folder-overview/src/settings';

export async function renderFolderOverview(settingsTab: SettingsTab) {
	const { plugin } = settingsTab;
	const defaultOverviewSettings = plugin.settings.defaultOverview;
	const containerEl = settingsTab.settingsPage;

	containerEl.createEl('h3', { text: 'Global settings' });
	new Setting(containerEl)
		.setName('Auto-update links without opening the overview')
		.setDesc('If enabled, the links that appear in the graph view will be updated even when you don\'t have the overview open somewhere.')
		.addToggle((toggle) =>
			toggle
				.setValue(plugin.settings.fvGlobalSettings.autoUpdateLinks)
				.onChange(async (value) => {
					plugin.settings.fvGlobalSettings.autoUpdateLinks = value;
					await plugin.saveSettings();
					if (value) {
						plugin.fvIndexDB.init(true);
					} else {
						plugin.fvIndexDB.active = false;
					}
				})
		);

	containerEl.createEl('h3', { text: 'Overviews default settings' });
	const pEl = containerEl.createEl('p', {
		text: 'Edit the default settings for new folder overviews, ',
		cls: 'setting-item-description',
	});
	const span = createSpan({ text: "this won't apply to already existing overviews.", cls: '' });
	const accentColor = (settingsTab.app.vault.getConfig('accentColor') as string) || '#7d5bed';
	span.setAttr('style', `color: ${accentColor};`);
	pEl.appendChild(span);

	createOverviewSettings(containerEl, defaultOverviewSettings, plugin, plugin.settings.defaultOverview, settingsTab.display, undefined, undefined, undefined, settingsTab);
}
