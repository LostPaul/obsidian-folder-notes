import { ItemView, Setting, TFile, WorkspaceLeaf, MarkdownPostProcessorContext, Notice, Plugin } from 'obsidian';
import { FolderOverview, getOverviews, overviewSettings, parseOverviewTitle } from './FolderOverview';
import { FileSuggest } from './suggesters/FileSuggester';
import { createOverviewSettings } from './settings';
import FolderOverviewPlugin from 'src/main';
export const FOLDER_OVERVIEW_VIEW = 'folder-overview-view';
import FolderNotesPlugin from '../../main';

export class FolderOverviewView extends ItemView {
    plugin: FolderOverviewPlugin | FolderNotesPlugin;
    activeFile: TFile | null;
    overviewId: string | null;
    yaml: overviewSettings;
    defaultSettings: overviewSettings;
    contentEl: HTMLElement = this.containerEl.children[1] as HTMLElement;
    constructor(leaf: WorkspaceLeaf, plugin: FolderOverviewPlugin | FolderNotesPlugin) {
        super(leaf);
        this.plugin = plugin;

        this.display = this.display.bind(this);
        if (plugin instanceof FolderOverviewPlugin) {
            this.defaultSettings = this.plugin.settings as overviewSettings;
        } else {
            this.defaultSettings = plugin.settings.defaultOverview;
        }

        this.registerEvent(
            this.plugin.app.workspace.on('file-open', (file) => {
                this.activeFile = file;
                this.display(this.contentEl, this.yaml, this.plugin, this.defaultSettings, this.display, undefined, undefined, file);
            })
        );
    }

    getViewType() {
        return FOLDER_OVERVIEW_VIEW;
    }

    getDisplayText() {
        return 'Folder Overview settings';
    }

    getIcon() {
        return 'settings';
    }

    async onOpen() {
        this.display(this.contentEl, this.yaml, this.plugin, this.defaultSettings, this.display, undefined, undefined, this.activeFile);
    }

    async display(
        contentEl: HTMLElement,
        yaml: overviewSettings,
        plugin: FolderOverviewPlugin | FolderNotesPlugin,
        defaultSettings: overviewSettings,
        display: CallableFunction,
        el?: HTMLElement,
        ctx?: MarkdownPostProcessorContext,
        file?: TFile | null
    ) {
        this.contentEl = contentEl;
        this.yaml = yaml;
        this.defaultSettings = defaultSettings;
        if (file) { this.activeFile = file; }
        let header = contentEl.querySelector('.fn-folder-overview-header');
        if (!header) {
            header = contentEl.createEl('h4', {
                cls: 'fn-folder-overview-header',
                text: 'Folder Overview settings'
            });
        }

        const activeFile = plugin.app.workspace.getActiveFile();

        const overviews = await getOverviews(plugin, activeFile);

        let settingsContainer = contentEl.querySelector('.fn-settings-container') as HTMLElement;
        if (!settingsContainer) {
            settingsContainer = contentEl.createDiv({ cls: 'fn-settings-container' });
        } else {
            settingsContainer.empty();
        }

        const overviewSetting = new Setting(settingsContainer);
        overviewSetting
            .setName('Select overview')
            .setClass('fn-select-overview-setting')
            .addDropdown((cb) => {
                if (activeFile) {
                    const options = overviews.reduce((acc, overview) => {
                        acc[overview.id] = parseOverviewTitle(
                            overview as any as overviewSettings,
                            plugin,
                            activeFile.parent
                        );
                        return acc;
                    }, {} as Record<string, string>);
                    cb.addOptions(options);
                }

                cb.addOption('default', 'Default');
                cb.setValue(yaml?.id ?? 'default');

                if (cb.getValue() === 'default' || !yaml?.id.trim()) {
                    yaml = defaultSettings;
                    cb.setValue('default');
                } else {
                    yaml = overviews.find((overview) => overview.id === yaml.id) as any as overviewSettings;
                }

                cb.onChange(async (value) => {
                    if (value === 'default') {
                        yaml = defaultSettings;
                    } else {
                        yaml = overviews.find((overview) => overview.id === value) as any as overviewSettings;
                    }
                    await display(contentEl, yaml, plugin, defaultSettings, display, undefined, undefined, activeFile);
                });
            });

        await createOverviewSettings(settingsContainer, yaml, plugin, defaultSettings, display, undefined, undefined, activeFile);
    }
}
