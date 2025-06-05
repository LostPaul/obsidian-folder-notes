import { Setting } from 'obsidian';
import { SettingsTab } from './SettingsTab';
export async function renderFileExplorer(settingsTab: SettingsTab) {
	const containerEl = settingsTab.settingsPage;

	new Setting(containerEl)
		.setName('Hide folder note')
		.setDesc('Hide the folder note file from appearing in the file explorer')
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

	const setting2 = new Setting(containerEl)
		.setName('Disable click-to-open folder note on mobile')
		.setDesc('Prevents folder notes from opening when tapping the folder name or surrounding area on mobile devices. They can now only be opened via the context menu or a command.')
		.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.disableOpenFolderNoteOnClick)
				.onChange(async (value) => {
					settingsTab.plugin.settings.disableOpenFolderNoteOnClick = value;
					await settingsTab.plugin.saveSettings();
				})
		);

	setting2.infoEl.appendText('Requires a restart to take effect');
	setting2.infoEl.style.color = settingsTab.app.vault.getConfig('accentColor') as string || '#7d5bed';

	new Setting(containerEl)
		.setName('Open folder notes by only clicking directly on the folder name')
		.setDesc('Only allow folder notes to open when clicking directly on the folder name in the file explorer')
		.addToggle((toggle) =>
			toggle
				.setValue(!settingsTab.plugin.settings.stopWhitespaceCollapsing)
				.onChange(async (value) => {
					if (!value) {
						document.body.classList.add('fn-whitespace-stop-collapsing');
					} else {
						document.body.classList.remove('fn-whitespace-stop-collapsing');
					}
					settingsTab.plugin.settings.stopWhitespaceCollapsing = !value;
					await settingsTab.plugin.saveSettings();
				})
		);

	const disableSetting = new Setting(containerEl);
	disableSetting.setName('Disable folder collapsing');
	disableSetting.setDesc('When enabled, folders in the file explorer will only collapse when clicking the collapse icon next to the folder name, not when clicking near a folder name when it has a folder note.');
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
			.setName('Auto update folder name in the file explorer (front matter title plugin only)')
			.setDesc('Automatically update the folder name in the file explorer when the front matter title plugin is enabled and the title for a folder note is changed in the front matter. This will not change the file name, only the displayed name in the file explorer.')
			.addToggle((toggle) =>
				toggle
					.setValue(settingsTab.plugin.settings.frontMatterTitle.explorer)
					.onChange(async (value) => {
						settingsTab.plugin.settings.frontMatterTitle.explorer = value;
						await settingsTab.plugin.saveSettings();
						settingsTab.plugin.app.vault.getFiles().forEach((file) => {
							settingsTab.plugin.fmtpHandler?.fmptUpdateFileName({ id: '', result: false, path: file.path, pathOnly: false }, false);
						});
					})
			);
	}

	settingsTab.settingsPage.createEl('h3', { text: 'Style settings' });

	new Setting(containerEl)
		.setName('Highlight folder in the file explorer')
		.setDesc('Highlight the folder in the file explorer when it has a folder note and the folder note is open in the editor')
		.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.highlightFolder)
				.onChange(async (value) => {
					settingsTab.plugin.settings.highlightFolder = value;
					if (!value) {
						document.body.classList.add('disable-folder-highlight');
					} else {
						document.body.classList.remove('disable-folder-highlight');
					}
					await settingsTab.plugin.saveSettings();
				})
		);

	new Setting(containerEl)
		.setName('Hide collapse icon')
		.setDesc('Hide the collapse icon in the file explorer next to the name of a folder when a folder only contains a folder note')
		.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.hideCollapsingIcon)
				.onChange(async (value) => {
					settingsTab.plugin.settings.hideCollapsingIcon = value;
					await settingsTab.plugin.saveSettings();
					if (value) {
						document.body.classList.add('fn-hide-collapse-icon');
					} else {
						document.body.classList.remove('fn-hide-collapse-icon');
					}
					settingsTab.display();
				})
		);

	new Setting(containerEl)
		.setName('Hide collapse icon for every empty folder')
		.setDesc('Hide the collapse icon in the file explorer next to the name of a folder when a folder is empty')
		.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.hideCollapsingIconForEmptyFolders)
				.onChange(async (value) => {
					settingsTab.plugin.settings.hideCollapsingIconForEmptyFolders = value;
					await settingsTab.plugin.saveSettings();
					if (value) {
						document.body.classList.add('fn-hide-empty-collapse-icon');
					} else {
						document.body.classList.remove('fn-hide-empty-collapse-icon');
					}
					settingsTab.display();
				}
				));

	if (settingsTab.plugin.settings.hideCollapsingIcon) {
		new Setting(containerEl)
			.setName('Hide collapse icon also when the attachment folder is in the same folder')
			.addToggle((toggle) =>
				toggle
					.setValue(settingsTab.plugin.settings.ignoreAttachmentFolder)
					.onChange(async (value) => {
						settingsTab.plugin.settings.ignoreAttachmentFolder = value;
						await settingsTab.plugin.saveSettings();
					})
			);
	}

	new Setting(containerEl)
		.setName('Underline the name of folder notes')
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
		.setName('Bold the name of folder notes')
		.setDesc('Make the folder name bold in the file explorer')
		.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.boldName)
				.onChange(async (value) => {
					settingsTab.plugin.settings.boldName = value;
					if (value) {
						document.body.classList.add('folder-note-bold');
					} else {
						document.body.classList.remove('folder-note-bold');
					}
					await settingsTab.plugin.saveSettings();
				})
		);

	new Setting(containerEl)
		.setName('Cursive the name of folder notes')
		.setDesc('Make the folder name cursive in the file explorer')
		.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.cursiveName)
				.onChange(async (value) => {
					settingsTab.plugin.settings.cursiveName = value;
					if (value) {
						document.body.classList.add('folder-note-cursive');
					} else {
						document.body.classList.remove('folder-note-cursive');
					}
					await settingsTab.plugin.saveSettings();
				})
		);

}
