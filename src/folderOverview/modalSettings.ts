import { App, Modal, Setting, MarkdownPostProcessorContext, stringifyYaml, TFile, TFolder } from 'obsidian';
import { yamlSettings, includeTypes, FolderOverview } from 'src/folderOverview/FolderOverview';
import FolderNotesPlugin from '../main';
import ListComponent from 'src/functions/ListComponent';
import { updateYaml } from 'src/folderOverview/FolderOverview';
import { FolderSuggest } from 'src/suggesters/FolderSuggester';
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
		} else {
			this.yaml = yaml;
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
		}
	}
	onOpen() {
		this.display();
	}
	display() {
		const { contentEl } = this;
		contentEl.empty();
		// close when user presses enter
		contentEl.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				this.close();
			}
		});
		contentEl.createEl('h2', { text: 'Folder overview settings' });
		new Setting(contentEl)
			.setName('Disable the title')
			.setDesc('Choose if the title should be shown')
			.addToggle((toggle) =>
				toggle
					.setValue(this.yaml.disableTitle || false)
					.onChange(async (value) => {
						this.yaml.disableTitle = value;
						this.display();
						if (this.defaultSettings) {
							return this.plugin.saveSettings();
						}
						await updateYaml(this.plugin, this.ctx, this.el, this.yaml);;
					})
			);
		if (!this.yaml.disableTitle) {
			new Setting(contentEl)
				.setName('Title')
				.setDesc('Choose the title of the folder overview')
				.addText((text) =>
					text
						.setValue(this.yaml?.title || '{{folderName}} overview')
						.onChange(async (value) => {
							this.yaml.title = value;
							if (this.defaultSettings) {
								return this.plugin.saveSettings();
							}
							await updateYaml(this.plugin, this.ctx, this.el, this.yaml);;
						})
				);
		}
		new Setting(contentEl)
			.setName('Folder path for the overview')
			.setDesc('Choose the folder path for the overview')
			.addSearch((search) => {
				new FolderSuggest(search.inputEl, this.plugin)
				search
					.setPlaceholder('Folder path')
					.setValue(this.yaml?.folderPath || '')
					.onChange(async (value) => {
						if (value === '' || value === '/') {
							this.yaml.folderPath = '';
							await updateYaml(this.plugin, this.ctx, this.el, this.yaml);;
							return;
						}
						if (!(this.app.vault.getAbstractFileByPath(value) instanceof TFolder)) return;
						this.yaml.folderPath = value;
						if (this.defaultSettings) {
							return this.plugin.saveSettings();
						}
						await updateYaml(this.plugin, this.ctx, this.el, this.yaml);;
					});
			});
		new Setting(contentEl)
			.setName('Overview style')
			.setDesc('Choose the style of the overview (grid style soon)')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('list', 'List')
					.addOption('explorer', 'Explorer')
					.setValue(this.yaml?.style || 'list')
					.onChange(async (value: 'list') => {
						this.yaml.style = value;
						this.display();
						if (this.defaultSettings) {
							return this.plugin.saveSettings();
						}
						await updateYaml(this.plugin, this.ctx, this.el, this.yaml);
					})
			);
		if (this.yaml.style === 'explorer') {
			new Setting(contentEl)
				.setName('Store collapsed condition')
				.setDesc('Choose if the collapsed condition should be stored stored until you restart Obsidian')
				.addToggle((toggle) =>
					toggle
						.setValue(this.yaml.storeFolderCondition || this.plugin.settings.defaultOverview.storeFolderCondition || true)
						.onChange(async (value) => {
							this.yaml.storeFolderCondition = value;
							if (this.defaultSettings) {
								return this.plugin.saveSettings();
							}
							await updateYaml(this.plugin, this.ctx, this.el, this.yaml);;
						})
				);
		}
		const setting = new Setting(contentEl);
		setting.setName('Include types');
		const list = setting.createList((list: ListComponent) =>
			list
				.addModal(this)
				.setValues(this.yaml?.includeTypes || this.plugin.settings.defaultOverview.includeTypes || [])
				.addResetButton()
		);
		if ((this.yaml?.includeTypes?.length || 0) < 8 && !this.yaml.includeTypes?.includes('all')) {
			setting.addDropdown((dropdown) => {
				if (!this.yaml.includeTypes) this.yaml.includeTypes = this.plugin.settings.defaultOverview.includeTypes || [];
				this.yaml.includeTypes = this.yaml.includeTypes.map((type: string) => type.toLowerCase()) as includeTypes[];
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
					if (!this.yaml.includeTypes?.includes(option.value as includeTypes)) {
						dropdown.addOption(option.value, option.label);
					}
				});
				dropdown.addOption('+', '+');
				dropdown.setValue('+');
				dropdown.onChange(async (value) => {
					if (value === 'all') {
						this.yaml.includeTypes = this.yaml.includeTypes?.filter((type: string) => type === 'folder');
						// @ts-ignore
						list.setValues(this.yaml.includeTypes);
					}
					// @ts-ignore
					await list.addValue(value.toLowerCase());
					this.display();
					if (this.defaultSettings) {
						return this.plugin.saveSettings();
					}
					await updateYaml(this.plugin, this.ctx, this.el, this.yaml);
				});
			});
		}
		let disableFileTag;
		this.yaml.includeTypes?.forEach((type: string) => {
			type === 'folder' || type === 'markdown' ? (disableFileTag = true) : null;
		});
		if (disableFileTag) {
			new Setting(contentEl)
				.setName('Disable file tag')
				.setDesc('Choose if the file tag should be shown after the file name')
				.addToggle((toggle) => {
					toggle
						.setValue(this.yaml.disableFileTag || this.plugin.settings.defaultOverview.disableFileTag || false)
						.onChange(async (value) => {
							this.yaml.disableFileTag = value;
							if (this.defaultSettings) {
								return this.plugin.saveSettings();
							}
							await updateYaml(this.plugin, this.ctx, this.el, this.yaml);
						});
				});
		}
		if (this.yaml.style !== 'explorer') {
			new Setting(contentEl)
				.setName('File depth')
				.setDesc('File & folder = +1 depth')
				.addSlider((slider) =>
					slider
						.setValue(this.yaml?.depth || 2)
						.setLimits(1, 10, 1)
						.onChange(async (value) => {
							this.yaml.depth = value;
							if (this.defaultSettings) {
								return this.plugin.saveSettings();
							}
							await updateYaml(this.plugin, this.ctx, this.el, this.yaml);
						})
				);
		}

		new Setting(contentEl)
			.setName('Sort files by')
			.setDesc('Choose how the files should be sorted')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('name', 'Name')
					.addOption('created', 'Created')
					.addOption('modified', 'Modified')
					.setValue(this.yaml?.sortBy || 'name')
					.onChange(async (value: 'name' | 'created' | 'modified') => {
						this.yaml.sortBy = value;
						if (this.defaultSettings) {
							return this.plugin.saveSettings();
						}
						await updateYaml(this.plugin, this.ctx, this.el, this.yaml);
					})
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption('desc', 'Descending')
					.addOption('asc', 'Ascending')
				if (this.yaml.sortByAsc) {
					dropdown.setValue('asc');
				} else {
					dropdown.setValue('desc');
				}
				dropdown.onChange(async (value) => {
					this.yaml.sortByAsc = value === 'asc';
					if (this.defaultSettings) {
						return this.plugin.saveSettings();
					}
					await updateYaml(this.plugin, this.ctx, this.el, this.yaml);
				});
			});
		if (this.yaml.style === 'list') {
			new Setting(contentEl)
				.setName('Show folder names of folders that appear empty in the folder overview')
				.setDesc('Show the names of folders that appear to have no files/folders in the folder overview. That\'s mostly the case when you set the file depth to 1.')
				.addToggle((toggle) => {
					toggle
						.setValue(this.yaml.showEmptyFolders || this.plugin.settings.defaultOverview.showEmptyFolders || false)
						.onChange(async (value) => {
							this.yaml.showEmptyFolders = value;
							this.yaml.onlyIncludeSubfolders = false;
							this.display();
							if (this.defaultSettings) {
								return this.plugin.saveSettings();
							}
							await updateYaml(this.plugin, this.ctx, this.el, this.yaml);
						});
				});

			if (this.yaml.showEmptyFolders) {
				new Setting(contentEl)
					.setName('Only show first empty subfolders of current folder')
					.addToggle((toggle) => {
						toggle
							.setValue(this.yaml.onlyIncludeSubfolders || this.plugin.settings.defaultOverview.onlyIncludeSubfolders || false)
							.onChange(async (value) => {
								this.yaml.onlyIncludeSubfolders = value;
								if (this.defaultSettings) {
									return this.plugin.saveSettings();
								}
								await updateYaml(this.plugin, this.ctx, this.el, this.yaml);
							});
					});
			}
		}

	}
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

