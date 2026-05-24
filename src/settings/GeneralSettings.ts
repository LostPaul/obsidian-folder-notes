/* eslint-disable max-len */
import { Setting, Platform } from 'obsidian';
import type { SettingsTab } from './SettingsTab';
import { ListComponent } from '../functions/ListComponent';
import AddSupportedFileModal from '../modals/AddSupportedFileType';
import { FrontMatterTitlePluginHandler } from '../events/FrontMatterTitle';
import ConfirmationModal from './modals/CreateFnForEveryFolder';
import { TemplateSuggest } from '../suggesters/TemplateSuggester';
import { refreshAllFolderStyles } from '../functions/styleFunctions';
import BackupWarningModal from './modals/BackupWarning';
import RenameFolderNotesModal from './modals/RenameFns';
import { t, setLanguage } from '../i18n';

let debounceTimer: NodeJS.Timeout;

// eslint-disable-next-line complexity
export async function renderGeneral(settingsTab: SettingsTab): Promise<void> {
	const containerEl = settingsTab.settingsPage;

	// Language selector
	new Setting(containerEl)
		.setName(t('language'))
		.setDesc(t('languageDesc'))
		.addDropdown((dropdown) => {
			dropdown.addOption('en', t('langEnglish'));
			dropdown.addOption('zh', t('langChinese'));
			dropdown.setValue(settingsTab.plugin.settings.language ?? 'en');
			dropdown.onChange(async (value) => {
				settingsTab.plugin.settings.language = value;
				await settingsTab.plugin.saveSettings();
				setLanguage(value);
				settingsTab.display();
			});
		});

	const nameSetting = new Setting(containerEl)
		.setName(t('folderNoteNameTemplate'))
		.setDesc(t('folderNoteNameTemplateDesc'))
		.addText((text) =>
			text
				.setValue(settingsTab.plugin.settings.folderNoteName)
				.onChange(async (value) => {
					if (value.trim() === '') { return; }
					settingsTab.plugin.settings.folderNoteName = value;
					await settingsTab.plugin.saveSettings();

					clearTimeout(debounceTimer);
					const FOLDER_NOTE_NAME_DEBOUNCE_MS = 2000;
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
					}, FOLDER_NOTE_NAME_DEBOUNCE_MS);
				}),
		)
		.addButton((button) =>
			button
				.setButtonText(t('renameExistingFolderNotes'))
				.setCta()
				.onClick(async () => {
					new RenameFolderNotesModal(
						settingsTab.plugin,
						t('renameAllExistingFolderNotes'),
						t('renameConfirmMsg'),
						settingsTab.renameFolderNotes,
						[])
						.open();
				}),
		);
	nameSetting.infoEl.appendText(t('requiresRestart'));
	nameSetting.infoEl.style.color = settingsTab.app.vault.getConfig('accentColor') as string || '#7d5bed';

	if (!settingsTab.plugin.settings.folderNoteName.includes('{{folder_name}}')) {
		new Setting(containerEl)
			.setName(t('displayFolderNameInTabTitle'))
			.setDesc(t('displayFolderNameInTabTitleDesc'))
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
					}),
			);
	}

	new Setting(containerEl)
		.setName(t('defaultFileType'))
		.setDesc(t('defaultFileTypeDesc'))
		.addDropdown((dropdown) => {
			dropdown.addOption('.ask', t('askForFileType'));
			settingsTab.plugin.settings.supportedFileTypes.forEach((type) => {
				if (type === '.md' || type === 'md') {
					dropdown.addOption('.md', t('markdown'));
				} else {
					dropdown.addOption('.' + type, type);
				}
			});

			if (
				!settingsTab.plugin.settings.supportedFileTypes.includes(
					settingsTab.plugin.settings.folderNoteType.replace('.', ''),
				) &&
				settingsTab.plugin.settings.folderNoteType !== '.ask'
			) {
				settingsTab.plugin.settings.folderNoteType = '.md';
				settingsTab.plugin.saveSettings();
			}

			let defaultType = settingsTab.plugin.settings.folderNoteType.startsWith('.')
				? settingsTab.plugin.settings.folderNoteType
				: '.' + settingsTab.plugin.settings.folderNoteType;
			if (
				!settingsTab.plugin.settings.supportedFileTypes.includes(
					defaultType.replace('.', ''),
				)
			) {
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
	setting0.setName(t('supportedFileTypes'));
	const desc0 = document.createDocumentFragment();
	desc0.append(t('supportedFileTypesDesc'));
	setting0.setDesc(desc0);
	const list = new ListComponent(
		setting0.settingEl,
		settingsTab.plugin.settings.supportedFileTypes || [],
		['md', 'canvas'],
	);
	list.on('update', async (values: string[]) => {
		settingsTab.plugin.settings.supportedFileTypes = values;
		await settingsTab.plugin.saveSettings();
		settingsTab.display();
	});

	if (
		!settingsTab.plugin.settings.supportedFileTypes.includes('md') ||
		!settingsTab.plugin.settings.supportedFileTypes.includes('canvas') ||
		!settingsTab.plugin.settings.supportedFileTypes.includes('excalidraw')
	) {
		setting0.addDropdown((dropdown) => {
			const options = [
				{ value: 'md', label: 'Markdown' },
				{ value: 'canvas', label: 'Canvas' },
				{ value: 'base', label: 'Bases' },
				{ value: 'excalidraw', label: 'Excalidraw' },
				{ value: 'custom', label: t('customExtension') },
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
					return new AddSupportedFileModal(
						settingsTab.app,
						settingsTab.plugin,
						settingsTab,
						list as ListComponent,
					).open();
				}
				await list.addValue(value.toLowerCase());
				settingsTab.display();
				settingsTab.plugin.saveSettings();
			});
		});
	} else {
		setting0.addButton((button) =>
			button
				.setButtonText(t('addCustomFileType'))
				.setCta()
				.onClick(async () => {
					new AddSupportedFileModal(
						settingsTab.app,
						settingsTab.plugin,
						settingsTab,
						list as ListComponent,
					).open();
				}),
		);
	}


	const templateSetting = new Setting(containerEl)
		.setDesc(t('templatePathDesc'))
		.setName(t('templatePath'))
		.addSearch((cb) => {
			new TemplateSuggest(cb.inputEl, settingsTab.plugin);
			cb.setPlaceholder(t('templatePathPlaceholder'));
			const templateFile = settingsTab.plugin.app.vault.getAbstractFileByPath(
				settingsTab.plugin.settings.templatePath,
			);
			const templateName = templateFile?.name.replace('.md', '') || '';
			cb.setValue(templateName);
			cb.onChange(async (value) => {
				if (value.trim() === '') {
					settingsTab.plugin.settings.templatePath = '';
					await settingsTab.plugin.saveSettings();
					settingsTab.display();
					return;
				}
			});
		});
	templateSetting.infoEl.appendText(t('requiresRestart'));
	templateSetting.infoEl.style.color = settingsTab.app.vault.getConfig('accentColor') as string || '#7d5bed';

	const storageLocation = new Setting(containerEl)
		.setName(t('storageLocation'))
		.setDesc(t('storageLocationDesc'))
		.addDropdown((dropdown) =>
			dropdown
				.addOption('insideFolder', t('insideFolder'))
				.addOption('parentFolder', t('inParentFolder'))
				.setValue(settingsTab.plugin.settings.storageLocation)
				.onChange(async (value: 'insideFolder' | 'parentFolder' | 'vaultFolder') => {
					settingsTab.plugin.settings.storageLocation = value;
					await settingsTab.plugin.saveSettings();
					settingsTab.display();
					refreshAllFolderStyles(undefined, settingsTab.plugin);
				}),
		)
		.addButton((button) =>
			button
				.setButtonText(t('switchButton'))
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
						t('switchStorageLocationTitle'),
						t('switchStorageLocationMsg'),
						settingsTab.switchStorageLocation,
						[oldStorageLocation],
					).open();
				}),
		);
	storageLocation.infoEl.appendText(t('requiresRestart'));
	storageLocation.infoEl.style.color = settingsTab.app.vault.getConfig('accentColor') as string || '#7d5bed';

	if (settingsTab.plugin.settings.storageLocation === 'parentFolder') {
		new Setting(containerEl)
			.setName(t('deleteFolderNotesOnFolderDelete'))
			.setDesc(t('deleteFolderNotesOnFolderDeleteDesc'))
			.addToggle((toggle) =>
				toggle
					.setValue(settingsTab.plugin.settings.syncDelete)
					.onChange(async (value) => {
						settingsTab.plugin.settings.syncDelete = value;
						await settingsTab.plugin.saveSettings();
					},
					),
			);
		new Setting(containerEl)
			.setName(t('moveFolderNotesOnFolderMove'))
			.setDesc(t('moveFolderNotesOnFolderMoveDesc'))
			.addToggle((toggle) =>
				toggle
					.setValue(settingsTab.plugin.settings.syncMove)
					.onChange(async (value) => {
						settingsTab.plugin.settings.syncMove = value;
						await settingsTab.plugin.saveSettings();
					}),
			);
	}
	if (Platform.isDesktopApp) {
		settingsTab.settingsPage.createEl('h3', { text: t('keyboardShortcuts') });

		new Setting(containerEl)
			.setName(t('keyForCreatingFolderNote'))
			.setDesc(t('keyForCreatingFolderNoteDesc'))
			.addDropdown((dropdown) => {
				if (!Platform.isMacOS) {
					dropdown.addOption('ctrl', t('ctrlClick'));
					dropdown.addOption('alt', t('altClick'));
				} else {
					dropdown.addOption('ctrl', t('cmdClick'));
					dropdown.addOption('alt', t('optionClick'));
				}
				dropdown.setValue(settingsTab.plugin.settings.ctrlKey ? 'ctrl' : 'alt');
				dropdown.onChange(async (value) => {
					settingsTab.plugin.settings.ctrlKey = value === 'ctrl';
					settingsTab.plugin.settings.altKey = value === 'alt';
					await settingsTab.plugin.saveSettings();
					settingsTab.display();
				});
			});

		new Setting(containerEl)
			.setName(t('keyForOpeningFolderNote'))
			.setDesc(t('keyForOpeningFolderNoteDesc'))
			.addDropdown((dropdown) => {
				dropdown.addOption('click', t('mouseClick'));
				if (!Platform.isMacOS) {
					dropdown.addOption('ctrl', t('ctrlClick'));
					dropdown.addOption('alt', t('altClick'));
				} else {
					dropdown.addOption('ctrl', t('cmdClick'));
					dropdown.addOption('alt', t('optionClick'));
				}
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

	settingsTab.settingsPage.createEl('h3', { text: t('folderNoteBehavior') });

	new Setting(containerEl)
		.setName(t('confirmFolderNoteDeletion'))
		.setDesc(t('confirmFolderNoteDeletionDesc'))
		.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.showDeleteConfirmation)
				.onChange(async (value) => {
					settingsTab.plugin.settings.showDeleteConfirmation = value;
					await settingsTab.plugin.saveSettings();
					settingsTab.display();
				}),
		);

	new Setting(containerEl)
		.setName(t('deletedFolderNotes'))
		.setDesc(t('deletedFolderNotesDesc'))
		.addDropdown((dropdown) => {
			dropdown.addOption('trash', t('moveToSystemTrash'));
			dropdown.addOption('obsidianTrash', t('moveToObsidianTrash'));
			dropdown.addOption('delete', t('deletePermanently'));
			dropdown.setValue(settingsTab.plugin.settings.deleteFilesAction);
			dropdown.onChange(async (value: 'trash' | 'delete' | 'obsidianTrash') => {
				settingsTab.plugin.settings.deleteFilesAction = value;
				await settingsTab.plugin.saveSettings();
				settingsTab.display();
			});
		});

	if (Platform.isDesktop) {
		const setting3 = new Setting(containerEl);
		setting3.setName(t('openInNewTab'));
		setting3.setDesc(t('openInNewTabDesc'));
		setting3.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.openInNewTab)
				.onChange(async (value) => {
					settingsTab.plugin.settings.openInNewTab = value;
					await settingsTab.plugin.saveSettings();
					settingsTab.display();
				}),
		);
		setting3.infoEl.appendText(t('requiresRestart'));
		setting3.infoEl.style.color = settingsTab.app.vault.getConfig('accentColor') as string || '#7d5bed';
	}

	if (settingsTab.plugin.settings.openInNewTab) {
		new Setting(containerEl)
			.setName(t('focusExistingTab'))
			.setDesc(t('focusExistingTabDesc'))
			.addToggle((toggle) =>
				toggle
					.setValue(settingsTab.plugin.settings.focusExistingTab)
					.onChange(async (value) => {
						settingsTab.plugin.settings.focusExistingTab = value;
						await settingsTab.plugin.saveSettings();
						settingsTab.display();
					}),
			);
	}

	new Setting(containerEl)
		.setName(t('syncFolderName'))
		.setDesc(t('syncFolderNameDesc'))
		.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.syncFolderName)
				.onChange(async (value) => {
					settingsTab.plugin.settings.syncFolderName = value;
					await settingsTab.plugin.saveSettings();
					settingsTab.display();
				}),
		);

	settingsTab.settingsPage.createEl('h4', { text: t('automationSettings') });

	new Setting(containerEl)
		.setName(t('createFolderNotesForAllFolders'))
		.setDesc(t('createFolderNotesForAllFoldersDesc'))
		.addButton((cb) => {
			cb.setIcon('plus');
			cb.setTooltip(t('createFolderNotesForAllFolders'));
			cb.onClick(async () => {
				new ConfirmationModal(settingsTab.app, settingsTab.plugin).open();
			});
		});

	new Setting(containerEl)
		.setName(t('autoCreateOnFolderCreation'))
		.setDesc(t('autoCreateOnFolderCreationDesc'))
		.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.autoCreate)
				.onChange(async (value) => {
					settingsTab.plugin.settings.autoCreate = value;
					await settingsTab.plugin.saveSettings();
					settingsTab.display();
				}),
		);

	if (settingsTab.plugin.settings.autoCreate) {
		new Setting(containerEl)
			.setName(t('autoOpenAfterCreation'))
			.setDesc(t('autoOpenAfterCreationDesc'))
			.addToggle((toggle) =>
				toggle
					.setValue(settingsTab.plugin.settings.autoCreateFocusFiles)
					.onChange(async (value) => {
						settingsTab.plugin.settings.autoCreateFocusFiles = value;
						await settingsTab.plugin.saveSettings();
						settingsTab.display();
					}),
			);

		new Setting(containerEl)
			.setName(t('autoCreateForAttachmentFolders'))
			.setDesc(t('autoCreateForAttachmentFoldersDesc'))
			.addToggle((toggle) =>
				toggle
					.setValue(settingsTab.plugin.settings.autoCreateForAttachmentFolder)
					.onChange(async (value) => {
						settingsTab.plugin.settings.autoCreateForAttachmentFolder = value;
						await settingsTab.plugin.saveSettings();
						settingsTab.display();
					}),
			);
	}

	new Setting(containerEl)
		.setName(t('autoCreateWhenCreatingNotes'))
		.setDesc(t('autoCreateWhenCreatingNotesDesc'))
		.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.autoCreateForFiles)
				.onChange(async (value) => {
					settingsTab.plugin.settings.autoCreateForFiles = value;
					await settingsTab.plugin.saveSettings();
					settingsTab.display();
				}),
		);

	settingsTab.settingsPage.createEl('h3', { text: t('integrationCompatibility') });

	const desc1 = document.createDocumentFragment();
	const link = document.createElement('a');
	link.href = 'https://github.com/snezhig/obsidian-front-matter-title';
	link.textContent = t('frontMatterTitlePlugin');
	link.target = '_blank';
	const fmtpDescText = t('enableFmtpIntegrationDesc');
	const [before, after] = fmtpDescText.split('{link}');
	desc1.append(before ?? '');
	desc1.appendChild(link);
	desc1.append(after ?? '');

	const fmtpSetting = new Setting(containerEl)
		.setName(t('enableFmtpIntegration'))
		.setDesc(desc1)
		.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.frontMatterTitle.enabled)
				.onChange(async (value) => {
					settingsTab.plugin.settings.frontMatterTitle.enabled = value;
					await settingsTab.plugin.saveSettings();
					if (value) {
						settingsTab.plugin.fmtpHandler =
							new FrontMatterTitlePluginHandler(settingsTab.plugin);
					} else {
						if (settingsTab.plugin.fmtpHandler) {
							settingsTab.plugin.updateAllBreadcrumbs(true);
						}
						settingsTab.plugin.app.vault.getFiles().forEach((file) => {
							settingsTab.plugin.fmtpHandler?.fmptUpdateFileName(
								{
									id: '',
									result: false,
									path: file.path,
									pathOnly: false,
								},
								false,
							);
						});
						settingsTab.plugin.fmtpHandler?.deleteEvent();
						settingsTab.plugin.fmtpHandler =
							new FrontMatterTitlePluginHandler(settingsTab.plugin);
					}
					settingsTab.display();
				}),
		);
	fmtpSetting.infoEl.appendText(t('requiresRestart'));
	fmtpSetting.infoEl.style.color = settingsTab.app.vault.getConfig('accentColor') as string || '#7d5bed';

	settingsTab.settingsPage.createEl('h3', { text: t('sessionPersistence') });

	new Setting(containerEl)
		.setName(t('persistTabAfterRestart'))
		.setDesc(t('persistTabAfterRestartDesc'))
		.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.persistentSettingsTab.afterRestart)
				.onChange(async (value) => {
					settingsTab.plugin.settings.persistentSettingsTab.afterRestart = value;
					await settingsTab.plugin.saveSettings();
					settingsTab.display();
				}),
		);

	new Setting(containerEl)
		.setName(t('persistTabDuringSession'))
		.setDesc(t('persistTabDuringSessionDesc'))
		.addToggle((toggle) =>
			toggle
				.setValue(settingsTab.plugin.settings.persistentSettingsTab.afterChangingTab)
				.onChange(async (value) => {
					settingsTab.plugin.settings.persistentSettingsTab.afterChangingTab = value;
					await settingsTab.plugin.saveSettings();
					settingsTab.display();
				}),
		);
}
