import { App, Modal, Setting, MarkdownPostProcessorContext, stringifyYaml, TFile, TFolder, SettingTab, Plugin } from 'obsidian';
import { overviewSettings, includeTypes, FolderOverview } from '../FolderOverview';
import { ListComponent } from '../utils/ListComponent';
import { updateYaml } from '../FolderOverview';
import { FolderSuggest } from '../suggesters/FolderSuggester';
import { getFolderPathFromString } from '../utils/functions';
import { createOverviewSettings } from '../settings';
import FolderOverviewPlugin from 'src/main';
import FolderNotesPlugin from '../../../main';
export class FolderOverviewSettings extends Modal {
	plugin: FolderOverviewPlugin | FolderNotesPlugin;
	app: App;
	yaml: overviewSettings;
	ctx: MarkdownPostProcessorContext;
	el: HTMLElement;
	defaultSettings: overviewSettings;
	constructor(app: App, plugin: FolderOverviewPlugin | FolderNotesPlugin, yaml: overviewSettings, ctx: MarkdownPostProcessorContext | null, el: HTMLElement | null, defaultSettings: overviewSettings) {
		super(app);
		this.plugin = plugin;
		this.app = app;
		if (!yaml) {
			this.yaml = this.defaultSettings;
		} else if (ctx) {
			console.log('yaml 3: ', yaml);
			console.log('settings: ', defaultSettings);
			const includeTypes = yaml?.includeTypes || defaultSettings.includeTypes || ['folder', 'markdown'];
			this.yaml = {
				id: yaml?.id ?? crypto.randomUUID(),
				folderPath: yaml?.folderPath ?? getFolderPathFromString(ctx.sourcePath),
				title: yaml?.title ?? defaultSettings.title,
				showTitle: yaml?.showTitle ?? defaultSettings.showTitle,
				depth: yaml?.depth ?? defaultSettings.depth,
				style: yaml?.style ?? 'list',
				includeTypes: includeTypes.map((type) => type.toLowerCase()) as includeTypes[],
				disableFileTag: yaml?.disableFileTag ?? defaultSettings.disableFileTag,
				sortBy: yaml?.sortBy ?? defaultSettings.sortBy,
				sortByAsc: yaml?.sortByAsc ?? defaultSettings.sortByAsc,
				showEmptyFolders: yaml?.showEmptyFolders ?? defaultSettings.showEmptyFolders,
				onlyIncludeSubfolders: yaml?.onlyIncludeSubfolders ?? defaultSettings.onlyIncludeSubfolders,
				storeFolderCondition: yaml?.storeFolderCondition ?? defaultSettings.storeFolderCondition,
				showFolderNotes: yaml?.showFolderNotes ?? defaultSettings.showFolderNotes,
				disableCollapseIcon: yaml?.disableCollapseIcon ?? defaultSettings.disableCollapseIcon,
				alwaysCollapse: yaml?.alwaysCollapse ?? defaultSettings.alwaysCollapse,
			}
		}
		if (ctx) {
			this.ctx = ctx;
		}
		if (el) {
			this.el = el;
		}

		updateYaml(this.plugin, this.ctx, this.el, this.yaml);
	}

	onOpen() {
		const { contentEl } = this;
		console.log('yaml 6: ', this.yaml);
		console.log('settings: ', this.defaultSettings);
		this.display(contentEl, this.yaml, this.plugin, this.defaultSettings, this.display, this.el, this.ctx);
	}

	display(contentEl: HTMLElement, yaml: overviewSettings, plugin: FolderOverviewPlugin | FolderNotesPlugin, defaultSettings: overviewSettings, display: CallableFunction, el?: HTMLElement, ctx?: MarkdownPostProcessorContext, file?: TFile | null, settingsTab?: SettingTab, modal?: FolderOverviewSettings) {
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

		console.log('yaml 4: ', yaml);
		console.log('settings: ', defaultSettings);
		createOverviewSettings(contentEl, yaml, plugin, defaultSettings, display, el, ctx, undefined, undefined, modal);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

