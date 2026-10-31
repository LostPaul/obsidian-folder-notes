import { Setting } from 'obsidian';
import type { SettingsTab } from './SettingsTab';
import { createOverviewSettings } from 'src/obsidian-folder-overview/src/settings';

const CHANGED_SECTION_ARG = 10;

export function renderOverviewDefaults(settingsTab: SettingsTab, containerEl: HTMLElement): void {
	const { plugin } = settingsTab;
	const pEl = containerEl.createEl('p', {
		text: 'Edit the default settings for new folder overviews, ',
		cls: 'setting-item-description',
	});
	pEl.createSpan({ text: "this won't apply to already existing overviews.", cls: 'fn-restart-note' });

	const settingsEl = containerEl.createDiv();
	const render = (...args: unknown[]): void => {
		const changedSection = args[CHANGED_SECTION_ARG] as string | undefined;
		void createOverviewSettings(
			settingsEl,
			plugin.settings.defaultOverview,
			plugin,
			plugin.settings.defaultOverview,
			render,
			undefined,
			undefined,
			undefined,
			settingsTab,
			undefined,
			changedSection,
		);
	};
	render();
}

export async function renderFolderOverview(settingsTab: SettingsTab): Promise<void> {
	const { plugin } = settingsTab;
	const containerEl = settingsTab.settingsPage;

	containerEl.createEl('h3', { text: 'Global settings' });
	new Setting(containerEl)
		.setName('Auto-update links without opening the overview')
		// eslint-disable-next-line max-len
		.setDesc('If enabled, the links that appear in the graph view will be updated even when you don\'t have the overview open somewhere.')
		.addToggle((toggle) =>
			toggle
				.setValue(plugin.settings.fvGlobalSettings.autoUpdateLinks)
				.onChange(async (value) => {
					await settingsTab.setControlValue('fvGlobalSettings.autoUpdateLinks', value);
				}),
		);

	containerEl.createEl('h3', { text: 'Overviews default settings' });
	renderOverviewDefaults(settingsTab, containerEl);
}
