import { Setting } from 'obsidian';
import type { SettingsTab } from './SettingsTab';
import { createOverviewSettings } from 'src/obsidian-folder-overview/src/settings';
import { t } from '../i18n';

export async function renderFolderOverview(settingsTab: SettingsTab): Promise<void> {
	const { plugin } = settingsTab;
	const defaultOverviewSettings = plugin.settings.defaultOverview;
	const containerEl = settingsTab.settingsPage;

	containerEl.createEl('h3', { text: t('globalSettings') });
	new Setting(containerEl)
		.setName(t('autoUpdateLinks'))
		// eslint-disable-next-line max-len
		.setDesc(t('autoUpdateLinksDesc'))
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
				}),
		);

	containerEl.createEl('h3', { text: t('overviewDefaultSettings') });
	const pEl = containerEl.createEl('p', {
		text: t('overviewDefaultSettingsDesc'),
		cls: 'setting-item-description',
	});
	const span = createSpan({ text: t('overviewDefaultSettingsSpan'), cls: '' });
	const accentColor = (settingsTab.app.vault.getConfig('accentColor') as string) || '#7d5bed';
	span.setAttr('style', `color: ${accentColor};`);
	pEl.appendChild(span);

	createOverviewSettings(
		containerEl,
		defaultOverviewSettings,
		plugin,
		plugin.settings.defaultOverview,
		settingsTab.display,
		undefined,
		undefined,
		undefined,
		settingsTab,
	);
}
