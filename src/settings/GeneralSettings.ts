import { Setting, Platform } from "obsidian";
import { SettingsTab } from "./SettingsTab";
import ListComponent from '../functions/ListComponent';
import AddSupportedFileModal from '../modals/AddSupportedFileType';
import { FrontMatterTitlePluginHandler } from '../events/FrontMatterTitle';
import ConfirmationModal from "../modals/ConfirmCreation";
import { TemplateSuggest } from '../suggesters/TemplateSuggester';

export async function renderGeneral(settingsTab: SettingsTab) {
    settingsTab.settingsPage.createEl('h1', { text: 'General settings' });
    const containerEl = settingsTab.settingsPage;
    const nameSetting = new Setting(containerEl)
        .setName('Folder note name')
        .setDesc('{{folder_name}} will be replaced with the name of the folder')
        .addText((text) =>
            text
                .setValue(settingsTab.plugin.settings.newFolderNoteName)
                .onChange(async (value) => {
                    if (value.trim() === '') { return; }
                    settingsTab.plugin.settings.newFolderNoteName = value;
                    await settingsTab.plugin.saveSettings();
                })
        )
        .addButton((button) =>
            button
                .setButtonText('Rename existing folder notes')
                .setCta()
                .onClick(async () => {
                    settingsTab.updateFolderNotes(settingsTab.plugin.settings.newFolderNoteName);
                })
        );
    nameSetting.infoEl.appendText('Make sure to back up your vault before renaming all folder notes and restart Obsidian after renaming them');
    nameSetting.infoEl.style.color = settingsTab.app.vault.getConfig('accentColor') as string || '#7d5bed';

    new Setting(containerEl)
        .setName('Default folder note type for new folder notes')
        .setDesc('Choose the default file type for new folder notes. (canvas, markdown, ...)')
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
            const defaultType = settingsTab.plugin.settings.folderNoteType.startsWith('.') ? settingsTab.plugin.settings.folderNoteType : '.' + settingsTab.plugin.settings.folderNoteType;

            dropdown
                .setValue(defaultType)
                .onChange(async (value: '.md' | '.canvas') => {
                    settingsTab.plugin.settings.folderNoteType = value;
                    settingsTab.plugin.saveSettings();
                    settingsTab.display();
                })
        });

    const setting0 = new Setting(containerEl)
    setting0.setName('Supported file types for folder notes')
    const desc0 = document.createDocumentFragment();
    desc0.append(
        'Choose the file types that should be supported for folder notes. (e.g. if you click on a folder name it searches for all file extensions that are supported)',
        desc0.createEl('br'),
        'Adding more file types may cause performance issues becareful when adding more file types and don\'t add too many.',
    )
    setting0.setDesc(desc0);
    const list = setting0.createList((list: ListComponent) => {
        list.addSettings(settingsTab)
        list.setValues(settingsTab.plugin.settings.supportedFileTypes || ['md', 'canvas']);
        list.addResetButton();
    })

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
                // @ts-ignore
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


    const setting = new Setting(containerEl);
    const desc = document.createDocumentFragment();
    desc.append(
        'Restart after changing the template path',
    );
    setting.setName('Template path');
    setting.setDesc(desc).descEl.style.color = settingsTab.app.vault.getConfig('accentColor') as string || '#7d5bed';
    setting.addSearch((cb) => {
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
                    settingsTab.plugin.loadFileClasses();
                })
        );
    storageLocation.infoEl.appendText('Requires a restart to take effect');
    storageLocation.infoEl.style.color = settingsTab.app.vault.getConfig('accentColor') as string || '#7d5bed';

    const switchLocation = new Setting(containerEl)
        .setName('Switch to new storage location')
        .setDesc('Move all folder notes to the new storage location')
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
                    settingsTab.switchStorageLocation(oldStorageLocation);
                })
        );
    switchLocation.infoEl.appendText('Requires a restart to take effect');
    switchLocation.infoEl.style.color = settingsTab.app.vault.getConfig('accentColor') as string || '#7d5bed';

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
            .setDesc('Move the folder note when moving the folder')
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
    if (Platform.isDesktop) {
        const setting3 = new Setting(containerEl);
        setting3.setName('Open folder note in a new tab by default');
        setting3.setDesc('Always open folder notes in a new tab (except when you try to open the same note) instead of having to use ctrl/cmd + click to open in a new tab');
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
    new Setting(containerEl)
        .setName('Automatically create folder notes')
        .setDesc('Automatically create a folder note when a new folder is created')
        .addToggle((toggle) =>
            toggle
                .setValue(settingsTab.plugin.settings.autoCreate)
                .onChange(async (value) => {
                    settingsTab.plugin.settings.autoCreate = value;
                    await settingsTab.plugin.saveSettings();
                    settingsTab.display();
                })
        );

    new Setting(containerEl)
        .setName('Enable front matter title plugin integration')
        .setDesc('Automatically rename a folder name when the folder note is renamed')
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
                            settingsTab.plugin.updateBreadcrumbs(true);
                        }
                        settingsTab.plugin.app.vault.getFiles().forEach((file) => {
                            settingsTab.plugin.fmtpHandler?.handleRename({ id: '', result: false, path: file.path }, false);
                        });
                        settingsTab.plugin.fmtpHandler?.deleteEvent();
                        settingsTab.plugin.fmtpHandler = null;
                    }
                    settingsTab.display();
                })
        );

    new Setting(containerEl)
        .setName('Create folder note for every folder')
        .setDesc('Create a folder note for every folder in the vault')
        .addButton((cb) => {
            cb.setIcon('plus');
            cb.setTooltip('Create folder notes');
            cb.onClick(async () => {
                new ConfirmationModal(settingsTab.app, settingsTab.plugin).open();
            });
        });
}