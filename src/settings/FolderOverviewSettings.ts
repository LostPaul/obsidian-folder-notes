import { SettingsTab } from './SettingsTab';
import { createOverviewSettings } from 'src/obsidian-folder-overview/src/settings';

export async function renderFolderOverview(settingsTab: SettingsTab) {
	const { plugin } = settingsTab;
	const overviewSettings = plugin.settings.defaultOverview;
	const containerEl = settingsTab.settingsPage;
	const pEl = containerEl.createEl('p', {
		text: 'Edit the default settings for new folder overviews, ',
		cls: 'setting-item-description',
	});
	const span = createSpan({ text: "this won't apply to already existing overviews.", cls: '' });
	const accentColor = (settingsTab.app.vault.getConfig('accentColor') as string) || '#7d5bed';
	span.setAttr('style', `color: ${accentColor};`);
	pEl.appendChild(span);

	createOverviewSettings(containerEl, overviewSettings, plugin, plugin.settings.defaultOverview, settingsTab.display, undefined, undefined, undefined, settingsTab);
}
