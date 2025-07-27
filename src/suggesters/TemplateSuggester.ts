import type { TAbstractFile } from 'obsidian';
import { TFile, TFolder, Vault, AbstractInputSuggest } from 'obsidian';
import type FolderNotesPlugin from '../main';
import { getTemplatePlugins } from 'src/template';
export enum FileSuggestMode {
	TemplateFiles,
	ScriptFiles,
}

export class TemplateSuggest extends AbstractInputSuggest<TFile> {
	constructor(
		public inputEl: HTMLInputElement,
		public plugin: FolderNotesPlugin,
	) {
		super(plugin.app, inputEl);
	}


	get_error_msg(mode: FileSuggestMode): string {
		switch (mode) {
			case FileSuggestMode.TemplateFiles:
				return 'Templates folder doesn\'t exist';
			case FileSuggestMode.ScriptFiles:
				return 'User Scripts folder doesn\'t exist';
		}
	}

	getSuggestions(input_str: string): TFile[] {
		const { templateFolder, templaterPlugin } = getTemplatePlugins(this.app);

		let files: TFile[] = [];
		const lower_input_str = input_str.toLowerCase();

		if ((!templateFolder || templateFolder.trim() === '') && !templaterPlugin) {
			files = this.plugin.app.vault.getFiles().filter((file) =>
				file.path.toLowerCase().includes(lower_input_str),
			);
		} else {
			let folder: TFolder | TAbstractFile | null = null;
			if (templaterPlugin) {
				folder = this.plugin.app.vault.getAbstractFileByPath(
					templaterPlugin.plugin?.settings?.templates_folder as string,
				);
				if (!(folder instanceof TFolder)) {
					return [{ path: '', name: 'You need to set the Templates folder in the Templater settings first.' } as TFile];
				}
			} else {
				folder = this.plugin.app.vault.getAbstractFileByPath(templateFolder) as TFolder;
			}

			if (!(folder instanceof TFolder)) {
				return [];
			}

			Vault.recurseChildren(folder, (file: TAbstractFile) => {
				if (file instanceof TFile && file.path.toLowerCase().includes(lower_input_str)) {
					files.push(file);
				}
			});
		}

		return files;
	}


	renderSuggestion(file: TFile, el: HTMLElement): void {
		const { templateFolder, templaterPlugin } = getTemplatePlugins(this.app);

		if ((!templateFolder || templateFolder.trim() === '') && !templaterPlugin) {
			el.setText(`${file.parent?.path !== '/' ? file.parent?.path + '/' : ''}${file.name}`);
		} else {
			el.setText(file.name);
		}
	}


	selectSuggestion(file: TFile): void {
		this.inputEl.value = file.name.replace('.md', '');
		this.inputEl.trigger('input');
		this.plugin.settings.templatePath = file.path;
		this.plugin.saveSettings();
		this.close();
	}
}
