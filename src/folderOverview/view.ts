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

    async display(contentEl: HTMLElement, yaml: yamlSettings, plugin: FolderNotesPlugin, defaultSettings: boolean, display: CallableFunction, el?: HTMLElement, ctx?: MarkdownPostProcessorContext, file?: TFile | null) {
        contentEl.empty();
        contentEl.createEl('h4', { text: 'Folder Overview settings' });

        const activeFile = plugin.app.workspace.getActiveFile();

        if (!activeFile) {
            // coulnd't get active file
            contentEl.createEl('p', { text: 'No active file found' });
            return;
        }

        const overviews = await getOverviews(plugin, activeFile);

        const overviewSetting = new Setting(contentEl);
        overviewSetting.setName('Select overview');
        overviewSetting.setClass('fn-select-overview-setting');
        overviewSetting.addDropdown((cb) => {
            const options = overviews.reduce((acc, overview) => {
                acc[overview.id] = parseOverviewTitle(overview as any as yamlSettings, plugin, activeFile.parent);
                return acc;
            }, {} as Record<string, string>);
            cb.addOptions(options);
            cb.addOption('default', 'Default');
            cb.setValue(yaml?.id ?? 'default');

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

        createOverviewSettings(contentEl, yaml, plugin, defaultSettings, display, undefined, undefined, activeFile);
    }
}
