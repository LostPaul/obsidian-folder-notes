/* eslint-disable max-len */
import { Setting } from 'obsidian';
import type { SettingsTab } from './SettingsTab';
import { t } from '../i18n';

export async function renderPath(settingsTab: SettingsTab): Promise<void> {
	const containerEl = settingsTab.settingsPage;
	new Setting(containerEl)
		.setName(t('openFolderNoteThroughPath'))
		.setDesc(t('openFolderNoteThroughPathDesc'))
		.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.openFolderNoteOnClickInPath)
				.onChange(async (value) => {
					settingsTab.plugin.settings.openFolderNoteOnClickInPath = value;
					await settingsTab.plugin.saveSettings();
					settingsTab.display();
				}),
		);

	if (settingsTab.plugin.settings.openFolderNoteOnClickInPath) {
		new Setting(containerEl)
			.setName(t('openSidebarMobile'))
			.setDesc(t('openSidebarMobileDesc'))
			.addToggle((toggle) =>
				toggle
					.setValue(settingsTab.plugin.settings.openSidebar.mobile)
					.onChange(async (value) => {
						settingsTab.plugin.settings.openSidebar.mobile = value;
						await settingsTab.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(t('openSidebarDesktop'))
			.setDesc(t('openSidebarDesktopDesc'))
			.addToggle((toggle) =>
				toggle
					.setValue(settingsTab.plugin.settings.openSidebar.desktop)
					.onChange(async (value) => {
						settingsTab.plugin.settings.openSidebar.desktop = value;
						await settingsTab.plugin.saveSettings();
					}),
			);
	}

	if (settingsTab.plugin.settings.frontMatterTitle.enabled) {
		new Setting(containerEl)
			.setName(t('autoUpdateFolderNameInPath'))
			.setDesc(t('autoUpdateFolderNameInPathDesc'))
			.addToggle((toggle) =>
				toggle
					.setValue(settingsTab.plugin.settings.frontMatterTitle.path)
					.onChange(async (value) => {
						settingsTab.plugin.settings.frontMatterTitle.path = value;
						await settingsTab.plugin.saveSettings();
						if (value) {
							settingsTab.plugin.updateAllBreadcrumbs();
						} else {
							settingsTab.plugin.updateAllBreadcrumbs(true);
						}
					}),
			);
	}

	settingsTab.settingsPage.createEl('h3', { text: t('styleSettings') });

	new Setting(containerEl)
		.setName(t('underlineFoldersInPath'))
		.setDesc(t('underlineFoldersInPathDesc'))
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
				}),
		);

	new Setting(containerEl)
		.setName(t('boldFoldersInPath'))
		.setDesc(t('boldFoldersInPathDesc'))
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
				}),
		);

	new Setting(containerEl)
		.setName(t('cursiveFoldersInPath'))
		.setDesc(t('cursiveFoldersInPathDesc'))
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
				}),
		);

	new Setting(containerEl)
		.setName(t('hideFolderNoteNameInPath'))
		.setDesc(t('hideFolderNoteNameInPathDesc'))
		.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.hideFolderNoteNameInPath)
				.onChange(async (value) => {
					document.body.classList.toggle('folder-note-hide-name-path', value);
					settingsTab.plugin.settings.hideFolderNoteNameInPath = value;
					await settingsTab.plugin.saveSettings();
				}),
		);
}
