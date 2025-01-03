import { MarkdownPostProcessorContext, Setting, TFile, TFolder } from 'obsidian';
import { updateYaml, updateYamlById, yamlSettings, includeTypes } from './FolderOverview';
import { FolderSuggest } from 'src/suggesters/FolderSuggester';
import { ListComponent } from 'src/functions/ListComponent';
import FolderNotesPlugin from 'src/main';
import { Callback } from 'front-matter-plugin-api-provider';
import { SettingsTab } from 'src/settings/SettingsTab';
import { FolderOverviewSettings } from './ModalSettings';

export async function createOverviewSettings(contentEl: HTMLElement, yaml: yamlSettings, plugin: FolderNotesPlugin, defaultSettings: boolean, display: CallableFunction, el?: HTMLElement, ctx?: MarkdownPostProcessorContext, file?: TFile | null, settingsTab?: SettingsTab, modal?: FolderOverviewSettings) {

    new Setting(contentEl)
        .setName('Show the title')
        .setDesc('Choose if the title should be shown')
        .addToggle((toggle) =>
            toggle
                .setValue(yaml.showTitle)
                .onChange(async (value) => {
                    yaml.showTitle = value;
                    updateSettings(contentEl, yaml, plugin, defaultSettings, el, ctx, file);;
                    refresh(contentEl, yaml, plugin, defaultSettings, display, el, ctx, file, settingsTab, modal);
                })
        );
    if (yaml.showTitle) {
        new Setting(contentEl)
            .setName('Title')
            .setDesc('Choose the title of the folder overview')
            .addText((text) =>
                text
                    .setValue(yaml?.title || '{{folderName}} overview')
                    .onChange(async (value) => {
                        yaml.title = value;
                        updateSettings(contentEl, yaml, plugin, defaultSettings, el, ctx, file);;
                    })
            );
    }

    new Setting(contentEl)
        .setName('Folder path for the overview')
        .setDesc('Choose the folder path for the overview')
        .addSearch((search) => {
            new FolderSuggest(search.inputEl, plugin, false)
            search
                .setPlaceholder('Folder path')
                .setValue(yaml?.folderPath || '')
                .onChange(async (value) => {
                    if (!(plugin.app.vault.getAbstractFileByPath(value) instanceof TFolder) && value !== '') return;
                    yaml.folderPath = value;
                    updateSettings(contentEl, yaml, plugin, defaultSettings, el, ctx, file);;
                });
        });

    new Setting(contentEl)
        .setName('Overview style')
        .setDesc('Choose the style of the overview (grid style soon)')
        .addDropdown((dropdown) =>
            dropdown
                .addOption('list', 'List')
                .addOption('explorer', 'Explorer')
                .setValue(yaml?.style || 'list')
                .onChange(async (value: 'list') => {
                    yaml.style = value;
                    updateSettings(contentEl, yaml, plugin, defaultSettings, el, ctx, file);
                    refresh(contentEl, yaml, plugin, defaultSettings, display, el, ctx, file, settingsTab, modal);
                })
        );

    if (yaml.style === 'explorer') {
        new Setting(contentEl)
            .setName('Store collapsed condition')
            .setDesc('Choose if the collapsed condition should be stored stored until you restart Obsidian')
            .addToggle((toggle) =>
                toggle
                    .setValue(yaml.storeFolderCondition)
                    .onChange(async (value) => {
                        yaml.storeFolderCondition = value;
                        updateSettings(contentEl, yaml, plugin, defaultSettings, el, ctx, file);;
                    })
            );
    }

    const setting = new Setting(contentEl);
    setting.setName('Include types');
    const list = new ListComponent(setting.settingEl, yaml.includeTypes || [], ['markdown', 'folder']);
    list.on('update', (values) => {
        yaml.includeTypes = values;
        updateSettings(contentEl, yaml, plugin, defaultSettings, el, ctx, file);
        refresh(contentEl, yaml, plugin, defaultSettings, display, el, ctx, file, settingsTab, modal);
    });

    if ((yaml?.includeTypes?.length || 0) < 8 && !yaml.includeTypes?.includes('all')) {
        setting.addDropdown((dropdown) => {
            if (!yaml.includeTypes) yaml.includeTypes = plugin.settings.defaultOverview.includeTypes || [];
            yaml.includeTypes = yaml.includeTypes.map((type: string) => type.toLowerCase()) as includeTypes[];
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
                if (!yaml.includeTypes?.includes(option.value as includeTypes)) {
                    dropdown.addOption(option.value, option.label);
                }
            });
            dropdown.addOption('+', '+');
            dropdown.setValue('+');
            dropdown.onChange(async (value) => {
                if (value === 'all') {
                    yaml.includeTypes = yaml.includeTypes?.filter((type: string) => type === 'folder');
                    list.setValues(yaml.includeTypes);
                }
                await list.addValue(value.toLowerCase());
                updateSettings(contentEl, yaml, plugin, defaultSettings, el, ctx, file);
                refresh(contentEl, yaml, plugin, defaultSettings, display, el, ctx, file, settingsTab, modal);
            });
        });
    }

    let disableFileTag;
    yaml.includeTypes?.forEach((type: string) => {
        type === 'folder' || type === 'markdown' ? (disableFileTag = true) : null;
    });

    if (disableFileTag) {
        new Setting(contentEl)
            .setName('Disable file tag')
            .setDesc('Choose if the file tag should be shown after the file name')
            .addToggle((toggle) => {
                toggle
                    .setValue(yaml.disableFileTag)
                    .onChange(async (value) => {
                        yaml.disableFileTag = value;
                        updateSettings(contentEl, yaml, plugin, defaultSettings, el, ctx, file);
                    });
            });
    }

    new Setting(contentEl)
        .setName('Show folder notes')
        .setDesc('Choose if folder notes (the note itself and not the folder name) should be shown in the overview')
        .addToggle((toggle) =>
            toggle
                .setValue(yaml.showFolderNotes)
                .onChange(async (value) => {
                    yaml.showFolderNotes = value;
                    updateSettings(contentEl, yaml, plugin, defaultSettings, el, ctx, file);
                })
        );

    new Setting(contentEl)
        .setName('File depth')
        .setDesc('File & folder = +1 depth')
        .addSlider((slider) =>
            slider
                .setValue(yaml?.depth || 2)
                .setLimits(1, 10, 1)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    yaml.depth = value;
                    updateSettings(contentEl, yaml, plugin, defaultSettings, el, ctx, file);
                })
        );

    new Setting(contentEl)
        .setName('Sort files by')
        .setDesc('Choose how the files should be sorted')
        .addDropdown((dropdown) =>
            dropdown
                .addOption('name', 'Name')
                .addOption('created', 'Created')
                .addOption('modified', 'Modified')
                .setValue(yaml?.sortBy || 'name')
                .onChange(async (value: 'name' | 'created' | 'modified') => {
                    yaml.sortBy = value;
                    updateSettings(contentEl, yaml, plugin, defaultSettings, el, ctx, file);
                })
        )
        .addDropdown((dropdown) => {
            dropdown
                .addOption('desc', 'Descending')
                .addOption('asc', 'Ascending')
            if (yaml.sortByAsc) {
                dropdown.setValue('asc');
            } else {
                dropdown.setValue('desc');
            }
            dropdown.onChange(async (value) => {
                if (value === 'desc') {
                    yaml.sortByAsc = false;
                } else {
                    yaml.sortByAsc = true;
                }
                updateSettings(contentEl, yaml, plugin, defaultSettings, el, ctx, file);
            });
        });

    if (yaml.style === 'list') {
        new Setting(contentEl)
            .setName('Show folder names of folders that appear empty in the folder overview')
            .setDesc('Show the names of folders that appear to have no files/folders in the folder overview. That\'s mostly the case when you set the file depth to 1.')
            .addToggle((toggle) => {
                toggle
                    .setValue(yaml.showEmptyFolders)
                    .onChange(async (value) => {
                        yaml.showEmptyFolders = value;
                        yaml.onlyIncludeSubfolders = false;
                        updateSettings(contentEl, yaml, plugin, defaultSettings, el, ctx, file);
                        refresh(contentEl, yaml, plugin, defaultSettings, display, el, ctx, file, settingsTab, modal);
                    });
            });

        if (yaml.showEmptyFolders) {
            new Setting(contentEl)
                .setName('Only show first empty subfolders of current folder')
                .addToggle((toggle) => {
                    toggle
                        .setValue(yaml.onlyIncludeSubfolders)
                        .onChange(async (value) => {
                            yaml.onlyIncludeSubfolders = value;
                            updateSettings(contentEl, yaml, plugin, defaultSettings, el, ctx, file);
                        });
                });
        }
    }

    if (yaml.style === 'explorer') {
        new Setting(contentEl)
            .setName('Disable collapse icon for folder notes')
            .setDesc('Remove the collapse icon next to the folder name for folder notes when they only contain the folder note itself')
            .addToggle((toggle) => {
                toggle
                    .setValue(yaml.disableCollapseIcon)
                    .onChange(async (value) => {
                        yaml.disableCollapseIcon = value;
                        updateSettings(contentEl, yaml, plugin, defaultSettings, el, ctx, file);
                    });
            });

        new Setting(contentEl)
            .setName('Collapse all in the tree by default')
            .setDesc('Collapse every folder in the file explorer in the overview by default')
            .addToggle((toggle) => {
                toggle
                    .setValue(yaml.alwaysCollapse)
                    .onChange(async (value) => {
                        yaml.alwaysCollapse = value;
                        updateSettings(contentEl, yaml, plugin, defaultSettings, el, ctx, file);
                    });
            });
    }
}

async function updateSettings(contentEl: HTMLElement, yaml: yamlSettings, plugin: FolderNotesPlugin, defaultSettings: boolean, el?: HTMLElement, ctx?: MarkdownPostProcessorContext, file?: TFile | null) {
    if (defaultSettings) {
        return plugin.saveSettings();
    }

    if (el && ctx) {
        await updateYaml(plugin, ctx, el, yaml);
    }

    if (file) {
        await updateYamlById(plugin, yaml.id, file, yaml);
    }
    plugin.updateOverviewView();
}

function refresh(contentEl: HTMLElement, yaml: yamlSettings, plugin: FolderNotesPlugin, defaultSettings: boolean, display: CallableFunction, el?: HTMLElement, ctx?: MarkdownPostProcessorContext, file?: TFile | null, settingsTab?: SettingsTab, modal?: FolderOverviewSettings) {
    if (file) {
        contentEl = contentEl.parentElement as HTMLElement;
    }
    display(contentEl, yaml, plugin, defaultSettings, display, el, ctx, file, settingsTab, modal);
}