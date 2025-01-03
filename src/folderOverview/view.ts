import { ItemView, Setting, TFile, WorkspaceLeaf, MarkdownPostProcessorContext } from 'obsidian';
import FolderNotesPlugin from '../main';
import { FolderOverview, getOverviews, yamlSettings, parseOverviewTitle } from './FolderOverview';
import { FileSuggest } from 'src/suggesters/FileSuggester';
import { createOverviewSettings } from './settings';

export const FOLDER_OVERVIEW_VIEW = 'folder-overview-view';

export class FolderOverviewView extends ItemView {
    plugin: FolderNotesPlugin;
    activeFile: TFile | null;
    overviewId: string | null;
    yaml: yamlSettings;
    defaultSettings: boolean;
    contentEl: HTMLElement = this.containerEl.children[1] as HTMLElement;
    constructor(leaf: WorkspaceLeaf, plugin: FolderNotesPlugin) {
        super(leaf);
        this.plugin = plugin;

        this.display = this.display.bind(this);

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
        yaml: yamlSettings,
        plugin: FolderNotesPlugin,
        defaultSettings: boolean,
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
        if (!activeFile) {
            let msg = contentEl.querySelector('.fn-no-file-msg');
            if (!msg) {
                msg = contentEl.createEl('p', { cls: 'fn-no-file-msg' });
            }
            msg.textContent = 'No active file found';
            return;
        } else {
            const msg = contentEl.querySelector('.fn-no-file-msg');
            if (msg) msg.remove();
        }

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
                const options = overviews.reduce((acc, overview) => {
                    acc[overview.id] = parseOverviewTitle(
                        overview as any as yamlSettings,
                        plugin,
                        activeFile.parent
                    );
                    return acc;
                }, {} as Record<string, string>);

                cb.addOptions(options);
                cb.addOption('default', 'Default');
                cb.setValue(yaml?.id ?? 'default');
                console.log(yaml);

                if (cb.getValue() === 'default' || defaultSettings) {
                    yaml = plugin.settings.defaultOverview;
                    defaultSettings = true;
                    cb.setValue('default');
                } else {
                    yaml = overviews.find((overview) => overview.id === yaml.id) as any as yamlSettings;
                    defaultSettings = false;
                }

                cb.onChange(async (value) => {
                    if (value === 'default') {
                        yaml = plugin.settings.defaultOverview;
                        defaultSettings = true;
                    } else {
                        yaml = overviews.find((overview) => overview.id === value) as any as yamlSettings;
                        defaultSettings = false;
                    }
                    display(contentEl, yaml, plugin, defaultSettings, display, undefined, undefined, activeFile);
                });
            });

        createOverviewSettings(settingsContainer, yaml, plugin, defaultSettings, display, undefined, undefined, activeFile);
    }
}
