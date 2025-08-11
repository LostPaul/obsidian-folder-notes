/* eslint-disable max-len */
import { Setting } from 'obsidian';
import type { SettingsTab } from './SettingsTab';
export async function renderPath(settingsTab: SettingsTab): Promise<void> {
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
				}),
		);

	if (settingsTab.plugin.settings.openFolderNoteOnClickInPath) {
		new Setting(containerEl)
			.setName('Open sidebar when opening a folder note through path (Mobile only)')
			.setDesc('Open the sidebar when opening a folder note through the path on mobile')
			.addToggle((toggle) =>
				toggle
					.setValue(settingsTab.plugin.settings.openSidebar.mobile)
					.onChange(async (value) => {
						settingsTab.plugin.settings.openSidebar.mobile = value;
						await settingsTab.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Open sidebar when opening a folder note through path (Desktop only)')
			.setDesc('Open the sidebar when opening a folder note through the path on desktop')
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
			.setName('Auto update folder name in the path (front matter title plugin only)')
			.setDesc('Automatically update the folder name in the path when the front matter title plugin is enabled and the title for a folder note is changed in the front matter. This will not change the file name, only the displayed name in the path.')
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
				}),
		);

	new Setting(containerEl)
		.setName('Bold folders in the path')
		.setDesc('Make the folder name bold in the path above a note when it has a folder note')
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
		.setName('Cursive the name of folder notes in the path')
		.setDesc('Make the folder name cursive in the path above a note when it has a folder note')
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
}
