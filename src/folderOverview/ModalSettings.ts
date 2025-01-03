import { App, Modal, Setting, MarkdownPostProcessorContext, stringifyYaml, TFile, TFolder, SettingTab } from 'obsidian';
import { yamlSettings, includeTypes, FolderOverview } from 'src/folderOverview/FolderOverview';
import FolderNotesPlugin from '../main';
import { ListComponent } from 'src/functions/ListComponent';
import { updateYaml } from 'src/folderOverview/FolderOverview';
import { FolderSuggest } from 'src/suggesters/FolderSuggester';
import { getFolderPathFromString } from 'src/functions/utils';
import { createOverviewSettings } from "src/folderOverview/settings";

export class FolderOverviewSettings extends Modal {
	plugin: FolderNotesPlugin;
	app: App;
	yaml: yamlSettings;
	ctx: MarkdownPostProcessorContext;
	el: HTMLElement;
	defaultSettings: boolean;
	constructor(app: App, plugin: FolderNotesPlugin, yaml: yamlSettings, ctx: MarkdownPostProcessorContext | null, el: HTMLElement | null, defaultSettings?: boolean) {
		super(app);
		this.plugin = plugin;
		this.app = app;
		if (!yaml) {
			this.yaml = this.plugin.settings.defaultOverview;
		} else if (ctx) {
			const includeTypes = yaml?.includeTypes || plugin.settings.defaultOverview.includeTypes || ['folder', 'markdown'];
			this.yaml = {
				id: yaml?.id || crypto.randomUUID(),
				folderPath: yaml?.folderPath === undefined || yaml?.folderPath === null ? getFolderPathFromString(ctx.sourcePath) : yaml?.folderPath,
				title: yaml?.title || plugin.settings.defaultOverview.title,
				showTitle: yaml?.showTitle === undefined || yaml?.showTitle === null ? plugin.settings.defaultOverview.showTitle : yaml?.showTitle,
				depth: yaml?.depth || plugin.settings.defaultOverview.depth,
				style: yaml?.style || 'list',
				includeTypes: includeTypes.map((type) => type.toLowerCase()) as includeTypes[],
				disableFileTag: yaml?.disableFileTag === undefined || yaml?.disableFileTag === null ? plugin.settings.defaultOverview.disableFileTag : yaml?.disableFileTag,
				sortBy: yaml?.sortBy || plugin.settings.defaultOverview.sortBy,
				sortByAsc: yaml?.sortByAsc === undefined || yaml?.sortByAsc === null ? plugin.settings.defaultOverview.sortByAsc : yaml?.sortByAsc,
				showEmptyFolders: yaml?.showEmptyFolders === undefined || yaml?.showEmptyFolders === null ? plugin.settings.defaultOverview.showEmptyFolders : yaml?.showEmptyFolders,
				onlyIncludeSubfolders: yaml?.onlyIncludeSubfolders === undefined || yaml?.onlyIncludeSubfolders === null ? plugin.settings.defaultOverview.onlyIncludeSubfolders : yaml?.onlyIncludeSubfolders,
				storeFolderCondition: yaml?.storeFolderCondition === undefined || yaml?.storeFolderCondition === null ? plugin.settings.defaultOverview.storeFolderCondition : yaml?.storeFolderCondition,
				showFolderNotes: yaml?.showFolderNotes === undefined || yaml?.showFolderNotes === null ? plugin.settings.defaultOverview.showFolderNotes : yaml?.showFolderNotes,
				disableCollapseIcon: yaml?.disableCollapseIcon === undefined || yaml?.disableCollapseIcon === null ? plugin.settings.defaultOverview.disableCollapseIcon : yaml?.disableCollapseIcon,
				alwaysCollapse: yaml?.alwaysCollapse === undefined || yaml?.alwaysCollapse === null ? plugin.settings.defaultOverview.alwaysCollapse : yaml?.alwaysCollapse,
			}
		}
		if (ctx) {
			this.ctx = ctx;
		}
		if (el) {
			this.el = el;
		}
		if (defaultSettings) {
			this.yaml = this.plugin.settings.defaultOverview;
			this.defaultSettings = true;
			return
		}
		updateYaml(this.plugin, this.ctx, this.el, this.yaml);
	}
	onOpen() {
		const { contentEl } = this;
		this.display(contentEl, this.yaml, this.plugin, false, this.display, this.el, this.ctx);
	}
	display(contentEl: HTMLElement, yaml: yamlSettings, plugin: FolderNotesPlugin, defaultSettings: boolean, display: CallableFunction, el?: HTMLElement, ctx?: MarkdownPostProcessorContext, file?: TFile | null, settingsTab?: SettingTab, modal?: FolderOverviewSettings) {
		modal = this ?? modal;
		contentEl.empty();
		// close when user presses enter
		contentEl.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				modal.close();
			}
		});
		if (!modal.defaultSettings) {
			contentEl.createEl('h2', { text: 'Folder overview settings' });
		} else {
			contentEl.createEl('h2', { text: 'Default folder overview settings' });
		}

		createOverviewSettings(contentEl, yaml, plugin, defaultSettings, display, el, ctx, undefined, undefined, modal);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

