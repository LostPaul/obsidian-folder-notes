import { Setting, Platform } from 'obsidian';
import { SettingsTab } from './SettingsTab';
import { ListComponent } from '../functions/ListComponent';
import AddSupportedFileModal from '../modals/AddSupportedFileType';
import { FrontMatterTitlePluginHandler } from '../events/FrontMatterTitle';
import ConfirmationModal from './modals/CreateFnForEveryFolder';
import { TemplateSuggest } from '../suggesters/TemplateSuggester';
import { refreshAllFolderStyles } from '../functions/styleFunctions';
import BackupWarningModal from './modals/BackupWarning';
import RenameFolderNotesModal from './modals/RenameFns';

let debounceTimer: NodeJS.Timeout;

export async function renderGeneral(settingsTab: SettingsTab) {
	const containerEl = settingsTab.settingsPage;
	const nameSetting = new Setting(containerEl)
		.setName('Folder note name template')
		.setDesc('All folder notes will use this name. Use {{folder_name}} to insert the folder’s name. Existing notes won’t update automatically; click on the button to apply the new name.')
		.addText((text) =>
			text
				.setValue(settingsTab.plugin.settings.folderNoteName)
				.onChange(async (value) => {
					if (value.trim() === '') { return; }
					settingsTab.plugin.settings.folderNoteName = value;
					await settingsTab.plugin.saveSettings();

					clearTimeout(debounceTimer);
					debounceTimer = setTimeout(() => {
						if (!value.includes('{{folder_name}}')) {
							if (!settingsTab.showFolderNameInTabTitleSetting) {
								settingsTab.display();
								settingsTab.showFolderNameInTabTitleSetting = true;
							}
						} else {
							if (settingsTab.showFolderNameInTabTitleSetting) {
								settingsTab.display();
								settingsTab.showFolderNameInTabTitleSetting = false;
							}
						}
					}, 2000);
				})
		)
		.addButton((button) =>
			button
				.setButtonText('Rename existing folder notes')
				.setCta()
				.onClick(async () => {
					new RenameFolderNotesModal(
						settingsTab.plugin,
						'Rename all existing folder notes',
						'When you click on "Confirm" all existing folder notes will be renamed to the new folder note name.',
						settingsTab.renameFolderNotes,
						[])
						.open();
				})
		);
	nameSetting.infoEl.appendText('Requires a restart to take effect');
	nameSetting.infoEl.style.color = settingsTab.app.vault.getConfig('accentColor') as string || '#7d5bed';

	if (!settingsTab.plugin.settings.folderNoteName.includes('{{folder_name}}')) {
		new Setting(containerEl)
			.setName('Display Folder Name in Tab Title')
			.setDesc('Use the actual folder name in the tab title instead of the custom folder note name (e.g., "Folder Note").')
			.addToggle((toggle) =>
				toggle
					.setValue(settingsTab.plugin.settings.tabManagerEnabled)
					.onChange(async (value) => {
						if (!value) {
							settingsTab.plugin.tabManager.resetTabs();
						} else {
							settingsTab.plugin.settings.tabManagerEnabled = value;
							settingsTab.plugin.tabManager.updateTabs();
						}
						settingsTab.plugin.settings.tabManagerEnabled = value;
						await settingsTab.plugin.saveSettings();
						settingsTab.display();
					})
			);
	}

	new Setting(containerEl)
		.setName('Default file type for new folder notes')
		.setDesc('Choose the default file type (canvas, markdown, ...) used when creating new folder notes.')
		.addDropdown((dropdown) => {
			dropdown.addOption('.ask', 'ask for file type');
			settingsTab.plugin.settings.supportedFileTypes.forEach((type) => {
				if (type === '.md' || type === 'md') {
					dropdown.addOption('.md', 'markdown');
				} else {
					dropdown.addOption('.' + type, type);
				}
			});

			if (!settingsTab.plugin.settings.supportedFileTypes.includes(settingsTab.plugin.settings.folderNoteType.replace('.', '')) && settingsTab.plugin.settings.folderNoteType !== '.ask') {
				settingsTab.plugin.settings.folderNoteType = '.md';
				settingsTab.plugin.saveSettings();
			}

			let defaultType = settingsTab.plugin.settings.folderNoteType.startsWith('.') ? settingsTab.plugin.settings.folderNoteType : '.' + settingsTab.plugin.settings.folderNoteType;
			if (!settingsTab.plugin.settings.supportedFileTypes.includes(defaultType.replace('.', ''))) {
				defaultType = '.ask';
				settingsTab.plugin.settings.folderNoteType = defaultType;
			}

			dropdown
				.setValue(defaultType)
				.onChange(async (value: '.md' | '.canvas') => {
					settingsTab.plugin.settings.folderNoteType = value;
					settingsTab.plugin.saveSettings();
					settingsTab.display();
				});
		});

	const setting0 = new Setting(containerEl);
	setting0.setName('Supported file types');
	const desc0 = document.createDocumentFragment();
	desc0.append(
		'Specify which file types are allowed as folder notes. Applies to both new and existing folders. Adding many types may affect performance.'
	);
	setting0.setDesc(desc0);
	const list = new ListComponent(setting0.settingEl, settingsTab.plugin.settings.supportedFileTypes || [], ['md', 'canvas']);
	list.on('update', async (values: string[]) => {
		settingsTab.plugin.settings.supportedFileTypes = values;
		await settingsTab.plugin.saveSettings();
		settingsTab.display();
	});

	if (!settingsTab.plugin.settings.supportedFileTypes.includes('md') || !settingsTab.plugin.settings.supportedFileTypes.includes('canvas') || !settingsTab.plugin.settings.supportedFileTypes.includes('excalidraw')) {
		setting0.addDropdown((dropdown) => {
			const options = [
				{ value: 'md', label: 'Markdown' },
				{ value: 'canvas', label: 'Canvas' },
				{ value: 'excalidraw', label: 'excalidraw' },
				{ value: 'custom', label: 'Custom extension' },
			];

			options.forEach((option) => {
				if (!settingsTab.plugin.settings.supportedFileTypes?.includes(option.value)) {
					dropdown.addOption(option.value, option.label);
				}
			});
			dropdown.addOption('+', '+');
			dropdown.setValue('+');
			dropdown.onChange(async (value) => {
				if (value === 'custom') {
					return new AddSupportedFileModal(settingsTab.app, settingsTab.plugin, settingsTab, list as ListComponent).open();
				}
				await list.addValue(value.toLowerCase());
				settingsTab.display();
				settingsTab.plugin.saveSettings();
			});
		});
	} else {
		setting0.addButton((button) =>
			button
				.setButtonText('Add custom file type')
				.setCta()
				.onClick(async () => {
					new AddSupportedFileModal(settingsTab.app, settingsTab.plugin, settingsTab, list as ListComponent).open();
				})
		);
	}


	const templateSetting = new Setting(containerEl)
		.setDesc('Can be used with templater/templates plugin. If you add the location of the templates there.')
		.setName('Template path')
		.addSearch((cb) => {
			new TemplateSuggest(cb.inputEl, settingsTab.plugin);
			cb.setPlaceholder('Template path');
			cb.setValue(settingsTab.plugin.app.vault.getAbstractFileByPath(settingsTab.plugin.settings.templatePath)?.name.replace('.md', '') || '');
			cb.onChange(async (value) => {
				if (value.trim() === '') {
					settingsTab.plugin.settings.templatePath = '';
					await settingsTab.plugin.saveSettings();
					settingsTab.display();
					return;
				}
			});
		});
	templateSetting.infoEl.appendText('Requires a restart to take effect');
	templateSetting.infoEl.style.color = settingsTab.app.vault.getConfig('accentColor') as string || '#7d5bed';

	const storageLocation = new Setting(containerEl)
		.setName('Storage location')
		.setDesc('Choose where to store the folder notes')
		.addDropdown((dropdown) =>
			dropdown
				.addOption('insideFolder', 'Inside the folder')
				.addOption('parentFolder', 'In the parent folder')
				.setValue(settingsTab.plugin.settings.storageLocation)
				.onChange(async (value: 'insideFolder' | 'parentFolder' | 'vaultFolder') => {
					settingsTab.plugin.settings.storageLocation = value;
					await settingsTab.plugin.saveSettings();
					settingsTab.display();
					refreshAllFolderStyles(undefined, settingsTab.plugin);
				})
		)
		.addButton((button) =>
			button
				.setButtonText('Switch')
				.setCta()
				.onClick(async () => {
					let oldStorageLocation = settingsTab.plugin.settings.storageLocation;
					if (settingsTab.plugin.settings.storageLocation === 'parentFolder') {
						oldStorageLocation = 'insideFolder';
					} else if (settingsTab.plugin.settings.storageLocation === 'insideFolder') {
						oldStorageLocation = 'parentFolder';
					}
					new BackupWarningModal(
						settingsTab.plugin,
						'Switch storage location',
						'When you click on "Confirm" all folder notes will be moved to the new storage location.',
						settingsTab.switchStorageLocation,
						[oldStorageLocation]
					).open();
				})
		);
	storageLocation.infoEl.appendText('Requires a restart to take effect');
	storageLocation.infoEl.style.color = settingsTab.app.vault.getConfig('accentColor') as string || '#7d5bed';

	if (settingsTab.plugin.settings.storageLocation === 'parentFolder') {
		new Setting(containerEl)
			.setName('Delete folder notes when deleting the folder')
			.setDesc('Delete the folder note when deleting the folder')
			.addToggle((toggle) =>
				toggle
					.setValue(settingsTab.plugin.settings.syncDelete)
					.onChange(async (value) => {
						settingsTab.plugin.settings.syncDelete = value;
						await settingsTab.plugin.saveSettings();
					}
					)
			);
		new Setting(containerEl)
			.setName('Move folder notes when moving the folder')
			.setDesc('Move the folder note file along with the folder when it is moved')
			.addToggle((toggle) =>
				toggle
					.setValue(settingsTab.plugin.settings.syncMove)
					.onChange(async (value) => {
						settingsTab.plugin.settings.syncMove = value;
						await settingsTab.plugin.saveSettings();
					})
			);
	}
	if (Platform.isDesktopApp) {
		settingsTab.settingsPage.createEl('h3', { text: 'Keyboard Shortcuts' });

		new Setting(containerEl)
			.setName('Key for creating folder note')
			.setDesc('The key combination to create a folder note')
			.addDropdown((dropdown) => {
				if (!Platform.isMacOS) {
					dropdown.addOption('ctrl', 'Ctrl + Click');
				} else {
					dropdown.addOption('ctrl', 'Cmd + Click');
				}
				dropdown.addOption('alt', 'Alt + Click');
				dropdown.setValue(settingsTab.plugin.settings.ctrlKey ? 'ctrl' : 'alt');
				dropdown.onChange(async (value) => {
					settingsTab.plugin.settings.ctrlKey = value === 'ctrl';
					settingsTab.plugin.settings.altKey = value === 'alt';
					await settingsTab.plugin.saveSettings();
					settingsTab.display();
				});
			});

		new Setting(containerEl)
			.setName('Key for opening folder note')
			.setDesc('Select the combination to open a folder note')
			.addDropdown((dropdown) => {
				dropdown.addOption('click', 'Mouse Click');
				if (!Platform.isMacOS) {
					dropdown.addOption('ctrl', 'Ctrl + Click');
				} else {
					dropdown.addOption('ctrl', 'Cmd + Click');
				}
				dropdown.addOption('alt', 'Alt + Click');
				if (settingsTab.plugin.settings.openByClick) {
					dropdown.setValue('click');
				} else if (settingsTab.plugin.settings.openWithCtrl) {
					dropdown.setValue('ctrl');
				} else {
					dropdown.setValue('alt');
				}
				dropdown.onChange(async (value) => {
					settingsTab.plugin.settings.openByClick = value === 'click';
					settingsTab.plugin.settings.openWithCtrl = value === 'ctrl';
					settingsTab.plugin.settings.openWithAlt = value === 'alt';
					await settingsTab.plugin.saveSettings();
					settingsTab.display();
				});
			});
	}

	settingsTab.settingsPage.createEl('h3', { text: 'Folder note behavior' });

	new Setting(containerEl)
		.setName('Confirm folder note deletion')
		.setDesc('Ask for confirmation before deleting a folder note')
		.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.showDeleteConfirmation)
				.onChange(async (value) => {
					settingsTab.plugin.settings.showDeleteConfirmation = value;
					await settingsTab.plugin.saveSettings();
					settingsTab.display();
				})
		);

	new Setting(containerEl)
		.setName('Deleted folder notes')
		.setDesc('What happens to the folder note after you delete it')
		.addDropdown((dropdown) => {
			dropdown.addOption('trash', 'Move to system trash');
			dropdown.addOption('obsidianTrash', 'Move to Obsidian trash (.trash folder)');
			dropdown.addOption('delete', 'Delete permanently');
			dropdown.setValue(settingsTab.plugin.settings.deleteFilesAction);
			dropdown.onChange(async (value: 'trash' | 'delete' | 'obsidianTrash') => {
				settingsTab.plugin.settings.deleteFilesAction = value;
				await settingsTab.plugin.saveSettings();
				settingsTab.display();
			});
		});

	if (Platform.isDesktop) {
		const setting3 = new Setting(containerEl);
		setting3.setName('Open folder note in a new tab by default');
		setting3.setDesc('Always open folder notes in a new tab unless the note is already open in the current tab.');
		setting3.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.openInNewTab)
				.onChange(async (value) => {
					settingsTab.plugin.settings.openInNewTab = value;
					await settingsTab.plugin.saveSettings();
					settingsTab.display();
				})
		);
		setting3.infoEl.appendText('Requires a restart to take effect');
		setting3.infoEl.style.color = settingsTab.app.vault.getConfig('accentColor') as string || '#7d5bed';
	}

	if (settingsTab.plugin.settings.openInNewTab) {
		new Setting(containerEl)
			.setName('Focus existing tab instead of creating a new one')
			.setDesc('If a folder note is already open in a tab, focus that tab instead of creating a new one.')
			.addToggle((toggle) =>
				toggle
					.setValue(settingsTab.plugin.settings.focusExistingTab)
					.onChange(async (value) => {
						settingsTab.plugin.settings.focusExistingTab = value;
						await settingsTab.plugin.saveSettings();
						settingsTab.display();
					})
			);
	}

	new Setting(containerEl)
		.setName('Sync folder name')
		.setDesc('Automatically rename the folder note when the folder name is changed')
		.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.syncFolderName)
				.onChange(async (value) => {
					settingsTab.plugin.settings.syncFolderName = value;
					await settingsTab.plugin.saveSettings();
					settingsTab.display();
				})
		);

	settingsTab.settingsPage.createEl('h4', { text: 'Automation settings' });

	new Setting(containerEl)
		.setName('Create folder notes for all folders')
		.setDesc('Generate folder notes for every folder in the vault.')
		.addButton((cb) => {
			cb.setIcon('plus');
			cb.setTooltip('Create folder notes');
			cb.onClick(async () => {
				new ConfirmationModal(settingsTab.app, settingsTab.plugin).open();
			});
		});

	new Setting(containerEl)
		.setName('Auto-create on folder creation')
		.setDesc('Automatically create a folder note whenever a new folder is added.')
		.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.autoCreate)
				.onChange(async (value) => {
					settingsTab.plugin.settings.autoCreate = value;
					await settingsTab.plugin.saveSettings();
					settingsTab.display();
				})
		);

	if (settingsTab.plugin.settings.autoCreate) {
		new Setting(containerEl)
			.setName('Auto-open after creation')
			.setDesc('Open the folder note immediately after it’s created automatically.')
			.addToggle((toggle) =>
				toggle
					.setValue(settingsTab.plugin.settings.autoCreateFocusFiles)
					.onChange(async (value) => {
						settingsTab.plugin.settings.autoCreateFocusFiles = value;
						await settingsTab.plugin.saveSettings();
						settingsTab.display();
					})
			);

		new Setting(containerEl)
			.setName('Auto-create for attachment folders')
			.setDesc('Also automatically create folder notes for attachment folders (e.g., "Attachments", "Media", etc.).')
			.addToggle((toggle) =>
				toggle
					.setValue(settingsTab.plugin.settings.autoCreateForAttachmentFolder)
					.onChange(async (value) => {
						settingsTab.plugin.settings.autoCreateForAttachmentFolder = value;
						await settingsTab.plugin.saveSettings();
						settingsTab.display();
					})
			);
	}

	new Setting(containerEl)
		.setName('Auto-create when creating notes')
		.setDesc('Automatically create a folder note when a regular note is created inside a folder. Works for supported file types only.')
		.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.autoCreateForFiles)
				.onChange(async (value) => {
					settingsTab.plugin.settings.autoCreateForFiles = value;
					await settingsTab.plugin.saveSettings();
					settingsTab.display();
				})
		);

	settingsTab.settingsPage.createEl('h3', { text: 'Integration & Compatibility' });

	const desc1 = document.createDocumentFragment();

	const link = document.createElement('a');
	link.href = 'https://github.com/snezhig/obsidian-front-matter-title';
	link.textContent = 'front matter title plugin';
	link.target = '_blank';

	desc1.append(
		'Allows you to use the ',
		link,
		' with folder notes. It allows you to set the folder name to some name you set in the front matter.',
	);

	const fmtpSetting = new Setting(containerEl)
		.setName('Enable front matter title plugin integration')
		.setDesc(desc1)
		.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.frontMatterTitle.enabled)
				.onChange(async (value) => {
					settingsTab.plugin.settings.frontMatterTitle.enabled = value;
					await settingsTab.plugin.saveSettings();
					if (value) {
						settingsTab.plugin.fmtpHandler = new FrontMatterTitlePluginHandler(settingsTab.plugin);
					} else {
						if (settingsTab.plugin.fmtpHandler) {
							settingsTab.plugin.updateAllBreadcrumbs(true);
						}
						settingsTab.plugin.app.vault.getFiles().forEach((file) => {
							settingsTab.plugin.fmtpHandler?.fmptUpdateFileName({ id: '', result: false, path: file.path, pathOnly: false }, false);
						});
						settingsTab.plugin.fmtpHandler?.deleteEvent();
						settingsTab.plugin.fmtpHandler = null;
					}
					settingsTab.display();
				})
		);
	fmtpSetting.infoEl.appendText('Requires a restart to take effect');
	fmtpSetting.infoEl.style.color = settingsTab.app.vault.getConfig('accentColor') as string || '#7d5bed';

	settingsTab.settingsPage.createEl('h3', { text: 'Session & Persistence' });

	new Setting(containerEl)
		.setName('Persist tab after restart')
		.setDesc('Restore the same settings tab after restarting Obsidian.')
		.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.persistentSettingsTab.afterRestart)
				.onChange(async (value) => {
					settingsTab.plugin.settings.persistentSettingsTab.afterRestart = value;
					await settingsTab.plugin.saveSettings();
					settingsTab.display();
				})
		);

	new Setting(containerEl)
		.setName('Persist tab during session only')
		.setDesc('Keep the current settings tab open during the session, but reset it after a restart or reload.')
		.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.persistentSettingsTab.afterChangingTab)
				.onChange(async (value) => {
					settingsTab.plugin.settings.persistentSettingsTab.afterChangingTab = value;
					await settingsTab.plugin.saveSettings();
					settingsTab.display();
				})
		);
}
