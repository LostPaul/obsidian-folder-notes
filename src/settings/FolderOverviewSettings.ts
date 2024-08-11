import { Setting, TFolder } from "obsidian";
import { SettingsTab } from "./SettingsTab";
import { ListComponent } from 'src/functions/ListComponent';
import { includeTypes } from 'src/folderOverview/FolderOverview';
import { FolderSuggest } from "src/suggesters/FolderSuggester";

export async function renderFolderOverview(settingsTab: SettingsTab) {
    const { plugin } = settingsTab;
    let overviewSettings = plugin.settings.defaultOverview;
    const containerEl = settingsTab.settingsPage;
    containerEl.createEl('p', { text: 'Change the default settings for folder overviews', cls: 'setting-item-description' });

    new Setting(containerEl)
        .setName('Show the title')
        .setDesc('Choose if the title should be shown')
        .addToggle((toggle) =>
            toggle
                .setValue(overviewSettings.showTitle)
                .onChange(async (value) => {
                    overviewSettings.showTitle = value;
                    settingsTab.display();
                    plugin.saveSettings();
                })
        );

    if (overviewSettings.showTitle) {
        new Setting(containerEl)
            .setName('Title')
            .setDesc('Choose the title of the folder overview')
            .addText((text) =>
                text
                    .setValue(overviewSettings?.title || '{{folderName}} overview')
                    .onChange(async (value) => {
                        overviewSettings.title = value;
                        plugin.saveSettings();
                    })
            );
    }
    new Setting(containerEl)
        .setName('Folder path for the overview')
        .setDesc('Choose the folder path for the overview')
        .addSearch((search) => {
            new FolderSuggest(search.inputEl, plugin, false)
            search
                .setPlaceholder('Folder path')
                .setValue(overviewSettings?.folderPath || '')
                .onChange(async (value) => {
                    if (!(this.app.vault.getAbstractFileByPath(value) instanceof TFolder) && value !== '') return;
                    overviewSettings.folderPath = value;
                    plugin.saveSettings();
                });
        });
    new Setting(containerEl)
        .setName('Overview style')
        .setDesc('Choose the style of the overview (grid style soon)')
        .addDropdown((dropdown) =>
            dropdown
                .addOption('list', 'List')
                .addOption('explorer', 'Explorer')
                .setValue(overviewSettings?.style || 'list')
                .onChange(async (value: 'list') => {
                    overviewSettings.style = value;
                    settingsTab.display();
                    plugin.saveSettings();
                })
        );
    if (overviewSettings.style === 'explorer') {
        new Setting(containerEl)
            .setName('Store collapsed condition')
            .setDesc('Choose if the collapsed condition should be stored stored until you restart Obsidian')
            .addToggle((toggle) =>
                toggle
                    .setValue(overviewSettings.storeFolderCondition)
                    .onChange(async (value) => {
                        overviewSettings.storeFolderCondition = value;
                        plugin.saveSettings();
                    })
            );
    }
    const setting = new Setting(containerEl)
                        .setName('Include types');

    const list = new ListComponent(setting.settingEl, overviewSettings?.includeTypes || [], ['markdown', 'folder']);
    list.on('update', (values) => {
        overviewSettings.includeTypes = values;
        settingsTab.display();
        plugin.saveSettings();
    });

    if ((overviewSettings?.includeTypes?.length || 0) < 8 && !overviewSettings.includeTypes?.includes('all')) {
        setting.addDropdown((dropdown) => {
            overviewSettings.includeTypes = overviewSettings.includeTypes.map((type: string) => type.toLowerCase()) as includeTypes[];
            const options = [
                { value: 'markdown', label: 'Markdown' },
                { value: 'folder', label: 'Folder' },
                { value: 'canvas', label: 'Canvas' },
                { value: 'pdf', label: 'PDF' },
                { value: 'image', label: 'Image' },
                { value: 'audio', label: 'Audio' },
                { value: 'video', label: 'Video' },
                { value: 'other', label: 'All other file types' },
                { value: 'all', label: 'All file types' },
            ];

            options.forEach((option) => {
                if (!overviewSettings.includeTypes?.includes(option.value as includeTypes)) {
                    dropdown.addOption(option.value, option.label);
                }
            });
            dropdown.addOption('+', '+');
            dropdown.setValue('+');
            dropdown.onChange(async (value) => {
                if (value === 'all') {
                    overviewSettings.includeTypes = overviewSettings.includeTypes?.filter((type: string) => type === 'folder');
                    list.setValues(overviewSettings.includeTypes);
                }
                await list.addValue(value.toLowerCase());
                settingsTab.display();
                plugin.saveSettings();
            });
        });
    }
    
    let disableFileTag;
    overviewSettings.includeTypes?.forEach((type: string) => {
        type === 'folder' || type === 'markdown' ? (disableFileTag = true) : null;
    });
    if (disableFileTag) {
        new Setting(containerEl)
            .setName('Disable file tag')
            .setDesc('Choose if the file tag should be shown after the file name')
            .addToggle((toggle) => {
                toggle
                    .setValue(overviewSettings.disableFileTag)
                    .onChange(async (value) => {
                        overviewSettings.disableFileTag = value;
                        plugin.saveSettings();

                    });
            });
    }
    new Setting(containerEl)
        .setName('Show folder notes')
        .setDesc('Choose if folder notes (the note itself and not the folder name) should be shown in the overview')
        .addToggle((toggle) =>
            toggle
                .setValue(overviewSettings.showFolderNotes)
                .onChange(async (value) => {
                    overviewSettings.showFolderNotes = value;
                    plugin.saveSettings();

                })
        );

    if (overviewSettings.style !== 'explorer') {
        new Setting(containerEl)
            .setName('File depth')
            .setDesc('File & folder = +1 depth')
            .addSlider((slider) =>
                slider
                    .setValue(overviewSettings?.depth || 2)
                    .setLimits(1, 10, 1)
                    .onChange(async (value) => {
                        overviewSettings.depth = value;
                        plugin.saveSettings();

                    })
            );
    }

    new Setting(containerEl)
        .setName('Sort files by')
        .setDesc('Choose how the files should be sorted')
        .addDropdown((dropdown) =>
            dropdown
                .addOption('name', 'Name')
                .addOption('created', 'Created')
                .addOption('modified', 'Modified')
                .setValue(overviewSettings?.sortBy || 'name')
                .onChange(async (value: 'name' | 'created' | 'modified') => {
                    overviewSettings.sortBy = value;
                    plugin.saveSettings();

                })
        )
        .addDropdown((dropdown) => {
            dropdown
                .addOption('desc', 'Descending')
                .addOption('asc', 'Ascending')
            if (overviewSettings.sortByAsc) {
                dropdown.setValue('asc');
            } else {
                dropdown.setValue('desc');
            }
            dropdown.onChange(async (value) => {
                if (value === 'desc') {
                    overviewSettings.sortByAsc = false;
                } else {
                    overviewSettings.sortByAsc = true;
                }
                plugin.saveSettings();

            });
        });
    if (overviewSettings.style === 'list') {
        new Setting(containerEl)
            .setName('Show folder names of folders that appear empty in the folder overview')
            .setDesc('Show the names of folders that appear to have no files/folders in the folder overview. That\'s mostly the case when you set the file depth to 1.')
            .addToggle((toggle) => {
                toggle
                    .setValue(overviewSettings.showEmptyFolders)
                    .onChange(async (value) => {
                        overviewSettings.showEmptyFolders = value;
                        overviewSettings.onlyIncludeSubfolders = false;
                        settingsTab.display();
                        plugin.saveSettings();

                    });
            });

        if (overviewSettings.showEmptyFolders) {
            new Setting(containerEl)
                .setName('Only show first empty subfolders of current folder')
                .addToggle((toggle) => {
                    toggle
                        .setValue(overviewSettings.onlyIncludeSubfolders)
                        .onChange(async (value) => {
                            overviewSettings.onlyIncludeSubfolders = value;
                            plugin.saveSettings();
                        });
                });
        }
    }

    if (overviewSettings.style === 'explorer') {
        new Setting(containerEl)
            .setName('Disable collapse icon for folder notes')
            .setDesc('Remove the collapse icon next to the folder name for folder notes when they only contain the folder note itself')
            .addToggle((toggle) => {
                toggle
                    .setValue(overviewSettings.disableCollapseIcon)
                    .onChange(async (value) => {
                        overviewSettings.disableCollapseIcon = value;
                        plugin.saveSettings();
                    });
            });
    }

}
