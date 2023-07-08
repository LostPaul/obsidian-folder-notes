import { App, Modal, Setting, MarkdownPostProcessorContext, stringifyYaml, TFile } from 'obsidian';
import { yamlSettings } from 'src/folderOverview';
import FolderNotesPlugin from '../main';
import ListComponent from 'src/functions/ListComponent';
export class FolderOverviewSettings extends Modal {
	plugin: FolderNotesPlugin;
	app: App;
	yaml: yamlSettings;
	ctx: MarkdownPostProcessorContext;
	el: HTMLElement;
	constructor(app: App, plugin: FolderNotesPlugin, yaml: yamlSettings, ctx: MarkdownPostProcessorContext, el: HTMLElement) {
		super(app);
		this.plugin = plugin;
		this.app = app;
		this.yaml = yaml;
		this.ctx = ctx;
		this.el = el;
		if (!this.yaml) {
			this.yaml = {
				title: this.plugin.settings.defaultOverview.title,
				disableTitle: this.plugin.settings.defaultOverview.disableTitle,
				depth: this.plugin.settings.defaultOverview.depth,
				type: this.plugin.settings.defaultOverview.type,
				includeTypes: this.plugin.settings.defaultOverview.includeTypes,
				style: this.plugin.settings.defaultOverview.style,
				disableFileTag: this.plugin.settings.defaultOverview.disableFileTag,
				sortBy: this.plugin.settings.defaultOverview.sortBy,
				showEmptyFolders: this.plugin.settings.defaultOverview.showEmptyFolders,
				onlyIncludeSubfolders: this.plugin.settings.defaultOverview.onlyIncludeSubfolders,
			};
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
						await this.updateYaml();
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
							await this.updateYaml();
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
				this.yaml.includeTypes = this.yaml.includeTypes.map((type: string) => type.toLowerCase());
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
					if (!this.yaml.includeTypes?.includes(option.value)) {
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
					await this.updateYaml();
					this.display();
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
							await this.updateYaml();
						});
				});
		}

		new Setting(contentEl)
			.setName('File depth')
			.setDesc('File & folder = +1 depth')
			.addSlider((slider) =>
				slider
					.setValue(this.yaml?.depth || 2)
					.setLimits(1, 10, 1)
					.onChange(async (value) => {
						this.yaml.depth = value;
						await this.updateYaml();
					})
			);

		new Setting(contentEl)
			.setName('Overview style')
			.setDesc('Choose the style of the overview (grid style soon)')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('list', 'List')
					.setValue(this.yaml?.style || 'list')
					.onChange(async (value: 'list') => {
						this.yaml.style = value;
						await this.updateYaml();
					})
			);

		new Setting(contentEl)
			.setName('Sort files by')
			.setDesc('Choose how the files should be sorted')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('name', 'Name descending')
					.addOption('created', 'Created descending')
					.addOption('modified', 'Modified descending')
					.addOption('nameAsc', 'Name ascending')
					.addOption('createdAsc', 'Created ascending')
					.addOption('modifiedAsc', 'Modified ascending')
					.setValue(this.yaml?.sortBy || 'name')
					.onChange(async (value: 'name' | 'created' | 'modified' | 'nameAsc' | 'createdAsc' | 'modifiedAsc') => {
						this.yaml.sortBy = value;
						await this.updateYaml();
					})
			);

		new Setting(contentEl)
			.setName('Show folder names of empty folders')
			.setDesc('That includes subfolders of the current folder when you are on file depth 1')
			.addToggle((toggle) => {
				toggle
					.setValue(this.yaml.showEmptyFolders || this.plugin.settings.defaultOverview.showEmptyFolders || false)
					.onChange(async (value) => {
						this.yaml.showEmptyFolders = value;
						this.yaml.onlyIncludeSubfolders = false;
						this.display();
						await this.updateYaml();
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
							await this.updateYaml();
						});
				});
		}


	}
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
	async updateYaml() {
		const file = this.plugin.app.vault.getAbstractFileByPath(this.ctx.sourcePath);
		if (!(file instanceof TFile)) return;
		let stringYaml = stringifyYaml(this.yaml);
		await this.plugin.app.vault.process(file, (text) => {
			const info = this.ctx.getSectionInfo(this.el);
			// check if stringYaml ends with a newline
			if (stringYaml[stringYaml.length - 1] !== '\n') {
				stringYaml += '\n';
			}
			if (info) {
				const { lineStart } = info;
				const lineEnd = this.getCodeBlockEndLine(text, lineStart);
				if (lineEnd === -1 || !lineEnd) return text;
				const lineLength = lineEnd - lineStart;
				const lines = text.split('\n');
				lines.splice(lineStart, lineLength + 1, `\`\`\`folder-overview\n${stringYaml}\`\`\``);
				return lines.join('\n');
			}
			return `\`\`\`folder-overview\n${stringYaml}\`\`\``;
		});
	}
	getCodeBlockEndLine(text: string, startLine: number, count = 1) {
		let line = startLine + 1;
		const lines = text.split('\n');
		while (line < lines.length) {
			if (count > 20) { return -1; }
			if (lines[line].startsWith('```')) {
				return line;
			}
			line++;
			count++;
		}
		return line;
	}
}

